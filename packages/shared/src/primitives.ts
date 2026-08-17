import { z } from 'zod';

export interface FirestoreTimestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

export function isFirestoreTimestamp(value: unknown): value is FirestoreTimestamp {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<FirestoreTimestamp>;
  return (
    Number.isSafeInteger(candidate.seconds) &&
    Number.isInteger(candidate.nanoseconds) &&
    (candidate.nanoseconds ?? -1) >= 0 &&
    (candidate.nanoseconds ?? 1_000_000_000) < 1_000_000_000 &&
    typeof candidate.toDate === 'function' &&
    typeof candidate.toMillis === 'function'
  );
}

export const TimestampSchema = z.custom<FirestoreTimestamp>(isFirestoreTimestamp, {
  message: 'Expected a Firestore Timestamp',
});

export const SafeIntegerSchema = z.number().int();
export const NonNegativeIntegerSchema = SafeIntegerSchema.nonnegative();
export const PositiveIntegerSchema = SafeIntegerSchema.positive();
export const MilliSchema = NonNegativeIntegerSchema.brand<'Milli'>();
export const MinorSchema = NonNegativeIntegerSchema.brand<'Minor'>();
export const SignedMilliSchema = SafeIntegerSchema.refine((value) => value !== 0, {
  message: 'Signed milli quantity cannot be zero',
});

export type Milli = z.infer<typeof MilliSchema>;
export type Minor = z.infer<typeof MinorSchema>;

export const IdSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => !value.includes('/'), {
    message: 'Firestore identifier must be one path segment',
  });
export const UuidV4Schema = z.uuidv4();
export const CurrencySchema = z
  .string()
  .trim()
  .min(3)
  .max(3)
  .transform((value) => value.toUpperCase());

export const RoleSchema = z.enum([
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
  'PROCUREMENT_MANAGER',
  'STOREKEEPER',
  'ANALYST',
  'VIEWER',
]);
export const MemberStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'REMOVED']);
export const InviteStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']);
export const LifecycleStatusSchema = z.enum(['ACTIVE', 'ARCHIVED']);
export const PartnerStatusSchema = z.enum(['ACTIVE', 'DEACTIVATED']);
export const StockStatusSchema = z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']);
export const MovementTypeSchema = z.enum([
  'OPENING_BALANCE',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'PURCHASE_RECEIPT',
  'CONNECTED_DISPATCH_OUT',
  'TRANSFER_OUT',
  'TRANSFER_IN',
]);
export const SourceTypeSchema = z.enum(['MANUAL', 'PRIVATE_PO', 'CONNECTED_PO', 'TRANSFER']);
export const AdjustmentReasonSchema = z.enum([
  'RECOUNT_CORRECTION',
  'DAMAGED_IN_STORAGE',
  'EXPIRED',
  'WASTAGE',
  'THEFT_OR_LOSS',
  'OTHER',
]);
export const ConnectionStatusSchema = z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'DISABLED']);
export const MappingStatusSchema = z.enum(['VERIFIED', 'DISABLED']);
export const PoStatusSchema = z.enum([
  'DRAFT',
  'ORDERED',
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED',
  'SHIPPED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
]);
export const SupplierKindSchema = z.enum(['PRIVATE', 'CONNECTED']);
export const ViewRoleSchema = z.enum(['BUYER', 'SUPPLIER']);
export const AvailabilitySchema = z.enum(['IN_STOCK', 'OUT_OF_STOCK']);
export const UnitSchema = z.enum(['KG', 'L', 'EACH', 'PACK']);
export const WarehouseTypeSchema = z.enum([
  'STORE_ROOM',
  'REFRIGERATED',
  'FREEZER',
  'KITCHEN',
  'OTHER',
]);
export const DirectoryStatusSchema = z.literal('LISTED');
export const NotificationCategorySchema = z.enum(['STOCK', 'ORDERS', 'NETWORK']);
export const NotificationTypeSchema = z.enum([
  'LOW_STOCK',
  'OUT_OF_STOCK',
  'MEMBERSHIP_CHANGED',
  'PO_RECEIVED',
  'CONNECTION_REQUESTED',
  'CONNECTION_RESPONDED',
  'CPO_SUBMITTED',
  'CPO_RESPONDED',
  'CPO_SHIPPED',
  'CPO_RECEIVED',
]);
export const ReferenceTypeSchema = z.enum([
  'PRODUCT',
  'PURCHASE_ORDER',
  'CONNECTION',
  'MEMBERSHIP',
]);

export type Role = z.infer<typeof RoleSchema>;
export type MemberStatus = z.infer<typeof MemberStatusSchema>;
export type InviteStatus = z.infer<typeof InviteStatusSchema>;
export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>;
export type PartnerStatus = z.infer<typeof PartnerStatusSchema>;
export type StockStatus = z.infer<typeof StockStatusSchema>;
export type MovementType = z.infer<typeof MovementTypeSchema>;
export type SourceType = z.infer<typeof SourceTypeSchema>;
export type AdjustmentReason = z.infer<typeof AdjustmentReasonSchema>;
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;
export type MappingStatus = z.infer<typeof MappingStatusSchema>;
export type PoStatus = z.infer<typeof PoStatusSchema>;
export type SupplierKind = z.infer<typeof SupplierKindSchema>;
export type ViewRole = z.infer<typeof ViewRoleSchema>;
export type Availability = z.infer<typeof AvailabilitySchema>;
export type Unit = z.infer<typeof UnitSchema>;
export type WarehouseType = z.infer<typeof WarehouseTypeSchema>;
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;
