import type { CommandResult, Unit } from '@stockmok/shared';
import { httpsCallable } from 'firebase/functions';

import { functions } from '@/data/firebase/client';

export interface BuyerCatalogLookupItem {
  readonly catalogItemId: string;
  readonly partnerSku: string;
  readonly displayName: string;
  readonly orderUnit: Unit;
  readonly availabilityState: 'IN_STOCK' | 'OUT_OF_STOCK';
  readonly packDescription?: string;
  readonly wholesalePriceMinor?: number;
  readonly currency?: string;
}

export interface MappingCreatePayload {
  readonly connectionId: string;
  readonly buyerProductId: string;
  readonly supplierCatalogItemId: string;
  readonly typedPartnerSku: string;
  readonly supplierToBuyerBaseFactorMilli: number;
  readonly semanticConfirmed: true;
}

export interface MappingCreateResult {
  readonly mappingId: string;
  readonly status: 'VERIFIED';
  readonly supplierCatalogItemId: string;
  readonly supplierToBuyerBaseFactorMilli: number;
}

export const BUYER_MAPPING_LOOKUP_KEYS = [
  'catalogItemId',
  'partnerSku',
  'displayName',
  'orderUnit',
  'availabilityState',
  'packDescription',
  'wholesalePriceMinor',
  'currency',
] as const;

function toBuyerCatalogLookupItem(value: BuyerCatalogLookupItem): BuyerCatalogLookupItem {
  return {
    catalogItemId: value.catalogItemId,
    partnerSku: value.partnerSku,
    displayName: value.displayName,
    orderUnit: value.orderUnit,
    availabilityState: value.availabilityState,
    ...(value.packDescription === undefined ? {} : { packDescription: value.packDescription }),
    ...(value.wholesalePriceMinor === undefined
      ? {}
      : { wholesalePriceMinor: value.wholesalePriceMinor }),
    ...(value.currency === undefined ? {} : { currency: value.currency }),
  };
}

export async function lookupPartnerCatalogBySku(
  orgId: string,
  connectionId: string,
  partnerSku: string,
): Promise<BuyerCatalogLookupItem> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'partnerCatalogLookupBySku',
  );
  const response = await callable({ orgId, payload: { connectionId, partnerSku } });
  const data = response.data.data as {
    readonly connectionId: string;
    readonly item: BuyerCatalogLookupItem;
  };
  return toBuyerCatalogLookupItem(data.item);
}

export async function executeMappingCreateCommand(
  orgId: string,
  payload: MappingCreatePayload,
  operationId: string,
): Promise<MappingCreateResult> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'mappingCreate',
  );
  const response = await callable({ orgId, operationId, payload });
  return response.data.data as unknown as MappingCreateResult;
}

export async function executeMappingDisableCommand(
  orgId: string,
  mappingId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'mappingDisable',
  );
  await callable({ orgId, payload: { mappingId } });
}
