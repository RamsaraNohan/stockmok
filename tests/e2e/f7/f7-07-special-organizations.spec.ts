import { expect, test } from '@playwright/test';

import { collectRuntimeErrors, login } from './helpers';

/**
 * F7-07: Special Wide organizations. Fixture shapes come straight from
 * scripts/qa/generators/organizations.ts `buildWideOrg`: EMPTY and TINY both
 * get exactly 1 warehouse (never 0), EMPTY gets 0 products/categories, TINY
 * gets 2 products/1 category, LOW_STOCK/ARCHIVED/HIGH_VOLUME/NETWORK_OFF get
 * the normal 20-warehouse Wide shape. NETWORK_OFF and EMPTY/TINY all carry
 * networkRole: 'ISOLATED' (settings.networkEnabled = false); LOW_STOCK and
 * ARCHIVED are network-enabled BUYER orgs.
 */

test('EMPTY org renders clean empty states with no crash', async ({ page }) => {
  const { errors } = collectRuntimeErrors(page);
  await login(page, 'qa-empty-owner-01@example.com', 'qa-empty');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });

  await page.goto('/app/qa-empty/inventory/products');
  await expect(page.getByText('No products found')).toBeVisible({ timeout: 20000 });

  await page.goto('/app/qa-empty/inventory/categories');
  await expect(page.getByText('No categories found')).toBeVisible({ timeout: 20000 });

  await page.goto('/app/qa-empty/inventory/warehouses');
  await expect(page.getByRole('heading', { name: 'Warehouses & Store Rooms' })).toBeVisible();

  expect(errors, `runtime errors observed: ${JSON.stringify(errors)}`).toEqual([]);
});

test('TINY org renders its small dataset without crashing or showing empty states', async ({
  page,
}) => {
  const { errors } = collectRuntimeErrors(page);
  await login(page, 'qa-tiny-owner-01@example.com', 'qa-tiny');

  await page.goto('/app/qa-tiny/inventory/products');
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible({ timeout: 20000 });
  await expect(page.locator('table tbody tr')).toHaveCount(2, { timeout: 15000 });

  expect(errors, `runtime errors observed: ${JSON.stringify(errors)}`).toEqual([]);
});

test('LOW_STOCK org surfaces non-zero low/out-of-stock attention on the dashboard', async ({
  page,
}) => {
  await login(page, 'qa-low-stock-owner-01@example.com', 'qa-low-stock');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('All good!')).not.toBeVisible();
  await expect(page.getByText(/out of stock|low stock/i).first()).toBeVisible({ timeout: 15000 });
});

test('NETWORK_OFF org renders Network routes as disabled (404), not denied (403)', async ({
  page,
}) => {
  await login(page, 'qa-network-off-owner-01@example.com', 'qa-network-off');

  await page.goto('/app/qa-network-off/network/connections');
  await expect(page.getByRole('heading', { name: 'Page Not Found (404)' })).toBeVisible({
    timeout: 20000,
  });
});

test('ARCHIVED org hides archived products from the default view and reveals them via the Archived filter', async ({
  page,
}) => {
  await login(page, 'qa-archived-owner-01@example.com', 'qa-archived');

  await page.goto('/app/qa-archived/inventory/products');
  await expect(page.getByText('No products found')).toBeVisible({ timeout: 20000 });

  await page.locator('#filter-archived').selectOption('ARCHIVED');
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
  const archivedCount = await page.locator('table tbody tr').count();
  expect(archivedCount).toBeGreaterThan(0);
});
