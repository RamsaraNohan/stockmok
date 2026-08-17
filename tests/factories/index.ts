import { Timestamp } from 'firebase-admin/firestore';
import type { Role } from '../../packages/shared/src/primitives.js';
import { MemberSchema, OrganizationSchema } from '../../packages/shared/src/schemas/core.js';
import {
  ProductSchema,
  StockBalanceSchema,
  StockMovementSchema,
  WarehouseSchema,
} from '../../packages/shared/src/schemas/inventory.js';
import {
  ConnectedPurchaseOrderSchema,
  CanonicalConnectionSchema,
} from '../../packages/shared/src/schemas/network.js';
import {
  PartnerCatalogItemSchema,
  ProductMappingSchema,
  PurchaseOrderItemSchema,
  PurchaseOrderSchema,
} from '../../packages/shared/src/schemas/procurement.js';

const NOW = Timestamp.fromMillis(1_700_000_000_000);

export function anOrganization(overrides: Record<string, unknown> = {}) {
  return OrganizationSchema.parse({
    organizationId: 'org-1',
    name: 'Example Organization',
    handle: 'example-org',
    industry: 'Hospitality',
    country: 'LK',
    logoUrl: null,
    monogram: 'EO',
    monogramColor: 'blue',
    status: 'ACTIVE',
    ownerUid: 'owner-1',
    createdAt: NOW,
    createdBy: 'owner-1',
    schemaVersion: 1,
    ...overrides,
  });
}

export function aMember(role: Role = 'VIEWER', overrides: Record<string, unknown> = {}) {
  return MemberSchema.parse({
    uid: `member-${role.toLowerCase()}`,
    role,
    status: 'ACTIVE',
    displayName: `${role} Member`,
    email: `${role.toLowerCase()}@example.test`,
    joinedAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });
}

export function aProduct(overrides: Record<string, unknown> = {}) {
  return ProductSchema.parse({
    productId: 'product-1',
    internalSku: 'SKU-001',
    internalSkuNormalized: 'SKU-001',
    name: 'Product One',
    categoryId: 'category-1',
    baseUnit: 'KG',
    purchaseCostMinor: 125_000,
    currency: 'LKR',
    minimumStockMilli: 20_000,
    reorderTargetMilli: 40_000,
    status: 'ACTIVE',
    partnerPublished: false,
    storefrontPublished: false,
    createdAt: NOW,
    createdBy: 'member-1',
    updatedAt: NOW,
    updatedBy: 'member-1',
    ...overrides,
  });
}

export function aWarehouse(overrides: Record<string, unknown> = {}) {
  return WarehouseSchema.parse({
    warehouseId: 'warehouse-1',
    name: 'Main Store',
    type: 'STORE_ROOM',
    status: 'ACTIVE',
    createdAt: NOW,
    createdBy: 'member-1',
    updatedAt: NOW,
    updatedBy: 'member-1',
    ...overrides,
  });
}

export function aBalance(
  product = aProduct(),
  warehouse = aWarehouse(),
  milli = 20_000,
  overrides: Record<string, unknown> = {},
) {
  return StockBalanceSchema.parse({
    productId: product.productId,
    warehouseId: warehouse.warehouseId,
    onHandMilli: milli,
    unit: product.baseUnit,
    productName: product.name,
    internalSku: product.internalSku,
    internalSkuNormalized: product.internalSkuNormalized,
    categoryId: product.categoryId,
    productStatus: product.status,
    baseUnitPriceMinor: product.purchaseCostMinor,
    minimumStockMilli: product.minimumStockMilli,
    productUpdatedAt: product.updatedAt,
    stockValueMinor: (milli * product.purchaseCostMinor) / 1000,
    stockStatus:
      milli === 0 ? 'OUT_OF_STOCK' : milli < product.minimumStockMilli ? 'LOW_STOCK' : 'IN_STOCK',
    shortfallMilli: Math.max(0, product.minimumStockMilli - milli),
    updatedAt: NOW,
    ...overrides,
  });
}

export function aMovement(
  type: string = 'OPENING_BALANCE',
  overrides: Record<string, unknown> = {},
) {
  return StockMovementSchema.parse({
    movementId: 'movement-1',
    productId: 'product-1',
    warehouseId: 'warehouse-1',
    productNameSnapshot: 'Product One',
    skuSnapshot: 'SKU-001',
    movementType: type,
    signedQuantityMilli: type === 'OPENING_BALANCE' ? 20_000 : 1_000,
    unit: 'KG',
    balanceAfterMilli: 20_000,
    sourceType: 'MANUAL',
    operationId: 'operation-1',
    actorUid: 'member-1',
    actorName: 'Example Member',
    warehouseNameSnapshot: 'Main Store',
    effectiveAt: NOW,
    createdAt: NOW,
    ...(type === 'ADJUSTMENT_IN' || type === 'ADJUSTMENT_OUT'
      ? { adjustmentReason: 'RECOUNT_CORRECTION' }
      : {}),
    ...overrides,
  });
}

export function aTransfer(
  product = aProduct(),
  from = aWarehouse(),
  to = aWarehouse({ warehouseId: 'warehouse-2', name: 'Cold Room' }),
  milli = 5_000,
) {
  const transferId = 'transfer-1';
  return {
    out: aMovement('TRANSFER_OUT', {
      movementId: 'transfer-out',
      productId: product.productId,
      warehouseId: from.warehouseId,
      signedQuantityMilli: -milli,
      balanceAfterMilli: 15_000,
      sourceType: 'TRANSFER',
      transferId,
      counterpartWarehouseId: to.warehouseId,
    }),
    in: aMovement('TRANSFER_IN', {
      movementId: 'transfer-in',
      productId: product.productId,
      warehouseId: to.warehouseId,
      signedQuantityMilli: milli,
      balanceAfterMilli: milli,
      sourceType: 'TRANSFER',
      transferId,
      counterpartWarehouseId: from.warehouseId,
    }),
  };
}

export function aPrivatePO(
  lines = [
    PurchaseOrderItemSchema.parse({
      itemId: 'item-1',
      buyerProductId: 'product-1',
      buyerProductNameSnapshot: 'Product One',
      buyerSkuSnapshot: 'SKU-001',
      buyerBaseUnitSnapshot: 'KG',
      orderedBuyerBaseMilli: 10_000,
      receivedBuyerBaseMilli: 0,
      unitPriceMinor: 125_000,
      lineTotalMinor: 1_250_000,
      currency: 'LKR',
    }),
  ],
) {
  return {
    order: PurchaseOrderSchema.parse({
      purchaseOrderId: 'po-1',
      viewRole: 'BUYER',
      supplierKind: 'PRIVATE',
      counterpartyName: 'Private Supplier',
      privateSupplierId: 'supplier-1',
      status: 'DRAFT',
      currency: 'LKR',
      totalMinor: 1_250_000,
      isProjection: false,
      createdBy: 'member-1',
      createdAt: NOW,
    }),
    lines,
  };
}

export function aConnection(status: string = 'ACTIVE') {
  return CanonicalConnectionSchema.parse({
    connectionId: 'buyer-org__supplier-org',
    buyerOrgId: 'buyer-org',
    supplierOrgId: 'supplier-org',
    buyerHandle: 'buyer-org',
    buyerName: 'Buyer Org',
    supplierHandle: 'supplier-org',
    supplierName: 'Supplier Org',
    status,
    requestedByUid: 'buyer-1',
    requestedAt: NOW,
    updatedAt: NOW,
  });
}

export function aCatalogItem(overrides: Record<string, unknown> = {}) {
  return PartnerCatalogItemSchema.parse({
    catalogItemId: 'catalog-1',
    sourceProductId: 'product-1',
    internalProductNameSnapshot: 'Product One',
    internalSkuSnapshot: 'SKU-001',
    partnerSku: 'PSKU-001',
    partnerSkuNormalized: 'PSKU-001',
    displayName: 'Product One Pack',
    orderUnit: 'PACK',
    availabilityState: 'IN_STOCK',
    published: true,
    updatedAt: NOW,
    ...overrides,
  });
}

export function aMapping(overrides: Record<string, unknown> = {}) {
  return ProductMappingSchema.parse({
    mappingId: 'mapping-1',
    connectionId: 'buyer-org__supplier-org',
    buyerOrgId: 'buyer-org',
    buyerProductId: 'product-1',
    buyerProductNameSnapshot: 'Product One',
    buyerSkuSnapshot: 'SKU-001',
    supplierOrgId: 'supplier-org',
    supplierCatalogItemId: 'catalog-1',
    supplierPartnerSkuSnapshot: 'PSKU-001',
    supplierDisplayNameSnapshot: 'Product One Pack',
    buyerBaseUnit: 'KG',
    supplierOrderUnit: 'PACK',
    supplierToBuyerBaseFactorMilli: 5_000,
    semanticConfirmedByUid: 'member-1',
    semanticConfirmedByName: 'Example Member',
    semanticConfirmedAt: NOW,
    status: 'VERIFIED',
    createdAt: NOW,
    ...overrides,
  });
}

export function aConnectedPO(status: string = 'DRAFT') {
  return ConnectedPurchaseOrderSchema.parse({
    purchaseOrderId: 'cpo-1',
    viewRole: 'BUYER',
    supplierKind: 'CONNECTED',
    counterpartyName: 'Supplier Org',
    counterpartyOrgId: 'supplier-org',
    counterpartyHandle: 'supplier-org',
    connectionId: 'buyer-org__supplier-org',
    status,
    currency: 'LKR',
    totalMinor: 1_250_000,
    isProjection: false,
    createdBy: 'member-1',
    createdAt: NOW,
    buyerOrgId: 'buyer-org',
    supplierOrgId: 'supplier-org',
  });
}
