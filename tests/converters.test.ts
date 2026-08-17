import { Timestamp } from 'firebase-admin/firestore';
import type { DocumentData, QueryDocumentSnapshot, SnapshotOptions } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import { converters } from '../packages/shared/src/converters.js';
import {
  aBalance,
  aCatalogItem,
  aConnectedPO,
  aConnection,
  aMapping,
  aMember,
  aMovement,
  anOrganization,
  aPrivatePO,
  aProduct,
  aWarehouse,
} from './factories/index.js';

const TIME = Timestamp.fromMillis(1_700_000_000_000);
const product = aProduct();
const balance = aBalance(product);
const privatePo = aPrivatePO();
const connection = aConnection();
const connectedPo = aConnectedPO();
const poItem = privatePo.lines[0];

if (!poItem) throw new Error('Factory must create one purchase-order line');

const samples = {
  organizationDirectory: {
    organizationId: 'org-1',
    handle: 'example-org',
    name: 'Example Organization',
    logoUrl: null,
    monogram: 'EO',
    monogramColor: 'blue',
    industry: 'Hospitality',
    country: 'LK',
    directoryStatus: 'LISTED',
    createdAt: TIME,
  },
  user: {
    uid: 'user-1',
    displayName: 'Example User',
    email: 'user@example.test',
    status: 'ACTIVE',
    createdAt: TIME,
  },
  userMembership: {
    organizationId: 'org-1',
    handle: 'example-org',
    organizationName: 'Example Organization',
    monogram: 'EO',
    monogramColor: 'blue',
    role: 'OWNER',
    status: 'ACTIVE',
    joinedAt: TIME,
    updatedAt: TIME,
  },
  notification: {
    organizationId: 'org-1',
    organizationName: 'Example Organization',
    type: 'LOW_STOCK',
    category: 'STOCK',
    title: 'Low stock',
    message: 'Product One is low',
    referenceType: 'PRODUCT',
    referenceId: 'product-1',
    read: false,
    createdAt: TIME,
  },
  organization: anOrganization(),
  organizationSettings: {
    defaultWarehouseId: 'warehouse-1',
    currency: 'LKR',
    timezone: 'Asia/Colombo',
    lowStockNotificationsEnabled: true,
    purchaseOrderPrefix: 'PO',
    quantityPrecision: 3,
    networkEnabled: true,
    storefrontEnabled: false,
    updatedAt: TIME,
    updatedBy: 'user-1',
  },
  member: aMember('OWNER', { uid: 'user-1' }),
  invitation: {
    invitationId: 'invite-1',
    organizationId: 'org-1',
    emailNormalized: 'invitee@example.test',
    role: 'VIEWER',
    tokenHash: 'a'.repeat(64),
    status: 'PENDING',
    expiresAt: TIME,
    createdBy: 'user-1',
    createdAt: TIME,
  },
  counter: { value: 1, updatedAt: TIME },
  commandReceipt: {
    operationId: 'operation-1',
    commandType: 'product.create',
    actorUid: 'user-1',
    payloadHash: 'b'.repeat(64),
    resultStatus: 'OK',
    result: { productId: 'product-1' },
    createdAt: TIME,
  },
  productSkuIndex: { productId: 'product-1', createdAt: TIME },
  category: {
    categoryId: 'category-1',
    name: 'Category One',
    status: 'ACTIVE',
    createdAt: TIME,
    createdBy: 'user-1',
    updatedAt: TIME,
    updatedBy: 'user-1',
  },
  warehouse: aWarehouse(),
  product,
  stockBalance: balance,
  productStockSummary: {
    productId: product.productId,
    productName: product.name,
    internalSku: product.internalSku,
    internalSkuNormalized: product.internalSkuNormalized,
    categoryId: product.categoryId,
    productStatus: product.status,
    baseUnitPriceMinor: product.purchaseCostMinor,
    productUpdatedAt: product.updatedAt,
    onHandMilli: balance.onHandMilli,
    reservedMilli: 0,
    availableMilli: balance.onHandMilli,
    minimumStockMilli: product.minimumStockMilli,
    stockStatus: balance.stockStatus,
    stockValueMinor: balance.stockValueMinor,
    shortfallMilli: balance.shortfallMilli,
    unit: product.baseUnit,
    updatedAt: TIME,
  },
  stockMovement: aMovement(),
  privatePartner: {
    partnerId: 'partner-1',
    partnerTypes: ['SUPPLIER'],
    name: 'Private Supplier',
    status: 'ACTIVE',
    ordersPlacedCount: 0,
    createdAt: TIME,
    createdBy: 'user-1',
    updatedAt: TIME,
    updatedBy: 'user-1',
  },
  purchaseOrder: privatePo.order,
  purchaseOrderItem: poItem,
  purchaseOrderHistory: {
    historyId: 'history-1',
    fromStatus: 'DRAFT',
    toStatus: 'ORDERED',
    actorUid: 'user-1',
    actorName: 'Example User',
    actorOrgId: 'org-1',
    actorOrgName: 'Example Organization',
    operationId: 'operation-1',
    createdAt: TIME,
  },
  partnerCatalogItem: aCatalogItem(),
  productMapping: aMapping(),
  connectionProjection: { ...connection, ordersPlacedCount: 0 },
  auditLog: {
    auditId: 'audit-1',
    actorUid: 'user-1',
    actorName: 'Example User',
    actorRole: 'OWNER',
    organizationId: 'org-1',
    action: 'product.create',
    entityType: 'PRODUCT',
    entityId: 'product-1',
    summary: 'Created Product One',
    metadata: { productId: 'product-1' },
    createdAt: TIME,
  },
  handleReservation: { organizationId: 'org-1', createdAt: TIME },
  canonicalConnection: connection,
  connectedPurchaseOrder: connectedPo,
  connectedPurchaseOrderItem: poItem,
  connectedHistory: {
    historyId: 'history-1',
    fromStatus: 'DRAFT',
    toStatus: 'SUBMITTED',
    actorUid: 'user-1',
    actorName: 'Example User',
    actorOrgId: 'org-1',
    actorOrgName: 'Example Organization',
    operationId: 'operation-1',
    createdAt: TIME,
  },
} satisfies Record<keyof typeof converters, unknown>;

interface UntypedConverter {
  toFirestore(value: unknown): DocumentData;
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): unknown;
}

describe('all Release A/B converter boundaries', () => {
  it('round-trips every registered document with Timestamp identity preserved', () => {
    for (const name of Object.keys(converters) as (keyof typeof converters)[]) {
      const converter = converters[name] as unknown as UntypedConverter;
      const value = samples[name];
      const encoded = converter.toFirestore(value);
      const snapshot = { data: () => encoded } as unknown as QueryDocumentSnapshot;
      expect(converter.fromFirestore(snapshot, {}), name).toEqual(value);
    }
  });

  it('rejects unknown fields for every registered document', () => {
    for (const name of Object.keys(converters) as (keyof typeof converters)[]) {
      const converter = converters[name] as unknown as UntypedConverter;
      expect(
        () => converter.toFirestore({ ...(samples[name] as object), unknownField: true }),
        name,
      ).toThrow();
    }
  });
});
