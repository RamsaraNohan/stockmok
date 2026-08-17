import { describe, expect, it } from 'vitest';
import {
  canonicalPayload,
  convertMilli,
  deriveShortfall,
  deriveStockStatus,
  deriveStockValueMinor,
  hashPayload,
  normalizeHandle,
  normalizeSku,
  roundHalfUpRatio,
  sumBalanceValues,
} from '../packages/shared/src/domain.js';

describe('integer domain utilities', () => {
  it('rounds half-up at, below, and above the boundary', () => {
    expect(roundHalfUpRatio(4n, 10n)).toBe(0n);
    expect(roundHalfUpRatio(5n, 10n)).toBe(1n);
    expect(roundHalfUpRatio(6n, 10n)).toBe(1n);
  });

  it('derives zero, low, exact-minimum, and normal stock status', () => {
    expect(deriveStockStatus(0, 20_000)).toBe('OUT_OF_STOCK');
    expect(deriveStockStatus(19_999, 20_000)).toBe('LOW_STOCK');
    expect(deriveStockStatus(20_000, 20_000)).toBe('IN_STOCK');
    expect(deriveStockStatus(1, 0)).toBe('IN_STOCK');
  });

  it('derives shortfall and balance-grain valuation exactly', () => {
    expect(deriveShortfall(20_000, 18_000)).toBe(2_000);
    expect(deriveShortfall(20_000, 20_000)).toBe(0);
    expect(deriveStockValueMinor(18_000, 125_000)).toBe(2_250_000);
    expect(sumBalanceValues([39_890_000, 29_280_000])).toBe(69_170_000);
  });

  it('converts supplier order units with bigint intermediates', () => {
    expect(convertMilli(10_000, 5_000)).toBe(50_000);
  });

  it('rejects unsafe numeric inputs and unsafe outputs', () => {
    expect(() => deriveStockValueMinor(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)).toThrow(
      RangeError,
    );
    expect(() => sumBalanceValues([Number.MAX_SAFE_INTEGER, 1])).toThrow(RangeError);
    expect(() => convertMilli(-1, 1_000)).toThrow(RangeError);
  });

  it('normalizes SKUs and handles while denying reserved handles', () => {
    expect(normalizeSku('  meat   001 ')).toBe('MEAT 001');
    expect(normalizeHandle(' Grand-Ocean ')).toBe('grand-ocean');
    expect(() => normalizeHandle('admin')).toThrow('reserved');
    expect(normalizeHandle('UPPER')).toBe('upper');
    expect(() => normalizeHandle('bad_handle')).toThrow(RangeError);
  });

  it('canonicalizes and hashes payloads independent of key order and operation id', async () => {
    const left = { z: 2, operationId: 'first', nested: { b: true, a: 1 } };
    const right = { nested: { a: 1, b: true }, operationId: 'second', z: 2 };
    expect(canonicalPayload(left)).toBe(canonicalPayload(right));
    expect(await hashPayload(left)).toBe(await hashPayload(right));
    expect(await hashPayload(left)).toMatch(/^[a-f0-9]{64}$/);
  });
});
