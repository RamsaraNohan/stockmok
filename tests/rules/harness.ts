import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, type Firestore } from 'firebase/firestore';
import { RoleSchema, type Role } from '../../packages/shared/src/primitives.js';
import { paths } from '../../packages/shared/src/paths.js';
import { serverPaths } from '../../packages/shared/src/server/paths.js';

/**
 * The `firestore.rules` test harness — DB-05 §9.
 *
 * Fixtures: two organizations, one ACTIVE connection between them, seven users
 * covering every role in **each** organization, one suspended member, one
 * removed member, one authenticated non-member and one unauthenticated context.
 *
 * A connected counterparty is the more interesting attacker than an unrelated
 * organization, which is why `ORG_B`'s members are seeded as a real connected
 * party rather than as strangers (`T-SEC-10`, `T-SEC-38`).
 */

export const PROJECT_ID = 'stockmok';

export const ORG_A = 'org-grand-ocean';
export const ORG_B = 'org-fresh-foods';
export const HANDLE_A = 'grand-ocean';
export const HANDLE_B = 'freshfoods';

export const ROLES: readonly Role[] = RoleSchema.options;

export const NON_MEMBER_UID = 'authenticated-non-member';

export function uidFor(orgId: string, role: Role): string {
  return `${orgId}--${role.toLowerCase()}`;
}

export function suspendedUid(orgId: string): string {
  return `${orgId}--suspended`;
}

export function removedUid(orgId: string): string {
  return `${orgId}--removed`;
}

export const CONNECTION_ID = `${ORG_A}__${ORG_B}`;

export const IDS = {
  category: 'cat-1',
  warehouse: 'wh-1',
  product: 'prod-1',
  balance: 'prod-1__wh-1',
  movement: 'mv-1',
  partner: 'pp-1',
  privateDraftPo: 'po-draft',
  privateOrderedPo: 'po-ordered',
  connectedPo: 'cpo-1',
  poItem: 'item-1',
  poHistory: 'hist-1',
  catalogItem: 'pc-1',
  mapping: 'pm-1',
  invitation: 'inv-1',
  audit: 'audit-1',
  counter: 'purchaseOrder',
  receipt: 'op-0000',
  skuIndex: 'SKU-1',
  notification: 'note-1',
} as const;

let environment: RulesTestEnvironment | undefined;

export async function getTestEnvironment(): Promise<RulesTestEnvironment> {
  environment ??= await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
  return environment;
}

export async function closeTestEnvironment(): Promise<void> {
  await environment?.cleanup();
  environment = undefined;
}

/** An authenticated context whose token carries the uid and an email. */
export function asUser(env: RulesTestEnvironment, uid: string): RulesTestContext {
  return env.authenticatedContext(uid, { email: `${uid}@stockmok.test` });
}

export function asUnauthenticated(env: RulesTestEnvironment): RulesTestContext {
  return env.unauthenticatedContext();
}

export function member(orgId: string, role: Role, env: RulesTestEnvironment): Firestore {
  return asUser(env, uidFor(orgId, role)).firestore() as unknown as Firestore;
}

const NOW = new Date('2026-08-01T00:00:00.000Z');

async function seedOrganization(db: Firestore, orgId: string, handle: string): Promise<void> {
  const write = async (path: string, data: Record<string, unknown>): Promise<void> => {
    await setDoc(doc(db, path), data);
  };

  await write(paths.organizationDirectory(handle), {
    organizationId: orgId,
    handle,
    name: orgId,
    logoUrl: null,
    monogram: 'GO',
    monogramColor: 'blue',
    industry: 'Hospitality',
    country: 'LK',
    directoryStatus: 'LISTED',
    createdAt: NOW,
  });

  await write(paths.organization(orgId), {
    organizationId: orgId,
    name: orgId,
    handle,
    industry: 'Hospitality',
    country: 'LK',
    logoUrl: null,
    monogram: 'GO',
    monogramColor: 'blue',
    status: 'ACTIVE',
    ownerUid: uidFor(orgId, 'OWNER'),
    createdAt: NOW,
    createdBy: uidFor(orgId, 'OWNER'),
    schemaVersion: 1,
  });

  await write(paths.settings(orgId), {
    defaultWarehouseId: IDS.warehouse,
    currency: 'LKR',
    timezone: 'Asia/Colombo',
    lowStockNotificationsEnabled: true,
    purchaseOrderPrefix: 'PO',
    quantityPrecision: 3,
    networkEnabled: true,
    storefrontEnabled: false,
    updatedAt: NOW,
    updatedBy: uidFor(orgId, 'OWNER'),
  });

  const seedMember = async (uid: string, role: Role, status: string): Promise<void> => {
    await write(paths.member(orgId, uid), {
      uid,
      role,
      status,
      displayName: `${role} of ${orgId}`,
      email: `${uid}@stockmok.test`,
      joinedAt: NOW,
      updatedAt: NOW,
    });
    await write(paths.user(uid), {
      uid,
      displayName: `${role} of ${orgId}`,
      email: `${uid}@stockmok.test`,
      status: 'ACTIVE',
      createdAt: NOW,
    });
    await write(paths.membership(uid, orgId), {
      organizationId: orgId,
      handle,
      organizationName: orgId,
      monogram: 'GO',
      monogramColor: 'blue',
      role,
      status,
      joinedAt: NOW,
      updatedAt: NOW,
    });
    await write(paths.notification(uid, IDS.notification), {
      organizationId: orgId,
      organizationName: orgId,
      type: 'MEMBERSHIP_CHANGED',
      category: 'NETWORK',
      title: 'Your access changed',
      message: 'Your role in this workspace changed.',
      referenceType: 'MEMBERSHIP',
      referenceId: uid,
      read: false,
      createdAt: NOW,
    });
  };

  for (const role of ROLES) await seedMember(uidFor(orgId, role), role, 'ACTIVE');
  await seedMember(suspendedUid(orgId), 'INVENTORY_MANAGER', 'SUSPENDED');
  await seedMember(removedUid(orgId), 'STOREKEEPER', 'REMOVED');

  await write(paths.counter(orgId, IDS.counter), { value: 0, updatedAt: NOW });
  await write(paths.commandReceipt(orgId, IDS.receipt), {
    operationId: IDS.receipt,
    commandType: 'stock.transfer',
    actorUid: uidFor(orgId, 'OWNER'),
    payloadHash: 'a'.repeat(64),
    resultStatus: 'OK',
    result: {},
    createdAt: NOW,
  });
  await write(paths.productSkuIndex(orgId, IDS.skuIndex), {
    productId: IDS.product,
    createdAt: NOW,
  });
  await write(paths.invitation(orgId, IDS.invitation), {
    invitationId: IDS.invitation,
    organizationId: orgId,
    emailNormalized: 'invitee@stockmok.test',
    role: 'VIEWER',
    tokenHash: 'b'.repeat(64),
    status: 'PENDING',
    expiresAt: NOW,
    createdBy: uidFor(orgId, 'OWNER'),
    createdAt: NOW,
  });
  await write(paths.category(orgId, IDS.category), {
    categoryId: IDS.category,
    name: 'Meat',
    status: 'ACTIVE',
    createdAt: NOW,
    createdBy: uidFor(orgId, 'OWNER'),
    updatedAt: NOW,
    updatedBy: uidFor(orgId, 'OWNER'),
  });
  await write(paths.warehouse(orgId, IDS.warehouse), {
    warehouseId: IDS.warehouse,
    name: 'Main Store',
    type: 'STORE_ROOM',
    status: 'ACTIVE',
    createdAt: NOW,
    createdBy: uidFor(orgId, 'OWNER'),
    updatedAt: NOW,
    updatedBy: uidFor(orgId, 'OWNER'),
  });
  await write(paths.product(orgId, IDS.product), {
    productId: IDS.product,
    internalSku: 'SKU-1',
    internalSkuNormalized: 'SKU-1',
    name: 'Chicken Breast',
    categoryId: IDS.category,
    baseUnit: 'KG',
    purchaseCostMinor: 125_000,
    currency: 'LKR',
    minimumStockMilli: 20_000,
    reorderTargetMilli: 40_000,
    status: 'ACTIVE',
    partnerPublished: false,
    storefrontPublished: false,
    createdAt: NOW,
    createdBy: uidFor(orgId, 'OWNER'),
    updatedAt: NOW,
    updatedBy: uidFor(orgId, 'OWNER'),
  });
  await write(paths.stockBalance(orgId, IDS.product, IDS.warehouse), {
    productId: IDS.product,
    warehouseId: IDS.warehouse,
    onHandMilli: 18_000,
    unit: 'KG',
    productName: 'Chicken Breast',
    internalSku: 'SKU-1',
    internalSkuNormalized: 'SKU-1',
    categoryId: IDS.category,
    productStatus: 'ACTIVE',
    baseUnitPriceMinor: 125_000,
    minimumStockMilli: 20_000,
    productUpdatedAt: NOW,
    stockValueMinor: 2_250_000,
    stockStatus: 'LOW_STOCK',
    shortfallMilli: 2_000,
    updatedAt: NOW,
  });
  await write(paths.productStockSummary(orgId, IDS.product), {
    productId: IDS.product,
    productName: 'Chicken Breast',
    internalSku: 'SKU-1',
    internalSkuNormalized: 'SKU-1',
    categoryId: IDS.category,
    productStatus: 'ACTIVE',
    baseUnitPriceMinor: 125_000,
    productUpdatedAt: NOW,
    onHandMilli: 18_000,
    reservedMilli: 0,
    availableMilli: 18_000,
    minimumStockMilli: 20_000,
    stockStatus: 'LOW_STOCK',
    stockValueMinor: 2_250_000,
    shortfallMilli: 2_000,
    unit: 'KG',
    updatedAt: NOW,
  });
  await write(paths.stockMovement(orgId, IDS.movement), {
    movementId: IDS.movement,
    productId: IDS.product,
    warehouseId: IDS.warehouse,
    productNameSnapshot: 'Chicken Breast',
    skuSnapshot: 'SKU-1',
    movementType: 'OPENING_BALANCE',
    signedQuantityMilli: 18_000,
    unit: 'KG',
    balanceAfterMilli: 18_000,
    sourceType: 'MANUAL',
    operationId: IDS.receipt,
    actorUid: uidFor(orgId, 'OWNER'),
    actorName: 'Owner',
    warehouseNameSnapshot: 'Main Store',
    effectiveAt: NOW,
    createdAt: NOW,
  });
  await write(paths.privatePartner(orgId, IDS.partner), {
    partnerId: IDS.partner,
    partnerTypes: ['SUPPLIER'],
    name: 'Green Farm Poultry',
    status: 'ACTIVE',
    ordersPlacedCount: 1,
    createdAt: NOW,
    createdBy: uidFor(orgId, 'OWNER'),
    updatedAt: NOW,
    updatedBy: uidFor(orgId, 'OWNER'),
  });

  const purchaseOrder = (id: string, status: string, supplierKind: string) => ({
    purchaseOrderId: id,
    viewRole: 'BUYER',
    supplierKind,
    counterpartyName: 'Green Farm Poultry',
    privateSupplierId: IDS.partner,
    status,
    currency: 'LKR',
    totalMinor: 1_250_000,
    isProjection: supplierKind === 'CONNECTED',
    createdBy: uidFor(orgId, 'OWNER'),
    createdAt: NOW,
    updatedAt: NOW,
  });

  await write(paths.purchaseOrder(orgId, IDS.privateDraftPo), {
    ...purchaseOrder(IDS.privateDraftPo, 'DRAFT', 'PRIVATE'),
  });
  await write(paths.purchaseOrder(orgId, IDS.privateOrderedPo), {
    ...purchaseOrder(IDS.privateOrderedPo, 'ORDERED', 'PRIVATE'),
  });
  await write(paths.purchaseOrder(orgId, IDS.connectedPo), {
    ...purchaseOrder(IDS.connectedPo, 'DRAFT', 'CONNECTED'),
  });
  await write(paths.purchaseOrderItem(orgId, IDS.privateDraftPo, IDS.poItem), {
    itemId: IDS.poItem,
    buyerProductId: IDS.product,
    buyerProductNameSnapshot: 'Chicken Breast',
    buyerSkuSnapshot: 'SKU-1',
    buyerBaseUnitSnapshot: 'KG',
    orderedBuyerBaseMilli: 10_000,
    receivedBuyerBaseMilli: 0,
    unitPriceMinor: 125_000,
    lineTotalMinor: 1_250_000,
    currency: 'LKR',
  });
  await write(paths.purchaseOrderHistory(orgId, IDS.privateDraftPo, IDS.poHistory), {
    historyId: IDS.poHistory,
    fromStatus: null,
    toStatus: 'DRAFT',
    actorUid: uidFor(orgId, 'OWNER'),
    actorName: 'Owner',
    actorOrgId: orgId,
    actorOrgName: orgId,
    operationId: IDS.receipt,
    createdAt: NOW,
  });
  await write(paths.partnerCatalogItem(orgId, IDS.catalogItem), {
    catalogItemId: IDS.catalogItem,
    sourceProductId: IDS.product,
    internalProductNameSnapshot: 'Chicken Breast',
    internalSkuSnapshot: 'SKU-1',
    partnerSku: 'CKN-B5',
    partnerSkuNormalized: 'CKN-B5',
    displayName: 'Chicken Breast 5 KG',
    orderUnit: 'KG',
    availabilityState: 'IN_STOCK',
    published: true,
    updatedAt: NOW,
  });
  await write(paths.productMapping(orgId, IDS.mapping), {
    mappingId: IDS.mapping,
    connectionId: CONNECTION_ID,
    buyerOrgId: ORG_A,
    buyerProductId: IDS.product,
    supplierOrgId: ORG_B,
    supplierCatalogItemId: IDS.catalogItem,
    status: 'VERIFIED',
    createdAt: NOW,
  });
  await write(paths.connectionProjection(orgId, CONNECTION_ID), {
    connectionId: CONNECTION_ID,
    buyerOrgId: ORG_A,
    supplierOrgId: ORG_B,
    buyerHandle: HANDLE_A,
    buyerName: ORG_A,
    supplierHandle: HANDLE_B,
    supplierName: ORG_B,
    status: 'ACTIVE',
    requestedByUid: uidFor(ORG_A, 'PROCUREMENT_MANAGER'),
    requestedAt: NOW,
    updatedAt: NOW,
    ordersPlacedCount: 1,
  });
  await write(paths.auditLog(orgId, IDS.audit), {
    auditId: IDS.audit,
    actorUid: uidFor(orgId, 'OWNER'),
    actorName: 'Owner',
    actorRole: 'OWNER',
    organizationId: orgId,
    action: 'org.create',
    entityType: 'ORGANIZATION',
    entityId: orgId,
    summary: 'Created the workspace.',
    metadata: {},
    createdAt: NOW,
  });
}

export async function seedFixtures(env: RulesTestEnvironment): Promise<void> {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    await seedOrganization(db, ORG_A, HANDLE_A);
    await seedOrganization(db, ORG_B, HANDLE_B);

    await setDoc(doc(db, paths.user(NON_MEMBER_UID)), {
      uid: NON_MEMBER_UID,
      displayName: 'Authenticated Non Member',
      email: `${NON_MEMBER_UID}@stockmok.test`,
      status: 'ACTIVE',
      createdAt: NOW,
    });

    // Zone 4 — canonical, closed to every client.
    await setDoc(doc(db, serverPaths.handleReservation(HANDLE_A)), {
      organizationId: ORG_A,
      createdAt: NOW,
    });
    await setDoc(doc(db, serverPaths.canonicalConnection(ORG_A, ORG_B)), {
      connectionId: CONNECTION_ID,
      buyerOrgId: ORG_A,
      supplierOrgId: ORG_B,
      status: 'ACTIVE',
      createdAt: NOW,
    });
    await setDoc(doc(db, serverPaths.connectedPurchaseOrder(IDS.connectedPo)), {
      purchaseOrderId: IDS.connectedPo,
      buyerOrgId: ORG_A,
      supplierOrgId: ORG_B,
      status: 'DRAFT',
    });
    await setDoc(doc(db, serverPaths.connectedPurchaseOrderItem(IDS.connectedPo, IDS.poItem)), {
      itemId: IDS.poItem,
    });
    await setDoc(
      doc(db, serverPaths.connectedPurchaseOrderHistory(IDS.connectedPo, IDS.poHistory)),
      { historyId: IDS.poHistory },
    );
  });
}
