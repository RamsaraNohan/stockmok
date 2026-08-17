import assert from 'node:assert/strict';
import type { Firestore } from 'firebase-admin/firestore';
import type { z } from 'zod';
import {
  CategorySchema,
  MemberSchema,
  OrganizationDirectorySchema,
  OrganizationSchema,
  OrganizationSettingsSchema,
  UserMembershipSchema,
  UserSchema,
} from '../../packages/shared/src/schemas/core.js';
import {
  ProductSchema,
  ProductStockSummarySchema,
  StockBalanceSchema,
  StockMovementSchema,
  WarehouseSchema,
} from '../../packages/shared/src/schemas/inventory.js';
import {
  CanonicalConnectionSchema,
  ConnectedHistorySchema,
  ConnectedPurchaseOrderItemSchema,
  ConnectedPurchaseOrderSchema,
  ConnectionProjectionSchema,
} from '../../packages/shared/src/schemas/network.js';
import {
  PartnerCatalogItemSchema,
  PrivatePartnerSchema,
  ProductMappingSchema,
  PurchaseOrderHistorySchema,
  PurchaseOrderItemSchema,
  PurchaseOrderSchema,
} from '../../packages/shared/src/schemas/procurement.js';
import { IDS } from './fixtures.js';

function schemaForPath(path: string): z.ZodType | undefined {
  const parts = path.split('/');
  if (parts.length === 2) {
    return {
      organizationDirectory: OrganizationDirectorySchema,
      users: UserSchema,
      organizations: OrganizationSchema,
      connections: CanonicalConnectionSchema,
      connectedPurchaseOrders: ConnectedPurchaseOrderSchema,
    }[parts[0] ?? ''];
  }
  if (parts[0] === 'users' && parts[2] === 'memberships') return UserMembershipSchema;
  if (parts[0] === 'connectedPurchaseOrders' && parts[2] === 'items')
    return ConnectedPurchaseOrderItemSchema;
  if (parts[0] === 'connectedPurchaseOrders' && parts[2] === 'history')
    return ConnectedHistorySchema;
  if (parts[0] !== 'organizations') return undefined;
  const collection = parts[2];
  if (collection === 'purchaseOrders' && parts[4] === 'items') return PurchaseOrderItemSchema;
  if (collection === 'purchaseOrders' && parts[4] === 'history') return PurchaseOrderHistorySchema;
  return {
    settings: OrganizationSettingsSchema,
    members: MemberSchema,
    categories: CategorySchema,
    warehouses: WarehouseSchema,
    products: ProductSchema,
    stockBalances: StockBalanceSchema,
    productStockSummaries: ProductStockSummarySchema,
    stockMovements: StockMovementSchema,
    privatePartners: PrivatePartnerSchema,
    purchaseOrders: PurchaseOrderSchema,
    partnerCatalog: PartnerCatalogItemSchema,
    productMappings: ProductMappingSchema,
    connections: ConnectionProjectionSchema,
  }[collection ?? ''];
}

export async function validateAllBootstrapDocuments(db: Firestore): Promise<number> {
  let count = 0;
  async function walk(collectionPath: string): Promise<void> {
    const snapshot = await db.collection(collectionPath).get();
    for (const document of snapshot.docs) {
      const schema = schemaForPath(document.ref.path);
      assert.ok(schema, `No bootstrap schema registered for ${document.ref.path}`);
      schema.parse(document.data());
      count += 1;
      for (const nested of await document.ref.listCollections()) await walk(nested.path);
    }
  }
  for (const collection of await db.listCollections()) await walk(collection.path);
  return count;
}

export async function assertT0Reconciliation(db: Firestore): Promise<void> {
  const productDocs = await db.collection(`organizations/${IDS.grandOrg}/products`).get();
  const movements = await db.collection(`organizations/${IDS.grandOrg}/stockMovements`).get();
  const summaries = await db
    .collection(`organizations/${IDS.grandOrg}/productStockSummaries`)
    .get();
  const meat = await db.doc(`organizations/${IDS.grandOrg}/productStockSummaries/meat-001`).get();
  const statuses = summaries.docs.map(
    (document) => ProductStockSummarySchema.parse(document.data()).stockStatus,
  );
  const value = summaries.docs.reduce(
    (sum, document) => sum + ProductStockSummarySchema.parse(document.data()).stockValueMinor,
    0,
  );
  assert.equal(productDocs.size, 12);
  assert.equal(movements.size, 12);
  assert.equal(statuses.filter((status) => status === 'LOW_STOCK').length, 4);
  assert.equal(statuses.filter((status) => status === 'OUT_OF_STOCK').length, 1);
  assert.equal(ProductStockSummarySchema.parse(meat.data()).onHandMilli, 18_000);
  assert.equal(value, 56_420_000);
  const cookingOil = await db
    .doc(`organizations/${IDS.grandOrg}/stockMovements/opening-dry-004`)
    .get();
  const oilMovement = StockMovementSchema.parse(cookingOil.data());
  assert.equal(oilMovement.movementType, 'OPENING_BALANCE');
  assert.equal(oilMovement.signedQuantityMilli, 0);
  assert.equal(oilMovement.balanceAfterMilli, 0);
}

export async function assertReplayReconciliation(db: Firestore): Promise<void> {
  const movements = await db.collection(`organizations/${IDS.grandOrg}/stockMovements`).get();
  const meatMovements = movements.docs.filter(
    (document) => document.data().productId === 'meat-001',
  );
  const summaries = await db
    .collection(`organizations/${IDS.grandOrg}/productStockSummaries`)
    .get();
  const balances = await db.collection(`organizations/${IDS.grandOrg}/stockBalances`).get();
  const meat = ProductStockSummarySchema.parse(
    (await db.doc(`organizations/${IDS.grandOrg}/productStockSummaries/meat-001`).get()).data(),
  );
  const statuses = summaries.docs.map(
    (document) => ProductStockSummarySchema.parse(document.data()).stockStatus,
  );
  const total = summaries.docs.reduce(
    (sum, document) => sum + ProductStockSummarySchema.parse(document.data()).stockValueMinor,
    0,
  );
  const warehouseValues = new Map<string, number>();
  for (const document of balances.docs) {
    const balance = StockBalanceSchema.parse(document.data());
    warehouseValues.set(
      balance.warehouseId,
      (warehouseValues.get(balance.warehouseId) ?? 0) + balance.stockValueMinor,
    );
  }
  assert.equal(movements.size, 17);
  assert.equal(meatMovements.length, 6);
  assert.equal(meat.onHandMilli, 120_000);
  assert.equal(statuses.filter((status) => status === 'LOW_STOCK').length, 3);
  assert.equal(statuses.filter((status) => status === 'OUT_OF_STOCK').length, 1);
  assert.equal(warehouseValues.get(IDS.coldWarehouse), 39_890_000);
  assert.equal(warehouseValues.get(IDS.mainWarehouse), 29_280_000);
  assert.equal(total, 69_170_000);

  const supplier = StockBalanceSchema.parse(
    (
      await db
        .doc(`organizations/${IDS.freshOrg}/stockBalances/ff-chk-05__${IDS.freshWarehouse}`)
        .get()
    ).data(),
  );
  assert.equal(supplier.onHandMilli, 190_000);
  const dispatch = StockMovementSchema.parse(
    (
      await db.doc(`organizations/${IDS.freshOrg}/stockMovements/dispatch-cpo-2026-003`).get()
    ).data(),
  );
  assert.equal(dispatch.movementType, 'CONNECTED_DISPATCH_OUT');
  assert.equal(dispatch.signedQuantityMilli, -10_000);
  const connectedItem = ConnectedPurchaseOrderItemSchema.parse(
    (await db.doc(`connectedPurchaseOrders/${IDS.connectedPo}/items/item-meat-001`).get()).data(),
  );
  assert.equal(connectedItem.orderedSupplierMilli, 10_000);
  assert.equal(connectedItem.receivedSupplierMilli, 10_000);
  assert.equal(connectedItem.supplierToBuyerBaseFactorMilliSnapshot, 5_000);
}

function normalizeValue(value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return { __timestampMillis: (value as { toMillis(): number }).toMillis() };
  }
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeValue(item)]),
    );
  }
  return value;
}

export async function normalizedFirestoreState(db: Firestore): Promise<string> {
  const rows: { path: string; data: unknown }[] = [];
  async function walk(collectionPath: string): Promise<void> {
    const snapshot = await db.collection(collectionPath).get();
    for (const document of snapshot.docs) {
      rows.push({ path: document.ref.path, data: normalizeValue(document.data()) });
      for (const nested of await document.ref.listCollections()) await walk(nested.path);
    }
  }
  for (const collection of await db.listCollections()) await walk(collection.path);
  rows.sort((left, right) => left.path.localeCompare(right.path));
  return JSON.stringify(rows);
}
