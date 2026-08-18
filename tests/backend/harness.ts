import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { paths } from '../../packages/shared/src/paths.js';
import { serverPaths } from '../../packages/shared/src/server/paths.js';
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

/** B4-internal seed helpers — connected business, partner catalog, mappings, connected orders. */

export async function seedOrganizationDirectory(
  db: Firestore,
  orgId: string,
  handle: string,
  name: string,
): Promise<void> {
  await db.doc(paths.organizationDirectory(handle)).set({
    organizationId: orgId,
    handle,
    name,
    logoUrl: null,
    monogram: 'ST',
    monogramColor: 'blue',
    industry: 'Hospitality',
    country: 'LK',
    directoryStatus: 'LISTED',
    createdAt: Timestamp.now(),
  });
}

export function connectionIdFor(buyerOrgId: string, supplierOrgId: string): string {
  return `${buyerOrgId}__${supplierOrgId}`;
}

/**
 * Writes the canonical connection **and both projections** together, because a
 * fixture that seeded only one would make `INV-19` false before a single command
 * ran — the same reason B3's fixtures seed a real `OPENING_BALANCE` movement
 * behind every seeded balance.
 */
export async function seedConnection(
  db: Firestore,
  buyerOrgId: string,
  supplierOrgId: string,
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'DISABLED' = 'ACTIVE',
  overrides: Partial<Record<string, unknown>> = {},
): Promise<string> {
  const connectionId = connectionIdFor(buyerOrgId, supplierOrgId);
  const record = {
    connectionId,
    buyerOrgId,
    supplierOrgId,
    buyerHandle: buyerOrgId,
    buyerName: buyerOrgId,
    supplierHandle: supplierOrgId,
    supplierName: supplierOrgId,
    status,
    requestedByUid: uidFor(buyerOrgId, 'PROCUREMENT_MANAGER'),
    requestedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
  await db.doc(serverPaths.canonicalConnection(buyerOrgId, supplierOrgId)).set(record);
  for (const orgId of [buyerOrgId, supplierOrgId]) {
    await db
      .doc(paths.connectionProjection(orgId, connectionId))
      .set({ ...record, ordersPlacedCount: 0 });
  }
  return connectionId;
}

export async function seedPartnerCatalogItem(
  db: Firestore,
  supplierOrgId: string,
  catalogItemId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  const partnerSku = (overrides.partnerSku as string | undefined) ?? 'CKN-B5';
  await db.doc(paths.partnerCatalogItem(supplierOrgId, catalogItemId)).set({
    catalogItemId,
    sourceProductId: overrides.sourceProductId ?? 'product-chicken-pack',
    internalProductNameSnapshot: 'Chicken Breast 5 KG Pack',
    internalSkuSnapshot: 'FF-CHK-05',
    partnerSku,
    partnerSkuNormalized: partnerSku.toUpperCase(),
    displayName: 'Chicken Breast 5 KG Pack',
    orderUnit: 'PACK',
    packDescription: '5 KG',
    availabilityState: 'IN_STOCK',
    published: true,
    updatedAt: Timestamp.now(),
    ...overrides,
  });
}

export async function seedProductMapping(
  db: Firestore,
  buyerOrgId: string,
  mappingId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await db.doc(paths.productMapping(buyerOrgId, mappingId)).set({
    mappingId,
    connectionId: overrides.connectionId ?? connectionIdFor(buyerOrgId, ORG_B),
    buyerOrgId,
    buyerProductId: overrides.buyerProductId ?? 'product-chicken',
    buyerProductNameSnapshot: 'Chicken Breast',
    buyerSkuSnapshot: 'MEAT-001',
    supplierOrgId: overrides.supplierOrgId ?? ORG_B,
    supplierCatalogItemId: overrides.supplierCatalogItemId ?? 'catalog-chicken',
    supplierPartnerSkuSnapshot: 'CKN-B5',
    supplierDisplayNameSnapshot: 'Chicken Breast 5 KG Pack',
    buyerBaseUnit: 'KG',
    supplierOrderUnit: 'PACK',
    supplierToBuyerBaseFactorMilli: 5000,
    semanticConfirmedByUid: uidFor(buyerOrgId, 'PROCUREMENT_MANAGER'),
    semanticConfirmedByName: 'PROCUREMENT_MANAGER',
    semanticConfirmedAt: Timestamp.now(),
    status: 'VERIFIED',
    createdAt: Timestamp.now(),
    ...overrides,
  });
}

/**
 * A buyer-side connected DRAFT and its lines. `cpo.draftSave` upserts the header
 * and normalises the lines; the lines themselves are seeded the same way a
 * private draft's are, since neither has a command that creates an individual
 * line.
 */
export async function seedConnectedDraft(
  db: Firestore,
  buyerOrgId: string,
  purchaseOrderId: string,
  connectionId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await db.doc(paths.purchaseOrder(buyerOrgId, purchaseOrderId)).set({
    purchaseOrderId,
    viewRole: 'BUYER',
    supplierKind: 'CONNECTED',
    counterpartyName: ORG_B,
    counterpartyOrgId: ORG_B,
    counterpartyHandle: ORG_B,
    connectionId,
    status: 'DRAFT',
    currency: 'LKR',
    totalMinor: 0,
    isProjection: false,
    createdBy: uidFor(buyerOrgId, 'PROCUREMENT_MANAGER'),
    createdAt: Timestamp.now(),
    ...overrides,
  });
}

export async function seedConnectedDraftItem(
  db: Firestore,
  buyerOrgId: string,
  purchaseOrderId: string,
  itemId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<void> {
  await db.doc(paths.purchaseOrderItem(buyerOrgId, purchaseOrderId, itemId)).set({
    itemId,
    buyerProductId: overrides.buyerProductId ?? 'product-chicken',
    buyerProductNameSnapshot: 'Chicken Breast',
    buyerSkuSnapshot: 'MEAT-001',
    buyerBaseUnitSnapshot: 'KG',
    orderedBuyerBaseMilli: 0,
    receivedBuyerBaseMilli: 0,
    unitPriceMinor: 600_000,
    lineTotalMinor: 0,
    currency: 'LKR',
    mappingId: overrides.mappingId ?? 'mapping-chicken',
    supplierCatalogItemId: overrides.supplierCatalogItemId ?? 'catalog-chicken',
    orderedSupplierMilli: 10_000,
    receivedSupplierMilli: 0,
    ...overrides,
  });
}

/** Every document under one canonical zone-4 subcollection, for write-set assertions. */
export async function canonicalSubcollection(
  db: Firestore,
  purchaseOrderId: string,
  name: 'items' | 'history',
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const snapshot = await db
    .collection(`${serverPaths.connectedPurchaseOrder(purchaseOrderId)}/${name}`)
    .get();
  return snapshot.docs;
}

/** Every notification a user holds, for notification-grain assertions. */
export async function notificationsOf(
  db: Firestore,
  uid: string,
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const snapshot = await db.collection(`${paths.user(uid)}/notifications`).get();
  return snapshot.docs;
}

/**
 * A seeded balance with no ledger entry behind it makes `INV-03` false in the
 * fixture before a single command runs, which is the defect B3 repaired in its
 * own concurrency fixtures. This writes the `OPENING_BALANCE` movement that a
 * real balance would always have.
 */
export async function seedOpeningMovement(
  db: Firestore,
  orgId: string,
  productId: string,
  warehouseId: string,
  quantityMilli: number,
  unit: 'KG' | 'L' | 'EACH' | 'PACK' = 'EACH',
): Promise<void> {
  const movementId = `opening-${productId}-${warehouseId}`;
  await db.doc(paths.stockMovement(orgId, movementId)).set({
    movementId,
    productId,
    warehouseId,
    productNameSnapshot: productId,
    skuSnapshot: productId.toUpperCase(),
    movementType: 'OPENING_BALANCE',
    signedQuantityMilli: quantityMilli,
    unit,
    balanceAfterMilli: quantityMilli,
    sourceType: 'MANUAL',
    operationId: `opening-${productId}`,
    actorUid: 'seed',
    actorName: 'seed',
    warehouseNameSnapshot: warehouseId,
    effectiveAt: Timestamp.now(),
    createdAt: Timestamp.now(),
  });
}
