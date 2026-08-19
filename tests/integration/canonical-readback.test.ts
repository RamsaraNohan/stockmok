import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { createStockmokRepositories } from '../../packages/data/src/repositories.js';
import { databaseFingerprint } from '../../scripts/canonical/reconcile.js';
import { replayCanonicalChain } from '../../scripts/canonical/replay.js';
import { seedCanonical } from '../../scripts/canonical/seed.js';
import { type Firestore as ClientFirestore } from 'firebase/firestore';
import { type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearFirestore, testDb } from '../backend/harness.js';

let adminDb: Firestore;
let rulesEnvironment: RulesTestEnvironment;

function contextFor(database: Firestore) {
  return { app: undefined as never, db: database, auth: undefined };
}

function repositoriesFor(orgId: string, uid: string) {
  const clientDb = rulesEnvironment
    .authenticatedContext(uid, { email: `${uid}@stockmok.test` })
    .firestore() as unknown as ClientFirestore;
  return createStockmokRepositories(clientDb, { orgId, uid });
}

beforeAll(async () => {
  adminDb = testDb();
  const hostValue = process.env.FIRESTORE_EMULATOR_HOST;
  if (!hostValue) throw new Error('FIRESTORE_EMULATOR_HOST is required');
  const [host, portText] = hostValue.split(':');
  if (!host || !portText) throw new Error('FIRESTORE_EMULATOR_HOST must be host:port');
  rulesEnvironment = await initializeTestEnvironment({
    projectId: 'stockmok',
    firestore: { host, port: Number.parseInt(portText, 10) },
  });
});

afterAll(async () => {
  await rulesEnvironment.cleanup();
});

describe('command-driven canonical seed/replay through frozen C2', () => {
  it('reads exact DB-08 totals and remains fingerprint-identical on replay', async () => {
    await clearFirestore();
    const seed = await seedCanonical(contextFor(adminDb));
    await replayCanonicalChain(contextFor(adminDb), seed);

    const buyer = repositoriesFor(seed.buyerOrgId, seed.uids.buyerOwner);
    const supplier = repositoriesFor(seed.supplierOrgId, seed.uids.supplierOwner);
    const chickenProductId = seed.productIds.get('MEAT-001');
    if (!chickenProductId) throw new Error('Canonical MEAT-001 product is missing');

    const [chicken, kpis, locationValues, movements, supplierCatalog] = await Promise.all([
      buyer.inventory.getSummary(chickenProductId),
      buyer.dashboard.getKpis(false),
      buyer.dashboard.getInventoryByLocation([
        seed.buyerWarehouses.cold,
        seed.buyerWarehouses.main,
      ]),
      buyer.movements.list('Q-022', {}),
      supplier.network.listOwnCatalog(true),
    ]);

    expect(chicken?.onHandMilli).toBe(120_000);
    expect(chicken?.unit).toBe('KG');
    expect(kpis.inventoryValueMinor).toBe(69_170_000);
    expect(locationValues).toEqual([
      { warehouseId: seed.buyerWarehouses.cold, stockValueMinor: 39_890_000 },
      { warehouseId: seed.buyerWarehouses.main, stockValueMinor: 29_280_000 },
    ]);
    expect(movements.items).toHaveLength(17);
    for (const item of supplierCatalog.items) {
      expect(Object.keys(item as object)).not.toEqual(
        expect.arrayContaining([
          'onHandMilli',
          'purchaseCostMinor',
          'stockValueMinor',
          'warehouseId',
          'minimumStockMilli',
        ]),
      );
    }

    const before = await databaseFingerprint(adminDb);
    const reseeded = await seedCanonical(contextFor(adminDb));
    await replayCanonicalChain(contextFor(adminDb), reseeded);
    expect(await databaseFingerprint(adminDb)).toBe(before);

    const replayed = repositoriesFor(reseeded.buyerOrgId, reseeded.uids.buyerOwner);
    const [replayedChicken, replayedKpis, replayedMovements] = await Promise.all([
      replayed.inventory.getSummary(chickenProductId),
      replayed.dashboard.getKpis(false),
      replayed.movements.list('Q-022', {}),
    ]);
    expect(replayedChicken?.onHandMilli).toBe(120_000);
    expect(replayedKpis.inventoryValueMinor).toBe(69_170_000);
    expect(replayedMovements.items).toHaveLength(17);
  });
});
