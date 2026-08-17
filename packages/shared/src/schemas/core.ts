import { z } from 'zod';
import {
  CurrencySchema,
  DirectoryStatusSchema,
  IdSchema,
  InviteStatusSchema,
  LifecycleStatusSchema,
  MemberStatusSchema,
  NonNegativeIntegerSchema,
  NotificationCategorySchema,
  NotificationTypeSchema,
  ReferenceTypeSchema,
  RoleSchema,
  SafeIntegerSchema,
  TimestampSchema,
} from '../primitives.js';

const auditFields = {
  createdAt: TimestampSchema,
  createdBy: IdSchema,
  updatedAt: TimestampSchema,
  updatedBy: IdSchema,
};

export const OrganizationDirectorySchema = z
  .object({
    organizationId: IdSchema,
    handle: z.string().regex(/^[a-z0-9-]{3,30}$/),
    name: z.string().min(1).max(120),
    logoUrl: z.url().nullable(),
    monogram: z.string().min(1).max(2),
    monogramColor: z.string().min(1).max(80),
    industry: z.string().min(1).max(120),
    country: z.string().regex(/^[A-Z]{2}$/),
    directoryStatus: DirectoryStatusSchema,
    createdAt: TimestampSchema,
  })
  .strict();

export const UserSchema = z
  .object({
    uid: IdSchema,
    displayName: z.string().min(1).max(80),
    email: z.email().transform((value) => value.toLowerCase()),
    photoUrl: z.url().optional(),
    status: z.enum(['ACTIVE', 'DISABLED']),
    createdAt: TimestampSchema,
    lastSeenAt: TimestampSchema.optional(),
  })
  .strict();

export const UserMembershipSchema = z
  .object({
    organizationId: IdSchema,
    handle: z.string().regex(/^[a-z0-9-]{3,30}$/),
    organizationName: z.string().min(1).max(120),
    monogram: z.string().min(1).max(2),
    monogramColor: z.string().min(1).max(80),
    role: RoleSchema,
    status: MemberStatusSchema,
    joinedAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

export const NotificationSchema = z
  .object({
    organizationId: IdSchema,
    organizationName: z.string().min(1).max(120),
    type: NotificationTypeSchema,
    category: NotificationCategorySchema,
    title: z.string().min(1).max(120),
    message: z.string().min(1).max(400),
    referenceType: ReferenceTypeSchema,
    referenceId: IdSchema,
    read: z.boolean(),
    createdAt: TimestampSchema,
  })
  .strict();

export const OrganizationSchema = z
  .object({
    organizationId: IdSchema,
    name: z.string().min(1).max(120),
    handle: z.string().regex(/^[a-z0-9-]{3,30}$/),
    industry: z.string().min(1).max(120),
    country: z.string().regex(/^[A-Z]{2}$/),
    logoUrl: z.url().nullable(),
    monogram: z.string().min(1).max(2),
    monogramColor: z.string().min(1).max(80),
    status: z.literal('ACTIVE'),
    ownerUid: IdSchema,
    createdAt: TimestampSchema,
    createdBy: IdSchema,
    schemaVersion: z.literal(1),
  })
  .strict();

export const OrganizationSettingsSchema = z
  .object({
    defaultWarehouseId: IdSchema,
    currency: CurrencySchema,
    timezone: z.string().min(1).max(80),
    lowStockNotificationsEnabled: z.boolean(),
    purchaseOrderPrefix: z.string().min(1).max(10),
    quantityPrecision: z.literal(3),
    networkEnabled: z.boolean(),
    storefrontEnabled: z.literal(false),
    updatedAt: TimestampSchema,
    updatedBy: IdSchema,
  })
  .strict();

export const MemberSchema = z
  .object({
    uid: IdSchema,
    role: RoleSchema,
    status: MemberStatusSchema,
    displayName: z.string().min(1).max(80),
    email: z.email().transform((value) => value.toLowerCase()),
    invitedBy: IdSchema.optional(),
    joinedAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

export const InvitationSchema = z
  .object({
    invitationId: IdSchema,
    organizationId: IdSchema,
    emailNormalized: z.email().transform((value) => value.toLowerCase()),
    role: RoleSchema.exclude(['OWNER']),
    tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
    status: InviteStatusSchema,
    expiresAt: TimestampSchema,
    createdBy: IdSchema,
    createdAt: TimestampSchema,
    acceptedBy: IdSchema.optional(),
    acceptedAt: TimestampSchema.optional(),
  })
  .strict();

export const CounterSchema = z
  .object({ value: NonNegativeIntegerSchema, updatedAt: TimestampSchema })
  .strict();

const SafeScalarSchema = z.union([z.string(), SafeIntegerSchema, z.boolean(), z.null()]);

export const CommandReceiptSchema = z
  .object({
    operationId: IdSchema,
    commandType: z.string().min(1).max(120),
    actorUid: IdSchema,
    payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
    resultStatus: z.literal('OK'),
    result: z.record(z.string(), SafeScalarSchema),
    createdAt: TimestampSchema,
  })
  .strict();

export const ProductSkuIndexSchema = z
  .object({ productId: IdSchema, createdAt: TimestampSchema })
  .strict();

export const CategorySchema = z
  .object({
    categoryId: IdSchema,
    name: z.string().min(1).max(80),
    description: z.string().max(400).optional(),
    status: LifecycleStatusSchema,
    ...auditFields,
  })
  .strict();

export const HandleReservationSchema = z
  .object({ organizationId: IdSchema, createdAt: TimestampSchema })
  .strict();

export type OrganizationDirectory = z.infer<typeof OrganizationDirectorySchema>;
export type User = z.infer<typeof UserSchema>;
export type UserMembership = z.infer<typeof UserMembershipSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type OrganizationSettings = z.infer<typeof OrganizationSettingsSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type Invitation = z.infer<typeof InvitationSchema>;
export type Counter = z.infer<typeof CounterSchema>;
export type CommandReceipt = z.infer<typeof CommandReceiptSchema>;
export type ProductSkuIndex = z.infer<typeof ProductSkuIndexSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type HandleReservation = z.infer<typeof HandleReservationSchema>;
