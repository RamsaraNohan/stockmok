import { createHash } from 'node:crypto';

import {
  CounterSchema,
  HandleReservationSchema,
  InvitationSchema,
  MemberSchema,
  OrganizationDirectorySchema,
  OrganizationSchema,
  OrganizationSettingsSchema,
  UserMembershipSchema,
  UserSchema,
} from '../../../packages/shared/src/schemas/core.js';
import { paths } from '../../../packages/shared/src/paths.js';
import { serverPaths } from '../../../packages/shared/src/server/paths.js';
import type { DatasetBuilder, QaOrg, QaPlan } from '../dataset.js';
import { QA_CLOCK, epochPlus, ordinal } from '../deterministic.js';

/**
 * Identity and tenancy: the organization itself, its directory listing and
 * handle reservation, its settings and counters, and every member on both sides
 * of the membership pair.
 */

/** Deterministic stand-in for a real invitation token hash. */
function tokenHash(seedLabel: string): string {
  return createHash('sha256').update(seedLabel).digest('hex');
}

function writeOrganizationCore(builder: DatasetBuilder, org: QaOrg, orderedPoCount: number): void {
  builder.add(paths.organizationDirectory(org.handle), OrganizationDirectorySchema, {
    organizationId: org.orgId,
    handle: org.handle,
    name: org.name,
    logoUrl: null,
    monogram: org.monogram,
    monogramColor: org.monogramColor,
    industry: org.industry,
    country: org.country,
    directoryStatus: 'LISTED',
    createdAt: QA_CLOCK.orgCreated,
  });

  builder.add(serverPaths.handleReservation(org.handle), HandleReservationSchema, {
    organizationId: org.orgId,
    createdAt: QA_CLOCK.orgCreated,
  });

  builder.add(paths.organization(org.orgId), OrganizationSchema, {
    organizationId: org.orgId,
    name: org.name,
    handle: org.handle,
    industry: org.industry,
    country: org.country,
    logoUrl: null,
    monogram: org.monogram,
    monogramColor: org.monogramColor,
    status: 'ACTIVE',
    ownerUid: org.ownerUid,
    createdAt: QA_CLOCK.orgCreated,
    createdBy: org.ownerUid,
    schemaVersion: 1,
  });

  builder.add(paths.settings(org.orgId), OrganizationSettingsSchema, {
    defaultWarehouseId: org.defaultWarehouseId,
    currency: org.currency,
    timezone: org.timezone,
    lowStockNotificationsEnabled: true,
    purchaseOrderPrefix: org.purchaseOrderPrefix,
    quantityPrecision: 3,
    networkEnabled: org.networkRole !== 'ISOLATED',
    storefrontEnabled: false,
    updatedAt: QA_CLOCK.orgCreated,
    updatedBy: org.ownerUid,
  });

  // The counter is the allocator behind `orderNumber`, so it must agree with the
  // number of orders that actually left DRAFT.
  builder.add(paths.counter(org.orgId, 'purchaseOrder'), CounterSchema, {
    value: orderedPoCount,
    updatedAt: QA_CLOCK.procurement,
  });
}

function writeMembers(builder: DatasetBuilder, org: QaOrg): void {
  for (const user of org.users) {
    builder.add(paths.user(user.uid), UserSchema, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      status: 'ACTIVE',
      createdAt: QA_CLOCK.orgCreated,
      lastSeenAt: QA_CLOCK.notification,
    });

    builder.add(paths.membership(user.uid, org.orgId), UserMembershipSchema, {
      organizationId: org.orgId,
      handle: org.handle,
      organizationName: org.name,
      monogram: org.monogram,
      monogramColor: org.monogramColor,
      role: user.role,
      status: 'ACTIVE',
      joinedAt: QA_CLOCK.memberJoined,
      updatedAt: QA_CLOCK.memberJoined,
    });

    builder.add(paths.member(org.orgId, user.uid), MemberSchema, {
      uid: user.uid,
      role: user.role,
      status: 'ACTIVE',
      displayName: user.displayName,
      email: user.email,
      ...(user.role === 'OWNER' ? {} : { invitedBy: org.ownerUid }),
      joinedAt: QA_CLOCK.memberJoined,
      updatedAt: QA_CLOCK.memberJoined,
    });
  }
}

/** One PENDING and one EXPIRED invitation per organization, so both states exist. */
function writeInvitations(builder: DatasetBuilder, org: QaOrg): void {
  const states = [
    { suffix: 1, status: 'PENDING' as const, expiresAt: epochPlus(40, 9) },
    { suffix: 2, status: 'EXPIRED' as const, expiresAt: epochPlus(4, 9) },
  ];
  for (const state of states) {
    const invitationId = `qa-invite-${org.handle}-${ordinal(state.suffix)}`;
    builder.add(paths.invitation(org.orgId, invitationId), InvitationSchema, {
      invitationId,
      organizationId: org.orgId,
      emailNormalized: `${org.handle}-invitee-${ordinal(state.suffix)}@example.com`,
      role: 'STOREKEEPER',
      tokenHash: tokenHash(`${org.orgId}:${invitationId}`),
      status: state.status,
      expiresAt: state.expiresAt,
      createdBy: org.ownerUid,
      createdAt: QA_CLOCK.memberJoined,
    });
  }
}

export function generateIdentity(
  builder: DatasetBuilder,
  plan: QaPlan,
  orderedPoCounts: ReadonlyMap<string, number>,
): void {
  for (const org of plan.organizations) {
    writeOrganizationCore(builder, org, orderedPoCounts.get(org.orgId) ?? 0);
    writeMembers(builder, org);
    writeInvitations(builder, org);
  }
}
