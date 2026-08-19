import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cpoCancel,
  cpoDraftSave,
  cpoReceive,
  cpoRespond,
  cpoShip,
  cpoSubmit,
} from '../../functions/src/commands/connected-po.js';
import { paths } from '../../packages/shared/src/paths.js';
import { ConnectedPurchaseOrderSchema } from '../../packages/shared/src/schemas/network.js';
import { PurchaseOrderSchema } from '../../packages/shared/src/schemas/procurement.js';
import { serverPaths } from '../../packages/shared/src/server/paths.js';
import {
  callable,
  canonicalSubcollection,
  clearFirestore,
  collectionOf,
  connectionIdFor,
  notificationsOf,
  ORG_A,
  ORG_B,
  seedConnectedDraft,
  seedConnectedDraftItem,
  seedConnection,
  seedMember,
  seedOpeningMovement,
  seedOrganization,
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

let db: Firestore;

/**
 * `C-34`, `C-27` … `C-31` — DB-06 §3.4/§3.5/§4, DB-07 §9, `INV-08` … `INV-12`,
 * `INV-19`.
 *
 * The fixture is the canonical chain of DB-08 §4 steps 4–6, in its own units:
 * the buyer orders **10 PACK** of the supplier's *Chicken Breast 5 KG Pack*,
 * which at `1 PACK = 5 KG` is **50 KG** of the buyer's *Chicken Breast*; the
 * supplier ships all ten from 200 PACK, leaving 190; the buyer receives 8 PACK
 * (40 KG) and then 2 PACK (10 KG). Every quantity below is integer milli.
 */

const CONNECTION_ID = connectionIdFor(ORG_A, ORG_B);
const BUYER_PRODUCT = 'product-chicken';
const SUPPLIER_PRODUCT = 'product-chicken-pack';
const CATALOG_ITEM = 'catalog-chicken';
const MAPPING = 'mapping-chicken';
const PO = 'cpo-chicken';
const ITEM = 'item-chicken';
const COLD = 'warehouse-cold';
const MAIN = 'warehouse-main';

const ORDERED_PACK_MILLI = 10_000; // 10 PACK
const FACTOR_MILLI = 5000; // 1 PACK = 5 KG
const ORDERED_KG_MILLI = 50_000; // 50 KG
const SUPPLIER_OPENING = 200_000; // 200 PACK
const BUYER_OPENING = 70_000; // 70 KG, the chain's balance before step 5
const BUYER_COST_MINOR = 125_000; // LKR 1,250.00 per KG

const OP = {
  submit: '11111111-1111-4111-8111-111111111111',
  respond: '22222222-2222-4222-8222-222222222222',
  ship: '33333333-3333-4333-8333-333333333333',
  receiveOne: '44444444-4444-4444-8444-444444444444',
  receiveTwo: '55555555-5555-4555-8555-555555555555',
} as const;

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

function dataOf(result: { ok: boolean; data?: unknown }): Record<string, unknown> {
  return (result.data ?? {}) as Record<string, unknown>;
}

async function seedBase(): Promise<void> {
  await clearFirestore();
  for (const orgId of [ORG_A, ORG_B]) {
    await seedOrganization(db, orgId);
    for (const role of ALL_ROLES) await seedMember(db, orgId, role);
  }
  await seedSettings(db, ORG_A, { defaultWarehouseId: COLD, currency: 'LKR' });
  await seedSettings(db, ORG_B, { defaultWarehouseId: MAIN, currency: 'LKR' });
  await seedWarehouse(db, ORG_A, COLD, { name: 'Cold Room' });
  await seedWarehouse(db, ORG_A, MAIN, { name: 'Main Store' });
  await seedWarehouse(db, ORG_B, MAIN, { name: 'Main Store' });

  await seedProduct(db, ORG_A, BUYER_PRODUCT, {
    name: 'Chicken Breast',
    internalSku: 'MEAT-001',
    internalSkuNormalized: 'MEAT-001',
    baseUnit: 'KG',
    purchaseCostMinor: BUYER_COST_MINOR,
    currency: 'LKR',
    minimumStockMilli: 20_000,
  });
  await seedStockBalance(db, ORG_A, BUYER_PRODUCT, COLD, {
    onHandMilli: BUYER_OPENING,
    unit: 'KG',
    baseUnitPriceMinor: BUYER_COST_MINOR,
    stockValueMinor: 8_750_000,
    stockStatus: 'IN_STOCK',
    minimumStockMilli: 20_000,
    shortfallMilli: 0,
  });
  await seedProductStockSummary(db, ORG_A, BUYER_PRODUCT, {
    onHandMilli: BUYER_OPENING,
    availableMilli: BUYER_OPENING,
    unit: 'KG',
    baseUnitPriceMinor: BUYER_COST_MINOR,
    stockValueMinor: 8_750_000,
    stockStatus: 'IN_STOCK',
    minimumStockMilli: 20_000,
    shortfallMilli: 0,
  });

  await seedOpeningMovement(db, ORG_A, BUYER_PRODUCT, COLD, BUYER_OPENING, 'KG');

  await seedProduct(db, ORG_B, SUPPLIER_PRODUCT, {
    name: 'Chicken Breast 5 KG Pack',
    internalSku: 'FF-CHK-05',
    internalSkuNormalized: 'FF-CHK-05',
    baseUnit: 'PACK',
    purchaseCostMinor: 550_000,
    currency: 'LKR',
    minimumStockMilli: 20_000,
    partnerPublished: true,
  });
  await seedStockBalance(db, ORG_B, SUPPLIER_PRODUCT, MAIN, {
    onHandMilli: SUPPLIER_OPENING,
    unit: 'PACK',
    baseUnitPriceMinor: 550_000,
    stockValueMinor: 110_000_000,
    stockStatus: 'IN_STOCK',
    minimumStockMilli: 20_000,
    shortfallMilli: 0,
  });
  await seedProductStockSummary(db, ORG_B, SUPPLIER_PRODUCT, {
    onHandMilli: SUPPLIER_OPENING,
    availableMilli: SUPPLIER_OPENING,
    unit: 'PACK',
    baseUnitPriceMinor: 550_000,
    stockValueMinor: 110_000_000,
    stockStatus: 'IN_STOCK',
    minimumStockMilli: 20_000,
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
}

// ─── the chain, as reusable steps ───────────────────────────────────────────

const draftSave = (orgId = ORG_A, role: (typeof ALL_ROLES)[number] = 'PROCUREMENT_MANAGER') =>
  cpoDraftSave.execute(
    callable(uidFor(orgId, role), {
      orgId,
      payload: { purchaseOrderId: PO, connectionId: CONNECTION_ID },
    }),
    db,
  );

const submit = (
  orgId = ORG_A,
  role: (typeof ALL_ROLES)[number] = 'PROCUREMENT_MANAGER',
  op: string = OP.submit,
) =>
  cpoSubmit.execute(
    callable(uidFor(orgId, role), {
      orgId,
      operationId: op,
      payload: { purchaseOrderId: PO },
    }),
    db,
  );

const respond = (
  response: 'ACCEPT' | 'REJECT' = 'ACCEPT',
  orgId = ORG_B,
  role: (typeof ALL_ROLES)[number] = 'PROCUREMENT_MANAGER',
  op: string = OP.respond,
) =>
  cpoRespond.execute(
    callable(uidFor(orgId, role), {
      orgId,
      operationId: op,
      payload: { purchaseOrderId: PO, response },
    }),
    db,
  );

const ship = (
  orgId = ORG_B,
  role: (typeof ALL_ROLES)[number] = 'PROCUREMENT_MANAGER',
  op: string = OP.ship,
) =>
  cpoShip.execute(
    callable(uidFor(orgId, role), { orgId, operationId: op, payload: { purchaseOrderId: PO } }),
    db,
  );

const receive = (
  quantityMilli: number,
  op: string,
  orgId = ORG_A,
  role: (typeof ALL_ROLES)[number] = 'STOREKEEPER',
  warehouseId = COLD,
) =>
  cpoReceive.execute(
    callable(uidFor(orgId, role), {
      orgId,
      operationId: op,
      payload: { purchaseOrderId: PO, warehouseId, lines: [{ itemId: ITEM, quantityMilli }] },
    }),
    db,
  );

const cancel = (orgId = ORG_A, role: (typeof ALL_ROLES)[number] = 'PROCUREMENT_MANAGER') =>
  cpoCancel.execute(callable(uidFor(orgId, role), { orgId, payload: { purchaseOrderId: PO } }), db);

async function canonicalOrder(): Promise<FirebaseFirestore.DocumentSnapshot> {
  return db.doc(serverPaths.connectedPurchaseOrder(PO)).get();
}

async function statusEverywhere(): Promise<readonly string[]> {
  return [
    (await canonicalOrder()).get('status') as string,
    (await db.doc(paths.purchaseOrder(ORG_A, PO)).get()).get('status') as string,
    (await db.doc(paths.purchaseOrder(ORG_B, PO)).get()).get('status') as string,
  ];
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

/** `INV-03` — the signed sum of a store room's movements equals its balance. */
async function assertLedgerReconciles(
  orgId: string,
  productId: string,
  warehouseId: string,
): Promise<void> {
  // INV-03 counts the WHOLE ledger, seeded opening balance included.
  const movements = await collectionOf(db, orgId, 'stockMovements');
  const total = movements
    .filter((doc) => doc.get('productId') === productId && doc.get('warehouseId') === warehouseId)
    .reduce((sum, doc) => sum + (doc.get('signedQuantityMilli') as number), 0);
  const balance = await onHand(orgId, productId, warehouseId);
  expect(total, `INV-03 ${orgId}/${productId}/${warehouseId}`).toBe(balance);
}

beforeAll(() => {
  db = testDb();
});
beforeEach(seedBase);

// ───────────────────────────────────────────────────────────────────────────
describe('C-34 cpo.draftSave', () => {
  it('normalises the draft server-side and derives the buyer quantity from the live mapping', async () => {
    const result = await draftSave();
    expect(result.ok).toBe(true);

    const item = await db.doc(paths.purchaseOrderItem(ORG_A, PO, ITEM)).get();
    expect(item.get('orderedSupplierMilli')).toBe(ORDERED_PACK_MILLI);
    expect(item.get('orderedBuyerBaseMilli')).toBe(ORDERED_KG_MILLI);
    expect(item.get('supplierToBuyerBaseFactorMilliSnapshot')).toBe(FACTOR_MILLI);
    expect(item.get('supplierOrderUnitSnapshot')).toBe('PACK');
    expect(item.get('buyerBaseUnitSnapshot')).toBe('KG');
    // 10 000 milli PACK × 600 000 minor / 1000
    expect(item.get('lineTotalMinor')).toBe(6_000_000);

    const order = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(order.get('status')).toBe('DRAFT');
    expect(order.get('totalMinor')).toBe(6_000_000);
    expect(order.get('isProjection')).toBe(false);
  });

  it('writes no receipt, no audit and no canonical record', async () => {
    await draftSave();
    expect(await collectionOf(db, ORG_A, 'commandReceipts')).toHaveLength(0);
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(0);
    expect((await canonicalOrder()).exists).toBe(false);
    // A draft lives only in the buyer's tenant until submission.
    expect((await db.doc(paths.purchaseOrder(ORG_B, PO)).get()).exists).toBe(false);
  });

  it('mutates no stock in either organization', async () => {
    await draftSave();
    expect(await onHand(ORG_A, BUYER_PRODUCT, COLD)).toBe(BUYER_OPENING);
    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(SUPPLIER_OPENING);
    for (const orgId of [ORG_A, ORG_B]) {
      expect(await commandMovements(orgId)).toHaveLength(0);
    }
  });

  it('is last-write-wins: a changed quantity re-derives the buyer quantity and the total', async () => {
    await draftSave();
    await db.doc(paths.purchaseOrderItem(ORG_A, PO, ITEM)).update({ orderedSupplierMilli: 4000 });
    await draftSave();
    const item = await db.doc(paths.purchaseOrderItem(ORG_A, PO, ITEM)).get();
    expect(item.get('orderedBuyerBaseMilli')).toBe(20_000);
    expect((await db.doc(paths.purchaseOrder(ORG_A, PO)).get()).get('totalMinor')).toBe(2_400_000);
  });

  it('refuses a disabled mapping, a mapping from another connection and a non-ACTIVE connection', async () => {
    await db.doc(paths.productMapping(ORG_A, MAPPING)).update({ status: 'DISABLED' });
    expect(reasonOf(await draftSave())).toBe('INVALID_TRANSITION');

    await db.doc(paths.productMapping(ORG_A, MAPPING)).update({
      status: 'VERIFIED',
      connectionId: 'some-other__connection',
    });
    expect(reasonOf(await draftSave())).toBe('CROSS_TENANT_REFERENCE');

    await db.doc(paths.productMapping(ORG_A, MAPPING)).update({ connectionId: CONNECTION_ID });
    await seedConnection(db, ORG_A, ORG_B, 'DISABLED');
    expect(reasonOf(await draftSave())).toBe('CONNECTION_NOT_ACTIVE');
  });

  it('the SUPPLIER cannot save the buyer’s draft', async () => {
    const result = await draftSave(ORG_B, 'OWNER');
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('CROSS_TENANT_REFERENCE');
  });

  it('refuses to touch a PRIVATE order, whose supplierKind is immutable', async () => {
    await db.doc(paths.purchaseOrder(ORG_A, PO)).update({ supplierKind: 'PRIVATE' });
    const result = await draftSave();
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('INVALID_TRANSITION');
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('C-27 cpo.submit', () => {
  beforeEach(async () => {
    await draftSave();
  });

  it('creates the canonical record and both projections with one history row each', async () => {
    const result = await submit();
    expect(result.ok).toBe(true);
    expect(dataOf(result).orderNumber).toMatch(/^CPO-\d{4}-001$/);

    expect(await statusEverywhere()).toEqual(['SUBMITTED', 'SUBMITTED', 'SUBMITTED']);

    const record = await canonicalOrder();
    expect(record.get('buyerOrgId')).toBe(ORG_A);
    expect(record.get('supplierOrgId')).toBe(ORG_B);
    expect(record.get('totalMinor')).toBe(6_000_000);

    // Each projection names the OTHER organization and carries its own viewRole.
    const buyerView = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(buyerView.get('viewRole')).toBe('BUYER');
    expect(buyerView.get('counterpartyOrgId')).toBe(ORG_B);
    expect(buyerView.get('isProjection')).toBe(true);
    const supplierView = await db.doc(paths.purchaseOrder(ORG_B, PO)).get();
    expect(supplierView.get('viewRole')).toBe('SUPPLIER');
    expect(supplierView.get('counterpartyOrgId')).toBe(ORG_A);

    expect(await canonicalSubcollection(db, PO, 'items')).toHaveLength(1);
    expect(await canonicalSubcollection(db, PO, 'history')).toHaveLength(1);
    const history = (await canonicalSubcollection(db, PO, 'history'))[0];
    expect(history?.get('fromStatus')).toBe('DRAFT');
    expect(history?.get('toStatus')).toBe('SUBMITTED');
    expect(history?.get('operationId')).toBe(OP.submit);
  });

  it('freezes identical line snapshots on all three documents (INV-09, INV-19)', async () => {
    await submit();
    const canonicalItem = (await canonicalSubcollection(db, PO, 'items'))[0];
    const buyerItem = await db.doc(paths.purchaseOrderItem(ORG_A, PO, ITEM)).get();
    const supplierItem = await db.doc(paths.purchaseOrderItem(ORG_B, PO, ITEM)).get();
    for (const item of [canonicalItem, buyerItem, supplierItem]) {
      expect(item?.get('orderedSupplierMilli')).toBe(ORDERED_PACK_MILLI);
      expect(item?.get('orderedBuyerBaseMilli')).toBe(ORDERED_KG_MILLI);
      expect(item?.get('supplierToBuyerBaseFactorMilliSnapshot')).toBe(FACTOR_MILLI);
      expect(item?.get('receivedSupplierMilli')).toBe(0);
    }

    // Renaming the product afterwards leaves the frozen order untouched.
    await db.doc(paths.product(ORG_A, BUYER_PRODUCT)).update({ name: 'Renamed Later' });
    const after = await db.doc(paths.purchaseOrderItem(ORG_A, PO, ITEM)).get();
    expect(after.get('buyerProductNameSnapshot')).toBe('Chicken Breast');
  });

  it('increments DV-12 on both connection projections and the buyer’s counter', async () => {
    await submit();
    for (const orgId of [ORG_A, ORG_B]) {
      const view = await db.doc(paths.connectionProjection(orgId, CONNECTION_ID)).get();
      expect(view.get('ordersPlacedCount'), orgId).toBe(1);
    }
    const counter = await db.doc(paths.counter(ORG_A, 'purchaseOrder')).get();
    expect(counter.get('value')).toBe(1);
  });

  it('audits in both organizations and notifies the supplier’s PO_WRITERS', async () => {
    await submit();
    for (const orgId of [ORG_A, ORG_B]) {
      const audits = await collectionOf(db, orgId, 'auditLogs');
      expect(audits, orgId).toHaveLength(1);
      expect(audits[0]?.get('action')).toBe('cpo.submit');
      expect(audits[0]?.get('organizationId')).toBe(orgId);
    }
    for (const role of ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER'] as const) {
      const notes = await notificationsOf(db, uidFor(ORG_B, role));
      expect(notes, role).toHaveLength(1);
      expect(notes[0]?.get('type')).toBe('CPO_SUBMITTED');
      expect(notes[0]?.get('organizationId')).toBe(ORG_B);
    }
    expect(await notificationsOf(db, uidFor(ORG_B, 'VIEWER'))).toHaveLength(0);
  });

  it('moves no stock', async () => {
    await submit();
    expect(await onHand(ORG_A, BUYER_PRODUCT, COLD)).toBe(BUYER_OPENING);
    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(SUPPLIER_OPENING);
  });

  it('refuses an empty order, a stale mapping and an unpublished catalog item', async () => {
    await db.doc(paths.purchaseOrderItem(ORG_A, PO, ITEM)).delete();
    expect(reasonOf(await submit())).toBe('INVALID_TRANSITION');

    await seedConnectedDraftItem(db, ORG_A, PO, ITEM, {
      buyerProductId: BUYER_PRODUCT,
      mappingId: MAPPING,
      supplierCatalogItemId: CATALOG_ITEM,
      orderedSupplierMilli: ORDERED_PACK_MILLI,
      supplierToBuyerBaseFactorMilliSnapshot: FACTOR_MILLI,
    });
    await db.doc(paths.partnerCatalogItem(ORG_B, CATALOG_ITEM)).update({ published: false });
    expect(reasonOf(await submit())).toBe('CATALOG_ITEM_NOT_PUBLISHED');
    expect((await canonicalOrder()).exists).toBe(false);
  });

  it('is buyer-side, PO_WRITERS, and idempotent', async () => {
    expect(reasonOf(await submit(ORG_B, 'OWNER'))).toBe('CROSS_TENANT_REFERENCE');
    expect(reasonOf(await submit(ORG_A, 'STOREKEEPER'))).toBe('ROLE_NOT_PERMITTED');

    const first = await submit();
    const replay = await submit();
    expect(replay.ok).toBe(true);
    expect(dataOf(replay).orderNumber).toBe(dataOf(first).orderNumber);
    expect(await canonicalSubcollection(db, PO, 'history')).toHaveLength(1);
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(1);
    expect((await db.doc(paths.counter(ORG_A, 'purchaseOrder')).get()).get('value')).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('C-28 cpo.respond', () => {
  beforeEach(async () => {
    await draftSave();
    await submit();
  });

  it('the supplier accepts, and all three documents move together', async () => {
    const result = await respond('ACCEPT');
    expect(result.ok).toBe(true);
    expect(await statusEverywhere()).toEqual(['ACCEPTED', 'ACCEPTED', 'ACCEPTED']);
    expect((await canonicalOrder()).get('acceptedAt')).toBeDefined();
    expect(await canonicalSubcollection(db, PO, 'history')).toHaveLength(2);
  });

  it('the supplier rejects, and REJECTED is terminal', async () => {
    await respond('REJECT');
    expect(await statusEverywhere()).toEqual(['REJECTED', 'REJECTED', 'REJECTED']);
    expect(reasonOf(await ship())).toBe('INVALID_TRANSITION');
    expect(reasonOf(await cancel())).toBe('INVALID_TRANSITION');
  });

  it('the BUYER cannot answer its own order — denied by side', async () => {
    const result = await respond('ACCEPT', ORG_A, 'PROCUREMENT_MANAGER');
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('CROSS_TENANT_REFERENCE');
    expect(await statusEverywhere()).toEqual(['SUBMITTED', 'SUBMITTED', 'SUBMITTED']);
  });

  it('moves no stock and notifies the buyer’s PO_WRITERS', async () => {
    await respond('ACCEPT');
    expect(await onHand(ORG_A, BUYER_PRODUCT, COLD)).toBe(BUYER_OPENING);
    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(SUPPLIER_OPENING);
    const notes = await notificationsOf(db, uidFor(ORG_A, 'PROCUREMENT_MANAGER'));
    expect(notes).toHaveLength(1);
    expect(notes[0]?.get('type')).toBe('CPO_RESPONDED');
    expect(notes[0]?.get('organizationId')).toBe(ORG_A);
  });

  it('is idempotent and refuses a second answer with a fresh operationId', async () => {
    await respond('ACCEPT');
    const replay = await respond('ACCEPT');
    expect(replay.ok).toBe(true);
    expect(await canonicalSubcollection(db, PO, 'history')).toHaveLength(2);

    const second = await respond('REJECT', ORG_B, 'OWNER', '66666666-6666-4666-8666-666666666666');
    expect(reasonOf(second)).toBe('INVALID_TRANSITION');
    expect(await statusEverywhere()).toEqual(['ACCEPTED', 'ACCEPTED', 'ACCEPTED']);
  });

  it('a connection disabled after submission blocks the response (ATTACK-09)', async () => {
    await seedConnection(db, ORG_A, ORG_B, 'DISABLED');
    const result = await respond('ACCEPT');
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('CONNECTION_NOT_ACTIVE');
    expect(await statusEverywhere()).toEqual(['SUBMITTED', 'SUBMITTED', 'SUBMITTED']);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('C-29 cpo.ship — the supplier stock event', () => {
  beforeEach(async () => {
    await draftSave();
    await submit();
    await respond('ACCEPT');
  });

  it('decrements SUPPLIER stock only, and leaves the buyer untouched (INV-10)', async () => {
    const result = await ship();
    expect(result.ok).toBe(true);
    expect(dataOf(result).movementCount).toBe(1);
    expect(await statusEverywhere()).toEqual(['SHIPPED', 'SHIPPED', 'SHIPPED']);

    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(SUPPLIER_OPENING - ORDERED_PACK_MILLI);
    const summary = await db.doc(paths.productStockSummary(ORG_B, SUPPLIER_PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(190_000);
    expect(summary.get('stockValueMinor')).toBe(104_500_000);

    // The buyer's ledger learns nothing at SHIPPED.
    expect(await onHand(ORG_A, BUYER_PRODUCT, COLD)).toBe(BUYER_OPENING);
    expect(await commandMovements(ORG_A)).toHaveLength(0);
    await assertLedgerReconciles(ORG_B, SUPPLIER_PRODUCT, MAIN);
  });

  it('writes exactly one CONNECTED_DISPATCH_OUT with the frozen taxonomy', async () => {
    await ship();
    const movements = await commandMovements(ORG_B);
    expect(movements).toHaveLength(1);
    const movement = movements[0];
    expect(movement?.get('movementType')).toBe('CONNECTED_DISPATCH_OUT');
    expect(movement?.get('signedQuantityMilli')).toBe(-ORDERED_PACK_MILLI);
    expect(movement?.get('balanceAfterMilli')).toBe(190_000);
    expect(movement?.get('sourceType')).toBe('CONNECTED_PO');
    expect(movement?.get('sourceId')).toBe(PO);
    expect(movement?.get('warehouseId')).toBe(MAIN);
    expect(movement?.get('unit')).toBe('PACK');
    expect(movement?.get('operationId')).toBe(OP.ship);
    // `movementKind` is derived at render time and never persisted.
    expect(Object.keys(movement?.data() ?? {})).not.toContain('movementKind');
  });

  it('the BUYER cannot ship its own order', async () => {
    const result = await ship(ORG_A, 'PROCUREMENT_MANAGER');
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('CROSS_TENANT_REFERENCE');
    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(SUPPLIER_OPENING);
    expect(await commandMovements(ORG_B)).toHaveLength(0);
  });

  it('ships once, in full — there is no PARTIALLY_SHIPPED and no second shipment', async () => {
    await ship();
    const again = await ship(ORG_B, 'OWNER', '77777777-7777-4777-8777-777777777777');
    expect(again.ok).toBe(false);
    expect(reasonOf(again)).toBe('INVALID_TRANSITION');
    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(190_000);
    expect(await commandMovements(ORG_B)).toHaveLength(1);
  });

  it('refuses insufficient supplier stock with nothing written', async () => {
    await db
      .doc(paths.stockBalance(ORG_B, SUPPLIER_PRODUCT, MAIN))
      .update({ onHandMilli: ORDERED_PACK_MILLI - 1 });
    const result = await ship();
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('INSUFFICIENT_STOCK');
    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(ORDERED_PACK_MILLI - 1);
    expect(await commandMovements(ORG_B)).toHaveLength(0);
    expect(await statusEverywhere()).toEqual(['ACCEPTED', 'ACCEPTED', 'ACCEPTED']);
  });

  it('one short line refuses the WHOLE shipment — all or nothing', async () => {
    await seedProduct(db, ORG_B, 'product-butter-pack', {
      name: 'Butter Block 1 KG',
      baseUnit: 'KG',
      purchaseCostMinor: 260_000,
      partnerPublished: true,
    });
    await seedPartnerCatalogItem(db, ORG_B, 'catalog-butter', {
      partnerSku: 'BTR-1K',
      displayName: 'Butter Block 1 KG',
      orderUnit: 'KG',
      sourceProductId: 'product-butter-pack',
    });
    // No balance at all for the butter product — the second line cannot ship.
    await db.doc(serverPaths.connectedPurchaseOrderItem(PO, 'item-butter')).set({
      itemId: 'item-butter',
      buyerProductId: BUYER_PRODUCT,
      buyerProductNameSnapshot: 'Butter',
      buyerSkuSnapshot: 'DAIR-002',
      buyerBaseUnitSnapshot: 'KG',
      orderedBuyerBaseMilli: 1000,
      receivedBuyerBaseMilli: 0,
      unitPriceMinor: 1000,
      lineTotalMinor: 1000,
      currency: 'LKR',
      mappingId: MAPPING,
      supplierCatalogItemId: 'catalog-butter',
      orderedSupplierMilli: 1000,
      receivedSupplierMilli: 0,
      supplierToBuyerBaseFactorMilliSnapshot: 1000,
    });

    const result = await ship();
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('INSUFFICIENT_STOCK');
    // The line that COULD have shipped did not.
    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(SUPPLIER_OPENING);
    expect(await commandMovements(ORG_B)).toHaveLength(0);
  });

  it('is idempotent — a replay moves no second unit of stock', async () => {
    await ship();
    const replay = await ship();
    expect(replay.ok).toBe(true);
    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(190_000);
    expect(await commandMovements(ORG_B)).toHaveLength(1);
    expect(await canonicalSubcollection(db, PO, 'history')).toHaveLength(3);
  });

  it('notifies the buyer’s RECEIVERS and tells them nothing about the supplier’s store room', async () => {
    await ship();
    const notes = await notificationsOf(db, uidFor(ORG_A, 'STOREKEEPER'));
    expect(notes).toHaveLength(1);
    expect(notes[0]?.get('type')).toBe('CPO_SHIPPED');

    const buyerAudit = (await collectionOf(db, ORG_A, 'auditLogs')).find(
      (doc) => doc.get('action') === 'cpo.ship',
    );
    expect(buyerAudit).toBeDefined();
    expect(buyerAudit?.get('summary')).not.toContain('Main Store');
    // The buyer's projection never learns which store room the goods left.
    const buyerView = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(buyerView.get('receivingWarehouseId')).toBeUndefined();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('C-30 cpo.receive — the buyer stock event and the conversion', () => {
  beforeEach(async () => {
    await draftSave();
    await submit();
    await respond('ACCEPT');
    await ship();
  });

  it('converts supplier order units to buyer base units on a partial receipt', async () => {
    const result = await receive(8000, OP.receiveOne); // 8 PACK
    expect(result.ok).toBe(true);
    expect(await statusEverywhere()).toEqual([
      'PARTIALLY_RECEIVED',
      'PARTIALLY_RECEIVED',
      'PARTIALLY_RECEIVED',
    ]);

    // 8 000 milli PACK × 5 000 / 1000 = 40 000 milli KG.
    expect(await onHand(ORG_A, BUYER_PRODUCT, COLD)).toBe(BUYER_OPENING + 40_000);
    const item = (await canonicalSubcollection(db, PO, 'items'))[0];
    expect(item?.get('receivedSupplierMilli')).toBe(8000);
    expect(item?.get('receivedBuyerBaseMilli')).toBe(40_000);

    // The supplier's ledger is untouched by a buyer receipt (INV-11).
    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(190_000);
    expect(await commandMovements(ORG_B)).toHaveLength(1);
    await assertLedgerReconciles(ORG_A, BUYER_PRODUCT, COLD);
  });

  it('completes the chain at 120 KG and RECEIVED on all three documents', async () => {
    await receive(8000, OP.receiveOne);
    const final = await receive(2000, OP.receiveTwo);
    expect(final.ok).toBe(true);

    expect(await statusEverywhere()).toEqual(['RECEIVED', 'RECEIVED', 'RECEIVED']);
    expect(await onHand(ORG_A, BUYER_PRODUCT, COLD)).toBe(BUYER_OPENING + ORDERED_KG_MILLI);
    expect(await onHand(ORG_A, BUYER_PRODUCT, COLD)).toBe(120_000);

    const item = (await canonicalSubcollection(db, PO, 'items'))[0];
    expect(item?.get('receivedSupplierMilli')).toBe(ORDERED_PACK_MILLI);
    expect(item?.get('receivedBuyerBaseMilli')).toBe(ORDERED_KG_MILLI);
    expect((await canonicalOrder()).get('receivedAt')).toBeDefined();

    const summary = await db.doc(paths.productStockSummary(ORG_A, BUYER_PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(120_000);
    expect(summary.get('stockValueMinor')).toBe(15_000_000); // 120 KG × LKR 1,250.00
    await assertLedgerReconciles(ORG_A, BUYER_PRODUCT, COLD);
  });

  it('the residual rounding is absorbed into the closing line', async () => {
    // 3 PACK at a factor of 3 334 milli rounds to 10 002 milli, while the line
    // was ordered at 10 PACK = 33 340 milli. Receiving 3 + 3 + 4 must still land
    // exactly on the ordered buyer quantity, not on the sum of three roundings.
    await db
      .doc(serverPaths.connectedPurchaseOrderItem(PO, ITEM))
      .update({ supplierToBuyerBaseFactorMilliSnapshot: 3334, orderedBuyerBaseMilli: 33_340 });

    await receive(3000, OP.receiveOne);
    await receive(3000, OP.receiveTwo);
    const closing = await receive(4000, '88888888-8888-4888-8888-888888888888');
    expect(closing.ok).toBe(true);

    const item = (await canonicalSubcollection(db, PO, 'items'))[0];
    expect(item?.get('receivedBuyerBaseMilli')).toBe(33_340);
    expect(await onHand(ORG_A, BUYER_PRODUCT, COLD)).toBe(BUYER_OPENING + 33_340);
    await assertLedgerReconciles(ORG_A, BUYER_PRODUCT, COLD);
  });

  it('over-receipt is impossible, measured in supplier units against persisted state', async () => {
    const tooMuch = await receive(ORDERED_PACK_MILLI + 1, OP.receiveOne);
    expect(tooMuch.ok).toBe(false);
    expect(reasonOf(tooMuch)).toBe('OVER_RECEIPT');
    expect(await onHand(ORG_A, BUYER_PRODUCT, COLD)).toBe(BUYER_OPENING);

    await receive(8000, OP.receiveOne);
    const overRemaining = await receive(3000, OP.receiveTwo);
    expect(reasonOf(overRemaining)).toBe('OVER_RECEIPT');
    expect(await onHand(ORG_A, BUYER_PRODUCT, COLD)).toBe(BUYER_OPENING + 40_000);
  });

  it('writes PURCHASE_RECEIPT movements in the buyer ledger only', async () => {
    await receive(8000, OP.receiveOne);
    const movements = await commandMovements(ORG_A);
    expect(movements).toHaveLength(1);
    expect(movements[0]?.get('movementType')).toBe('PURCHASE_RECEIPT');
    expect(movements[0]?.get('signedQuantityMilli')).toBe(40_000);
    expect(movements[0]?.get('sourceType')).toBe('CONNECTED_PO');
    expect(movements[0]?.get('sourceId')).toBe(PO);
    expect(movements[0]?.get('balanceAfterMilli')).toBe(110_000);
    expect(movements[0]?.get('unit')).toBe('KG');
  });

  it('the SUPPLIER cannot receive into the buyer’s stock', async () => {
    const result = await cpoReceive.execute(
      callable(uidFor(ORG_B, 'STOREKEEPER'), {
        orgId: ORG_B,
        operationId: OP.receiveOne,
        payload: {
          purchaseOrderId: PO,
          warehouseId: MAIN,
          lines: [{ itemId: ITEM, quantityMilli: 8000 }],
        },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('CROSS_TENANT_REFERENCE');
    expect(await commandMovements(ORG_A)).toHaveLength(0);
    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(190_000);
  });

  it('is RECEIVERS, not PO_WRITERS-only, and denies Analyst and Viewer', async () => {
    for (const role of ['ANALYST', 'VIEWER'] as const) {
      const result = await receive(1000, OP.receiveOne, ORG_A, role);
      expect(result.ok, role).toBe(false);
      expect(reasonOf(result), role).toBe('ROLE_NOT_PERMITTED');
    }
    expect((await receive(1000, OP.receiveOne, ORG_A, 'STOREKEEPER')).ok).toBe(true);
  });

  it('pins later receipts to the store room the first receipt used', async () => {
    await receive(8000, OP.receiveOne, ORG_A, 'STOREKEEPER', COLD);
    const elsewhere = await receive(2000, OP.receiveTwo, ORG_A, 'STOREKEEPER', MAIN);
    expect(elsewhere.ok).toBe(false);
    expect(reasonOf(elsewhere)).toBe('INVALID_TRANSITION');

    // And the store room is recorded on the BUYER's projection only.
    expect((await db.doc(paths.purchaseOrder(ORG_A, PO)).get()).get('receivingWarehouseId')).toBe(
      COLD,
    );
    expect((await canonicalOrder()).get('receivingWarehouseId')).toBeUndefined();
    expect(
      (await db.doc(paths.purchaseOrder(ORG_B, PO)).get()).get('receivingWarehouseId'),
    ).toBeUndefined();
  });

  it('is idempotent — a replay adds no second receipt', async () => {
    await receive(8000, OP.receiveOne);
    const replay = await receive(8000, OP.receiveOne);
    expect(replay.ok).toBe(true);
    expect(await onHand(ORG_A, BUYER_PRODUCT, COLD)).toBe(BUYER_OPENING + 40_000);
    expect(await commandMovements(ORG_A)).toHaveLength(1);
    const item = (await canonicalSubcollection(db, PO, 'items'))[0];
    expect(item?.get('receivedSupplierMilli')).toBe(8000);
  });

  it('notifies the supplier and audits in both organizations', async () => {
    await receive(8000, OP.receiveOne);
    const notes = await notificationsOf(db, uidFor(ORG_B, 'PROCUREMENT_MANAGER'));
    expect(notes.some((doc) => doc.get('type') === 'CPO_RECEIVED')).toBe(true);
    for (const orgId of [ORG_A, ORG_B]) {
      const audits = await collectionOf(db, orgId, 'auditLogs');
      expect(
        audits.some((doc) => doc.get('action') === 'cpo.receive'),
        orgId,
      ).toBe(true);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('C-31 cpo.cancel', () => {
  it('cancels a DRAFT in the buyer tenant, with no canonical record and no history operationId', async () => {
    await draftSave();
    const result = await cancel();
    expect(result.ok).toBe(true);
    expect((await db.doc(paths.purchaseOrder(ORG_A, PO)).get()).get('status')).toBe('CANCELLED');
    expect((await canonicalOrder()).exists).toBe(false);
    expect(await collectionOf(db, ORG_A, 'commandReceipts')).toHaveLength(0);
  });

  it('cancels a SUBMITTED order across all three documents, and its history row carries NO operationId', async () => {
    await draftSave();
    await submit();
    const result = await cancel();
    expect(result.ok).toBe(true);
    expect(await statusEverywhere()).toEqual(['CANCELLED', 'CANCELLED', 'CANCELLED']);

    const history = await canonicalSubcollection(db, PO, 'history');
    expect(history).toHaveLength(2);
    const cancellation = history.find((doc) => doc.get('toStatus') === 'CANCELLED');
    expect(cancellation).toBeDefined();
    // NON-idempotent, so there is no receipt id to carry — and none is invented.
    expect(cancellation?.get('operationId')).toBeUndefined();
    expect(cancellation?.get('fromStatus')).toBe('SUBMITTED');

    // The submit receipt is the only one; cancel wrote none.
    expect(await collectionOf(db, ORG_A, 'commandReceipts')).toHaveLength(1);
  });

  it('cannot cancel after the supplier has committed (FR-CPO-004)', async () => {
    await draftSave();
    await submit();
    await respond('ACCEPT');
    expect(reasonOf(await cancel())).toBe('INVALID_TRANSITION');

    await ship();
    expect(reasonOf(await cancel())).toBe('INVALID_TRANSITION');
    expect(await statusEverywhere()).toEqual(['SHIPPED', 'SHIPPED', 'SHIPPED']);
    // And the supplier's dispatched stock is untouched by the attempt.
    expect(await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN)).toBe(190_000);
  });

  it('the SUPPLIER cannot cancel the buyer’s order', async () => {
    await draftSave();
    await submit();
    const result = await cancel(ORG_B, 'PROCUREMENT_MANAGER');
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('CROSS_TENANT_REFERENCE');
    expect(await statusEverywhere()).toEqual(['SUBMITTED', 'SUBMITTED', 'SUBMITTED']);
  });

  it('audits in both organizations once the order is shared', async () => {
    await draftSave();
    await submit();
    await cancel();
    for (const orgId of [ORG_A, ORG_B]) {
      const audits = await collectionOf(db, orgId, 'auditLogs');
      expect(
        audits.some((doc) => doc.get('action') === 'cpo.cancel'),
        orgId,
      ).toBe(true);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('negative controls — a weakened implementation would be caught', () => {
  beforeEach(async () => {
    await draftSave();
    await submit();
    await respond('ACCEPT');
  });

  it('supplier ship must decrement: the assertion fails if the decrement is skipped', async () => {
    const before = await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN);
    await ship();
    const after = await onHand(ORG_B, SUPPLIER_PRODUCT, MAIN);
    expect(after).toBeLessThan(before);
    expect(before - after).toBe(ORDERED_PACK_MILLI);
  });

  it('buyer receipt must increment exactly once, never twice', async () => {
    await ship();
    const before = await onHand(ORG_A, BUYER_PRODUCT, COLD);
    await receive(8000, OP.receiveOne);
    await receive(8000, OP.receiveOne); // same operationId
    expect((await onHand(ORG_A, BUYER_PRODUCT, COLD)) - before).toBe(40_000);
  });

  it('the canonical record and both projections never disagree at any point in the chain', async () => {
    const checkpoints: string[][] = [];
    checkpoints.push([...(await statusEverywhere())]);
    await ship();
    checkpoints.push([...(await statusEverywhere())]);
    await receive(8000, OP.receiveOne);
    checkpoints.push([...(await statusEverywhere())]);
    await receive(2000, OP.receiveTwo);
    checkpoints.push([...(await statusEverywhere())]);
    for (const [canonical, buyer, supplier] of checkpoints) {
      expect(buyer).toBe(canonical);
      expect(supplier).toBe(canonical);
    }
    expect(checkpoints.map((row) => row[0])).toEqual([
      'ACCEPTED',
      'SHIPPED',
      'PARTIALLY_RECEIVED',
      'RECEIVED',
    ]);
  });

  it('a disabled mapping cannot be used as a receiving conversion for a NEW order', async () => {
    await db.doc(paths.productMapping(ORG_A, MAPPING)).update({ status: 'DISABLED' });
    // The frozen snapshot keeps the shipped order receivable, as INV-15 requires…
    await ship();
    expect((await receive(8000, OP.receiveOne)).ok).toBe(true);
    // …but no new draft can be built on it.
    expect(reasonOf(await draftSave())).toBe('INVALID_TRANSITION');
  });
});

// ───────────────────────────────────────────────────────────────────────────
/**
 * `BACKEND-INTEGRATION-001` — the persisted connected order must satisfy the
 * frozen read contract at **every** point of the lifecycle.
 *
 * The rest of this file asserts field-by-field, which is why a drifted *extra*
 * field survived it: an assertion on `status` says nothing about a key nobody
 * thought to look for. These cases parse the **actual persisted document**
 * through the same strict schema `Q-036` uses, so the oracle is the whole shape
 * rather than the fields the test happens to name.
 *
 * `PurchaseOrderSchema` is `.strict()` and the DB-02 §5.2 field table for
 * `organizations/{orgId}/purchaseOrders/{poId}` carries no `updatedAt`. DB-05
 * §4.1 admits `updatedAt` only through `draftFieldsOnly()`, which governs the
 * **private** client-write draft surface — a connected draft is COMMAND_ONLY
 * via `cpo.draftSave` (DB-CR-010), so that concession never reached here.
 */
describe('BACKEND-INTEGRATION-001 connected projections satisfy the frozen read contract', () => {
  /** The buyer projection as `Q-036` would hand it to a reader. */
  async function buyerProjection(): Promise<Record<string, unknown>> {
    const snapshot = await db.doc(paths.purchaseOrder(ORG_A, PO)).get();
    expect(snapshot.exists).toBe(true);
    return snapshot.data() as Record<string, unknown>;
  }

  async function supplierProjection(): Promise<Record<string, unknown>> {
    const snapshot = await db.doc(paths.purchaseOrder(ORG_B, PO)).get();
    expect(snapshot.exists).toBe(true);
    return snapshot.data() as Record<string, unknown>;
  }

  /**
   * Parses the real document and reports the offending keys by name when it
   * fails — a bare `.parse()` throw names the key but not the stage.
   */
  function expectStrictOrder(actual: Record<string, unknown>, stage: string): void {
    const parsed = PurchaseOrderSchema.safeParse(actual);
    const unknownKeys = Object.keys(actual).filter((key) => !(key in PurchaseOrderSchema.shape));
    expect(unknownKeys, `${stage}: unauthorised field(s) on the buyer projection`).toEqual([]);
    expect(
      parsed.success ? [] : parsed.error.issues.map((issue) => issue.message),
      `${stage}: PurchaseOrderSchema.parse`,
    ).toEqual([]);
  }

  it('C-34 draftSave persists a buyer draft that strict-parses, with no updatedAt', async () => {
    expect((await draftSave()).ok).toBe(true);

    const actual = await buyerProjection();
    expect(Object.keys(actual)).not.toContain('updatedAt');
    expectStrictOrder(actual, 'C-34 cpo.draftSave');
  });

  it('C-27 submit leaves no unauthorised field behind on the merged buyer projection', async () => {
    await draftSave();
    expect((await submit()).ok).toBe(true);

    // `cpo.submit` merges into the very document `cpo.draftSave` wrote, so
    // anything unauthorised written at draft time survives into the submitted
    // projection rather than being replaced by it.
    const actual = await buyerProjection();
    expect(Object.keys(actual)).not.toContain('updatedAt');
    expectStrictOrder(actual, 'C-27 cpo.submit');
    expect(actual.status).toBe('SUBMITTED');
    expect(actual.isProjection).toBe(true);

    expectStrictOrder(await supplierProjection(), 'C-27 cpo.submit supplier projection');

    const canonical = (await canonicalOrder()).data() as Record<string, unknown>;
    const parsedCanonical = ConnectedPurchaseOrderSchema.safeParse(canonical);
    expect(
      parsedCanonical.success ? [] : parsedCanonical.error.issues.map((issue) => issue.message),
      'C-27 canonical record',
    ).toEqual([]);
  });

  it('the buyer projection strict-parses at every step of the C-27 → C-30 chain', async () => {
    await draftSave();
    expectStrictOrder(await buyerProjection(), 'after C-34 cpo.draftSave');

    await submit();
    expectStrictOrder(await buyerProjection(), 'after C-27 cpo.submit');

    await respond('ACCEPT');
    expectStrictOrder(await buyerProjection(), 'after C-28 cpo.respond');

    await ship();
    expectStrictOrder(await buyerProjection(), 'after C-29 cpo.ship');

    await receive(8000, OP.receiveOne);
    const partial = await buyerProjection();
    expect(partial.status).toBe('PARTIALLY_RECEIVED');
    expectStrictOrder(partial, 'after C-30 cpo.receive (partial)');

    await receive(2000, OP.receiveTwo);
    const final = await buyerProjection();
    expect(final.status).toBe('RECEIVED');
    // `receivingWarehouseId` is pinned on the first receipt and IS authorised.
    expect(final.receivingWarehouseId).toBe(COLD);
    expectStrictOrder(final, 'after C-30 cpo.receive (final)');

    // The supplier's side is held to the identical contract.
    expectStrictOrder(await supplierProjection(), 'supplier projection at RECEIVED');
  });

  it('C-31 cancel leaves a strict-parsable buyer draft', async () => {
    await draftSave();
    expect((await cancel()).ok).toBe(true);
    const actual = await buyerProjection();
    expect(actual.status).toBe('CANCELLED');
    expect(Object.keys(actual)).not.toContain('updatedAt');
    expectStrictOrder(actual, 'C-31 cpo.cancel');
  });

  it('re-saving an existing draft does not reintroduce an unauthorised field', async () => {
    await draftSave();
    // The second save takes the `set(..., { merge: true })` branch rather than
    // `create`, which is the path that would persist a drifted key.
    expect((await draftSave()).ok).toBe(true);
    const actual = await buyerProjection();
    expect(Object.keys(actual)).not.toContain('updatedAt');
    expectStrictOrder(actual, 'C-34 cpo.draftSave (re-save)');
  });
});
