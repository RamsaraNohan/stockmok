import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';
import type { Role } from '../../packages/shared/src/primitives.js';
import { paths } from '../../packages/shared/src/paths.js';
import {
  asUnauthenticated,
  asUser,
  closeTestEnvironment,
  CONNECTION_ID,
  getTestEnvironment,
  IDS,
  NON_MEMBER_UID,
  ORG_A,
  ORG_B,
  removedUid,
  ROLES,
  seedFixtures,
  suspendedUid,
  uidFor,
} from './harness.js';

/**
 * DB-05 §4 — the zone-3 read matrix, per role, per path.
 *
 * Every cell is asserted in both directions: the roles the matrix grants
 * succeed, the roles it denies fail. A test that only checks success paths
 * cannot detect a rule that grants too much, which is the failure mode
 * DB-CR-015 existed to repair.
 */

let env: RulesTestEnvironment;

function db(uid?: string): Firestore {
  const context = uid === undefined ? asUnauthenticated(env) : asUser(env, uid);
  return context.firestore() as unknown as Firestore;
}

const ALL_SEVEN: readonly Role[] = ROLES;
const ADMINS: readonly Role[] = ['OWNER', 'ADMIN'];
const PARTNER_WRITERS: readonly Role[] = ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER'];
const NOT_VIEWER: readonly Role[] = [
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
  'PROCUREMENT_MANAGER',
  'STOREKEEPER',
  'ANALYST',
];

interface ReadCase {
  readonly label: string;
  readonly path: (orgId: string) => string;
  readonly allowed: readonly Role[];
  readonly test?: string;
}

/** DB-05 §4, one row per readable zone-3 path. */
const READ_MATRIX: readonly ReadCase[] = [
  { label: 'organizations/{orgId}', path: (o) => paths.organization(o), allowed: ALL_SEVEN },
  { label: 'settings/main', path: (o) => paths.settings(o), allowed: ALL_SEVEN },
  { label: 'categories', path: (o) => paths.category(o, IDS.category), allowed: ALL_SEVEN },
  { label: 'warehouses', path: (o) => paths.warehouse(o, IDS.warehouse), allowed: ALL_SEVEN },
  { label: 'products', path: (o) => paths.product(o, IDS.product), allowed: ALL_SEVEN },
  {
    label: 'stockBalances',
    path: (o) => paths.stockBalance(o, IDS.product, IDS.warehouse),
    allowed: ALL_SEVEN,
  },
  {
    label: 'productStockSummaries',
    path: (o) => paths.productStockSummary(o, IDS.product),
    allowed: ALL_SEVEN,
  },
  {
    label: 'stockMovements',
    path: (o) => paths.stockMovement(o, IDS.movement),
    allowed: NOT_VIEWER,
    test: 'T-SEC-26',
  },
  {
    label: 'privatePartners',
    path: (o) => paths.privatePartner(o, IDS.partner),
    allowed: PARTNER_WRITERS,
    test: 'T-SEC-28',
  },
  {
    label: 'purchaseOrders',
    path: (o) => paths.purchaseOrder(o, IDS.privateDraftPo),
    allowed: NOT_VIEWER,
    test: 'T-SEC-27',
  },
  {
    label: 'purchaseOrders/items',
    path: (o) => paths.purchaseOrderItem(o, IDS.privateDraftPo, IDS.poItem),
    allowed: NOT_VIEWER,
    test: 'T-SEC-27',
  },
  {
    label: 'purchaseOrders/history',
    path: (o) => paths.purchaseOrderHistory(o, IDS.privateDraftPo, IDS.poHistory),
    allowed: NOT_VIEWER,
    test: 'T-SEC-27',
  },
  {
    label: 'partnerCatalog',
    path: (o) => paths.partnerCatalogItem(o, IDS.catalogItem),
    allowed: PARTNER_WRITERS,
    test: 'T-SEC-30',
  },
  {
    label: 'productMappings',
    path: (o) => paths.productMapping(o, IDS.mapping),
    allowed: PARTNER_WRITERS,
    test: 'T-SEC-29',
  },
  {
    label: 'connections (projection)',
    path: (o) => paths.connectionProjection(o, CONNECTION_ID),
    allowed: PARTNER_WRITERS,
    test: 'T-SEC-29',
  },
  { label: 'auditLogs', path: (o) => paths.auditLog(o, IDS.audit), allowed: ADMINS },
  { label: 'invitations', path: (o) => paths.invitation(o, IDS.invitation), allowed: ADMINS },
];

/** Paths no client may read at any role — BACKEND_ONLY (DB-05 §4). */
const BACKEND_ONLY: readonly ReadCase[] = [
  { label: 'counters', path: (o) => paths.counter(o, IDS.counter), allowed: [] },
  { label: 'commandReceipts', path: (o) => paths.commandReceipt(o, IDS.receipt), allowed: [] },
  { label: 'productSkuIndex', path: (o) => paths.productSkuIndex(o, IDS.skuIndex), allowed: [] },
];

beforeAll(async () => {
  env = await getTestEnvironment();
  await seedFixtures(env);
});

afterAll(async () => {
  await closeTestEnvironment();
});

describe.each([...READ_MATRIX, ...BACKEND_ONLY])(
  'read matrix — $label',
  ({ label, path, allowed, test }) => {
    const name = test === undefined ? label : `${label} (${test})`;

    it.each(ROLES.map((role) => [role]))(`${name} · %s`, async (role) => {
      const read = getDoc(doc(db(uidFor(ORG_A, role)), path(ORG_A)));
      if (allowed.includes(role)) await assertSucceeds(read);
      else await assertFails(read);
    });

    it(`${name} · unauthenticated is denied`, async () => {
      await assertFails(getDoc(doc(db(), path(ORG_A))));
    });

    it(`${name} · authenticated non-member is denied`, async () => {
      await assertFails(getDoc(doc(db(NON_MEMBER_UID), path(ORG_A))));
    });

    it(`${name} · a suspended member is denied`, async () => {
      await assertFails(getDoc(doc(db(suspendedUid(ORG_A)), path(ORG_A))));
    });

    it(`${name} · a removed member is denied`, async () => {
      await assertFails(getDoc(doc(db(removedUid(ORG_A)), path(ORG_A))));
    });

    it(`${name} · T-SEC-10 · a connected counterparty's Owner is denied cross-tenant`, async () => {
      await assertFails(getDoc(doc(db(uidFor(ORG_B, 'OWNER')), path(ORG_A))));
    });
  },
);

describe('T-SEC-31 · members', () => {
  it('allows an Admin to get any member document', async () => {
    for (const admin of ADMINS) {
      await assertSucceeds(
        getDoc(doc(db(uidFor(ORG_A, admin)), paths.member(ORG_A, uidFor(ORG_A, 'VIEWER')))),
      );
    }
  });

  it('allows a non-Admin to get their OWN member document', async () => {
    for (const role of ROLES.filter((candidate) => !ADMINS.includes(candidate))) {
      const uid = uidFor(ORG_A, role);
      await assertSucceeds(getDoc(doc(db(uid), paths.member(ORG_A, uid))));
    }
  });

  it("denies a non-Admin a get of another member's document", async () => {
    for (const role of ROLES.filter((candidate) => !ADMINS.includes(candidate))) {
      await assertFails(
        getDoc(doc(db(uidFor(ORG_A, role)), paths.member(ORG_A, uidFor(ORG_A, 'OWNER')))),
      );
    }
  });

  it('denies a suspended member their own member document', async () => {
    const uid = suspendedUid(ORG_A);
    await assertFails(getDoc(doc(db(uid), paths.member(ORG_A, uid))));
  });

  it('denies a member of the other organization', async () => {
    await assertFails(
      getDoc(doc(db(uidFor(ORG_B, 'OWNER')), paths.member(ORG_A, uidFor(ORG_A, 'OWNER')))),
    );
  });
});

describe('T-SEC-12 · tenant isolation is symmetric', () => {
  it.each(ROLES.map((role) => [role]))(
    'denies %s of org B every private path in org A',
    async (role) => {
      const caller = db(uidFor(ORG_B, role));
      for (const testCase of [...READ_MATRIX, ...BACKEND_ONLY]) {
        await assertFails(getDoc(doc(caller, testCase.path(ORG_A))));
      }
    },
  );

  it.each(ROLES.map((role) => [role]))(
    'denies %s of org A every private path in org B',
    async (role) => {
      const caller = db(uidFor(ORG_A, role));
      for (const testCase of [...READ_MATRIX, ...BACKEND_ONLY]) {
        await assertFails(getDoc(doc(caller, testCase.path(ORG_B))));
      }
    },
  );
});
