import type { PurchaseOrder, PurchaseOrderItem } from '@stockmok/shared';
import { describe, expect, it } from 'vitest';

import {
  connectedActionAvailability,
  connectedLineQuantities,
  connectedOrderSide,
  isConnectedOrder,
} from './connectedOrderService';

describe('connected order read/state model', () => {
  const order = { supplierKind: 'CONNECTED', viewRole: 'BUYER' } as PurchaseOrder;

  it('selects the connected buyer/supplier projection without a private command path', () => {
    expect(isConnectedOrder(order)).toBe(true);
    expect(connectedOrderSide(order)).toBe('BUYER');
    expect(isConnectedOrder({ ...order, supplierKind: 'PRIVATE' })).toBe(false);
  });

  it('keeps supplier and buyer quantities explicit and derives outstanding at both grains', () => {
    const quantities = connectedLineQuantities({
      orderedSupplierMilli: 10_000,
      receivedSupplierMilli: 8_000,
      supplierOrderUnitSnapshot: 'PACK',
      supplierToBuyerBaseFactorMilliSnapshot: 5_000,
      orderedBuyerBaseMilli: 50_000,
      receivedBuyerBaseMilli: 40_000,
      buyerBaseUnitSnapshot: 'KG',
    } as PurchaseOrderItem);
    expect(quantities).toMatchObject({
      outstandingSupplierMilli: 2_000,
      outstandingBuyerBaseMilli: 10_000,
      supplierUnit: 'PACK',
      buyerUnit: 'KG',
    });
  });

  it('derives legal actions from side, status, and role without enabling C34 line persistence', () => {
    expect(connectedActionAvailability('BUYER', 'DRAFT', 'OWNER')).toMatchObject({
      buyerSubmit: true,
      buyerCancel: true,
      supplierRespond: false,
      supplierShip: false,
      receive: false,
    });
    expect(
      connectedActionAvailability('SUPPLIER', 'SUBMITTED', 'PROCUREMENT_MANAGER').supplierRespond,
    ).toBe(true);
    expect(
      connectedActionAvailability('SUPPLIER', 'ACCEPTED', 'PROCUREMENT_MANAGER').supplierShip,
    ).toBe(true);
    expect(connectedActionAvailability('BUYER', 'SHIPPED', 'STOREKEEPER').receive).toBe(true);
    expect(connectedActionAvailability('BUYER', 'SHIPPED', 'ANALYST').receive).toBe(false);
  });
});
