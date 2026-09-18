import { Timestamp } from 'firebase-admin/firestore';

import { FIXTURE_EPOCH } from './config.js';

/**
 * Determinism primitives for the QA dataset.
 *
 * Two rules hold everywhere in `scripts/qa`:
 *   1. no `Math.random`, no `Date.now`, no `FieldValue.serverTimestamp()`;
 *   2. every random draw comes from a *named* sub-stream, so adding a generator
 *      never shifts the values another generator already produced.
 */

const EPOCH_MS = Date.parse(FIXTURE_EPOCH);

if (!Number.isFinite(EPOCH_MS)) {
  throw new Error(`FIXTURE_EPOCH is not a parseable instant: ${FIXTURE_EPOCH}`);
}

export type Rng = () => number;

/** mulberry32: small, fast, and identical across platforms and Node versions. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/** FNV-1a over UTF-16 code units. Stable, and never touches the global seed. */
export function hashLabel(label: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < label.length; index += 1) {
    hash ^= label.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Derive an independent stream. `deriveRng(seed, 'inventory', orgId)` is stable
 * no matter what any other generator did before it.
 */
export function deriveRng(seed: number, ...labels: readonly string[]): Rng {
  return createRng((seed ^ hashLabel(labels.join(' '))) >>> 0);
}

/** Deterministic integer in [minimum, maximum]. */
export function rngInt(rng: Rng, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || maximum < minimum) {
    throw new RangeError(`Invalid rngInt bounds ${String(minimum)}..${String(maximum)}`);
  }
  return minimum + Math.floor(rng() * (maximum - minimum + 1));
}

/** Deterministic element choice. Throws on an empty list rather than returning undefined. */
export function rngPick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new RangeError('rngPick requires a non-empty list');
  const chosen = items[rngInt(rng, 0, items.length - 1)];
  if (chosen === undefined) throw new RangeError('rngPick produced an out-of-range index');
  return chosen;
}

/** Zero-padded ordinal, so ids sort lexicographically in generation order. */
export function ordinal(index: number, width = 2): string {
  return String(index).padStart(width, '0');
}

/** All QA timestamps are offsets from FIXTURE_EPOCH. Nothing reads the wall clock. */
export function epochPlus(days: number, hours = 0, minutes = 0): Timestamp {
  const millis = EPOCH_MS + ((days * 24 + hours) * 60 + minutes) * 60_000;
  return Timestamp.fromMillis(millis);
}

export const QA_CLOCK = {
  epoch: epochPlus(0),
  orgCreated: epochPlus(0, 9),
  memberJoined: epochPlus(1, 9),
  catalogReady: epochPlus(2, 9),
  openingBalance: epochPlus(3, 9),
  firstMovement: epochPlus(5, 9),
  procurement: epochPlus(8, 9),
  network: epochPlus(11, 9),
  notification: epochPlus(14, 9),
} as const;
