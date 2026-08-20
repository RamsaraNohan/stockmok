import { expect, type Page } from '@playwright/test';

import { cover } from './a10/acceptance';
import { test } from './a10/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill('owner@grand-ocean.stockmok.test');
  await page.locator('input[name="password"]').fill('password123');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(/\/app\/grand-ocean\/dashboard/);
}

async function expectNoPageOverflow(page: Page) {
  const metrics = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const overflowingElements = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          className: element.className,
          right: Math.round(rect.right),
          tagName: element.tagName,
          text: element.textContent.trim().slice(0, 80),
        };
      })
      .filter(({ right }) => right > viewportWidth + 1)
      .slice(0, 8);

    return {
      pageWidth: document.documentElement.scrollWidth,
      overflowingElements,
      viewportWidth,
    };
  });

  expect(
    metrics.pageWidth,
    `${page.url()} overflowed ${String(metrics.viewportWidth)}px: ${JSON.stringify(metrics.overflowingElements)}`,
  ).toBeLessThanOrEqual(metrics.viewportWidth);
}

test('governed Macro A screens remain reachable without page-level clipping', async ({
  page,
}, testInfo) => {
  cover(testInfo, testInfo.project.name === 'responsive-390' ? 'A10-RSP-390' : 'A10-RSP-1024');
  await login(page);

  const screens = [
    ['/app/grand-ocean/dashboard', 'Dashboard'],
    ['/app/grand-ocean/inventory/products', 'Products'],
    ['/app/grand-ocean/inventory/products/meat-001', 'Chicken Breast'],
    ['/app/grand-ocean/inventory/movements', 'Movement History'],
    ['/app/grand-ocean/procurement/suppliers', 'Suppliers'],
    ['/app/grand-ocean/procurement/purchase-orders', 'Purchase Orders'],
    ['/app/grand-ocean/procurement/receiving', 'Receiving'],
  ] as const;

  for (const [path, heading] of screens) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
    await expectNoPageOverflow(page);
  }

  const width = page.viewportSize()?.width;
  if (width === 390) {
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(page.getByRole('dialog').getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await page.getByRole('button', { name: 'Close navigation drawer' }).click();
  } else {
    await expect(page.getByRole('navigation', { name: 'Main Navigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeHidden();
  }
});
