import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import { serverPaths } from '../../packages/shared/src/server/paths.js';
import { orgCreate, orgUpdateSettings } from '../../functions/src/commands/org.js';
import {
  callable,
  callableAuthed,
  clearFirestore,
  ORG_A,
  ORG_B,
  OPERATION_ID_A,
  OPERATION_ID_B,
  seedMember,
  seedOrganization,
  testDb,
  uidFor,
} from './harness.js';

/**
 * C-01 `org.create` and C-02 `org.updateSettings` — real command bodies
 * against the emulator.
 */

let db: Firestore;

const createPayload = {
  name: 'Sunrise Bakery',
  handle: 'sunrise-bakery',
  industry: 'Food & Beverage',
  country: 'LK',
  currency: 'lkr',
  timezone: 'Asia/Colombo',
};

beforeAll(() => {
  db = testDb();
});

describe('C-01 org.create', () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  it('creates the full write set in one transaction and returns the minimal result', async () => {
    const result = await orgCreate.execute(
      callableAuthed('new-owner', 'new-owner@stockmok.test', {
        orgId: 'routing-hint',
        operationId: OPERATION_ID_A,
        payload: createPayload,
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    const { organizationId, handle, warehouseId } = result.data as {
      organizationId: string;
      handle: string;
      warehouseId: string;
    };
    expect(handle).toBe('sunrise-bakery');

    const org = await db.doc(paths.organization(organizationId)).get();
    expect(org.exists).toBe(true);
    expect(org.get('ownerUid')).toBe('new-owner');
    expect(org.get('handle')).toBe('sunrise-bakery');
    expect(org.get('currency')).toBeUndefined();
    expect(org.get('status')).toBe('ACTIVE');

    const reservation = await db.doc(serverPaths.handleReservation('sunrise-bakery')).get();
    expect(reservation.exists).toBe(true);
    expect(reservation.get('organizationId')).toBe(organizationId);

    const directory = await db.doc(paths.organizationDirectory('sunrise-bakery')).get();
    expect(directory.exists).toBe(true);
    expect(directory.get('directoryStatus')).toBe('LISTED');

    const settings = await db.doc(paths.settings(organizationId)).get();
    expect(settings.exists).toBe(true);
    expect(settings.get('defaultWarehouseId')).toBe(warehouseId);
    expect(settings.get('currency')).toBe('LKR');
    expect(settings.get('storefrontEnabled')).toBe(false);

    const member = await db.doc(paths.member(organizationId, 'new-owner')).get();
    expect(member.get('role')).toBe('OWNER');
    expect(member.get('status')).toBe('ACTIVE');
    expect(member.get('invitedBy')).toBeUndefined();

    const membership = await db.doc(paths.membership('new-owner', organizationId)).get();
    expect(membership.get('role')).toBe('OWNER');
    expect(membership.get('handle')).toBe('sunrise-bakery');

    const warehouse = await db.doc(paths.warehouse(organizationId, warehouseId)).get();
    expect(warehouse.get('status')).toBe('ACTIVE');
    expect(warehouse.get('name')).toBe('Main Store');

    const counter = await db.doc(paths.counter(organizationId, 'purchaseOrder')).get();
    expect(counter.exists).toBe(true);
    expect(counter.get('value')).toBe(0);

    const audit = await db.collection(`${paths.organization(organizationId)}/auditLogs`).get();
    expect(audit.size).toBe(1);
    expect(audit.docs[0]?.get('action')).toBe('org.create');
    expect(audit.docs[0]?.get('actorUid')).toBe('new-owner');
  });

  it('rejects an unauthenticated call', async () => {
    const result = await orgCreate.execute(
      { data: { orgId: 'x', operationId: OPERATION_ID_A, payload: createPayload } },
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('unauthenticated');
  });

  it('refuses a second organization on an already-taken handle, leaving no partial org', async () => {
    await orgCreate.execute(
      callableAuthed('owner-1', 'owner-1@stockmok.test', {
        orgId: 'x',
        operationId: OPERATION_ID_A,
        payload: createPayload,
      }),
      db,
    );
    const result = await orgCreate.execute(
      callableAuthed('owner-2', 'owner-2@stockmok.test', {
        orgId: 'x',
        operationId: OPERATION_ID_B,
        payload: createPayload,
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('already-exists');
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('HANDLE_TAKEN');

    const member = await db.doc(paths.member('owner-2-org', 'owner-2')).get();
    expect(member.exists).toBe(false);
  });

  it('replays an identical retry without creating a second organization', async () => {
    const request = callableAuthed('owner-3', 'owner-3@stockmok.test', {
      orgId: 'x',
      operationId: OPERATION_ID_A,
      payload: createPayload,
    });
    const first = await orgCreate.execute(request, db);
    const second = await orgCreate.execute(request, db);
    expect(first).toEqual(second);

    const directory = await db.doc(paths.organizationDirectory('sunrise-bakery')).get();
    expect(directory.exists).toBe(true);
  });

  it('does not require any existing membership — any authenticated user may call it', async () => {
    const result = await orgCreate.execute(
      callableAuthed('brand-new-user', 'brand-new-user@stockmok.test', {
        orgId: 'x',
        operationId: OPERATION_ID_A,
        payload: { ...createPayload, handle: 'another-handle' },
      }),
      db,
    );
    expect(result.ok).toBe(true);
  });
});

describe('C-02 org.updateSettings', () => {
  beforeAll(async () => {
    await clearFirestore();
    await seedOrganization(db, ORG_A);
    await seedOrganization(db, ORG_B);
    await db.doc(paths.organization(ORG_A)).update({ industry: 'Hospitality', country: 'LK' });
    await db.doc(paths.settings(ORG_A)).set({
      defaultWarehouseId: 'warehouse-main',
      currency: 'USD',
      timezone: 'Asia/Colombo',
      lowStockNotificationsEnabled: true,
      purchaseOrderPrefix: 'PO',
      quantityPrecision: 3,
      networkEnabled: true,
      storefrontEnabled: false,
      updatedAt: new Date(),
      updatedBy: 'seed',
    });
    await db.doc(paths.organizationDirectory(ORG_A)).set({
      organizationId: ORG_A,
      handle: ORG_A,
      name: ORG_A,
      logoUrl: null,
      monogram: 'GO',
      monogramColor: 'blue',
      industry: 'Hospitality',
      country: 'LK',
      directoryStatus: 'LISTED',
      createdAt: new Date(),
    });
    for (const role of ['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'VIEWER'] as const) {
      await seedMember(db, ORG_A, role);
    }
  });

  it('updates the organization, settings and directory projection together, and audits it', async () => {
    const result = await orgUpdateSettings.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { name: 'Grand Ocean Renamed', currency: 'lkr' },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);

    const org = await db.doc(paths.organization(ORG_A)).get();
    expect(org.get('name')).toBe('Grand Ocean Renamed');

    const settings = await db.doc(paths.settings(ORG_A)).get();
    expect(settings.get('currency')).toBe('LKR');

    const directory = await db.doc(paths.organizationDirectory(ORG_A)).get();
    expect(directory.get('name')).toBe('Grand Ocean Renamed');

    const audit = await db.collection(`${paths.organization(ORG_A)}/auditLogs`).get();
    expect(audit.docs.some((doc) => doc.get('action') === 'org.updateSettings')).toBe(true);
  });

  it('leaves the directory untouched when no projected field changes', async () => {
    const before = await db.doc(paths.organizationDirectory(ORG_A)).get();
    const result = await orgUpdateSettings.execute(
      callable(uidFor(ORG_A, 'OWNER'), {
        orgId: ORG_A,
        payload: { lowStockNotificationsEnabled: false },
      }),
      db,
    );
    expect(result.ok).toBe(true);
    const after = await db.doc(paths.organizationDirectory(ORG_A)).get();
    expect(after.get('name')).toBe(before.get('name'));
    const settings = await db.doc(paths.settings(ORG_A)).get();
    expect(settings.get('lowStockNotificationsEnabled')).toBe(false);
  });

  it.each(['INVENTORY_MANAGER', 'VIEWER'] as const)('denies %s — ADMINS only', async (role) => {
    const result = await orgUpdateSettings.execute(
      callable(uidFor(ORG_A, role), { orgId: ORG_A, payload: { name: 'Nope' } }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('permission-denied');
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('ROLE_NOT_PERMITTED');
  });

  it('rejects a non-member acting for an organization they do not belong to', async () => {
    const result = await orgUpdateSettings.execute(
      callable(uidFor(ORG_B, 'ADMIN'), { orgId: ORG_A, payload: { name: 'Hijack' } }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('NOT_A_MEMBER');
  });
});
