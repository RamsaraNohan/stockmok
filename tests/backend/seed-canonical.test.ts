import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import {
  assertPostChain,
  assertT0,
  databaseFingerprint,
} from '../../scripts/canonical/reconcile.js';
import { replayCanonicalChain } from '../../scripts/canonical/replay.js';
import { seedCanonical, type SeedResult } from '../../scripts/canonical/seed.js';
import { clearFirestore, testDb } from './harness.js';

/**
 * `T-SEED-01a` and `T-SEED-01b` — DB-08 §6.5, through the **real command layer**.
 *
 * A3R-P2 is explicit that the C1 emulator-bootstrap variants certify fixture
 * construction and arithmetic only, and that the canonical names stay reserved
 * for the command layer. This is that run: every figure below is produced by
 * `org.create`, `product.create`, `stock.recordOpeningBalance`, `stock.adjust`,
 * `po.order`, `po.receive`, `connection.*`, `partnerCatalog.publish`,
 * `mapping.create` and `cpo.*`, and then read back **by query** rather than
 * compared to the constant the seed used.
 *
 * The context object mirrors the seed CLI's, minus the process-argv safety gate
 * the CLI applies — this file runs under `emulators:exec`, and `harness.ts`
 * already refuses anything but a loopback emulator with no live credentials.
 */

let db: Firestore;
let seed: SeedResult;

const SEED_TIMEOUT_MS = 180_000;

function contextFor(database: Firestore) {
  return { app: undefined as never, db: database, auth: undefined };
}

beforeAll(() => {
  db = testDb();
});

describe('T-SEED-01a — the canonical seed at t₀', () => {
  it(
    'builds DB-08 §1–§3 through commands and reconciles by query',
    async () => {
      await clearFirestore();
      seed = await seedCanonical(contextFor(db));
      const report = await assertT0(db, seed);
      expect(report.label).toBe('T-SEED-01a');
      expect(report.checks).toContain('LEDGER_MOVEMENTS=12');
      expect(report.checks).toContain('INVENTORY_VALUE_MINOR=56420000');
      expect(report.checks).toContain('MEAT_001_MILLI=18000');
      expect(report.checks).toContain('LOW_STOCK=4');
      expect(report.checks).toContain('OUT_OF_STOCK=1');
    },
    SEED_TIMEOUT_MS,
  );

  it('seeded every canonical entity DB-08 names', async () => {
    const { buyerOrgId, supplierOrgId } = seed;
    const countOf = async (orgId: string, collection: string): Promise<number> =>
      (await db.collection(`${paths.organization(orgId)}/${collection}`).get()).size;

    expect(await countOf(buyerOrgId, 'members')).toBe(7); // one user per role
    expect(await countOf(buyerOrgId, 'categories')).toBe(4);
    expect(await countOf(buyerOrgId, 'warehouses')).toBe(2); // Main Store, Cold Room
    expect(await countOf(buyerOrgId, 'products')).toBe(12);
    expect(await countOf(buyerOrgId, 'stockBalances')).toBe(12);
    expect(await countOf(buyerOrgId, 'productStockSummaries')).toBe(12);
    expect(await countOf(buyerOrgId, 'privatePartners')).toBe(1); // Green Farm Poultry
    expect(await countOf(buyerOrgId, 'productMappings')).toBe(1);
    expect(await countOf(buyerOrgId, 'connections')).toBe(1);

    expect(await countOf(supplierOrgId, 'products')).toBe(2);
    expect(await countOf(supplierOrgId, 'partnerCatalog')).toBe(2);
    expect(await countOf(supplierOrgId, 'connections')).toBe(1);

    // The connection is ACTIVE on the canonical record and both projections.
    for (const orgId of [buyerOrgId, supplierOrgId]) {
      const projection = await db.doc(paths.connectionProjection(orgId, seed.connectionId)).get();
      expect(projection.get('status'), orgId).toBe('ACTIVE');
    }
  });

  it('every stock movement carries the receipt that produced it (INV-05)', async () => {
    const movements = await db
      .collection(`${paths.organization(seed.buyerOrgId)}/stockMovements`)
      .get();
    expect(movements.size).toBe(12);
    for (const movement of movements.docs) {
      const operationId = movement.get('operationId') as string;
      expect(operationId, movement.id).toBeTruthy();
      const receipt = await db.doc(paths.commandReceipt(seed.buyerOrgId, operationId)).get();
      expect(receipt.exists, `receipt for ${movement.id}`).toBe(true);
      expect(receipt.get('commandType')).toBe('stock.recordOpeningBalance');
    }
  });

  it('the partner catalog exposes no supplier-private stock or cost', async () => {
    const items = await db
      .collection(`${paths.organization(seed.supplierOrgId)}/partnerCatalog`)
      .get();
    for (const item of items.docs) {
      const keys = Object.keys(item.data());
      for (const forbidden of [
        'onHandMilli',
        'purchaseCostMinor',
        'stockValueMinor',
        'warehouseId',
        'minimumStockMilli',
      ]) {
        expect(keys, `${item.id}/${forbidden}`).not.toContain(forbidden);
      }
    }
  });
});

describe('T-SEED-01b — the canonical chain, and rerun safety', () => {
  it(
    'replays DB-08 §4 through commands and reconciles by query',
    async () => {
      await replayCanonicalChain(contextFor(db), seed);
      const report = await assertPostChain(db, seed);
      expect(report.label).toBe('T-SEED-01b');
      expect(report.checks).toContain('LEDGER_MOVEMENTS=17');
      expect(report.checks).toContain('MEAT_001_MOVEMENTS=6');
      expect(report.checks).toContain('MEAT_001_MILLI=120000');
      expect(report.checks).toContain('INVENTORY_VALUE_MINOR=69170000');
      expect(report.checks).toContain('COLD_ROOM_MINOR=39890000');
      expect(report.checks).toContain('MAIN_STORE_MINOR=29280000');
      expect(report.checks).toContain('SUPPLIER_MILLI=190000');
      expect(report.checks).toContain('CONNECTED_DISPATCH_OUT=1');
    },
    SEED_TIMEOUT_MS,
  );

  it(
    'a second seed and replay change nothing at all',
    async () => {
      const before = await databaseFingerprint(db);

      // Neither the seed nor the chain is deleted first: rerun safety means the
      // commands themselves refuse to act twice, through their receipts.
      const reseeded = await seedCanonical(contextFor(db));
      await replayCanonicalChain(contextFor(db), reseeded);

      // The same organizations, resolved rather than recreated.
      expect(reseeded.buyerOrgId).toBe(seed.buyerOrgId);
      expect(reseeded.supplierOrgId).toBe(seed.supplierOrgId);
      expect(reseeded.connectionId).toBe(seed.connectionId);
      expect(reseeded.mappingId).toBe(seed.mappingId);
      expect([...reseeded.productIds.entries()].sort()).toEqual(
        [...seed.productIds.entries()].sort(),
      );

      // Not one document more, anywhere in the database.
      expect(await databaseFingerprint(db)).toBe(before);

      // And every canonical figure is still exactly what it was.
      const report = await assertPostChain(db, reseeded);
      expect(report.checks).toContain('LEDGER_MOVEMENTS=17');
      expect(report.checks).toContain('INVENTORY_VALUE_MINOR=69170000');
      expect(report.checks).toContain('MEAT_001_MILLI=120000');
      expect(report.checks).toContain('SUPPLIER_MILLI=190000');
    },
    SEED_TIMEOUT_MS,
  );

  it('no duplicate order transition survived the rerun', async () => {
    const historyOf = async (orgId: string, poId: string): Promise<string[]> => {
      const snapshot = await db
        .collection(`${paths.purchaseOrder(orgId, poId)}/history`)
        .orderBy('createdAt')
        .get();
      return snapshot.docs.map(
        (doc) => `${String(doc.get('fromStatus'))}→${String(doc.get('toStatus'))}`,
      );
    };
    expect(await historyOf(seed.buyerOrgId, 'po-2026-001')).toEqual([
      'DRAFT→ORDERED',
      'ORDERED→PARTIALLY_RECEIVED',
      'PARTIALLY_RECEIVED→RECEIVED',
    ]);
    expect(await historyOf(seed.buyerOrgId, 'cpo-2026-003')).toEqual([
      'DRAFT→SUBMITTED',
      'SUBMITTED→ACCEPTED',
      'ACCEPTED→SHIPPED',
      'SHIPPED→PARTIALLY_RECEIVED',
      'PARTIALLY_RECEIVED→RECEIVED',
    ]);
    // DV-13 and DV-12 each counted their one order exactly once.
    const partner = await db
      .doc(paths.privatePartner(seed.buyerOrgId, seed.privatePartnerId))
      .get();
    expect(partner.get('ordersPlacedCount')).toBe(1);
    const connection = await db
      .doc(paths.connectionProjection(seed.buyerOrgId, seed.connectionId))
      .get();
    expect(connection.get('ordersPlacedCount')).toBe(1);
  });
});
