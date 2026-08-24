import type { DocumentData } from 'firebase-admin/firestore';

import { DEFAULT_RANDOM_SEED, PROFILES } from '../../scripts/qa/config.js';
import { collectAuthUsers, type QaPlan } from '../../scripts/qa/dataset.js';
import { buildPlan } from '../../scripts/qa/generators/organizations.js';
import { buildDataset } from '../../scripts/qa/seed.js';

/**
 * The smoke dataset, built offline.
 *
 * `DatasetBuilder` keeps every parsed document, so the same verifiers that run
 * against the emulator can run against the plan with no emulator in the loop.
 * That makes the QA suite part of the ordinary unit run.
 */

export interface Fixture {
  readonly plan: QaPlan;
  readonly snapshot: { readonly documents: ReadonlyMap<string, DocumentData> };
  readonly authUids: readonly string[];
}

let cached: Fixture | undefined;

export function smokeFixture(): Fixture {
  if (cached !== undefined) return cached;
  const plan = buildPlan(PROFILES.smoke, DEFAULT_RANDOM_SEED);
  const snapshot = { documents: buildDataset(plan).toDocumentMap() };
  cached = { plan, snapshot, authUids: collectAuthUsers(plan).map((user) => user.uid) };
  return cached;
}

/**
 * `DocumentData` indexes to `any`, which the strict lint rules reject on sight.
 * Reading through here keeps every test assertion typed as `unknown`.
 */
export function field(document: DocumentData | undefined, key: string): unknown {
  if (document === undefined) return undefined;
  return (document as Record<string, unknown>)[key];
}

export function documentField(fixture: Fixture, path: string, key: string): unknown {
  return field(fixture.snapshot.documents.get(path), key);
}

export function pathsUnder(
  fixture: Fixture,
  predicate: (parts: readonly string[]) => boolean,
): readonly string[] {
  return [...fixture.snapshot.documents.keys()].filter((path) => predicate(path.split('/')));
}
