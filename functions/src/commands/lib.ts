import type { DocumentReference, DocumentSnapshot, Firestore } from 'firebase-admin/firestore';
import { fail, untypedFailure } from '../core/errors.js';
import type { TransactionScope } from '../core/transaction.js';
import type { TrustedMembership } from '../guards/membership.js';

/**
 * Small B2-internal helpers shared by `functions/src/commands/*.ts`.
 *
 * Deliberately narrow and command-layer-only — nothing here is a second
 * domain-utility registry. Anything that belongs to every consumer of the
 * shared type system (Antigravity included) stays in `packages/shared`;
 * anything that is purely a trusted-backend implementation detail (token
 * generation, a monogram derived once at `org.create`, a read-then-create
 * uniqueness check) lives here instead.
 */

/** `purchaseOrders` statuses DB-06 §5/§6 and §8 call "open" for a supplier guard. */
export const OPEN_PRIVATE_PO_STATUSES = [
  'ORDERED',
  'PARTIALLY_RECEIVED',
  'ACCEPTED',
  'SHIPPED',
] as const;

/** SHA-256 hex digest of a raw string — the invitation `tokenHash` primitive (DB-02 §3.4). */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** A 256-bit random invitation token, returned to the caller exactly once (DB-02 §3.4). */
export function generateInvitationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** A small fixed palette of design-token ids (DB-02 §1.1 — "a token id, not a raw hex"). */
const MONOGRAM_COLOR_TOKENS = [
  'blue',
  'green',
  'purple',
  'orange',
  'teal',
  'red',
  'indigo',
  'amber',
] as const;

/** Deterministic 1–2 char monogram from an organization name (DB-02 §1.1 / §3.1). */
export function deriveMonogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const initials = words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return initials.length > 0 ? initials : 'ST';
}

/** Deterministic color-token pick, stable for a given seed (e.g. the org handle). */
export function deriveMonogramColor(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  const token = MONOGRAM_COLOR_TOKENS[hash % MONOGRAM_COLOR_TOKENS.length];
  return token ?? 'blue';
}

/** The local part of an email, used as a last-resort display-name fallback. */
export function displayNameFallback(email: string): string {
  return email.split('@')[0] ?? email;
}

/**
 * The "read first, then create" uniqueness pattern `org.create` (handle) and
 * `product.create` (SKU) both need. `scope.create()` alone already makes
 * uniqueness race-free at commit; reading first turns the common case into a
 * typed, friendly error instead of a raw Firestore ALREADY_EXISTS surfacing
 * as `internal`. A concurrent winner is still caught at commit, because
 * Firestore retries this transaction body on contention and the retry's
 * read sees the now-existing document.
 */
export async function assertReservationAvailable(
  scope: TransactionScope,
  ref: DocumentReference,
  reason: Parameters<typeof fail>[0],
  message: string,
): Promise<void> {
  const snapshot = await scope.get(ref);
  if (snapshot.exists) fail(reason, message);
}

/** Reads a document inside the transaction, returning `undefined` when absent. */
export async function readDoc(
  scope: TransactionScope,
  ref: DocumentReference,
): Promise<DocumentSnapshot> {
  return scope.get(ref);
}

/** Firestore's own random-id generator, used for every server-generated document id. */
export function newId(db: Firestore, collectionPath: string): string {
  return db.collection(collectionPath).doc().id;
}

/**
 * Narrows `CommandContext.membership` for a `MEMBER_ROLE`-authorized command,
 * where the frame guarantees it is populated before the handler runs. A
 * `!`-assertion is banned lint-wide; an `undefined` here is a frame defect,
 * not a caller-triggerable outcome, so it fails `internal` rather than
 * claiming a reason from the DB-06 §7 table.
 */
export function requireMembership(membership: TrustedMembership | undefined): TrustedMembership {
  if (!membership) {
    untypedFailure('internal', 'This command requires a verified membership.');
  }
  return membership;
}
