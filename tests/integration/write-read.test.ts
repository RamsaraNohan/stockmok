import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  cpoDraftSave,
  cpoReceive,
  cpoRespond,
  cpoShip,
  cpoSubmit,
} from '../../functions/src/commands/connected-po.js';
import { poReceive } from '../../functions/src/commands/purchase-order.js';
import { productCreate } from '../../functions/src/commands/product.js';
import {
  stockAdjust,
  stockRecordOpeningBalance,
  stockTransfer,
} from '../../functions/src/commands/stock.js';
import { createStockmokRepositories } from '../../packages/data/src/repositories.js';
import { paths } from '../../packages/shared/src/paths.js';
import { serverPaths } from '../../packages/shared/src/server/paths.js';
import { doc, getDoc, updateDoc, type Firestore as ClientFirestore } from 'firebase/firestore';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  callable,
  clearFirestore,
  connectionIdFor,
  ORG_A,
  ORG_B,
  seedCategory,
  seedConnectedDraft,
  seedConnectedDraftItem,
  seedConnection,
  seedMember,
  seedOpeningMovement,
  seedOrganization,
  seedPartnerCatalogItem,
  seedPrivatePartner,
  seedProduct,
  seedProductMapping,
  seedProductStockSummary,
  seedPurchaseOrder,
  seedPurchaseOrderItem,
  seedSettings,
  seedStockBalance,
  seedWarehouse,
  testDb,
  uidFor,
} from '../backend/harness.js';

const PRODUCT = 'product-rice';
const MAIN = 'warehouse-main';
const COLD = 'warehouse-cold';
const PRIVATE_PO = 'po-integration';
const PRIVATE_ITEM = 'item-rice';
const PRIVATE_SUPPLIER = 'partner-green-farm';

const CONNECTION_ID = connectionIdFor(ORG_A, ORG_B);
const BUYER_PRODUCT = 'product-chicken';
const SUPPLIER_PRODUCT = 'product-chicken-pack';
const CATALOG_ITEM = 'catalog-chicken';
const MAPPING = 'mapping-chicken';
const CONNECTED_PO = 'cpo-chicken';
const CONNECTED_ITEM = 'item-chicken';

const ALL_ROLES = [
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
  'PROCUREMENT_MANAGER',
  'STOREKEEPER',
  'ANALYST',
  'VIEWER',
] as const;

const OP = {
  product: '10000000-0000-4000-8000-000000000001',
  opening: '10000000-0000-4000-8000-000000000002',
  zeroOpening: '10000000-0000-4000-8000-000000000003',
  adjust: '10000000-0000-4000-8000-000000000004',
  transfer: '10000000-0000-4000-8000-000000000005',
  privateReceive: '10000000-0000-4000-8000-000000000006',
  submit: '10000000-0000-4000-8000-000000000007',
  respond: '10000000-0000-4000-8000-000000000008',
  ship: '10000000-0000-4000-8000-000000000009',
  receiveOne: '10000000-0000-4000-8000-000000000010',
  receiveTwo: '10000000-0000-4000-8000-000000000011',
} as const;

type CommandResult =
  | { readonly ok: true; readonly data: unknown }
  | { readonly ok: false; readonly code: string; readonly details?: unknown };

let adminDb: Firestore;
let rulesEnvironment: RulesTestEnvironment;

function commandData(result: CommandResult): Record<string, unknown> {
  expect(result.ok, JSON.stringify(result)).toBe(true);
  return result.ok ? (result.data as Record<string, unknown>) : {};
}

function authenticated(orgId: string, uid = uidFor(orgId, 'OWNER')) {
  const clientDb = rulesEnvironment
    .authenticatedContext(uid, { email: `${uid}@stockmok.test` })
    .firestore() as unknown as ClientFirestore;
  return {
    clientDb,
    repositories: createStockmokRepositories(clientDb, { orgId, uid }),
  };
}

async function seedOrganizations(): Promise<void> {
  await clearFirestore();
  for (const orgId of [ORG_A, ORG_B]) {
    await seedOrganization(adminDb, orgId);
    await seedSettings(adminDb, orgId, {
      defaultWarehouseId: MAIN,
      currency: 'LKR',
    });
    for (const role of ALL_ROLES) await seedMember(adminDb, orgId, role);
  }
  await seedWarehouse(adminDb, ORG_A, MAIN, { name: 'Main Store' });
  await seedWarehouse(adminDb, ORG_A, COLD, { name: 'Cold Room' });
  await seedWarehouse(adminDb, ORG_B, MAIN, { name: 'Main Store' });
  await seedCategory(adminDb, ORG_A, 'category-grains', { name: 'Grains' });
}

async function seedInventoryProduct(costMinor = 1000): Promise<void> {
  await seedProduct(adminDb, ORG_A, PRODUCT, {
    name: 'Basmati Rice',
    categoryId: 'category-grains',
    internalSku: 'RICE-001',
    internalSkuNormalized: 'RICE-001',
    purchaseCostMinor: costMinor,
  });
  await seedProductStockSummary(adminDb, ORG_A, PRODUCT, {
    productName: 'Basmati Rice',
    categoryId: 'category-grains',
    internalSku: 'RICE-001',
    internalSkuNormalized: 'RICE-001',
    baseUnitPriceMinor: costMinor,
  });
}

async function seedConnectedChain(): Promise<void> {
  await seedOrganizations();
  await adminDb.doc(paths.settings(ORG_A)).update({ defaultWarehouseId: COLD });

  await seedProduct(adminDb, ORG_A, BUYER_PRODUCT, {
    name: 'Chicken Breast',
    internalSku: 'MEAT-001',
    internalSkuNormalized: 'MEAT-001',
    baseUnit: 'KG',
    purchaseCostMinor: 125_000,
    currency: 'LKR',
    minimumStockMilli: 20_000,
  });
  await seedStockBalance(adminDb, ORG_A, BUYER_PRODUCT, COLD, {
    onHandMilli: 70_000,
    unit: 'KG',
    productName: 'Chicken Breast',
    internalSku: 'MEAT-001',
    internalSkuNormalized: 'MEAT-001',
    baseUnitPriceMinor: 125_000,
    stockValueMinor: 8_750_000,
    stockStatus: 'IN_STOCK',
    minimumStockMilli: 20_000,
    shortfallMilli: 0,
  });
  await seedProductStockSummary(adminDb, ORG_A, BUYER_PRODUCT, {
    productName: 'Chicken Breast',
    internalSku: 'MEAT-001',
    internalSkuNormalized: 'MEAT-001',
    onHandMilli: 70_000,
    availableMilli: 70_000,
    unit: 'KG',
    baseUnitPriceMinor: 125_000,
    stockValueMinor: 8_750_000,
    stockStatus: 'IN_STOCK',
    minimumStockMilli: 20_000,
    shortfallMilli: 0,
  });
  await seedOpeningMovement(adminDb, ORG_A, BUYER_PRODUCT, COLD, 70_000, 'KG');

  await seedProduct(adminDb, ORG_B, SUPPLIER_PRODUCT, {
    name: 'Chicken Breast 5 KG Pack',
    internalSku: 'FF-CHK-05',
    internalSkuNormalized: 'FF-CHK-05',
    baseUnit: 'PACK',
    purchaseCostMinor: 550_000,
    currency: 'LKR',
    minimumStockMilli: 20_000,
    partnerPublished: true,
  });
  await seedStockBalance(adminDb, ORG_B, SUPPLIER_PRODUCT, MAIN, {
    onHandMilli: 200_000,
    unit: 'PACK',
    productName: 'Chicken Breast 5 KG Pack',
    internalSku: 'FF-CHK-05',
    internalSkuNormalized: 'FF-CHK-05',
    baseUnitPriceMinor: 550_000,
    stockValueMinor: 110_000_000,
    stockStatus: 'IN_STOCK',
    minimumStockMilli: 20_000,
    shortfallMilli: 0,
  });
  await seedProductStockSummary(adminDb, ORG_B, SUPPLIER_PRODUCT, {
    productName: 'Chicken Breast 5 KG Pack',
    internalSku: 'FF-CHK-05',
    internalSkuNormalized: 'FF-CHK-05',
    onHandMilli: 200_000,
    availableMilli: 200_000,
    unit: 'PACK',
    baseUnitPriceMinor: 550_000,
    stockValueMinor: 110_000_000,
    stockStatus: 'IN_STOCK',
    minimumStockMilli: 20_000,
    shortfallMilli: 0,
  });
  await seedOpeningMovement(adminDb, ORG_B, SUPPLIER_PRODUCT, MAIN, 200_000, 'PACK');

  await seedPartnerCatalogItem(adminDb, ORG_B, CATALOG_ITEM, {
    sourceProductId: SUPPLIER_PRODUCT,
  });
  await seedConnection(adminDb, ORG_A, ORG_B, 'ACTIVE');
  await seedProductMapping(adminDb, ORG_A, MAPPING, {
    connectionId: CONNECTION_ID,
    buyerProductId: BUYER_PRODUCT,
    supplierCatalogItemId: CATALOG_ITEM,
    supplierToBuyerBaseFactorMilli: 5000,
  });
  await seedConnectedDraft(adminDb, ORG_A, CONNECTED_PO, CONNECTION_ID);
  await seedConnectedDraftItem(adminDb, ORG_A, CONNECTED_PO, CONNECTED_ITEM, {
    buyerProductId: BUYER_PRODUCT,
    mappingId: MAPPING,
    supplierCatalogItemId: CATALOG_ITEM,
    orderedSupplierMilli: 10_000,
  });

  commandData(
    await cpoDraftSave.execute(
      callable(uidFor(ORG_A, 'PROCUREMENT_MANAGER'), {
        orgId: ORG_A,
        payload: { purchaseOrderId: CONNECTED_PO, connectionId: CONNECTION_ID },
      }),
      adminDb,
    ),
  );
  commandData(
    await cpoSubmit.execute(
      callable(uidFor(ORG_A, 'PROCUREMENT_MANAGER'), {
        orgId: ORG_A,
        operationId: OP.submit,
        payload: { purchaseOrderId: CONNECTED_PO },
      }),
      adminDb,
    ),
  );
  commandData(
    await cpoRespond.execute(
      callable(uidFor(ORG_B, 'PROCUREMENT_MANAGER'), {
        orgId: ORG_B,
        operationId: OP.respond,
        payload: { purchaseOrderId: CONNECTED_PO, response: 'ACCEPT' },
      }),
      adminDb,
    ),
  );
}

async function shipConnected(): Promise<CommandResult> {
  return cpoShip.execute(
    callable(uidFor(ORG_B, 'PROCUREMENT_MANAGER'), {
      orgId: ORG_B,
      operationId: OP.ship,
      payload: { purchaseOrderId: CONNECTED_PO },
    }),
    adminDb,
  );
}

async function receiveConnected(
  quantityMilli: number,
  operationId: string,
): Promise<CommandResult> {
  return cpoReceive.execute(
    callable(uidFor(ORG_A, 'STOREKEEPER'), {
      orgId: ORG_A,
      operationId,
      payload: {
        purchaseOrderId: CONNECTED_PO,
        warehouseId: COLD,
        lines: [{ itemId: CONNECTED_ITEM, quantityMilli }],
      },
    }),
    adminDb,
  );
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

beforeEach(seedOrganizations);

afterAll(async () => {
  await rulesEnvironment.cleanup();
});

describe('frozen backend writes through authenticated frozen C2 reads', () => {
  it('C-09 product.create returns the same product, zero summary, and list row', async () => {
    const result = await productCreate.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        operationId: OP.product,
        payload: {
          internalSku: 'rice-basmati',
          name: 'Basmati Rice',
          categoryId: 'category-grains',
          baseUnit: 'KG',
          purchaseCostMinor: 250,
          currency: 'usd',
          minimumStockMilli: 10_000,
          reorderTargetMilli: 20_000,
        },
      }),
      adminDb,
    );
    const productId = commandData(result).productId as string;
    const persisted = await adminDb.doc(paths.product(ORG_A, productId)).get();
    const { repositories } = authenticated(ORG_A);
    const [product, summary, list] = await Promise.all([
      repositories.inventory.getProduct(productId),
      repositories.inventory.getSummary(productId),
      repositories.inventory.listProducts({ productStatus: 'ACTIVE', sort: 'name' }),
    ]);

    expect(persisted.get('internalSkuNormalized')).toBe('RICE-BASMATI');
    expect(product?.productId).toBe(productId);
    expect(product?.currency).toBe('USD');
    expect(summary?.onHandMilli).toBe(0);
    expect(summary?.stockStatus).toBe('OUT_OF_STOCK');
    expect(list.items.map((item) => item.productId)).toContain(productId);
  });

  it('C-13 opening balance includes governed zero, balances, summary, and ledger rows', async () => {
    await seedInventoryProduct();
    const open = (warehouseId: string, quantityMilli: number, operationId: string) =>
      stockRecordOpeningBalance.execute(
        callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
          orgId: ORG_A,
          operationId,
          payload: {
            productId: PRODUCT,
            warehouseId,
            quantityMilli,
            effectiveAt: Timestamp.fromMillis(Date.now() - 60_000),
          },
        }),
        adminDb,
      );
    commandData(await open(MAIN, 12_000, OP.opening));
    commandData(await open(COLD, 0, OP.zeroOpening));

    const { repositories } = authenticated(ORG_A);
    const [balances, summary, movements] = await Promise.all([
      repositories.inventory.listProductBalances(PRODUCT),
      repositories.inventory.getSummary(PRODUCT),
      repositories.movements.list('Q-023', { productId: PRODUCT }),
    ]);
    expect(balances.items.map(({ onHandMilli }) => onHandMilli).sort()).toEqual([0, 12_000]);
    expect(summary?.onHandMilli).toBe(12_000);
    expect(movements.items).toHaveLength(2);
    expect(movements.items.map(({ signedQuantityMilli }) => signedQuantityMilli).sort()).toEqual([
      0, 12_000,
    ]);
  });

  it('C-14 adjustment preserves signed movement, valuation, status, and summary', async () => {
    await seedInventoryProduct();
    commandData(
      await stockRecordOpeningBalance.execute(
        callable(uidFor(ORG_A, 'OWNER'), {
          orgId: ORG_A,
          operationId: OP.opening,
          payload: {
            productId: PRODUCT,
            warehouseId: MAIN,
            quantityMilli: 10_000,
            effectiveAt: Timestamp.fromMillis(Date.now() - 60_000),
          },
        }),
        adminDb,
      ),
    );
    const result = await stockAdjust.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        operationId: OP.adjust,
        payload: {
          productId: PRODUCT,
          warehouseId: MAIN,
          signedQuantityMilli: -4000,
          adjustmentReason: 'DAMAGED_IN_STORAGE',
        },
      }),
      adminDb,
    );
    commandData(result);

    const { repositories } = authenticated(ORG_A);
    const [balances, summary, movements] = await Promise.all([
      repositories.inventory.listProductBalances(PRODUCT),
      repositories.inventory.getSummary(PRODUCT),
      repositories.movements.list('Q-023', { productId: PRODUCT }),
    ]);
    expect(balances.items[0]?.onHandMilli).toBe(6000);
    expect(balances.items[0]?.stockValueMinor).toBe(6000);
    expect(summary?.onHandMilli).toBe(6000);
    expect(summary?.stockStatus).toBe('IN_STOCK');
    expect(movements.items.find((item) => item.movementType === 'ADJUSTMENT_OUT')).toMatchObject({
      signedQuantityMilli: -4000,
      balanceAfterMilli: 6000,
    });
  });

  it('C-33 transfer conserves product total and returns the paired movements', async () => {
    await seedInventoryProduct(333);
    commandData(
      await stockRecordOpeningBalance.execute(
        callable(uidFor(ORG_A, 'OWNER'), {
          orgId: ORG_A,
          operationId: OP.opening,
          payload: {
            productId: PRODUCT,
            warehouseId: MAIN,
            quantityMilli: 10_500,
            effectiveAt: Timestamp.fromMillis(Date.now() - 60_000),
          },
        }),
        adminDb,
      ),
    );
    const result = await stockTransfer.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        operationId: OP.transfer,
        payload: {
          productId: PRODUCT,
          sourceWarehouseId: MAIN,
          destinationWarehouseId: COLD,
          quantityMilli: 5250,
        },
      }),
      adminDb,
    );
    const transferId = commandData(result).transferId as string;

    const { repositories } = authenticated(ORG_A);
    const [balances, summary, pair] = await Promise.all([
      repositories.inventory.listProductBalances(PRODUCT),
      repositories.inventory.getSummary(PRODUCT),
      repositories.movements.getTransferPair(transferId),
    ]);
    expect(balances.items.map(({ onHandMilli }) => onHandMilli).sort()).toEqual([5250, 5250]);
    expect(balances.items.reduce((total, item) => total + item.onHandMilli, 0)).toBe(10_500);
    expect(summary?.onHandMilli).toBe(10_500);
    expect(summary?.stockValueMinor).toBe(3496);
    expect(pair.items.map(({ signedQuantityMilli }) => signedQuantityMilli).sort()).toEqual([
      -5250, 5250,
    ]);
  });

  it('C-17 private PO receipt returns header, item/history, buyer stock, summary, and movement', async () => {
    await seedInventoryProduct();
    await seedPrivatePartner(adminDb, ORG_A, PRIVATE_SUPPLIER, { name: 'Green Farm Poultry' });
    await seedPurchaseOrder(adminDb, ORG_A, PRIVATE_PO, {
      status: 'ORDERED',
      privateSupplierId: PRIVATE_SUPPLIER,
      orderNumber: 'PO-2026-001',
    });
    await seedPurchaseOrderItem(adminDb, ORG_A, PRIVATE_PO, PRIVATE_ITEM, {
      buyerProductId: PRODUCT,
      buyerProductNameSnapshot: 'Basmati Rice',
      orderedBuyerBaseMilli: 50_000,
      receivedBuyerBaseMilli: 0,
    });
    const result = await poReceive.execute(
      callable(uidFor(ORG_A, 'STOREKEEPER'), {
        orgId: ORG_A,
        operationId: OP.privateReceive,
        payload: {
          purchaseOrderId: PRIVATE_PO,
          warehouseId: MAIN,
          lines: [{ itemId: PRIVATE_ITEM, quantityMilli: 20_000 }],
        },
      }),
      adminDb,
    );
    commandData(result);

    const { repositories } = authenticated(ORG_A);
    const [order, items, history, balances, summary, movements] = await Promise.all([
      repositories.procurement.getOrder(PRIVATE_PO),
      repositories.procurement.listOrderItems(PRIVATE_PO),
      repositories.procurement.listOrderHistory(PRIVATE_PO),
      repositories.inventory.listProductBalances(PRODUCT),
      repositories.inventory.getSummary(PRODUCT),
      repositories.movements.list('Q-023', { productId: PRODUCT }),
    ]);
    expect(order?.status).toBe('PARTIALLY_RECEIVED');
    expect(order?.receivingWarehouseId).toBe(MAIN);
    expect(items.items[0]?.receivedBuyerBaseMilli).toBe(20_000);
    expect(history.items).toHaveLength(1);
    expect(balances.items[0]?.onHandMilli).toBe(20_000);
    expect(summary?.onHandMilli).toBe(20_000);
    expect(movements.items[0]?.movementType).toBe('PURCHASE_RECEIPT');
    expect(movements.items[0]?.sourceType).toBe('PRIVATE_PO');
  });

  it('C-29 connected shipment changes supplier projection and stock once, never buyer stock', async () => {
    await seedConnectedChain();
    commandData(await shipConnected());

    const supplier = authenticated(ORG_B);
    const buyer = authenticated(ORG_A);
    const [
      supplierOrder,
      supplierSummary,
      supplierBalances,
      supplierMovements,
      buyerOrder,
      buyerSummary,
    ] = await Promise.all([
      supplier.repositories.procurement.getOrder(CONNECTED_PO),
      supplier.repositories.inventory.getSummary(SUPPLIER_PRODUCT),
      supplier.repositories.inventory.listProductBalances(SUPPLIER_PRODUCT),
      supplier.repositories.movements.list('Q-023', { productId: SUPPLIER_PRODUCT }),
      buyer.repositories.procurement.getOrder(CONNECTED_PO),
      buyer.repositories.inventory.getSummary(BUYER_PRODUCT),
    ]);

    expect(supplierOrder?.status).toBe('SHIPPED');
    expect(supplierSummary?.onHandMilli).toBe(190_000);
    expect(supplierBalances.items[0]?.onHandMilli).toBe(190_000);
    expect(
      supplierMovements.items.filter(
        ({ movementType }) => movementType === 'CONNECTED_DISPATCH_OUT',
      ),
    ).toHaveLength(1);
    expect(buyerOrder?.status).toBe('SHIPPED');
    expect(buyerOrder?.receivingWarehouseId).toBeUndefined();
    expect(buyerSummary?.onHandMilli).toBe(70_000);
    expect(Object.keys(buyerOrder ?? {})).not.toContain('supplierWarehouseId');
    await expect(
      getDoc(doc(buyer.clientDb, serverPaths.connectedPurchaseOrder(CONNECTED_PO))),
    ).rejects.toThrow();
  });

  it('C-30 connected receipts expose partial/final buyer state and never decrement supplier twice', async () => {
    await seedConnectedChain();
    commandData(await shipConnected());
    commandData(await receiveConnected(8000, OP.receiveOne));

    const buyer = authenticated(ORG_A);
    let [order, items, summary] = await Promise.all([
      buyer.repositories.procurement.getOrder(CONNECTED_PO),
      buyer.repositories.procurement.listOrderItems(CONNECTED_PO),
      buyer.repositories.inventory.getSummary(BUYER_PRODUCT),
    ]);
    expect(order?.status).toBe('PARTIALLY_RECEIVED');
    expect(order?.receivingWarehouseId).toBe(COLD);
    expect(items.items[0]?.receivedSupplierMilli).toBe(8000);
    expect(items.items[0]?.receivedBuyerBaseMilli).toBe(40_000);
    expect(summary?.onHandMilli).toBe(110_000);

    commandData(await receiveConnected(2000, OP.receiveTwo));
    const supplier = authenticated(ORG_B);
    const [finalOrder, finalItems, finalBalances, finalSummary, buyerMovements, supplierSummary] =
      await Promise.all([
        buyer.repositories.procurement.getOrder(CONNECTED_PO),
        buyer.repositories.procurement.listOrderItems(CONNECTED_PO),
        buyer.repositories.inventory.listProductBalances(BUYER_PRODUCT),
        buyer.repositories.inventory.getSummary(BUYER_PRODUCT),
        buyer.repositories.movements.list('Q-023', { productId: BUYER_PRODUCT }),
        supplier.repositories.inventory.getSummary(SUPPLIER_PRODUCT),
      ]);
    order = finalOrder;
    items = finalItems;
    summary = finalSummary;
    expect(order?.status).toBe('RECEIVED');
    expect(order?.receivingWarehouseId).toBe(COLD);
    expect(items.items[0]?.receivedSupplierMilli).toBe(10_000);
    expect(items.items[0]?.receivedBuyerBaseMilli).toBe(50_000);
    expect(finalBalances.items[0]?.onHandMilli).toBe(120_000);
    expect(summary?.onHandMilli).toBe(120_000);
    expect(
      buyerMovements.items.filter(({ movementType }) => movementType === 'PURCHASE_RECEIPT'),
    ).toHaveLength(2);
    expect(supplierSummary?.onHandMilli).toBe(190_000);
  });
});

describe('integrated tenant, role, Rules, and immutable-boundary checks', () => {
  it('denies wrong-role commands, cross-org and inactive C2 reads, backend paths, and ledger edits', async () => {
    await seedInventoryProduct();
    const wrongRole = await stockRecordOpeningBalance.execute(
      callable(uidFor(ORG_A, 'VIEWER'), {
        orgId: ORG_A,
        operationId: OP.opening,
        payload: {
          productId: PRODUCT,
          warehouseId: MAIN,
          quantityMilli: 1000,
          effectiveAt: Timestamp.fromMillis(Date.now() - 60_000),
        },
      }),
      adminDb,
    );
    expect(wrongRole.ok).toBe(false);

    const crossOrg = authenticated(ORG_B, uidFor(ORG_A, 'OWNER'));
    await expect(crossOrg.repositories.inventory.getProduct('anything')).rejects.toThrow();

    await seedMember(adminDb, ORG_A, 'VIEWER', { status: 'SUSPENDED' });
    const inactive = authenticated(ORG_A, uidFor(ORG_A, 'VIEWER'));
    await expect(inactive.repositories.inventory.getProduct(PRODUCT)).rejects.toThrow();

    const owner = authenticated(ORG_A);
    await expect(
      getDoc(doc(owner.clientDb, serverPaths.connectedPurchaseOrder('backend-only'))),
    ).rejects.toThrow();

    commandData(
      await stockRecordOpeningBalance.execute(
        callable(uidFor(ORG_A, 'OWNER'), {
          orgId: ORG_A,
          operationId: OP.zeroOpening,
          payload: {
            productId: PRODUCT,
            warehouseId: MAIN,
            quantityMilli: 1000,
            effectiveAt: Timestamp.fromMillis(Date.now() - 60_000),
          },
        }),
        adminDb,
      ),
    );
    const movement = await adminDb
      .collection(`${paths.organization(ORG_A)}/stockMovements`)
      .limit(1)
      .get();
    await expect(
      updateDoc(doc(owner.clientDb, movement.docs[0]?.ref.path ?? ''), { signedQuantityMilli: 2 }),
    ).rejects.toThrow();
  });
});
