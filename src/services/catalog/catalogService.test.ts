import type { PartnerCatalogItem } from '@stockmok/shared';
import { describe, expect, it } from 'vitest';

import {
  BUYER_CATALOG_PROJECTION_KEYS,
  canManageSupplierCatalog,
  toBuyerCatalogProjection,
  toWholesalePriceMinor,
} from './catalogService';

const catalogItem = {
  catalogItemId: 'catalog-1',
  sourceProductId: 'private-product-id',
  internalProductNameSnapshot: 'Private internal product name',
  internalSkuSnapshot: 'PRIVATE-SKU',
  partnerSku: 'PARTNER-SKU',
  partnerSkuNormalized: 'partner-sku',
  displayName: 'Partner-safe item name',
  orderUnit: 'PACK',
  packDescription: '5 KG per pack',
  availabilityState: 'IN_STOCK',
  wholesalePriceMinor: 125000,
  currency: 'LKR',
  published: true,
  updatedAt: { toDate: () => new Date('2026-08-21T00:00:00Z') },
} as PartnerCatalogItem;

describe('supplier catalog service', () => {
  it('builds the exact buyer allow-list and strips every supplier-private field', () => {
    const projection = toBuyerCatalogProjection(catalogItem);

    expect(Object.keys(projection)).toEqual(BUYER_CATALOG_PROJECTION_KEYS);
    expect(projection).not.toHaveProperty('sourceProductId');
    expect(projection).not.toHaveProperty('internalProductNameSnapshot');
    expect(projection).not.toHaveProperty('internalSkuSnapshot');
    expect(projection).not.toHaveProperty('partnerSkuNormalized');
    expect(projection).not.toHaveProperty('published');
    expect(projection).not.toHaveProperty('updatedAt');
  });

  it('limits supplier catalog management to O/A/PM', () => {
    expect(canManageSupplierCatalog('OWNER')).toBe(true);
    expect(canManageSupplierCatalog('ADMIN')).toBe(true);
    expect(canManageSupplierCatalog('PROCUREMENT_MANAGER')).toBe(true);
    expect(canManageSupplierCatalog('INVENTORY_MANAGER')).toBe(false);
    expect(canManageSupplierCatalog('STOREKEEPER')).toBe(false);
    expect(canManageSupplierCatalog('ANALYST')).toBe(false);
    expect(canManageSupplierCatalog('VIEWER')).toBe(false);
    expect(canManageSupplierCatalog(null)).toBe(false);
  });

  it('converts optional decimal currency input to integer minor units without floats', () => {
    expect(toWholesalePriceMinor('')).toBeUndefined();
    expect(toWholesalePriceMinor('1250')).toBe(125000);
    expect(toWholesalePriceMinor('1250.5')).toBe(125050);
    expect(toWholesalePriceMinor('1250.05')).toBe(125005);
    expect(toWholesalePriceMinor('-1')).toBeNaN();
    expect(toWholesalePriceMinor('1.234')).toBeNaN();
  });
});
