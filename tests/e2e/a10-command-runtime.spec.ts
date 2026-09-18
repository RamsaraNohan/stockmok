import { expect, type Page } from '@playwright/test';

import { cover } from './a10/acceptance';
import { test } from './a10/test';

async function loginAsOwner(page: Page) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill('owner@grand-ocean.stockmok.test');
  await page.locator('input[name="password"]').fill('password123');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(/\/app\/grand-ocean\/dashboard/);
}

async function openStockTab(page: Page, productId: string) {
  await page.goto(`/app/grand-ocean/inventory/products/${productId}`);
  await page.getByRole('button', { name: 'Stock by store room' }).click();
  await expect(page.getByRole('table')).toBeVisible();
}

test.describe('A10 real Functions-emulator commands', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test('C13 records an isolated opening balance through the UI', async ({ page }, testInfo) => {
    cover(testInfo, 'A10-C13-001');
    await openStockTab(page, 'a10-opening');
    const mainStore = page.getByRole('row').filter({ hasText: 'Main Store' });
    await mainStore.getByRole('button', { name: 'Opening Balance' }).click();
    await page.getByRole('dialog').getByLabel('Quantity').fill('0');
    await page.getByRole('dialog').getByRole('button', { name: 'Save Balance' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(mainStore).toContainText('0 KG');
  });

  test('C14 adjusts an isolated balance through the UI', async ({ page }, testInfo) => {
    cover(testInfo, 'A10-C14-001');
    await openStockTab(page, 'a10-adjust');
    const mainStore = page.getByRole('row').filter({ hasText: 'Main Store' });
    await mainStore.getByRole('button', { name: 'Adjust' }).click();
    await page
      .getByRole('dialog')
      .getByLabel('Adjustment Quantity (use negative to decrease)')
      .fill('2');
    await page.getByRole('dialog').getByRole('button', { name: 'Adjust Balance' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(mainStore).toContainText('22 KG');
  });

  test('C33 transfers isolated stock atomically through the UI', async ({ page }, testInfo) => {
    cover(testInfo, 'A10-C33-001');
    await openStockTab(page, 'a10-transfer');
    await page.getByRole('button', { name: 'Transfer Stock' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Source').selectOption('main-store');
    await dialog.getByLabel('Destination').selectOption('cold-room');
    await dialog.getByLabel('Quantity to transfer').fill('3');
    await dialog.getByRole('button', { name: 'Transfer', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('row').filter({ hasText: 'Main Store' })).toContainText('17 KG');
    await expect(page.getByRole('row').filter({ hasText: 'Cold Room' })).toContainText('3 KG');
  });

  test('C38 deactivates and restores an isolated partner through the UI', async ({
    page,
  }, testInfo) => {
    cover(testInfo, 'A10-C38-001');
    await page.goto('/app/grand-ocean/procurement/suppliers/a10-partner-status');
    await expect(page.getByRole('heading', { name: 'A10 Status Supplier' })).toBeVisible();

    await page.getByRole('button', { name: 'Deactivate', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Activate', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Activate', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Deactivate', exact: true })).toBeVisible();
  });

  test('C15 orders one isolated draft and C16 cancels a different order', async ({
    page,
  }, testInfo) => {
    cover(testInfo, 'A10-C15-001', 'A10-C16-001');
    await page.goto('/app/grand-ocean/procurement/purchase-orders/a10-po-order');
    await page.getByRole('button', { name: 'Order', exact: true }).click();
    await expect(page.getByText('Status:').locator('..')).toContainText('ORDERED');

    await page.goto('/app/grand-ocean/procurement/purchase-orders/a10-po-cancel');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText('Status:').locator('..')).toContainText('CANCELLED');
  });

  test('C17 proves partial and full receipt plus over-receipt rejection on isolated orders', async ({
    page,
  }, testInfo) => {
    cover(testInfo, 'A10-C17-001', 'A10-C17-002', 'A10-C17-003');
    await page.goto('/app/grand-ocean/procurement/receiving/a10-po-partial');
    await page.getByPlaceholder('0').fill('4');
    await page.getByRole('button', { name: 'Receive', exact: true }).click();
    await expect(page).not.toHaveURL(/\/procurement\/receiving\/a10-po-partial$/);
    await page.goto('/app/grand-ocean/procurement/purchase-orders/a10-po-partial');
    await expect(page.getByText('Status:').locator('..')).toContainText('PARTIALLY_RECEIVED');

    await page.goto('/app/grand-ocean/procurement/receiving/a10-po-full');
    await page.getByPlaceholder('0').fill('10');
    await page.getByRole('button', { name: 'Receive', exact: true }).click();
    await expect(page).not.toHaveURL(/\/procurement\/receiving\/a10-po-full$/);
    await page.goto('/app/grand-ocean/procurement/purchase-orders/a10-po-full');
    await expect(page.getByText('Status:').locator('..')).toContainText('RECEIVED');

    await page.goto('/app/grand-ocean/procurement/receiving/a10-po-over');
    await page.getByPlaceholder('0').fill('11');
    await page.getByRole('button', { name: 'Receive', exact: true }).click();
    await expect(page.getByText(/exceeds|outstanding|quantity/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/procurement\/receiving\/a10-po-over$/);
  });
});
