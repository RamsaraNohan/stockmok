import { expect, test } from '@playwright/test';

test.describe('F1 Shell & Auth E2E Tests', () => {
  test('renders public home landing page without browser errors', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') browserErrors.push(msg.text());
    });
    page.on('pageerror', (err) => browserErrors.push(err.message));

    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Inventory & Procurement');
    await expect(page.getByRole('link', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();

    expect(browserErrors).toEqual([]);
  });

  test('navigates to sign in screen', async ({ page }) => {
    await page.goto('/login');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Sign in to Stockmok' }),
    ).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('navigates to sign up screen', async ({ page }) => {
    await page.goto('/signup');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeVisible();
    await expect(page.locator('input[name="displayName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  });

  test('renders 404 Not Found screen for unknown paths', async ({ page }) => {
    await page.goto('/unknown-random-path-12345');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Page Not Found (404)' }),
    ).toBeVisible();
  });
});
