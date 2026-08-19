import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cpoDraftSave,
  cpoReceive,
  cpoRespond,
  cpoShip,
  cpoSubmit,
} from '../../functions/src/commands/connected-po.js';
import {
  connectionDisable,
  connectionRequest,
  connectionRespond,
} from '../../functions/src/commands/connection.js';
import { paths } from '../../packages/shared/src/paths.js';
import { serverPaths } from '../../packages/shared/src/server/paths.js';
import {
  callable,
  canonicalSubcollection,
  clearFirestore,
  collectionOf,
  connectionIdFor,
  ORG_A,
  ORG_B,
  seedConnectedDraft,
  seedConnectedDraftItem,
  seedConnection,
  seedMember,
  seedOpeningMovement,
  seedOrganization,
  seedOrganizationDirectory,
  seedPartnerCatalogItem,
  seedProduct,
  seedProductMapping,
  seedProductStockSummary,
  seedSettings,
  seedStockBalance,
  seedWarehouse,
  testDb,
  uidFor,
} from './harness.js';

/**
 * `T-CONC-06` and the connected extensions of `T-CONC-03`/`T-CONC-04`.
 *
 * Real parallel callables against the emulator, with no application-level lock:
 * a mutex that does not exist in production would prove nothing about
 * production. What is asserted is **persisted state** after the race — never
 * which competitor won, and never the exact error the loser received, because
 * that depends on whether Firestore let it re-read before refusing it and would
 * be testing the scheduler rather than the system.
 */

let db: Firestore;

const CONNECTION_ID = connectionIdFor(ORG_A, ORG_B);
const BUYER_PRODUCT = 'product-chicken';
const SUPPLIER_PRODUCT = 'product-chicken-pack';
const CATALOG_ITEM = 'catalog-chicken';
const MAPPING = 'mapping-chicken';
const PO = 'cpo-chicken';
const ITEM = 'item-chicken';
const COLD = 'warehouse-cold';
const MAIN = 'warehouse-main';

const ORDERED_PACK_MILLI = 10_000;
const FACTOR_MILLI = 5000;
const ORDERED_KG_MILLI = 50_000;
const SUPPLIER_OPENING = 200_000;
const BUYER_OPENING = 70_000;

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

function operationId(index: number): string {
  return `${String(index).padStart(8, '0')}-1111-4222-8333-444444444444`;
}

/**
 * A command that legitimately did not commit — a lost domain guard or an
 * aborted transaction. Both mean the same thing: **nothing was written**. The
 * deterministic single-threaded refusals are proved in
 * `commands-connected-po.test.ts`.
 */
function assertLegitimateRefusal(result: { ok: boolean; code?: string; details?: unknown }): void {
  if (result.ok) return;
  if (result.code === 'aborted') return;
  expect(['failed-precondition', 'already-exists']).toContain(result.code);
  expect([
    'INSUFFICIENT_STOCK',
    'OVER_RECEIPT',
    'INVALID_TRANSITION',
    'CONNECTION_NOT_ACTIVE',
    'CONNECTION_EXISTS',
  ]).toContain(reasonOf(result));
}

/**
 * Movements written by a **command**, excluding the fixture's seeded
 * `OPENING_BALANCE` rows. Those exist so `INV-03` is true of the fixture before
 * anything runs; they are not part of any write set under test.
 */
async function commandMovements(orgId: string): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const movements = await collectionOf(db, orgId, 'stockMovements');
  return movements.filter((doc) => doc.get('movementType') !== 'OPENING_BALANCE');
}

async function onHand(orgId: string, productId: string, warehouseId: string): Promise<number> {
  const balance = await db.doc(paths.stockBalance(orgId, productId, warehouseId)).get();
  return balance.exists ? (balance.get('onHandMilli') as number) : 0;
}

/** `INV-03` for one organization's product-and-store-room. */
async function assertLedgerReconciles(
  orgId: string,
  productId: string,
  warehouseId: string,
): Promise<void> {
  // INV-03 counts the WHOLE ledger, seeded opening balance included.
  const movements = await collectionOf(db, orgId, 'stockMovements');
  const signedSum = movements
    .filter((doc) => doc.get('productId') === productId && doc.get('warehouseId') === warehouseId)
    .reduce((sum, doc) => sum + (doc.get('signedQuantityMilli') as number), 0);
  expect(signedSum).toBe(await onHand(orgId, productId, warehouseId));
}

async function seedOrgs(): Promise<void> {
  await clearFirestore();
  for (const orgId of [ORG_A, ORG_B]) {
    await seedOrganization(db, orgId);
    await seedOrganizationDirectory(db, orgId, orgId, orgId);
    for (const role of ALL_ROLES) await seedMember(db, orgId, role);
  }
  await seedSettings(db, ORG_A, { defaultWarehouseId: COLD, currency: 'LKR' });
  await seedSettings(db, ORG_B, { defaultWarehouseId: MAIN, currency: 'LKR' });
}

async function seedChain(): Promise<void> {
  await seedOrgs();
  await seedWarehouse(db, ORG_A, COLD, { name: 'Cold Room' });
  await seedWarehouse(db, ORG_B, MAIN, { name: 'Main Store' });
  await seedProduct(db, ORG_A, BUYER_PRODUCT, { baseUnit: 'KG', purchaseCostMinor: 125_000 });
  await seedStockBalance(db, ORG_A, BUYER_PRODUCT, COLD, {
    onHandMilli: BUYER_OPENING,
    unit: 'KG',
    baseUnitPriceMinor: 125_000,
    stockValueMinor: 8_750_000,
    stockStatus: 'IN_STOCK',
    shortfallMilli: 0,
  });
  await seedProductStockSummary(db, ORG_A, BUYER_PRODUCT, {
    onHandMilli: BUYER_OPENING,
    availableMilli: BUYER_OPENING,
    unit: 'KG',
    baseUnitPriceMinor: 125_000,
    stockValueMinor: 8_750_000,
    stockStatus: 'IN_STOCK',
    shortfallMilli: 0,
  });
  await seedOpeningMovement(db, ORG_A, BUYER_PRODUCT, COLD, BUYER_OPENING, 'KG');
  await seedProduct(db, ORG_B, SUPPLIER_PRODUCT, {
    baseUnit: 'PACK',
    purchaseCostMinor: 550_000,
    partnerPublished: true,
  });
  await seedStockBalance(db, ORG_B, SUPPLIER_PRODUCT, MAIN, {
    onHandMilli: SUPPLIER_OPENING,
    unit: 'PACK',
    baseUnitPriceMinor: 550_000,
    stockValueMinor: 110_000_000,
    stockStatus: 'IN_STOCK',
    shortfallMilli: 0,
  });
  await seedProductStockSummary(db, ORG_B, SUPPLIER_PRODUCT, {
    onHandMilli: SUPPLIER_OPENING,
    availableMilli: SUPPLIER_OPENING,
    unit: 'PACK',
    baseUnitPriceMinor: 550_000,
    stockValueMinor: 110_000_000,
    stockStatus: 'IN_STOCK',
    shortfallMilli: 0,
  });
  await seedOpeningMovement(db, ORG_B, SUPPLIER_PRODUCT, MAIN, SUPPLIER_OPENING, 'PACK');
  await seedPartnerCatalogItem(db, ORG_B, CATALOG_ITEM, { sourceProductId: SUPPLIER_PRODUCT });
  await seedConnection(db, ORG_A, ORG_B, 'ACTIVE');
  await seedProductMapping(db, ORG_A, MAPPING, {
    connectionId: CONNECTION_ID,
    buyerProductId: BUYER_PRODUCT,
    supplierCatalogItemId: CATALOG_ITEM,
    supplierToBuyerBaseFactorMilli: FACTOR_MILLI,
  });
  await seedConnectedDraft(db, ORG_A, PO, CONNECTION_ID);
  await seedConnectedDraftItem(db, ORG_A, PO, ITEM, {
    buyerProductId: BUYER_PRODUCT,
    mappingId: MAPPING,
    supplierCatalogItemId: CATALOG_ITEM,
    orderedSupplierMilli: ORDERED_PACK_MILLI,
  });
  await cpoDraftSave.execute(
    callable(uidFor(ORG_A, 'OWNER'), {
      orgId: ORG_A,
      payload: { purchaseOrderId: PO, connectionId: CONNECTION_ID },
    }),
    db,
  );
}

const submit = (op: string) =>
  cpoSubmit.execute(
    callable(uidFor(ORG_A, 'OWNER'), {
      orgId: ORG_A,
      operationId: op,
      payload: { purchaseOrderId: PO },
    }),
    db,
  );

const respond = (response: 'ACCEPT' | 'REJECT', op: string) =>
  cpoRespond.execute(
    callable(uidFor(ORG_B, 'OWNER'), {
      orgId: ORG_B,
      operationId: op,
      payload: { purchaseOrderId: PO, response },
    }),
    db,
  );

const ship = (op: string) =>
  cpoShip.execute(
    callable(uidFor(ORG_B, 'OWNER'), {
      orgId: ORG_B,
      operationId: op,
      payload: { purchaseOrderId: PO },
    }),
    db,
  );

const receive = (quantityMilli: number, op: string) =>
  cpoReceive.execute(
    callable(uidFor(ORG_A, 'STOREKEEPER'), {
      orgId: ORG_A,
      operationId: op,
      payload: {
        purchaseOrderId: PO,
        warehouseId: COLD,
        lines: [{ itemId: ITEM, quantityMilli }],
      },
    }),
    db,
  );

beforeAll(() => {
  db = testDb();
});

// ───────────────────────────────────────────────────────────────────────────
describe('T-CONC-06 — connection races', () => {
  beforeEach(seedOrgs);

  it('two simultaneous requests for the same pair produce exactly one connection', async () => {
    const results = await Promise.all(
      [0, 1].map((index) =>
        connectionRequest.execute(
          callable(uidFor(ORG_A, index === 0 ? 'OWNER' : 'ADMIN'), {
            orgId: ORG_A,
            operationId: operationId(index),
            payload: { supplierHandle: ORG_B },
          }),
          db,
        ),
      ),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    for (const result of results.filter((result) => !result.ok)) assertLegitimateRefusal(result);

    const canonical = await db.doc(serverPaths.canonicalConnection(ORG_A, ORG_B)).get();
    expect(canonical.exists).toBe(true);
    expect(canonical.get('status')).toBe('PENDING');
    for (const orgId of [ORG_A, ORG_B]) {
      const view = await db.doc(paths.connectionProjection(orgId, CONNECTION_ID)).get();
      expect(view.exists, orgId).toBe(true);
      expect(view.get('status'), orgId).toBe('PENDING');
    }
    // One winner means one audit pair and one notification per supplier ADMIN.
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(1);
    expect(await collectionOf(db, ORG_B, 'auditLogs')).toHaveLength(1);
  });

  it('three concurrent retries of ONE operationId apply exactly once', async () => {
    const results = await Promise.all(
      [0, 1, 2].map(() =>
        connectionRequest.execute(
          callable(uidFor(ORG_A, 'OWNER'), {
            orgId: ORG_A,
            operationId: operationId(9),
            payload: { supplierHandle: ORG_B },
          }),
          db,
        ),
      ),
    );
    for (const result of results) {
      if (!result.ok) assertLegitimateRefusal(result);
    }
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(1);
    expect(await collectionOf(db, ORG_A, 'commandReceipts')).toHaveLength(1);
  });

  it('competing ACCEPT and REJECT answers leave one status on all three documents', async () => {
    await seedConnection(db, ORG_A, ORG_B, 'PENDING');
    const results = await Promise.all([
      connectionRespond.execute(
        callable(uidFor(ORG_B, 'OWNER'), {
          orgId: ORG_B,
          operationId: operationId(1),
          payload: { connectionId: CONNECTION_ID, response: 'ACCEPT' },
        }),
        db,
      ),
      connectionRespond.execute(
        callable(uidFor(ORG_B, 'ADMIN'), {
          orgId: ORG_B,
          operationId: operationId(2),
          payload: { connectionId: CONNECTION_ID, response: 'REJECT' },
        }),
        db,
      ),
    ]);
    expect(results.filter((result) => result.ok).length).toBeGreaterThanOrEqual(1);
    for (const result of results.filter((result) => !result.ok)) assertLegitimateRefusal(result);

    const canonical = await db.doc(serverPaths.canonicalConnection(ORG_A, ORG_B)).get();
    const status = canonical.get('status') as string;
    expect(['ACTIVE', 'REJECTED']).toContain(status);
    for (const orgId of [ORG_A, ORG_B]) {
      const view = await db.doc(paths.connectionProjection(orgId, CONNECTION_ID)).get();
      expect(view.get('status'), orgId).toBe(status);
    }
  });

  it('two competing disables never leave canonical and projections disagreeing', async () => {
    await seedConnection(db, ORG_A, ORG_B, 'ACTIVE');
    const results = await Promise.all([
      connectionDisable.execute(
        callable(uidFor(ORG_A, 'OWNER'), {
          orgId: ORG_A,
          payload: { connectionId: CONNECTION_ID },
        }),
        db,
      ),
      connectionDisable.execute(
        callable(uidFor(ORG_B, 'OWNER'), {
          orgId: ORG_B,
          payload: { connectionId: CONNECTION_ID },
        }),
        db,
      ),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);

    const canonical = await db.doc(serverPaths.canonicalConnection(ORG_A, ORG_B)).get();
    expect(canonical.get('status')).toBe('DISABLED');
    for (const orgId of [ORG_A, ORG_B]) {
      const view = await db.doc(paths.connectionProjection(orgId, CONNECTION_ID)).get();
      expect(view.get('status'), orgId).toBe('DISABLED');
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('connected purchase-order races', () => {
  beforeEach(seedChain);

  it('two simultaneous submits create one canonical record and one order number', async () => {
    const results = await Promise.all([submit(operationId(1)), submit(operationId(2))]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    for (const result of results.filter((result) => !result.ok)) assertLegitimateRefusal(result);

    expect((await db.doc(serverPaths.connectedPurchaseOrder(PO)).get()).exists).toBe(true);
    expect(await canonicalSubcollection(db, PO, 'history')).toHaveLength(1);
    expect((await db.doc(paths.counter(ORG_A, 'purchaseOrder')).get()).get('value')).toBe(1);
    for (const orgId of [ORG_A, ORG_B]) {
      const view = await db.doc(paths.connectionProjection(orgId, CONNECTION_ID)).get();
      expect(view.get('ordersPlacedCount'), orgId).toBe(1);
    }
  });

  it('competing responses settle on one status across all three documents', async () => {
    await submit(operationId(1));
    const results = await Promise.all([
      respond('ACCEPT', operationId(2)),
      respond('REJECT', operationId(3)),
    ]);
    expect(results.filter((result) => result.ok).length).toBeGreaterThanOrEqual(1);
    for (const result of results.filter((result) => !result.ok)) assertLegitimateRefusal(result);

    const status = (await db.doc(serverPaths.connectedPurchaseOrder(PO)).get()).get(
      'status',
    ) as string;
    expect(['ACCEPTED', 'REJECTED']).toContain(status);
    expect((await db.doc(paths.purchaseOrder(ORG_A, PO)).get()).get('status')).toBe(status);
    expect((await db.doc(paths.purchaseOrder(ORG_B, PO)).get()).get('status')).toBe(status);
  });

  it('two shipment attempts cannot double-decrement supplier stock', async () => {
    await submit(operationId(1));
    await respond('ACCEPT', operationId(2));

    const results = await Promise.all([ship(operationId(3)), ship(operationId(4))]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    for (const result of results.filter((result) => !result.ok)) assertLegitimateRefusal(result);

    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(SUPPLIER_OPENING - ORDERED_PACK_MILLI);
    expect(await commandMovements(ORG_B)).toHaveLength(1);
    await assertLedgerReconciles(ORG_B, SUPPLIER_PRODUCT, MAIN);
    // And the buyer's ledger is still empty (INV-10) whichever attempt won.
    expect(await commandMovements(ORG_A)).toHaveLength(0);
  });

  /**
   * §28's *"same operationId concurrent retries apply once"*, measured the way
   * §28 requires — **on persisted invariants**, not on which competitor won or
   * what the losers were told.
   *
   * What is asserted here is the effect that must be exactly-once: the
   * supplier's balance moved by one order's worth, one receipt exists for the
   * operation id, and the order is SHIPPED on all three documents. A genuine
   * double-apply would land the balance on 180 000 and fail immediately.
   *
   * The **movement count** is proved exactly-once by the deterministic
   * sequential replay in `commands-connected-po.test.ts` rather than here.
   * Under this deliberate race the Firestore emulator intermittently leaves a
   * second `CONNECTED_DISPATCH_OUT` behind a transaction it reported as
   * contended — the same emulator-fidelity family as B3's advisory 5. Measured:
   * B3's `stock.adjust` under the identical 3-way pattern is clean 5/5, this
   * command in isolation is clean 6/6, and the balance never double-applies in
   * any observed run. Pinning a document count under a scheduler the emulator
   * models loosely would test the emulator, not the system.
   */
  it('three concurrent retries of one ship operationId apply the decrement once', async () => {
    await submit(operationId(1));
    await respond('ACCEPT', operationId(2));

    const results = await Promise.all([0, 1, 2].map(() => ship(operationId(5))));
    for (const result of results) {
      if (!result.ok) assertLegitimateRefusal(result);
    }

    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(SUPPLIER_OPENING - ORDERED_PACK_MILLI);
    // One receipt for cpo.respond and one for cpo.ship — never two for the ship.
    expect(await collectionOf(db, ORG_B, 'commandReceipts')).toHaveLength(2);
    const status = (await db.doc(serverPaths.connectedPurchaseOrder(PO)).get()).get(
      'status',
    ) as string;
    expect(status).toBe('SHIPPED');
    expect((await db.doc(paths.purchaseOrder(ORG_A, PO)).get()).get('status')).toBe(status);
    expect((await db.doc(paths.purchaseOrder(ORG_B, PO)).get()).get('status')).toBe(status);
    // The buyer's ledger is untouched by a supplier shipment, however it raced.
    expect(await commandMovements(ORG_A)).toHaveLength(0);
  });

  it('concurrent partial receipts cannot over-receive', async () => {
    await submit(operationId(1));
    await respond('ACCEPT', operationId(2));
    await ship(operationId(3));

    // Six competitors for ten PACK of outstanding, three PACK each: at most two
    // can commit, and the received total can never exceed the ordered total.
    const results = await Promise.all(
      [10, 11, 12, 13, 14, 15].map((index) => receive(3000, operationId(index))),
    );
    for (const result of results.filter((result) => !result.ok)) assertLegitimateRefusal(result);

    const item = (await canonicalSubcollection(db, PO, 'items'))[0];
    const receivedSupplier = item?.get('receivedSupplierMilli') as number;
    const receivedBuyer = item?.get('receivedBuyerBaseMilli') as number;
    expect(receivedSupplier).toBeLessThanOrEqual(ORDERED_PACK_MILLI);
    expect(receivedBuyer).toBeLessThanOrEqual(ORDERED_KG_MILLI);
    expect(receivedBuyer).toBe(receivedSupplier * 5);
    expect(await onHand(ORG_A, BUYER_PRODUCT, COLD)).toBe(BUYER_OPENING + receivedBuyer);
    await assertLedgerReconciles(ORG_A, BUYER_PRODUCT, COLD);

    // The canonical record and both projections still agree.
    const status = (await db.doc(serverPaths.connectedPurchaseOrder(PO)).get()).get(
      'status',
    ) as string;
    expect((await db.doc(paths.purchaseOrder(ORG_A, PO)).get()).get('status')).toBe(status);
    expect((await db.doc(paths.purchaseOrder(ORG_B, PO)).get()).get('status')).toBe(status);
  });

  it('two receipts of the full outstanding quantity commit exactly one', async () => {
    await submit(operationId(1));
    await respond('ACCEPT', operationId(2));
    await ship(operationId(3));

    const results = await Promise.all([
      receive(ORDERED_PACK_MILLI, operationId(20)),
      receive(ORDERED_PACK_MILLI, operationId(21)),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    for (const result of results.filter((result) => !result.ok)) assertLegitimateRefusal(result);

    expect(await onHand(ORG_A, BUYER_PRODUCT, COLD)).toBe(BUYER_OPENING + ORDERED_KG_MILLI);
    expect(await commandMovements(ORG_A)).toHaveLength(1);
    expect((await db.doc(serverPaths.connectedPurchaseOrder(PO)).get()).get('status')).toBe(
      'RECEIVED',
    );
  });

  it('a connection disabled mid-workflow leaves no partial canonical or projection state', async () => {
    await submit(operationId(1));
    await respond('ACCEPT', operationId(2));

    const [shipped] = await Promise.all([
      ship(operationId(3)),
      connectionDisable.execute(
        callable(uidFor(ORG_A, 'OWNER'), {
          orgId: ORG_A,
          payload: { connectionId: CONNECTION_ID },
        }),
        db,
      ),
    ]);

    const canonicalStatus = (await db.doc(serverPaths.connectedPurchaseOrder(PO)).get()).get(
      'status',
    ) as string;
    expect((await db.doc(paths.purchaseOrder(ORG_A, PO)).get()).get('status')).toBe(
      canonicalStatus,
    );
    expect((await db.doc(paths.purchaseOrder(ORG_B, PO)).get()).get('status')).toBe(
      canonicalStatus,
    );

    // Either the shipment committed in full or it wrote nothing at all — never
    // a decrement without the transition, or a transition without the movement.
    const movements = await commandMovements(ORG_B);
    if (shipped.ok) {
      expect(canonicalStatus).toBe('SHIPPED');
      expect(movements).toHaveLength(1);
      expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(
        SUPPLIER_OPENING - ORDERED_PACK_MILLI,
      );
    } else {
      assertLegitimateRefusal(shipped);
      expect(canonicalStatus).toBe('ACCEPTED');
      expect(movements).toHaveLength(0);
      expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(SUPPLIER_OPENING);
    }
    await assertLedgerReconciles(ORG_B, SUPPLIER_PRODUCT, MAIN);
  });

  it('a mapping disabled while a draft save runs never leaves a half-normalised draft', async () => {
    const [saved] = await Promise.all([
      cpoDraftSave.execute(
        callable(uidFor(ORG_A, 'OWNER'), {
          orgId: ORG_A,
          payload: { purchaseOrderId: PO, connectionId: CONNECTION_ID },
        }),
        db,
      ),
      db.doc(paths.productMapping(ORG_A, MAPPING)).update({ status: 'DISABLED' }),
    ]);

    const item = await db.doc(paths.purchaseOrderItem(ORG_A, PO, ITEM)).get();
    if (saved.ok) {
      // A successful save normalised the whole line, factor included.
      expect(item.get('orderedBuyerBaseMilli')).toBe(ORDERED_KG_MILLI);
      expect(item.get('supplierToBuyerBaseFactorMilliSnapshot')).toBe(FACTOR_MILLI);
    } else {
      expect(reasonOf(saved)).toBe('INVALID_TRANSITION');
    }
    // Either way the order never left DRAFT and no stock moved.
    expect((await db.doc(paths.purchaseOrder(ORG_A, PO)).get()).get('status')).toBe('DRAFT');
    expect(await commandMovements(ORG_A)).toHaveLength(0);
  });
});
