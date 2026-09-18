/**
 * Product service — the service-layer boundary between feature/UI code and the
 * data adapter zone.  Feature code must import from here; never from
 * `@/data/adapters/productAdapter` directly.
 */
import {
  executeProductCreateCommand as adapterCreate,
  executeProductUpdateCommand as adapterUpdate,
  executeProductSetStatusCommand as adapterSetStatus,
} from '@/data/adapters/productAdapter';

import type {
  ProductCreatePayload,
  ProductUpdatePayload,
  ProductSetStatusPayload,
} from '@/data/adapters/productAdapter';

export type { ProductCreatePayload, ProductUpdatePayload, ProductSetStatusPayload };

export async function executeProductCreateCommand(
  orgId: string,
  payload: ProductCreatePayload,
): Promise<{ readonly productId: string }> {
  return adapterCreate(orgId, payload);
}

export async function executeProductUpdateCommand(
  orgId: string,
  payload: ProductUpdatePayload,
): Promise<void> {
  return adapterUpdate(orgId, payload);
}

export async function executeProductSetStatusCommand(
  orgId: string,
  payload: ProductSetStatusPayload,
): Promise<void> {
  return adapterSetStatus(orgId, payload);
}
