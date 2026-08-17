import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  query,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Role } from '../../packages/shared/src/primitives.js';
import { paths } from '../../packages/shared/src/paths.js';
import {
  asUser,
  closeTestEnvironment,
  getTestEnvironment,
  IDS,
  ORG_A,
  seedFixtures,
  uidFor,
} from './harness.js';

/**
 * `T-SEC-32` and `T-SEC-33` — DB-05 §4.0.1 and §4.9.
 *
 * `QUERY_LIMIT_ENFORCED = 9 collections at <= 100`. The other paths are exempt
 * **and the reason is recorded**: Firestore applies `request.query.limit` to
 * aggregations identically, and a capped `sum('stockValueMinor')` is not the
 * inventory value. `T-SEC-33` is the guard against a later careless addition of
 * a limit rule to an aggregation-bearing path.
 */

let env: RulesTestEnvironment;

const OWNER = 'OWNER' satisfies Role;

function forRole(role: Role): Firestore {
  return asUser(env, uidFor(ORG_A, role)).firestore() as unknown as Firestore;
}

const orgPath = paths.organization(ORG_A);
const ownerUid = uidFor(ORG_A, OWNER);

/** The definitive nine (DB-05 §4.9). */
const BOUNDED: readonly (readonly [string, string, Role])[] = [
  ['categories', `${orgPath}/categories`, OWNER],
  ['warehouses', `${orgPath}/warehouses`, OWNER],
  ['stockMovements', `${orgPath}/stockMovements`, 'ANALYST'],
  ['privatePartners', `${orgPath}/privatePartners`, 'PROCUREMENT_MANAGER'],
  [
    'purchaseOrders/{poId}/items',
    `${orgPath}/purchaseOrders/${IDS.privateDraftPo}/items`,
    'STOREKEEPER',
  ],
  [
    'purchaseOrders/{poId}/history',
    `${orgPath}/purchaseOrders/${IDS.privateDraftPo}/history`,
    'STOREKEEPER',
  ],
  ['partnerCatalog', `${orgPath}/partnerCatalog`, 'PROCUREMENT_MANAGER'],
  ['productMappings', `${orgPath}/productMappings`, 'PROCUREMENT_MANAGER'],
  ['users/{uid}/memberships', `${paths.user(ownerUid)}/memberships`, OWNER],
];

/** Aggregation-bearing paths, deliberately exempt. */
const EXEMPT: readonly (readonly [string, string, Role])[] = [
  ['products', `${orgPath}/products`, 'VIEWER'],
  ['productStockSummaries', `${orgPath}/productStockSummaries`, 'VIEWER'],
  ['stockBalances', `${orgPath}/stockBalances`, 'VIEWER'],
  ['purchaseOrders', `${orgPath}/purchaseOrders`, 'STOREKEEPER'],
  ['connections', `${orgPath}/connections`, 'PROCUREMENT_MANAGER'],
  ['users/{uid}/notifications', `${paths.user(ownerUid)}/notifications`, OWNER],
  ['members', `${orgPath}/members`, OWNER],
  ['invitations', `${orgPath}/invitations`, OWNER],
  ['auditLogs', `${orgPath}/auditLogs`, OWNER],
];

beforeAll(async () => {
  env = await getTestEnvironment();
  await seedFixtures(env);
});

afterAll(async () => {
  await closeTestEnvironment();
});

describe('T-SEC-32 · the nine bounded collections', () => {
  it('is exactly nine paths', () => {
    expect(BOUNDED).toHaveLength(9);
  });

  it.each(BOUNDED.map(([label, path, role]) => [label, path, role]))(
    '%s · no limit denied · 101 denied · 100 and 25 allowed',
    async (_label, path, role) => {
      const target = collection(forRole(role), path);
      await assertFails(getDocs(target));
      await assertFails(getDocs(query(target, limit(101))));
      await assertSucceeds(getDocs(query(target, limit(100))));
      await assertSucceeds(getDocs(query(target, limit(25))));
    },
  );
});

describe('T-SEC-33 · the exempt paths keep working, including their aggregations', () => {
  it.each(EXEMPT.map(([label, path, role]) => [label, path, role]))(
    '%s · an unbounded list and a count() both succeed for a permitted role',
    async (_label, path, role) => {
      const target = collection(forRole(role), path);
      await assertSucceeds(getDocs(target));
      await assertSucceeds(getCountFromServer(target));
    },
  );

  it('still denies a role the matrix excludes, bound or no bound', async () => {
    // Viewer may read products but not purchase orders (T-SEC-27).
    await assertFails(getDocs(collection(forRole('VIEWER'), `${orgPath}/purchaseOrders`)));
    await assertFails(
      getCountFromServer(collection(forRole('VIEWER'), `${orgPath}/purchaseOrders`)),
    );
    // Analyst may read movements but not the private partner directory (T-SEC-28).
    await assertFails(
      getDocs(query(collection(forRole('ANALYST'), `${orgPath}/privatePartners`), limit(25))),
    );
  });
});
