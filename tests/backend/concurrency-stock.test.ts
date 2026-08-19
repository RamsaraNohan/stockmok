import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import { poReceive } from '../../functions/src/commands/purchase-order.js';
import { stockAdjust, stockTransfer } from '../../functions/src/commands/stock.js';
import {
  callable,
  clearFirestore,
  collectionOf,
  ORG_A,
  OPERATION_ID_A,
  seedMember,
  seedOrganization,
  seedPrivatePartner,
  seedProduct,
  seedProductStockSummary,
  seedPurchaseOrder,
  seedPurchaseOrderItem,
  seedSettings,
  seedStockBalance,
  seedWarehouse,
  testDb,
  uidFor,
} from './harness.js';

/**
 * `T-CONC-03`, `T-CONC-04`, `T-CONC-07`, `T-CONC-08`.
 *
 * These run real concurrent callables against the Firestore emulator, because
 * the claim being tested is Firestore's transactional behaviour and not our
 * description of it. Nothing here uses an application-level lock: a mutex that
 * does not exist in production would prove nothing about production.
 */

let db: Firestore;

const PRODUCT = 'product-rice';
const MAIN = 'warehouse-main';
const COLD = 'warehouse-cold';

function reasonOf(result: { ok: boolean; details?: unknown }): string {
  return (result.details as { reason?: string } | undefined)?.reason ?? '';
}

function operationId(index: number): string {
  return `${String(index).padStart(8, '0')}-1111-4222-8333-444444444444`;
}

/**
 * A command that legitimately did not commit. Either it lost a domain guard
 * (`INSUFFICIENT_STOCK`, `OVER_RECEIPT`, `INVALID_TRANSITION`) or its
 * transaction was aborted by contention. All four mean the same thing here:
 * **nothing was written**. Which one a given loser gets depends on whether
 * Firestore let it re-read before refusing it, so pinning the exact reason
 * under a deliberate race would be testing the scheduler rather than the
 * system. The deterministic single-threaded refusals are proved in
 * `commands-transfer.test.ts` and `commands-private-po.test.ts`; what these
 * tests exist to prove is that no interleaving corrupts the ledger.
 */
function assertLegitimateRefusal(result: { ok: boolean; code?: string; details?: unknown }): void {
  if (result.ok) return;
  if (result.code === 'aborted') return;
  expect(result.code).toBe('failed-precondition');
  expect(['INSUFFICIENT_STOCK', 'OVER_RECEIPT', 'INVALID_TRANSITION']).toContain(reasonOf(result));
}

/** INV-03 — the balance is exactly the signed sum of its own room's movements. */
async function assertLedgerReconciles(warehouseId: string): Promise<number> {
  const movements = await collectionOf(db, ORG_A, 'stockMovements');
  const signedSum = movements
    .filter((m) => m.get('warehouseId') === warehouseId)
    .reduce((sum, m) => sum + (m.get('signedQuantityMilli') as number), 0);
  const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, warehouseId)).get();
  const onHand = balance.exists ? (balance.get('onHandMilli') as number) : 0;
  expect(signedSum).toBe(onHand);
  return onHand;
}

async function seedBase(sourceMilli: number): Promise<void> {
  await clearFirestore();
  await seedOrganization(db, ORG_A);
  await seedSettings(db, ORG_A);
  for (const role of ['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'STOREKEEPER'] as const) {
    await seedMember(db, ORG_A, role);
  }
  await seedWarehouse(db, ORG_A, MAIN, { name: 'Main Store' });
  await seedWarehouse(db, ORG_A, COLD, { name: 'Cold Room' });
  await seedProduct(db, ORG_A, PRODUCT, { name: 'Basmati Rice' });
  // The seeded balance needs its own ledger entry, or INV-03 is false in the
  // fixture before a single command runs.
  if (sourceMilli > 0) {
    await db.doc(paths.stockMovement(ORG_A, 'movement-opening')).set({
      movementId: 'movement-opening',
      productId: PRODUCT,
      warehouseId: MAIN,
      productNameSnapshot: 'Basmati Rice',
      skuSnapshot: 'PRODUCT-RICE',
      movementType: 'OPENING_BALANCE',
      signedQuantityMilli: sourceMilli,
      unit: 'EACH',
      balanceAfterMilli: sourceMilli,
      sourceType: 'MANUAL',
      operationId: 'ffffffff-1111-4222-8333-444444444444',
      actorUid: 'seed',
      actorName: 'seed',
      warehouseNameSnapshot: 'Main Store',
      effectiveAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
  }
  await seedStockBalance(db, ORG_A, PRODUCT, MAIN, {
    onHandMilli: sourceMilli,
    stockValueMinor: sourceMilli,
    stockStatus: sourceMilli > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    shortfallMilli: Math.max(0, 5000 - sourceMilli),
    productName: 'Basmati Rice',
  });
  await seedProductStockSummary(db, ORG_A, PRODUCT, {
    productName: 'Basmati Rice',
    onHandMilli: sourceMilli,
    availableMilli: sourceMilli,
    stockValueMinor: sourceMilli,
    stockStatus: sourceMilli > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    shortfallMilli: Math.max(0, 5000 - sourceMilli),
  });
}

beforeAll(() => {
  db = testDb();
});

describe('T-CONC-07 · competing transfers cannot overspend the source', () => {
  beforeEach(() => seedBase(50_000));

  const transfer = (quantityMilli: number, opId: string) =>
    stockTransfer.execute(
      callable(uidFor(ORG_A, 'OWNER'), {
        orgId: ORG_A,
        operationId: opId,
        payload: {
          productId: PRODUCT,
          sourceWarehouseId: MAIN,
          destinationWarehouseId: COLD,
          quantityMilli,
        },
      }),
      db,
    );

  it('two transfers of 30 000 from 50 000 produce one success and one INSUFFICIENT_STOCK', async () => {
    const [first, second] = await Promise.all([
      transfer(30_000, operationId(1)),
      transfer(30_000, operationId(2)),
    ]);

    const outcomes = [first, second];
    // 30 000 + 30 000 > 50 000, so exactly one of them can ever commit.
    expect(outcomes.filter((r) => r.ok)).toHaveLength(1);
    const failure = outcomes.find((r) => !r.ok);
    expect(failure).toBeDefined();
    if (failure) assertLegitimateRefusal(failure);

    const source = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(source.get('onHandMilli')).toBe(20_000);
    expect(source.get('onHandMilli')).toBeGreaterThanOrEqual(0);
    const destination = await db.doc(paths.stockBalance(ORG_A, PRODUCT, COLD)).get();
    expect(destination.get('onHandMilli')).toBe(30_000);

    // One pair of movements — never a TRANSFER_OUT without its TRANSFER_IN,
    // and never a half-applied transfer (INV-22).
    const movements = await collectionOf(db, ORG_A, 'stockMovements');
    expect(movements.filter((m) => m.get('movementType') === 'TRANSFER_OUT')).toHaveLength(1);
    expect(movements.filter((m) => m.get('movementType') === 'TRANSFER_IN')).toHaveLength(1);
    await assertLedgerReconciles(MAIN);
    await assertLedgerReconciles(COLD);

    const summary = await db.doc(paths.productStockSummary(ORG_A, PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(50_000); // INV-23
  });

  it('five competing transfers never drive the source negative', async () => {
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((index) => transfer(15_000, operationId(index))),
    );
    const succeeded = results.filter((r) => r.ok).length;
    expect(succeeded).toBeGreaterThanOrEqual(1);
    expect(succeeded).toBeLessThanOrEqual(3); // 50 000 / 15 000
    for (const result of results) assertLegitimateRefusal(result);

    const sourceMilli = await assertLedgerReconciles(MAIN);
    const destinationMilli = await assertLedgerReconciles(COLD);
    expect(sourceMilli).toBeGreaterThanOrEqual(0);
    expect(sourceMilli).toBe(50_000 - succeeded * 15_000);
    expect(sourceMilli + destinationMilli).toBe(50_000);
    const movements = await collectionOf(db, ORG_A, 'stockMovements');
    expect(movements.filter((m) => m.get('movementType') === 'TRANSFER_OUT')).toHaveLength(
      succeeded,
    );
    expect(movements.filter((m) => m.get('movementType') === 'TRANSFER_IN')).toHaveLength(
      succeeded,
    );
  });

  it('concurrent retries of one operationId apply the transfer exactly once', async () => {
    const results = await Promise.all([
      transfer(10_000, OPERATION_ID_A),
      transfer(10_000, OPERATION_ID_A),
      transfer(10_000, OPERATION_ID_A),
    ]);
    expect(
      results.every((r) => r.ok),
      JSON.stringify(results),
    ).toBe(true);

    const source = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(source.get('onHandMilli')).toBe(40_000);
    const movements = await collectionOf(db, ORG_A, 'stockMovements');
    expect(movements.filter((m) => m.get('movementType') === 'TRANSFER_OUT')).toHaveLength(1);
    expect(movements.filter((m) => m.get('movementType') === 'TRANSFER_IN')).toHaveLength(1);
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(1);
    expect(await collectionOf(db, ORG_A, 'commandReceipts')).toHaveLength(1);
  });
});

describe('T-CONC-03 · concurrent adjustments lose no update', () => {
  beforeEach(() => seedBase(10_000));

  it('eight simultaneous +1 000 adjustments produce exactly +8 000', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        stockAdjust.execute(
          callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
            orgId: ORG_A,
            operationId: operationId(index + 1),
            payload: {
              productId: PRODUCT,
              warehouseId: MAIN,
              signedQuantityMilli: 1000,
              adjustmentReason: 'RECOUNT_CORRECTION',
            },
          }),
          db,
        ),
      ),
    );
    // Nothing here competes for a scarce resource; the point is that not one
    // of the increments is lost, whichever order they land in.
    for (const result of results) assertLegitimateRefusal(result);
    const succeeded = results.filter((r) => r.ok).length;
    expect(succeeded).toBeGreaterThanOrEqual(1);

    const onHand = await assertLedgerReconciles(MAIN);
    expect(onHand).toBe(10_000 + succeeded * 1000);
    const adjustments = (await collectionOf(db, ORG_A, 'stockMovements')).filter(
      (m) => m.get('movementType') === 'ADJUSTMENT_IN',
    );
    expect(adjustments).toHaveLength(succeeded);

    const summary = await db.doc(paths.productStockSummary(ORG_A, PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(onHand); // INV-04
    expect(summary.get('stockValueMinor')).toBe(onHand); // INV-27
  });

  it('concurrent outgoing adjustments stop exactly at zero', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        stockAdjust.execute(
          callable(uidFor(ORG_A, 'OWNER'), {
            orgId: ORG_A,
            operationId: operationId(index + 1),
            payload: {
              productId: PRODUCT,
              warehouseId: MAIN,
              signedQuantityMilli: -2500,
              adjustmentReason: 'WASTAGE',
            },
          }),
          db,
        ),
      ),
    );
    const succeeded = results.filter((r) => r.ok).length;
    expect(succeeded).toBeLessThanOrEqual(4); // 10 000 / 2 500 — never more
    for (const result of results) assertLegitimateRefusal(result);
    const onHand = await assertLedgerReconciles(MAIN);
    expect(onHand).toBe(10_000 - succeeded * 2500);
    expect(onHand).toBeGreaterThanOrEqual(0);
  });
});

// T-CONC-08 — a transfer and an adjustment on the same balance.
describe('T-CONC-08 · a transfer and an adjustment serialise', () => {
  beforeEach(() => seedBase(20_000));

  it('both apply, and the ledger still reconciles against every balance', async () => {
    const [transferResult, adjustResult] = await Promise.all([
      stockTransfer.execute(
        callable(uidFor(ORG_A, 'OWNER'), {
          orgId: ORG_A,
          operationId: operationId(1),
          payload: {
            productId: PRODUCT,
            sourceWarehouseId: MAIN,
            destinationWarehouseId: COLD,
            quantityMilli: 8000,
          },
        }),
        db,
      ),
      stockAdjust.execute(
        callable(uidFor(ORG_A, 'ADMIN'), {
          orgId: ORG_A,
          operationId: operationId(2),
          payload: {
            productId: PRODUCT,
            warehouseId: MAIN,
            signedQuantityMilli: -5000,
            adjustmentReason: 'DAMAGED_IN_STORAGE',
          },
        }),
        db,
      ),
    ]);
    // Both write productStockSummaries — the contention point A3R-05 knowingly
    // reintroduced into the transfer write set to hold INV-27 — so one of the
    // two may be aborted rather than serialised. What must never happen is a
    // partial application of either.
    assertLegitimateRefusal(transferResult);
    assertLegitimateRefusal(adjustResult);
    expect([transferResult.ok, adjustResult.ok]).toContain(true);

    const mainMilli = await assertLedgerReconciles(MAIN);
    const coldMilli = await assertLedgerReconciles(COLD);
    expect(mainMilli).toBe(20_000 - (transferResult.ok ? 8000 : 0) - (adjustResult.ok ? 5000 : 0));
    expect(coldMilli).toBe(transferResult.ok ? 8000 : 0);
    expect(mainMilli).toBeGreaterThanOrEqual(0);

    const summary = await db.doc(paths.productStockSummary(ORG_A, PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(mainMilli + coldMilli); // INV-04
  });
});

describe('T-CONC-04 · concurrent receipts cannot over-receive', () => {
  const PO = 'po-1';
  const LINE = 'item-a';

  beforeEach(async () => {
    await seedBase(0);
    await seedPrivatePartner(db, ORG_A, 'partner-1');
    await seedPurchaseOrder(db, ORG_A, PO, {
      status: 'ORDERED',
      privateSupplierId: 'partner-1',
      orderNumber: 'PO-2026-001',
    });
    await seedPurchaseOrderItem(db, ORG_A, PO, LINE, {
      buyerProductId: PRODUCT,
      orderedBuyerBaseMilli: 40_000,
      receivedBuyerBaseMilli: 0,
    });
  });

  it('two receipts of the full outstanding quantity yield one success and one OVER_RECEIPT', async () => {
    const receive = (opId: string) =>
      poReceive.execute(
        callable(uidFor(ORG_A, 'STOREKEEPER'), {
          orgId: ORG_A,
          operationId: opId,
          payload: {
            purchaseOrderId: PO,
            warehouseId: MAIN,
            lines: [{ itemId: LINE, quantityMilli: 40_000 }],
          },
        }),
        db,
      );

    const results = await Promise.all([receive(operationId(1)), receive(operationId(2))]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const failure = results.find((r) => !r.ok);
    expect(failure).toBeDefined();
    // The winner completes the order, so the loser meets the state guard before
    // the quantity guard. Either refusal proves T-CONC-04's actual claim —
    // received can never exceed outstanding — and both are failed-precondition.
    if (failure) assertLegitimateRefusal(failure);

    const item = await db.doc(paths.purchaseOrderItem(ORG_A, PO, LINE)).get();
    expect(item.get('receivedBuyerBaseMilli')).toBe(40_000);
    expect(item.get('receivedBuyerBaseMilli')).toBeLessThanOrEqual(40_000);

    const onHand = await assertLedgerReconciles(MAIN);
    expect(onHand).toBe(40_000);
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(1);

    const po = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(po.get('status')).toBe('RECEIVED');
  });

  it('refuses the loser with OVER_RECEIPT while the order stays open', async () => {
    // 30 000 + 30 000 against 40 000 ordered: the winner leaves the order
    // PARTIALLY_RECEIVED, so the state guard passes and the quantity guard is
    // the one that has to do the work.
    const receive = (opId: string) =>
      poReceive.execute(
        callable(uidFor(ORG_A, 'OWNER'), {
          orgId: ORG_A,
          operationId: opId,
          payload: {
            purchaseOrderId: PO,
            warehouseId: MAIN,
            lines: [{ itemId: LINE, quantityMilli: 30_000 }],
          },
        }),
        db,
      );

    const results = await Promise.all([receive(operationId(1)), receive(operationId(2))]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const failure = results.find((r) => !r.ok);
    expect(failure).toBeDefined();
    if (failure) assertLegitimateRefusal(failure);

    const item = await db.doc(paths.purchaseOrderItem(ORG_A, PO, LINE)).get();
    expect(item.get('receivedBuyerBaseMilli')).toBe(30_000);
    const po = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(po.get('status')).toBe('PARTIALLY_RECEIVED');
    const onHand = await assertLedgerReconciles(MAIN);
    expect(onHand).toBe(30_000);
  });
});
