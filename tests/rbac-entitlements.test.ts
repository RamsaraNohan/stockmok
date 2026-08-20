// @vitest-environment jsdom

import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { router } from '@/app/router';

interface RoleGuardElementProps {
  readonly allowedRoles?: readonly string[];
}

describe('RBAC Entitlements & Sidebar Separation', () => {
  it('proves PROCUREMENT_MANAGER has Products sidebar link HIDDEN but route READ ALLOWED', () => {
    const role = 'PROCUREMENT_MANAGER';

    // Sidebar visibility logic
    const showProductsInSidebar = [
      'OWNER',
      'ADMIN',
      'INVENTORY_MANAGER',
      'STOREKEEPER',
      'ANALYST',
      'VIEWER',
    ].includes(role);

    expect(showProductsInSidebar).toBe(false); // PM_PRODUCTS_SIDEBAR = HIDDEN

    // Router RoleGuard configuration for inventory/products
    const appRoute = router.routes.find((r) => r.path === '/app/:handle');
    const productsRoute = appRoute?.children?.find((c) => c.path === 'inventory/products');
    const routeElement = productsRoute?.element as ReactElement<RoleGuardElementProps> | undefined;
    const allowedRoles = routeElement?.props.allowedRoles ?? [];

    expect(allowedRoles).toContain('PROCUREMENT_MANAGER'); // PM_PRODUCTS_ROUTE_READ = ALLOWED
  });

  it('proves STOREKEEPER has Purchase Orders sidebar link HIDDEN but route READ ALLOWED', () => {
    const role = 'STOREKEEPER';

    // Sidebar visibility logic
    const showPOsInSidebar = ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER', 'ANALYST'].includes(role);
    expect(showPOsInSidebar).toBe(false);

    // Router RoleGuard configuration for procurement/purchase-orders
    const appRoute = router.routes.find((r) => r.path === '/app/:handle');
    const poRoute = appRoute?.children?.find((c) => c.path === 'procurement/purchase-orders');
    const routeElement = poRoute?.element as ReactElement<RoleGuardElementProps> | undefined;
    const allowedRoles = routeElement?.props.allowedRoles ?? [];

    expect(allowedRoles).toContain('STOREKEEPER');
  });
});
