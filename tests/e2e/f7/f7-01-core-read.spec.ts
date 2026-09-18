import { expect, test } from '@playwright/test';

import { collectRuntimeErrors, login } from './helpers';

/**
 * F7-01: Core login + read journey.
 *
 * Normal Wide OWNER (qa-wide-01) walking every core read surface against the
 * real Auth/Firestore/Functions emulators and the real Wide dataset.
 */

const HANDLE = 'qa-wide-01';
const OWNER = 'qa-wide-01-owner-01@example.com';

test('OWNER reads Dashboard, Products, Product Detail, Categories, Warehouses, Movements, and Notifications with correct org context and no leakage', async ({
  page,
}) => {
  const { errors } = collectRuntimeErrors(page);

  await login(page, OWNER, HANDLE);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Welcome back to QA Wide Organization 01')).toBeVisible();

  // Every page.goto below is a full navigation, which re-initializes the
  // Firebase SDK from cold; the Wide dataset's Firestore emulator can take
  // several seconds to establish that fresh connection, so the first
  // assertion after each goto carries generous headroom.
  await page.goto(`/app/${HANDLE}/inventory/products`);
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible({ timeout: 25000 });
  const rows = page.locator('table tbody tr');
  await expect(rows.first()).toBeVisible({ timeout: 15000 });
  const unfilteredCount = await rows.count();
  expect(unfilteredCount).toBeGreaterThan(0);

  // Search narrows results. The term must have no digits/dashes so
  // ProductListScreen routes it to the productName field, not the SKU field
  // (a digit anywhere — even in a full product name like "...001" — flips it
  // to an internalSkuNormalized prefix match, which won't find a name). The
  // unfiltered list and this "Wide Standard Item" search both happen to hit
  // the same page-size cap (30 trap products share that name prefix), so
  // rather than compare row counts, confirm the search narrows by checking
  // that an alphabetically-early product visible in the default view (sorted
  // by name, "Aged Cheddar..." sorts first) disappears once filtered.
  await expect(page.getByText('Aged Cheddar 01-039')).toBeVisible({ timeout: 15000 });
  await page.locator('#product-search').fill('Wide Standard Item');
  await expect(page.getByText('Wide Standard Item 001').first()).toBeVisible({ timeout: 25000 });
  await expect(page.getByText('Aged Cheddar 01-039')).toBeHidden();
  await page.locator('#product-search').fill('');

  // Product detail for a deliberately id-shared "trap" product — proves this
  // tenant's own document renders, not another org's copy of the same id.
  await page.goto(`/app/${HANDLE}/inventory/products/wide-shared-product-001`);
  await expect(page.getByRole('heading', { name: 'Wide Standard Item 001' })).toBeVisible({
    timeout: 20000,
  });

  // Tenant isolation: a product id that exists only under qa-wide-02 must not
  // render qa-wide-02's data while authenticated into qa-wide-01.
  await page.goto(`/app/${HANDLE}/inventory/products/wide-product-02-051`);
  await expect(page.getByText('The product could not be found.')).toBeVisible({
    timeout: 20000,
  });

  await page.goto(`/app/${HANDLE}/inventory/categories`);
  await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible({ timeout: 20000 });

  await page.goto(`/app/${HANDLE}/inventory/warehouses`);
  await expect(page.getByRole('heading', { name: 'Warehouses & Store Rooms' })).toBeVisible({
    timeout: 20000,
  });

  await page.goto(`/app/${HANDLE}/inventory/movements`);
  await expect(page.getByRole('heading', { name: 'Movement History' })).toBeVisible({
    timeout: 20000,
  });

  await page.goto(`/app/${HANDLE}/notifications`);
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible({
    timeout: 20000,
  });

  const bodyText = await page.locator('body').innerText();
  expect(bodyText, 'page text should never render a raw Timestamp/object').not.toMatch(
    /_seconds|_nanoseconds|\[object Object\]/,
  );

  expect(errors, `runtime errors observed: ${JSON.stringify(errors)}`).toEqual([]);
});
