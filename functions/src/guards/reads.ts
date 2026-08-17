import { paths } from '@stockmok/shared';
import type {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Transaction,
} from 'firebase-admin/firestore';

/**
 * Trusted backend-internal reads.
 *
 * Deliberately narrow: only what auth, membership, RBAC, tenant validation,
 * command receipts, audit and notification need. The general read/query layer
 * is Lane A's (DB-04); nothing here may grow into it.
 */

/** Reads the same way inside and outside a transaction. */
export type TrustedReader = (ref: DocumentReference) => Promise<DocumentSnapshot>;

export function directReader(): TrustedReader {
  return (ref) => ref.get();
}

export function transactionReader(txn: Transaction): TrustedReader {
  return (ref) => txn.get(ref);
}

export function docRef(db: Firestore, path: string): DocumentReference {
  return db.doc(path);
}

export interface RawMemberDocument extends DocumentData {
  readonly uid?: unknown;
  readonly role?: unknown;
  readonly status?: unknown;
  readonly displayName?: unknown;
  readonly email?: unknown;
}

export async function readMemberDocument(
  db: Firestore,
  read: TrustedReader,
  orgId: string,
  uid: string,
): Promise<RawMemberDocument | undefined> {
  const snapshot = await read(docRef(db, paths.member(orgId, uid)));
  return snapshot.exists ? snapshot.data() : undefined;
}

export interface RawOrganizationDocument extends DocumentData {
  readonly organizationId?: unknown;
  readonly name?: unknown;
  readonly ownerUid?: unknown;
  readonly status?: unknown;
}

export async function readOrganizationDocument(
  db: Firestore,
  read: TrustedReader,
  orgId: string,
): Promise<RawOrganizationDocument | undefined> {
  const snapshot = await read(docRef(db, paths.organization(orgId)));
  return snapshot.exists ? snapshot.data() : undefined;
}

/**
 * `Q-059` — notification recipient resolution. ACTIVE members holding one of the
 * given roles, index `IDX-25` (`status ASC, role ASC`), hard-bounded at 50 and
 * resolved before any write (DB-04 §8, control pack 11 §17).
 */
export async function readActiveMemberUidsByRole(
  db: Firestore,
  orgId: string,
  roles: readonly string[],
  limit: number,
  txn?: Transaction,
): Promise<readonly string[]> {
  if (roles.length === 0) return [];
  const query = db
    .collection(`${paths.organization(orgId)}/members`)
    .where('status', '==', 'ACTIVE')
    .where('role', 'in', [...roles])
    .limit(limit);
  const snapshot = await (txn ? txn.get(query) : query.get());
  return snapshot.docs.map((doc) => doc.id);
}
