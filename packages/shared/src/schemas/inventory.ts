import { z } from 'zod';
import {
  AdjustmentReasonSchema,
  CurrencySchema,
  IdSchema,
  LifecycleStatusSchema,
  MilliSchema,
  MinorSchema,
  MovementTypeSchema,
  SafeIntegerSchema,
  SourceTypeSchema,
  StockStatusSchema,
  TimestampSchema,
  UnitSchema,
  WarehouseTypeSchema,
} from '../primitives.js';

const auditFields = {
  createdAt: TimestampSchema,
  createdBy: IdSchema,
  updatedAt: TimestampSchema,
  updatedBy: IdSchema,
};

export const WarehouseSchema = z
  .object({
    warehouseId: IdSchema,
    name: z.string().min(1).max(80),
    code: z.string().max(40).optional(),
    type: WarehouseTypeSchema,
    status: LifecycleStatusSchema,
    address: z.string().max(400).optional(),
    ...auditFields,
  })
  .strict();

export const ProductSchema = z
  .object({
    productId: IdSchema,
    internalSku: z.string().min(1).max(80),
    internalSkuNormalized: z.string().min(1).max(80),
    name: z.string().min(1).max(120),
    description: z.string().max(1000).optional(),
    categoryId: IdSchema,
    baseUnit: UnitSchema,
    purchaseCostMinor: MinorSchema,
    sellingPriceMinor: MinorSchema.optional(),
    currency: CurrencySchema,
    minimumStockMilli: MilliSchema,
    reorderTargetMilli: MilliSchema,
    status: LifecycleStatusSchema,
    partnerPublished: z.boolean(),
    storefrontPublished: z.literal(false),
    ...auditFields,
  })
  .strict();

export const StockBalanceSchema = z
  .object({
    productId: IdSchema,
    warehouseId: IdSchema,
    onHandMilli: MilliSchema,
    unit: UnitSchema,
    productName: z.string().min(1).max(120),
    internalSku: z.string().min(1).max(80),
    internalSkuNormalized: z.string().min(1).max(80),
    categoryId: IdSchema,
    productStatus: LifecycleStatusSchema,
    baseUnitPriceMinor: MinorSchema,
    minimumStockMilli: MilliSchema,
    productUpdatedAt: TimestampSchema,
    stockValueMinor: MinorSchema,
    stockStatus: StockStatusSchema,
    shortfallMilli: MilliSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

export const ProductStockSummarySchema = z
  .object({
    productId: IdSchema,
    productName: z.string().min(1).max(120),
    internalSku: z.string().min(1).max(80),
    internalSkuNormalized: z.string().min(1).max(80),
    categoryId: IdSchema,
    productStatus: LifecycleStatusSchema,
    baseUnitPriceMinor: MinorSchema,
    productUpdatedAt: TimestampSchema,
    onHandMilli: MilliSchema,
    reservedMilli: z.literal(0),
    availableMilli: MilliSchema,
    minimumStockMilli: MilliSchema,
    stockStatus: StockStatusSchema,
    stockValueMinor: MinorSchema,
    shortfallMilli: MilliSchema,
    unit: UnitSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

export const StockMovementSchema = z
  .object({
    movementId: IdSchema,
    productId: IdSchema,
    warehouseId: IdSchema,
    productNameSnapshot: z.string().min(1).max(120),
    skuSnapshot: z.string().min(1).max(80),
    movementType: MovementTypeSchema,
    signedQuantityMilli: SafeIntegerSchema,
    unit: UnitSchema,
    balanceAfterMilli: MilliSchema,
    sourceType: SourceTypeSchema,
    sourceId: IdSchema.optional(),
    sourceReferenceSnapshot: z.string().max(120).optional(),
    transferId: IdSchema.optional(),
    counterpartWarehouseId: IdSchema.optional(),
    adjustmentReason: AdjustmentReasonSchema.optional(),
    note: z.string().max(280).optional(),
    operationId: IdSchema,
    actorUid: IdSchema,
    actorName: z.string().min(1).max(80),
    warehouseNameSnapshot: z.string().min(1).max(80),
    counterpartWarehouseNameSnapshot: z.string().min(1).max(80).optional(),
    effectiveAt: TimestampSchema,
    createdAt: TimestampSchema,
  })
  .strict()
  .superRefine((movement, context) => {
    if (movement.movementType === 'OPENING_BALANCE') {
      if (movement.signedQuantityMilli < 0) {
        context.addIssue({
          code: 'custom',
          path: ['signedQuantityMilli'],
          message: 'Opening balance quantity must be greater than or equal to zero',
        });
      }
    } else if (movement.signedQuantityMilli === 0) {
      context.addIssue({
        code: 'custom',
        path: ['signedQuantityMilli'],
        message: 'Only an opening balance may record a zero quantity',
      });
    }
    const adjustment =
      movement.movementType === 'ADJUSTMENT_IN' || movement.movementType === 'ADJUSTMENT_OUT';
    if (adjustment !== (movement.adjustmentReason !== undefined)) {
      context.addIssue({
        code: 'custom',
        path: ['adjustmentReason'],
        message: 'Adjustment reason is required only for adjustment movements',
      });
    }
    if (movement.adjustmentReason === 'OTHER' && !movement.note) {
      context.addIssue({ code: 'custom', path: ['note'], message: 'OTHER requires a note' });
    }
  });

export type Warehouse = z.infer<typeof WarehouseSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type StockBalance = z.infer<typeof StockBalanceSchema>;
export type ProductStockSummary = z.infer<typeof ProductStockSummarySchema>;
export type StockMovement = z.infer<typeof StockMovementSchema>;
