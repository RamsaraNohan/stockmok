import { describe, expect, it } from 'vitest';

import { MovementTypeSchema } from '../../packages/shared/src/primitives.js';
import { verifyMovements } from '../../scripts/qa/verify/movements.js';
import { pathsUnder, smokeFixture } from './dataset-fixture.js';

describe('QA movement ledger', () => {
  it('reconciles every balance against its own history', () => {
    const report = verifyMovements(smokeFixture().snapshot);
    expect(report.ledgerFailures).toEqual([]);
  });

  it('pairs every transfer', () => {
    const report = verifyMovements(smokeFixture().snapshot);
    expect(report.transferFailures).toEqual([]);
  });

  it('represents every movement type', () => {
    const report = verifyMovements(smokeFixture().snapshot);
    expect(new Set(report.movementTypesSeen)).toEqual(new Set(MovementTypeSchema.options));
  });

  it('gives every balance exactly one opening movement', () => {
    const fixture = smokeFixture();
    const openings = new Map<string, number>();
    for (const path of pathsUnder(
      fixture,
      (parts) => parts[0] === 'organizations' && parts[2] === 'stockMovements',
    )) {
      const data = fixture.snapshot.documents.get(path);
      if (data?.['movementType'] !== 'OPENING_BALANCE') continue;
      const key = `${path.split('/')[1] ?? ''}|${String(data['productId'])}|${String(data['warehouseId'])}`;
      openings.set(key, (openings.get(key) ?? 0) + 1);
    }
    const balances = pathsUnder(
      fixture,
      (parts) => parts[0] === 'organizations' && parts[2] === 'stockBalances',
    );
    expect(openings.size).toBe(balances.length);
    expect([...openings.values()].every((count) => count === 1)).toBe(true);
  });

  it('reaches out-of-stock through the ledger rather than by never stocking', () => {
    const fixture = smokeFixture();
    const emptyBalances = pathsUnder(
      fixture,
      (parts) => parts[0] === 'organizations' && parts[2] === 'stockBalances',
    ).filter((path) => fixture.snapshot.documents.get(path)?.['onHandMilli'] === 0);
    expect(emptyBalances.length).toBeGreaterThan(0);

    // Each one holds an opening balance that was later written off, so the
    // reconciler has a real history to walk rather than a single empty row.
    for (const path of emptyBalances.slice(0, 5)) {
      const data = fixture.snapshot.documents.get(path);
      const productId = String(data?.['productId']);
      const warehouseId = String(data?.['warehouseId']);
      const org = path.split('/')[1] ?? '';
      const movements = pathsUnder(
        fixture,
        (parts) =>
          parts[0] === 'organizations' && parts[1] === org && parts[2] === 'stockMovements',
      ).filter((movementPath) => {
        const movement = fixture.snapshot.documents.get(movementPath);
        return movement?.['productId'] === productId && movement['warehouseId'] === warehouseId;
      });
      expect(movements.length).toBeGreaterThan(1);
    }
  });

  it('never lets a running balance go negative', () => {
    const report = verifyMovements(smokeFixture().snapshot);
    expect(report.ledgerFailures.filter((failure) => failure.includes('negative'))).toEqual([]);
  });
});
