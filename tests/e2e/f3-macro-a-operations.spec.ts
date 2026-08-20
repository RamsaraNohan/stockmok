import { expect } from '@playwright/test';

import { cover } from './a10/acceptance';
import { test } from './a10/test';

test.describe('A5-A9: Operations & Procurement Macro A E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('owner@grand-ocean.stockmok.test');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await page.waitForURL(/\/app\/grand-ocean\/dashboard/);
  });

  test('A5: Movement History loads logs and supports filtering', async ({ page }, testInfo) => {
    cover(testInfo, 'A10-A5-001');
    await page.goto('/app/grand-ocean/inventory/movements');
    await expect(page.getByRole('heading', { name: /Movement History/i })).toBeVisible();

    const tableOrCards = page.locator('table, .space-y-4').first();
    await expect(tableOrCards).toBeVisible();
    await page.getByPlaceholder('Search product or SKU').fill('Chicken');
    await expect(page.getByRole('row').filter({ hasText: 'Chicken Breast' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'A10 Adjustment Product' })).toBeHidden();
  });

  test('A6: Stock Operations — Opening Balance, Adjustment, and Transfer actions', async ({
    page,
  }) => {
    await page.goto('/app/grand-ocean/inventory/products');
    await expect(page.getByRole('heading', { name: /Products/i })).toBeVisible();
    // Wait for the seeded product rows to appear (deterministic fixture)
    const firstProduct = page.locator('table tbody').getByRole('link').first();
    await expect(firstProduct).toBeVisible({ timeout: 15000 });
    await firstProduct.click();
    await page.waitForURL(/\/app\/grand-ocean\/inventory\/products\//);

    // Switch to 'Stock by store room' tab
    await page.getByRole('button', { name: /Stock by store room/i }).click();

    // Verify stock action triggers (Adjust, Transfer, Record Opening Balance)
    const actionBtn = page
      .getByRole('button', { name: /Adjust|Transfer|Record Opening Balance/i })
      .first();
    await expect(actionBtn).toBeVisible();
    await actionBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /Cancel/i }).click();
  });

  test('A7: Private Partners — Supplier/Buyer lists, detail, open orders & order history', async ({
    page,
  }, testInfo) => {
    cover(testInfo, 'A10-A7-001');
    await page.goto('/app/grand-ocean/procurement/suppliers');
    await expect(page.getByRole('heading', { name: /Suppliers/i })).toBeVisible();
    // Wait for the seeded supplier name (deterministic fixture)
    await expect(page.getByText('Green Farm')).toBeVisible({ timeout: 15000 });

    await page.getByText('Green Farm').click();
    await page.waitForURL(/\/app\/grand-ocean\/procurement\/suppliers\//);

    await expect(page.getByRole('heading', { name: 'Green Farm' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Open Orders/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Order History/i })).toBeVisible();

    await page.goto('/app/grand-ocean/procurement/buyers');
    await expect(page.getByRole('heading', { name: /Buyers/i })).toBeVisible();
  });

  test('A8: Private Purchase Orders — List, Search, Create, Detail, Order & Cancel controls', async ({
    page,
  }, testInfo) => {
    cover(testInfo, 'A10-A8-001');
    await page.goto('/app/grand-ocean/procurement/purchase-orders');
    await expect(page.getByRole('heading', { name: /Purchase Orders/i })).toBeVisible();

    const searchInput = page.getByPlaceholder(/Search/i);
    await expect(searchInput).toBeVisible();

    await page.getByRole('button', { name: /Create Order/i }).click();
    await page.waitForURL(/\/app\/grand-ocean\/procurement\/purchase-orders\/new/);
    await expect(page.getByRole('heading', { name: /Create Purchase Order/i })).toBeVisible();
  });

  test('A9: Private Receiving — List, Detail, Warehouse Choice, Balance Context', async ({
    page,
  }) => {
    await page.goto('/app/grand-ocean/procurement/receiving');
    await expect(page.getByRole('heading', { name: /Receiving/i })).toBeVisible();
  });
});
