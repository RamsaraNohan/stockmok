import { expect, test } from '@playwright/test';

import { login } from './helpers';

/**
 * F7-05: DV-12 lifetime placed orders.
 *
 * DV-12 defines "orders placed" by the retained `submittedAt` marker, not
 * current status, so a later CANCELLED does not decrement it. This drives a
 * *different* order (index 1, seeded SUBMITTED) than F7-04 on the same
 * qa-wide-01 <-> qa-wide-02 connection to avoid any state collision, and
 * reads the connection's own "Orders placed" counter, browser-visible on
 * ConnectionDetailScreen, before and after a live cancellation.
 */

const BUYER_HANDLE = 'qa-wide-01';
const BUYER_OWNER = 'qa-wide-01-owner-01@example.com';
const CONNECTION_ID = 'qa-wide-org-01__qa-wide-org-02';
const PO_ID = 'qa-cpo-qa-wide-01-qa-wide-02-02';

test('Cancelling a submitted connected order does not decrement the connection lifetime orders-placed count', async ({
  page,
}) => {
  await login(page, BUYER_OWNER, BUYER_HANDLE);

  await page.goto(`/app/${BUYER_HANDLE}/network/connections/${CONNECTION_ID}`);
  await expect(page.getByText('Orders placed')).toBeVisible({ timeout: 15000 });
  const before = (
    await page.getByText('Orders placed').locator('..').locator('dd').innerText()
  ).trim();
  const ordersPlacedBefore = parseInt(before, 10);
  expect(Number.isFinite(ordersPlacedBefore)).toBe(true);

  await page.goto(`/app/${BUYER_HANDLE}/procurement/purchase-orders/${PO_ID}`);
  await expect(page.getByText('SUBMITTED', { exact: true })).toBeVisible({ timeout: 25000 });
  await expect(page.getByRole('button', { name: 'Cancel order' })).toBeVisible({ timeout: 25000 });

  await page.getByRole('button', { name: 'Cancel order' }).click();
  await expect(page.getByText('Connected purchase order cancelled.')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('CANCELLED', { exact: true })).toBeVisible({ timeout: 15000 });

  await page.goto(`/app/${BUYER_HANDLE}/network/connections/${CONNECTION_ID}`);
  await expect(page.getByText('Orders placed')).toBeVisible({ timeout: 20000 });
  await expect(async () => {
    const after = (
      await page.getByText('Orders placed').locator('..').locator('dd').innerText()
    ).trim();
    expect(parseInt(after, 10)).toBe(ordersPlacedBefore);
  }).toPass({ timeout: 15000 });
});
