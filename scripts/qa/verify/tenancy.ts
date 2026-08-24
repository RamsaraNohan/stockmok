import type { DocumentData } from 'firebase-admin/firestore';

import type { QaSnapshot } from './integrity.js';

/**
 * Tenant isolation.
 *
 * Two questions, kept apart:
 *
 *   1. Does any document *leak* across a tenant boundary - an organization-scoped
 *      field naming a different organization than the one it lives under, or a
 *      notification about an organization the recipient does not belong to?
 *      These are `CROSS_TENANT_REFERENCE_FAILURES` and must be zero.
 *
 *   2. Are the isolation *traps* actually armed - do confusable identities really
 *      exist in more than one organization, so a query missing its org filter
 *      would visibly return the wrong tenant's row?
 *
 * A trap is valid data. It never contributes to (1); if it ever did, the trap
 * itself would be the bug.
 */

function stringField(data: DocumentData, key: string): string | undefined {
  const value: unknown = data[key];
  return typeof value === 'string' ? value : undefined;
}

/** Network references that legitimately name another organization. */
const CROSS_ORG_BY_CONTRACT: ReadonlySet<string> = new Set([
  'counterpartyOrgId',
  'buyerOrgId',
  'supplierOrgId',
  'supplierCatalogItemId',
  'supplierOrgHandle',
  'counterpartyHandle',
  // `writeConnectedHistory` (`connected-lib.ts`) writes one identical row —
  // `actorOrgId` included — to the canonical record AND both organizations'
  // history mirrors, so a transition the supplier performed legitimately
  // carries the supplier's `actorOrgId` inside the buyer's own history
  // subcollection, and vice versa. The private lane's history never crosses
  // an org boundary, so `actorOrgId` there is always the owning org anyway.
  'actorOrgId',
]);

export function verifyTenancy(snapshot: QaSnapshot): readonly string[] {
  const failures: string[] = [];
  const orgIds = new Set<string>();
  for (const path of snapshot.documents.keys()) {
    const parts = path.split('/');
    if (parts[0] === 'organizations' && parts.length === 2 && parts[1] !== undefined) {
      orgIds.add(parts[1]);
    }
  }

  // Membership pairs must agree from both directions.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'users' || parts[2] !== 'memberships') continue;
    const uid = parts[1];
    const pathOrg = parts[3];
    const declared = stringField(data, 'organizationId');
    if (uid === undefined || pathOrg === undefined) continue;
    if (declared !== undefined && declared !== pathOrg) {
      failures.push(
        `CROSS_TENANT_REFERENCE ${path} declares organizationId=${declared} under ${pathOrg}`,
      );
    }
    if (!snapshot.documents.has(`organizations/${pathOrg}/members/${uid}`)) {
      failures.push(`CROSS_TENANT_REFERENCE ${path} has no matching member document`);
    }
  }

  // A notification may only describe an organization its recipient belongs to.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'users' || parts[2] !== 'notifications') continue;
    const uid = parts[1];
    const orgId = stringField(data, 'organizationId');
    if (uid === undefined || orgId === undefined) continue;
    if (!snapshot.documents.has(`users/${uid}/memberships/${orgId}`)) {
      failures.push(
        `CROSS_TENANT_REFERENCE ${path} targets ${orgId}, which ${uid} is not a member of`,
      );
    }
  }

  // An organization-scoped document may not claim to belong to another org.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts.length < 4) continue;
    const pathOrg = parts[1];
    if (pathOrg === undefined) continue;
    const declared = stringField(data, 'organizationId');
    if (declared !== undefined && declared !== pathOrg) {
      failures.push(`CROSS_TENANT_REFERENCE ${path} declares organizationId=${declared}`);
    }
    // Any *other* field naming a known organization must either be the owning
    // org or an explicitly cross-organization network field.
    for (const [key, raw] of Object.entries(data)) {
      if (typeof raw !== 'string' || !orgIds.has(raw) || raw === pathOrg) continue;
      if (CROSS_ORG_BY_CONTRACT.has(key)) continue;
      failures.push(`CROSS_TENANT_REFERENCE ${path} field ${key} names foreign org ${raw}`);
    }
  }

  // A connection projection belongs to one of its two sides.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'connections') continue;
    const pathOrg = parts[1];
    const buyer = stringField(data, 'buyerOrgId');
    const supplier = stringField(data, 'supplierOrgId');
    if (pathOrg !== buyer && pathOrg !== supplier) {
      failures.push(
        `CROSS_TENANT_REFERENCE ${path} is held by an organization that is not a party`,
      );
    }
  }

  // A connected order projection belongs to one of its two sides.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'purchaseOrders' || parts.length !== 4)
      continue;
    if (stringField(data, 'supplierKind') !== 'CONNECTED') continue;
    const pathOrg = parts[1];
    const connectionId = stringField(data, 'connectionId');
    if (connectionId === undefined || pathOrg === undefined) continue;
    const canonical = snapshot.documents.get(`connections/${connectionId}`);
    if (canonical === undefined) continue;
    const buyer = stringField(canonical, 'buyerOrgId');
    const supplier = stringField(canonical, 'supplierOrgId');
    if (pathOrg !== buyer && pathOrg !== supplier) {
      failures.push(`CROSS_TENANT_REFERENCE ${path} projects a connection it is not party to`);
    }
  }

  return failures;
}

export interface TrapReport {
  readonly duplicatedProductIds: readonly string[];
  readonly duplicatedSkus: readonly string[];
  readonly duplicatedPartnerNames: readonly string[];
  readonly failures: readonly string[];
}

/** Confirms the confusable identities really exist in more than one organization. */
export function verifyTrapsArmed(snapshot: QaSnapshot): TrapReport {
  const productOrgs = new Map<string, Set<string>>();
  const skuOrgs = new Map<string, Set<string>>();
  const partnerOrgs = new Map<string, Set<string>>();

  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts.length !== 4) continue;
    const org = parts[1];
    const id = parts[3];
    if (org === undefined || id === undefined) continue;

    if (parts[2] === 'products') {
      const byId = productOrgs.get(id) ?? new Set<string>();
      byId.add(org);
      productOrgs.set(id, byId);
      const sku = stringField(data, 'internalSkuNormalized');
      if (sku !== undefined) {
        const bySku = skuOrgs.get(sku) ?? new Set<string>();
        bySku.add(org);
        skuOrgs.set(sku, bySku);
      }
    }

    if (parts[2] === 'privatePartners') {
      const name = stringField(data, 'name');
      if (name !== undefined) {
        const byName = partnerOrgs.get(name) ?? new Set<string>();
        byName.add(org);
        partnerOrgs.set(name, byName);
      }
    }
  }

  const duplicatedProductIds = [...productOrgs.entries()]
    .filter(([, orgs]) => orgs.size > 1)
    .map(([id]) => id)
    .sort();
  const duplicatedSkus = [...skuOrgs.entries()]
    .filter(([, orgs]) => orgs.size > 1)
    .map(([sku]) => sku)
    .sort();
  const duplicatedPartnerNames = [...partnerOrgs.entries()]
    .filter(([, orgs]) => orgs.size > 1)
    .map(([name]) => name)
    .sort();

  const failures: string[] = [];
  if (duplicatedProductIds.length === 0) {
    failures.push('TRAP_NOT_ARMED no product id is shared across organizations');
  }
  if (duplicatedSkus.length === 0) {
    failures.push('TRAP_NOT_ARMED no SKU is shared across organizations');
  }
  if (duplicatedPartnerNames.length === 0) {
    failures.push('TRAP_NOT_ARMED no partner name is shared across organizations');
  }

  return { duplicatedProductIds, duplicatedSkus, duplicatedPartnerNames, failures };
}
