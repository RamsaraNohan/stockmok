import type { PoStatus, PurchaseOrder, PurchaseOrderItem, Role } from '@stockmok/shared';

import {
  executeConnectedCancel,
  executeConnectedDraftHeaderSave,
  executeConnectedReceive,
  executeConnectedResponse,
  executeConnectedShip,
  executeConnectedSubmit,
} from '@/data/adapters/connectedOrderAdapter';

const RECEIVING_ROLES: readonly Role[] = [
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
  'PROCUREMENT_MANAGER',
  'STOREKEEPER',
];

export function isConnectedOrder(order: PurchaseOrder): boolean {
  return order.supplierKind === 'CONNECTED';
}

export function connectedOrderSide(order: PurchaseOrder): 'BUYER' | 'SUPPLIER' {
  return order.viewRole;
}

export interface ConnectedLineQuantities {
  readonly orderedSupplierMilli: number;
  readonly receivedSupplierMilli: number;
  readonly outstandingSupplierMilli: number;
  readonly orderedBuyerBaseMilli: number;
  readonly receivedBuyerBaseMilli: number;
  readonly outstandingBuyerBaseMilli: number;
  readonly supplierUnit: string;
  readonly buyerUnit: string;
  readonly factorMilli: number;
}

export function connectedLineQuantities(item: PurchaseOrderItem): ConnectedLineQuantities | null {
  if (
    item.orderedSupplierMilli === undefined ||
    item.receivedSupplierMilli === undefined ||
    item.supplierOrderUnitSnapshot === undefined ||
    item.supplierToBuyerBaseFactorMilliSnapshot === undefined
  ) {
    return null;
  }

  return {
    orderedSupplierMilli: item.orderedSupplierMilli,
    receivedSupplierMilli: item.receivedSupplierMilli,
    outstandingSupplierMilli: Math.max(0, item.orderedSupplierMilli - item.receivedSupplierMilli),
    orderedBuyerBaseMilli: item.orderedBuyerBaseMilli,
    receivedBuyerBaseMilli: item.receivedBuyerBaseMilli,
    outstandingBuyerBaseMilli: Math.max(
      0,
      item.orderedBuyerBaseMilli - item.receivedBuyerBaseMilli,
    ),
    supplierUnit: item.supplierOrderUnitSnapshot,
    buyerUnit: item.buyerBaseUnitSnapshot,
    factorMilli: item.supplierToBuyerBaseFactorMilliSnapshot,
  };
}

export interface ConnectedActionAvailability {
  readonly buyerSubmit: boolean;
  readonly buyerCancel: boolean;
  readonly supplierRespond: boolean;
  readonly supplierShip: boolean;
  readonly receive: boolean;
}

export function connectedActionAvailability(
  side: 'BUYER' | 'SUPPLIER',
  status: PoStatus,
  role: Role | null,
): ConnectedActionAvailability {
  const poWriter = role === 'OWNER' || role === 'ADMIN' || role === 'PROCUREMENT_MANAGER';
  return {
    buyerSubmit: side === 'BUYER' && status === 'DRAFT' && poWriter,
    buyerCancel: side === 'BUYER' && (status === 'DRAFT' || status === 'SUBMITTED') && poWriter,
    supplierRespond: side === 'SUPPLIER' && status === 'SUBMITTED' && poWriter,
    supplierShip: side === 'SUPPLIER' && status === 'ACCEPTED' && poWriter,
    receive:
      side === 'BUYER' &&
      (status === 'SHIPPED' || status === 'PARTIALLY_RECEIVED') &&
      role !== null &&
      RECEIVING_ROLES.includes(role),
  };
}

export async function saveConnectedDraftHeader(
  orgId: string,
  purchaseOrderId: string,
  connectionId: string,
): Promise<void> {
  return executeConnectedDraftHeaderSave(orgId, purchaseOrderId, connectionId);
}

export async function submitConnectedOrder(
  orgId: string,
  purchaseOrderId: string,
  operationId: string,
): Promise<void> {
  return executeConnectedSubmit(orgId, purchaseOrderId, operationId);
}

export async function respondToConnectedOrder(
  orgId: string,
  purchaseOrderId: string,
  response: 'ACCEPT' | 'REJECT',
  operationId: string,
): Promise<void> {
  return executeConnectedResponse(orgId, purchaseOrderId, response, operationId);
}

export async function shipConnectedOrder(
  orgId: string,
  purchaseOrderId: string,
  operationId: string,
): Promise<void> {
  return executeConnectedShip(orgId, purchaseOrderId, operationId);
}

export async function receiveConnectedOrder(
  orgId: string,
  purchaseOrderId: string,
  warehouseId: string,
  lines: ReadonlyArray<{ readonly itemId: string; readonly quantityMilli: number }>,
  operationId: string,
): Promise<void> {
  return executeConnectedReceive(orgId, purchaseOrderId, warehouseId, lines, operationId);
}

export async function cancelConnectedOrder(orgId: string, purchaseOrderId: string): Promise<void> {
  return executeConnectedCancel(orgId, purchaseOrderId);
}
