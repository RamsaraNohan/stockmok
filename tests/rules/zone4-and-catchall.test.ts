import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { serverPaths } from '../../packages/shared/src/server/paths.js';
import {
  asUnauthenticated,
  asUser,
  closeTestEnvironment,
  getTestEnvironment,
  IDS,
  NON_MEMBER_UID,
  ORG_A,
  ORG_B,
  ROLES,
  seedFixtures,
  uidFor,
} from './harness.js';

/**
 * DB-05 §5 and §6 — zone 4 and the catch-all.
 *
 * `ZONE_4_CLIENT_ACCESS = 0`. Denied for **every** principal including the Owner
 * of a participating organization, which is what makes tenant isolation
 * structural rather than rule-dependent: each party reads its own zone-3
 * projection instead, and a third organization has no projection at all.
 */

let env: RulesTestEnvironment;

const ZONE_4_PATHS: readonly (readonly [string, string])[] = [
  ['handleReservations', serverPaths.handleReservation('grand-ocean')],
  ['connections (canonical)', serverPaths.canonicalConnection(ORG_A, ORG_B)],
  ['connectedPurchaseOrders', serverPaths.connectedPurchaseOrder(IDS.connectedPo)],
  [
    'connectedPurchaseOrders/items',
    serverPaths.connectedPurchaseOrderItem(IDS.connectedPo, IDS.poItem),
  ],
  [
    'connectedPurchaseOrders/history',
    serverPaths.connectedPurchaseOrderHistory(IDS.connectedPo, IDS.poHistory),
  ],
];

function db(uid?: string): Firestore {
  const context = uid === undefined ? asUnauthenticated(env) : asUser(env, uid);
  return context.firestore() as unknown as Firestore;
}

beforeAll(async () => {
  env = await getTestEnvironment();
  await seedFixtures(env);
});

afterAll(async () => {
  await closeTestEnvironment();
});

describe.each(ZONE_4_PATHS.map(([label, path]) => [label, path]))(
  'T-SEC-12 · zone 4 — %s',
  (_label, path) => {
    it('denies read for all seven roles in BOTH participating organizations', async () => {
      for (const orgId of [ORG_A, ORG_B]) {
        for (const role of ROLES) {
          await assertFails(getDoc(doc(db(uidFor(orgId, role)), path)));
        }
      }
    });

    it('denies read for the unauthenticated visitor and an authenticated non-member', async () => {
      await assertFails(getDoc(doc(db(), path)));
      await assertFails(getDoc(doc(db(NON_MEMBER_UID), path)));
    });

    it('denies every write for the Owner of both organizations', async () => {
      for (const orgId of [ORG_A, ORG_B]) {
        const owner = db(uidFor(orgId, 'OWNER'));
        await assertFails(setDoc(doc(owner, `${path}-forged`), { forged: true }));
        await assertFails(updateDoc(doc(owner, path), { forged: true }));
        await assertFails(deleteDoc(doc(owner, path)));
      }
    });
  },
);

describe('zone 4 — collection listing', () => {
  it('denies list on every canonical collection', async () => {
    const owner = db(uidFor(ORG_A, 'OWNER'));
    for (const path of ['handleReservations', 'connections', 'connectedPurchaseOrders']) {
      await assertFails(getDocs(collection(owner, path)));
    }
  });
});

describe('T-SEC-18 · the catch-all', () => {
  const invented: readonly string[] = [
    'inventedCollection/doc-1',
    `organizations/${ORG_A}/inventedSubcollection/doc-1`,
    `organizations/${ORG_A}/settings/main/deeper/doc-1`,
    `users/${uidFor(ORG_A, 'OWNER')}/inventedSubcollection/doc-1`,
  ];

  it('denies read and write on an invented path for every principal', async () => {
    for (const path of invented) {
      for (const caller of [undefined, NON_MEMBER_UID, uidFor(ORG_A, 'OWNER')]) {
        await assertFails(getDoc(doc(db(caller), path)));
        await assertFails(setDoc(doc(db(caller), path), { forged: true }));
      }
    }
  });
});
