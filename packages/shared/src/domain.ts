import type { Milli, Minor, StockStatus } from './primitives.js';

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label} must be a safe integer`);
}

function toSafeNumber(value: bigint, label: string): number {
  const result = Number(value);
  assertSafeInteger(result, label);
  return result;
}

export function roundHalfUpRatio(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n) throw new RangeError('roundHalfUpRatio accepts non-negative values only');
  if (denominator <= 0n) throw new RangeError('denominator must be positive');
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
}

export function deriveStockStatus(onHandMilli: number, minimumStockMilli: number): StockStatus {
  assertSafeInteger(onHandMilli, 'onHandMilli');
  assertSafeInteger(minimumStockMilli, 'minimumStockMilli');
  if (onHandMilli <= 0) return 'OUT_OF_STOCK';
  if (minimumStockMilli > 0 && onHandMilli < minimumStockMilli) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function deriveShortfall(minimumStockMilli: number, onHandMilli: number): Milli {
  assertSafeInteger(minimumStockMilli, 'minimumStockMilli');
  assertSafeInteger(onHandMilli, 'onHandMilli');
  return Math.max(0, minimumStockMilli - onHandMilli) as Milli;
}

export function deriveStockValueMinor(onHandMilli: number, unitPriceMinor: number): Minor {
  assertSafeInteger(onHandMilli, 'onHandMilli');
  assertSafeInteger(unitPriceMinor, 'unitPriceMinor');
  if (onHandMilli < 0 || unitPriceMinor < 0)
    throw new RangeError('stock value inputs cannot be negative');
  return toSafeNumber(
    roundHalfUpRatio(BigInt(onHandMilli) * BigInt(unitPriceMinor), 1000n),
    'stockValueMinor',
  ) as Minor;
}

export function sumBalanceValues(values: readonly number[]): Minor {
  const total = values.reduce((sum, value) => {
    assertSafeInteger(value, 'balance stockValueMinor');
    if (value < 0) throw new RangeError('balance value cannot be negative');
    return sum + BigInt(value);
  }, 0n);
  return toSafeNumber(total, 'summary stockValueMinor') as Minor;
}

export function convertMilli(quantityMilli: number, factorMilli: number): Milli {
  assertSafeInteger(quantityMilli, 'quantityMilli');
  assertSafeInteger(factorMilli, 'factorMilli');
  if (quantityMilli < 0 || factorMilli <= 0) throw new RangeError('conversion inputs are invalid');
  return toSafeNumber(
    roundHalfUpRatio(BigInt(quantityMilli) * BigInt(factorMilli), 1000n),
    'convertedMilli',
  ) as Milli;
}

export const RESERVED_HANDLES = [
  'app',
  'api',
  'admin',
  'auth',
  'b',
  'store',
  'storefront',
  'invite',
  'login',
  'signup',
  'signin',
  'logout',
  'settings',
  'support',
  'help',
  'docs',
  'status',
  'www',
  'mail',
  'static',
  'assets',
  'public',
  'new',
  'select-workspace',
  'onboarding',
  'stockmok',
  'firebase',
] as const;

const reservedHandleSet = new Set<string>(RESERVED_HANDLES);

export function normalizeHandle(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,30}$/.test(normalized)) {
    throw new RangeError('handle must match lowercase [a-z0-9-] and contain 3-30 characters');
  }
  if (reservedHandleSet.has(normalized)) throw new RangeError('handle is reserved');
  return normalized;
}

export function normalizeSku(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ').toUpperCase();
  if (normalized.length === 0 || normalized.length > 80) throw new RangeError('SKU is invalid');
  return normalized;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'operationId')
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new RangeError('payload numbers must be safe integers');
  }
  if (['string', 'number', 'boolean', 'undefined'].includes(typeof value) || value === null)
    return value;
  throw new TypeError('payload contains a non-canonical value');
}

export function canonicalPayload(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export async function hashPayload(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalPayload(value)),
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
