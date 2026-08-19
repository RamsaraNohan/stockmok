import { z } from 'zod';
import { ActiveCommandNameSchema } from '../commands.js';
import {
  ConnectionStatusSchema,
  IdSchema,
  NonNegativeIntegerSchema,
  PoStatusSchema,
  RoleSchema,
  TimestampSchema,
} from '../primitives.js';
import { PurchaseOrderItemSchema, PurchaseOrderSchema } from './procurement.js';

export const CanonicalConnectionSchema = z
  .object({
    connectionId: IdSchema,
    buyerOrgId: IdSchema,
    supplierOrgId: IdSchema,
    buyerHandle: z.string().regex(/^[a-z0-9-]{3,30}$/),
    buyerName: z.string().min(1).max(120),
    supplierHandle: z.string().regex(/^[a-z0-9-]{3,30}$/),
    supplierName: z.string().min(1).max(120),
    status: ConnectionStatusSchema,
    requestedByUid: IdSchema,
    requestedAt: TimestampSchema,
    respondedByUid: IdSchema.optional(),
    respondedAt: TimestampSchema.optional(),
    disabledAt: TimestampSchema.optional(),
    updatedAt: TimestampSchema,
  })
  .strict();

export const ConnectionProjectionSchema = CanonicalConnectionSchema.extend({
  ordersPlacedCount: NonNegativeIntegerSchema,
}).strict();

export const ConnectedPurchaseOrderSchema = PurchaseOrderSchema.extend({
  buyerOrgId: IdSchema,
  supplierOrgId: IdSchema,
  connectionId: IdSchema,
}).strict();

export const ConnectedPurchaseOrderItemSchema = PurchaseOrderItemSchema;

const SafeScalarSchema = z.union([z.string(), z.number().int(), z.boolean(), z.null()]);

export const AuditLogSchema = z
  .object({
    auditId: IdSchema,
    actorUid: IdSchema,
    actorName: z.string().min(1).max(80),
    actorRole: RoleSchema,
    organizationId: IdSchema,
    // Bound to the frozen 38-id active command catalog (DB-06 §1) rather than to a
    // shape. `action` is always the command's own dot-case name (DB-02 §6.4), and the
    // catalog already carries the camelCase segments a bare `/[a-z0-9]*/` shape cannot
    // represent (e.g. `team.createInvitation`) — narrower than either regex, and it
    // cannot drift from `commandDefinitions` because there is no second registry to
    // drift from.
    action: ActiveCommandNameSchema,
    entityType: z.string().min(1).max(80),
    entityId: IdSchema,
    operationId: IdSchema.optional(),
    summary: z.string().min(1).max(240),
    metadata: z.record(z.string(), SafeScalarSchema),
    createdAt: TimestampSchema,
  })
  .strict();

export const ConnectedHistorySchema = z
  .object({
    historyId: IdSchema,
    fromStatus: PoStatusSchema.nullable(),
    toStatus: PoStatusSchema,
    actorUid: IdSchema,
    actorName: z.string().min(1).max(80),
    actorOrgId: IdSchema,
    actorOrgName: z.string().min(1).max(120),
    // Mirrors `PurchaseOrderHistorySchema.operationId` for the identical reason
    // (DB-06 §1): `cpo.cancel` is NON-idempotent, so its canonical history row
    // provably has no receipt id to carry. Requiring it here could only be
    // satisfied by fabricating one that resolves to nothing, and DB-02 §5.4
    // requires the canonical row and both projection rows to be identical.
    operationId: IdSchema.optional(),
    note: z.string().max(280).optional(),
    createdAt: TimestampSchema,
  })
  .strict();

export type CanonicalConnection = z.infer<typeof CanonicalConnectionSchema>;
export type ConnectionProjection = z.infer<typeof ConnectionProjectionSchema>;
export type ConnectedPurchaseOrder = z.infer<typeof ConnectedPurchaseOrderSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
