import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from 'firebase/firestore';
import type { z } from 'zod';
import {
  CategorySchema,
  CommandReceiptSchema,
  CounterSchema,
  HandleReservationSchema,
  InvitationSchema,
  MemberSchema,
  NotificationSchema,
  OrganizationDirectorySchema,
  OrganizationSchema,
  OrganizationSettingsSchema,
  ProductSkuIndexSchema,
  UserMembershipSchema,
  UserSchema,
} from './schemas/core.js';
import {
  ProductSchema,
  ProductStockSummarySchema,
  StockBalanceSchema,
  StockMovementSchema,
  WarehouseSchema,
} from './schemas/inventory.js';
import {
  AuditLogSchema,
  CanonicalConnectionSchema,
  ConnectedHistorySchema,
  ConnectedPurchaseOrderItemSchema,
  ConnectedPurchaseOrderSchema,
  ConnectionProjectionSchema,
} from './schemas/network.js';
import {
  PartnerCatalogItemSchema,
  PrivatePartnerSchema,
  ProductMappingSchema,
  PurchaseOrderHistorySchema,
  PurchaseOrderItemSchema,
  PurchaseOrderSchema,
} from './schemas/procurement.js';

export function createConverter<T>(schema: z.ZodType<T>): FirestoreDataConverter<T> {
  return {
    toFirestore(modelObject: WithFieldValue<T>): DocumentData {
      return schema.parse(modelObject) as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      return schema.parse(snapshot.data(options));
    },
  };
}

export const converters = {
  organizationDirectory: createConverter(OrganizationDirectorySchema),
  user: createConverter(UserSchema),
  userMembership: createConverter(UserMembershipSchema),
  notification: createConverter(NotificationSchema),
  organization: createConverter(OrganizationSchema),
  organizationSettings: createConverter(OrganizationSettingsSchema),
  member: createConverter(MemberSchema),
  invitation: createConverter(InvitationSchema),
  counter: createConverter(CounterSchema),
  commandReceipt: createConverter(CommandReceiptSchema),
  productSkuIndex: createConverter(ProductSkuIndexSchema),
  category: createConverter(CategorySchema),
  warehouse: createConverter(WarehouseSchema),
  product: createConverter(ProductSchema),
  stockBalance: createConverter(StockBalanceSchema),
  productStockSummary: createConverter(ProductStockSummarySchema),
  stockMovement: createConverter(StockMovementSchema),
  privatePartner: createConverter(PrivatePartnerSchema),
  purchaseOrder: createConverter(PurchaseOrderSchema),
  purchaseOrderItem: createConverter(PurchaseOrderItemSchema),
  purchaseOrderHistory: createConverter(PurchaseOrderHistorySchema),
  partnerCatalogItem: createConverter(PartnerCatalogItemSchema),
  productMapping: createConverter(ProductMappingSchema),
  connectionProjection: createConverter(ConnectionProjectionSchema),
  auditLog: createConverter(AuditLogSchema),
  handleReservation: createConverter(HandleReservationSchema),
  canonicalConnection: createConverter(CanonicalConnectionSchema),
  connectedPurchaseOrder: createConverter(ConnectedPurchaseOrderSchema),
  connectedPurchaseOrderItem: createConverter(ConnectedPurchaseOrderItemSchema),
  connectedHistory: createConverter(ConnectedHistorySchema),
} as const;
