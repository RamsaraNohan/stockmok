// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { router } from '@/app/router';

describe('F4 Network route authority', () => {
  it('registers the exact ROUTE-031 through ROUTE-036 path set without an extra route', () => {
    const appRoute = router.routes.find((route) => route.path === '/app/:handle');
    const networkPaths =
      appRoute?.children
        ?.map((route) => route.path)
        .filter((path): path is string => path?.startsWith('network/') === true)
        .sort() ?? [];

    expect(networkPaths).toEqual([
      'network/connections',
      'network/connections/:connectionId',
      'network/mappings',
      'network/mappings/new',
      'network/partner-catalog',
      'network/partner-catalog/:supplierOrgId',
    ]);
  });
});
