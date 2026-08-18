import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import { sha256Hex } from '../../functions/src/commands/lib.js';
import {
  teamAcceptInvitation,
  teamChangeMemberRole,
  teamCreateInvitation,
  teamRevokeInvitation,
  teamSetMemberStatus,
} from '../../functions/src/commands/team.js';
import {
  callable,
  clearFirestore,
  ORG_A,
  ORG_B,
  OPERATION_ID_A,
  OPERATION_ID_B,
  seedInvitation,
  seedMember,
  seedOrganization,
  testDb,
  uidFor,
} from './harness.js';

let db: Firestore;

beforeAll(() => {
  db = testDb();
});

async function seedBaseOrg(): Promise<void> {
  await clearFirestore();
  await seedOrganization(db, ORG_A);
  await seedOrganization(db, ORG_B);
  for (const role of ['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'VIEWER'] as const) {
    await seedMember(db, ORG_A, role);
  }
  await seedMember(db, ORG_B, 'ADMIN');
}

describe('C-04 team.createInvitation', () => {
  beforeEach(seedBaseOrg);

  it('creates a PENDING invitation, stores only tokenHash, and returns the raw token once', async () => {
    const result = await teamCreateInvitation.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: { email: 'Invitee@Example.com', role: 'VIEWER' },
      }),
      db,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { invitationId, token } = result.data as { invitationId: string; token: string };
    expect(token).toMatch(/^[a-f0-9]{64}$/);

    const invitation = await db.doc(paths.invitation(ORG_A, invitationId)).get();
    expect(invitation.get('status')).toBe('PENDING');
    expect(invitation.get('emailNormalized')).toBe('invitee@example.com');
    expect(invitation.get('role')).toBe('VIEWER');
    expect(invitation.get('tokenHash')).toBe(await sha256Hex(token));
    expect(JSON.stringify(invitation.data())).not.toContain(token);

    const audit = await db.collection(`${paths.organization(ORG_A)}/auditLogs`).get();
    expect(audit.docs.some((doc) => doc.get('action') === 'team.createInvitation')).toBe(true);
  });

  it('rejects a payload naming role OWNER', async () => {
    const result = await teamCreateInvitation.execute(
      callable(uidFor(ORG_A, 'OWNER'), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: { email: 'x@example.com', role: 'OWNER' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('invalid-argument');
  });

  it.each(['INVENTORY_MANAGER', 'VIEWER'] as const)('denies %s — ADMINS only', async (role) => {
    const result = await teamCreateInvitation.execute(
      callable(uidFor(ORG_A, role), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: { email: 'x@example.com', role: 'VIEWER' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('ROLE_NOT_PERMITTED');
  });

  it('replays an identical retry without creating a second invitation', async () => {
    const request = callable(uidFor(ORG_A, 'ADMIN'), {
      orgId: ORG_A,
      operationId: OPERATION_ID_A,
      payload: { email: 'once@example.com', role: 'VIEWER' },
    });
    const first = await teamCreateInvitation.execute(request, db);
    const second = await teamCreateInvitation.execute(request, db);
    expect(first).toEqual(second);
    const invitations = await db
      .collection(`${paths.organization(ORG_A)}/invitations`)
      .where('emailNormalized', '==', 'once@example.com')
      .get();
    expect(invitations.size).toBe(1);
  });
});

describe('C-05 team.revokeInvitation', () => {
  beforeEach(seedBaseOrg);

  it('revokes a PENDING invitation and audits it', async () => {
    await seedInvitation(db, ORG_A, 'inv-pending');
    const result = await teamRevokeInvitation.execute(
      callable(uidFor(ORG_A, 'ADMIN'), { orgId: ORG_A, payload: { invitationId: 'inv-pending' } }),
      db,
    );
    expect(result.ok).toBe(true);
    const invitation = await db.doc(paths.invitation(ORG_A, 'inv-pending')).get();
    expect(invitation.get('status')).toBe('REVOKED');
    const audit = await db.collection(`${paths.organization(ORG_A)}/auditLogs`).get();
    expect(audit.docs.some((doc) => doc.get('action') === 'team.revokeInvitation')).toBe(true);
  });

  it('fails INVITE_NOT_PENDING for an already-revoked invitation', async () => {
    await seedInvitation(db, ORG_A, 'inv-revoked', { status: 'REVOKED' });
    const result = await teamRevokeInvitation.execute(
      callable(uidFor(ORG_A, 'ADMIN'), { orgId: ORG_A, payload: { invitationId: 'inv-revoked' } }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('INVITE_NOT_PENDING');
  });

  it('fails INVITE_EXPIRED for a PENDING invitation past its expiry, distinct from INVITE_NOT_PENDING', async () => {
    await seedInvitation(db, ORG_A, 'inv-expired', {
      expiresAt: Timestamp.fromMillis(Date.now() - 1000),
    });
    const result = await teamRevokeInvitation.execute(
      callable(uidFor(ORG_A, 'ADMIN'), { orgId: ORG_A, payload: { invitationId: 'inv-expired' } }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('INVITE_EXPIRED');
  });

  it('fails not-found for an invitation belonging to another organization', async () => {
    await seedInvitation(db, ORG_B, 'inv-in-b');
    const result = await teamRevokeInvitation.execute(
      callable(uidFor(ORG_A, 'ADMIN'), { orgId: ORG_A, payload: { invitationId: 'inv-in-b' } }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('not-found');
  });
});

describe('C-06 team.acceptInvitation', () => {
  beforeEach(seedBaseOrg);

  const RAW_TOKEN = 'f'.repeat(64);

  it('accepts a valid invitation: membership, mirror and audit in one transaction, plus a notification', async () => {
    const tokenHash = await sha256Hex(RAW_TOKEN);
    await seedInvitation(db, ORG_A, 'inv-1', {
      tokenHash,
      emailNormalized: 'newperson@stockmok.test',
      role: 'INVENTORY_MANAGER',
    });

    const result = await teamAcceptInvitation.execute(
      {
        auth: {
          uid: 'new-person',
          token: { email: 'newperson@stockmok.test', email_verified: true },
        },
        data: {
          orgId: ORG_A,
          operationId: OPERATION_ID_A,
          payload: { token: RAW_TOKEN },
        },
      },
      db,
    );
    expect(result.ok).toBe(true);

    const invitation = await db.doc(paths.invitation(ORG_A, 'inv-1')).get();
    expect(invitation.get('status')).toBe('ACCEPTED');
    expect(invitation.get('acceptedBy')).toBe('new-person');

    const member = await db.doc(paths.member(ORG_A, 'new-person')).get();
    expect(member.get('role')).toBe('INVENTORY_MANAGER');
    expect(member.get('status')).toBe('ACTIVE');

    const membership = await db.doc(paths.membership('new-person', ORG_A)).get();
    expect(membership.get('role')).toBe('INVENTORY_MANAGER');

    const audit = await db.collection(`${paths.organization(ORG_A)}/auditLogs`).get();
    expect(audit.docs.some((doc) => doc.get('action') === 'team.acceptInvitation')).toBe(true);

    const ownerNotifications = await db
      .collection(`${paths.user(uidFor(ORG_A, 'OWNER'))}/notifications`)
      .get();
    expect(ownerNotifications.docs.some((doc) => doc.get('type') === 'MEMBERSHIP_CHANGED')).toBe(
      true,
    );
  });

  it('fails INVITE_EMAIL_MISMATCH when the verified email does not match', async () => {
    const tokenHash = await sha256Hex(`${RAW_TOKEN}-mismatch`.padEnd(64, '0').slice(0, 64));
    await seedInvitation(db, ORG_A, 'inv-mismatch', {
      tokenHash,
      emailNormalized: 'expected@stockmok.test',
    });
    const result = await teamAcceptInvitation.execute(
      {
        auth: {
          uid: 'wrong-person',
          token: { email: 'other@stockmok.test', email_verified: true },
        },
        data: {
          orgId: ORG_A,
          operationId: OPERATION_ID_A,
          payload: { token: `${RAW_TOKEN}-mismatch`.padEnd(64, '0').slice(0, 64) },
        },
      },
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe(
      'INVITE_EMAIL_MISMATCH',
    );
  });

  it('fails INVITE_UNKNOWN for a token matching no invitation', async () => {
    const result = await teamAcceptInvitation.execute(
      {
        auth: { uid: 'someone', token: { email: 'someone@stockmok.test', email_verified: true } },
        data: {
          orgId: ORG_A,
          operationId: OPERATION_ID_A,
          payload: { token: '0'.repeat(64) },
        },
      },
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('INVITE_UNKNOWN');
  });

  it('succeeds without creating a duplicate membership when already an ACTIVE member (FR-TEAM-011)', async () => {
    const tokenHash = await sha256Hex(RAW_TOKEN);
    await seedInvitation(db, ORG_A, 'inv-already', {
      tokenHash,
      emailNormalized: 'existing-owner@stockmok.test',
      status: 'ACCEPTED',
    });
    const ownerUid = uidFor(ORG_A, 'OWNER');
    await seedMember(db, ORG_A, 'OWNER');

    const result = await teamAcceptInvitation.execute(
      {
        auth: {
          uid: ownerUid,
          token: { email: 'existing-owner@stockmok.test', email_verified: true },
        },
        data: { orgId: ORG_A, operationId: OPERATION_ID_B, payload: { token: RAW_TOKEN } },
      },
      db,
    );
    expect(result.ok).toBe(true);
    const member = await db.doc(paths.member(ORG_A, ownerUid)).get();
    expect(member.get('role')).toBe('OWNER');
  });
});

describe('C-07 team.changeMemberRole', () => {
  beforeEach(seedBaseOrg);

  it('changes the role, mirrors it, audits it and notifies the target', async () => {
    const target = uidFor(ORG_A, 'VIEWER');
    const result = await teamChangeMemberRole.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { uid: target, role: 'ANALYST' },
      }),
      db,
    );
    expect(result.ok).toBe(true);
    const member = await db.doc(paths.member(ORG_A, target)).get();
    expect(member.get('role')).toBe('ANALYST');
    const membership = await db.doc(paths.membership(target, ORG_A)).get();
    expect(membership.get('role')).toBe('ANALYST');
    const notifications = await db.collection(`${paths.user(target)}/notifications`).get();
    expect(notifications.docs.some((doc) => doc.get('type') === 'MEMBERSHIP_CHANGED')).toBe(true);
  });

  it('refuses to assign OWNER at the schema layer', async () => {
    const result = await teamChangeMemberRole.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { uid: uidFor(ORG_A, 'VIEWER'), role: 'OWNER' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('invalid-argument');
  });

  it('refuses to target the canonical Owner, even naming a non-OWNER role', async () => {
    const ownerUid = uidFor(ORG_A, 'OWNER');
    const result = await teamChangeMemberRole.execute(
      callable(uidFor(ORG_A, 'ADMIN'), { orgId: ORG_A, payload: { uid: ownerUid, role: 'ADMIN' } }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('OWNER_PROTECTED');
    const member = await db.doc(paths.member(ORG_A, ownerUid)).get();
    expect(member.get('role')).toBe('OWNER');
  });

  it('a forged OWNER-role membership document confers no Owner protection', async () => {
    await db.doc(paths.member(ORG_A, 'impostor')).set({
      uid: 'impostor',
      role: 'OWNER',
      status: 'ACTIVE',
      displayName: 'Impostor',
      email: 'impostor@stockmok.test',
    });
    await db.doc(paths.membership('impostor', ORG_A)).set({
      organizationId: ORG_A,
      handle: ORG_A,
      organizationName: ORG_A,
      monogram: 'ST',
      monogramColor: 'blue',
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await teamChangeMemberRole.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { uid: 'impostor', role: 'ANALYST' },
      }),
      db,
    );
    expect(result.ok).toBe(true);
    const member = await db.doc(paths.member(ORG_A, 'impostor')).get();
    expect(member.get('role')).toBe('ANALYST');
  });

  it.each(['INVENTORY_MANAGER', 'VIEWER'] as const)('denies %s — ADMINS only', async (role) => {
    const result = await teamChangeMemberRole.execute(
      callable(uidFor(ORG_A, role), {
        orgId: ORG_A,
        payload: { uid: uidFor(ORG_A, 'VIEWER'), role: 'ANALYST' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('ROLE_NOT_PERMITTED');
  });
});

describe('C-08 team.setMemberStatus', () => {
  beforeEach(seedBaseOrg);

  it('suspends an ACTIVE member, mirrors it, audits it and notifies the target', async () => {
    const target = uidFor(ORG_A, 'VIEWER');
    const result = await teamSetMemberStatus.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { uid: target, status: 'SUSPENDED' },
      }),
      db,
    );
    expect(result.ok).toBe(true);
    const member = await db.doc(paths.member(ORG_A, target)).get();
    expect(member.get('status')).toBe('SUSPENDED');
    const membership = await db.doc(paths.membership(target, ORG_A)).get();
    expect(membership.get('status')).toBe('SUSPENDED');
    const notifications = await db.collection(`${paths.user(target)}/notifications`).get();
    expect(notifications.docs.some((doc) => doc.get('type') === 'MEMBERSHIP_CHANGED')).toBe(true);
  });

  it('reactivates a SUSPENDED member', async () => {
    const target = uidFor(ORG_A, 'INVENTORY_MANAGER');
    await db.doc(paths.member(ORG_A, target)).update({ status: 'SUSPENDED' });
    const result = await teamSetMemberStatus.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { uid: target, status: 'ACTIVE' },
      }),
      db,
    );
    expect(result.ok).toBe(true);
    const member = await db.doc(paths.member(ORG_A, target)).get();
    expect(member.get('status')).toBe('ACTIVE');
  });

  it('REMOVED is terminal — no transition out of it', async () => {
    const target = uidFor(ORG_A, 'VIEWER');
    await db.doc(paths.member(ORG_A, target)).update({ status: 'REMOVED' });
    const result = await teamSetMemberStatus.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { uid: target, status: 'ACTIVE' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('INVALID_TRANSITION');
  });

  it('rejects a self-transition (ACTIVE to ACTIVE) as an invalid transition', async () => {
    const target = uidFor(ORG_A, 'VIEWER');
    const result = await teamSetMemberStatus.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { uid: target, status: 'ACTIVE' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('INVALID_TRANSITION');
  });

  it('refuses to target the canonical Owner — Admin cannot suspend or remove the Owner', async () => {
    const ownerUid = uidFor(ORG_A, 'OWNER');
    const result = await teamSetMemberStatus.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { uid: ownerUid, status: 'SUSPENDED' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('OWNER_PROTECTED');
  });
});
