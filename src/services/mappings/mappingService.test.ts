import { describe, expect, it } from 'vitest';

import {
  MAPPING_REFUSAL_COPY,
  canManageMappings,
  formatFactorMilli,
  mappingRefusalFromError,
  parsePositiveFactorMilli,
} from './mappingService';

describe('mapping service authority', () => {
  it('exposes exactly the seven frozen refusal states', () => {
    expect(Object.keys(MAPPING_REFUSAL_COPY)).toEqual([
      'NO_ACTIVE_CONNECTION',
      'SKU_NOT_FOUND',
      'ITEM_UNPUBLISHED',
      'SEMANTIC_NOT_CONFIRMED',
      'INVALID_FACTOR',
      'STALE_CONNECTION',
      'DUPLICATE_MAPPING',
    ]);
    expect(new Set(Object.values(MAPPING_REFUSAL_COPY)).size).toBe(7);
  });

  it.each([
    ['SKU_NOT_FOUND', 'SKU_NOT_FOUND'],
    ['RESOURCE_NOT_FOUND', 'SKU_NOT_FOUND'],
    ['CATALOG_ITEM_NOT_PUBLISHED', 'ITEM_UNPUBLISHED'],
    ['SEMANTIC_NOT_CONFIRMED', 'SEMANTIC_NOT_CONFIRMED'],
    ['INVALID_FACTOR', 'INVALID_FACTOR'],
    ['CONNECTION_NOT_ACTIVE', 'STALE_CONNECTION'],
    ['MAPPING_EXISTS', 'DUPLICATE_MAPPING'],
  ] as const)('maps backend reason %s to drawn state %s', (reason, state) => {
    expect(mappingRefusalFromError({ details: { reason } })).toBe(state);
    expect(mappingRefusalFromError({ customData: { details: { reason } } })).toBe(state);
  });

  it('does not invent a drawn state for an unrelated backend reason', () => {
    expect(mappingRefusalFromError({ details: { reason: 'ROLE_NOT_PERMITTED' } })).toBeNull();
    expect(mappingRefusalFromError(new Error('raw error'))).toBeNull();
  });

  it('converts a positive decimal factor to exact integer milli-units', () => {
    expect(parsePositiveFactorMilli('5')).toBe(5000);
    expect(parsePositiveFactorMilli('5.25')).toBe(5250);
    expect(parsePositiveFactorMilli('0.001')).toBe(1);
    expect(parsePositiveFactorMilli('0')).toBeNull();
    expect(parsePositiveFactorMilli('-1')).toBeNull();
    expect(parsePositiveFactorMilli('1.2345')).toBeNull();
    expect(formatFactorMilli(5000)).toBe('5');
    expect(formatFactorMilli(5250)).toBe('5.25');
  });

  it('limits mapping actions to the frozen O/A/PM role set', () => {
    expect(canManageMappings('OWNER')).toBe(true);
    expect(canManageMappings('ADMIN')).toBe(true);
    expect(canManageMappings('PROCUREMENT_MANAGER')).toBe(true);
    expect(canManageMappings('INVENTORY_MANAGER')).toBe(false);
    expect(canManageMappings('STOREKEEPER')).toBe(false);
    expect(canManageMappings('ANALYST')).toBe(false);
    expect(canManageMappings('VIEWER')).toBe(false);
    expect(canManageMappings(null)).toBe(false);
  });
});
