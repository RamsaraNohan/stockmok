import { expect, type Page } from '@playwright/test';

import { cover } from './macro-b/acceptance';
import { test } from './macro-b/test';

const roleUsers = {
  ADMIN: 'admin@grand-ocean.stockmok.test',
  INVENTORY_MANAGER: 'inventory@grand-ocean.stockmok.test',
  PROCUREMENT_MANAGER: 'procurement@grand-ocean.stockmok.test',
  STOREKEEPER: 'storekeeper@grand-ocean.stockmok.test',
  ANALYST: 'analyst@grand-ocean.stockmok.test',
  VIEWER: 'viewer@grand-ocean.stockmok.test',
} as const;

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill('password123');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(/\/app\/grand-ocean\/dashboard/);
}

async function expectDenied(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: 'Access Denied (403)' })).toBeVisible();
}

test('ADMIN has live Network (F4) access and live Team/Settings (F5) access', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-RBAC-ADMIN-001');
  await login(page, roleUsers.ADMIN);

  await page.goto('/app/grand-ocean/network/connections');
  await expect(page.getByText('Fresh Foods Ltd').first()).toBeVisible();

  await page.goto('/app/grand-ocean/team');
  await expect(page.getByRole('button', { name: 'Invite user' })).toBeVisible();

  await page.goto('/app/grand-ocean/settings');
  await expect(page.getByRole('switch', { name: /Network/ })).toBeVisible();
});

test('INVENTORY_MANAGER is denied Network/Team/Settings before query but keeps live connected-receiving access', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-RBAC-INVENTORY_MANAGER-001');
  await login(page, roleUsers.INVENTORY_MANAGER);

  await expectDenied(page, '/app/grand-ocean/network/connections');
  await expectDenied(page, '/app/grand-ocean/team');
  await expectDenied(page, '/app/grand-ocean/settings');

  await page.goto('/app/grand-ocean/procurement/receiving');
  await expect(page.getByRole('heading', { name: 'Receiving' })).toBeVisible();
});

test('PROCUREMENT_MANAGER has live Network/receiving/PO-report access and is denied Team/Settings before query', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-RBAC-PROCUREMENT_MANAGER-001');
  await login(page, roleUsers.PROCUREMENT_MANAGER);

  await page.goto('/app/grand-ocean/network/connections');
  await expect(page.getByText('Fresh Foods Ltd').first()).toBeVisible();

  await page.goto('/app/grand-ocean/procurement/receiving');
  await expect(page.getByRole('heading', { name: 'Receiving' })).toBeVisible();

  await page.goto('/app/grand-ocean/reports?tab=purchase-orders');
  await expect(page.getByRole('columnheader', { name: 'PO Number' })).toBeVisible();

  await expectDenied(page, '/app/grand-ocean/team');
  await expectDenied(page, '/app/grand-ocean/settings');
});

test('STOREKEEPER retains live read access to connected purchase orders and receiving with mutation controls hidden', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-RBAC-STOREKEEPER-004');
  await login(page, roleUsers.STOREKEEPER);

  await page.goto('/app/grand-ocean/procurement/purchase-orders');
  await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Order' })).toBeHidden();

  await page.goto('/app/grand-ocean/procurement/receiving');
  await expect(page.getByRole('heading', { name: 'Receiving' })).toBeVisible();
});

test('ANALYST is denied Network/receiving/Team/Settings before query but keeps live read-only connected-PO and PO-report access', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-RBAC-ANALYST-001');
  await login(page, roleUsers.ANALYST);

  await expectDenied(page, '/app/grand-ocean/network/connections');
  await expectDenied(page, '/app/grand-ocean/procurement/receiving');
  await expectDenied(page, '/app/grand-ocean/team');
  await expectDenied(page, '/app/grand-ocean/settings');

  await page.goto('/app/grand-ocean/procurement/purchase-orders');
  await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Order' })).toBeHidden();

  await page.goto('/app/grand-ocean/reports?tab=purchase-orders');
  await expect(page.getByRole('columnheader', { name: 'PO Number' })).toBeVisible();
});

test('VIEWER is denied Network/connected-PO/receiving/Team/Settings/PO-report before query but keeps live stock-report access', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-RBAC-VIEWER-001');
  await login(page, roleUsers.VIEWER);

  await expectDenied(page, '/app/grand-ocean/network/connections');
  await expectDenied(page, '/app/grand-ocean/procurement/purchase-orders');
  await expectDenied(page, '/app/grand-ocean/procurement/receiving');
  await expectDenied(page, '/app/grand-ocean/team');
  await expectDenied(page, '/app/grand-ocean/settings');

  await page.goto('/app/grand-ocean/reports?tab=purchase-orders');
  await expect(page.getByRole('alert')).toContainText('Purchase-order report unavailable');

  await page.goto('/app/grand-ocean/reports');
  await expect(page.getByRole('columnheader', { name: 'Product' })).toBeVisible();
});
