import type { Firestore } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import { QUERY_COVERAGE_REGISTRY } from '../src/registry.js';
import { createStockmokRepositories } from '../src/repositories.js';

describe('frontend-facing repository surface', () => {
  it('exposes grouped reads without raw Firestore index mechanics', () => {
    const repositories = createStockmokRepositories({} as Firestore, {
      uid: 'user-1',
      orgId: 'org-1',
    });
    expect(Object.keys(repositories)).toEqual([
      'public',
      'shell',
      'settings',
      'dashboard',
      'inventory',
      'movements',
      'partners',
      'procurement',
      'network',
      'notifications',
      'team',
      'reports',
      'raw',
    ]);
  });

  it('maps every coverage row to a named repository or server method', () => {
    expect(
      QUERY_COVERAGE_REGISTRY.every(({ repositoryMethod }) =>
        /^(public|shell|settings|dashboard|inventory|movements|partners|procurement|network|notifications|team|reports|server)\./.test(
          repositoryMethod,
        ),
      ),
    ).toBe(true);
  });

  it('keeps callable and command-internal reads on server-only methods', () => {
    const serverIds = QUERY_COVERAGE_REGISTRY.filter(({ scope }) => scope === 'server').map(
      ({ queryId }) => queryId,
    );
    expect(serverIds).toEqual([
      'Q-046',
      'Q-047',
      'Q-056',
      'Q-057',
      'Q-059',
      'Q-066',
      'Q-067',
      'Q-068',
      'Q-069',
      'Q-070',
      'Q-071',
      'Q-072',
      'Q-073',
      'Q-079',
      'Q-080',
    ]);
  });
});
