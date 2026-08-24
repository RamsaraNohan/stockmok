import { describe, expect, it } from 'vitest';

import { productMatrixCoverage, q005Coverage } from '../../scripts/qa/verify/authority.js';
import { verifyInventory } from '../../scripts/qa/verify/inventory.js';
import { documentField, pathsUnder, smokeFixture } from './dataset-fixture.js';

describe('QA inventory reconciliation', () => {
  it('agrees with the production derivation helpers', () => {
    expect(verifyInventory(smokeFixture().snapshot)).toEqual([]);
  });

  it('covers all three stock statuses in both read models', () => {
    const fixture = smokeFixture();
    for (const collection of ['stockBalances', 'productStockSummaries']) {
      const statuses = new Set(
        pathsUnder(fixture, (parts) => parts[0] === 'organizations' && parts[2] === collection).map(
          (path) => documentField(fixture, path, 'stockStatus'),
        ),
      );
      expect(statuses, `${collection} stock statuses`).toEqual(
        new Set(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']),
      );
    }
  });

  it('covers both product lifecycle states', () => {
    const fixture = smokeFixture();
    const statuses = new Set(
      pathsUnder(fixture, (parts) => parts[0] === 'organizations' && parts[2] === 'products').map(
        (path) => documentField(fixture, path, 'status'),
      ),
    );
    expect(statuses).toEqual(new Set(['ACTIVE', 'ARCHIVED']));
  });

  it('spreads stock across multiple warehouses', () => {
    const fixture = smokeFixture();
    const warehouses = new Set(
      pathsUnder(
        fixture,
        (parts) => parts[0] === 'organizations' && parts[2] === 'stockBalances',
      ).map((path) => documentField(fixture, path, 'warehouseId')),
    );
    expect(warehouses.size).toBeGreaterThanOrEqual(3);
  });

  it('holds data for all 32 product-list index shapes', () => {
    const coverage = productMatrixCoverage(smokeFixture().snapshot);
    expect(coverage.total).toBe(32);
    expect(coverage.uncovered).toEqual([]);
    expect(coverage.covered).toBe(32);
  });

  it('covers every Q-005 unread boundary', () => {
    const coverage = q005Coverage(smokeFixture().snapshot);
    expect(coverage.boundariesMissing).toEqual([]);
    expect(coverage.boundariesCovered).toEqual([0, 1, 49, 50, 51]);
  });
});
