import type { Firestore } from 'firebase-admin/firestore';
import { fail } from '../core/errors.js';
import type { TrustedMembership } from './membership.js';
import { OWNER } from './roles.js';
import { readOrganizationDocument, type TrustedReader } from './reads.js';

/**
 * Owner protection primitives.
 *
 * There is exactly **one** canonical Owner per organization, named by
 * `organizations/{orgId}.ownerUid` (DB-02 §3.3), and the Owner is protected from
 * Admin modification. The membership document's `role` field is a mirror: the
 * organization document is the authority on who the canonical Owner is, so a
 * forged or drifted `role: 'OWNER'` on a member document cannot confer
 * protection or bypass it.
 *
 * B1 supplies the primitives. B2's `team.changeMemberRole` and
 * `team.setMemberStatus` are the commands that consume them.
 */

/** The canonical Owner uid, read from the organization document. */
export async function readCanonicalOwnerUid(
  db: Firestore,
  read: TrustedReader,
  orgId: string,
): Promise<string> {
  const organization = await readOrganizationDocument(db, read, orgId);
  if (!organization) {
    fail('RESOURCE_NOT_FOUND', 'The organization does not exist.');
  }
  const ownerUid = organization.ownerUid;
  if (typeof ownerUid !== 'string' || ownerUid.length === 0) {
    fail('RESOURCE_NOT_FOUND', 'The organization does not name a canonical Owner.');
  }
  return ownerUid;
}

export function isCanonicalOwner(
  membership: TrustedMembership,
  canonicalOwnerUid: string,
): boolean {
  return membership.uid === canonicalOwnerUid;
}

/**
 * An owner-only operation. The caller must be the canonical Owner named by the
 * organization document **and** hold the OWNER role on their ACTIVE membership.
 */
export function requireCanonicalOwner(
  membership: TrustedMembership,
  canonicalOwnerUid: string,
): TrustedMembership {
  if (membership.status !== 'ACTIVE' || membership.role !== OWNER) {
    fail('ROLE_NOT_PERMITTED', 'Only the Owner may perform this action.');
  }
  if (!isCanonicalOwner(membership, canonicalOwnerUid)) {
    fail('ROLE_NOT_PERMITTED', 'Only the Owner may perform this action.');
  }
  return membership;
}

/**
 * The Owner is not an ordinary removable member. Any membership mutation whose
 * target is the canonical Owner is refused — including one attempted by an
 * Admin, and including the Owner's own attempt to demote or suspend themselves,
 * which would leave the organization with no Owner.
 */
export function assertOwnerNotTargeted(targetUid: string, canonicalOwnerUid: string): void {
  if (targetUid === canonicalOwnerUid) {
    fail('OWNER_PROTECTED', 'The Owner of this organization cannot be modified or removed.');
  }
}

/**
 * A role assignment may never name OWNER. Ownership is established by
 * `org.create` and lives on the organization document; no membership command
 * grants it. Mirrors `RoleSchema.exclude(['OWNER'])` on the C-04 and C-07
 * payloads.
 */
export function assertRoleAssignable(role: string): void {
  if (role === OWNER) {
    fail('OWNER_PROTECTED', 'The Owner role cannot be assigned to a member.');
  }
}
