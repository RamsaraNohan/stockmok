import type { CommandResult, Unit } from '@stockmok/shared';
import { httpsCallable } from 'firebase/functions';

import { functions } from '@/data/firebase/client';

export interface PartnerCatalogPublishPayload {
  readonly sourceProductId: string;
  readonly partnerSku: string;
  readonly displayName: string;
  readonly orderUnit: Unit;
  readonly packDescription?: string;
  readonly wholesalePriceMinor?: number;
}

export interface PartnerCatalogPublishResult {
  readonly catalogItemId: string;
  readonly partnerSku: string;
  readonly published: true;
}

export interface CallablePartnerCatalogItem {
  readonly catalogItemId: string;
  readonly partnerSku: string;
  readonly displayName: string;
  readonly orderUnit: Unit;
  readonly availabilityState: 'IN_STOCK' | 'OUT_OF_STOCK';
  readonly packDescription?: string;
  readonly wholesalePriceMinor?: number;
  readonly currency?: string;
}

export interface PartnerCatalogListResult {
  readonly connectionId: string;
  readonly count: number;
  readonly items: readonly CallablePartnerCatalogItem[];
}

export interface PartnerCatalogLookupResult {
  readonly connectionId: string;
  readonly item: CallablePartnerCatalogItem;
}

export async function executePartnerCatalogPublishCommand(
  orgId: string,
  payload: PartnerCatalogPublishPayload,
): Promise<PartnerCatalogPublishResult> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'partnerCatalogPublish',
  );
  const response = await callable({ orgId, payload });
  return response.data.data as unknown as PartnerCatalogPublishResult;
}

export async function executePartnerCatalogUnpublishCommand(
  orgId: string,
  catalogItemId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'partnerCatalogUnpublish',
  );
  await callable({ orgId, payload: { catalogItemId } });
}

export async function executePartnerCatalogListCommand(
  orgId: string,
  connectionId: string,
  limit: number,
): Promise<PartnerCatalogListResult> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'partnerCatalogList',
  );
  const response = await callable({ orgId, payload: { connectionId, limit } });
  return response.data.data as unknown as PartnerCatalogListResult;
}

export async function executePartnerCatalogLookupBySkuCommand(
  orgId: string,
  connectionId: string,
  partnerSku: string,
): Promise<PartnerCatalogLookupResult> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'partnerCatalogLookupBySku',
  );
  const response = await callable({ orgId, payload: { connectionId, partnerSku } });
  return response.data.data as unknown as PartnerCatalogLookupResult;
}
