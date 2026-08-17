import { z } from 'zod';
import { TimestampSchema } from '../primitives.js';
import { CategorySchema, UserSchema } from './core.js';
import { WarehouseSchema } from './inventory.js';
import { PrivatePartnerSchema, PurchaseOrderSchema } from './procurement.js';

export const UserClientWriteSchema = UserSchema.pick({
  displayName: true,
  photoUrl: true,
  lastSeenAt: true,
}).strict();

export const NotificationClientWriteSchema = z.object({ read: z.boolean() }).strict();

export const CategoryClientWriteSchema = CategorySchema.omit({ status: true }).strict();

export const WarehouseClientWriteSchema = WarehouseSchema.omit({ status: true }).strict();

export const PrivatePartnerClientWriteSchema = PrivatePartnerSchema.omit({
  status: true,
  ordersPlacedCount: true,
}).strict();

export const PrivatePurchaseOrderDraftClientWriteSchema = PurchaseOrderSchema.pick({
  purchaseOrderId: true,
  viewRole: true,
  supplierKind: true,
  counterpartyName: true,
  privateSupplierId: true,
  currency: true,
  expectedDate: true,
  createdBy: true,
  createdAt: true,
})
  .extend({
    supplierKind: z.literal('PRIVATE'),
    viewRole: z.literal('BUYER'),
    status: z.literal('DRAFT').default('DRAFT'),
    isProjection: z.literal(false).default(false),
    totalMinor: z.literal(0).default(0),
    updatedAt: TimestampSchema,
  })
  .strict();
