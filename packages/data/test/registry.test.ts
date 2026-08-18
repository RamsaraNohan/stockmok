import { ACTIVE_QUERY_IDS } from '@stockmok/shared';
import { describe, expect, it } from 'vitest';
import { QUERY_COVERAGE_REGISTRY } from '../src/registry.js';

describe('C2 query coverage registry', () => {
  it('accounts for the exact active query set once each', () => {
    const ids = QUERY_COVERAGE_REGISTRY.map(({ queryId }) => queryId);
    expect(ids).toHaveLength(92);
    expect(new Set(ids).size).toBe(92);
    expect([...ids].sort()).toEqual([...ACTIVE_QUERY_IDS].sort());
  });

  it('isolates Q-005 and implements every unaffected query id', () => {
    expect(QUERY_COVERAGE_REGISTRY.filter(({ status }) => status === 'IMPLEMENTED')).toHaveLength(
      91,
    );
    expect(
      QUERY_COVERAGE_REGISTRY.filter(({ status }) => status === 'BLOCKED_PENDING_OWNER_RULING').map(
        ({ queryId }) => queryId,
      ),
    ).toEqual(['Q-005']);
  });

  it('classifies only the exact four approved realtime query ids', () => {
    expect(
      QUERY_COVERAGE_REGISTRY.filter(({ realtime }) => realtime).map(({ queryId }) => queryId),
    ).toEqual(['Q-005', 'Q-008', 'Q-036', 'Q-042']);
  });

  it('keeps every implemented on-hand order descending', () => {
    const onHandOrders = QUERY_COVERAGE_REGISTRY.flatMap(({ queryId, order }) =>
      order
        .filter(({ field }) => field === 'onHandMilli')
        .map(({ direction }) => ({ queryId, direction })),
    );
    expect(onHandOrders.length).toBeGreaterThan(0);
    expect(onHandOrders.every(({ direction }) => direction === 'desc')).toBe(true);
  });
});
