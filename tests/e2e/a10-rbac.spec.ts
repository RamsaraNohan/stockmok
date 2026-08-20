import { expect, type Page } from '@playwright/test';

import { cover } from './a10/acceptance';
import { test } from './a10/test';

const roleUsers = {
  OWNER: 'owner@grand-ocean.stockmok.test',
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

test('OWNER receives full representative Macro A authority', async ({ page }, testInfo) => {
  cover(testInfo, 'A10-RBAC-001');
  await login(page, roleUsers.OWNER);
  await page.goto('/app/grand-ocean/inventory/products');
  await expect(page.getByRole('button', { name: 'Create Product' })).toBeVisible();
  await page.goto('/app/grand-ocean/procurement/purchase-orders');
  await expect(page.getByRole('button', { name: 'Create Order' })).toBeVisible();
});

test('ADMIN receives mechanically equivalent representative authority', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'A10-RBAC-002');
  await login(page, roleUsers.ADMIN);
  await page.goto('/app/grand-ocean/inventory/products');
  await expect(page.getByRole('button', { name: 'Create Product' })).toBeVisible();
  await page.goto('/app/grand-ocean/procurement/suppliers');
  await expect(page.getByRole('heading', { name: 'Suppliers' })).toBeVisible();
});

test('INVENTORY_MANAGER can manage inventory and receive but not access partners', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'A10-RBAC-003');
  await login(page, roleUsers.INVENTORY_MANAGER);
  await page.goto('/app/grand-ocean/inventory/products');
  await expect(page.getByRole('button', { name: 'Create Product' })).toBeVisible();
  await page.goto('/app/grand-ocean/procurement/receiving');
  await expect(page.getByRole('heading', { name: 'Receiving' })).toBeVisible();
  await expectDenied(page, '/app/grand-ocean/procurement/suppliers');
});

test('PROCUREMENT_MANAGER can read products, manage procurement, and receive', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'A10-RBAC-004');
  await login(page, roleUsers.PROCUREMENT_MANAGER);
  await page.goto('/app/grand-ocean/inventory/products');
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Product' })).toBeHidden();
  await page.goto('/app/grand-ocean/procurement/purchase-orders');
  await expect(page.getByRole('button', { name: 'Create Order' })).toBeVisible();
  await page.goto('/app/grand-ocean/procurement/receiving');
  await expect(page.getByRole('heading', { name: 'Receiving' })).toBeVisible();
});

test('STOREKEEPER can read movements and orders, receive, and has no PO mutation', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'A10-RBAC-005');
  await login(page, roleUsers.STOREKEEPER);
  await page.goto('/app/grand-ocean/inventory/movements');
  await expect(page.getByRole('heading', { name: 'Movement History' })).toBeVisible();
  await page.goto('/app/grand-ocean/procurement/purchase-orders');
  await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Order' })).toBeHidden();
  await page.goto('/app/grand-ocean/procurement/receiving');
  await expect(page.getByRole('heading', { name: 'Receiving' })).toBeVisible();
});

test('ANALYST has read access but no receiving or mutation authority', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'A10-RBAC-006');
  await login(page, roleUsers.ANALYST);
  await page.goto('/app/grand-ocean/inventory/products');
  await expect(page.getByRole('button', { name: 'Create Product' })).toBeHidden();
  await page.goto('/app/grand-ocean/procurement/purchase-orders');
  await expect(page.getByRole('button', { name: 'Create Order' })).toBeHidden();
  await expectDenied(page, '/app/grand-ocean/procurement/receiving');
});

test('VIEWER retains product read access and receives route-level denials', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'A10-RBAC-007');
  await login(page, roleUsers.VIEWER);
  await page.goto('/app/grand-ocean/inventory/products');
  await expect(page.getByText('Chicken Breast')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Product' })).toBeHidden();
  await expectDenied(page, '/app/grand-ocean/inventory/movements');
  await expectDenied(page, '/app/grand-ocean/procurement/purchase-orders');
});
