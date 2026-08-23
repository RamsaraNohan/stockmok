import type {
  ConnectionProjection,
  PartnerCatalogItem,
  Product,
  Role,
  Unit,
} from '@stockmok/shared';
import type { PageRequest, PageResult, createStockmokRepositories } from '@stockmok/data';

import {
  executePartnerCatalogListCommand as listBuyerCatalogAdapter,
  executePartnerCatalogLookupBySkuCommand as lookupBuyerCatalogAdapter,
  executePartnerCatalogPublishCommand as publishAdapter,
  executePartnerCatalogUnpublishCommand as unpublishAdapter,
} from '@/data/adapters/catalogAdapter';
import type {
  CallablePartnerCatalogItem,
  PartnerCatalogPublishPayload,
  PartnerCatalogPublishResult,
} from '@/data/adapters/catalogAdapter';

type Repositories = ReturnType<typeof createStockmokRepositories>;

export type { PartnerCatalogPublishPayload, PartnerCatalogPublishResult };

export const PARTNER_CATALOG_ROLES: readonly Role[] = ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER'];

export const BUYER_CATALOG_PROJECTION_KEYS = [
  'catalogItemId',
  'partnerSku',
  'displayName',
  'orderUnit',
  'availabilityState',
  'packDescription',
  'wholesalePriceMinor',
  'currency',
] as const;

export interface BuyerCatalogProjection {
  readonly catalogItemId: string;
  readonly partnerSku: string;
  readonly displayName: string;
  readonly orderUnit: Unit;
  readonly availabilityState: 'IN_STOCK' | 'OUT_OF_STOCK';
  readonly packDescription?: string;
  readonly wholesalePriceMinor?: number;
  readonly currency?: string;
}

export function canManageSupplierCatalog(role: Role | null): boolean {
  return role !== null && PARTNER_CATALOG_ROLES.includes(role);
}

export async function listOwnCatalog(
  repositories: Pick<Repositories, 'network'>,
  published: boolean,
  page?: PageRequest,
): Promise<PageResult<PartnerCatalogItem>> {
  return repositories.network.listOwnCatalog(published, page) as Promise<
    PageResult<PartnerCatalogItem>
  >;
}

export async function getPublishSourceProduct(
  repositories: Pick<Repositories, 'inventory'>,
  productId: string,
): Promise<Product | null> {
  return repositories.inventory.getProduct(productId);
}

export async function findActiveSupplierConnection(
  repositories: Pick<Repositories, 'network'>,
  buyerOrgId: string,
  supplierOrgId: string,
): Promise<ConnectionProjection | null> {
  const page = await repositories.network.listConnections(['ACTIVE'], { limit: 100 });
  return (
    page.items.find(
      (connection) =>
        connection.buyerOrgId === buyerOrgId && connection.supplierOrgId === supplierOrgId,
    ) ?? null
  );
}

export function toBuyerCatalogProjection(item: PartnerCatalogItem): BuyerCatalogProjection {
  return {
    catalogItemId: item.catalogItemId,
    partnerSku: item.partnerSku,
    displayName: item.displayName,
    orderUnit: item.orderUnit,
    availabilityState: item.availabilityState,
    ...(item.packDescription === undefined ? {} : { packDescription: item.packDescription }),
    ...(item.wholesalePriceMinor === undefined
      ? {}
      : { wholesalePriceMinor: item.wholesalePriceMinor }),
    ...(item.currency === undefined ? {} : { currency: item.currency }),
  };
}

export function sanitizeCallableCatalogItem(
  item: CallablePartnerCatalogItem,
): BuyerCatalogProjection {
  return {
    catalogItemId: item.catalogItemId,
    partnerSku: item.partnerSku,
    displayName: item.displayName,
    orderUnit: item.orderUnit,
    availabilityState: item.availabilityState,
    ...(item.packDescription === undefined ? {} : { packDescription: item.packDescription }),
    ...(item.wholesalePriceMinor === undefined
      ? {}
      : { wholesalePriceMinor: item.wholesalePriceMinor }),
    ...(item.currency === undefined ? {} : { currency: item.currency }),
  };
}

export function toWholesalePriceMinor(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  const [whole, fraction = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export async function publishPartnerCatalogItem(
  orgId: string,
  payload: PartnerCatalogPublishPayload,
): Promise<PartnerCatalogPublishResult> {
  return publishAdapter(orgId, payload);
}

export async function unpublishPartnerCatalogItem(
  orgId: string,
  catalogItemId: string,
): Promise<void> {
  return unpublishAdapter(orgId, catalogItemId);
}

export async function listBuyerPartnerCatalog(
  orgId: string,
  connectionId: string,
  limit = 100,
): Promise<readonly BuyerCatalogProjection[]> {
  const result = await listBuyerCatalogAdapter(orgId, connectionId, limit);
  return result.items.map(sanitizeCallableCatalogItem);
}

export async function lookupBuyerPartnerCatalogSku(
  orgId: string,
  connectionId: string,
  partnerSku: string,
): Promise<BuyerCatalogProjection> {
  const result = await lookupBuyerCatalogAdapter(orgId, connectionId, partnerSku.trim());
  return sanitizeCallableCatalogItem(result.item);
}
