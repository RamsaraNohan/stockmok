import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('F6 Dashboard KPI values do not cause mobile page overflow', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill('owner@grand-ocean.stockmok.test');
  await page.locator('input[name="password"]').fill('password123');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(/\/app\/grand-ocean\/dashboard/);

  await page.goto('/app/grand-ocean/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  const inventoryValueLabel = page.getByText('Inventory Value', { exact: true });
  await expect(inventoryValueLabel).toBeVisible({ timeout: 20_000 });

  const inventoryValue = inventoryValueLabel.locator('..').locator('span').nth(1);
  await expect(inventoryValue).toBeVisible();
  await expect(inventoryValue).toHaveText(/\S+/);

  const metrics = await inventoryValue.evaluate((element) => {
    const root = document.documentElement;
    const valueRect = element.getBoundingClientRect();
    const valueStyle = getComputedStyle(element);

    return {
      clientWidth: root.clientWidth,
      overflowPx: Math.max(0, root.scrollWidth - root.clientWidth),
      scrollWidth: root.scrollWidth,
      value: element.textContent.trim(),
      valueRect: {
        bottom: valueRect.bottom,
        height: valueRect.height,
        left: valueRect.left,
        right: valueRect.right,
        top: valueRect.top,
        width: valueRect.width,
      },
      valueStyle: {
        display: valueStyle.display,
        fontSize: valueStyle.fontSize,
        opacity: valueStyle.opacity,
        visibility: valueStyle.visibility,
      },
    };
  });

  console.log(`F6_DASHBOARD_390_METRICS=${JSON.stringify(metrics)}`);

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.value).not.toHaveLength(0);
  expect(metrics.valueRect.width).toBeGreaterThan(0);
  expect(metrics.valueRect.height).toBeGreaterThan(0);
  expect(metrics.valueRect.left).toBeGreaterThanOrEqual(0);
  expect(metrics.valueRect.right).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.valueStyle.display).not.toBe('none');
  expect(metrics.valueStyle.fontSize).not.toBe('0px');
  expect(metrics.valueStyle.opacity).not.toBe('0');
  expect(metrics.valueStyle.visibility).toBe('visible');
});
