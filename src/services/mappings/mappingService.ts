import type {
  ConnectionProjection,
  ProductMapping,
  ProductStockSummary,
  Role,
} from '@stockmok/shared';
import type { PageResult, createStockmokRepositories } from '@stockmok/data';

import {
  executeMappingCreateCommand as createMappingAdapter,
  executeMappingDisableCommand as disableMappingAdapter,
  lookupPartnerCatalogBySku as lookupCatalogAdapter,
} from '@/data/adapters/mappingAdapter';
import type {
  BuyerCatalogLookupItem,
  MappingCreatePayload,
  MappingCreateResult,
} from '@/data/adapters/mappingAdapter';

type Repositories = ReturnType<typeof createStockmokRepositories>;

export type { BuyerCatalogLookupItem, MappingCreatePayload, MappingCreateResult };

export const MAPPING_ROLES: readonly Role[] = ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER'];

export type MappingRefusalState =
  | 'NO_ACTIVE_CONNECTION'
  | 'SKU_NOT_FOUND'
  | 'ITEM_UNPUBLISHED'
  | 'SEMANTIC_NOT_CONFIRMED'
  | 'INVALID_FACTOR'
  | 'STALE_CONNECTION'
  | 'DUPLICATE_MAPPING';

export const MAPPING_REFUSAL_COPY: Readonly<Record<MappingRefusalState, string>> = {
  NO_ACTIVE_CONNECTION: 'Choose an active supplier connection before creating a mapping.',
  SKU_NOT_FOUND: 'No published item matches that supplier SKU.',
  ITEM_UNPUBLISHED: 'That item exists but is not currently published to you.',
  SEMANTIC_NOT_CONFIRMED: 'Confirm that both records refer to the same real-world item.',
  INVALID_FACTOR: 'Enter a conversion factor greater than 0.',
  STALE_CONNECTION: 'Your supplier connection is no longer active. Refresh before continuing.',
  DUPLICATE_MAPPING: 'A verified mapping already links these items.',
};

export function canManageMappings(role: Role | null): boolean {
  return role !== null && MAPPING_ROLES.includes(role);
}

export async function listActiveSupplierConnections(
  repositories: Pick<Repositories, 'network'>,
): Promise<PageResult<ConnectionProjection>> {
  return repositories.network.listConnections(['ACTIVE'], { limit: 100 });
}

export async function listActiveBuyerProducts(
  repositories: Pick<Repositories, 'inventory'>,
): Promise<PageResult<ProductStockSummary>> {
  return repositories.inventory.listProducts({
    productStatus: 'ACTIVE',
    sort: 'name',
    limit: 100,
  }) as Promise<PageResult<ProductStockSummary>>;
}

export async function listMappings(
  repositories: Pick<Repositories, 'network'>,
  status: 'VERIFIED' | 'DISABLED',
): Promise<PageResult<ProductMapping>> {
  return repositories.network.listMappings(status) as Promise<PageResult<ProductMapping>>;
}

export async function lookupPartnerSku(
  orgId: string,
  connectionId: string,
  partnerSku: string,
): Promise<BuyerCatalogLookupItem> {
  return lookupCatalogAdapter(orgId, connectionId, partnerSku.trim());
}

export async function createVerifiedMapping(
  orgId: string,
  payload: MappingCreatePayload,
  operationId: string,
): Promise<MappingCreateResult> {
  return createMappingAdapter(orgId, payload, operationId);
}

export async function disableMapping(orgId: string, mappingId: string): Promise<void> {
  return disableMappingAdapter(orgId, mappingId);
}

export function parsePositiveFactorMilli(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) return null;
  const [whole = '', fraction = ''] = normalized.split('.');
  const factor = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  return Number.isSafeInteger(factor) && factor > 0 ? factor : null;
}

export function formatFactorMilli(value: number): string {
  const whole = Math.floor(value / 1000);
  const fraction = String(value % 1000)
    .padStart(3, '0')
    .replace(/0+$/, '');
  return fraction ? `${String(whole)}.${fraction}` : String(whole);
}

function reasonFromError(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const direct = (error as { readonly details?: unknown }).details;
  if (typeof direct === 'object' && direct !== null) {
    const reason = (direct as { readonly reason?: unknown }).reason;
    if (typeof reason === 'string') return reason;
  }
  const customData = (error as { readonly customData?: unknown }).customData;
  if (typeof customData === 'object' && customData !== null) {
    return reasonFromError(customData);
  }
  return null;
}

export function mappingRefusalFromError(error: unknown): MappingRefusalState | null {
  switch (reasonFromError(error)) {
    case 'SKU_NOT_FOUND':
    case 'RESOURCE_NOT_FOUND':
      return 'SKU_NOT_FOUND';
    case 'CATALOG_ITEM_NOT_PUBLISHED':
      return 'ITEM_UNPUBLISHED';
    case 'SEMANTIC_NOT_CONFIRMED':
      return 'SEMANTIC_NOT_CONFIRMED';
    case 'INVALID_FACTOR':
      return 'INVALID_FACTOR';
    case 'CONNECTION_NOT_ACTIVE':
      return 'STALE_CONNECTION';
    case 'MAPPING_EXISTS':
      return 'DUPLICATE_MAPPING';
    default:
      return null;
  }
}
