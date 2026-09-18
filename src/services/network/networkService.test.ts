import type { ConnectionProjection } from '@stockmok/shared';
import { describe, expect, it } from 'vitest';

import {
  canDisableConnection,
  canRespondToConnection,
  getConnectionCounterparty,
  isValidBusinessHandle,
  normalizeBusinessHandle,
} from './networkService';

describe('Network exact-handle contract', () => {
  it('normalizes only an optional leading at-sign, casing, and surrounding whitespace', () => {
    expect(normalizeBusinessHandle('  @FreshFoods  ')).toBe('freshfoods');
    expect(normalizeBusinessHandle('fresh@foods')).toBe('fresh@foods');
  });

  it('accepts only the frozen exact-handle shape', () => {
    expect(isValidBusinessHandle('@freshfoods')).toBe(true);
    expect(isValidBusinessHandle('ab')).toBe(false);
    expect(isValidBusinessHandle('fresh foods')).toBe(false);
    expect(isValidBusinessHandle('fresh_foods')).toBe(false);
  });
});

describe('Network connection action authority', () => {
  const pending = {
    buyerOrgId: 'buyer-org',
    supplierOrgId: 'supplier-org',
    buyerHandle: 'buyer',
    buyerName: 'Buyer',
    supplierHandle: 'supplier',
    supplierName: 'Supplier',
    status: 'PENDING',
  } as ConnectionProjection;

  it('derives the counterparty without exposing the wrong organization identity', () => {
    expect(getConnectionCounterparty(pending, 'buyer-org')).toEqual({
      handle: 'supplier',
      name: 'Supplier',
      direction: 'OUTGOING',
    });
    expect(getConnectionCounterparty(pending, 'supplier-org')).toEqual({
      handle: 'buyer',
      name: 'Buyer',
      direction: 'INCOMING',
    });
  });

  it('allows only the supplier-side partner writers to respond', () => {
    expect(canRespondToConnection(pending, 'supplier-org', 'PROCUREMENT_MANAGER')).toBe(true);
    expect(canRespondToConnection(pending, 'buyer-org', 'OWNER')).toBe(false);
    expect(canRespondToConnection(pending, 'supplier-org', 'ANALYST')).toBe(false);
  });

  it('allows only Owner/Admin to disable an active connection', () => {
    const active = { ...pending, status: 'ACTIVE' } as ConnectionProjection;
    expect(canDisableConnection(active, 'OWNER')).toBe(true);
    expect(canDisableConnection(active, 'ADMIN')).toBe(true);
    expect(canDisableConnection(active, 'PROCUREMENT_MANAGER')).toBe(false);
    expect(canDisableConnection(pending, 'OWNER')).toBe(false);
  });
});
