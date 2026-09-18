import { expect } from '@playwright/test';

import { cover } from './a10/acceptance';
import { test } from './a10/test';

test.describe('A1-A3: Core Frontend Macro A E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('owner@grand-ocean.stockmok.test');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign in/i }).click();

    await page.waitForURL(/\/app\/grand-ocean\/dashboard/);
  });

  test('A1: Dashboard renders cards, summary data, and navigation links', async ({
    page,
  }, testInfo) => {
    cover(testInfo, 'A10-F1-002', 'A10-A1-001');
    await page.goto('/app/grand-ocean/dashboard');
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByText(/Grand Ocean Hotel/i).first()).toBeVisible();
    // KPI labels appear once Firestore data resolves — deterministic app-state signal
    await expect(page.getByText(/Inventory Value/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Active SKUs/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Recent Purchase Orders' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Failed to load recent orders' })).toBeHidden();

    await page.getByRole('link', { name: 'Products', exact: false }).first().click();
    await page.waitForURL(/\/app\/grand-ocean\/inventory\/products/);
    await expect(page.getByRole('heading', { name: /Products/i })).toBeVisible();
  });

  test('A2: Products list, filter, search, create form, and detail navigation', async ({
    page,
  }, testInfo) => {
    cover(testInfo, 'A10-A2-001', 'A10-A2-002', 'A10-A2-003');
    await page.goto('/app/grand-ocean/inventory/products');

    await expect(page.getByRole('heading', { name: /Products/i })).toBeVisible();

    // Verify search input
    const searchInput = page.getByPlaceholder(/Search products/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Chicken');
    await expect(page.getByText('Chicken Breast')).toBeVisible();
    await searchInput.fill('');

    await page.getByRole('button', { name: 'Create Product' }).click();
    await page.waitForURL(/\/app\/grand-ocean\/inventory\/products\/new/);

    await expect(page.getByRole('heading', { name: /Create Product/i })).toBeVisible();
    await expect(page.getByLabel(/Product Name/i)).toBeVisible();

    // Return to list and inspect first row detail
    await page.goto('/app/grand-ocean/inventory/products');
    const firstProductLink = page.locator('table tbody').getByRole('link').first();
    await expect(firstProductLink).toBeVisible();
    await firstProductLink.click();
    await page.waitForURL(/\/app\/grand-ocean\/inventory\/products\//);

    await page.getByRole('button', { name: /Stock by store room/i }).click();
    await expect(page.getByText(/Main Store|Cold Room/i).first()).toBeVisible();
  });

  test('A3: Categories & Warehouses management', async ({ page }, testInfo) => {
    cover(testInfo, 'A10-A3-001', 'A10-A3-002');
    await page.goto('/app/grand-ocean/inventory/categories');
    await expect(page.getByRole('heading', { name: /Categories/i })).toBeVisible();
    await expect(page.getByText('Meat')).toBeVisible();

    await page.goto('/app/grand-ocean/inventory/warehouses');
    await expect(page.getByRole('heading', { name: /Warehouses|Store Rooms/i })).toBeVisible();
    await expect(page.getByText('Main Store')).toBeVisible();
  });
});
