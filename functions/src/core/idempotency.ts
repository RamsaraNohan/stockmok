import { hashPayload, paths } from '@stockmok/shared';
import type { DocumentReference, Firestore } from 'firebase-admin/firestore';
import { fail } from './errors.js';
import { serverTimestamp } from './time.js';
import type { TransactionScope } from './transaction.js';

/**
 * `operationId` receipts — the idempotency foundation.
 *
 * `organizations/{orgId}/commandReceipts/{operationId}` (DB-02 §3.6). The
 * receipt is read as the **first** read inside the transaction and written with
 * `txn.create` as the **last** write, inside the same transaction as the effect,
 * so a receipt without its effect — or an effect without its receipt — is
 * impossible (DB-06 §0, control pack 11 §15).
 *
 * The receipt is tenant-scoped, so one organization can neither observe nor
 * squat on another's operation ids, and every field on it is server-controlled:
 * the client supplies the id and nothing else. Clients have no read or write
 * access to the collection at all (`firestore.rules`, zone 3 BACKEND_ONLY).
 */

/** A safe scalar, per `CommandReceiptSchema`. Never a document, never a nested map. */
export type SafeScalar = string | number | boolean | null;

export type CommandReceiptResult = Readonly<Record<string, SafeScalar>>;

export interface StoredCommandReceipt {
  readonly operationId: string;
  readonly commandType: string;
  readonly actorUid: string;
  readonly payloadHash: string;
  readonly resultStatus: 'OK';
  readonly result: CommandReceiptResult;
}

export interface ReceiptClaim {
  readonly orgId: string;
  readonly operationId: string;
  /** The command's dot-case name, e.g. `stock.transfer`. */
  readonly commandType: string;
  readonly actorUid: string;
  readonly payloadHash: string;
}

export function receiptRef(db: Firestore, orgId: string, operationId: string): DocumentReference {
  return db.doc(paths.commandReceipt(orgId, operationId));
}

/**
 * SHA-256 over the canonicalised payload with `operationId` removed. Closes the
 * "same id, different data" hole a naive implementation leaves open.
 */
export async function computePayloadHash(payload: unknown): Promise<string> {
  return hashPayload(payload);
}

/** `Q-069` — the first read of every idempotent command. */
export async function readCommandReceipt(
  scope: TransactionScope,
  db: Firestore,
  orgId: string,
  operationId: string,
): Promise<StoredCommandReceipt | undefined> {
  const snapshot = await scope.get(receiptRef(db, orgId, operationId));
  if (!snapshot.exists) return undefined;
  const data = snapshot.data() as Partial<StoredCommandReceipt> | undefined;
  if (!data) return undefined;
  return {
    operationId,
    commandType: typeof data.commandType === 'string' ? data.commandType : '',
    actorUid: typeof data.actorUid === 'string' ? data.actorUid : '',
    payloadHash: typeof data.payloadHash === 'string' ? data.payloadHash : '',
    resultStatus: 'OK',
    result: isSafeResult(data.result) ? data.result : {},
  };
}

/**
 * Decides what a stored receipt means for the current call.
 *
 *   · identical payload, same command → `REPLAY`, return the stored result and
 *     write nothing;
 *   · different payload → `OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD`;
 *   · same id reused by a *different* command → the same rejection. A receipt is
 *     evidence that one specific operation ran; it is not a token another
 *     command may spend, and aliasing one would let a caller suppress a real
 *     mutation by reusing an id.
 */
export function resolveReplay(
  stored: StoredCommandReceipt,
  claim: ReceiptClaim,
): CommandReceiptResult {
  if (stored.commandType !== claim.commandType) {
    fail(
      'OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD',
      'This operation id was already used by a different command.',
      { operationId: claim.operationId },
    );
  }
  if (stored.payloadHash !== claim.payloadHash) {
    fail(
      'OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD',
      'This operation id was already used with different data.',
      { operationId: claim.operationId },
    );
  }
  return stored.result;
}

export function isSafeScalar(value: unknown): value is SafeScalar {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isSafeInteger(value))
  );
}

export function isSafeResult(value: unknown): value is CommandReceiptResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(isSafeScalar);
}

export function assertSafeResult(value: unknown): CommandReceiptResult {
  if (!isSafeResult(value)) {
    fail('SCHEMA_INVALID', 'A command result may contain safe scalars only.');
  }
  return value;
}

/**
 * The LAST write of an idempotent command. `create`, never `set`: a second
 * concurrent call with the same id loses the create precondition rather than
 * overwriting the first call's receipt.
 */
export function writeCommandReceipt(
  scope: TransactionScope,
  db: Firestore,
  claim: ReceiptClaim,
  result: CommandReceiptResult,
): void {
  scope.create(receiptRef(db, claim.orgId, claim.operationId), {
    operationId: claim.operationId,
    commandType: claim.commandType,
    actorUid: claim.actorUid,
    payloadHash: claim.payloadHash,
    resultStatus: 'OK',
    result: assertSafeResult(result),
    createdAt: serverTimestamp(),
  });
}
