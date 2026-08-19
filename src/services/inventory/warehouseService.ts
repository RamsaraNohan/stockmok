import {
  executeWarehouseCreate as adapterCreate,
  executeWarehouseUpdate as adapterUpdate,
  executeWarehouseArchiveCommand as adapterArchive,
  executeWarehouseSetDefaultCommand as adapterSetDefault,
  executeWarehouseRestoreCommand as adapterRestore,
} from '@/data/adapters/warehouseAdapter';
import type {
  WarehouseCreatePayload,
  WarehouseUpdatePayload,
} from '@/data/adapters/warehouseAdapter';

export type { WarehouseCreatePayload, WarehouseUpdatePayload };

export async function createWarehouse(
  orgId: string,
  warehouseId: string,
  payload: WarehouseCreatePayload,
  uid: string,
): Promise<void> {
  return adapterCreate(orgId, warehouseId, payload, uid);
}

export async function updateWarehouse(
  orgId: string,
  warehouseId: string,
  payload: WarehouseUpdatePayload,
  uid: string,
): Promise<void> {
  return adapterUpdate(orgId, warehouseId, payload, uid);
}

export async function executeWarehouseArchiveCommand(
  orgId: string,
  warehouseId: string,
): Promise<void> {
  return adapterArchive(orgId, warehouseId);
}

export async function executeWarehouseSetDefaultCommand(
  orgId: string,
  warehouseId: string,
): Promise<void> {
  return adapterSetDefault(orgId, warehouseId);
}

export async function executeWarehouseRestoreCommand(
  orgId: string,
  warehouseId: string,
): Promise<void> {
  return adapterRestore(orgId, warehouseId);
}
