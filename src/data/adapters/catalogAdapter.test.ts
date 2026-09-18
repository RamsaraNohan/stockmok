import { beforeEach, describe, expect, it, vi } from 'vitest';

const { callableMock, httpsCallableMock } = vi.hoisted(() => ({
  callableMock: vi.fn(),
  httpsCallableMock: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: httpsCallableMock,
}));

vi.mock('@/data/firebase/client', () => ({
  functions: { app: 'functions' },
}));

import {
  executePartnerCatalogListCommand,
  executePartnerCatalogLookupBySkuCommand,
  executePartnerCatalogPublishCommand,
  executePartnerCatalogUnpublishCommand,
} from './catalogAdapter';

describe('catalog command adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    httpsCallableMock.mockReturnValue(callableMock);
  });

  it('sends only the exact frozen C-21 envelope and payload', async () => {
    callableMock.mockResolvedValue({
      data: {
        ok: true,
        data: { catalogItemId: 'catalog-1', partnerSku: 'CKN-B5', published: true },
      },
    });

    await expect(
      executePartnerCatalogPublishCommand('supplier-org', {
        sourceProductId: 'product-1',
        partnerSku: 'CKN-B5',
        displayName: 'Fresh Chicken Breast 5 KG Pack',
        orderUnit: 'PACK',
        packDescription: '5 KG per pack',
        wholesalePriceMinor: 125000,
      }),
    ).resolves.toEqual({
      catalogItemId: 'catalog-1',
      partnerSku: 'CKN-B5',
      published: true,
    });

    expect(httpsCallableMock).toHaveBeenCalledWith({ app: 'functions' }, 'partnerCatalogPublish');
    expect(callableMock).toHaveBeenCalledWith({
      orgId: 'supplier-org',
      payload: {
        sourceProductId: 'product-1',
        partnerSku: 'CKN-B5',
        displayName: 'Fresh Chicken Breast 5 KG Pack',
        orderUnit: 'PACK',
        packDescription: '5 KG per pack',
        wholesalePriceMinor: 125000,
      },
    });
  });

  it('sends only catalogItemId for C-22', async () => {
    callableMock.mockResolvedValue({ data: { ok: true, data: {} } });

    await expect(
      executePartnerCatalogUnpublishCommand('supplier-org', 'catalog-1'),
    ).resolves.toBeUndefined();

    expect(httpsCallableMock).toHaveBeenCalledWith({ app: 'functions' }, 'partnerCatalogUnpublish');
    expect(callableMock).toHaveBeenCalledWith({
      orgId: 'supplier-org',
      payload: { catalogItemId: 'catalog-1' },
    });
  });

  it('sends the exact frozen C-23 list envelope', async () => {
    callableMock.mockResolvedValue({
      data: {
        ok: true,
        data: {
          connectionId: 'conn-1',
          count: 1,
          items: [
            {
              catalogItemId: 'cat-1',
              partnerSku: 'SKU-1',
              displayName: 'Item 1',
              orderUnit: 'PACK',
              availabilityState: 'IN_STOCK',
            },
          ],
        },
      },
    });

    await expect(executePartnerCatalogListCommand('buyer-org', 'conn-1', 100)).resolves.toEqual({
      connectionId: 'conn-1',
      count: 1,
      items: [
        {
          catalogItemId: 'cat-1',
          partnerSku: 'SKU-1',
          displayName: 'Item 1',
          orderUnit: 'PACK',
          availabilityState: 'IN_STOCK',
        },
      ],
    });

    expect(httpsCallableMock).toHaveBeenCalledWith({ app: 'functions' }, 'partnerCatalogList');
    expect(callableMock).toHaveBeenCalledWith({
      orgId: 'buyer-org',
      payload: { connectionId: 'conn-1', limit: 100 },
    });
  });

  it('sends the exact frozen C-24 lookup envelope', async () => {
    callableMock.mockResolvedValue({
      data: {
        ok: true,
        data: {
          connectionId: 'conn-1',
          item: {
            catalogItemId: 'cat-1',
            partnerSku: 'SKU-1',
            displayName: 'Item 1',
            orderUnit: 'PACK',
            availabilityState: 'IN_STOCK',
          },
        },
      },
    });

    await expect(
      executePartnerCatalogLookupBySkuCommand('buyer-org', 'conn-1', 'SKU-1'),
    ).resolves.toEqual({
      connectionId: 'conn-1',
      item: {
        catalogItemId: 'cat-1',
        partnerSku: 'SKU-1',
        displayName: 'Item 1',
        orderUnit: 'PACK',
        availabilityState: 'IN_STOCK',
      },
    });

    expect(httpsCallableMock).toHaveBeenCalledWith(
      { app: 'functions' },
      'partnerCatalogLookupBySku',
    );
    expect(callableMock).toHaveBeenCalledWith({
      orgId: 'buyer-org',
      payload: { connectionId: 'conn-1', partnerSku: 'SKU-1' },
    });
  });
});
