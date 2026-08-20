import { pathToFileURL } from 'node:url';

import {
  ProductSchema,
  ProductStockSummarySchema,
  StockBalanceSchema,
} from '../../packages/shared/src/schemas/inventory.js';
import {
  PrivatePartnerSchema,
  PurchaseOrderItemSchema,
  PurchaseOrderSchema,
} from '../../packages/shared/src/schemas/procurement.js';
import {
  deriveShortfall,
  deriveStockStatus,
  deriveStockValueMinor,
} from '../../packages/shared/src/domain.js';
import { paths } from '../../packages/shared/src/paths.js';
import { getBootstrapContext } from './context.js';
import { CLOCK, IDS } from './fixtures.js';
import { setValidated } from './write.js';

const PRODUCTS = [
  ['a10-opening', 'A10 Opening Product', 'A10-OPEN', 0],
  ['a10-adjust', 'A10 Adjustment Product', 'A10-ADJUST', 20_000],
  ['a10-transfer', 'A10 Transfer Product', 'A10-TRANSFER', 20_000],
  ['a10-order', 'A10 Order Product', 'A10-ORDER', 10_000],
  ['a10-cancel', 'A10 Cancel Product', 'A10-CANCEL', 10_000],
  ['a10-receive-partial', 'A10 Partial Receipt Product', 'A10-PARTIAL', 10_000],
  ['a10-receive-full', 'A10 Full Receipt Product', 'A10-FULL', 10_000],
  ['a10-receive-over', 'A10 Over Receipt Product', 'A10-OVER', 10_000],
] as const;

const PURCHASE_ORDERS = [
  ['a10-po-order', 'a10-order', 'DRAFT', undefined],
  ['a10-po-cancel', 'a10-cancel', 'ORDERED', 'A10-CANCEL-001'],
  ['a10-po-partial', 'a10-receive-partial', 'ORDERED', 'A10-PARTIAL-001'],
  ['a10-po-full', 'a10-receive-full', 'ORDERED', 'A10-FULL-001'],
  ['a10-po-over', 'a10-receive-over', 'ORDERED', 'A10-OVER-001'],
] as const;

export async function seedA10Fixtures(): Promise<void> {
  const { db } = getBootstrapContext();
  const batch = db.batch();

  for (const [productId, name, sku, onHandMilli] of PRODUCTS) {
    const minimumStockMilli = 5_000;
    const purchaseCostMinor = 10_000;
    const stockStatus = deriveStockStatus(onHandMilli, minimumStockMilli);
    const stockValueMinor = deriveStockValueMinor(onHandMilli, purchaseCostMinor);
    const common = {
      productId,
      productName: name,
      internalSku: sku,
      internalSkuNormalized: sku,
      categoryId: 'dry-goods',
      productStatus: 'ACTIVE' as const,
      baseUnitPriceMinor: purchaseCostMinor,
      productUpdatedAt: CLOCK.t0,
    };

    setValidated(db, batch, paths.product(IDS.grandOrg, productId), ProductSchema, {
      productId,
      internalSku: sku,
      internalSkuNormalized: sku,
      name,
      categoryId: 'dry-goods',
      baseUnit: 'KG',
      purchaseCostMinor,
      currency: 'LKR',
      minimumStockMilli,
      reorderTargetMilli: 10_000,
      status: 'ACTIVE',
      partnerPublished: false,
      storefrontPublished: false,
      createdAt: CLOCK.t0,
      createdBy: 'grand-inventory',
      updatedAt: CLOCK.t0,
      updatedBy: 'grand-inventory',
    });
    setValidated(
      db,
      batch,
      paths.productStockSummary(IDS.grandOrg, productId),
      ProductStockSummarySchema,
      {
        ...common,
        onHandMilli,
        reservedMilli: 0,
        availableMilli: onHandMilli,
        minimumStockMilli,
        stockStatus,
        stockValueMinor,
        shortfallMilli: deriveShortfall(minimumStockMilli, onHandMilli),
        unit: 'KG',
        updatedAt: CLOCK.t0,
      },
    );
    if (onHandMilli > 0) {
      setValidated(
        db,
        batch,
        paths.stockBalance(IDS.grandOrg, productId, IDS.mainWarehouse),
        StockBalanceSchema,
        {
          ...common,
          warehouseId: IDS.mainWarehouse,
          onHandMilli,
          unit: 'KG',
          minimumStockMilli,
          stockValueMinor,
          stockStatus,
          shortfallMilli: deriveShortfall(minimumStockMilli, onHandMilli),
          updatedAt: CLOCK.t0,
        },
      );
    }
  }

  for (const [purchaseOrderId, productId, status, orderNumber] of PURCHASE_ORDERS) {
    setValidated(
      db,
      batch,
      paths.purchaseOrder(IDS.grandOrg, purchaseOrderId),
      PurchaseOrderSchema,
      {
        purchaseOrderId,
        ...(orderNumber ? { orderNumber } : {}),
        viewRole: 'BUYER',
        supplierKind: 'PRIVATE',
        counterpartyName: 'Green Farm',
        privateSupplierId: IDS.privatePartner,
        status,
        currency: 'LKR',
        totalMinor: 100_000,
        isProjection: false,
        createdBy: 'grand-procurement',
        createdAt: CLOCK.t0,
        ...(status === 'ORDERED' ? { orderedAt: CLOCK.t0 } : {}),
      },
    );
    setValidated(
      db,
      batch,
      paths.purchaseOrderItem(IDS.grandOrg, purchaseOrderId, 'line-1'),
      PurchaseOrderItemSchema,
      {
        itemId: 'line-1',
        buyerProductId: productId,
        buyerProductNameSnapshot: PRODUCTS.find(([id]) => id === productId)?.[1] ?? productId,
        buyerSkuSnapshot: PRODUCTS.find(([id]) => id === productId)?.[2] ?? productId,
        buyerBaseUnitSnapshot: 'KG',
        orderedBuyerBaseMilli: 10_000,
        receivedBuyerBaseMilli: 0,
        unitPriceMinor: 10_000,
        lineTotalMinor: 100_000,
        currency: 'LKR',
      },
    );
  }

  setValidated(
    db,
    batch,
    paths.privatePartner(IDS.grandOrg, 'a10-partner-status'),
    PrivatePartnerSchema,
    {
      partnerId: 'a10-partner-status',
      partnerTypes: ['SUPPLIER'],
      name: 'A10 Status Supplier',
      status: 'ACTIVE',
      ordersPlacedCount: 0,
      createdAt: CLOCK.t0,
      createdBy: 'grand-procurement',
      updatedAt: CLOCK.t0,
      updatedBy: 'grand-procurement',
    },
  );

  batch.update(db.doc(paths.privatePartner(IDS.grandOrg, IDS.privatePartner)), {
    ordersPlacedCount: 4,
  });
  await batch.commit();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await seedA10Fixtures();
  console.log('A10_PREREQUISITE_FIXTURES=PASS');
}
