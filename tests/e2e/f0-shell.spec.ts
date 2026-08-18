import { expect, test } from '@playwright/test';

test('renders the emulator-marked F0 shell without browser errors', async ({ page }) => {
  const browserErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    browserErrors.push(error.message);
  });

  await page.goto('/');

  await expect(page).toHaveTitle('Stockmok');
  await expect(page.getByRole('status', { name: 'Emulator environment' })).toHaveText('EMULATOR');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Application foundation is ready' }),
  ).toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeVisible();

  expect(browserErrors).toEqual([]);
});
