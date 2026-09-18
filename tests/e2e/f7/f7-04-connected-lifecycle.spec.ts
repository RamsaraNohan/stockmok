import { expect, test, type Page } from '@playwright/test';

import { login } from './helpers';

/**
 * F7-04: Connected procurement supported lifecycle.
 *
 * qa-wide-01 (BUYER) <-> qa-wide-02 (SUPPLIER) is the Wide ring's first
 * connection. Its first order (index 0) is seeded DRAFT with one real
 * persisted line, so the buyer can submit it live. This exercises exactly
 * the authority-permitted sequence: submit -> accept -> ship -> receive.
 * C34 (connected draft-line browser persistence) is not exercised — the
 * order is submitted on its existing seeded line, matching the frozen
 * BLOCKED_AUTHORITY_DEPENDENCY boundary.
 */

const BUYER_HANDLE = 'qa-wide-01';
const SUPPLIER_HANDLE = 'qa-wide-02';
const BUYER_OWNER = 'qa-wide-01-owner-01@example.com';
const SUPPLIER_OWNER = 'qa-wide-02-owner-01@example.com';
const PO_ID = 'qa-cpo-qa-wide-01-qa-wide-02-01';

async function chooseWarehouseIfNeeded(page: Page): Promise<void> {
  const select = page.locator('#connected-receiving-warehouse');
  if ((await select.count()) === 0) return;
  const value = await select.inputValue();
  if (value) return;
  const optionValues = await select
    .locator('option')
    .evaluateAll((options) =>
      options.map((option) => option.getAttribute('value')).filter((v): v is string => Boolean(v)),
    );
  if (optionValues.length > 0) {
    await select.selectOption(optionValues[0] as string);
  }
}

test('Buyer submits, supplier accepts and ships, buyer partially then fully receives a connected order', async ({
  page,
}) => {
  page.on('dialog', (dialog) => {
    void dialog.accept();
  });

  await login(page, BUYER_OWNER, BUYER_HANDLE);
  await page.goto(`/app/${BUYER_HANDLE}/procurement/purchase-orders/${PO_ID}`);
  await expect(
    page.getByText('Connected draft line editing is unavailable', { exact: false }),
  ).toBeVisible({ timeout: 25000 });
  await expect(page.getByRole('button', { name: 'Submit order' })).toBeEnabled({ timeout: 25000 });

  await page.getByRole('button', { name: 'Submit order' }).click();
  await expect(page.getByText('Connected purchase order submitted.')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('SUBMITTED', { exact: true })).toBeVisible();

  await login(page, SUPPLIER_OWNER, SUPPLIER_HANDLE);
  await page.goto(`/app/${SUPPLIER_HANDLE}/procurement/purchase-orders/${PO_ID}`);
  const acceptButton = page.getByRole('button', { name: 'Accept order' });
  await expect(acceptButton).toBeVisible({ timeout: 25000 });
  await acceptButton.click();
  await expect(page.getByText('Connected purchase order accepted.')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('ACCEPTED', { exact: true })).toBeVisible();

  const shipButton = page.getByRole('button', { name: 'Mark as shipped' });
  await expect(shipButton).toBeVisible({ timeout: 15000 });
  await shipButton.click();
  await expect(page.getByText('Connected purchase order marked as shipped.')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('SHIPPED', { exact: true })).toBeVisible();

  await login(page, BUYER_OWNER, BUYER_HANDLE);
  await page.goto(`/app/${BUYER_HANDLE}/procurement/purchase-orders/${PO_ID}`);
  await expect(page.getByRole('link', { name: 'Receive shipment' })).toBeVisible({
    timeout: 25000,
  });
  await page.getByRole('link', { name: 'Receive shipment' }).click();
  await page.waitForURL(new RegExp(`procurement/receiving/${PO_ID}`));

  await chooseWarehouseIfNeeded(page);
  // The screen renders both a desktop table and a mobile card layout for the
  // same line, and both reuse the same id="receive-{itemId}" — an invalid
  // duplicate id — so scope to the table (visible at this desktop viewport).
  await page.locator('table').locator('#receive-line-01').fill('0.4');
  await page.getByRole('button', { name: 'Receive selected items' }).click();
  await page.waitForURL(new RegExp(`procurement/purchase-orders/${PO_ID}$`));
  await expect(page.getByText('PARTIALLY_RECEIVED')).toBeVisible({ timeout: 15000 });

  await page.goto(`/app/${BUYER_HANDLE}/procurement/receiving/${PO_ID}`);
  await chooseWarehouseIfNeeded(page);
  await expect(page.getByText('quantities are entered in supplier order units')).toBeVisible({
    timeout: 20000,
  });
  const outstandingCell = page.locator('table tbody tr').first().locator('td').nth(1);
  const outstandingText = (await outstandingCell.innerText()).trim();
  const outstandingSupplierQty = parseFloat(outstandingText.split(' ')[0] ?? '0');
  await page.locator('table').locator('#receive-line-01').fill(String(outstandingSupplierQty));
  await page.getByRole('button', { name: 'Receive selected items' }).click();
  await page.waitForURL(new RegExp(`procurement/purchase-orders/${PO_ID}$`));
  await expect(page.getByText('RECEIVED', { exact: true })).toBeVisible({ timeout: 15000 });
});
