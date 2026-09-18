import { expect, test } from '@playwright/test';

import { expectDenied, login } from './helpers';

/**
 * F7-06: RBAC browser enforcement, on the Wide dataset's own users
 * (qa-wide-01), covering the four roles the master plan calls out as the
 * minimum: VIEWER, ANALYST, STOREKEEPER, PROCUREMENT_MANAGER. Route-guard
 * denial (RoleGuard, confirmed to render "Access Denied (403)" before any
 * query fires) is the browser-visible half of RBAC; the corresponding
 * backend rule enforcement is covered by the existing rules/backend security
 * suites, not duplicated here.
 */

const HANDLE = 'qa-wide-01';
const USERS = {
  VIEWER: 'qa-wide-01-viewer-07@example.com',
  ANALYST: 'qa-wide-01-analyst-06@example.com',
  STOREKEEPER: 'qa-wide-01-storekeeper-05@example.com',
  PROCUREMENT_MANAGER: 'qa-wide-01-procurement-manager-04@example.com',
} as const;

test('VIEWER reads products read-only and is denied movements, purchase orders, and receiving', async ({
  page,
}) => {
  await login(page, USERS.VIEWER, HANDLE);

  await page.goto(`/app/${HANDLE}/inventory/products`);
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: 'Create Product' })).toBeHidden();

  await expectDenied(page, `/app/${HANDLE}/inventory/movements`);
  await expectDenied(page, `/app/${HANDLE}/procurement/purchase-orders`);
  await expectDenied(page, `/app/${HANDLE}/procurement/receiving`);
});

test('ANALYST reads products, movements, and purchase orders but is denied receiving and suppliers', async ({
  page,
}) => {
  await login(page, USERS.ANALYST, HANDLE);

  await page.goto(`/app/${HANDLE}/inventory/products`);
  await expect(page.getByRole('button', { name: 'Create Product' })).toBeHidden({
    timeout: 20000,
  });

  await page.goto(`/app/${HANDLE}/inventory/movements`);
  await expect(page.getByRole('heading', { name: 'Movement History' })).toBeVisible();

  await page.goto(`/app/${HANDLE}/procurement/purchase-orders`);
  await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Order' })).toBeHidden();

  await expectDenied(page, `/app/${HANDLE}/procurement/receiving`);
  await expectDenied(page, `/app/${HANDLE}/procurement/suppliers`);
});

test('STOREKEEPER reads movements, purchase orders, and receiving but is denied suppliers', async ({
  page,
}) => {
  await login(page, USERS.STOREKEEPER, HANDLE);

  await page.goto(`/app/${HANDLE}/inventory/movements`);
  await expect(page.getByRole('heading', { name: 'Movement History' })).toBeVisible({
    timeout: 20000,
  });

  await page.goto(`/app/${HANDLE}/procurement/purchase-orders`);
  await expect(page.getByRole('button', { name: 'Create Order' })).toBeHidden();

  await page.goto(`/app/${HANDLE}/procurement/receiving`);
  await expect(page.getByRole('heading', { name: 'Receiving' })).toBeVisible();

  await expectDenied(page, `/app/${HANDLE}/procurement/suppliers`);
});

test('PROCUREMENT_MANAGER has full procurement authority but is denied Team and Settings', async ({
  page,
}) => {
  await login(page, USERS.PROCUREMENT_MANAGER, HANDLE);

  await page.goto(`/app/${HANDLE}/procurement/suppliers`);
  await expect(page.getByRole('heading', { name: 'Suppliers' })).toBeVisible({ timeout: 20000 });

  await page.goto(`/app/${HANDLE}/procurement/purchase-orders`);
  await expect(page.getByRole('button', { name: 'Create Order' })).toBeVisible();

  await page.goto(`/app/${HANDLE}/procurement/receiving`);
  await expect(page.getByRole('heading', { name: 'Receiving' })).toBeVisible();

  await expectDenied(page, `/app/${HANDLE}/team`);
  await expectDenied(page, `/app/${HANDLE}/settings`);
});
