import { paths, type MemberStatus } from '@stockmok/shared';
import { Timestamp } from 'firebase-admin/firestore';
import { generateInvitationToken, requireMembership, sha256Hex } from './lib.js';
import { writeAudit } from '../core/audit.js';
import { defineCommand } from '../core/define-command.js';
import { fail } from '../core/errors.js';
import { writeNotifications } from '../core/notify.js';
import { serverNow, serverTimestamp } from '../core/time.js';
import { requireTrustedEmail } from '../guards/auth.js';
import type { TrustedMembership } from '../guards/membership.js';
import { assertOwnerNotTargeted, assertRoleAssignable } from '../guards/owner.js';
import { readActiveMemberUidsByRole, readOrganizationDocument } from '../guards/reads.js';
import { requireTenantDocument } from '../guards/tenant.js';

const INVITATION_TTL_MILLIS = 7 * 24 * 60 * 60 * 1000;

/**
 * C-04 `team.createInvitation` — `ADMINS`, idempotent, transactional, audited.
 *
 * The raw token is returned in this command's result **only** — never
 * written to the `invitations` document, which stores `tokenHash` alone
 * (DB-02 §3.4). It reaches the creating Admin's client exactly once, on this
 * call (or its own idempotent replay of the same `operationId`); it is never
 * re-readable from any Firestore document a client can reach.
 */
export const teamCreateInvitation = defineCommand({
  id: 'C-04',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN'] },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const emailNormalized = payload.email.toLowerCase();
    const token = generateInvitationToken();
    const tokenHash = await sha256Hex(token);
    const invitationId = db.collection(`${paths.organization(orgId)}/invitations`).doc().id;
    const expiresAt = Timestamp.fromMillis(serverNow().toMillis() + INVITATION_TTL_MILLIS);

    scope.create(db.doc(paths.invitation(orgId, invitationId)), {
      invitationId,
      organizationId: orgId,
      emailNormalized,
      role: payload.role,
      tokenHash,
      status: 'PENDING',
      expiresAt,
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
    });

    writeAudit(scope, db, actor, {
      action: 'team.createInvitation',
      entityType: 'INVITATION',
      entityId: invitationId,
      summary: `Invited ${emailNormalized} as ${payload.role}.`,
      metadata: { role: payload.role },
    });

    return { invitationId, token };
  },
});

/**
 * C-05 `team.revokeInvitation` — `ADMINS`, audited.
 *
 * An invitation that is already expired (but still stored `PENDING`) fails
 * `INVITE_EXPIRED` rather than `INVITE_NOT_PENDING` — DB-07 §2 requires the
 * two failures stay distinct. The stored value is not rewritten to `EXPIRED`
 * on this path: DB-06 §0's atomicity guarantee ("a command either commits
 * its entire write set or writes nothing") means a write just before a
 * thrown failure would roll back with it, so it is not attempted here.
 * `Q-010` already filters `expiresAt > now` for the pending-invitations list,
 * so a stale stored value never leaks into the UI either way.
 */
export const teamRevokeInvitation = defineCommand({
  id: 'C-05',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN'] },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const invitationId = payload.invitationId;
    const invitationRef = db.doc(paths.invitation(orgId, invitationId));
    const invitationSnap = await scope.get(invitationRef);
    requireTenantDocument(invitationSnap, actor, 'The invitation');

    const status = invitationSnap.get('status') as string;
    const expiresAt = invitationSnap.get('expiresAt') as Timestamp;
    if (status === 'PENDING' && expiresAt.toMillis() <= serverNow().toMillis()) {
      fail('INVITE_EXPIRED', 'This invitation has already expired.');
    }
    if (status !== 'PENDING') {
      fail('INVITE_NOT_PENDING', 'This invitation is no longer pending.');
    }

    scope.update(invitationRef, { status: 'REVOKED' });

    writeAudit(scope, db, actor, {
      action: 'team.revokeInvitation',
      entityType: 'INVITATION',
      entityId: invitationId,
      summary: `Revoked the invitation to ${invitationSnap.get('emailNormalized') as string}.`,
    });

    return { invitationId };
  },
});

/**
 * C-06 `team.acceptInvitation` — `INVITEE`, idempotent, transactional, audited.
 *
 * There is no direct-id lookup: the payload carries only the raw `token`
 * (DB-02 §3.4 makes `tokenHash` the stored link), so the invitation is found
 * by a bounded `tokenHash ==` query inside the transaction, scoped to the
 * `orgId` routing hint. The caller's verified email — never the payload — is
 * matched against `emailNormalized` (DB-05 §7 step 5 equivalent for an
 * INVITEE-authorized command).
 */
export const teamAcceptInvitation = defineCommand({
  id: 'C-06',
  authorization: { kind: 'INVITEE' },
  handler: async ({ db, scope, auth, orgId, payload }) => {
    const email = requireTrustedEmail(auth);

    const invitationsQuery = db
      .collection(`${paths.organization(orgId)}/invitations`)
      .where('tokenHash', '==', await sha256Hex(payload.token));
    const invitationsSnap = await scope.query(invitationsQuery, 1);
    const invitationDoc = invitationsSnap.docs[0];
    if (!invitationDoc) {
      fail('INVITE_UNKNOWN', 'This invitation link is not valid.');
    }
    const status = invitationDoc.get('status') as string;
    const expiresAt = invitationDoc.get('expiresAt') as Timestamp;
    const role = invitationDoc.get('role') as string;
    const emailNormalized = invitationDoc.get('emailNormalized') as string;

    const memberRef = db.doc(paths.member(orgId, auth.uid));
    const memberSnap = await scope.get(memberRef);

    if (status === 'PENDING' && expiresAt.toMillis() <= serverNow().toMillis()) {
      fail('INVITE_EXPIRED', 'This invitation has already expired.');
    }
    if (status === 'ACCEPTED') {
      if (memberSnap.exists && memberSnap.get('status') === 'ACTIVE') {
        // FR-TEAM-011 — accepting when already an ACTIVE member succeeds
        // without creating a duplicate membership.
        return { organizationId: orgId, invitationId: invitationDoc.id };
      }
      fail('INVITE_NOT_PENDING', 'This invitation has already been used.');
    }
    if (status !== 'PENDING') {
      fail('INVITE_NOT_PENDING', 'This invitation is no longer pending.');
    }
    if (emailNormalized !== email) {
      fail('INVITE_EMAIL_MISMATCH', 'This invitation was sent to a different email address.');
    }

    const organization = await readOrganizationDocument(db, scope.reader(), orgId);
    if (!organization) fail('RESOURCE_NOT_FOUND', 'The organization does not exist.');
    const organizationName = typeof organization.name === 'string' ? organization.name : orgId;
    const handle = typeof organization.handle === 'string' ? organization.handle : orgId;

    const userSnap = await scope.get(db.doc(paths.user(auth.uid)));
    const displayName =
      userSnap.exists && typeof userSnap.get('displayName') === 'string'
        ? (userSnap.get('displayName') as string)
        : (email.split('@')[0] ?? email);
    const monogram = typeof organization.monogram === 'string' ? organization.monogram : 'ST';
    const monogramColor =
      typeof organization.monogramColor === 'string' ? organization.monogramColor : 'blue';

    const recipients = await readActiveMemberUidsByRole(
      db,
      orgId,
      ['OWNER', 'ADMIN'],
      50,
      scope.raw,
    );

    scope.update(invitationDoc.ref, {
      status: 'ACCEPTED',
      acceptedBy: auth.uid,
      acceptedAt: serverTimestamp(),
    });

    scope.set(
      memberRef,
      {
        uid: auth.uid,
        role,
        status: 'ACTIVE',
        displayName,
        email,
        invitedBy: invitationDoc.get('createdBy') as string,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    scope.set(
      db.doc(paths.membership(auth.uid, orgId)),
      {
        organizationId: orgId,
        handle,
        organizationName,
        monogram,
        monogramColor,
        role,
        status: 'ACTIVE',
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    const actor: TrustedMembership = {
      orgId,
      uid: auth.uid,
      role: role as TrustedMembership['role'],
      status: 'ACTIVE',
      displayName,
      email,
    };
    writeAudit(scope, db, actor, {
      action: 'team.acceptInvitation',
      entityType: 'INVITATION',
      entityId: invitationDoc.id,
      summary: `${displayName} joined as ${role}.`,
    });

    writeNotifications(scope, db, {
      recipients,
      orgId,
      organizationName,
      type: 'MEMBERSHIP_CHANGED',
      title: 'New team member',
      message: `${displayName} accepted their invitation and joined as ${role}.`,
      referenceType: 'MEMBERSHIP',
      referenceId: auth.uid,
    });

    return { organizationId: orgId, invitationId: invitationDoc.id };
  },
});

function membershipAction(from: MemberStatus, to: MemberStatus): string | undefined {
  if (from === 'ACTIVE' && to === 'SUSPENDED') return 'suspend';
  if (from === 'SUSPENDED' && to === 'ACTIVE') return 'reactivate';
  if ((from === 'ACTIVE' || from === 'SUSPENDED') && to === 'REMOVED') return 'remove';
  return undefined;
}

async function loadOrganizationContext(
  db: Parameters<typeof readOrganizationDocument>[0],
  scope: { reader: () => Parameters<typeof readOrganizationDocument>[1] },
  orgId: string,
): Promise<{ ownerUid: string; organizationName: string }> {
  const organization = await readOrganizationDocument(db, scope.reader(), orgId);
  if (!organization) fail('RESOURCE_NOT_FOUND', 'The organization does not exist.');
  const ownerUid = organization.ownerUid;
  if (typeof ownerUid !== 'string' || ownerUid.length === 0) {
    fail('RESOURCE_NOT_FOUND', 'The organization does not name a canonical Owner.');
  }
  return {
    ownerUid,
    organizationName: typeof organization.name === 'string' ? organization.name : orgId,
  };
}

/**
 * C-07 `team.changeMemberRole` — `ADMINS`, audited, notifies the target.
 *
 * The role checked and mutated is the membership document's own field, never
 * a payload-supplied role for the caller. `OWNER` can never be assigned
 * (payload schema excludes it; `assertRoleAssignable` re-checks server-side)
 * and the canonical Owner can never be targeted.
 */
export const teamChangeMemberRole = defineCommand({
  id: 'C-07',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN'] },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    assertRoleAssignable(payload.role);

    const memberRef = db.doc(paths.member(orgId, payload.uid));
    const memberSnap = await scope.get(memberRef);
    requireTenantDocument(memberSnap, actor, 'The member');

    const { ownerUid, organizationName } = await loadOrganizationContext(db, scope, orgId);
    assertOwnerNotTargeted(payload.uid, ownerUid);

    scope.update(memberRef, { role: payload.role, updatedAt: serverTimestamp() });
    scope.update(db.doc(paths.membership(payload.uid, orgId)), {
      role: payload.role,
      updatedAt: serverTimestamp(),
    });

    writeAudit(scope, db, actor, {
      action: 'team.changeMemberRole',
      entityType: 'MEMBERSHIP',
      entityId: payload.uid,
      summary: `Changed ${memberSnap.get('displayName') as string}'s role to ${payload.role}.`,
      metadata: { role: payload.role },
    });

    writeNotifications(scope, db, {
      recipients: [payload.uid],
      orgId,
      organizationName,
      type: 'MEMBERSHIP_CHANGED',
      title: 'Your role changed',
      message: `Your role in ${organizationName} is now ${payload.role}.`,
      referenceType: 'MEMBERSHIP',
      referenceId: payload.uid,
    });

    return { uid: payload.uid, role: payload.role };
  },
});

/**
 * C-08 `team.setMemberStatus` — `ADMINS`, audited, notifies the target.
 *
 * The target status must name one of the three legal membership transitions
 * (`suspend`, `reactivate`, `remove` — DB-07 §1); anything else, including a
 * self-transition, is `INVALID_TRANSITION`. `REMOVED` is terminal.
 */
export const teamSetMemberStatus = defineCommand({
  id: 'C-08',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN'] },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const memberRef = db.doc(paths.member(orgId, payload.uid));
    const memberSnap = await scope.get(memberRef);
    requireTenantDocument(memberSnap, actor, 'The member');

    const currentStatus = memberSnap.get('status') as MemberStatus;
    const action = membershipAction(currentStatus, payload.status);
    if (!action) {
      fail(
        'INVALID_TRANSITION',
        `A member cannot move from ${currentStatus} to ${payload.status}.`,
      );
    }

    const { ownerUid, organizationName } = await loadOrganizationContext(db, scope, orgId);
    assertOwnerNotTargeted(payload.uid, ownerUid);

    scope.update(memberRef, { status: payload.status, updatedAt: serverTimestamp() });
    scope.update(db.doc(paths.membership(payload.uid, orgId)), {
      status: payload.status,
      updatedAt: serverTimestamp(),
    });

    writeAudit(scope, db, actor, {
      action: 'team.setMemberStatus',
      entityType: 'MEMBERSHIP',
      entityId: payload.uid,
      summary: `${memberSnap.get('displayName') as string} was ${action}d.`,
      metadata: { status: payload.status },
    });

    writeNotifications(scope, db, {
      recipients: [payload.uid],
      orgId,
      organizationName,
      type: 'MEMBERSHIP_CHANGED',
      title: 'Your membership status changed',
      message: `Your membership in ${organizationName} is now ${payload.status}.`,
      referenceType: 'MEMBERSHIP',
      referenceId: payload.uid,
    });

    return { uid: payload.uid, status: payload.status };
  },
});
