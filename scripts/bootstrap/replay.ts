import { pathToFileURL } from 'node:url';
import {
  ProductStockSummarySchema,
  StockBalanceSchema,
  StockMovementSchema,
} from '../../packages/shared/src/schemas/inventory.js';
import {
  ConnectedHistorySchema,
  ConnectedPurchaseOrderItemSchema,
  ConnectedPurchaseOrderSchema,
  ConnectionProjectionSchema,
} from '../../packages/shared/src/schemas/network.js';
import {
  PurchaseOrderHistorySchema,
  PurchaseOrderItemSchema,
  PurchaseOrderSchema,
  PrivatePartnerSchema,
} from '../../packages/shared/src/schemas/procurement.js';
import {
  deriveShortfall,
  deriveStockStatus,
  deriveStockValueMinor,
} from '../../packages/shared/src/domain.js';
import { paths } from '../../packages/shared/src/paths.js';
import { serverPaths } from '../../packages/shared/src/server/paths.js';
import { getBootstrapContext, type BootstrapContext } from './context.js';
import { CLOCK, IDS } from './fixtures.js';
import { setValidated } from './write.js';

const MEAT_PRODUCT = {
  productId: 'meat-001',
  productName: 'Chicken Breast',
  sku: 'MEAT-001',
  categoryId: 'meat',
  unit: 'KG',
  minimumStockMilli: 20_000,
  unitPriceMinor: 125_000,
} as const;

const FINAL_MEAT_ON_HAND = 120_000;
const FINAL_MEAT_VALUE = deriveStockValueMinor(FINAL_MEAT_ON_HAND, MEAT_PRODUCT.unitPriceMinor);

function meatBalance(updatedAt: typeof CLOCK.connectedSecond) {
  return {
    productId: MEAT_PRODUCT.productId,
    warehouseId: IDS.coldWarehouse,
    onHandMilli: FINAL_MEAT_ON_HAND,
    unit: MEAT_PRODUCT.unit,
    productName: MEAT_PRODUCT.productName,
    internalSku: MEAT_PRODUCT.sku,
    internalSkuNormalized: MEAT_PRODUCT.sku,
    categoryId: MEAT_PRODUCT.categoryId,
    productStatus: 'ACTIVE',
    baseUnitPriceMinor: MEAT_PRODUCT.unitPriceMinor,
    minimumStockMilli: MEAT_PRODUCT.minimumStockMilli,
    productUpdatedAt: CLOCK.t0,
    stockValueMinor: FINAL_MEAT_VALUE,
    stockStatus: deriveStockStatus(FINAL_MEAT_ON_HAND, MEAT_PRODUCT.minimumStockMilli),
    shortfallMilli: deriveShortfall(MEAT_PRODUCT.minimumStockMilli, FINAL_MEAT_ON_HAND),
    updatedAt,
  } as const;
}

function meatSummary(updatedAt: typeof CLOCK.connectedSecond) {
  const balance = meatBalance(updatedAt);
  return {
    productId: balance.productId,
    productName: balance.productName,
    internalSku: balance.internalSku,
    internalSkuNormalized: balance.internalSkuNormalized,
    categoryId: balance.categoryId,
    productStatus: balance.productStatus,
    baseUnitPriceMinor: balance.baseUnitPriceMinor,
    productUpdatedAt: balance.productUpdatedAt,
    onHandMilli: balance.onHandMilli,
    reservedMilli: 0,
    availableMilli: balance.onHandMilli,
    minimumStockMilli: balance.minimumStockMilli,
    stockStatus: balance.stockStatus,
    stockValueMinor: balance.stockValueMinor,
    shortfallMilli: balance.shortfallMilli,
    unit: balance.unit,
    updatedAt,
  } as const;
}

export async function replayBootstrap(
  context: BootstrapContext = getBootstrapContext(),
): Promise<void> {
  const { db } = context;
  const batch = db.batch();

  const laterMovements = [
    {
      movementId: 'meat-adjustment-20260803',
      movementType: 'ADJUSTMENT_IN',
      signedQuantityMilli: 2_000,
      balanceAfterMilli: 20_000,
      sourceType: 'MANUAL',
      operationId: 'bootstrap-adjust-meat-001',
      adjustmentReason: 'RECOUNT_CORRECTION',
      actorUid: 'grand-inventory',
      actorName: 'Nimal Perera',
      effectiveAt: CLOCK.adjustment,
    },
    {
      movementId: 'meat-private-receipt-1',
      movementType: 'PURCHASE_RECEIPT',
      signedQuantityMilli: 40_000,
      balanceAfterMilli: 60_000,
      sourceType: 'PRIVATE_PO',
      sourceId: IDS.privatePo,
      sourceReferenceSnapshot: 'PO-2026-001',
      operationId: 'bootstrap-private-receipt-1',
      actorUid: 'grand-inventory',
      actorName: 'Nimal Perera',
      effectiveAt: CLOCK.privateFirst,
    },
    {
      movementId: 'meat-private-receipt-2',
      movementType: 'PURCHASE_RECEIPT',
      signedQuantityMilli: 10_000,
      balanceAfterMilli: 70_000,
      sourceType: 'PRIVATE_PO',
      sourceId: IDS.privatePo,
      sourceReferenceSnapshot: 'PO-2026-001',
      operationId: 'bootstrap-private-receipt-2',
      actorUid: 'grand-inventory',
      actorName: 'Nimal Perera',
      effectiveAt: CLOCK.privateSecond,
    },
    {
      movementId: 'meat-connected-receipt-1',
      movementType: 'PURCHASE_RECEIPT',
      signedQuantityMilli: 40_000,
      balanceAfterMilli: 110_000,
      sourceType: 'CONNECTED_PO',
      sourceId: IDS.connectedPo,
      sourceReferenceSnapshot: 'CPO-2026-003',
      operationId: 'bootstrap-connected-receipt-1',
      actorUid: 'grand-inventory',
      actorName: 'Nimal Perera',
      effectiveAt: CLOCK.connectedFirst,
    },
    {
      movementId: 'meat-connected-receipt-2',
      movementType: 'PURCHASE_RECEIPT',
      signedQuantityMilli: 10_000,
      balanceAfterMilli: 120_000,
      sourceType: 'CONNECTED_PO',
      sourceId: IDS.connectedPo,
      sourceReferenceSnapshot: 'CPO-2026-003',
      operationId: 'bootstrap-connected-receipt-2',
      actorUid: 'grand-inventory',
      actorName: 'Nimal Perera',
      effectiveAt: CLOCK.connectedSecond,
    },
  ] as const;
  for (const movement of laterMovements) {
    setValidated(
      db,
      batch,
      paths.stockMovement(IDS.grandOrg, movement.movementId),
      StockMovementSchema,
      {
        ...movement,
        productId: MEAT_PRODUCT.productId,
        warehouseId: IDS.coldWarehouse,
        productNameSnapshot: MEAT_PRODUCT.productName,
        skuSnapshot: MEAT_PRODUCT.sku,
        unit: MEAT_PRODUCT.unit,
        warehouseNameSnapshot: 'Cold Room',
        createdAt: movement.effectiveAt,
      },
    );
  }
  setValidated(
    db,
    batch,
    paths.stockBalance(IDS.grandOrg, MEAT_PRODUCT.productId, IDS.coldWarehouse),
    StockBalanceSchema,
    meatBalance(CLOCK.connectedSecond),
  );
  setValidated(
    db,
    batch,
    paths.productStockSummary(IDS.grandOrg, MEAT_PRODUCT.productId),
    ProductStockSummarySchema,
    meatSummary(CLOCK.connectedSecond),
  );

  setValidated(db, batch, paths.purchaseOrder(IDS.grandOrg, IDS.privatePo), PurchaseOrderSchema, {
    purchaseOrderId: IDS.privatePo,
    orderNumber: 'PO-2026-001',
    viewRole: 'BUYER',
    supplierKind: 'PRIVATE',
    counterpartyName: 'Green Farm',
    privateSupplierId: IDS.privatePartner,
    status: 'RECEIVED',
    currency: 'LKR',
    receivingWarehouseId: IDS.coldWarehouse,
    totalMinor: 6_250_000,
    isProjection: false,
    lastOperationId: 'bootstrap-private-receipt-2',
    createdBy: 'grand-procurement',
    createdAt: CLOCK.adjustment,
    orderedAt: CLOCK.adjustment,
    receivedAt: CLOCK.privateSecond,
  });
  setValidated(
    db,
    batch,
    paths.purchaseOrderItem(IDS.grandOrg, IDS.privatePo, 'item-meat-001'),
    PurchaseOrderItemSchema,
    {
      itemId: 'item-meat-001',
      buyerProductId: MEAT_PRODUCT.productId,
      buyerProductNameSnapshot: MEAT_PRODUCT.productName,
      buyerSkuSnapshot: MEAT_PRODUCT.sku,
      buyerBaseUnitSnapshot: 'KG',
      orderedBuyerBaseMilli: 50_000,
      receivedBuyerBaseMilli: 50_000,
      unitPriceMinor: MEAT_PRODUCT.unitPriceMinor,
      lineTotalMinor: 6_250_000,
      currency: 'LKR',
    },
  );
  for (const history of [
    {
      historyId: 'ordered',
      fromStatus: 'DRAFT',
      toStatus: 'ORDERED',
      createdAt: CLOCK.adjustment,
      operationId: 'bootstrap-private-order',
    },
    {
      historyId: 'received-1',
      fromStatus: 'ORDERED',
      toStatus: 'PARTIALLY_RECEIVED',
      createdAt: CLOCK.privateFirst,
      operationId: 'bootstrap-private-receipt-1',
    },
    {
      historyId: 'received-2',
      fromStatus: 'PARTIALLY_RECEIVED',
      toStatus: 'RECEIVED',
      createdAt: CLOCK.privateSecond,
      operationId: 'bootstrap-private-receipt-2',
    },
  ] as const) {
    setValidated(
      db,
      batch,
      paths.purchaseOrderHistory(IDS.grandOrg, IDS.privatePo, history.historyId),
      PurchaseOrderHistorySchema,
      {
        ...history,
        actorUid: 'grand-procurement',
        actorName: 'Grand Ocean Procurement Manager',
        actorOrgId: IDS.grandOrg,
        actorOrgName: 'Grand Ocean Hotel',
      },
    );
  }
  setValidated(
    db,
    batch,
    paths.privatePartner(IDS.grandOrg, IDS.privatePartner),
    PrivatePartnerSchema,
    {
      partnerId: IDS.privatePartner,
      partnerTypes: ['SUPPLIER'],
      name: 'Green Farm',
      status: 'ACTIVE',
      ordersPlacedCount: 1,
      createdAt: CLOCK.t0,
      createdBy: 'grand-procurement',
      updatedAt: CLOCK.privateSecond,
      updatedBy: 'grand-procurement',
    },
  );

  const connectedProjection = {
    purchaseOrderId: IDS.connectedPo,
    orderNumber: 'CPO-2026-003',
    viewRole: 'BUYER',
    supplierKind: 'CONNECTED',
    counterpartyName: 'Fresh Foods Ltd',
    counterpartyOrgId: IDS.freshOrg,
    counterpartyHandle: 'freshfoods',
    connectionId: IDS.connection,
    status: 'RECEIVED',
    currency: 'LKR',
    receivingWarehouseId: IDS.coldWarehouse,
    totalMinor: 6_250_000,
    isProjection: false,
    lastOperationId: 'bootstrap-connected-receipt-2',
    createdBy: 'grand-procurement',
    createdAt: CLOCK.privateSecond,
    submittedAt: CLOCK.privateSecond,
    acceptedAt: CLOCK.privateSecond,
    shippedAt: CLOCK.connectedShip,
    receivedAt: CLOCK.connectedSecond,
  } as const;
  const connectedOrder = {
    ...connectedProjection,
    buyerOrgId: IDS.grandOrg,
    supplierOrgId: IDS.freshOrg,
  } as const;
  const connectedItem = {
    itemId: 'item-meat-001',
    buyerProductId: MEAT_PRODUCT.productId,
    buyerProductNameSnapshot: MEAT_PRODUCT.productName,
    buyerSkuSnapshot: MEAT_PRODUCT.sku,
    buyerBaseUnitSnapshot: 'KG',
    orderedBuyerBaseMilli: 50_000,
    receivedBuyerBaseMilli: 50_000,
    unitPriceMinor: MEAT_PRODUCT.unitPriceMinor,
    lineTotalMinor: 6_250_000,
    currency: 'LKR',
    mappingId: IDS.mapping,
    supplierCatalogItemId: 'catalog-ckn-b5',
    supplierProductNameSnapshot: 'Chicken Breast 5 KG Pack',
    supplierSkuSnapshot: 'CKN-B5',
    supplierOrderUnitSnapshot: 'PACK',
    orderedSupplierMilli: 10_000,
    receivedSupplierMilli: 10_000,
    supplierToBuyerBaseFactorMilliSnapshot: 5_000,
  } as const;
  setValidated(
    db,
    batch,
    serverPaths.connectedPurchaseOrder(IDS.connectedPo),
    ConnectedPurchaseOrderSchema,
    connectedOrder,
  );
  setValidated(
    db,
    batch,
    serverPaths.connectedPurchaseOrderItem(IDS.connectedPo, connectedItem.itemId),
    ConnectedPurchaseOrderItemSchema,
    connectedItem,
  );
  setValidated(db, batch, paths.purchaseOrder(IDS.grandOrg, IDS.connectedPo), PurchaseOrderSchema, {
    ...connectedProjection,
    isProjection: true,
  });
  setValidated(
    db,
    batch,
    paths.purchaseOrderItem(IDS.grandOrg, IDS.connectedPo, connectedItem.itemId),
    PurchaseOrderItemSchema,
    connectedItem,
  );
  setValidated(db, batch, paths.purchaseOrder(IDS.freshOrg, IDS.connectedPo), PurchaseOrderSchema, {
    ...connectedProjection,
    viewRole: 'SUPPLIER',
    counterpartyName: 'Grand Ocean Hotel',
    counterpartyOrgId: IDS.grandOrg,
    counterpartyHandle: 'grand-ocean',
    isProjection: true,
  });
  setValidated(
    db,
    batch,
    paths.purchaseOrderItem(IDS.freshOrg, IDS.connectedPo, connectedItem.itemId),
    PurchaseOrderItemSchema,
    connectedItem,
  );

  for (const history of [
    {
      historyId: 'submitted',
      fromStatus: 'DRAFT',
      toStatus: 'SUBMITTED',
      createdAt: CLOCK.privateSecond,
      operationId: 'bootstrap-cpo-submit',
      actorUid: 'grand-procurement',
      actorName: 'Grand Ocean Procurement Manager',
      actorOrgId: IDS.grandOrg,
      actorOrgName: 'Grand Ocean Hotel',
    },
    {
      historyId: 'accepted',
      fromStatus: 'SUBMITTED',
      toStatus: 'ACCEPTED',
      createdAt: CLOCK.privateSecond,
      operationId: 'bootstrap-cpo-accept',
      actorUid: 'fresh-owner',
      actorName: 'Fresh Foods Owner',
      actorOrgId: IDS.freshOrg,
      actorOrgName: 'Fresh Foods Ltd',
    },
    {
      historyId: 'shipped',
      fromStatus: 'ACCEPTED',
      toStatus: 'SHIPPED',
      createdAt: CLOCK.connectedShip,
      operationId: 'bootstrap-cpo-ship',
      actorUid: 'fresh-owner',
      actorName: 'Fresh Foods Owner',
      actorOrgId: IDS.freshOrg,
      actorOrgName: 'Fresh Foods Ltd',
    },
    {
      historyId: 'received-1',
      fromStatus: 'SHIPPED',
      toStatus: 'PARTIALLY_RECEIVED',
      createdAt: CLOCK.connectedFirst,
      operationId: 'bootstrap-connected-receipt-1',
      actorUid: 'grand-inventory',
      actorName: 'Nimal Perera',
      actorOrgId: IDS.grandOrg,
      actorOrgName: 'Grand Ocean Hotel',
    },
    {
      historyId: 'received-2',
      fromStatus: 'PARTIALLY_RECEIVED',
      toStatus: 'RECEIVED',
      createdAt: CLOCK.connectedSecond,
      operationId: 'bootstrap-connected-receipt-2',
      actorUid: 'grand-inventory',
      actorName: 'Nimal Perera',
      actorOrgId: IDS.grandOrg,
      actorOrgName: 'Grand Ocean Hotel',
    },
  ] as const) {
    setValidated(
      db,
      batch,
      serverPaths.connectedPurchaseOrderHistory(IDS.connectedPo, history.historyId),
      ConnectedHistorySchema,
      history,
    );
  }

  const supplierOnHand = 190_000;
  const supplierCommon = {
    productId: 'ff-chk-05',
    productName: 'Chicken Breast 5 KG Pack',
    internalSku: 'FF-CHK-05',
    internalSkuNormalized: 'FF-CHK-05',
    categoryId: 'meat',
    productStatus: 'ACTIVE',
    baseUnitPriceMinor: 0,
    productUpdatedAt: CLOCK.t0,
  } as const;
  setValidated(
    db,
    batch,
    paths.stockBalance(IDS.freshOrg, 'ff-chk-05', IDS.freshWarehouse),
    StockBalanceSchema,
    {
      ...supplierCommon,
      warehouseId: IDS.freshWarehouse,
      onHandMilli: supplierOnHand,
      unit: 'PACK',
      minimumStockMilli: 0,
      stockValueMinor: 0,
      stockStatus: 'IN_STOCK',
      shortfallMilli: 0,
      updatedAt: CLOCK.connectedShip,
    },
  );
  setValidated(
    db,
    batch,
    paths.productStockSummary(IDS.freshOrg, 'ff-chk-05'),
    ProductStockSummarySchema,
    {
      ...supplierCommon,
      onHandMilli: supplierOnHand,
      reservedMilli: 0,
      availableMilli: supplierOnHand,
      minimumStockMilli: 0,
      stockStatus: 'IN_STOCK',
      stockValueMinor: 0,
      shortfallMilli: 0,
      unit: 'PACK',
      updatedAt: CLOCK.connectedShip,
    },
  );
  setValidated(
    db,
    batch,
    paths.stockMovement(IDS.freshOrg, 'dispatch-cpo-2026-003'),
    StockMovementSchema,
    {
      movementId: 'dispatch-cpo-2026-003',
      productId: 'ff-chk-05',
      warehouseId: IDS.freshWarehouse,
      productNameSnapshot: 'Chicken Breast 5 KG Pack',
      skuSnapshot: 'FF-CHK-05',
      movementType: 'CONNECTED_DISPATCH_OUT',
      signedQuantityMilli: -10_000,
      unit: 'PACK',
      balanceAfterMilli: 190_000,
      sourceType: 'CONNECTED_PO',
      sourceId: IDS.connectedPo,
      sourceReferenceSnapshot: 'CPO-2026-003',
      operationId: 'bootstrap-cpo-ship',
      actorUid: 'fresh-owner',
      actorName: 'Fresh Foods Owner',
      warehouseNameSnapshot: 'Supplier Stock',
      effectiveAt: CLOCK.connectedShip,
      createdAt: CLOCK.connectedShip,
    },
  );

  const connection = {
    connectionId: IDS.connection,
    buyerOrgId: IDS.grandOrg,
    supplierOrgId: IDS.freshOrg,
    buyerHandle: 'grand-ocean',
    buyerName: 'Grand Ocean Hotel',
    supplierHandle: 'freshfoods',
    supplierName: 'Fresh Foods Ltd',
    status: 'ACTIVE',
    requestedByUid: 'grand-procurement',
    requestedAt: CLOCK.t0,
    respondedByUid: 'fresh-owner',
    respondedAt: CLOCK.t0,
    updatedAt: CLOCK.connectedSecond,
    ordersPlacedCount: 1,
  } as const;
  setValidated(
    db,
    batch,
    paths.connectionProjection(IDS.grandOrg, IDS.connection),
    ConnectionProjectionSchema,
    connection,
  );
  setValidated(
    db,
    batch,
    paths.connectionProjection(IDS.freshOrg, IDS.connection),
    ConnectionProjectionSchema,
    connection,
  );

  await batch.commit();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await replayBootstrap();
  console.log('BOOTSTRAP_REPLAY=PASS');
}
