import { expect, test } from '@playwright/test';

import { login } from './helpers';

/**
 * F7-03: Stock mutation / transfer.
 *
 * wide-product-01-039 ("Aged Cheddar 01-039", qa-wide-01, index 38) is a
 * non-trap product with targetOnHandMilli=300_000 split evenly across its 3
 * warehouse balances by the Wide generator, so both Adjust and Transfer
 * Stock are always available for it (every warehouse row already has a
 * balance). It's picked specifically because it sorts alphabetically early
 * ("Aged..."): both the Products list and the Movement History screen's
 * #filter-product dropdown are capped/paginated by name, and a mid-index
 * product like wide-product-01-051 ("...051") doesn't reliably appear in
 * either.
 */

const HANDLE = 'qa-wide-01';
const INVENTORY_MANAGER = 'qa-wide-01-inventory-manager-03@example.com';
const PRODUCT_ID = 'wide-product-01-039';

test('INVENTORY_MANAGER adjusts and transfers real stock via the Functions emulator, visible in balances and movement history', async ({
  page,
}) => {
  await login(page, INVENTORY_MANAGER, HANDLE);

  await page.goto(`/app/${HANDLE}/inventory/movements`);
  await expect(page.getByRole('heading', { name: 'Movement History' })).toBeVisible({
    timeout: 25000,
  });
  // Filter by the productId dropdown (Q-023, an equality filter) rather than
  // the free-text search box: the search box's Q-015-style prefix search can
  // return a "narrow your search" empty result for some terms, which isn't
  // what this check is after.
  await page.locator('#filter-product').selectOption(PRODUCT_ID);
  const movementRows = page.locator('table tbody tr');
  await expect(movementRows.first()).toBeVisible({ timeout: 15000 });
  const movementRowsBefore = await movementRows.count();

  await page.goto(`/app/${HANDLE}/inventory/products/${PRODUCT_ID}`);
  await page.getByRole('button', { name: 'Stock by store room' }).click();

  // The Stock tab renders one row per *active warehouse in the org* (20 for a
  // normal Wide org), not one row per warehouse this product actually holds a
  // balance in — only rows with a balance show "Adjust" (the rest show
  // "Opening Balance"). Filter down to the 3 the generator actually seeded.
  const allStockRows = page.locator('table').filter({ hasText: 'Warehouse' }).locator('tbody tr');
  await expect(allStockRows.first()).toBeVisible({ timeout: 15000 });
  const stockRows = allStockRows.filter({
    has: page.getByRole('button', { name: 'Adjust', exact: true }),
  });
  await expect(stockRows).toHaveCount(3, { timeout: 15000 });

  async function readOnHand(index: number): Promise<number> {
    const cell = await stockRows.nth(index).locator('td').nth(1).innerText();
    return parseFloat(cell.trim());
  }

  const warehouse0Name = (await stockRows.nth(0).locator('td').nth(0).innerText()).trim();
  const warehouse1Name = (await stockRows.nth(1).locator('td').nth(0).innerText()).trim();
  const onHand0Before = await readOnHand(0);
  const onHand1Before = await readOnHand(1);

  // Adjust: add 5 units to warehouse 0.
  await stockRows.nth(0).getByRole('button', { name: 'Adjust', exact: true }).click();
  const adjustDialog = page.getByRole('dialog');
  await expect(adjustDialog.getByRole('heading', { name: 'Adjust Stock' })).toBeVisible();
  await adjustDialog.getByLabel('Adjustment Quantity (use negative to decrease)').fill('5');
  await adjustDialog.getByLabel('Reason').selectOption('Recount Correction');
  await adjustDialog.getByRole('button', { name: 'Adjust Balance' }).click();
  await expect(adjustDialog).toBeHidden({ timeout: 15000 });

  await expect(async () => {
    expect(await readOnHand(0)).toBeCloseTo(onHand0Before + 5, 0);
  }).toPass({ timeout: 15000 });

  const onHand0AfterAdjust = await readOnHand(0);

  // Transfer: move 10 units from warehouse 0 to warehouse 1.
  await page.getByRole('button', { name: 'Transfer Stock' }).click();
  const transferDialog = page.getByRole('dialog');
  // getByText's default substring/case-insensitive match also hits the dialog
  // description ("Transfer stock between store rooms."), so scope to the
  // heading specifically.
  await expect(transferDialog.getByRole('heading', { name: 'Transfer Stock' })).toBeVisible();
  await transferDialog.getByLabel('Source').selectOption({ label: warehouse0Name });
  await transferDialog.getByLabel('Destination').selectOption({ label: warehouse1Name });
  await transferDialog.getByLabel('Quantity to transfer').fill('10');
  await transferDialog.getByRole('button', { name: 'Transfer', exact: true }).click();
  await expect(transferDialog).toBeHidden({ timeout: 15000 });

  await expect(async () => {
    expect(await readOnHand(0)).toBeCloseTo(onHand0AfterAdjust - 10, 0);
    expect(await readOnHand(1)).toBeCloseTo(onHand1Before + 10, 0);
  }).toPass({ timeout: 15000 });

  await page.goto(`/app/${HANDLE}/inventory/movements`);
  await expect(page.getByRole('heading', { name: 'Movement History' })).toBeVisible({
    timeout: 25000,
  });
  await page.locator('#filter-product').selectOption(PRODUCT_ID);
  await expect(async () => {
    const movementRowsAfter = await page.locator('table tbody tr').count();
    expect(movementRowsAfter).toBeGreaterThanOrEqual(movementRowsBefore + 3);
  }).toPass({ timeout: 20000 });
});
