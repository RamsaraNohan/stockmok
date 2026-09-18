import assert from 'node:assert/strict';
import type { Firestore } from 'firebase-admin/firestore';
import { deriveStockValueMinor } from '../../packages/shared/src/domain.js';
import { paths } from '../../packages/shared/src/paths.js';
import { serverPaths } from '../../packages/shared/src/server/paths.js';
import type { SeedResult } from './seed.js';

/**
 * `T-SEED-01a` / `T-SEED-01b` — DB-08 §6.5, asserted **by query, not by fixture
 * constant**, exactly as that section requires.
 *
 * Nothing here reads a value the seed computed and compares it to itself. Every
 * figure is read back out of Firestore and compared to a number written down in
 * DB-08, so a seed that produced a plausible-but-wrong database fails rather
 * than agreeing with itself. `seed exited with code 0` is not evidence.
 */

export interface ReconciliationReport {
  readonly label: string;
  readonly checks: readonly string[];
}

async function summaries(db: Firestore, orgId: string) {
  return (await db.collection(`${paths.organization(orgId)}/productStockSummaries`).get()).docs;
}

async function balances(db: Firestore, orgId: string) {
  return (await db.collection(`${paths.organization(orgId)}/stockBalances`).get()).docs;
}

async function movements(db: Firestore, orgId: string) {
  return (await db.collection(`${paths.organization(orgId)}/stockMovements`).get()).docs;
}

function inventoryValue(docs: readonly FirebaseFirestore.QueryDocumentSnapshot[]): number {
  return docs.reduce((sum, doc) => sum + (doc.get('stockValueMinor') as number), 0);
}

function countStatus(
  docs: readonly FirebaseFirestore.QueryDocumentSnapshot[],
  status: string,
): number {
  return docs.filter((doc) => doc.get('stockStatus') === status).length;
}

/**
 * `INV-26` and `INV-27` over the whole workspace: every balance row's value is
 * its own arithmetic, and every product's summary is the exact integer sum of
 * its balances. Value rounds **once**, at the balance grain.
 */
async function assertValueDerivations(db: Firestore, orgId: string): Promise<void> {
  const balanceDocs = await balances(db, orgId);
  const perProduct = new Map<string, number>();
  for (const doc of balanceDocs) {
    const onHandMilli = doc.get('onHandMilli') as number;
    const unitPriceMinor = doc.get('baseUnitPriceMinor') as number;
    const stockValueMinor = doc.get('stockValueMinor') as number;
    assert.equal(
      stockValueMinor,
      deriveStockValueMinor(onHandMilli, unitPriceMinor),
      `INV-26 ${doc.ref.path}: stockValueMinor is not its own arithmetic`,
    );
    const productId = doc.get('productId') as string;
    perProduct.set(productId, (perProduct.get(productId) ?? 0) + stockValueMinor);
  }
  for (const summary of await summaries(db, orgId)) {
    const productId = summary.get('productId') as string;
    assert.equal(
      summary.get('stockValueMinor'),
      perProduct.get(productId) ?? 0,
      `INV-27 ${productId}: the summary is not the exact sum of its balances`,
    );
  }
}

/** `INV-03` for every product-and-store-room in the organization. */
async function assertLedgerReconciles(db: Firestore, orgId: string): Promise<void> {
  const signedSums = new Map<string, number>();
  for (const movement of await movements(db, orgId)) {
    const key = `${movement.get('productId') as string}__${movement.get('warehouseId') as string}`;
    signedSums.set(
      key,
      (signedSums.get(key) ?? 0) + (movement.get('signedQuantityMilli') as number),
    );
  }
  for (const balance of await balances(db, orgId)) {
    const key = `${balance.get('productId') as string}__${balance.get('warehouseId') as string}`;
    assert.equal(
      signedSums.get(key) ?? 0,
      balance.get('onHandMilli'),
      `INV-03 ${key}: the ledger does not reconcile with the balance`,
    );
  }
}

/** `INV-04` — a product's summary is the exact sum of its balances. */
async function assertSummaryTotals(db: Firestore, orgId: string): Promise<void> {
  const perProduct = new Map<string, number>();
  for (const balance of await balances(db, orgId)) {
    const productId = balance.get('productId') as string;
    perProduct.set(
      productId,
      (perProduct.get(productId) ?? 0) + (balance.get('onHandMilli') as number),
    );
  }
  for (const summary of await summaries(db, orgId)) {
    const productId = summary.get('productId') as string;
    assert.equal(
      summary.get('onHandMilli'),
      perProduct.get(productId) ?? 0,
      `INV-04 ${productId}: the summary total is not the sum of its balances`,
    );
  }
}

// ───────────────────────────────────────────────────────────────────────────

/**
 * `T-SEED-01a` — the t₀ block, asserted immediately after the seed.
 *
 * `Q-053 == 56 420 000` minor · MEAT-001 `== 18 000` milli · ledger `== 12`
 * movements · 4 low · 1 out · Fresh Foods 200 PACK and 300 KG · `CKN-B5`
 * published with `orderUnit == baseUnit`.
 */
export async function assertT0(db: Firestore, seed: SeedResult): Promise<ReconciliationReport> {
  const checks: string[] = [];
  const { buyerOrgId, supplierOrgId } = seed;

  const products = (await db.collection(`${paths.organization(buyerOrgId)}/products`).get()).docs;
  assert.equal(products.length, 12, 'Q-050: active SKUs');
  checks.push('ACTIVE_SKUS=12');

  const buyerMovements = await movements(db, buyerOrgId);
  assert.equal(buyerMovements.length, 12, 'the seeded ledger at t₀ is twelve opening balances');
  assert.ok(
    buyerMovements.every((doc) => doc.get('movementType') === 'OPENING_BALANCE'),
    'every t₀ movement is an OPENING_BALANCE',
  );
  checks.push('LEDGER_MOVEMENTS=12');

  const buyerSummaries = await summaries(db, buyerOrgId);
  assert.equal(countStatus(buyerSummaries, 'LOW_STOCK'), 4, 'Q-051: low stock at t₀');
  assert.equal(countStatus(buyerSummaries, 'OUT_OF_STOCK'), 1, 'out of stock at t₀');
  checks.push('LOW_STOCK=4', 'OUT_OF_STOCK=1');

  const meatProductId = seed.productIds.get('MEAT-001');
  assert.ok(meatProductId, 'MEAT-001 was seeded');
  const meat = await db.doc(paths.productStockSummary(buyerOrgId, meatProductId)).get();
  assert.equal(meat.get('onHandMilli'), 18_000, 'MEAT-001 at t₀');
  assert.equal(meat.get('stockStatus'), 'LOW_STOCK', 'MEAT-001 is LOW at t₀');
  checks.push('MEAT_001_MILLI=18000');

  assert.equal(inventoryValue(buyerSummaries), 56_420_000, 'Q-053: inventory value at t₀');
  checks.push('INVENTORY_VALUE_MINOR=56420000');

  // Cooking Oil: a recorded zero is a different fact from never initialised.
  const oilProductId = seed.productIds.get('DRY-004');
  assert.ok(oilProductId, 'DRY-004 was seeded');
  const oilMovement = buyerMovements.find((doc) => doc.get('productId') === oilProductId);
  assert.ok(oilMovement, 'Cooking Oil has an opening movement');
  assert.equal(oilMovement.get('signedQuantityMilli'), 0);
  assert.equal(oilMovement.get('balanceAfterMilli'), 0);
  checks.push('COOKING_OIL_ZERO_OPENING=YES');

  // Fresh Foods — 200 PACK and 300 KG, in the supplier's own tenant.
  for (const [sku, expected] of [
    ['FF-CHK-05', 200_000],
    ['FF-BTR-01', 300_000],
  ] as const) {
    const supplierProductId = seed.supplierProductIds.get(sku);
    assert.ok(supplierProductId, `${sku} was seeded`);
    const summary = await db.doc(paths.productStockSummary(supplierOrgId, supplierProductId)).get();
    assert.equal(summary.get('onHandMilli'), expected, `${sku} opening balance`);
  }
  checks.push('SUPPLIER_OPENING=200_PACK+300_KG');

  // INV-17 — the catalog item's order unit IS the source product's base unit.
  const catalogItemId = seed.catalogItemIds.get('CKN-B5');
  assert.ok(catalogItemId, 'CKN-B5 was published');
  const catalogItem = await db.doc(paths.partnerCatalogItem(supplierOrgId, catalogItemId)).get();
  assert.equal(catalogItem.get('published'), true, 'CKN-B5 is published');
  const sourceProduct = await db
    .doc(paths.product(supplierOrgId, catalogItem.get('sourceProductId') as string))
    .get();
  assert.equal(
    catalogItem.get('orderUnit'),
    sourceProduct.get('baseUnit'),
    'INV-17: orderUnit == baseUnit',
  );
  checks.push('CKN_B5_PUBLISHED_ORDER_UNIT_EQUALS_BASE_UNIT=YES');

  await assertValueDerivations(db, buyerOrgId);
  await assertLedgerReconciles(db, buyerOrgId);
  await assertLedgerReconciles(db, supplierOrgId);
  await assertSummaryTotals(db, buyerOrgId);
  checks.push('INV_03=PASS', 'INV_04=PASS', 'INV_26=PASS', 'INV_27=PASS');

  return { label: 'T-SEED-01a', checks };
}

/**
 * `T-SEED-01b` — the post-chain block.
 *
 * `Q-053 == 69 170 000` · MEAT-001 `== 120 000` milli · ledger `== 17`
 * movements · MEAT-001's own history `== 6` · 3 low · 1 out · Cold Room
 * `== 39 890 000` and Main Store `== 29 280 000`, the two summing **exactly** to
 * `Q-053`.
 */
export async function assertPostChain(
  db: Firestore,
  seed: SeedResult,
): Promise<ReconciliationReport> {
  const checks: string[] = [];
  const { buyerOrgId, supplierOrgId } = seed;

  const buyerMovements = await movements(db, buyerOrgId);
  assert.equal(buyerMovements.length, 17, 'the ledger after the chain');
  checks.push('LEDGER_MOVEMENTS=17');

  const meatProductId = seed.productIds.get('MEAT-001');
  assert.ok(meatProductId, 'MEAT-001 was seeded');
  const meatMovements = buyerMovements.filter((doc) => doc.get('productId') === meatProductId);
  assert.equal(meatMovements.length, 6, "MEAT-001's own history");
  checks.push('MEAT_001_MOVEMENTS=6');

  const meat = await db.doc(paths.productStockSummary(buyerOrgId, meatProductId)).get();
  assert.equal(meat.get('onHandMilli'), 120_000, 'MEAT-001 after the chain');
  assert.equal(meat.get('stockStatus'), 'IN_STOCK', 'MEAT-001 is no longer low');
  checks.push('MEAT_001_MILLI=120000');

  const buyerSummaries = await summaries(db, buyerOrgId);
  assert.equal(countStatus(buyerSummaries, 'LOW_STOCK'), 3, 'low stock after the chain');
  assert.equal(countStatus(buyerSummaries, 'OUT_OF_STOCK'), 1, 'out of stock after the chain');
  checks.push('LOW_STOCK=3', 'OUT_OF_STOCK=1');

  const total = inventoryValue(buyerSummaries);
  assert.equal(total, 69_170_000, 'Q-053 after the chain');
  checks.push('INVENTORY_VALUE_MINOR=69170000');

  const byWarehouse = new Map<string, number>();
  for (const balance of await balances(db, buyerOrgId)) {
    const warehouseId = balance.get('warehouseId') as string;
    byWarehouse.set(
      warehouseId,
      (byWarehouse.get(warehouseId) ?? 0) + (balance.get('stockValueMinor') as number),
    );
  }
  assert.equal(byWarehouse.get(seed.buyerWarehouses.cold), 39_890_000, 'Cold Room valuation');
  assert.equal(byWarehouse.get(seed.buyerWarehouses.main), 29_280_000, 'Main Store valuation');
  assert.equal(
    (byWarehouse.get(seed.buyerWarehouses.cold) ?? 0) +
      (byWarehouse.get(seed.buyerWarehouses.main) ?? 0),
    total,
    'the two store rooms sum exactly to Q-053',
  );
  checks.push('COLD_ROOM_MINOR=39890000', 'MAIN_STORE_MINOR=29280000', 'WAREHOUSE_SUM=EXACT');

  // INV-10 — the supplier shipped ten PACK and nothing else moved there.
  const supplierProductId = seed.supplierProductIds.get('FF-CHK-05');
  assert.ok(supplierProductId, 'FF-CHK-05 was seeded');
  const supplierSummary = await db
    .doc(paths.productStockSummary(supplierOrgId, supplierProductId))
    .get();
  assert.equal(supplierSummary.get('onHandMilli'), 190_000, 'the supplier shipped ten PACK');
  const dispatches = (await movements(db, supplierOrgId)).filter(
    (doc) => doc.get('movementType') === 'CONNECTED_DISPATCH_OUT',
  );
  assert.equal(dispatches.length, 1, 'exactly one connected dispatch');
  assert.equal(dispatches[0]?.get('signedQuantityMilli'), -10_000, 'the dispatch quantity');
  checks.push('SUPPLIER_MILLI=190000', 'CONNECTED_DISPATCH_OUT=1');

  // The canonical connected record, in the supplier's order units throughout.
  const canonicalItems = (
    await db.collection(`${serverPaths.connectedPurchaseOrder('cpo-2026-003')}/items`).get()
  ).docs;
  assert.equal(canonicalItems.length, 1, 'the connected order has one line');
  const line = canonicalItems[0];
  assert.ok(line, 'the connected order line exists');
  assert.equal(line.get('orderedSupplierMilli'), 10_000);
  assert.equal(line.get('receivedSupplierMilli'), 10_000);
  assert.equal(line.get('receivedBuyerBaseMilli'), 50_000);
  assert.equal(line.get('supplierToBuyerBaseFactorMilliSnapshot'), 5000);
  const canonicalOrder = await db.doc(serverPaths.connectedPurchaseOrder('cpo-2026-003')).get();
  assert.equal(canonicalOrder.get('status'), 'RECEIVED');
  for (const orgId of [buyerOrgId, supplierOrgId]) {
    const projection = await db.doc(paths.purchaseOrder(orgId, 'cpo-2026-003')).get();
    assert.equal(projection.get('status'), 'RECEIVED', `INV-19: ${orgId} projection status`);
  }
  checks.push('CONNECTED_PO=RECEIVED', 'INV_19=PASS');

  await assertValueDerivations(db, buyerOrgId);
  await assertLedgerReconciles(db, buyerOrgId);
  await assertLedgerReconciles(db, supplierOrgId);
  await assertSummaryTotals(db, buyerOrgId);
  checks.push('INV_03=PASS', 'INV_04=PASS', 'INV_26=PASS', 'INV_27=PASS');

  return { label: 'T-SEED-01b', checks };
}

/** A stable fingerprint of the whole database, for rerun comparison. */
export async function databaseFingerprint(db: Firestore): Promise<string> {
  const rows: string[] = [];
  async function walk(collectionPath: string): Promise<void> {
    const snapshot = await db.collection(collectionPath).get();
    for (const document of snapshot.docs) {
      rows.push(document.ref.path);
      for (const nested of await document.ref.listCollections()) await walk(nested.path);
    }
  }
  for (const collection of await db.listCollections()) await walk(collection.path);
  return rows.sort().join('\n');
}
