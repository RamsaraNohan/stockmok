import { httpsCallable } from 'firebase/functions';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, functions } from '../firebase/client';
import type { Category } from '@stockmok/shared';
import type { CommandResult } from '@stockmok/shared';

export type CategoryCreatePayload = Omit<
  Category,
  'categoryId' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'status'
>;
export type CategoryUpdatePayload = Partial<
  Omit<Category, 'categoryId' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'status'>
>;

export async function executeCategoryCreate(
  orgId: string,
  categoryId: string,
  payload: CategoryCreatePayload,
  uid: string,
): Promise<void> {
  const categoryRef = doc(db, 'organizations', orgId, 'categories', categoryId);
  const data = {
    ...payload,
    categoryId,
    status: 'ACTIVE',
    createdAt: serverTimestamp(),
    createdBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  await setDoc(categoryRef, data);
}

export async function executeCategoryUpdate(
  orgId: string,
  categoryId: string,
  payload: CategoryUpdatePayload,
  uid: string,
): Promise<void> {
  const categoryRef = doc(db, 'organizations', orgId, 'categories', categoryId);
  const data = {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  await updateDoc(categoryRef, data);
}

// C-35a category.archive
export async function executeCategoryArchiveCommand(
  orgId: string,
  categoryId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'categoryArchive',
  );
  const payloadEnvelope = {
    orgId,
    operationId: crypto.randomUUID(),
    payload: { categoryId },
  };
  await callable(payloadEnvelope);
}

// C-35b category.restore
export async function executeCategoryRestoreCommand(
  orgId: string,
  categoryId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'categoryRestore',
  );
  const payloadEnvelope = {
    orgId,
    operationId: crypto.randomUUID(),
    payload: { categoryId },
  };
  await callable(payloadEnvelope);
}
