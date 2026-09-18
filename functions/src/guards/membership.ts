import {
  IdSchema,
  MemberStatusSchema,
  RoleSchema,
  type MemberStatus,
  type Role,
} from '@stockmok/shared';
import type { Firestore } from 'firebase-admin/firestore';
import { fail } from '../core/errors.js';
import type { AuthContext } from './auth.js';
import { readMemberDocument, type TrustedReader } from './reads.js';

/**
 * Steps 3 and 4 of DB-05 §7 — MEMBERSHIP and STATUS.
 *
 * The membership document is read **from the database**, every request, for the
 * organization the caller claims to act for. A cached tab or a live ID token
 * grants nothing: a suspended or removed member is denied structurally.
 */

/** Server-derived membership. Nothing on it came from the request payload. */
export interface TrustedMembership {
  readonly orgId: string;
  readonly uid: string;
  readonly role: Role;
  readonly status: MemberStatus;
  readonly displayName: string;
  readonly email: string | undefined;
}

export function assertOrgId(value: unknown): string {
  const parsed = IdSchema.safeParse(value);
  if (!parsed.success) {
    fail('SCHEMA_INVALID', 'orgId must be one non-empty Firestore path segment.', {
      path: 'orgId',
    });
  }
  return parsed.data;
}

/**
 * Reads the membership without judging it, so a caller that needs to distinguish
 * "absent" from "not active" can. Returns `undefined` when no document exists.
 */
export async function readMembership(
  db: Firestore,
  read: TrustedReader,
  orgId: string,
  uid: string,
): Promise<TrustedMembership | undefined> {
  const data = await readMemberDocument(db, read, orgId, uid);
  if (!data) return undefined;

  const role = RoleSchema.safeParse(data.role);
  const status = MemberStatusSchema.safeParse(data.status);
  if (!role.success || !status.success) {
    // A membership document that does not carry one of the seven frozen roles
    // and a frozen status is not a membership. Deny rather than guess.
    fail('NOT_A_MEMBER', 'The membership record is not valid for this organization.');
  }

  return {
    orgId,
    uid,
    role: role.data,
    status: status.data,
    displayName: typeof data.displayName === 'string' ? data.displayName : uid,
    email: typeof data.email === 'string' ? data.email.toLowerCase() : undefined,
  };
}

/**
 * The guard every organization-scoped trusted operation runs. Denies a
 * non-member, a member of a different organization (the document simply does
 * not exist under this `orgId`), and any membership that is not ACTIVE.
 */
export async function requireActiveMembership(
  db: Firestore,
  read: TrustedReader,
  auth: AuthContext,
  orgId: string,
): Promise<TrustedMembership> {
  const membership = await readMembership(db, read, orgId, auth.uid);
  if (!membership) {
    fail('NOT_A_MEMBER', 'You are not a member of this organization.');
  }
  if (membership.status !== 'ACTIVE') {
    fail('MEMBERSHIP_NOT_ACTIVE', 'Your membership in this organization is not active.');
  }
  return membership;
}
