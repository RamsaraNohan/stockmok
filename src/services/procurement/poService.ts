import {
  executePrivatePoHeaderCreate as adapterHeaderCreate,
  executePrivatePoHeaderUpdate as adapterHeaderUpdate,
  executePrivatePoLineCreate as adapterLineCreate,
  executePrivatePoLineUpdate as adapterLineUpdate,
  executePrivatePoLineRemove as adapterLineRemove,
  executePoOrderCommand as adapterPoOrder,
  executePoCancelCommand as adapterPoCancel,
} from '@/data/adapters/poAdapter';
import type {
  PrivatePoHeaderCreatePayload,
  PrivatePoHeaderUpdatePayload,
  PrivatePoLineCreatePayload,
  PrivatePoLineUpdatePayload,
} from '@/data/adapters/poAdapter';

export type {
  PrivatePoHeaderCreatePayload,
  PrivatePoHeaderUpdatePayload,
  PrivatePoLineCreatePayload,
  PrivatePoLineUpdatePayload,
};

export async function executePrivatePoHeaderCreate(
  orgId: string,
  purchaseOrderId: string,
  payload: PrivatePoHeaderCreatePayload,
  uid: string,
): Promise<void> {
  return adapterHeaderCreate(orgId, purchaseOrderId, payload, uid);
}

export async function executePrivatePoHeaderUpdate(
  orgId: string,
  purchaseOrderId: string,
  payload: PrivatePoHeaderUpdatePayload,
  uid: string,
): Promise<void> {
  return adapterHeaderUpdate(orgId, purchaseOrderId, payload, uid);
}

export async function executePrivatePoLineCreate(
  orgId: string,
  purchaseOrderId: string,
  itemId: string,
  payload: PrivatePoLineCreatePayload,
  uid: string,
): Promise<void> {
  return adapterLineCreate(orgId, purchaseOrderId, itemId, payload, uid);
}

export async function executePrivatePoLineUpdate(
  orgId: string,
  purchaseOrderId: string,
  itemId: string,
  payload: PrivatePoLineUpdatePayload,
  uid: string,
): Promise<void> {
  return adapterLineUpdate(orgId, purchaseOrderId, itemId, payload, uid);
}

export async function executePrivatePoLineRemove(
  orgId: string,
  purchaseOrderId: string,
  itemId: string,
  uid: string,
): Promise<void> {
  return adapterLineRemove(orgId, purchaseOrderId, itemId, uid);
}

export async function executePoOrderCommand(orgId: string, purchaseOrderId: string): Promise<void> {
  return adapterPoOrder(orgId, purchaseOrderId);
}

export async function executePoCancelCommand(
  orgId: string,
  purchaseOrderId: string,
): Promise<void> {
  return adapterPoCancel(orgId, purchaseOrderId);
}

export async function executePoReceiveCommand(
  orgId: string,
  purchaseOrderId: string,
  warehouseId: string,
  lines: Array<{ itemId: string; quantityMilli: number }>,
): Promise<void> {
  const { executePoReceiveCommand: adapterPoReceive } = await import('@/data/adapters/poAdapter');
  return adapterPoReceive(orgId, purchaseOrderId, warehouseId, lines);
}
