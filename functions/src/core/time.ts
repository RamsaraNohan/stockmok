import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * Server time.
 *
 * DB-02 §0: every `ts` field is `FieldValue.serverTimestamp()` on write unless
 * stated otherwise. A client clock is never an input to a stored timestamp, so
 * a caller cannot back-date an audit record, a movement or a receipt.
 *
 * The one documented exception is `StockMovement.effectiveAt`, which the frozen
 * opening-balance form may back-date and which the B3 command validates against
 * {@link serverNow} — it is never used for ordering (DB-02 §4.6).
 */

export type ServerTimestamp = ReturnType<typeof FieldValue.serverTimestamp>;

export function serverTimestamp(): ServerTimestamp {
  return FieldValue.serverTimestamp();
}

/**
 * Server wall clock, for comparisons only. Never written to a document — a
 * written timestamp is always {@link serverTimestamp}, so the value Firestore
 * commits is the one Firestore chose.
 */
export function serverNow(): Timestamp {
  return Timestamp.now();
}

export function isFutureTimestamp(candidate: Timestamp, now: Timestamp = serverNow()): boolean {
  return candidate.toMillis() > now.toMillis();
}
