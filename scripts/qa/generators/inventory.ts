import {
  deriveShortfall,
  deriveStockStatus,
  deriveStockValueMinor,
  normalizeSku,
} from '../../../packages/shared/src/domain.js';
import { paths } from '../../../packages/shared/src/paths.js';
import {
  CategorySchema,
  ProductSkuIndexSchema,
} from '../../../packages/shared/src/schemas/core.js';
import {
  ProductSchema,
  ProductStockSummarySchema,
  StockBalanceSchema,
  WarehouseSchema,
} from '../../../packages/shared/src/schemas/inventory.js';
import type { DatasetBuilder, QaOrg, QaPlan, QaProduct } from '../dataset.js';
import { QA_CLOCK, epochPlus } from '../deterministic.js';

/**
 * Categories, warehouses, products, and the two read models over them.
 *
 * Every derived field is computed with the production helpers from
 * `packages/shared/src/domain.ts` rather than re-implemented here, so a fixture
 * cannot quietly disagree with the rule the application enforces.
 */

export function productUpdatedAt(product: QaProduct): ReturnType<typeof epochPlus> {
  return epochPlus(product.updatedAtDayOffset, 9);
}

export function totalOnHandMilli(product: QaProduct): number {
  return Object.values(product.targetOnHandMilli).reduce((sum, value) => sum + value, 0);
}

function writeTaxonomy(builder: DatasetBuilder, org: QaOrg): void {
  for (const category of org.categories) {
    builder.add(paths.category(org.orgId, category.categoryId), CategorySchema, {
      categoryId: category.categoryId,
      name: category.name,
      description: `${category.name} for ${org.name}`,
      status: 'ACTIVE',
      createdAt: QA_CLOCK.catalogReady,
      createdBy: org.ownerUid,
      updatedAt: QA_CLOCK.catalogReady,
      updatedBy: org.ownerUid,
    });
  }

  for (const warehouse of org.warehouses) {
    builder.add(paths.warehouse(org.orgId, warehouse.warehouseId), WarehouseSchema, {
      warehouseId: warehouse.warehouseId,
      name: warehouse.name,
      code: warehouse.warehouseId.toUpperCase(),
      type: warehouse.type,
      status: 'ACTIVE',
      address: `${warehouse.name}, ${org.name}`,
      createdAt: QA_CLOCK.catalogReady,
      createdBy: org.ownerUid,
      updatedAt: QA_CLOCK.catalogReady,
      updatedBy: org.ownerUid,
    });
  }
}

function writeProducts(builder: DatasetBuilder, org: QaOrg): void {
  for (const product of org.products) {
    const skuNormalized = normalizeSku(product.internalSku);
    const updatedAt = productUpdatedAt(product);

    builder.add(paths.product(org.orgId, product.productId), ProductSchema, {
      productId: product.productId,
      internalSku: product.internalSku,
      internalSkuNormalized: skuNormalized,
      name: product.name,
      description: `${product.name} held by ${org.name}`,
      categoryId: product.categoryId,
      baseUnit: product.baseUnit,
      purchaseCostMinor: product.purchaseCostMinor,
      currency: org.currency,
      minimumStockMilli: product.minimumStockMilli,
      reorderTargetMilli: product.reorderTargetMilli,
      status: product.status,
      partnerPublished: product.partnerPublished,
      storefrontPublished: false,
      createdAt: QA_CLOCK.catalogReady,
      createdBy: org.ownerUid,
      updatedAt,
      updatedBy: org.ownerUid,
    });

    builder.add(paths.productSkuIndex(org.orgId, skuNormalized), ProductSkuIndexSchema, {
      productId: product.productId,
      createdAt: QA_CLOCK.catalogReady,
    });
  }
}

function writeReadModels(builder: DatasetBuilder, org: QaOrg): void {
  for (const product of org.products) {
    const skuNormalized = normalizeSku(product.internalSku);
    const updatedAt = productUpdatedAt(product);

    for (const warehouseId of product.warehouseIds) {
      const onHandMilli = product.targetOnHandMilli[warehouseId] ?? 0;
      builder.add(
        paths.stockBalance(org.orgId, product.productId, warehouseId),
        StockBalanceSchema,
        {
          productId: product.productId,
          warehouseId,
          onHandMilli,
          unit: product.baseUnit,
          productName: product.name,
          internalSku: product.internalSku,
          internalSkuNormalized: skuNormalized,
          categoryId: product.categoryId,
          productStatus: product.status,
          baseUnitPriceMinor: product.purchaseCostMinor,
          minimumStockMilli: product.minimumStockMilli,
          productUpdatedAt: updatedAt,
          stockValueMinor: deriveStockValueMinor(onHandMilli, product.purchaseCostMinor),
          stockStatus: deriveStockStatus(onHandMilli, product.minimumStockMilli),
          shortfallMilli: deriveShortfall(product.minimumStockMilli, onHandMilli),
          updatedAt: QA_CLOCK.firstMovement,
        },
      );
    }

    const total = totalOnHandMilli(product);
    builder.add(
      paths.productStockSummary(org.orgId, product.productId),
      ProductStockSummarySchema,
      {
        productId: product.productId,
        productName: product.name,
        internalSku: product.internalSku,
        internalSkuNormalized: skuNormalized,
        categoryId: product.categoryId,
        productStatus: product.status,
        baseUnitPriceMinor: product.purchaseCostMinor,
        productUpdatedAt: updatedAt,
        onHandMilli: total,
        reservedMilli: 0,
        availableMilli: total,
        minimumStockMilli: product.minimumStockMilli,
        stockStatus: deriveStockStatus(total, product.minimumStockMilli),
        stockValueMinor: deriveStockValueMinor(total, product.purchaseCostMinor),
        shortfallMilli: deriveShortfall(product.minimumStockMilli, total),
        unit: product.baseUnit,
        updatedAt: QA_CLOCK.firstMovement,
      },
    );
  }
}

export function generateInventory(builder: DatasetBuilder, plan: QaPlan): void {
  for (const org of plan.organizations) {
    writeTaxonomy(builder, org);
    writeProducts(builder, org);
    writeReadModels(builder, org);
  }
}
