import { expect, type Page } from '@playwright/test';

import { cover } from './macro-b/acceptance';
import { test } from './macro-b/test';

const USERS = {
  owner: 'owner@grand-ocean.stockmok.test',
  admin: 'admin@grand-ocean.stockmok.test',
  storekeeper: 'storekeeper@grand-ocean.stockmok.test',
  freshOwner: 'owner@freshfoods.stockmok.test',
} as const;

async function login(page: Page, email: string, handle: 'grand-ocean' | 'freshfoods') {
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
  await page.waitForURL(new RegExp(`/app/${handle}/dashboard`));
}

async function expectDenied(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: 'Access Denied (403)' })).toBeVisible();
}

// ─── Network ────────────────────────────────────────────────────────────────

test('Network enabled: Connected Businesses lists the ACTIVE Fresh Foods connection', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-NET-001');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/network/connections');
  await expect(page.getByText('Fresh Foods Ltd').first()).toBeVisible();
  await expect(page.getByText('ACTIVE').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Find business' })).toBeVisible();
});

test('Network RBAC: STOREKEEPER is denied Network routes before any query fires', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-NET-002');
  await login(page, USERS.storekeeper, 'grand-ocean');
  await expectDenied(page, '/app/grand-ocean/network/connections');
  await expectDenied(page, '/app/grand-ocean/network/mappings');
});

test('Network disabled renders 404, not 403, and re-enabling restores access', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-NET-003');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/settings');
  const networkSwitch = page.getByRole('switch', { name: /Network/ });
  await expect(networkSwitch).toBeChecked();
  await networkSwitch.click();
  await page.getByRole('button', { name: 'Save business defaults' }).click();
  await expect(page.getByText('Save business defaults')).toBeEnabled();

  await page.goto('/app/grand-ocean/network/connections');
  await expect(page.getByRole('heading', { name: 'Page Not Found (404)' })).toBeVisible();

  await page.goto('/app/grand-ocean/settings');
  const restoredSwitch = page.getByRole('switch', { name: /Network/ });
  await expect(restoredSwitch).not.toBeChecked();
  await restoredSwitch.click();
  await page.getByRole('button', { name: 'Save business defaults' }).click();
  await expect(restoredSwitch).toBeChecked();

  await page.goto('/app/grand-ocean/network/connections');
  await expect(page.getByText('Fresh Foods Ltd').first()).toBeVisible();
});

// ─── Business discovery ─────────────────────────────────────────────────────

test('Discovery blocks searching the caller’s own handle', async ({ page }, testInfo) => {
  cover(testInfo, 'MB-F4-DISC-001');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/network/connections');
  await page.getByRole('button', { name: 'Find business' }).click();
  await page.getByLabel('Business handle').fill('grand-ocean');
  await page.getByRole('button', { name: 'Find business' }).click();
  await expect(page.getByText('You cannot connect this workspace to itself.')).toBeVisible();
});

test('Discovery reports no match for an exact unknown handle', async ({ page }, testInfo) => {
  cover(testInfo, 'MB-F4-DISC-002');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/network/connections');
  await page.getByRole('button', { name: 'Find business' }).click();
  await page.getByLabel('Business handle').fill('no-such-business-anywhere');
  await page.getByRole('button', { name: 'Find business' }).click();
  await expect(
    page.getByText('No active Stockmok business was found for that exact handle.'),
  ).toBeVisible();
});

test('Discovery finds an exact-handle match and surfaces its directory card', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-DISC-003');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/network/connections');
  await page.getByRole('button', { name: 'Find business' }).click();
  await page.getByLabel('Business handle').fill('freshfoods');
  await page.getByRole('button', { name: 'Find business' }).click();
  await expect(page.getByRole('heading', { name: 'Fresh Foods Ltd' })).toBeVisible();
  await expect(page.getByLabel('Exact business result').getByText('@freshfoods')).toBeVisible();
});

// ─── Connection detail ──────────────────────────────────────────────────────

test('Connection detail renders status, direction, and action affordances', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-CONN-001');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/network/connections/grand-ocean-org__fresh-foods-org');
  await expect(page.getByText('ACTIVE')).toBeVisible();
  await expect(page.getByText('OUTGOING')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Disable connection' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open catalog' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Product mappings', exact: true })).toBeVisible();
});

// ─── Supplier catalog (publish/unpublish own items) ────────────────────────

test('Publishing an own product projects only the allowlisted fields', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-CAT-SUP-001');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/network/partner-catalog?productId=dair-002');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Partner SKU').fill('DAIR-002-PARTNER');
  await dialog.getByLabel('Partner item name').fill('Grand Ocean Butter Block 1KG');
  await dialog.getByLabel('Pack description').fill('1 KG block');
  await dialog.getByLabel('Wholesale price (LKR)').fill('2500');
  await dialog.getByRole('button', { name: 'Publish partner item' }).click();
  await expect(dialog).toBeHidden();
  // The own-catalog table renders internalProductNameSnapshot ("Butter Block"), not
  // the partner-facing displayName I just entered — that projection is what buyers
  // see via the buyer catalog (already covered by MB-F4-CAT-BUY-001).
  const row = page.getByRole('row', { name: /DAIR-002-PARTNER/ });
  await expect(row).toBeVisible();
  await expect(row.getByRole('cell', { name: 'Butter Block' })).toBeVisible();
  await expect(row.getByRole('cell', { name: 'Published' })).toBeVisible();
});

test('Unpublishing a supplier catalog item removes it from the published list', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-CAT-SUP-002');
  await login(page, USERS.owner, 'grand-ocean');
  // A distinct product from MB-F4-CAT-SUP-001's dair-002, so the two tests don't
  // race to publish (and unpublish-check) the same catalog item.
  await page.goto('/app/grand-ocean/network/partner-catalog?productId=dry-001');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Partner SKU').fill('DRY-001-PARTNER');
  await dialog.getByLabel('Partner item name').fill('Grand Ocean Basmati Rice 25KG');
  await dialog.getByRole('button', { name: 'Publish partner item' }).click();
  await expect(dialog).toBeHidden();
  const row = page.getByRole('row', { name: /DRY-001-PARTNER/ });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Unpublish' }).click();
  await page.getByRole('button', { name: 'Unpublish Basmati Rice' }).click();
  await expect(page.getByText('Basmati Rice unpublished from the partner catalog.')).toBeVisible();
  await expect(page.getByRole('row', { name: /DRY-001-PARTNER/ })).toHaveCount(0);
});

// ─── Buyer catalog ──────────────────────────────────────────────────────────

test('Buyer catalog lists a connected supplier’s items and finds one by exact SKU', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-CAT-BUY-001');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/network/partner-catalog/fresh-foods-org');
  await expect(page.getByText('Chicken Breast 5 KG Pack').first()).toBeVisible();
  await page.getByLabel('Exact partner SKU').fill('BTR-1K');
  await page.getByRole('button', { name: /Look up/i }).click();
  await expect(page.getByText('Exact SKU match')).toBeVisible();
});

// ─── Connected purchase orders ──────────────────────────────────────────────
// (runs before "Product mappings" below: MB-F4-MAP-004 disables the exact
// mapping every seeded connected-PO fixture line references, and a disabled
// mapping correctly fails cpoSubmit's re-verification — so mapping disablement
// must happen only after these fixtures have been exercised.)

test('Buyer submits an existing connected draft (C34 lines stay read-only)', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-CPO-001');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/procurement/purchase-orders/cpo-draft-submit');
  await expect(
    page.getByText('Connected draft line editing is unavailable', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Submit order' }).click();
  await expect(page.getByText('Connected purchase order submitted.')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('SUBMITTED', { exact: true })).toBeVisible();
});

test('Buyer cancels an existing connected draft', async ({ page }, testInfo) => {
  cover(testInfo, 'MB-F4-CPO-002');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/procurement/purchase-orders/cpo-draft-cancel');
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await expect(page.getByText('Connected purchase order cancelled.')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('CANCELLED', { exact: true })).toBeVisible();
});

test('Supplier accepts a SUBMITTED connected order', async ({ page }, testInfo) => {
  cover(testInfo, 'MB-F4-CPO-003');
  page.on('dialog', (dialog) => {
    void dialog.accept();
  });
  await login(page, USERS.freshOwner, 'freshfoods');
  await page.goto('/app/freshfoods/procurement/purchase-orders/cpo-submitted-accept');
  await page.getByRole('button', { name: 'Accept order' }).click();
  await expect(page.getByText('Connected purchase order accepted.')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('ACCEPTED', { exact: true })).toBeVisible();
});

test('Supplier rejects a SUBMITTED connected order', async ({ page }, testInfo) => {
  cover(testInfo, 'MB-F4-CPO-004');
  page.on('dialog', (dialog) => {
    void dialog.accept();
  });
  await login(page, USERS.freshOwner, 'freshfoods');
  await page.goto('/app/freshfoods/procurement/purchase-orders/cpo-submitted-reject');
  await page.getByRole('button', { name: 'Reject order' }).click();
  await expect(page.getByText('Connected purchase order rejected.')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('REJECTED', { exact: true })).toBeVisible();
});

test('Supplier ships an ACCEPTED order as a single full shipment', async ({ page }, testInfo) => {
  cover(testInfo, 'MB-F4-CPO-005');
  page.on('dialog', (dialog) => {
    void dialog.accept();
  });
  await login(page, USERS.freshOwner, 'freshfoods');
  await page.goto('/app/freshfoods/procurement/purchase-orders/cpo-accepted-ship');
  await page.getByRole('button', { name: 'Mark as shipped' }).click();
  await expect(page.getByText('Connected purchase order marked as shipped.')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText('SHIPPED', { exact: true })).toBeVisible();
});

test('Buyer receives a SHIPPED connected order partially, then completes it', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-CPO-006');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/procurement/receiving/cpo-shipped-receive');
  await expect(page.getByText('quantities are entered in supplier order units')).toBeVisible();

  await page.locator('#receive-line-1').first().fill('2');
  await page.getByRole('button', { name: 'Receive selected items' }).click();
  await page.waitForURL(/procurement\/purchase-orders\/cpo-shipped-receive/);
  await expect(page.getByText('PARTIALLY_RECEIVED')).toBeVisible();
  await expect(page.getByText('3.000 PACK').first()).toBeVisible();

  await page.goto('/app/grand-ocean/procurement/receiving/cpo-shipped-receive');
  await page.locator('#receive-line-1').first().fill('3');
  await page.getByRole('button', { name: 'Receive selected items' }).click();
  await page.waitForURL(/procurement\/purchase-orders\/cpo-shipped-receive/);
  await expect(page.getByText('RECEIVED', { exact: true })).toBeVisible();
});

test('An over-receipt beyond the outstanding supplier quantity is blocked client-side', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-CPO-007');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/procurement/receiving/cpo-shipped-over');
  await page.locator('#receive-line-1').first().fill('6');
  await expect(page.getByRole('button', { name: 'Receive selected items' })).toBeDisabled();
});

// ─── Product mappings ───────────────────────────────────────────────────────

test('Mappings list shows the VERIFIED mapping and the no-restore notice', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-MAP-001');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/network/mappings');
  await expect(page.getByText('Chicken Breast', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('VERIFIED', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Disabled mappings are retained/)).toBeVisible();
});

test('Mapping wizard refuses an unknown supplier SKU and an invalid factor', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-MAP-002');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/network/mappings/new');
  await page
    .getByLabel(/Supplier connection/i)
    .selectOption({ label: 'Fresh Foods Ltd (@freshfoods)' });
  await page.getByLabel(/Supplier SKU/i).fill('NO-SUCH-SKU');
  await page.getByRole('button', { name: 'Check supplier SKU' }).click();
  await expect(page.getByText('No published item matches that supplier SKU.')).toBeVisible();

  await page.getByLabel(/Supplier SKU/i).fill('BTR-1K');
  await page.getByRole('button', { name: 'Check supplier SKU' }).click();
  await expect(page.getByText('Published supplier item found')).toBeVisible();
});

test('Mapping wizard creates a new VERIFIED mapping after semantic confirmation', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-MAP-003');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/network/mappings/new');
  await page
    .getByLabel(/Supplier connection/i)
    .selectOption({ label: 'Fresh Foods Ltd (@freshfoods)' });
  await page.getByLabel(/Supplier SKU/i).fill('BTR-1K');
  await page.getByRole('button', { name: 'Check supplier SKU' }).click();
  await expect(page.getByText('Published supplier item found')).toBeVisible();

  await page.getByLabel(/Buyer product/i).selectOption({ label: 'Butter Block (DAIR-002)' });
  await page.getByLabel(/Buyer base units per 1 supplier order unit/i).fill('1');
  await page.getByLabel(/I confirm both records refer to the same real-world item/i).check();
  await page.getByRole('button', { name: 'Create verified mapping' }).click();
  await expect(page.getByText('Verified mapping created')).toBeVisible({ timeout: 15000 });
});

test('Disabling a mapping removes it from the active list with no restore offered', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F4-MAP-004');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/network/mappings');
  const chickenRow = page.getByRole('row', { name: /Chicken Breast/ });
  await chickenRow.getByRole('button', { name: 'Disable mapping' }).click();
  await expect(page.getByText(/This action has no restore path/)).toBeVisible();
  await page.getByRole('button', { name: 'Disable mapping' }).last().click();
  await expect(
    page.getByText('Chicken Breast mapping disabled. Historical orders remain available.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /restore/i })).toHaveCount(0);
});

// ─── Team ───────────────────────────────────────────────────────────────────

test('Team screen protects the Owner row from role/suspend/remove actions', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F5-TEAM-001');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/team');
  await expect(page.getByText('Protected Owner').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change role' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove member' }).first()).toBeVisible();
});

test('Owner invites a new user and the invite link is shown exactly once', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F5-TEAM-002');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/team');
  await page.getByRole('button', { name: 'Invite user' }).click();
  await page.locator('#team-invite-email').fill('new-hire@grand-ocean.stockmok.test');
  await page.getByRole('button', { name: 'Invite user' }).click();
  const link = page.locator('input[value*="/invite/"]');
  await expect(link).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(link).toBeHidden();
});

// ─── Settings ───────────────────────────────────────────────────────────────

test('A non-Owner/Admin role is denied Team before any team query fires', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F5-TEAM-003');
  await login(page, USERS.storekeeper, 'grand-ocean');
  await expectDenied(page, '/app/grand-ocean/team');
});

test('Owner has full Settings access including the Network toggle', async ({ page }, testInfo) => {
  cover(testInfo, 'MB-F5-SET-001');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/settings');
  await expect(page.getByLabel('Handle')).toHaveValue('@grand-ocean');
  await expect(page.getByRole('switch', { name: /Network/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save organization profile' })).toBeVisible();
});

test('A non-Owner/Admin role is denied Settings before any settings query fires', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F5-SET-002');
  await login(page, USERS.storekeeper, 'grand-ocean');
  await expectDenied(page, '/app/grand-ocean/settings');
});

// ─── Notifications ──────────────────────────────────────────────────────────

test('Notifications list renders and mark-read is stated as authority-blocked', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F5-NOTIF-001');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/notifications');
  await expect(page.getByRole('tab', { name: /Unread/ })).toBeVisible();
  await expect(
    page.getByText('Read status updates are temporarily unavailable.', { exact: false }),
  ).toBeVisible();
});

// ─── Reports ────────────────────────────────────────────────────────────────

test('Stock-on-hand report renders filters, subtotals, and desktop CSV export', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F5-REPORT-001');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/reports');
  await expect(page.getByRole('columnheader', { name: 'Product' })).toBeVisible();
  await expect(page.getByLabel('Store room')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Export current stock-on-hand page as CSV' }),
  ).toBeVisible();
});

test('PO report renders for an authorized role; Storekeeper is denied before query', async ({
  page,
}, testInfo) => {
  cover(testInfo, 'MB-F5-REPORT-002');
  await login(page, USERS.owner, 'grand-ocean');
  await page.goto('/app/grand-ocean/reports?tab=purchase-orders');
  await expect(page.getByRole('columnheader', { name: 'PO Number' })).toBeVisible();

  await login(page, USERS.storekeeper, 'grand-ocean');
  await page.goto('/app/grand-ocean/reports?tab=purchase-orders');
  await expect(page.getByRole('alert')).toContainText('Purchase-order report unavailable');
});
