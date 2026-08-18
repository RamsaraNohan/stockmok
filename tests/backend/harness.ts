import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { paths } from '../../packages/shared/src/paths.js';
import type { Role } from '../../packages/shared/src/primitives.js';
import type { TrustedMembership } from '../../functions/src/guards/membership.js';

/**
 * The trusted-backend test harness.
 *
 * These tests run the **Admin SDK** against the Firestore emulator, which is the
 * point: the Admin SDK bypasses `firestore.rules` entirely, so what they prove
 * is that the guards in `functions/src/guards/**` and the frame in
 * `defineCommand()` deny on their own.
 */

export const PROJECT_ID = 'stockmok';
export const ORG_A = 'org-grand-ocean';
export const ORG_B = 'org-fresh-foods';

const APP_NAME = 'stockmok-backend-tests';

export function assertEmulator(): void {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) {
    throw new Error('FIRESTORE_EMULATOR_HOST is required — run these tests through emulators:exec');
  }
  const hostname = new URL(`http://${host}`).hostname;
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(hostname)) {
    throw new Error('FIRESTORE_EMULATOR_HOST must point to a loopback emulator');
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Live service-account credentials are forbidden in the B1 test run');
  }
}

export function testDb(): Firestore {
  assertEmulator();
  const app =
    getApps().find((candidate) => candidate.name === APP_NAME) ??
    initializeApp({ projectId: PROJECT_ID }, APP_NAME);
  return getFirestore(app);
}

export async function clearFirestore(): Promise<void> {
  assertEmulator();
  const response = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST ?? ''}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    throw new Error(`Failed to clear the Firestore emulator: ${String(response.status)}`);
  }
}

export function uidFor(orgId: string, role: Role): string {
  return `${orgId}--${role.toLowerCase()}`;
}

export interface SeedMemberOptions {
  readonly status?: 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
  readonly displayName?: string;
}

export async function seedOrganization(db: Firestore, orgId: string): Promise<void> {
  await db.doc(paths.organization(orgId)).set({
    organizationId: orgId,
    name: orgId,
    handle: orgId,
    status: 'ACTIVE',
    ownerUid: uidFor(orgId, 'OWNER'),
    schemaVersion: 1,
  });
}

export async function seedMember(
  db: Firestore,
  orgId: string,
  role: Role,
  options: SeedMemberOptions = {},
): Promise<string> {
  const uid = uidFor(orgId, role);
  await db.doc(paths.member(orgId, uid)).set({
    uid,
    role,
    status: options.status ?? 'ACTIVE',
    displayName: options.displayName ?? `${role} of ${orgId}`,
    email: `${uid}@stockmok.test`,
  });
  // INV-20 — the mirror always agrees with the member document, so any command
  // (e.g. team.changeMemberRole/setMemberStatus) that `update()`s the mirror
  // finds it already present, just as it would for a real membership.
  await db.doc(paths.membership(uid, orgId)).set({
    organizationId: orgId,
    handle: orgId,
    organizationName: orgId,
    monogram: 'ST',
    monogramColor: 'blue',
    role,
    status: options.status ?? 'ACTIVE',
    joinedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return uid;
}

export function membershipOf(orgId: string, role: Role): TrustedMembership {
  return {
    orgId,
    uid: uidFor(orgId, role),
    role,
    status: 'ACTIVE',
    displayName: `${role} of ${orgId}`,
    email: `${uidFor(orgId, role)}@stockmok.test`,
  };
}

export function callable(uid: string, data: unknown): { auth: { uid: string }; data: unknown } {
  return { auth: { uid }, data };
}

/** Like {@link callable}, but with a verified email token — for `AUTHENTICATED`/`INVITEE` commands. */
export function callableAuthed(
  uid: string,
  email: string,
  data: unknown,
): { auth: { uid: string; token: { email: string; email_verified: boolean } }; data: unknown } {
  return { auth: { uid, token: { email, email_verified: true } }, data };
}

export const OPERATION_ID_A = '11111111-2222-4333-8444-555555555555';
export const OPERATION_ID_B = '66666666-7777-4888-8999-aaaaaaaaaaaa';

/** B2-internal seed helpers, layered onto the B1 fixtures above. */

export async function seedSettings(
  db: Firestore,
  orgId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await db.doc(paths.settings(orgId)).set({
    defaultWarehouseId: 'warehouse-main',
    currency: 'USD',
    timezone: 'Asia/Colombo',
    lowStockNotificationsEnabled: true,
    purchaseOrderPrefix: 'PO',
    quantityPrecision: 3,
    networkEnabled: true,
    storefrontEnabled: false,
    updatedAt: Timestamp.now(),
    updatedBy: 'seed',
    ...overrides,
  });
}

export async function seedCategory(
  db: Firestore,
  orgId: string,
  categoryId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await db.doc(paths.category(orgId, categoryId)).set({
    categoryId,
    name: overrides.name ?? categoryId,
    status: 'ACTIVE',
    createdAt: Timestamp.now(),
    createdBy: 'seed',
    updatedAt: Timestamp.now(),
    updatedBy: 'seed',
    ...overrides,
  });
}

export async function seedWarehouse(
  db: Firestore,
  orgId: string,
  warehouseId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await db.doc(paths.warehouse(orgId, warehouseId)).set({
    warehouseId,
    name: overrides.name ?? warehouseId,
    type: 'STORE_ROOM',
    status: 'ACTIVE',
    createdAt: Timestamp.now(),
    createdBy: 'seed',
    updatedAt: Timestamp.now(),
    updatedBy: 'seed',
    ...overrides,
  });
}

export async function seedProduct(
  db: Firestore,
  orgId: string,
  productId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  const internalSku = (overrides.internalSku as string | undefined) ?? productId.toUpperCase();
  await db.doc(paths.product(orgId, productId)).set({
    productId,
    internalSku,
    internalSkuNormalized: internalSku,
    name: overrides.name ?? productId,
    categoryId: overrides.categoryId ?? 'category-1',
    baseUnit: 'EACH',
    purchaseCostMinor: 1000,
    currency: 'USD',
    minimumStockMilli: 5000,
    reorderTargetMilli: 10_000,
    status: 'ACTIVE',
    partnerPublished: false,
    storefrontPublished: false,
    createdAt: Timestamp.now(),
    createdBy: 'seed',
    updatedAt: Timestamp.now(),
    updatedBy: 'seed',
    ...overrides,
  });
  const normalized = (overrides.internalSkuNormalized as string | undefined) ?? internalSku;
  await db.doc(paths.productSkuIndex(orgId, normalized)).set({
    productId,
    createdAt: Timestamp.now(),
  });
}

export async function seedProductStockSummary(
  db: Firestore,
  orgId: string,
  productId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await db.doc(paths.productStockSummary(orgId, productId)).set({
    productId,
    productName: overrides.productName ?? productId,
    internalSku: overrides.internalSku ?? productId.toUpperCase(),
    internalSkuNormalized: overrides.internalSkuNormalized ?? productId.toUpperCase(),
    categoryId: overrides.categoryId ?? 'category-1',
    productStatus: 'ACTIVE',
    baseUnitPriceMinor: 1000,
    productUpdatedAt: Timestamp.now(),
    onHandMilli: 0,
    reservedMilli: 0,
    availableMilli: 0,
    minimumStockMilli: 5000,
    stockStatus: 'OUT_OF_STOCK',
    stockValueMinor: 0,
    shortfallMilli: 5000,
    unit: 'EACH',
    updatedAt: Timestamp.now(),
    ...overrides,
  });
}

export async function seedStockBalance(
  db: Firestore,
  orgId: string,
  productId: string,
  warehouseId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await db.doc(paths.stockBalance(orgId, productId, warehouseId)).set({
    productId,
    warehouseId,
    onHandMilli: 0,
    unit: 'EACH',
    productName: overrides.productName ?? productId,
    internalSku: overrides.internalSku ?? productId.toUpperCase(),
    internalSkuNormalized: overrides.internalSkuNormalized ?? productId.toUpperCase(),
    categoryId: overrides.categoryId ?? 'category-1',
    productStatus: 'ACTIVE',
    baseUnitPriceMinor: 1000,
    minimumStockMilli: 5000,
    productUpdatedAt: Timestamp.now(),
    stockValueMinor: 0,
    stockStatus: 'OUT_OF_STOCK',
    shortfallMilli: 5000,
    updatedAt: Timestamp.now(),
    ...overrides,
  });
}

export async function seedPrivatePartner(
  db: Firestore,
  orgId: string,
  partnerId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await db.doc(paths.privatePartner(orgId, partnerId)).set({
    partnerId,
    partnerTypes: ['SUPPLIER'],
    name: overrides.name ?? partnerId,
    status: 'ACTIVE',
    ordersPlacedCount: 0,
    createdAt: Timestamp.now(),
    createdBy: 'seed',
    updatedAt: Timestamp.now(),
    updatedBy: 'seed',
    ...overrides,
  });
}

export async function seedPurchaseOrder(
  db: Firestore,
  orgId: string,
  purchaseOrderId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await db.doc(paths.purchaseOrder(orgId, purchaseOrderId)).set({
    purchaseOrderId,
    viewRole: 'BUYER',
    supplierKind: 'PRIVATE',
    counterpartyName: 'Test Supplier',
    status: 'ORDERED',
    currency: 'USD',
    totalMinor: 1000,
    isProjection: false,
    createdBy: 'seed',
    createdAt: Timestamp.now(),
    ...overrides,
  });
}

export async function seedUser(
  db: Firestore,
  uid: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await db.doc(paths.user(uid)).set({
    uid,
    displayName: overrides.displayName ?? uid,
    email: overrides.email ?? `${uid}@stockmok.test`,
    status: 'ACTIVE',
    createdAt: Timestamp.now(),
    ...overrides,
  });
}

export async function seedInvitation(
  db: Firestore,
  orgId: string,
  invitationId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await db.doc(paths.invitation(orgId, invitationId)).set({
    invitationId,
    organizationId: orgId,
    emailNormalized: overrides.emailNormalized ?? 'invitee@stockmok.test',
    role: overrides.role ?? 'VIEWER',
    tokenHash: overrides.tokenHash ?? 'a'.repeat(64),
    status: 'PENDING',
    expiresAt: overrides.expiresAt ?? Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdBy: overrides.createdBy ?? uidFor(orgId, 'ADMIN'),
    createdAt: Timestamp.now(),
    ...overrides,
  });
}

/** B3-internal seed helpers. */

export async function seedPurchaseOrderItem(
  db: Firestore,
  orgId: string,
  purchaseOrderId: string,
  itemId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await db.doc(paths.purchaseOrderItem(orgId, purchaseOrderId, itemId)).set({
    itemId,
    buyerProductId: overrides.buyerProductId ?? 'product-rice',
    buyerProductNameSnapshot: overrides.buyerProductNameSnapshot ?? 'product-rice',
    buyerSkuSnapshot: overrides.buyerSkuSnapshot ?? 'PRODUCT-RICE',
    buyerBaseUnitSnapshot: 'EACH',
    orderedBuyerBaseMilli: 10_000,
    receivedBuyerBaseMilli: 0,
    unitPriceMinor: 1000,
    lineTotalMinor: 10_000,
    currency: 'USD',
    ...overrides,
  });
}

export async function seedCounter(
  db: Firestore,
  orgId: string,
  counterId: string,
  value: number,
): Promise<void> {
  await db.doc(paths.counter(orgId, counterId)).set({ value, updatedAt: Timestamp.now() });
}

/** Every document under one collection of an organization, for write-set assertions. */
export async function collectionOf(
  db: Firestore,
  orgId: string,
  collection: string,
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const snapshot = await db.collection(`${paths.organization(orgId)}/${collection}`).get();
  return snapshot.docs;
}
