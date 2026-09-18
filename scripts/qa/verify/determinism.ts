import { createHash } from 'node:crypto';

import type { Timestamp } from 'firebase-admin/firestore';

import type { QaSnapshot } from './integrity.js';

/**
 * Canonical determinism fingerprint.
 *
 * Deterministic-by-construction is not the same as canonical. Firestore returns
 * documents in an unspecified order and object key order is not meaningful, so a
 * naive hash can differ between two identical datasets, or - worse - agree
 * between two different ones because something was quietly dropped. The rules
 * below are fixed and exhaustive:
 *
 *   1. enumerate every QA-governed logical document
 *   2. sort documents lexicographically by full Firestore document path
 *   3. recursively sort object and map keys
 *   4. preserve array ordering, which is domain-meaningful wherever it appears
 *   5. normalize Firestore Timestamps to ISO-8601 UTC
 *   6. keep integers as integers, with no float or string coercion
 *   7. exclude only fields explicitly classified as non-logical
 *   8. serialize canonically as UTF-8 JSON
 *   9. SHA-256 the canonical representation
 *
 * Nothing is excluded under rule 7. Every field in this dataset is written by
 * the generator: Firestore adds no server-side fields to a document, so there is
 * nothing emulator-generated to drop. Auth accounts *do* carry server metadata,
 * so the fingerprint covers their logical identity only - the sorted uid list -
 * and that exclusion is named rather than silent.
 */

export const FINGERPRINT_ALGORITHM = 'SHA-256';
export const FINGERPRINT_SERIALIZATION = 'CANONICAL_PATH_SORTED_JSON';

export const FINGERPRINT_COVERS: readonly string[] = [
  'datasetVersion',
  'profile',
  'seed',
  'fixtureEpoch',
  'every Firestore document path in the emulator',
  'every field of every document, keys recursively sorted',
  'Firestore Timestamps as ISO-8601 UTC',
  'the sorted list of Auth uids',
];

export const FINGERPRINT_EXCLUDES: readonly string[] = [
  'Auth account server metadata (creationTime, lastRefreshTime, passwordHash) - assigned by the emulator, not by the generator',
];

function isTimestamp(value: object): value is Timestamp {
  return 'toMillis' in value && 'toDate' in value && typeof value.toDate === 'function';
}

export function canonicalizeValue(value: unknown, where: string): unknown {
  if (value === null) return null;

  if (Array.isArray(value)) {
    // Rule 4: array order is preserved. Every array in this schema set
    // (`partnerTypes`) is written in a fixed order by the generator, so the
    // order is part of the value rather than an artefact of iteration.
    return value.map((entry, index) => canonicalizeValue(entry, `${where}[${String(index)}]`));
  }

  if (typeof value === 'object') {
    if (isTimestamp(value)) {
      return { $timestamp: value.toDate().toISOString() };
    }
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => [key, canonicalizeValue(entry, `${where}.${key}`)] as const);
    return Object.fromEntries(entries);
  }

  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(
        `${where} holds ${String(value)}, which is not a safe integer; the fingerprint refuses float coercion`,
      );
    }
    return value;
  }

  if (typeof value === 'string' || typeof value === 'boolean') return value;

  throw new TypeError(`${where} holds an unfingerprintable ${typeof value}`);
}

export interface FingerprintInput {
  readonly datasetVersion: string;
  readonly profile: string;
  readonly seed: number;
  readonly fixtureEpoch: string;
  readonly authUids: readonly string[];
}

export interface FingerprintResult {
  readonly fingerprint: string;
  readonly documentCount: number;
  readonly algorithm: string;
  readonly serialization: string;
  readonly covers: readonly string[];
  readonly excludes: readonly string[];
  /** The exact bytes hashed, for diffing two runs that disagree. */
  readonly canonicalJson: string;
}

export function fingerprintSnapshot(
  snapshot: QaSnapshot,
  input: FingerprintInput,
): FingerprintResult {
  const paths = [...snapshot.documents.keys()].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );

  const documents = paths.map((path) => {
    const data = snapshot.documents.get(path);
    if (data === undefined) throw new Error(`document ${path} vanished during fingerprinting`);
    return { path, data: canonicalizeValue(data, path) };
  });

  const payload = {
    datasetVersion: input.datasetVersion,
    profile: input.profile,
    seed: input.seed,
    fixtureEpoch: input.fixtureEpoch,
    authUids: [...input.authUids].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)),
    documentCount: documents.length,
    documents,
  };

  const canonicalJson = JSON.stringify(payload);
  const fingerprint = createHash('sha256').update(Buffer.from(canonicalJson, 'utf8')).digest('hex');

  return {
    fingerprint,
    documentCount: documents.length,
    algorithm: FINGERPRINT_ALGORITHM,
    serialization: FINGERPRINT_SERIALIZATION,
    covers: FINGERPRINT_COVERS,
    excludes: FINGERPRINT_EXCLUDES,
    canonicalJson,
  };
}
