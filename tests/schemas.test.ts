import { Timestamp } from 'firebase-admin/firestore';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import { createConverter } from '../packages/shared/src/converters.js';
import { commandDefinitions } from '../packages/shared/src/commands.js';
import { PrivatePartnerClientWriteSchema } from '../packages/shared/src/schemas/client-writes.js';
import { StockMovementSchema } from '../packages/shared/src/schemas/inventory.js';
import { PrivatePartnerSchema } from '../packages/shared/src/schemas/procurement.js';
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
