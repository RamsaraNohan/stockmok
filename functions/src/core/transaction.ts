import type {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Query,
  QuerySnapshot,
  Transaction,
  UpdateData,
} from 'firebase-admin/firestore';
import { untypedFailure } from './errors.js';
import type { TrustedReader } from '../guards/reads.js';

/**
 * The transaction foundation.
 *
 * DB-06 §0 fixes the shape of every command:
 *
 *     READ CURRENT TRUSTED STATE → VALIDATE → CALCULATE ON INTEGERS → WRITE ATOMICALLY
 *
 * with three properties Firestore or the contract requires and neither enforces
 * on its own. This scope enforces all three, so a later command cannot forget
 * one:
 *
 *   1. **All reads precede all writes.** A Firestore requirement. Calling `get`
 *      after a write throws here rather than at commit, where the message is
 *      opaque.
 *   2. **Every in-transaction query is bounded.** A query cannot be issued
 *      without a limit, because the scope applies the limit itself.
 *   3. **No deletes.** `CLIENT_DELETE_PATHS = 0` and no command in the frozen
 *      catalog deletes a document except `productSkuIndex` on a SKU change,
 *      which uses {@link TransactionScope.deleteIndexDocument} and says so.
 *
 * What the scope deliberately does **not** do is hide a read. Correctness of
 * every stock command depends on the current value being read inside the
 * transaction, so there is no cached-read convenience anywhere in this module.
 */

/** DB-04 §8 — the largest bound any command-internal query carries. */
export const MAX_TRANSACTION_QUERY_LIMIT = 100;

/** Firestore's own ceiling; the largest frozen write set is ~18 documents. */
export const MAX_TRANSACTION_WRITES = 500;

export class TransactionScope {
  readonly #txn: Transaction;
  #phase: 'READ' | 'WRITE' = 'READ';
  #writes = 0;

  constructor(txn: Transaction) {
    this.#txn = txn;
  }

  /** Escape hatch for a Firestore API this scope does not wrap. Use sparingly. */
  get raw(): Transaction {
    return this.#txn;
  }

  get phase(): 'READ' | 'WRITE' {
    return this.#phase;
  }

  get writeCount(): number {
    return this.#writes;
  }

  /** A {@link TrustedReader} the guards can share, still subject to the phase rule. */
  reader(): TrustedReader {
    return (ref) => this.get(ref);
  }

  #assertReadPhase(): void {
    if (this.#phase === 'WRITE') {
      untypedFailure('internal', 'All transaction reads must precede all transaction writes.');
    }
  }

  #recordWrite(): void {
    this.#phase = 'WRITE';
    this.#writes += 1;
    if (this.#writes > MAX_TRANSACTION_WRITES) {
      untypedFailure('internal', 'Transaction write set exceeds the Firestore limit.');
    }
  }

  async get(ref: DocumentReference): Promise<DocumentSnapshot> {
    this.#assertReadPhase();
    return this.#txn.get(ref);
  }

  async getAll(...refs: readonly DocumentReference[]): Promise<readonly DocumentSnapshot[]> {
    this.#assertReadPhase();
    if (refs.length === 0) return [];
    const [first, ...rest] = refs as [DocumentReference, ...DocumentReference[]];
    return this.#txn.getAll(first, ...rest);
  }

  /**
   * The only way to run a query inside a command transaction. The limit is
   * applied here, so an unbounded in-transaction query cannot be written.
   */
  async query(query: Query, limit: number): Promise<QuerySnapshot> {
    this.#assertReadPhase();
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_TRANSACTION_QUERY_LIMIT) {
      untypedFailure(
        'internal',
        `An in-transaction query limit must be between 1 and ${String(MAX_TRANSACTION_QUERY_LIMIT)}.`,
      );
    }
    return this.#txn.get(query.limit(limit));
  }

  /** Fails the transaction if the document already exists — the uniqueness primitive. */
  create(ref: DocumentReference, data: DocumentData): void {
    this.#recordWrite();
    this.#txn.create(ref, data);
  }

  set(ref: DocumentReference, data: DocumentData, options?: { merge: true }): void {
    this.#recordWrite();
    if (options) this.#txn.set(ref, data, options);
    else this.#txn.set(ref, data);
  }

  update(ref: DocumentReference, data: UpdateData<DocumentData>): void {
    this.#recordWrite();
    this.#txn.update(ref, data);
  }

  /**
   * The single sanctioned delete: replacing a `productSkuIndex` entry when a SKU
   * changes (DB-02 §3.7). No other collection is ever deleted from.
   */
  deleteIndexDocument(ref: DocumentReference): void {
    if (!/\/productSkuIndex\/[^/]+$/.test(ref.path)) {
      untypedFailure('internal', 'Only a productSkuIndex entry may be deleted.');
    }
    this.#recordWrite();
    this.#txn.delete(ref);
  }
}

/**
 * Runs `body` inside a Firestore transaction. Firestore retries the body
 * internally on contention, so the body must be pure and free of side effects
 * outside the transaction (DB-06 §0). A fresh scope is created per attempt, so a
 * retry starts in the READ phase with a zeroed write count.
 */
export async function runTrustedTransaction<T>(
  db: Firestore,
  body: (scope: TransactionScope) => Promise<T>,
): Promise<T> {
  return db.runTransaction(async (txn) => body(new TransactionScope(txn)));
}
