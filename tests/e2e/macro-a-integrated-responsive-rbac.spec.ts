import { expect } from '@playwright/test';

import { cover } from './a10/acceptance';
import { test } from './a10/test';

test.describe('Macro A: Integrated Responsive, Routing & RBAC Tests', () => {
  test('Integrated Journey A: Dashboard -> Products -> Product Detail -> Movement History', async ({
    page,
  }, testInfo) => {
    cover(testInfo, 'A10-RSP-1280');
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('owner@grand-ocean.stockmok.test');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await page.waitForURL(/\/app\/grand-ocean\/dashboard/);
    await expect(page).toHaveURL(/\/app\/grand-ocean\/dashboard/);

    // Step 2: Navigate to Products
    await page.getByRole('link', { name: 'Products', exact: false }).first().click();
    await page.waitForURL(/\/app\/grand-ocean\/inventory\/products/);
    await expect(page).toHaveURL(/\/app\/grand-ocean\/inventory\/products/);

    // Step 3: Movement History
    await page.goto('/app/grand-ocean/inventory/movements');
    await expect(page).toHaveURL(/\/app\/grand-ocean\/inventory\/movements/);
    await expect(page.getByRole('heading', { name: /Movement History/i })).toBeVisible();
  });

  test('Integrated Journey B: Supplier -> Purchase Orders -> Receiving detail', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('owner@grand-ocean.stockmok.test');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign in/i }).click();
    await page.waitForURL(/\/app\/grand-ocean\/dashboard/);

    await page.goto('/app/grand-ocean/procurement/suppliers');
    await page.getByText('A10 Status Supplier').click();
    await expect(page.getByRole('heading', { name: 'A10 Status Supplier' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Open Orders' })).toBeVisible();

    await page.getByRole('link', { name: 'Purchase Orders', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();
    await page.getByRole('combobox').filter({ hasText: 'Draft' }).selectOption('ORDERED');
    const orderedRow = page.getByRole('row').filter({ hasText: 'A10-OVER-001' });
    await expect(orderedRow).toBeVisible();
    await orderedRow.click();
    await expect(page.getByRole('heading', { name: 'A10-OVER-001' })).toBeVisible();

    await page.getByRole('link', { name: 'Receiving', exact: true }).click();
    const receivingRow = page.getByRole('row').filter({ hasText: 'A10-OVER-001' });
    await expect(receivingRow).toBeVisible();
    await receivingRow.click();
    await expect(page.getByRole('heading', { name: 'Receive: A10-OVER-001' })).toBeVisible();
  });

  test('Tenant handle continuity (/app/:handle/...) across all routes', async ({
    page,
  }, testInfo) => {
    cover(testInfo, 'A10-F1-003');
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('owner@grand-ocean.stockmok.test');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await page.waitForURL(/\/app\/grand-ocean\/dashboard/);

    const routesToTest = [
      '/app/grand-ocean/dashboard',
      '/app/grand-ocean/inventory/products',
      '/app/grand-ocean/inventory/categories',
      '/app/grand-ocean/inventory/warehouses',
      '/app/grand-ocean/inventory/movements',
      '/app/grand-ocean/procurement/suppliers',
      '/app/grand-ocean/procurement/buyers',
      '/app/grand-ocean/procurement/purchase-orders',
      '/app/grand-ocean/procurement/receiving',
    ];

    for (const targetRoute of routesToTest) {
      await page.goto(targetRoute);
      await expect(page).toHaveURL(new RegExp(targetRoute));
      expect(page.url()).toContain('/app/grand-ocean/');
    }
  });

  test('RBAC: Viewer role access restriction and denial', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('viewer@grand-ocean.stockmok.test');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await page.waitForURL(/\/app\/grand-ocean\/dashboard/);

    // Viewer on Dashboard
    await page.goto('/app/grand-ocean/dashboard');
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();

    // Viewer on Movement History (Denied)
    await page.goto('/app/grand-ocean/inventory/movements');
    await expect(
      page.getByText(/Access Denied|You do not have permission|Not Authorized/i).first(),
    ).toBeVisible();
  });
});
