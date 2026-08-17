function segment(value: string, label: string): string {
  if (value.length === 0 || value.includes('/')) {
    throw new Error(`${label} must be one non-empty Firestore path segment`);
  }
  return value;
}

export const paths = {
  organizationDirectory: (handle: string) => `organizationDirectory/${segment(handle, 'handle')}`,
  user: (uid: string) => `users/${segment(uid, 'uid')}`,
  membership: (uid: string, orgId: string) =>
    `users/${segment(uid, 'uid')}/memberships/${segment(orgId, 'orgId')}`,
  notification: (uid: string, id: string) =>
    `users/${segment(uid, 'uid')}/notifications/${segment(id, 'notificationId')}`,
  organization: (orgId: string) => `organizations/${segment(orgId, 'orgId')}`,
  settings: (orgId: string) => `organizations/${segment(orgId, 'orgId')}/settings/main`,
  counter: (orgId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/counters/${segment(id, 'counterId')}`,
  commandReceipt: (orgId: string, operationId: string) =>
    `organizations/${segment(orgId, 'orgId')}/commandReceipts/${segment(operationId, 'operationId')}`,
  productSkuIndex: (orgId: string, sku: string) =>
    `organizations/${segment(orgId, 'orgId')}/productSkuIndex/${segment(sku, 'sku')}`,
  member: (orgId: string, uid: string) =>
    `organizations/${segment(orgId, 'orgId')}/members/${segment(uid, 'uid')}`,
  invitation: (orgId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/invitations/${segment(id, 'invitationId')}`,
  category: (orgId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/categories/${segment(id, 'categoryId')}`,
  warehouse: (orgId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/warehouses/${segment(id, 'warehouseId')}`,
  product: (orgId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/products/${segment(id, 'productId')}`,
  stockBalance: (orgId: string, productId: string, warehouseId: string) =>
    `organizations/${segment(orgId, 'orgId')}/stockBalances/${segment(productId, 'productId')}__${segment(warehouseId, 'warehouseId')}`,
  productStockSummary: (orgId: string, productId: string) =>
    `organizations/${segment(orgId, 'orgId')}/productStockSummaries/${segment(productId, 'productId')}`,
  stockMovement: (orgId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/stockMovements/${segment(id, 'movementId')}`,
  privatePartner: (orgId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/privatePartners/${segment(id, 'partnerId')}`,
  purchaseOrder: (orgId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/purchaseOrders/${segment(id, 'purchaseOrderId')}`,
  purchaseOrderItem: (orgId: string, poId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/purchaseOrders/${segment(poId, 'purchaseOrderId')}/items/${segment(id, 'itemId')}`,
  purchaseOrderHistory: (orgId: string, poId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/purchaseOrders/${segment(poId, 'purchaseOrderId')}/history/${segment(id, 'historyId')}`,
  partnerCatalogItem: (orgId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/partnerCatalog/${segment(id, 'catalogItemId')}`,
  productMapping: (orgId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/productMappings/${segment(id, 'mappingId')}`,
  connectionProjection: (orgId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/connections/${segment(id, 'connectionId')}`,
  auditLog: (orgId: string, id: string) =>
    `organizations/${segment(orgId, 'orgId')}/auditLogs/${segment(id, 'auditId')}`,
} as const;
