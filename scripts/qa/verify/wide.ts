import type { DocumentData } from 'firebase-admin/firestore';

import type { QaSnapshot } from './integrity.js';

function stringField(data: DocumentData, key: string): string | undefined {
  const value: unknown = data[key];
  return typeof value === 'string' ? value : undefined;
}

function countByOrg(
  snapshot: QaSnapshot,
  predicate: (parts: readonly string[], data: DocumentData) => boolean,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    const orgId = parts[0] === 'organizations' ? parts[1] : undefined;
    if (orgId === undefined || !predicate(parts, data)) continue;
    counts.set(orgId, (counts.get(orgId) ?? 0) + 1);
  }
  return counts;
}

/** Cardinality and named-special gate for the 50 Wide + 6 Special universe. */
export function verifyWideCoverage(snapshot: QaSnapshot): readonly string[] {
  const failures: string[] = [];
  const organizationIds = [...snapshot.documents.keys()]
    .filter((path) => path.split('/').length === 2 && path.startsWith('organizations/'))
    .map((path) => path.split('/')[1])
    .filter((id): id is string => id !== undefined);
  const normal = organizationIds.filter((id) => id.startsWith('qa-wide-org-'));
  const special = organizationIds.filter((id) => id.startsWith('qa-special-'));
  if (normal.length !== 50)
    failures.push(`WIDE_CARDINALITY normal=${String(normal.length)} expected=50`);
  if (special.length !== 6)
    failures.push(`WIDE_CARDINALITY special=${String(special.length)} expected=6`);

  const expectedSpecials = [
    'qa-special-empty',
    'qa-special-tiny',
    'qa-special-low-stock',
    'qa-special-archived',
    'qa-special-network-off',
    'qa-special-high-volume',
  ];
  for (const orgId of expectedSpecials) {
    if (!special.includes(orgId)) failures.push(`WIDE_SPECIAL ${orgId} is missing`);
  }

  const members = countByOrg(snapshot, (parts) => parts[2] === 'members' && parts.length === 4);
  const categories = countByOrg(
    snapshot,
    (parts) => parts[2] === 'categories' && parts.length === 4,
  );
  const warehouses = countByOrg(
    snapshot,
    (parts) => parts[2] === 'warehouses' && parts.length === 4,
  );
  const products = countByOrg(snapshot, (parts) => parts[2] === 'products' && parts.length === 4);
  const balances = countByOrg(
    snapshot,
    (parts) => parts[2] === 'stockBalances' && parts.length === 4,
  );
  const movements = countByOrg(
    snapshot,
    (parts) => parts[2] === 'stockMovements' && parts.length === 4,
  );
  const partners = countByOrg(
    snapshot,
    (parts) => parts[2] === 'privatePartners' && parts.length === 4,
  );
  const connections = countByOrg(
    snapshot,
    (parts) => parts[2] === 'connections' && parts.length === 4,
  );
  const catalog = countByOrg(
    snapshot,
    (parts) => parts[2] === 'partnerCatalog' && parts.length === 4,
  );
  const mappings = countByOrg(
    snapshot,
    (parts) => parts[2] === 'productMappings' && parts.length === 4,
  );
  const privateOrders = countByOrg(
    snapshot,
    (parts, data) =>
      parts[2] === 'purchaseOrders' &&
      parts.length === 4 &&
      stringField(data, 'supplierKind') === 'PRIVATE',
  );
  const buyerConnectedOrders = countByOrg(
    snapshot,
    (parts, data) =>
      parts[2] === 'purchaseOrders' &&
      parts.length === 4 &&
      stringField(data, 'supplierKind') === 'CONNECTED' &&
      stringField(data, 'viewRole') === 'BUYER',
  );

  const notifications = new Map<string, number>();
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'users' || parts[2] !== 'notifications' || parts.length !== 4) continue;
    const orgId = stringField(data, 'organizationId');
    if (orgId !== undefined) notifications.set(orgId, (notifications.get(orgId) ?? 0) + 1);
  }

  for (const orgId of normal) {
    const checks: readonly [string, number, number][] = [
      ['members', members.get(orgId) ?? 0, 20],
      ['categories', categories.get(orgId) ?? 0, 24],
      ['warehouses', warehouses.get(orgId) ?? 0, 20],
      ['products', products.get(orgId) ?? 0, 120],
      ['balances', balances.get(orgId) ?? 0, 300],
      ['movements', movements.get(orgId) ?? 0, 500],
      ['privatePartners', partners.get(orgId) ?? 0, 48],
      ['privateOrders', privateOrders.get(orgId) ?? 0, 50],
      ['connections', connections.get(orgId) ?? 0, 20],
      ['catalogItems', catalog.get(orgId) ?? 0, 60],
      ['mappings', mappings.get(orgId) ?? 0, 40],
      ['connectedBuyerOrders', buyerConnectedOrders.get(orgId) ?? 0, 30],
      ['notifications', notifications.get(orgId) ?? 0, 100],
    ];
    for (const [label, actual, minimum] of checks) {
      if (actual < minimum) {
        failures.push(
          `WIDE_CARDINALITY ${orgId} ${label}=${String(actual)} expected>=${String(minimum)}`,
        );
      }
    }
  }

  const networkOff = connections.get('qa-special-network-off') ?? 0;
  if (networkOff !== 0) failures.push(`WIDE_SPECIAL NETWORK_OFF connections=${String(networkOff)}`);
  if ((products.get('qa-special-empty') ?? 0) !== 0)
    failures.push('WIDE_SPECIAL EMPTY has products');
  if ((products.get('qa-special-tiny') ?? 0) > 2)
    failures.push('WIDE_SPECIAL TINY has more than 2 products');
  if ((products.get('qa-special-high-volume') ?? 0) < 180)
    failures.push('WIDE_SPECIAL HIGH_VOLUME has fewer than 180 products');

  return failures;
}
