import { expect, test } from '@playwright/test';

import { collectRuntimeErrors, expectNoPageOverflow, login } from './helpers';

/**
 * F7-08: High volume + responsive sanity.
 *
 * qa-high-volume renders 180 products across 20 warehouses. This is a sanity
 * integration check (not a repeat of a10-responsive.spec.ts's exhaustive
 * campaign): representative high-volume routes at a 390px mobile viewport
 * and a desktop viewport, watching for overflow and runtime errors.
 */

const HANDLE = 'qa-high-volume';
const OWNER = 'qa-high-volume-owner-01@example.com';
const SCREENS: readonly (readonly [string, string])[] = [
  [`/app/${HANDLE}/dashboard`, 'Dashboard'],
  [`/app/${HANDLE}/inventory/products`, 'Products'],
  [`/app/${HANDLE}/inventory/movements`, 'Movement History'],
  [`/app/${HANDLE}/notifications`, 'Notifications'],
];

test.describe('mobile viewport (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('high-volume routes render without overflow or errors on a 390px viewport', async ({
    page,
  }) => {
    const { errors } = collectRuntimeErrors(page);
    await login(page, OWNER, HANDLE);

    for (const [path, heading] of SCREENS) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({
        timeout: 20000,
      });
      await expectNoPageOverflow(page);
    }

    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(page.getByRole('dialog').getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await page.getByRole('button', { name: 'Close navigation drawer' }).click();

    expect(errors, `runtime errors observed: ${JSON.stringify(errors)}`).toEqual([]);
  });
});

test.describe('desktop viewport (1280x900)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('high-volume routes render, paginate/search usably, without overflow or errors on desktop', async ({
    page,
  }) => {
    const { errors } = collectRuntimeErrors(page);
    await login(page, OWNER, HANDLE);

    for (const [path, heading] of SCREENS) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({
        timeout: 20000,
      });
      await expectNoPageOverflow(page);
    }

    await expect(page.getByRole('navigation', { name: 'Main Navigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeHidden();

    await page.goto(`/app/${HANDLE}/inventory/products`);
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    const unfilteredCount = await rows.count();
    expect(unfilteredCount).toBeGreaterThan(0);

    await page.locator('#product-search').fill('001');
    await expect(async () => {
      expect(await rows.count()).toBeLessThan(unfilteredCount);
    }).toPass({ timeout: 15000 });

    expect(errors, `runtime errors observed: ${JSON.stringify(errors)}`).toEqual([]);
  });
});
