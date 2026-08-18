import type { CommandResult } from '@stockmok/shared';

/**
 * The typed error model — DB-06 §7, verbatim.
 *
 * A raw Firebase error code never reaches the user interface, so the reason
 * code is the primary fact and the `HttpsError` code is derived from it. The
 * table below is the whole mapping; adding a reason anywhere else in the
 * backend is a compile error, which is the point.
 */

export const COMMAND_ERROR_CODES = [
  'unauthenticated',
  'permission-denied',
  'not-found',
  'failed-precondition',
  'invalid-argument',
  'already-exists',
  'aborted',
  'resource-exhausted',
  'internal',
] as const;

export type CommandErrorCode = (typeof COMMAND_ERROR_CODES)[number];

/** DB-06 §7 — reason code → HttpsError code. */
export const REASON_CODE_MAP = {
  NOT_SIGNED_IN: 'unauthenticated',

  SCHEMA_INVALID: 'invalid-argument',
  SAME_WAREHOUSE: 'invalid-argument',
  INVALID_QUANTITY: 'invalid-argument',
  INVALID_FACTOR: 'invalid-argument',
  SELF_CONNECTION: 'invalid-argument',

  NOT_A_MEMBER: 'permission-denied',
  MEMBERSHIP_NOT_ACTIVE: 'permission-denied',
  ROLE_NOT_PERMITTED: 'permission-denied',
  CROSS_TENANT_REFERENCE: 'permission-denied',
  OWNER_PROTECTED: 'permission-denied',
  INVITE_EMAIL_MISMATCH: 'permission-denied',

  INVALID_TRANSITION: 'failed-precondition',
  INSUFFICIENT_STOCK: 'failed-precondition',
  OVER_RECEIPT: 'failed-precondition',
  PRODUCT_NOT_ACTIVE: 'failed-precondition',
  WAREHOUSE_NOT_ACTIVE: 'failed-precondition',
  WAREHOUSE_HAS_STOCK: 'failed-precondition',
  WAREHOUSE_HAS_OPEN_RECEIPT: 'failed-precondition',
  OPENING_BALANCE_ALREADY_RECORDED: 'failed-precondition',
  CONNECTION_NOT_ACTIVE: 'failed-precondition',
  CATALOG_ITEM_NOT_PUBLISHED: 'failed-precondition',
  MAPPING_EXISTS: 'failed-precondition',
  SEMANTIC_NOT_CONFIRMED: 'failed-precondition',
  INVITE_EXPIRED: 'failed-precondition',
  INVITE_NOT_PENDING: 'failed-precondition',
  OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD: 'failed-precondition',

  HANDLE_TAKEN: 'already-exists',
  SKU_TAKEN: 'already-exists',
  CONNECTION_EXISTS: 'already-exists',

  RESOURCE_NOT_FOUND: 'not-found',
  INVITE_UNKNOWN: 'not-found',
  SKU_NOT_FOUND: 'not-found',

  NOTIFICATION_FANOUT_EXCEEDED: 'resource-exhausted',
} as const satisfies Record<string, CommandErrorCode>;

export type CommandReason = keyof typeof REASON_CODE_MAP;

export function codeForReason(reason: CommandReason): CommandErrorCode {
  return REASON_CODE_MAP[reason];
}

export interface CommandFailureDetails {
  readonly reason: CommandReason;
  readonly path?: string;
  readonly [key: string]: unknown;
}

/**
 * Every deliberate backend rejection. `aborted` and `internal` carry no reason
 * in DB-06 §7 and are raised through {@link untypedFailure} instead, so the
 * reason registry stays exactly the frozen table.
 */
export class CommandFailure extends Error {
  readonly code: CommandErrorCode;
  readonly reason: CommandReason | undefined;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: CommandErrorCode,
    message: string,
    reason?: CommandReason,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CommandFailure';
    this.code = code;
    this.reason = reason;
    this.details = details;
  }
}

/** Raise a failure whose code is derived from the frozen reason table. */
export function fail(
  reason: CommandReason,
  message: string,
  details?: Record<string, unknown>,
): never {
  throw new CommandFailure(codeForReason(reason), message, reason, details);
}

/** Raise `aborted` or `internal`, the two codes DB-06 §7 lists no reason for. */
export function untypedFailure(code: 'aborted' | 'internal', message: string): never {
  throw new CommandFailure(code, message);
}

export function isCommandFailure(error: unknown): error is CommandFailure {
  return error instanceof CommandFailure;
}

const GRPC_ABORTED = 10;
const GRPC_INVALID_ARGUMENT = 3;

/**
 * A transaction that did not commit because another one touched the same
 * documents first.
 *
 * DB-06 §7 lists `aborted` as its own code precisely so this case is
 * distinguishable from a defect: it tells the caller the operation did **not**
 * happen and that retrying the same `operationId` is the correct response.
 * Collapsing it into `internal` says the opposite, and a client that believes
 * an operation may have half-happened cannot safely retry it.
 *
 * Two shapes reach us. Firestore normally raises gRPC `ABORTED`, which the
 * client library retries internally and only surfaces once its own attempts are
 * exhausted. The emulator instead rejects further work on a contended
 * transaction with `INVALID_ARGUMENT` and *"Transaction is invalid or closed"*,
 * which the library does not treat as retryable, so it escapes on the first
 * conflict. Both mean the same thing to a caller. The `INVALID_ARGUMENT` arm is
 * matched on that specific message as well as the code, because a genuine
 * invalid argument must keep reporting itself as one.
 */
function isContentionAbort(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code } = error as { code?: unknown };
  if (code === GRPC_ABORTED) return true;
  if (code !== GRPC_INVALID_ARGUMENT) return false;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && /transaction is invalid or closed/i.test(message);
}

/**
 * Map any thrown value onto the stable client contract. An unexpected error
 * becomes `internal` with a fixed message — a stack trace or a Firestore
 * message never crosses the boundary.
 */
export function toCommandResult(error: unknown): Extract<CommandResult, { ok: false }> {
  if (isContentionAbort(error)) {
    return {
      ok: false,
      code: 'aborted',
      message: 'Another change reached this record first. Please try again.',
    };
  }
  if (isCommandFailure(error)) {
    const base = {
      ok: false as const,
      code: error.code,
      message: error.message,
    };
    const details =
      error.reason === undefined ? error.details : { reason: error.reason, ...error.details };
    return details === undefined ? base : { ...base, details };
  }
  return { ok: false, code: 'internal', message: 'The operation could not be completed.' };
}
