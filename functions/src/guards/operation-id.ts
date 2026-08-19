import { UuidV4Schema } from '@stockmok/shared';
import { fail } from '../core/errors.js';

/**
 * `operationId` validation.
 *
 * The id is a client-generated UUID v4, created when the form opens rather than
 * when submit is pressed, so a double-click and a retry after a timeout carry
 * the same id (DB-06 §0, control pack 11 §15). It is also the document id of the
 * command receipt, so it must be a single Firestore path segment — which a
 * UUID v4 always is, and which is why nothing else is accepted here.
 */

export function isValidOperationId(value: unknown): value is string {
  return UuidV4Schema.safeParse(value).success;
}

export function assertOperationId(value: unknown): string {
  const parsed = UuidV4Schema.safeParse(value);
  if (!parsed.success) {
    fail('SCHEMA_INVALID', 'operationId must be a UUID v4.', { path: 'operationId' });
  }
  return parsed.data;
}
