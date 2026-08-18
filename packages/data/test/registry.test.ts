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

  it('implements every active query id after the Q-005 owner ruling', () => {
    expect(QUERY_COVERAGE_REGISTRY.filter(({ status }) => status === 'IMPLEMENTED')).toHaveLength(
      92,
    );
    expect(
      QUERY_COVERAGE_REGISTRY.filter(({ status }) => status === 'BLOCKED_PENDING_OWNER_RULING').map(
        ({ queryId }) => queryId,
      ),
    ).toEqual([]);
  });

  it('keeps one Q-005 logical id with the exact two ruled transports', () => {
    const rows = QUERY_COVERAGE_REGISTRY.filter(({ queryId }) => queryId === 'Q-005');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.transports).toEqual([
      { name: 'exactCount', mode: 'read-time-aggregation', realtime: false },
      { name: 'realtimeBadge', mode: 'bounded-query-listener', realtime: true, limit: 50 },
    ]);
  });

  it('classifies only the exact four approved realtime query ids', () => {
    expect(
      QUERY_COVERAGE_REGISTRY.filter(({ realtime }) => realtime).map(({ queryId }) => queryId),
    ).toEqual(['Q-005', 'Q-008', 'Q-036', 'Q-042']);
    expect(
      QUERY_COVERAGE_REGISTRY.filter(
        ({ realtime, status }) => realtime && status === 'IMPLEMENTED',
      ),
    ).toHaveLength(4);
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
