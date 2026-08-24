import { describe, expect, it } from 'vitest';

import {
  DATASET_VERSION,
  DEFAULT_RANDOM_SEED,
  FIXTURE_EPOCH,
  PROFILES,
} from '../../scripts/qa/config.js';
import { collectAuthUsers } from '../../scripts/qa/dataset.js';
import { createRng, deriveRng, epochPlus, hashLabel } from '../../scripts/qa/deterministic.js';
import { buildPlan } from '../../scripts/qa/generators/organizations.js';
import { buildDataset } from '../../scripts/qa/seed.js';
import {
  FINGERPRINT_EXCLUDES,
  canonicalizeValue,
  fingerprintSnapshot,
} from '../../scripts/qa/verify/determinism.js';
import { smokeFixture } from './dataset-fixture.js';

function buildFingerprint(): ReturnType<typeof fingerprintSnapshot> {
  const plan = buildPlan(PROFILES.smoke, DEFAULT_RANDOM_SEED);
  const snapshot = { documents: buildDataset(plan).toDocumentMap() };
  return fingerprintSnapshot(snapshot, {
    datasetVersion: DATASET_VERSION,
    profile: plan.profile,
    seed: plan.seed,
    fixtureEpoch: FIXTURE_EPOCH,
    authUids: collectAuthUsers(plan).map((user) => user.uid),
  });
}

describe('QA determinism primitives', () => {
  it('produces a stable stream for a given seed', () => {
    const first = createRng(20_260_824);
    const second = createRng(20_260_824);
    const left = Array.from({ length: 16 }, () => first());
    const right = Array.from({ length: 16 }, () => second());
    expect(left).toEqual(right);
    expect(new Set(left).size).toBeGreaterThan(1);
  });

  it('gives each label an independent stream', () => {
    const inventory = deriveRng(20_260_824, 'inventory', 'qa-org-alpha');
    const movements = deriveRng(20_260_824, 'movements', 'qa-org-alpha');
    expect(inventory()).not.toBe(movements());
    // Re-deriving the same label reproduces the same stream, so adding a
    // generator cannot shift values another generator already produced.
    expect(deriveRng(20_260_824, 'inventory', 'qa-org-alpha')()).toBe(
      deriveRng(20_260_824, 'inventory', 'qa-org-alpha')(),
    );
  });

  it('hashes labels stably', () => {
    expect(hashLabel('qa-org-alpha')).toBe(hashLabel('qa-org-alpha'));
    expect(hashLabel('qa-org-alpha')).not.toBe(hashLabel('qa-org-beta'));
  });

  it('derives every timestamp from the fixture epoch', () => {
    expect(epochPlus(0).toDate().toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(epochPlus(3, 9, 15).toDate().toISOString()).toBe('2026-08-04T09:15:00.000Z');
  });
});

describe('QA canonical fingerprint', () => {
  it('sorts object keys recursively and normalizes timestamps', () => {
    const canonical = canonicalizeValue(
      { zebra: 1, alpha: { delta: 2, beta: 3 }, at: epochPlus(1, 2) },
      'probe',
    );
    expect(JSON.stringify(canonical)).toBe(
      '{"alpha":{"beta":3,"delta":2},"at":{"$timestamp":"2026-08-02T02:00:00.000Z"},"zebra":1}',
    );
  });

  it('preserves array order', () => {
    expect(canonicalizeValue(['SUPPLIER', 'BUYER'], 'probe')).toEqual(['SUPPLIER', 'BUYER']);
  });

  it('refuses to coerce a non-integer number', () => {
    expect(() => canonicalizeValue({ value: 1.5 }, 'probe')).toThrow(/safe integer/);
  });

  it('is identical across two independent builds of the same profile and seed', () => {
    const first = buildFingerprint();
    const second = buildFingerprint();
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.documentCount).toBe(second.documentCount);
    expect(first.documentCount).toBeGreaterThan(0);
    expect(first.algorithm).toBe('SHA-256');
  });

  it('changes when the seed changes', () => {
    const baseline = buildFingerprint();
    const plan = buildPlan(PROFILES.smoke, DEFAULT_RANDOM_SEED + 1);
    const shifted = fingerprintSnapshot(
      { documents: buildDataset(plan).toDocumentMap() },
      {
        datasetVersion: DATASET_VERSION,
        profile: plan.profile,
        seed: plan.seed,
        fixtureEpoch: FIXTURE_EPOCH,
        authUids: collectAuthUsers(plan).map((user) => user.uid),
      },
    );
    // The seed is part of the fingerprinted payload, so the identity of the
    // dataset moves with it even where the documents happen to match.
    expect(shifted.fingerprint).not.toBe(baseline.fingerprint);
  });

  it('names every exclusion rather than dropping fields silently', () => {
    // Firestore adds no server-side fields to a document, so the only exclusion
    // is Auth account metadata, and it is stated.
    expect(FINGERPRINT_EXCLUDES).toHaveLength(1);
    expect(FINGERPRINT_EXCLUDES[0]).toMatch(/Auth account server metadata/);
  });

  it('covers every document in the snapshot', () => {
    const fixture = smokeFixture();
    const result = fingerprintSnapshot(fixture.snapshot, {
      datasetVersion: DATASET_VERSION,
      profile: fixture.plan.profile,
      seed: fixture.plan.seed,
      fixtureEpoch: FIXTURE_EPOCH,
      authUids: fixture.authUids,
    });
    expect(result.documentCount).toBe(fixture.snapshot.documents.size);
  });
});
