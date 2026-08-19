import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import { poCancel, poOrder, poReceive } from '../../functions/src/commands/purchase-order.js';
import {
  callable,
  clearFirestore,
  collectionOf,
  ORG_A,
  ORG_B,
  OPERATION_ID_A,
  OPERATION_ID_B,
  seedCounter,
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

let db: Firestore;

const PRODUCT = 'product-rice';
const PRODUCT_B = 'product-flour';
const MAIN = 'warehouse-main';
const COLD = 'warehouse-cold';
const SUPPLIER = 'partner-green-farm';
const PO = 'po-1';
const LINE_A = 'item-a';
const LINE_B = 'item-b';

const ALL_ROLES = [
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
  'PROCUREMENT_MANAGER',
  'STOREKEEPER',
  'ANALYST',
  'VIEWER',
] as const;

function reasonOf(result: { ok: boolean; details?: unknown }): string {
  return (result.details as { reason?: string } | undefined)?.reason ?? '';
}

async function historyOf(purchaseOrderId: string): Promise<FirebaseFirestore.DocumentData[]> {
  const snapshot = await db
    .collection(`${paths.purchaseOrder(ORG_A, purchaseOrderId)}/history`)
    .get();
  return snapshot.docs.map((doc) => doc.data());
}

async function seedBase(): Promise<void> {
  await clearFirestore();
  await seedOrganization(db, ORG_A);
  await seedOrganization(db, ORG_B);
  await seedSettings(db, ORG_A);
  for (const role of ALL_ROLES) await seedMember(db, ORG_A, role);
  await seedMember(db, ORG_B, 'OWNER');
  await seedWarehouse(db, ORG_A, MAIN, { name: 'Main Store' });
  await seedWarehouse(db, ORG_A, COLD, { name: 'Cold Room' });
  await seedProduct(db, ORG_A, PRODUCT, { name: 'Basmati Rice' });
  await seedProduct(db, ORG_A, PRODUCT_B, { name: 'Wheat Flour', internalSku: 'FLOUR-1' });
  await seedProductStockSummary(db, ORG_A, PRODUCT, { productName: 'Basmati Rice' });
  await seedProductStockSummary(db, ORG_A, PRODUCT_B, { productName: 'Wheat Flour' });
  await seedPrivatePartner(db, ORG_A, SUPPLIER, { name: 'Green Farm Poultry' });
  await seedCounter(db, ORG_A, 'purchaseOrder', 0);
}

beforeAll(() => {
  db = testDb();
});

describe('C-15 po.order', () => {
  beforeEach(async () => {
    await seedBase();
    await seedPurchaseOrder(db, ORG_A, PO, {
      status: 'DRAFT',
      privateSupplierId: SUPPLIER,
      counterpartyName: 'Green Farm Poultry',
      totalMinor: 0,
    });
    await seedPurchaseOrderItem(db, ORG_A, PO, LINE_A, {
      buyerProductId: PRODUCT,
      orderedBuyerBaseMilli: 50_000,
      unitPriceMinor: 250,
      lineTotalMinor: 999_999, // a client-supplied total the server must ignore
      buyerProductNameSnapshot: 'stale name',
    });
  });

  const order = (uid: string, purchaseOrderId = PO, operationId = OPERATION_ID_A) =>
    poOrder.execute(callable(uid, { orgId: ORG_A, operationId, payload: { purchaseOrderId } }), db);

  it('moves DRAFT to ORDERED, allocates the order number and freezes the line snapshots', async () => {
    const result = await order(uidFor(ORG_A, 'PROCUREMENT_MANAGER'));
    expect(result.ok, JSON.stringify(result)).toBe(true);

    const po = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(po.get('status')).toBe('ORDERED');
    expect(po.get('orderNumber')).toMatch(/^PO-\d{4}-001$/);
    // totalMinor is recomputed from the snapshot: 50 000 milli × 250 minor / 1000.
    expect(po.get('totalMinor')).toBe(12_500);
    expect(po.get('orderedAt')).toBeDefined();

    const item = await db.doc(paths.purchaseOrderItem(ORG_A, PO, LINE_A)).get();
    expect(item.get('buyerProductNameSnapshot')).toBe('Basmati Rice');
    expect(item.get('buyerSkuSnapshot')).toBe('PRODUCT-RICE');
    expect(item.get('buyerBaseUnitSnapshot')).toBe('EACH');
    expect(item.get('lineTotalMinor')).toBe(12_500);
    expect(item.get('receivedBuyerBaseMilli')).toBe(0);

    const counter = await db.doc(paths.counter(ORG_A, 'purchaseOrder')).get();
    expect(counter.get('value')).toBe(1);

    // DV-13 — ordersPlacedCount counts non-cancelled orders placed.
    const supplier = await db.doc(paths.privatePartner(ORG_A, SUPPLIER)).get();
    expect(supplier.get('ordersPlacedCount')).toBe(1);

    const history = await historyOf(PO);
    expect(history).toHaveLength(1);
    expect(history[0]?.fromStatus).toBe('DRAFT');
    expect(history[0]?.toStatus).toBe('ORDERED');
    expect(history[0]?.operationId).toBe(OPERATION_ID_A);

    const audits = await collectionOf(db, ORG_A, 'auditLogs');
    expect(audits).toHaveLength(1);
    expect(audits[0]?.get('action')).toBe('po.order');
  });

  it('creates no stock whatsoever — ordering is not receiving', async () => {
    await order(uidFor(ORG_A, 'OWNER'));
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
    expect(await collectionOf(db, ORG_A, 'stockBalances')).toHaveLength(0);
    const summary = await db.doc(paths.productStockSummary(ORG_A, PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(0);
  });

  it('refuses an order that is not a DRAFT', async () => {
    await order(uidFor(ORG_A, 'OWNER'));
    const again = await order(uidFor(ORG_A, 'OWNER'), PO, OPERATION_ID_B);
    expect(reasonOf(again)).toBe('INVALID_TRANSITION');
  });

  it('refuses a deactivated supplier and an archived product', async () => {
    await seedPrivatePartner(db, ORG_A, SUPPLIER, { status: 'DEACTIVATED' });
    expect(reasonOf(await order(uidFor(ORG_A, 'OWNER')))).toBe('INVALID_TRANSITION');

    await seedPrivatePartner(db, ORG_A, SUPPLIER, { status: 'ACTIVE' });
    await seedProduct(db, ORG_A, PRODUCT, { status: 'ARCHIVED' });
    expect(reasonOf(await order(uidFor(ORG_A, 'OWNER')))).toBe('PRODUCT_NOT_ACTIVE');

    const po = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(po.get('status')).toBe('DRAFT');
  });

  it('refuses an order with no lines', async () => {
    await db.doc(paths.purchaseOrderItem(ORG_A, PO, LINE_A)).delete();
    expect(reasonOf(await order(uidFor(ORG_A, 'OWNER')))).toBe('INVALID_TRANSITION');
  });

  // DB-07 §8 draws no `receive` edge out of DRAFT and DB-06 §3.3 makes C-17 the
  // sole writer of received quantity, pairing every increase with one
  // PURCHASE_RECEIPT movement. A draft line claiming receipt is therefore not a
  // valid line, and freezing it into ORDERED would hand C-16 a false
  // `receivedTotal` and C-17 false outstanding arithmetic. Rules pin the field
  // to zero on the client-write surface; this is the same invariant at the
  // trusted-command boundary, which the Admin SDK does not go through rules for.
  it('refuses a draft line that already claims received stock, and writes nothing', async () => {
    await seedPurchaseOrderItem(db, ORG_A, PO, LINE_A, {
      buyerProductId: PRODUCT,
      orderedBuyerBaseMilli: 50_000,
      receivedBuyerBaseMilli: 1,
    });
    expect(reasonOf(await order(uidFor(ORG_A, 'OWNER')))).toBe('INVALID_TRANSITION');

    const po = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(po.get('status')).toBe('DRAFT');
    expect(po.get('orderNumber')).toBeUndefined();
    const counter = await db.doc(paths.counter(ORG_A, 'purchaseOrder')).get();
    expect(counter.get('value')).toBe(0);
    const supplier = await db.doc(paths.privatePartner(ORG_A, SUPPLIER)).get();
    expect(supplier.get('ordersPlacedCount')).toBe(0);
    expect(await historyOf(PO)).toHaveLength(0);
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(0);
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);

    // A fully received line and a partial one are refused identically.
    await seedPurchaseOrderItem(db, ORG_A, PO, LINE_A, {
      buyerProductId: PRODUCT,
      orderedBuyerBaseMilli: 50_000,
      receivedBuyerBaseMilli: 50_000,
    });
    expect(reasonOf(await order(uidFor(ORG_A, 'OWNER'), PO, OPERATION_ID_B))).toBe(
      'INVALID_TRANSITION',
    );

    // The same order with the line honestly at zero is accepted, so the denial
    // above is attributable to the received quantity and to nothing else.
    await seedPurchaseOrderItem(db, ORG_A, PO, LINE_A, {
      buyerProductId: PRODUCT,
      orderedBuyerBaseMilli: 50_000,
      receivedBuyerBaseMilli: 0,
    });
    const accepted = await order(uidFor(ORG_A, 'OWNER'), PO, OPERATION_ID_B);
    expect(accepted.ok, JSON.stringify(accepted)).toBe(true);
  });

  it('refuses when only one line of several claims received stock', async () => {
    await seedPurchaseOrderItem(db, ORG_A, PO, LINE_B, {
      buyerProductId: PRODUCT_B,
      orderedBuyerBaseMilli: 20_000,
      receivedBuyerBaseMilli: 5_000,
    });
    expect(reasonOf(await order(uidFor(ORG_A, 'OWNER')))).toBe('INVALID_TRANSITION');
    const po = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(po.get('status')).toBe('DRAFT');
  });

  it('refuses a purchase order belonging to another organization', async () => {
    await seedPurchaseOrder(db, ORG_B, 'po-other', { status: 'DRAFT' });
    expect(reasonOf(await order(uidFor(ORG_A, 'OWNER'), 'po-other'))).toBe(
      'CROSS_TENANT_REFERENCE',
    );
  });

  it('permits PO_WRITERS only', async () => {
    for (const role of ['INVENTORY_MANAGER', 'STOREKEEPER', 'ANALYST', 'VIEWER'] as const) {
      expect(reasonOf(await order(uidFor(ORG_A, role))), role).toBe('ROLE_NOT_PERMITTED');
    }
    expect((await order(uidFor(ORG_A, 'ADMIN'))).ok).toBe(true);
  });

  it('replays an identical operationId without double-counting the order', async () => {
    const first = await order(uidFor(ORG_A, 'OWNER'));
    const replay = await order(uidFor(ORG_A, 'OWNER'));
    expect(first.ok && replay.ok).toBe(true);
    if (first.ok && replay.ok) expect(replay.data).toEqual(first.data);
    const counter = await db.doc(paths.counter(ORG_A, 'purchaseOrder')).get();
    expect(counter.get('value')).toBe(1);
    const supplier = await db.doc(paths.privatePartner(ORG_A, SUPPLIER)).get();
    expect(supplier.get('ordersPlacedCount')).toBe(1);
    expect(await historyOf(PO)).toHaveLength(1);
  });
});

describe('C-16 po.cancel', () => {
  beforeEach(async () => {
    await seedBase();
    await seedPurchaseOrder(db, ORG_A, PO, {
      status: 'ORDERED',
      privateSupplierId: SUPPLIER,
      orderNumber: 'PO-2026-001',
    });
    await seedPurchaseOrderItem(db, ORG_A, PO, LINE_A, {
      buyerProductId: PRODUCT,
      orderedBuyerBaseMilli: 50_000,
    });
    await seedPrivatePartner(db, ORG_A, SUPPLIER, { ordersPlacedCount: 1 });
  });

  const cancel = (uid: string, purchaseOrderId = PO) =>
    poCancel.execute(callable(uid, { orgId: ORG_A, payload: { purchaseOrderId } }), db);

  it('cancels an ORDERED order, decrements the supplier counter and writes history', async () => {
    const result = await cancel(uidFor(ORG_A, 'PROCUREMENT_MANAGER'));
    expect(result.ok, JSON.stringify(result)).toBe(true);

    const po = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(po.get('status')).toBe('CANCELLED');
    expect(po.get('cancelledAt')).toBeDefined();

    const supplier = await db.doc(paths.privatePartner(ORG_A, SUPPLIER)).get();
    expect(supplier.get('ordersPlacedCount')).toBe(0);

    const history = await historyOf(PO);
    expect(history).toHaveLength(1);
    expect(history[0]?.fromStatus).toBe('ORDERED');
    expect(history[0]?.toStatus).toBe('CANCELLED');
    // Non-idempotent: there is no receipt, so no operationId is claimed.
    expect(history[0]?.operationId).toBeUndefined();

    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
    const audits = await collectionOf(db, ORG_A, 'auditLogs');
    expect(audits[0]?.get('action')).toBe('po.cancel');
  });

  it('cancels a DRAFT without decrementing a counter it never incremented', async () => {
    await seedPurchaseOrder(db, ORG_A, PO, {
      status: 'DRAFT',
      privateSupplierId: SUPPLIER,
    });
    await seedPrivatePartner(db, ORG_A, SUPPLIER, { ordersPlacedCount: 0 });
    const result = await cancel(uidFor(ORG_A, 'OWNER'));
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const supplier = await db.doc(paths.privatePartner(ORG_A, SUPPLIER)).get();
    expect(supplier.get('ordersPlacedCount')).toBe(0);
  });

  it('refuses to cancel once anything has been received', async () => {
    for (const status of ['PARTIALLY_RECEIVED', 'RECEIVED'] as const) {
      await seedPurchaseOrder(db, ORG_A, PO, { status, privateSupplierId: SUPPLIER });
      expect(reasonOf(await cancel(uidFor(ORG_A, 'OWNER'))), status).toBe('INVALID_TRANSITION');
    }

    // Even if the status somehow disagreed with its own lines, the quantities win.
    await seedPurchaseOrder(db, ORG_A, PO, { status: 'ORDERED', privateSupplierId: SUPPLIER });
    await seedPurchaseOrderItem(db, ORG_A, PO, LINE_A, {
      buyerProductId: PRODUCT,
      orderedBuyerBaseMilli: 50_000,
      receivedBuyerBaseMilli: 10_000,
    });
    expect(reasonOf(await cancel(uidFor(ORG_A, 'OWNER')))).toBe('INVALID_TRANSITION');

    const po = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(po.get('status')).toBe('ORDERED');
  });

  it('refuses to cancel an already CANCELLED order', async () => {
    await cancel(uidFor(ORG_A, 'OWNER'));
    expect(reasonOf(await cancel(uidFor(ORG_A, 'OWNER')))).toBe('INVALID_TRANSITION');
  });

  it('permits PO_WRITERS only, and refuses another tenant s order', async () => {
    for (const role of ['INVENTORY_MANAGER', 'STOREKEEPER', 'ANALYST', 'VIEWER'] as const) {
      expect(reasonOf(await cancel(uidFor(ORG_A, role))), role).toBe('ROLE_NOT_PERMITTED');
    }
    await seedPurchaseOrder(db, ORG_B, 'po-other', { status: 'ORDERED' });
    expect(reasonOf(await cancel(uidFor(ORG_A, 'OWNER'), 'po-other'))).toBe(
      'CROSS_TENANT_REFERENCE',
    );
  });
});

describe('C-17 po.receive', () => {
  beforeEach(async () => {
    await seedBase();
    await seedPurchaseOrder(db, ORG_A, PO, {
      status: 'ORDERED',
      privateSupplierId: SUPPLIER,
      orderNumber: 'PO-2026-001',
    });
    await seedPurchaseOrderItem(db, ORG_A, PO, LINE_A, {
      buyerProductId: PRODUCT,
      buyerProductNameSnapshot: 'Basmati Rice',
      orderedBuyerBaseMilli: 50_000,
      receivedBuyerBaseMilli: 0,
    });
  });

  const receive = (
    uid: string,
    lines: { itemId: string; quantityMilli: number }[],
    operationId = OPERATION_ID_A,
    warehouseId = MAIN,
  ) =>
    poReceive.execute(
      callable(uid, {
        orgId: ORG_A,
        operationId,
        payload: { purchaseOrderId: PO, warehouseId, lines },
      }),
      db,
    );

  it('applies a first partial receipt and moves the order to PARTIALLY_RECEIVED', async () => {
    const result = await receive(uidFor(ORG_A, 'STOREKEEPER'), [
      { itemId: LINE_A, quantityMilli: 20_000 },
    ]);
    expect(result.ok, JSON.stringify(result)).toBe(true);

    const movements = await collectionOf(db, ORG_A, 'stockMovements');
    expect(movements).toHaveLength(1);
    expect(movements[0]?.get('movementType')).toBe('PURCHASE_RECEIPT');
    expect(movements[0]?.get('signedQuantityMilli')).toBe(20_000);
    expect(movements[0]?.get('balanceAfterMilli')).toBe(20_000);
    expect(movements[0]?.get('sourceType')).toBe('PRIVATE_PO');
    expect(movements[0]?.get('sourceId')).toBe(PO);
    expect(movements[0]?.get('sourceReferenceSnapshot')).toBe('PO-2026-001');

    const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(balance.get('onHandMilli')).toBe(20_000);
    const summary = await db.doc(paths.productStockSummary(ORG_A, PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(20_000);

    const item = await db.doc(paths.purchaseOrderItem(ORG_A, PO, LINE_A)).get();
    expect(item.get('receivedBuyerBaseMilli')).toBe(20_000);

    const po = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(po.get('status')).toBe('PARTIALLY_RECEIVED');
    // Recorded at the FIRST receipt, for warehouse.archive's open-receipt guard.
    expect(po.get('receivingWarehouseId')).toBe(MAIN);
  });

  it('completes the order on the final receipt and stamps receivedAt', async () => {
    await receive(uidFor(ORG_A, 'OWNER'), [{ itemId: LINE_A, quantityMilli: 20_000 }]);
    const second = await receive(
      uidFor(ORG_A, 'OWNER'),
      [{ itemId: LINE_A, quantityMilli: 10_000 }],
      OPERATION_ID_B,
    );
    expect(second.ok, JSON.stringify(second)).toBe(true);
    let po = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(po.get('status')).toBe('PARTIALLY_RECEIVED');

    // Exactly the remaining quantity completes it.
    const final = await receive(
      uidFor(ORG_A, 'OWNER'),
      [{ itemId: LINE_A, quantityMilli: 20_000 }],
      '99999999-8888-4777-8666-555555555555',
    );
    expect(final.ok, JSON.stringify(final)).toBe(true);
    po = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(po.get('status')).toBe('RECEIVED');
    expect(po.get('receivedAt')).toBeDefined();

    const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(balance.get('onHandMilli')).toBe(50_000);
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(3);
    expect(await historyOf(PO)).toHaveLength(3);
  });

  it('refuses an over-receipt and writes nothing', async () => {
    const result = await receive(uidFor(ORG_A, 'OWNER'), [
      { itemId: LINE_A, quantityMilli: 50_001 },
    ]);
    expect(reasonOf(result)).toBe('OVER_RECEIPT');
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(0);
    const item = await db.doc(paths.purchaseOrderItem(ORG_A, PO, LINE_A)).get();
    expect(item.get('receivedBuyerBaseMilli')).toBe(0);
  });

  it('refuses an over-receipt measured against what is already received', async () => {
    await receive(uidFor(ORG_A, 'OWNER'), [{ itemId: LINE_A, quantityMilli: 45_000 }]);
    const result = await receive(
      uidFor(ORG_A, 'OWNER'),
      [{ itemId: LINE_A, quantityMilli: 5001 }],
      OPERATION_ID_B,
    );
    expect(reasonOf(result)).toBe('OVER_RECEIPT');
    const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(balance.get('onHandMilli')).toBe(45_000);
  });

  it('refuses a zero or negative line quantity', async () => {
    for (const quantityMilli of [0, -5]) {
      const result = await receive(uidFor(ORG_A, 'OWNER'), [{ itemId: LINE_A, quantityMilli }]);
      expect(result.ok, String(quantityMilli)).toBe(false);
      if (!result.ok) expect(result.code).toBe('invalid-argument');
    }
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
  });

  it('refuses an order in a state that cannot receive', async () => {
    for (const status of ['DRAFT', 'CANCELLED', 'RECEIVED'] as const) {
      await seedPurchaseOrder(db, ORG_A, PO, { status, privateSupplierId: SUPPLIER });
      const result = await receive(uidFor(ORG_A, 'OWNER'), [
        { itemId: LINE_A, quantityMilli: 100 },
      ]);
      expect(reasonOf(result), status).toBe('INVALID_TRANSITION');
    }
  });

  it('refuses an unknown line, a duplicated line and an archived store room', async () => {
    expect(
      reasonOf(await receive(uidFor(ORG_A, 'OWNER'), [{ itemId: 'nope', quantityMilli: 100 }])),
    ).toBe('RESOURCE_NOT_FOUND');

    const duplicated = await receive(uidFor(ORG_A, 'OWNER'), [
      { itemId: LINE_A, quantityMilli: 100 },
      { itemId: LINE_A, quantityMilli: 100 },
    ]);
    expect(duplicated.ok).toBe(false);
    if (!duplicated.ok) expect(duplicated.code).toBe('invalid-argument');

    await seedWarehouse(db, ORG_A, 'warehouse-archived', { status: 'ARCHIVED' });
    expect(
      reasonOf(
        await receive(
          uidFor(ORG_A, 'OWNER'),
          [{ itemId: LINE_A, quantityMilli: 100 }],
          OPERATION_ID_A,
          'warehouse-archived',
        ),
      ),
    ).toBe('WAREHOUSE_NOT_ACTIVE');
  });

  it('pins later receipts to the store room recorded at the first receipt', async () => {
    await receive(uidFor(ORG_A, 'OWNER'), [{ itemId: LINE_A, quantityMilli: 10_000 }]);
    const elsewhere = await receive(
      uidFor(ORG_A, 'OWNER'),
      [{ itemId: LINE_A, quantityMilli: 10_000 }],
      OPERATION_ID_B,
      COLD,
    );
    expect(reasonOf(elsewhere)).toBe('INVALID_TRANSITION');
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(1);
  });

  it('writes one movement per line, with sequential balances when lines share a product', async () => {
    await seedPurchaseOrderItem(db, ORG_A, PO, LINE_B, {
      buyerProductId: PRODUCT,
      orderedBuyerBaseMilli: 30_000,
      receivedBuyerBaseMilli: 0,
    });
    const result = await receive(uidFor(ORG_A, 'OWNER'), [
      { itemId: LINE_A, quantityMilli: 5000 },
      { itemId: LINE_B, quantityMilli: 7000 },
    ]);
    expect(result.ok, JSON.stringify(result)).toBe(true);

    const movements = await collectionOf(db, ORG_A, 'stockMovements');
    expect(movements).toHaveLength(2);
    const balancesAfter = movements
      .map((m) => m.get('balanceAfterMilli') as number)
      .sort((a, b) => a - b);
    expect(balancesAfter).toEqual([5000, 12_000]); // INV-24, applied in line order

    const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(balance.get('onHandMilli')).toBe(12_000);
    const summary = await db.doc(paths.productStockSummary(ORG_A, PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(12_000);
    expect(summary.get('stockValueMinor')).toBe(12_000); // INV-27
  });

  it('receives two products into one store room in a single transaction', async () => {
    await seedPurchaseOrderItem(db, ORG_A, PO, LINE_B, {
      buyerProductId: PRODUCT_B,
      orderedBuyerBaseMilli: 30_000,
      receivedBuyerBaseMilli: 0,
    });
    const result = await receive(uidFor(ORG_A, 'OWNER'), [
      { itemId: LINE_A, quantityMilli: 50_000 },
      { itemId: LINE_B, quantityMilli: 30_000 },
    ]);
    expect(result.ok, JSON.stringify(result)).toBe(true);

    const po = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(po.get('status')).toBe('RECEIVED');
    const rice = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    const flour = await db.doc(paths.stockBalance(ORG_A, PRODUCT_B, MAIN)).get();
    expect(rice.get('onHandMilli')).toBe(50_000);
    expect(flour.get('onHandMilli')).toBe(30_000);
  });

  it('notifies on a stock-status transition caused by a receipt', async () => {
    // The product's minimum is 5 000; receiving 1 000 lifts it from OUT_OF_STOCK
    // to LOW_STOCK, which is a transition worth reporting.
    const result = await receive(uidFor(ORG_A, 'OWNER'), [{ itemId: LINE_A, quantityMilli: 1000 }]);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const notifications = await db
      .collection(`${paths.user(uidFor(ORG_A, 'INVENTORY_MANAGER'))}/notifications`)
      .get();
    expect(notifications.docs).toHaveLength(1);
    expect(notifications.docs[0]?.get('type')).toBe('LOW_STOCK');
  });

  it('replays an identical operationId without receiving twice', async () => {
    const lines = [{ itemId: LINE_A, quantityMilli: 20_000 }];
    const first = await receive(uidFor(ORG_A, 'OWNER'), lines);
    const replay = await receive(uidFor(ORG_A, 'OWNER'), lines);
    expect(first.ok && replay.ok).toBe(true);
    if (first.ok && replay.ok) expect(replay.data).toEqual(first.data);

    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(1);
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(1);
    const item = await db.doc(paths.purchaseOrderItem(ORG_A, PO, LINE_A)).get();
    expect(item.get('receivedBuyerBaseMilli')).toBe(20_000);
    const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(balance.get('onHandMilli')).toBe(20_000);
  });

  it('rejects the same operationId carrying different quantities', async () => {
    await receive(uidFor(ORG_A, 'OWNER'), [{ itemId: LINE_A, quantityMilli: 20_000 }]);
    const changed = await receive(uidFor(ORG_A, 'OWNER'), [
      { itemId: LINE_A, quantityMilli: 25_000 },
    ]);
    expect(reasonOf(changed)).toBe('OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD');
    const balance = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(balance.get('onHandMilli')).toBe(20_000);
  });

  it('permits RECEIVERS and denies ANALYST and VIEWER', async () => {
    for (const role of ['ANALYST', 'VIEWER'] as const) {
      expect(
        reasonOf(await receive(uidFor(ORG_A, role), [{ itemId: LINE_A, quantityMilli: 1 }])),
        role,
      ).toBe('ROLE_NOT_PERMITTED');
    }
    for (const role of [
      'OWNER',
      'ADMIN',
      'INVENTORY_MANAGER',
      'PROCUREMENT_MANAGER',
      'STOREKEEPER',
    ] as const) {
      await seedPurchaseOrder(db, ORG_A, PO, {
        status: 'ORDERED',
        privateSupplierId: SUPPLIER,
        orderNumber: 'PO-2026-001',
      });
      await seedPurchaseOrderItem(db, ORG_A, PO, LINE_A, {
        buyerProductId: PRODUCT,
        orderedBuyerBaseMilli: 50_000,
        receivedBuyerBaseMilli: 0,
      });
      await seedStockBalance(db, ORG_A, PRODUCT, MAIN, { onHandMilli: 0 });
      const result = await receive(
        uidFor(ORG_A, role),
        [{ itemId: LINE_A, quantityMilli: 1000 }],
        `0000000${String(ALL_ROLES.indexOf(role))}-1111-4222-8333-444444444444`,
      );
      expect(result.ok, `${role}: ${JSON.stringify(result)}`).toBe(true);
    }
  });
});
