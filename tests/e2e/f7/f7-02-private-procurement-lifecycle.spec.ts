import { expect, test } from '@playwright/test';

import { login } from './helpers';

/**
 * F7-02: Private procurement lifecycle.
 *
 * qa-po-qa-wide-01-01 is seeded as DRAFT with 5 real lines (Wide private-PO
 * generator cycles DRAFT/ORDERED/PARTIALLY_RECEIVED/RECEIVED/CANCELLED every
 * 5 orders, so order index 0 is DRAFT). The private PO detail screen has no
 * "add line" UI, so this drives the order forward on its already-persisted
 * lines: DRAFT -> Order -> receiving -> partial receipt -> full receipt.
 *
 * Every private order in every Wide org is placed against the single
 * ORDERING_PARTNER, qa-partner-01. The Wide generator's partnersForOrg seeds
 * partner status as `index % 11 === 0 ? 'DEACTIVATED' : 'ACTIVE'`, and
 * qa-partner-01 is index 0 — so it is *always* seeded DEACTIVATED. Clicking
 * "Order" against a deactivated supplier correctly fails server-side with
 * "The supplier is not active." — real, correct business-rule enforcement,
 * not a bug. This reactivates the partner first, which both clears the way
 * for the transition and exercises the partner-activation flow live.
 */

const HANDLE = 'qa-wide-01';
const OWNER = 'qa-wide-01-owner-01@example.com';
const PARTNER_ID = 'qa-partner-01';
const PO_ID = 'qa-po-qa-wide-01-01';

test('OWNER walks a Wide private PO through DRAFT -> ORDERED -> PARTIALLY_RECEIVED -> RECEIVED', async ({
  page,
}) => {
  await login(page, OWNER, HANDLE);

  await page.goto(`/app/${HANDLE}/procurement/suppliers/${PARTNER_ID}`);
  const activateButton = page.getByRole('button', { name: 'Activate', exact: true });
  await expect(
    activateButton.or(page.getByRole('button', { name: 'Deactivate', exact: true })),
  ).toBeVisible({
    timeout: 25000,
  });
  if (await activateButton.isVisible()) {
    await activateButton.click();
    await expect(page.getByRole('button', { name: 'Deactivate', exact: true })).toBeVisible({
      timeout: 15000,
    });
  }

  await page.goto(`/app/${HANDLE}/procurement/purchase-orders/${PO_ID}`);
  // "DRAFT" also appears once in the History table's own creation row, so this
  // page always has 2 exact matches once any history exists — .first() picks
  // the "Status:" field, which is the one under test.
  await expect(page.getByText('DRAFT', { exact: true }).first()).toBeVisible({ timeout: 25000 });
  // Scoped to the "Line Items" section specifically: this screen also renders
  // a History table below it, and a DRAFT order already has one history row
  // (its creation event), so an unscoped `table tbody tr` overcounts. `..`
  // walks to the heading's own parent, the wrapping div the table is also a
  // direct child of.
  const lineItemsSection = page.getByRole('heading', { name: 'Line Items' }).locator('..');
  await expect(lineItemsSection.locator('table tbody tr')).toHaveCount(5, { timeout: 15000 });

  await page.getByRole('button', { name: 'Order', exact: true }).click();
  await expect(page.getByText('ORDERED', { exact: true }).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Order', exact: true })).toBeHidden();

  // First receiving pass: receive row 0 partially, everything else untouched.
  await page.goto(`/app/${HANDLE}/procurement/receiving/${PO_ID}`);
  await expect(page.getByRole('heading', { name: /^Receive:/ })).toBeVisible({ timeout: 25000 });
  const firstPassRows = page.locator('table tbody tr');
  await expect(firstPassRows).toHaveCount(5, { timeout: 15000 });
  const row0CurrentStockCellBefore = firstPassRows.nth(0).locator('td').nth(1);
  // Rows render before the asynchronous stock-balance query hydrates. Wait for
  // the authoritative seeded value rather than reading the initial zero.
  await expect(row0CurrentStockCellBefore).toHaveText('100', { timeout: 15000 });
  const row0CurrentStockBefore = parseFloat((await row0CurrentStockCellBefore.innerText()).trim());
  const row0Ordered = parseFloat(
    (await firstPassRows.nth(0).locator('td').nth(2).innerText()).trim(),
  );
  const partialQty = Math.min(0.5, row0Ordered);
  await firstPassRows.nth(0).getByRole('spinbutton').fill(String(partialQty));
  await page.getByRole('button', { name: 'Receive', exact: true }).click();

  await page.waitForURL(new RegExp(`procurement/purchase-orders/${PO_ID}$`));
  await expect(page.getByText('PARTIALLY_RECEIVED', { exact: true }).first()).toBeVisible({
    timeout: 15000,
  });

  // Second receiving pass: receive every remaining outstanding quantity.
  await page.goto(`/app/${HANDLE}/procurement/receiving/${PO_ID}`);
  const secondPassRows = page.locator('table tbody tr');
  await expect(secondPassRows).toHaveCount(5, { timeout: 25000 });

  const expectedStockAfterFirstReceipt = row0CurrentStockBefore + partialQty;
  const row0CurrentStockCellAfterFirstReceipt = secondPassRows.nth(0).locator('td').nth(1);
  // The receive callable has completed, but this route's balance query may
  // still be hydrating. Auto-retry the UI assertion until it shows 100.5.
  await expect(row0CurrentStockCellAfterFirstReceipt).toHaveText(
    String(expectedStockAfterFirstReceipt),
    { timeout: 15000 },
  );
  const row0CurrentStockAfterFirstReceipt = parseFloat(
    (await row0CurrentStockCellAfterFirstReceipt.innerText()).trim(),
  );
  expect(row0CurrentStockAfterFirstReceipt).toBeCloseTo(expectedStockAfterFirstReceipt, 2);

  const rowCount = await secondPassRows.count();
  for (let index = 0; index < rowCount; index += 1) {
    const row = secondPassRows.nth(index);
    const ordered = parseFloat((await row.locator('td').nth(2).innerText()).trim());
    const received = parseFloat((await row.locator('td').nth(3).innerText()).trim());
    const remaining = ordered - received;
    if (remaining > 0.0001) {
      await row.getByRole('spinbutton').fill(String(remaining));
    }
  }
  await page.getByRole('button', { name: 'Receive', exact: true }).click();

  await page.waitForURL(new RegExp(`procurement/purchase-orders/${PO_ID}$`));
  await expect(page.getByText('RECEIVED', { exact: true }).first()).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeHidden();
});
