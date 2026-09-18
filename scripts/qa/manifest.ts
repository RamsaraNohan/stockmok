/**
 * Physical-path coverage manifest.
 *
 * Two numbers come out of this file and they are never merged:
 *
 *   PHYSICAL_PATH_CLASSIFICATION_COVERAGE
 *     the share of known physical paths that carry a class. 100% here means
 *     every path has been *accounted for*, not that every path holds data.
 *
 *   PHYSICAL_PATH_SMOKE_POPULATION_COVERAGE
 *     the share of paths the smoke profile is expected to populate that were
 *     actually observed in Firestore.
 *
 * No synthetic document is ever forced into a system-managed or wide-only path
 * to move either number.
 */

export type PathClass =
  | 'SEEDED_SMOKE'
  | 'DEFINED_WIDE_ONLY'
  | 'CANONICAL_EXISTING'
  | 'SYSTEM_MANAGED'
  | 'DERIVED'
  | 'SINGLETON'
  | 'NOT_SYNTHETICALLY_SEEDABLE'
  | 'NOT_APPLICABLE';

export interface PathFamily {
  readonly id: string;
  readonly template: string;
  readonly pathClass: PathClass;
  /** Whether the smoke profile is expected to write into this path. */
  readonly smokePopulated: boolean;
  readonly rationale?: string;
}

export const PATH_FAMILIES: readonly PathFamily[] = [
  {
    id: 'organizationDirectory',
    template: 'organizationDirectory/{handle}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'handleReservations',
    template: 'handleReservations/{handle}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  { id: 'users', template: 'users/{uid}', pathClass: 'SEEDED_SMOKE', smokePopulated: true },
  {
    id: 'memberships',
    template: 'users/{uid}/memberships/{orgId}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'notifications',
    template: 'users/{uid}/notifications/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'organizations',
    template: 'organizations/{orgId}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'settings',
    template: 'organizations/{orgId}/settings/main',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'counters',
    template: 'organizations/{orgId}/counters/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'commandReceipts',
    template: 'organizations/{orgId}/commandReceipts/{operationId}',
    pathClass: 'SYSTEM_MANAGED',
    smokePopulated: false,
    rationale:
      'Written only by the command framework, keyed by a payloadHash of a real invocation. A seeded receipt would hash a call that never happened.',
  },
  {
    id: 'productSkuIndex',
    template: 'organizations/{orgId}/productSkuIndex/{sku}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'members',
    template: 'organizations/{orgId}/members/{uid}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'invitations',
    template: 'organizations/{orgId}/invitations/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'categories',
    template: 'organizations/{orgId}/categories/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'warehouses',
    template: 'organizations/{orgId}/warehouses/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'products',
    template: 'organizations/{orgId}/products/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'stockBalances',
    template: 'organizations/{orgId}/stockBalances/{productId__warehouseId}',
    pathClass: 'DERIVED',
    smokePopulated: true,
    rationale:
      'A read model over the movement ledger; populated, but never an independent source of truth.',
  },
  {
    id: 'productStockSummaries',
    template: 'organizations/{orgId}/productStockSummaries/{productId}',
    pathClass: 'DERIVED',
    smokePopulated: true,
    rationale: 'A read model aggregating stockBalances across warehouses.',
  },
  {
    id: 'stockMovements',
    template: 'organizations/{orgId}/stockMovements/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'privatePartners',
    template: 'organizations/{orgId}/privatePartners/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'purchaseOrders',
    template: 'organizations/{orgId}/purchaseOrders/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'purchaseOrderItems',
    template: 'organizations/{orgId}/purchaseOrders/{poId}/items/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'purchaseOrderHistory',
    template: 'organizations/{orgId}/purchaseOrders/{poId}/history/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'partnerCatalog',
    template: 'organizations/{orgId}/partnerCatalog/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'productMappings',
    template: 'organizations/{orgId}/productMappings/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'connectionProjections',
    template: 'organizations/{orgId}/connections/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'auditLogs',
    template: 'organizations/{orgId}/auditLogs/{id}',
    pathClass: 'DEFINED_WIDE_ONLY',
    smokePopulated: false,
    rationale:
      'Command-emitted. Seedable in principle, but the smoke profile asserts data shape rather than audit history, so it is deferred to the wide profile.',
  },
  {
    id: 'canonicalConnections',
    template: 'connections/{buyerOrgId__supplierOrgId}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'connectedPurchaseOrders',
    template: 'connectedPurchaseOrders/{id}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'connectedPurchaseOrderItems',
    template: 'connectedPurchaseOrders/{id}/items/{itemId}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
  {
    id: 'connectedPurchaseOrderHistory',
    template: 'connectedPurchaseOrders/{id}/history/{historyId}',
    pathClass: 'SEEDED_SMOKE',
    smokePopulated: true,
  },
];

const BY_ID = new Map(PATH_FAMILIES.map((family) => [family.id, family]));

function family(id: string): PathFamily {
  const found = BY_ID.get(id);
  if (found === undefined) throw new Error(`Unknown path family ${id}`);
  return found;
}

/** Maps a concrete Firestore document path onto its family. */
export function classifyDocumentPath(path: string): PathFamily | undefined {
  const parts = path.split('/');
  const root = parts[0];

  if (parts.length === 2) {
    const rootFamilies: Readonly<Record<string, string>> = {
      organizationDirectory: 'organizationDirectory',
      handleReservations: 'handleReservations',
      users: 'users',
      organizations: 'organizations',
      connections: 'canonicalConnections',
      connectedPurchaseOrders: 'connectedPurchaseOrders',
    };
    const id = rootFamilies[root ?? ''];
    return id === undefined ? undefined : family(id);
  }

  if (root === 'users' && parts.length === 4) {
    if (parts[2] === 'memberships') return family('memberships');
    if (parts[2] === 'notifications') return family('notifications');
    return undefined;
  }

  if (root === 'connectedPurchaseOrders' && parts.length === 4) {
    if (parts[2] === 'items') return family('connectedPurchaseOrderItems');
    if (parts[2] === 'history') return family('connectedPurchaseOrderHistory');
    return undefined;
  }

  if (root !== 'organizations') return undefined;

  if (parts.length === 6 && parts[2] === 'purchaseOrders') {
    if (parts[4] === 'items') return family('purchaseOrderItems');
    if (parts[4] === 'history') return family('purchaseOrderHistory');
    return undefined;
  }

  if (parts.length !== 4) return undefined;
  const collections: Readonly<Record<string, string>> = {
    settings: 'settings',
    counters: 'counters',
    commandReceipts: 'commandReceipts',
    productSkuIndex: 'productSkuIndex',
    members: 'members',
    invitations: 'invitations',
    categories: 'categories',
    warehouses: 'warehouses',
    products: 'products',
    stockBalances: 'stockBalances',
    productStockSummaries: 'productStockSummaries',
    stockMovements: 'stockMovements',
    privatePartners: 'privatePartners',
    purchaseOrders: 'purchaseOrders',
    partnerCatalog: 'partnerCatalog',
    productMappings: 'productMappings',
    connections: 'connectionProjections',
    auditLogs: 'auditLogs',
  };
  const id = collections[parts[2] ?? ''];
  return id === undefined ? undefined : family(id);
}

export interface ManifestCoverage {
  readonly totalFamilies: number;
  readonly classifiedFamilies: number;
  readonly classificationCoveragePercent: number;
  readonly expectedPopulatedFamilies: number;
  readonly observedPopulatedFamilies: number;
  readonly populationCoveragePercent: number;
  readonly missingExpected: readonly string[];
  readonly unexpectedPopulated: readonly string[];
  readonly byClass: Readonly<Record<string, number>>;
}

function percent(numerator: number, denominator: number): number {
  if (denominator === 0) return 100;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

export function manifestCoverage(observedPaths: readonly string[]): ManifestCoverage {
  const observedFamilies = new Set<string>();
  for (const path of observedPaths) {
    const matched = classifyDocumentPath(path);
    if (matched !== undefined) observedFamilies.add(matched.id);
  }

  const expected = PATH_FAMILIES.filter((entry) => entry.smokePopulated);
  const missingExpected = expected
    .filter((entry) => !observedFamilies.has(entry.id))
    .map((entry) => entry.id);
  const unexpectedPopulated = PATH_FAMILIES.filter(
    (entry) => !entry.smokePopulated && observedFamilies.has(entry.id),
  ).map((entry) => entry.id);

  const byClass: Record<string, number> = {};
  for (const entry of PATH_FAMILIES) {
    byClass[entry.pathClass] = (byClass[entry.pathClass] ?? 0) + 1;
  }

  const observedExpected = expected.length - missingExpected.length;
  return {
    totalFamilies: PATH_FAMILIES.length,
    // Every family in the table carries a class by construction, so this is a
    // statement about the table being complete rather than about the data.
    classifiedFamilies: PATH_FAMILIES.length,
    classificationCoveragePercent: percent(PATH_FAMILIES.length, PATH_FAMILIES.length),
    expectedPopulatedFamilies: expected.length,
    observedPopulatedFamilies: observedExpected,
    populationCoveragePercent: percent(observedExpected, expected.length),
    missingExpected,
    unexpectedPopulated,
    byClass,
  };
}

/**
 * The 32 product-list index shapes are the cross product of
 * 2 modes x 4 filters x 4 sorts, matching `generateProductListMatrix()` in
 * `scripts/index-spec.ts`.
 */
export const MATRIX_MODES = ['summary', 'warehouse'] as const;
export const MATRIX_FILTERS = ['none', 'category', 'status', 'categoryStatus'] as const;
export const MATRIX_SORTS = ['name', 'sku', 'onHand', 'updated'] as const;

export type MatrixMode = (typeof MATRIX_MODES)[number];
export type MatrixFilter = (typeof MATRIX_FILTERS)[number];
export type MatrixSort = (typeof MATRIX_SORTS)[number];

export interface MatrixShape {
  readonly mode: MatrixMode;
  readonly filter: MatrixFilter;
  readonly sort: MatrixSort;
}

export function matrixShapes(): readonly MatrixShape[] {
  const shapes: MatrixShape[] = [];
  for (const mode of MATRIX_MODES) {
    for (const filter of MATRIX_FILTERS) {
      for (const sort of MATRIX_SORTS) {
        shapes.push({ mode, filter, sort });
      }
    }
  }
  return shapes;
}
