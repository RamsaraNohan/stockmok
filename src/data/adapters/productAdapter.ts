import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/client';
import type { CommandResult, LifecycleStatus } from '@stockmok/shared';

export interface ProductCreatePayload {
  readonly internalSku: string;
  readonly name: string;
  readonly description?: string;
  readonly categoryId: string;
  readonly baseUnit: string;
  readonly purchaseCostMinor: number;
  readonly sellingPriceMinor?: number;
  readonly currency: string;
  readonly minimumStockMilli: number;
  readonly reorderTargetMilli: number;
}

export async function executeProductCreateCommand(
  payload: ProductCreatePayload,
): Promise<{ readonly productId: string }> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'productCreate',
  );
  const response = await callable(payload);
  const result = response.data;
  return result.data as { readonly productId: string };
}

export interface ProductUpdatePayload {
  readonly productId: string;
  readonly internalSku?: string;
  readonly name?: string;
  readonly description?: string;
  readonly categoryId?: string;
  readonly purchaseCostMinor?: number;
  readonly sellingPriceMinor?: number;
  readonly minimumStockMilli?: number;
  readonly reorderTargetMilli?: number;
}

export async function executeProductUpdateCommand(
  payload: ProductUpdatePayload,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'productUpdate',
  );
  await callable(payload);
}

export interface ProductSetStatusPayload {
  readonly productId: string;
  readonly status: LifecycleStatus;
}

export async function executeProductSetStatusCommand(
  payload: ProductSetStatusPayload,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'productSetStatus',
  );
  await callable(payload);
}
