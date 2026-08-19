import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import { stockAdjust, stockRecordOpeningBalance } from '../../functions/src/commands/stock.js';
import {
  callable,
  clearFirestore,
  collectionOf,
  ORG_A,
  ORG_B,
  OPERATION_ID_A,
  OPERATION_ID_B,
  seedMember,
  seedOrganization,
  seedProduct,
  seedProductStockSummary,
  seedSettings,
  seedStockBalance,
  seedWarehouse,
  testDb,
  uidFor,
} from './harness.js';

let db: Firestore;

const PRODUCT = 'product-rice';
const MAIN = 'warehouse-main';
const COLD = 'warehouse-cold';

/** `seedProduct` costs 1000 minor per base unit, so value in minor == milli on hand. */
const asAt = (): Timestamp => Timestamp.fromMillis(Date.now() - 60_000);

function reasonOf(result: { ok: boolean; details?: unknown }): string {
  return (result.details as { reason?: string } | undefined)?.reason ?? '';
}

async function seedBase(): Promise<void> {
  await clearFirestore();
  await seedOrganization(db, ORG_A);
  await seedOrganization(db, ORG_B);
  await seedSettings(db, ORG_A);
  for (const role of [
    'OWNER',
    'ADMIN',
    'INVENTORY_MANAGER',
    'PROCUREMENT_MANAGER',
    'STOREKEEPER',
    'ANALYST',
    'VIEWER',
  ] as const) {
    await seedMember(db, ORG_A, role);
  }
  await seedMember(db, ORG_B, 'INVENTORY_MANAGER');
  await seedWarehouse(db, ORG_A, MAIN, { name: 'Main Store' });
  await seedWarehouse(db, ORG_A, COLD, { name: 'Cold Room' });
  await seedWarehouse(db, ORG_B, 'warehouse-other', { name: 'Other Org Store' });
  await seedProduct(db, ORG_A, PRODUCT, { name: 'Basmati Rice' });
  await seedProductStockSummary(db, ORG_A, PRODUCT, { productName: 'Basmati Rice' });
}

beforeAll(() => {
  db = testDb();
});

describe('C-13 stock.recordOpeningBalance', () => {
  beforeEach(seedBase);

  const open = (uid: string, payload: unknown, operationId = OPERATION_ID_A) =>
    stockRecordOpeningBalance.execute(callable(uid, { orgId: ORG_A, operationId, payload }), db);

  it('writes the balance, the summary and one immutable OPENING_BALANCE movement', async () => {
    const result = await open(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      quantityMilli: 12_000,
      effectiveAt: asAt(),
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);

    const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(balance.get('onHandMilli')).toBe(12_000);
    expect(balance.get('stockValueMinor')).toBe(12_000);
    expect(balance.get('stockStatus')).toBe('IN_STOCK');
    expect(balance.get('shortfallMilli')).toBe(0);
    // DV-11 — the denormalised product fields are populated on create.
    expect(balance.get('productName')).toBe('Basmati Rice');
    expect(balance.get('unit')).toBe('EACH');

    const summary = await db.doc(paths.productStockSummary(ORG_A, PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(12_000);
    expect(summary.get('availableMilli')).toBe(12_000);
    expect(summary.get('stockValueMinor')).toBe(12_000);

    const movements = await collectionOf(db, ORG_A, 'stockMovements');
    expect(movements).toHaveLength(1);
    const movement = movements[0];
    expect(movement?.get('movementType')).toBe('OPENING_BALANCE');
    expect(movement?.get('signedQuantityMilli')).toBe(12_000);
    expect(movement?.get('balanceAfterMilli')).toBe(12_000); // INV-24
    expect(movement?.get('sourceType')).toBe('MANUAL');
    expect(movement?.get('warehouseNameSnapshot')).toBe('Main Store');
    expect(movement?.get('operationId')).toBe(OPERATION_ID_A);

    const audits = await collectionOf(db, ORG_A, 'auditLogs');
    expect(audits).toHaveLength(1);
    expect(audits[0]?.get('action')).toBe('stock.recordOpeningBalance');
    expect(audits[0]?.get('actorRole')).toBe('INVENTORY_MANAGER');
  });

  // A3R-P2 · C1-AUTH-007, OWNER-APPROVED — the whole point of the exception.
  it('accepts a ZERO opening balance and still writes the immutable ledger entry', async () => {
    const result = await open(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      quantityMilli: 0,
      effectiveAt: asAt(),
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);

    const movements = await collectionOf(db, ORG_A, 'stockMovements');
    expect(movements).toHaveLength(1);
    expect(movements[0]?.get('movementType')).toBe('OPENING_BALANCE');
    expect(movements[0]?.get('signedQuantityMilli')).toBe(0);
    expect(movements[0]?.get('balanceAfterMilli')).toBe(0);

    const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(balance.exists).toBe(true);
    expect(balance.get('onHandMilli')).toBe(0);
    expect(balance.get('stockStatus')).toBe('OUT_OF_STOCK');

    const summary = await db.doc(paths.productStockSummary(ORG_A, PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(0);
    expect(summary.get('stockStatus')).toBe('OUT_OF_STOCK');
  });

  it('refuses a second opening balance for the same product and store room', async () => {
    await open(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      quantityMilli: 0,
      effectiveAt: asAt(),
    });
    const second = await open(
      uidFor(ORG_A, 'OWNER'),
      { productId: PRODUCT, warehouseId: MAIN, quantityMilli: 5000, effectiveAt: asAt() },
      OPERATION_ID_B,
    );
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(reasonOf(second)).toBe('OPENING_BALANCE_ALREADY_RECORDED');
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(1);
  });

  it('allows a separate opening balance in a different store room', async () => {
    await open(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      quantityMilli: 4000,
      effectiveAt: asAt(),
    });
    const second = await open(
      uidFor(ORG_A, 'OWNER'),
      { productId: PRODUCT, warehouseId: COLD, quantityMilli: 3000, effectiveAt: asAt() },
      OPERATION_ID_B,
    );
    expect(second.ok, JSON.stringify(second)).toBe(true);
    const summary = await db.doc(paths.productStockSummary(ORG_A, PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(7000); // INV-04
    expect(summary.get('stockValueMinor')).toBe(7000); // INV-27
  });

  it('rejects a negative quantity and a future effective date', async () => {
    const negative = await open(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      quantityMilli: -1,
      effectiveAt: asAt(),
    });
    expect(negative.ok).toBe(false);
    if (!negative.ok) expect(negative.code).toBe('invalid-argument');

    const future = await open(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      quantityMilli: 100,
      effectiveAt: Timestamp.fromMillis(Date.now() + 86_400_000),
    });
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.code).toBe('invalid-argument');
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
  });

  it('refuses an archived product, an archived store room and another tenant s store room', async () => {
    await seedProduct(db, ORG_A, 'product-archived', { status: 'ARCHIVED' });
    await seedWarehouse(db, ORG_A, 'warehouse-archived', { status: 'ARCHIVED' });

    const archivedProduct = await open(uidFor(ORG_A, 'OWNER'), {
      productId: 'product-archived',
      warehouseId: MAIN,
      quantityMilli: 100,
      effectiveAt: asAt(),
    });
    expect(reasonOf(archivedProduct)).toBe('PRODUCT_NOT_ACTIVE');

    const archivedWarehouse = await open(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: 'warehouse-archived',
      quantityMilli: 100,
      effectiveAt: asAt(),
    });
    expect(reasonOf(archivedWarehouse)).toBe('WAREHOUSE_NOT_ACTIVE');

    const crossTenant = await open(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: 'warehouse-other',
      quantityMilli: 100,
      effectiveAt: asAt(),
    });
    expect(reasonOf(crossTenant)).toBe('CROSS_TENANT_REFERENCE');
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
  });

  it('denies every role outside INVENTORY_WRITERS', async () => {
    for (const role of ['PROCUREMENT_MANAGER', 'STOREKEEPER', 'ANALYST', 'VIEWER'] as const) {
      const result = await open(uidFor(ORG_A, role), {
        productId: PRODUCT,
        warehouseId: MAIN,
        quantityMilli: 100,
        effectiveAt: asAt(),
      });
      expect(reasonOf(result), role).toBe('ROLE_NOT_PERMITTED');
    }
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
  });

  it('replays an identical operationId without a second movement, and rejects a changed payload', async () => {
    const payload = {
      productId: PRODUCT,
      warehouseId: MAIN,
      quantityMilli: 6000,
      effectiveAt: asAt(),
    };
    const first = await open(uidFor(ORG_A, 'OWNER'), payload);
    const replay = await open(uidFor(ORG_A, 'OWNER'), payload);
    expect(first.ok && replay.ok).toBe(true);
    if (first.ok && replay.ok) expect(replay.data).toEqual(first.data);

    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(1);
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(1);
    const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(balance.get('onHandMilli')).toBe(6000);

    const changed = await open(uidFor(ORG_A, 'OWNER'), { ...payload, quantityMilli: 9000 });
    expect(reasonOf(changed)).toBe('OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD');
  });
});

describe('C-14 stock.adjust', () => {
  beforeEach(async () => {
    await seedBase();
    await seedStockBalance(db, ORG_A, PRODUCT, MAIN, {
      onHandMilli: 10_000,
      stockValueMinor: 10_000,
      stockStatus: 'IN_STOCK',
      shortfallMilli: 0,
      productName: 'Basmati Rice',
    });
    await seedProductStockSummary(db, ORG_A, PRODUCT, {
      productName: 'Basmati Rice',
      onHandMilli: 10_000,
      availableMilli: 10_000,
      stockValueMinor: 10_000,
      stockStatus: 'IN_STOCK',
      shortfallMilli: 0,
    });
  });

  const adjust = (uid: string, payload: unknown, operationId = OPERATION_ID_A) =>
    stockAdjust.execute(callable(uid, { orgId: ORG_A, operationId, payload }), db);

  it('writes ADJUSTMENT_IN for a positive quantity and keeps the summary in step', async () => {
    const result = await adjust(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      signedQuantityMilli: 2500,
      adjustmentReason: 'RECOUNT_CORRECTION',
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);

    const movements = await collectionOf(db, ORG_A, 'stockMovements');
    expect(movements).toHaveLength(1);
    expect(movements[0]?.get('movementType')).toBe('ADJUSTMENT_IN');
    expect(movements[0]?.get('signedQuantityMilli')).toBe(2500);
    expect(movements[0]?.get('balanceAfterMilli')).toBe(12_500);
    expect(movements[0]?.get('adjustmentReason')).toBe('RECOUNT_CORRECTION');

    const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(balance.get('onHandMilli')).toBe(12_500);
    const summary = await db.doc(paths.productStockSummary(ORG_A, PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(12_500);
    expect(summary.get('stockValueMinor')).toBe(12_500);
  });

  it('writes ADJUSTMENT_OUT for a negative quantity, and never a generic ADJUSTMENT', async () => {
    const result = await adjust(uidFor(ORG_A, 'ADMIN'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      signedQuantityMilli: -4000,
      adjustmentReason: 'DAMAGED_IN_STORAGE',
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const movements = await collectionOf(db, ORG_A, 'stockMovements');
    expect(movements[0]?.get('movementType')).toBe('ADJUSTMENT_OUT');
    expect(movements[0]?.get('signedQuantityMilli')).toBe(-4000);
    expect(movements[0]?.get('balanceAfterMilli')).toBe(6000);
  });

  it('rejects a zero adjustment — only C-13 may record zero', async () => {
    const result = await adjust(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      signedQuantityMilli: 0,
      adjustmentReason: 'RECOUNT_CORRECTION',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid-argument');
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
  });

  it('allows an outgoing adjustment that lands exactly on zero', async () => {
    const result = await adjust(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      signedQuantityMilli: -10_000,
      adjustmentReason: 'WASTAGE',
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(balance.get('onHandMilli')).toBe(0);
    expect(balance.get('stockStatus')).toBe('OUT_OF_STOCK');
    expect(balance.get('shortfallMilli')).toBe(5000);
  });

  it('refuses to drive the balance negative and writes nothing at all', async () => {
    const result = await adjust(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      signedQuantityMilli: -10_001,
      adjustmentReason: 'WASTAGE',
    });
    expect(reasonOf(result)).toBe('INSUFFICIENT_STOCK');
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(0);
    const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(balance.get('onHandMilli')).toBe(10_000);
  });

  it('applies the negative-stock rule per store room, not per product', async () => {
    await seedStockBalance(db, ORG_A, PRODUCT, COLD, {
      onHandMilli: 50_000,
      stockValueMinor: 50_000,
      stockStatus: 'IN_STOCK',
      shortfallMilli: 0,
    });
    // A large surplus in Cold Room must not license a deficit in Main Store.
    const result = await adjust(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      signedQuantityMilli: -20_000,
      adjustmentReason: 'WASTAGE',
    });
    expect(reasonOf(result)).toBe('INSUFFICIENT_STOCK');
  });

  it('requires a note when the reason is OTHER', async () => {
    const withoutNote = await adjust(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      signedQuantityMilli: 100,
      adjustmentReason: 'OTHER',
    });
    expect(withoutNote.ok).toBe(false);
    if (!withoutNote.ok) expect(withoutNote.code).toBe('invalid-argument');

    const withNote = await adjust(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      signedQuantityMilli: 100,
      adjustmentReason: 'OTHER',
      note: 'Found an extra sack behind the door.',
    });
    expect(withNote.ok, JSON.stringify(withNote)).toBe(true);
    const movements = await collectionOf(db, ORG_A, 'stockMovements');
    expect(movements[0]?.get('note')).toBe('Found an extra sack behind the door.');
  });

  it('notifies INVENTORY_WRITERS once, only on a stock-status transition', async () => {
    // 10 000 → 4 000 crosses the 5 000 minimum: IN_STOCK → LOW_STOCK.
    const first = await adjust(uidFor(ORG_A, 'OWNER'), {
      productId: PRODUCT,
      warehouseId: MAIN,
      signedQuantityMilli: -6000,
      adjustmentReason: 'WASTAGE',
    });
    expect(first.ok, JSON.stringify(first)).toBe(true);

    const notified = await db
      .collection(`${paths.user(uidFor(ORG_A, 'INVENTORY_MANAGER'))}/notifications`)
      .get();
    expect(notified.docs).toHaveLength(1);
    expect(notified.docs[0]?.get('type')).toBe('LOW_STOCK');
    expect(notified.docs[0]?.get('category')).toBe('STOCK');
    expect(notified.docs[0]?.get('referenceId')).toBe(PRODUCT);

    // Still LOW_STOCK afterwards — no transition, so no second notification.
    const second = await adjust(
      uidFor(ORG_A, 'OWNER'),
      {
        productId: PRODUCT,
        warehouseId: MAIN,
        signedQuantityMilli: -1000,
        adjustmentReason: 'WASTAGE',
      },
      OPERATION_ID_B,
    );
    expect(second.ok, JSON.stringify(second)).toBe(true);
    const after = await db
      .collection(`${paths.user(uidFor(ORG_A, 'INVENTORY_MANAGER'))}/notifications`)
      .get();
    expect(after.docs).toHaveLength(1);
  });

  it('replays an identical operationId without a second mutation', async () => {
    const payload = {
      productId: PRODUCT,
      warehouseId: MAIN,
      signedQuantityMilli: 1500,
      adjustmentReason: 'RECOUNT_CORRECTION' as const,
    };
    await adjust(uidFor(ORG_A, 'OWNER'), payload);
    await adjust(uidFor(ORG_A, 'OWNER'), payload);
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(1);
    const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(balance.get('onHandMilli')).toBe(11_500);
  });

  it('denies every role outside INVENTORY_WRITERS', async () => {
    for (const role of ['PROCUREMENT_MANAGER', 'STOREKEEPER', 'ANALYST', 'VIEWER'] as const) {
      const result = await adjust(uidFor(ORG_A, role), {
        productId: PRODUCT,
        warehouseId: MAIN,
        signedQuantityMilli: 100,
        adjustmentReason: 'RECOUNT_CORRECTION',
      });
      expect(reasonOf(result), role).toBe('ROLE_NOT_PERMITTED');
    }
  });

  it('denies a member of another organization acting on this tenant', async () => {
    const result = await stockAdjust.execute(
      callable(uidFor(ORG_B, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: {
          productId: PRODUCT,
          warehouseId: MAIN,
          signedQuantityMilli: 100,
          adjustmentReason: 'RECOUNT_CORRECTION',
        },
      }),
      db,
    );
    expect(reasonOf(result)).toBe('NOT_A_MEMBER');
  });
});
