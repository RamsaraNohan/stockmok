import { beforeEach, describe, expect, it, vi } from 'vitest';

const { callableMock, httpsCallableMock } = vi.hoisted(() => ({
  callableMock: vi.fn(),
  httpsCallableMock: vi.fn(),
}));

vi.mock('firebase/functions', () => ({ httpsCallable: httpsCallableMock }));
vi.mock('@/data/firebase/client', () => ({ functions: { marker: 'functions' } }));

import {
  BUYER_MAPPING_LOOKUP_KEYS,
  executeMappingCreateCommand,
  executeMappingDisableCommand,
  lookupPartnerCatalogBySku,
} from './mappingAdapter';

describe('mapping command adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    httpsCallableMock.mockReturnValue(callableMock);
  });

  it('uses the exact callable-only Q-047 envelope and strips supplier-private fields', async () => {
    callableMock.mockResolvedValue({
      data: {
        ok: true,
        data: {
          connectionId: 'connection-1',
          item: {
            catalogItemId: 'catalog-1',
            partnerSku: 'CKN-B5',
            displayName: 'Fresh Chicken Breast 5 KG Pack',
            orderUnit: 'PACK',
            availabilityState: 'IN_STOCK',
            packDescription: '5 KG per pack',
            wholesalePriceMinor: 125000,
            currency: 'LKR',
            sourceProductId: 'private-product',
            internalSkuSnapshot: 'PRIVATE-SKU',
            internalProductNameSnapshot: 'Private product name',
            exactStockMilli: 9000,
            warehouseId: 'private-warehouse',
          },
        },
      },
    });

    const item = await lookupPartnerCatalogBySku('buyer-org', 'connection-1', 'CKN-B5');

    expect(httpsCallableMock).toHaveBeenCalledWith(
      { marker: 'functions' },
      'partnerCatalogLookupBySku',
    );
    expect(callableMock).toHaveBeenCalledWith({
      orgId: 'buyer-org',
      payload: { connectionId: 'connection-1', partnerSku: 'CKN-B5' },
    });
    expect(Object.keys(item)).toEqual(BUYER_MAPPING_LOOKUP_KEYS);
    expect(item).not.toHaveProperty('sourceProductId');
    expect(item).not.toHaveProperty('internalSkuSnapshot');
    expect(item).not.toHaveProperty('internalProductNameSnapshot');
    expect(item).not.toHaveProperty('exactStockMilli');
    expect(item).not.toHaveProperty('warehouseId');
  });

  it('sends only the exact idempotent C-25 payload and operation id', async () => {
    callableMock.mockResolvedValue({
      data: {
        ok: true,
        data: {
          mappingId: 'mapping-1',
          status: 'VERIFIED',
          supplierCatalogItemId: 'catalog-1',
          supplierToBuyerBaseFactorMilli: 5000,
        },
      },
    });
    const payload = {
      connectionId: 'connection-1',
      buyerProductId: 'product-1',
      supplierCatalogItemId: 'catalog-1',
      typedPartnerSku: 'CKN-B5',
      supplierToBuyerBaseFactorMilli: 5000,
      semanticConfirmed: true as const,
    };

    await expect(executeMappingCreateCommand('buyer-org', payload, 'operation-1')).resolves.toEqual(
      {
        mappingId: 'mapping-1',
        status: 'VERIFIED',
        supplierCatalogItemId: 'catalog-1',
        supplierToBuyerBaseFactorMilli: 5000,
      },
    );
    expect(httpsCallableMock).toHaveBeenCalledWith({ marker: 'functions' }, 'mappingCreate');
    expect(callableMock).toHaveBeenCalledWith({
      orgId: 'buyer-org',
      operationId: 'operation-1',
      payload,
    });
  });

  it('sends only mappingId for non-idempotent C-26', async () => {
    callableMock.mockResolvedValue({ data: { ok: true, data: {} } });

    await executeMappingDisableCommand('buyer-org', 'mapping-1');

    expect(httpsCallableMock).toHaveBeenCalledWith({ marker: 'functions' }, 'mappingDisable');
    expect(callableMock).toHaveBeenCalledWith({
      orgId: 'buyer-org',
      payload: { mappingId: 'mapping-1' },
    });
  });
});
