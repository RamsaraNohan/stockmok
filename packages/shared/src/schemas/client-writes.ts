import { z } from 'zod';
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
  // No `updatedAt`. The DB-02 §5.2 field table for
  // `organizations/{orgId}/purchaseOrders/{poId}` does not carry one — §5.1
  // lists `updatedAt/By` on `privatePartners` two paragraphs earlier, so the
  // omission is deliberate — and DB-02 §9 freezes that field set against
  // anything but a DB-00/A1 amendment. `PurchaseOrderSchema` is strict, and
  // `privateDraftShape()` in firestore.rules omits the key from its `hasOnly`
  // allowlist, so a draft carrying it is rejected at the write boundary and
  // would be unreadable through `Q-036` even if it landed.
  //
  // DB-05 §4.1 lists `updatedAt` only inside `draftFieldsOnly()`, which is an
  // `onlyChanged()` mutability allowlist, not a field set — the same list also
  // carries `notes`, which DB-02 §5.2 does not define on this document either.
  // A predicate over which fields may *change* cannot add a field that may
  // *exist*, so it never authorized one here.
  .extend({
    supplierKind: z.literal('PRIVATE'),
    viewRole: z.literal('BUYER'),
    status: z.literal('DRAFT').default('DRAFT'),
    isProjection: z.literal(false).default(false),
    totalMinor: z.literal(0).default(0),
  })
  .strict();
