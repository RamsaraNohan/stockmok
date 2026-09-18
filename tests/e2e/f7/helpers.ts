import { expect, type Page } from '@playwright/test';

/**
 * Shared helpers for the F7 final integrated browser acceptance specs.
 * Mirrors the login/expectDenied conventions already proven in
 * tests/e2e/a10-rbac.spec.ts and tests/e2e/f4-f5-macro-b-acceptance.spec.ts,
 * generalized to an arbitrary org handle for the Wide QA dataset.
 */

/**
 * The onboarding-redirect race that used to require a login retry here is
 * fixed at the source (SignInScreen/BrandedLoginScreen now force a genuine
 * server read of memberships before deciding where to route — see
 * fetchUserMembershipsFromServer). A single sign-in attempt is expected to
 * reach the dashboard; the generous timeout below is solely for the Wide
 * dataset's Firestore emulator cold-connection latency, not a defect
 * workaround.
 */
export async function login(page: Page, email: string, handle: string): Promise<void> {
  if (page.url().includes('/app/')) {
    await page.getByRole('button', { name: 'User account menu' }).click();
    await page.getByText('Sign Out', { exact: true }).click();
    await page.waitForURL(/\/login$/);
  } else {
    await page.goto('/login');
  }
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill('password123');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(new RegExp(`/app/${handle}/dashboard`), { timeout: 20000 });
}

export async function expectDenied(page: Page, path: string): Promise<void> {
  await page.goto(path);
  // Every full navigation re-runs WorkspaceGuard's own membership fetch
  // before RoleGuard ever gets to render its (fast, client-side) denial, so
  // this pays the same cold-connection tax as the initial login.
  await expect(page.getByRole('heading', { name: 'Access Denied (403)' })).toBeVisible({
    timeout: 20000,
  });
}

export async function expectNoPageOverflow(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => ({
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(
    metrics.pageWidth,
    `${page.url()} overflowed at viewport width ${String(metrics.viewportWidth)}px`,
  ).toBeLessThanOrEqual(metrics.viewportWidth);
}

export interface RuntimeErrors {
  readonly errors: string[];
}

/** Registers console/pageerror listeners and returns the live array they append to. */
export function collectRuntimeErrors(page: Page): RuntimeErrors {
  const errors: string[] = [];
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 500) {
      errors.push(`http ${String(response.status())}: ${response.url()}`);
    }
  });
  return { errors };
}
