import { Timestamp } from 'firebase-admin/firestore';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import { createConverter } from '../packages/shared/src/converters.js';
import { commandDefinitions } from '../packages/shared/src/commands.js';
import {
  PrivatePartnerClientWriteSchema,
  PrivatePurchaseOrderDraftClientWriteSchema,
} from '../packages/shared/src/schemas/client-writes.js';
import { StockMovementSchema } from '../packages/shared/src/schemas/inventory.js';
import {
  PrivatePartnerSchema,
  PurchaseOrderSchema,
} from '../packages/shared/src/schemas/procurement.js';
import { aMovement } from './factories/index.js';

describe('strict schemas and converter boundaries', () => {
  it('permits zero only for the owner-approved opening-balance exception', () => {
    expect(() =>
      commandDefinitions['C-13'].payload.parse({
        productId: 'dry-004',
        warehouseId: 'main-store',
        quantityMilli: 0,
        effectiveAt: Timestamp.fromMillis(1),
      }),
    ).not.toThrow();
    expect(() =>
      aMovement('OPENING_BALANCE', { signedQuantityMilli: 0, balanceAfterMilli: 0 }),
    ).not.toThrow();
    for (const type of [
      'ADJUSTMENT_IN',
      'ADJUSTMENT_OUT',
      'PURCHASE_RECEIPT',
      'CONNECTED_DISPATCH_OUT',
      'TRANSFER_IN',
      'TRANSFER_OUT',
    ]) {
      expect(() => aMovement(type, { signedQuantityMilli: 0 })).toThrow('Only an opening balance');
    }
    expect(() => aMovement('OPENING_BALANCE', { signedQuantityMilli: -1 })).toThrow(
      'greater than or equal',
    );
  });

  it('rejects unknown fields and preserves structural Timestamp objects', () => {
    const movement = aMovement();
    expect(movement.createdAt).toBeInstanceOf(Timestamp);
    expect(() => StockMovementSchema.parse({ ...movement, unexpected: true })).toThrow();
    const converter = createConverter(StockMovementSchema);
    const encoded = converter.toFirestore(movement);
    const snapshot = { data: () => encoded } as unknown as QueryDocumentSnapshot;
    const decoded = converter.fromFirestore(snapshot, {});
    expect(decoded).toEqual(movement);
    expect(decoded.createdAt).toBe(movement.createdAt);
  });

  it('excludes backend-only private-partner fields from client writes', () => {
    const partner = PrivatePartnerSchema.parse({
      partnerId: 'partner-1',
      partnerTypes: ['SUPPLIER'],
      name: 'Supplier',
      status: 'ACTIVE',
      ordersPlacedCount: 0,
      createdAt: Timestamp.fromMillis(1),
      createdBy: 'user-1',
      updatedAt: Timestamp.fromMillis(1),
      updatedBy: 'user-1',
    });
    const clientInput = {
      partnerId: partner.partnerId,
      partnerTypes: partner.partnerTypes,
      name: partner.name,
      createdAt: partner.createdAt,
      createdBy: partner.createdBy,
      updatedAt: partner.updatedAt,
      updatedBy: partner.updatedBy,
    };
    expect(PrivatePartnerClientWriteSchema.parse(clientInput)).toEqual(clientInput);
    expect(() =>
      PrivatePartnerClientWriteSchema.parse({ ...clientInput, status: 'ACTIVE' }),
    ).toThrow();
    expect(() =>
      PrivatePartnerClientWriteSchema.parse({ ...clientInput, ordersPlacedCount: 0 }),
    ).toThrow();
  });
});

/**
 * The private purchase-order draft is a direct client write (DB-02 §5.2, `CW`
 * only while `PRIVATE` + `DRAFT`), so three independent gates see the same
 * document: this schema, `privateDraftShape()` in firestore.rules, and the
 * strict `PurchaseOrderSchema` every reader parses through (`Q-036`). A shape
 * one gate accepts and another rejects is persistence drift, so the invariant
 * under test is that the three agree on every field.
 */
describe('private purchase-order draft client-write contract', () => {
  const NOW = Timestamp.fromMillis(1);

  /** A valid private draft header, exactly as DB-02 §5.2 defines it. */
  const draft = {
    purchaseOrderId: 'po-1',
    viewRole: 'BUYER',
    supplierKind: 'PRIVATE',
    counterpartyName: 'Green Farm Poultry',
    privateSupplierId: 'partner-1',
    status: 'DRAFT',
    currency: 'LKR',
    expectedDate: NOW,
    totalMinor: 0,
    isProjection: false,
    createdBy: 'user-1',
    createdAt: NOW,
  } as const;

  /**
   * `privateDraftShape()`'s `hasOnly` allowlist, transcribed from
   * firestore.rules. Rules are not importable here, so the parity assertion
   * below pins the schema's key set against this copy: if the rule's allowlist
   * moves without this list moving with it, the test fails rather than drifting
   * silently.
   */
  const RULES_DRAFT_KEYS = [
    'purchaseOrderId',
    'viewRole',
    'supplierKind',
    'counterpartyName',
    'privateSupplierId',
    'status',
    'currency',
    'expectedDate',
    'totalMinor',
    'isProjection',
    'createdBy',
    'createdAt',
  ];

  it('accepts the governed draft shape and keeps every DB-02 §5.2 field', () => {
    const parsed = PrivatePurchaseOrderDraftClientWriteSchema.parse(draft);
    expect(parsed).toEqual(draft);
    for (const field of Object.keys(draft)) {
      expect(parsed).toHaveProperty(field);
    }
  });

  it('rejects `updatedAt`, which DB-02 §5.2 does not define on this document', () => {
    const result = PrivatePurchaseOrderDraftClientWriteSchema.safeParse({
      ...draft,
      updatedAt: NOW,
    });
    // Rejected outright rather than stripped: silently dropping the key would
    // report success for a write that firestore.rules denies.
    expect(result.success).toBe(false);
    expect(() =>
      PrivatePurchaseOrderDraftClientWriteSchema.parse({ ...draft, updatedAt: NOW }),
    ).toThrow();
  });

  it('stays strict against any other unknown key', () => {
    expect(() =>
      PrivatePurchaseOrderDraftClientWriteSchema.parse({ ...draft, unexpected: true }),
    ).toThrow();
    // `notes` rides in DB-05 §4.1's `draftFieldsOnly()` list beside `updatedAt`,
    // but that predicate governs which fields may change, not which may exist,
    // and DB-02 §5.2 defines neither on this document.
    expect(() =>
      PrivatePurchaseOrderDraftClientWriteSchema.parse({ ...draft, notes: 'x' }),
    ).toThrow();
  });

  it('produces a shape the Rules allowlist and the strict read both accept', () => {
    const parsed = PrivatePurchaseOrderDraftClientWriteSchema.parse(draft);
    // shared client write → firestore.rules `privateDraftShape`
    expect(Object.keys(parsed).sort()).toEqual([...RULES_DRAFT_KEYS].sort());
    // → strict `PurchaseOrderSchema` read (`Q-036`)
    expect(PurchaseOrderSchema.parse(parsed)).toEqual(parsed);
  });

  it('agrees with the strict read schema on the shape all three gates reject', () => {
    const touched = { ...draft, updatedAt: NOW };
    expect(PrivatePurchaseOrderDraftClientWriteSchema.safeParse(touched).success).toBe(false);
    expect(PurchaseOrderSchema.safeParse(touched).success).toBe(false);
    expect(RULES_DRAFT_KEYS).not.toContain('updatedAt');
  });
});
