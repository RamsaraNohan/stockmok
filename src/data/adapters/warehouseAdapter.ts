import { httpsCallable } from 'firebase/functions';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, functions } from '../firebase/client';
import type { Warehouse } from '@stockmok/shared';
import type { CommandResult } from '@stockmok/shared';

export type WarehouseCreatePayload = Omit<
  Warehouse,
  'warehouseId' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'status'
>;
export type WarehouseUpdatePayload = Partial<
  Omit<Warehouse, 'warehouseId' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'status'>
>;

export async function executeWarehouseCreate(
  orgId: string,
  warehouseId: string,
  payload: WarehouseCreatePayload,
  uid: string,
): Promise<void> {
  const warehouseRef = doc(db, 'organizations', orgId, 'warehouses', warehouseId);
  const data = {
    ...payload,
    warehouseId,
    status: 'ACTIVE',
    createdAt: serverTimestamp(),
    createdBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  await setDoc(warehouseRef, data);
}

export async function executeWarehouseUpdate(
  orgId: string,
  warehouseId: string,
  payload: WarehouseUpdatePayload,
  uid: string,
): Promise<void> {
  const warehouseRef = doc(db, 'organizations', orgId, 'warehouses', warehouseId);
  const data = {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  await updateDoc(warehouseRef, data);
}

// C-12 warehouse.archive
export async function executeWarehouseArchiveCommand(
  orgId: string,
  warehouseId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'warehouseArchive',
  );
  const payloadEnvelope = {
    orgId,
    operationId: crypto.randomUUID(),
    payload: { warehouseId },
  };
  await callable(payloadEnvelope);
}

// C-36 warehouse.setDefault
export async function executeWarehouseSetDefaultCommand(
  orgId: string,
  warehouseId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'warehouseSetDefault',
  );
  const payloadEnvelope = {
    orgId,
    operationId: crypto.randomUUID(),
    payload: { warehouseId },
  };
  await callable(payloadEnvelope);
}

// C-37 warehouse.restore
export async function executeWarehouseRestoreCommand(
  orgId: string,
  warehouseId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'warehouseRestore',
  );
  const payloadEnvelope = {
    orgId,
    operationId: crypto.randomUUID(),
    payload: { warehouseId },
  };
  await callable(payloadEnvelope);
}
