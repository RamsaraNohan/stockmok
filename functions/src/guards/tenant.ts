import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { fail } from '../core/errors.js';
import type { TrustedMembership } from './membership.js';

/**
 * Step 6 of DB-05 §7 — ORGANIZATION / OWNERSHIP.
 *
 * Every referenced resource is re-read and its tenant compared to the **verified
 * membership**, not to the payload. Two distinct facts do the work:
 *
 *   · Path scoping. Reading `organizations/{verifiedOrgId}/warehouses/{id}` makes
 *     an id belonging to another organization resolve to a missing document
 *     rather than to another tenant's data (`T-SEC-25`).
 *
 *   · Field checking. Where a document carries an `organizationId`, it is
 *     compared as well, so a document written under the wrong prefix cannot be
 *     used across tenants either.
 */

/** The tenant every read and write in this request must stay inside. */
export function verifiedTenant(membership: TrustedMembership): string {
  return membership.orgId;
}

/**
 * A missing document under the verified tenant's prefix is `not-found`, not a
 * cross-tenant reference — the caller may not learn whether the id exists
 * elsewhere.
 */
export function requireTenantDocument(
  snapshot: DocumentSnapshot,
  membership: TrustedMembership,
  label: string,
): DocumentSnapshot {
  if (!snapshot.exists) {
    fail('RESOURCE_NOT_FOUND', `${label} was not found in this organization.`);
  }
  assertPathWithinTenant(snapshot.ref.path, membership, label);
  const organizationId = (snapshot.data() as { organizationId?: unknown } | undefined)
    ?.organizationId;
  if (typeof organizationId === 'string' && organizationId !== membership.orgId) {
    fail('CROSS_TENANT_REFERENCE', `${label} belongs to another organization.`);
  }
  return snapshot;
}

/**
 * Defence in depth against a path assembled from something other than the
 * verified tenant. Path building itself goes through the frozen `paths` builders;
 * this asserts the result.
 */
export function assertPathWithinTenant(
  path: string,
  membership: TrustedMembership,
  label: string,
): void {
  const prefix = `organizations/${membership.orgId}/`;
  if (!path.startsWith(prefix)) {
    fail('CROSS_TENANT_REFERENCE', `${label} is outside this organization.`);
  }
}

/**
 * Cross-organization commands (`connection.*`, `cpo.*`) legitimately touch two
 * tenants. The caller must be acting for one of the two named parties, in the
 * correct direction: a buyer transition requires `buyerOrgId`, a supplier
 * transition requires `supplierOrgId` (DB-05 §7.2).
 */
export function assertActingFor(
  membership: TrustedMembership,
  expectedOrgId: string,
  label: string,
): void {
  if (membership.orgId !== expectedOrgId) {
    fail('CROSS_TENANT_REFERENCE', `You are not acting for the ${label} organization.`);
  }
}
