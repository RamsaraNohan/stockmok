import { describe, expect, it } from 'vitest';

import {
  DATASET_VERSION,
  FIXTURE_EPOCH,
  PROFILES,
  assertProfileExecutable,
} from '../../scripts/qa/config.js';
import {
  classifyDocumentPath,
  manifestCoverage,
  PATH_FAMILIES,
} from '../../scripts/qa/manifest.js';
import { verifyReferences, verifySchemas } from '../../scripts/qa/verify/integrity.js';
import { smokeFixture } from './dataset-fixture.js';

describe('QA dataset integrity', () => {
  it('pins the frozen dataset identity', () => {
    expect(DATASET_VERSION).toBe('stockmok-wide-qa-v1');
    expect(FIXTURE_EPOCH).toBe('2026-08-01T00:00:00Z');
    expect(PROFILES.smoke.organizationCount).toBe(3);
    expect(PROFILES.wide.organizationCount).toBe(50);
    expect(PROFILES.wide.specialOrganizationCount).toBe(6);
  });

  it('opens the wide profile only at the post-Smoke checkpoint', () => {
    expect(PROFILES.wide.executable).toBe(true);
    expect(() => {
      assertProfileExecutable(PROFILES.wide);
    }).not.toThrow();
    expect(() => {
      assertProfileExecutable(PROFILES.smoke);
    }).not.toThrow();
  });

  it('parses every document against the schema that owns its path', () => {
    expect(verifySchemas(smokeFixture().snapshot)).toEqual([]);
  });

  it('resolves every reference it writes', () => {
    expect(verifyReferences(smokeFixture().snapshot)).toEqual([]);
  });

  it('classifies every document path', () => {
    const unclassified = [...smokeFixture().snapshot.documents.keys()].filter(
      (path) => classifyDocumentPath(path) === undefined,
    );
    expect(unclassified).toEqual([]);
  });

  it('reports classification and population coverage separately', () => {
    const coverage = manifestCoverage([...smokeFixture().snapshot.documents.keys()]);
    expect(coverage.totalFamilies).toBe(PATH_FAMILIES.length);
    expect(coverage.classificationCoveragePercent).toBe(100);
    expect(coverage.missingExpected).toEqual([]);
    expect(coverage.unexpectedPopulated).toEqual([]);
    // Population is deliberately below classification: the smoke profile does
    // not fabricate command receipts or audit logs.
    expect(coverage.expectedPopulatedFamilies).toBeLessThan(coverage.totalFamilies);
  });

  it('never writes into a path the smoke profile does not own', () => {
    const coverage = manifestCoverage([...smokeFixture().snapshot.documents.keys()]);
    expect(coverage.unexpectedPopulated).toEqual([]);
    for (const family of PATH_FAMILIES) {
      if (family.smokePopulated) continue;
      expect(family.rationale, `${family.id} must explain why it is unpopulated`).toBeTruthy();
    }
  });
});
