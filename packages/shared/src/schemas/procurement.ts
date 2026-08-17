import { z } from 'zod';
import {
  AvailabilitySchema,
  CurrencySchema,
  IdSchema,
  MappingStatusSchema,
  MilliSchema,
  MinorSchema,
  PartnerStatusSchema,
  PoStatusSchema,
  SupplierKindSchema,
  TimestampSchema,
  UnitSchema,
  ViewRoleSchema,
} from '../primitives.js';

export const PrivatePartnerSchema = z
  .object({
    partnerId: IdSchema,
    partnerTypes: z
      .array(z.enum(['SUPPLIER', 'BUYER']))
      .min(1)
      .max(2),
    name: z.string().min(1).max(120),
    contactPerson: z.string().max(120).optional(),
    email: z.email().optional(),
    phone: z.string().max(40).optional(),
    address: z.string().max(400).optional(),
    notes: z.string().max(1000).optional(),
    status: PartnerStatusSchema,
    ordersPlacedCount: z.number().int().nonnegative(),
    createdAt: TimestampSchema,
    createdBy: IdSchema,
    updatedAt: TimestampSchema,
    updatedBy: IdSchema,
  })
  .strict();

export const PurchaseOrderSchema = z
  .object({
    purchaseOrderId: IdSchema,
    orderNumber: z.string().max(80).optional(),
    viewRole: ViewRoleSchema,
    supplierKind: SupplierKindSchema,
    counterpartyName: z.string().min(1).max(120),
    privateSupplierId: IdSchema.optional(),
    counterpartyOrgId: IdSchema.optional(),
    counterpartyHandle: z
      .string()
      .regex(/^[a-z0-9-]{3,30}$/)
      .optional(),
    connectionId: IdSchema.optional(),
    status: PoStatusSchema,
    currency: CurrencySchema,
    expectedDate: TimestampSchema.optional(),
    receivingWarehouseId: IdSchema.optional(),
    totalMinor: MinorSchema,
    isProjection: z.boolean(),
    lastOperationId: IdSchema.optional(),
    createdBy: IdSchema,
    createdAt: TimestampSchema,
    submittedAt: TimestampSchema.optional(),
    orderedAt: TimestampSchema.optional(),
    acceptedAt: TimestampSchema.optional(),
    shippedAt: TimestampSchema.optional(),
    receivedAt: TimestampSchema.optional(),
    cancelledAt: TimestampSchema.optional(),
  })
  .strict();

export const PurchaseOrderItemSchema = z
  .object({
    itemId: IdSchema,
    buyerProductId: IdSchema,
    buyerProductNameSnapshot: z.string().min(1).max(120),
    buyerSkuSnapshot: z.string().min(1).max(80),
    buyerBaseUnitSnapshot: UnitSchema,
    orderedBuyerBaseMilli: MilliSchema,
    receivedBuyerBaseMilli: MilliSchema,
    unitPriceMinor: MinorSchema,
    lineTotalMinor: MinorSchema,
    currency: CurrencySchema,
    mappingId: IdSchema.optional(),
    supplierCatalogItemId: IdSchema.optional(),
    supplierProductNameSnapshot: z.string().max(120).optional(),
    supplierSkuSnapshot: z.string().max(80).optional(),
    supplierOrderUnitSnapshot: UnitSchema.optional(),
    orderedSupplierMilli: MilliSchema.optional(),
    receivedSupplierMilli: MilliSchema.optional(),
    supplierToBuyerBaseFactorMilliSnapshot: MilliSchema.optional(),
  })
  .strict();

export const PurchaseOrderHistorySchema = z
  .object({
    historyId: IdSchema,
    fromStatus: PoStatusSchema.nullable(),
    toStatus: PoStatusSchema,
    actorUid: IdSchema,
    actorName: z.string().min(1).max(80),
    actorOrgId: IdSchema,
    actorOrgName: z.string().min(1).max(120),
    operationId: IdSchema,
    note: z.string().max(280).optional(),
    createdAt: TimestampSchema,
  })
  .strict();

export const PartnerCatalogItemSchema = z
  .object({
    catalogItemId: IdSchema,
    sourceProductId: IdSchema,
    internalProductNameSnapshot: z.string().min(1).max(120),
    internalSkuSnapshot: z.string().min(1).max(80),
    partnerSku: z.string().min(1).max(80),
    partnerSkuNormalized: z.string().min(1).max(80),
    displayName: z.string().min(1).max(120),
    orderUnit: UnitSchema,
    packDescription: z.string().max(120).optional(),
    availabilityState: AvailabilitySchema,
    wholesalePriceMinor: MinorSchema.optional(),
    currency: CurrencySchema.optional(),
    published: z.boolean(),
    updatedAt: TimestampSchema,
  })
  .strict();

export const ProductMappingSchema = z
  .object({
    mappingId: IdSchema,
    connectionId: IdSchema,
    buyerOrgId: IdSchema,
    buyerProductId: IdSchema,
    buyerProductNameSnapshot: z.string().min(1).max(120),
    buyerSkuSnapshot: z.string().min(1).max(80),
    supplierOrgId: IdSchema,
    supplierCatalogItemId: IdSchema,
    supplierPartnerSkuSnapshot: z.string().min(1).max(80),
    supplierDisplayNameSnapshot: z.string().min(1).max(120),
    buyerBaseUnit: UnitSchema,
    supplierOrderUnit: UnitSchema,
    supplierToBuyerBaseFactorMilli: MilliSchema.refine((value) => value > 0),
    semanticConfirmedByUid: IdSchema,
    semanticConfirmedByName: z.string().min(1).max(80),
    semanticConfirmedAt: TimestampSchema,
    status: MappingStatusSchema,
    createdAt: TimestampSchema,
    disabledAt: TimestampSchema.optional(),
  })
  .strict();

export type PrivatePartner = z.infer<typeof PrivatePartnerSchema>;
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;
export type PurchaseOrderItem = z.infer<typeof PurchaseOrderItemSchema>;
export type PurchaseOrderHistory = z.infer<typeof PurchaseOrderHistorySchema>;
export type PartnerCatalogItem = z.infer<typeof PartnerCatalogItemSchema>;
export type ProductMapping = z.infer<typeof ProductMappingSchema>;
