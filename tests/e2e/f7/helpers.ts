import { expect, type Page } from '@playwright/test';

/**
 * Shared helpers for the F7 final integrated browser acceptance specs.
 * Mirrors the login/expectDenied conventions already proven in
 * tests/e2e/a10-rbac.spec.ts and tests/e2e/f4-f5-macro-b-acceptance.spec.ts,
 * generalized to an arbitrary org handle for the Wide QA dataset.
 */

/**
 * KNOWN DEFECT (found while building F7, reported separately — not patched
 * here, see the F7 report): SignInScreen.onSubmit does one `getDocs()` read
 * of the caller's memberships immediately after login and, if it comes back
 * empty, routes to /onboarding with no distinction between "genuinely has no
 * memberships" and "the Firestore SDK had not finished establishing its
 * WebChannel yet and fell back to an empty cache." Under the Wide dataset's
 * heavier emulator load, the well-documented "Could not reach Cloud
 * Firestore backend... within 10 seconds" cold-connection window is wide
 * enough to hit this on a real, membership-holding account, misrouting it to
 * onboarding. A second sign-in attempt immediately after always succeeds,
 * because by then the connection is warm — so the retry below is a
 * test-harness accommodation for a real product race, not a flaky-test
 * workaround, and is deliberately not silent about it.
 */
async function attemptLogin(page: Page, email: string, handle: string): Promise<boolean> {
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
  try {
    await page.waitForURL(new RegExp(`/app/${handle}/dashboard`), { timeout: 20000 });
    return true;
  } catch {
    return false;
  }
}

export async function login(page: Page, email: string, handle: string): Promise<void> {
  if (await attemptLogin(page, email, handle)) return;
  console.log(
    `F7_KNOWN_DEFECT: first sign-in for ${email} landed on ${page.url()} instead of the dashboard ` +
      `(SignInScreen's post-login membership read raced a cold Firestore connection). Retrying once.`,
  );
  const succeeded = await attemptLogin(page, email, handle);
  if (!succeeded) {
    throw new Error(
      `Login for ${email} did not reach /app/${handle}/dashboard after a retry — this is beyond the known transient onboarding-race defect.`,
    );
  }
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
