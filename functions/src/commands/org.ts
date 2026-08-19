import { paths } from '@stockmok/shared';
import { serverPaths } from '@stockmok/shared/server/paths';
import { writeAudit } from '../core/audit.js';
import { defineCommand } from '../core/define-command.js';
import { fail } from '../core/errors.js';
import { serverTimestamp } from '../core/time.js';
import type { TrustedMembership } from '../guards/membership.js';
import { requireTrustedEmail } from '../guards/auth.js';
import {
  assertReservationAvailable,
  deriveMonogram,
  deriveMonogramColor,
  newId,
  requireMembership,
} from './lib.js';

/**
 * C-01 `org.create` — AUTHENTICATED, idempotent, transactional, audited.
 *
 * Any authenticated user, no existing membership required (DB-05 §7.1). One
 * transaction creates the handle reservation, the organization, the public
 * directory entry, settings, the Owner's own membership (+ mirror), the
 * first warehouse, the purchase-order counter, and the audit row — DB-06 §6.
 * `handleReservations/{handle}` makes the handle race-free by database
 * enforcement rather than a read-then-write check (DB-06 §5).
 */
export const orgCreate = defineCommand({
  id: 'C-01',
  authorization: { kind: 'AUTHENTICATED' },
  handler: async ({ db, scope, auth, payload }) => {
    const email = requireTrustedEmail(auth);
    const handle = payload.handle;

    await assertReservationAvailable(
      scope,
      db.doc(serverPaths.handleReservation(handle)),
      'HANDLE_TAKEN',
      'This handle is already taken.',
    );

    const userSnapshot = await scope.get(db.doc(paths.user(auth.uid)));
    const displayName =
      userSnapshot.exists && typeof userSnapshot.get('displayName') === 'string'
        ? (userSnapshot.get('displayName') as string)
        : (email.split('@')[0] ?? email);

    const orgId = newId(db, 'organizations');
    const warehouseId = newId(db, `${paths.organization(orgId)}/warehouses`);
    const monogram = deriveMonogram(payload.name);
    const monogramColor = deriveMonogramColor(handle);
    const currency = payload.currency;

    scope.create(db.doc(serverPaths.handleReservation(handle)), {
      organizationId: orgId,
      createdAt: serverTimestamp(),
    });

    scope.create(db.doc(paths.organization(orgId)), {
      organizationId: orgId,
      name: payload.name,
      handle,
      industry: payload.industry,
      country: payload.country,
      logoUrl: null,
      monogram,
      monogramColor,
      status: 'ACTIVE',
      ownerUid: auth.uid,
      createdAt: serverTimestamp(),
      createdBy: auth.uid,
      schemaVersion: 1,
    });

    scope.create(db.doc(paths.organizationDirectory(handle)), {
      organizationId: orgId,
      handle,
      name: payload.name,
      logoUrl: null,
      monogram,
      monogramColor,
      industry: payload.industry,
      country: payload.country,
      directoryStatus: 'LISTED',
      createdAt: serverTimestamp(),
    });

    scope.create(db.doc(paths.settings(orgId)), {
      defaultWarehouseId: warehouseId,
      currency,
      timezone: payload.timezone,
      lowStockNotificationsEnabled: true,
      purchaseOrderPrefix: 'PO',
      quantityPrecision: 3,
      networkEnabled: true,
      storefrontEnabled: false,
      updatedAt: serverTimestamp(),
      updatedBy: auth.uid,
    });

    scope.create(db.doc(paths.member(orgId, auth.uid)), {
      uid: auth.uid,
      role: 'OWNER',
      status: 'ACTIVE',
      displayName,
      email,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    scope.create(db.doc(paths.membership(auth.uid, orgId)), {
      organizationId: orgId,
      handle,
      organizationName: payload.name,
      monogram,
      monogramColor,
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    scope.create(db.doc(paths.warehouse(orgId, warehouseId)), {
      warehouseId,
      name: 'Main Store',
      type: 'STORE_ROOM',
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      createdBy: auth.uid,
      updatedAt: serverTimestamp(),
      updatedBy: auth.uid,
    });

    scope.create(db.doc(paths.counter(orgId, 'purchaseOrder')), {
      value: 0,
      updatedAt: serverTimestamp(),
    });

    const actor: TrustedMembership = {
      orgId,
      uid: auth.uid,
      role: 'OWNER',
      status: 'ACTIVE',
      displayName,
      email,
    };
    writeAudit(scope, db, actor, {
      action: 'org.create',
      entityType: 'ORGANIZATION',
      entityId: orgId,
      summary: `Created organization ${payload.name} (@${handle}).`,
    });

    return { organizationId: orgId, handle, warehouseId };
  },
});

/**
 * C-02 `org.updateSettings` — ADMINS, transactional, audited (A3 · DB-CR-032).
 *
 * Write set: `organizations/{orgId}`, `settings/main`, and — only when a
 * directory-projected field changed — `organizationDirectory/{handle}`, plus
 * the audit row. `currency`/`timezone` live only on `settings/main`.
 */
export const orgUpdateSettings = defineCommand({
  id: 'C-02',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN'] },
  handler: async ({ db, scope, membership, payload }) => {
    const actor = requireMembership(membership);
    const orgSnapshot = await scope.get(db.doc(paths.organization(actor.orgId)));
    if (!orgSnapshot.exists) fail('RESOURCE_NOT_FOUND', 'The organization does not exist.');
    const settingsSnapshot = await scope.get(db.doc(paths.settings(actor.orgId)));
    if (!settingsSnapshot.exists)
      fail('RESOURCE_NOT_FOUND', 'The organization settings do not exist.');

    const handle = orgSnapshot.get('handle') as string;
    const currentName = orgSnapshot.get('name') as string;
    const currentIndustry = orgSnapshot.get('industry') as string;
    const currentCountry = orgSnapshot.get('country') as string;

    const nextName = payload.name ?? currentName;
    const nextIndustry = payload.industry ?? currentIndustry;
    const nextCountry = payload.country ?? currentCountry;
    const directoryProjectionChanged =
      nextName !== currentName ||
      nextIndustry !== currentIndustry ||
      nextCountry !== currentCountry;

    const orgUpdate: Record<string, unknown> = {};
    if (payload.name !== undefined) orgUpdate.name = payload.name;
    if (payload.industry !== undefined) orgUpdate.industry = payload.industry;
    if (payload.country !== undefined) orgUpdate.country = payload.country;
    if (Object.keys(orgUpdate).length > 0) {
      scope.update(db.doc(paths.organization(actor.orgId)), orgUpdate);
    }

    const settingsUpdate: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    };
    if (payload.currency !== undefined) settingsUpdate.currency = payload.currency;
    if (payload.timezone !== undefined) settingsUpdate.timezone = payload.timezone;
    if (payload.lowStockNotificationsEnabled !== undefined) {
      settingsUpdate.lowStockNotificationsEnabled = payload.lowStockNotificationsEnabled;
    }
    if (payload.networkEnabled !== undefined)
      settingsUpdate.networkEnabled = payload.networkEnabled;
    scope.update(db.doc(paths.settings(actor.orgId)), settingsUpdate);

    if (directoryProjectionChanged) {
      scope.update(db.doc(paths.organizationDirectory(handle)), {
        name: nextName,
        industry: nextIndustry,
        country: nextCountry,
      });
    }

    writeAudit(scope, db, actor, {
      action: 'org.updateSettings',
      entityType: 'ORGANIZATION',
      entityId: actor.orgId,
      summary: 'Updated organization settings.',
    });

    return { organizationId: actor.orgId };
  },
});
