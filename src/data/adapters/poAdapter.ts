import { httpsCallable } from 'firebase/functions';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, functions } from '../firebase/client';
import type { PurchaseOrder, PurchaseOrderItem } from '@stockmok/shared';
import type { CommandResult } from '@stockmok/shared';

// Safe direct writes for PRIVATE PO Header
export type PrivatePoHeaderCreatePayload = Omit<
  PurchaseOrder,
  | 'purchaseOrderId'
  | 'viewRole'
  | 'supplierKind'
  | 'isProjection'
  | 'status'
  | 'createdAt'
  | 'createdBy'
  | 'updatedAt'
  | 'updatedBy'
>;
export type PrivatePoHeaderUpdatePayload = Partial<PrivatePoHeaderCreatePayload>;

export async function executePrivatePoHeaderCreate(
  orgId: string,
  purchaseOrderId: string,
  payload: PrivatePoHeaderCreatePayload,
  uid: string,
): Promise<void> {
  const poRef = doc(db, 'organizations', orgId, 'purchaseOrders', purchaseOrderId);
  const data = {
    ...payload,
    purchaseOrderId,
    viewRole: 'BUYER',
    supplierKind: 'PRIVATE',
    isProjection: false,
    status: 'DRAFT',
    createdAt: serverTimestamp(),
    createdBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  await setDoc(poRef, data);
}

export async function executePrivatePoHeaderUpdate(
  orgId: string,
  purchaseOrderId: string,
  payload: PrivatePoHeaderUpdatePayload,
  uid: string,
): Promise<void> {
  const poRef = doc(db, 'organizations', orgId, 'purchaseOrders', purchaseOrderId);
  const data = {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  await updateDoc(poRef, data);
}

// Safe direct writes for PRIVATE PO Line
export type PrivatePoLineCreatePayload = Omit<
  PurchaseOrderItem,
  | 'itemId'
  | 'purchaseOrderId'
  | 'receivedBuyerBaseMilli'
  | 'createdAt'
  | 'createdBy'
  | 'updatedAt'
  | 'updatedBy'
>;
export type PrivatePoLineUpdatePayload = Partial<PrivatePoLineCreatePayload>;

export async function executePrivatePoLineCreate(
  orgId: string,
  purchaseOrderId: string,
  itemId: string,
  payload: PrivatePoLineCreatePayload,
  uid: string,
): Promise<void> {
  const lineRef = doc(
    db,
    'organizations',
    orgId,
    'purchaseOrders',
    purchaseOrderId,
    'items',
    itemId,
  );
  const data = {
    ...payload,
    purchaseOrderId,
    itemId,
    receivedBuyerBaseMilli: 0,
    createdAt: serverTimestamp(),
    createdBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  await setDoc(lineRef, data);
}

export async function executePrivatePoLineUpdate(
  orgId: string,
  purchaseOrderId: string,
  itemId: string,
  payload: PrivatePoLineUpdatePayload,
  uid: string,
): Promise<void> {
  const lineRef = doc(
    db,
    'organizations',
    orgId,
    'purchaseOrders',
    purchaseOrderId,
    'items',
    itemId,
  );
  const data = {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  await updateDoc(lineRef, data);
}

// C-15 po.order
export async function executePoOrderCommand(orgId: string, purchaseOrderId: string): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'poOrder',
  );
  // IDEMPOTENT envelope
  const payloadEnvelope = {
    orgId,
    operationId: crypto.randomUUID(),
    payload: { purchaseOrderId },
  };
  await callable(payloadEnvelope);
}

// C-16 po.cancel
export async function executePoCancelCommand(
  orgId: string,
  purchaseOrderId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'poCancel',
  );
  // NON-IDEMPOTENT envelope
  const payloadEnvelope = {
    orgId,
    payload: { purchaseOrderId },
  };
  await callable(payloadEnvelope);
}

export async function executePrivatePoLineRemove(
  orgId: string,
  purchaseOrderId: string,
  itemId: string,
  uid: string,
): Promise<void> {
  const lineRef = doc(
    db,
    'organizations',
    orgId,
    'purchaseOrders',
    purchaseOrderId,
    'items',
    itemId,
  );
  await updateDoc(lineRef, {
    orderedBuyerBaseMilli: 0,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

// C-17 po.receive
export async function executePoReceiveCommand(
  orgId: string,
  purchaseOrderId: string,
  warehouseId: string,
  lines: Array<{ itemId: string; quantityMilli: number }>,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'poReceive',
  );
  // IDEMPOTENT envelope
  const payloadEnvelope = {
    orgId,
    operationId: crypto.randomUUID(),
    payload: {
      purchaseOrderId,
      warehouseId,
      lines,
    },
  };
  await callable(payloadEnvelope);
}
