import {
  executeCategoryCreate as adapterCreate,
  executeCategoryUpdate as adapterUpdate,
  executeCategoryArchiveCommand as adapterArchive,
  executeCategoryRestoreCommand as adapterRestore,
} from '@/data/adapters/categoryAdapter';
import type { CategoryCreatePayload, CategoryUpdatePayload } from '@/data/adapters/categoryAdapter';

export type { CategoryCreatePayload, CategoryUpdatePayload };

export async function createCategory(
  orgId: string,
  categoryId: string,
  payload: CategoryCreatePayload,
  uid: string,
): Promise<void> {
  return adapterCreate(orgId, categoryId, payload, uid);
}

export async function updateCategory(
  orgId: string,
  categoryId: string,
  payload: CategoryUpdatePayload,
  uid: string,
): Promise<void> {
  return adapterUpdate(orgId, categoryId, payload, uid);
}

export async function executeCategoryArchiveCommand(
  orgId: string,
  categoryId: string,
): Promise<void> {
  return adapterArchive(orgId, categoryId);
}

export async function executeCategoryRestoreCommand(
  orgId: string,
  categoryId: string,
): Promise<void> {
  return adapterRestore(orgId, categoryId);
}
