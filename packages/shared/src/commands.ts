import { z } from 'zod';
import {
  AdjustmentReasonSchema,
  CurrencySchema,
  IdSchema,
  LifecycleStatusSchema,
  MemberStatusSchema,
  MilliSchema,
  MinorSchema,
  PartnerStatusSchema,
  RoleSchema,
  TimestampSchema,
  UnitSchema,
  UuidV4Schema,
} from './primitives.js';

const byId = <K extends string>(key: K) =>
  z.object({ [key]: IdSchema } as Record<K, typeof IdSchema>).strict();
const operationLine = z
  .object({ itemId: IdSchema, quantityMilli: MilliSchema.refine((value) => value > 0) })
  .strict();

export const commandDefinitions = {
  'C-01': {
    name: 'org.create',
    idempotent: true,
    payload: z
      .object({
        name: z.string().min(1).max(120),
        handle: z.string().regex(/^[a-z0-9-]{3,30}$/),
        industry: z.string().min(1).max(120),
        country: z.string().regex(/^[A-Z]{2}$/),
        currency: CurrencySchema,
        timezone: z.string().min(1).max(80),
      })
      .strict(),
  },
  'C-02': {
    name: 'org.updateSettings',
    idempotent: false,
    payload: z
      .object({
        name: z.string().min(1).max(120).optional(),
        industry: z.string().min(1).max(120).optional(),
        country: z
          .string()
          .regex(/^[A-Z]{2}$/)
          .optional(),
        currency: CurrencySchema.optional(),
        timezone: z.string().min(1).max(80).optional(),
        lowStockNotificationsEnabled: z.boolean().optional(),
        networkEnabled: z.boolean().optional(),
      })
      .strict(),
  },
  'C-03': {
    name: 'user.bootstrapProfile',
    idempotent: true,
    payload: z
      .object({ displayName: z.string().min(1).max(80), photoUrl: z.url().optional() })
      .strict(),
  },
  'C-04': {
    name: 'team.createInvitation',
    idempotent: true,
    payload: z.object({ email: z.email(), role: RoleSchema.exclude(['OWNER']) }).strict(),
  },
  'C-05': { name: 'team.revokeInvitation', idempotent: false, payload: byId('invitationId') },
  'C-06': {
    name: 'team.acceptInvitation',
    idempotent: true,
    payload: z.object({ token: z.string().min(32).max(256) }).strict(),
  },
  'C-07': {
    name: 'team.changeMemberRole',
    idempotent: false,
    payload: z.object({ uid: IdSchema, role: RoleSchema.exclude(['OWNER']) }).strict(),
  },
  'C-08': {
    name: 'team.setMemberStatus',
    idempotent: false,
    payload: z.object({ uid: IdSchema, status: MemberStatusSchema }).strict(),
  },
  'C-09': {
    name: 'product.create',
    idempotent: true,
    payload: z
      .object({
        internalSku: z.string().min(1).max(80),
        name: z.string().min(1).max(120),
        description: z.string().max(1000).optional(),
        categoryId: IdSchema,
        baseUnit: UnitSchema,
        purchaseCostMinor: MinorSchema,
        sellingPriceMinor: MinorSchema.optional(),
        currency: CurrencySchema,
        minimumStockMilli: MilliSchema,
        reorderTargetMilli: MilliSchema,
      })
      .strict(),
  },
  'C-10': {
    name: 'product.update',
    idempotent: false,
    payload: z
      .object({
        productId: IdSchema,
        internalSku: z.string().min(1).max(80).optional(),
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(1000).optional(),
        categoryId: IdSchema.optional(),
        purchaseCostMinor: MinorSchema.optional(),
        sellingPriceMinor: MinorSchema.optional(),
        minimumStockMilli: MilliSchema.optional(),
        reorderTargetMilli: MilliSchema.optional(),
      })
      .strict(),
  },
  'C-11': {
    name: 'product.setStatus',
    idempotent: false,
    payload: z.object({ productId: IdSchema, status: LifecycleStatusSchema }).strict(),
  },
  'C-12': { name: 'warehouse.archive', idempotent: false, payload: byId('warehouseId') },
  'C-13': {
    name: 'stock.recordOpeningBalance',
    idempotent: true,
    payload: z
      .object({
        productId: IdSchema,
        warehouseId: IdSchema,
        quantityMilli: MilliSchema,
        effectiveAt: TimestampSchema,
      })
      .strict(),
  },
  'C-14': {
    name: 'stock.adjust',
    idempotent: true,
    payload: z
      .object({
        productId: IdSchema,
        warehouseId: IdSchema,
        signedQuantityMilli: z
          .number()
          .int()
          .refine((value) => value !== 0),
        adjustmentReason: AdjustmentReasonSchema,
        note: z.string().max(280).optional(),
      })
      .strict(),
  },
  'C-15': { name: 'po.order', idempotent: true, payload: byId('purchaseOrderId') },
  'C-16': { name: 'po.cancel', idempotent: false, payload: byId('purchaseOrderId') },
  'C-17': {
    name: 'po.receive',
    idempotent: true,
    payload: z
      .object({
        purchaseOrderId: IdSchema,
        warehouseId: IdSchema,
        lines: z.array(operationLine).min(1),
      })
      .strict(),
  },
  'C-18': {
    name: 'connection.request',
    idempotent: true,
    payload: z.object({ supplierHandle: z.string().regex(/^[a-z0-9-]{3,30}$/) }).strict(),
  },
  'C-19': {
    name: 'connection.respond',
    idempotent: true,
    payload: z.object({ connectionId: IdSchema, response: z.enum(['ACCEPT', 'REJECT']) }).strict(),
  },
  'C-20': { name: 'connection.disable', idempotent: false, payload: byId('connectionId') },
  'C-21': {
    name: 'partnerCatalog.publish',
    idempotent: false,
    payload: z
      .object({
        sourceProductId: IdSchema,
        partnerSku: z.string().min(1).max(80),
        displayName: z.string().min(1).max(120),
        orderUnit: UnitSchema,
        packDescription: z.string().max(120).optional(),
        wholesalePriceMinor: MinorSchema.optional(),
      })
      .strict(),
  },
  'C-22': { name: 'partnerCatalog.unpublish', idempotent: false, payload: byId('catalogItemId') },
  'C-23': {
    name: 'partnerCatalog.list',
    idempotent: false,
    payload: z.object({ connectionId: IdSchema, limit: z.number().int().min(1).max(100) }).strict(),
  },
  'C-24': {
    name: 'partnerCatalog.lookupBySku',
    idempotent: false,
    payload: z.object({ connectionId: IdSchema, partnerSku: z.string().min(1).max(80) }).strict(),
  },
  'C-25': {
    name: 'mapping.create',
    idempotent: true,
    payload: z
      .object({
        connectionId: IdSchema,
        buyerProductId: IdSchema,
        supplierCatalogItemId: IdSchema,
        typedPartnerSku: z.string().min(1).max(80),
        supplierToBuyerBaseFactorMilli: MilliSchema.refine((value) => value > 0),
        semanticConfirmed: z.literal(true),
      })
      .strict(),
  },
  'C-26': { name: 'mapping.disable', idempotent: false, payload: byId('mappingId') },
  'C-27': { name: 'cpo.submit', idempotent: true, payload: byId('purchaseOrderId') },
  'C-28': {
    name: 'cpo.respond',
    idempotent: true,
    payload: z
      .object({ purchaseOrderId: IdSchema, response: z.enum(['ACCEPT', 'REJECT']) })
      .strict(),
  },
  'C-29': { name: 'cpo.ship', idempotent: true, payload: byId('purchaseOrderId') },
  'C-30': {
    name: 'cpo.receive',
    idempotent: true,
    payload: z
      .object({
        purchaseOrderId: IdSchema,
        warehouseId: IdSchema,
        lines: z.array(operationLine).min(1),
      })
      .strict(),
  },
  'C-31': { name: 'cpo.cancel', idempotent: false, payload: byId('purchaseOrderId') },
  'C-33': {
    name: 'stock.transfer',
    idempotent: true,
    payload: z
      .object({
        productId: IdSchema,
        sourceWarehouseId: IdSchema,
        destinationWarehouseId: IdSchema,
        quantityMilli: MilliSchema.refine((value) => value > 0),
      })
      .strict(),
  },
  'C-34': {
    name: 'cpo.draftSave',
    idempotent: false,
    payload: z.object({ purchaseOrderId: IdSchema, connectionId: IdSchema }).strict(),
  },
  'C-35a': { name: 'category.archive', idempotent: false, payload: byId('categoryId') },
  'C-35b': { name: 'category.restore', idempotent: false, payload: byId('categoryId') },
  'C-36': { name: 'warehouse.setDefault', idempotent: false, payload: byId('warehouseId') },
  'C-37': { name: 'warehouse.restore', idempotent: false, payload: byId('warehouseId') },
  'C-38': {
    name: 'partner.setStatus',
    idempotent: false,
    payload: z.object({ partnerId: IdSchema, status: PartnerStatusSchema }).strict(),
  },
} as const satisfies Record<
  string,
  { readonly name: string; readonly idempotent: boolean; readonly payload: z.ZodType }
>;

export const ActiveCommandIdSchema = z.enum(
  Object.keys(commandDefinitions) as [
    keyof typeof commandDefinitions,
    ...(keyof typeof commandDefinitions)[],
  ],
);
export const ActiveCommandNameSchema = z.enum(
  Object.values(commandDefinitions).map(({ name }) => name) as [string, ...string[]],
);

export const CommandRequestEnvelopeSchema = z
  .object({ orgId: IdSchema, operationId: UuidV4Schema, payload: z.unknown() })
  .strict();
export const NonIdempotentCommandRequestEnvelopeSchema = z
  .object({ orgId: IdSchema, payload: z.unknown() })
  .strict();

export const CommandErrorCodeSchema = z.enum([
  'unauthenticated',
  'permission-denied',
  'not-found',
  'failed-precondition',
  'invalid-argument',
  'already-exists',
  'aborted',
  'resource-exhausted',
  'internal',
]);

export const CommandResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), data: z.record(z.string(), z.unknown()) }).strict(),
  z
    .object({
      ok: z.literal(false),
      code: CommandErrorCodeSchema,
      message: z.string(),
      details: z.unknown().optional(),
    })
    .strict(),
]);

export const commandContracts = Object.fromEntries(
  Object.entries(commandDefinitions).map(([id, definition]) => [
    id,
    { payload: definition.payload, result: CommandResultSchema },
  ]),
) as {
  readonly [Id in keyof typeof commandDefinitions]: {
    readonly payload: (typeof commandDefinitions)[Id]['payload'];
    readonly result: typeof CommandResultSchema;
  };
};

export type ActiveCommandId = z.infer<typeof ActiveCommandIdSchema>;
export type ActiveCommandName = z.infer<typeof ActiveCommandNameSchema>;
export type CommandResult = z.infer<typeof CommandResultSchema>;
