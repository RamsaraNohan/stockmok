function segment(value: string, label: string): string {
  if (value.length === 0 || value.includes('/')) {
    throw new Error(`${label} must be one non-empty Firestore path segment`);
  }
  return value;
}

export const serverPaths = {
  handleReservation: (handle: string) => `handleReservations/${segment(handle, 'handle')}`,
  canonicalConnection: (buyerOrgId: string, supplierOrgId: string) =>
    `connections/${segment(buyerOrgId, 'buyerOrgId')}__${segment(supplierOrgId, 'supplierOrgId')}`,
  connectedPurchaseOrder: (poId: string) =>
    `connectedPurchaseOrders/${segment(poId, 'purchaseOrderId')}`,
  connectedPurchaseOrderItem: (poId: string, itemId: string) =>
    `connectedPurchaseOrders/${segment(poId, 'purchaseOrderId')}/items/${segment(itemId, 'itemId')}`,
  connectedPurchaseOrderHistory: (poId: string, historyId: string) =>
    `connectedPurchaseOrders/${segment(poId, 'purchaseOrderId')}/history/${segment(historyId, 'historyId')}`,
} as const;
