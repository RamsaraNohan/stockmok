// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as CatalogServiceModule from '@/services/catalog/catalogService';

const catalogMocks = vi.hoisted(() => ({
  findActiveSupplierConnection: vi.fn(),
  listBuyerPartnerCatalog: vi.fn(),
  lookupBuyerPartnerCatalogSku: vi.fn(),
  canManageSupplierCatalog: vi.fn(),
}));

vi.mock('@/services/data/useRepositories', () => ({
  useRepositories: () => ({ network: {} }),
}));

vi.mock('@/services/workspace/useWorkspace', () => ({
  useWorkspace: () => ({
    activeMembership: { organizationId: 'buyer-org' },
    activeRole: 'PROCUREMENT_MANAGER',
  }),
}));

vi.mock('@/services/catalog/catalogService', async (importOriginal) => {
  const mod = await importOriginal<typeof CatalogServiceModule>();
  return {
    ...mod,
    findActiveSupplierConnection: catalogMocks.findActiveSupplierConnection,
    listBuyerPartnerCatalog: catalogMocks.listBuyerPartnerCatalog,
    lookupBuyerPartnerCatalogSku: catalogMocks.lookupBuyerPartnerCatalogSku,
    canManageSupplierCatalog: catalogMocks.canManageSupplierCatalog,
  };
});

import { BuyerPartnerCatalogScreen } from './BuyerPartnerCatalogScreen';

const mockConnection = {
  connectionId: 'conn-1',
  buyerOrgId: 'buyer-org',
  supplierOrgId: 'supplier-org',
  supplierName: 'Supplier Inc',
  supplierHandle: 'supplier-inc',
  buyerName: 'Buyer Inc',
  buyerHandle: 'buyer-inc',
  status: 'ACTIVE',
};

const mockItems = [
  {
    catalogItemId: 'cat-1',
    partnerSku: 'SKU-A',
    displayName: 'Item A',
    orderUnit: 'PACK',
    availabilityState: 'IN_STOCK',
    wholesalePriceMinor: 10000,
    currency: 'LKR',
  },
  {
    catalogItemId: 'cat-2',
    partnerSku: 'SKU-B',
    displayName: 'Item B',
    orderUnit: 'KG',
    availabilityState: 'OUT_OF_STOCK',
  },
];

describe('BuyerPartnerCatalogScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    catalogMocks.canManageSupplierCatalog.mockReturnValue(true);
    catalogMocks.findActiveSupplierConnection.mockResolvedValue(mockConnection);
    catalogMocks.listBuyerPartnerCatalog.mockResolvedValue(mockItems);
    catalogMocks.lookupBuyerPartnerCatalogSku.mockResolvedValue(mockItems[0]);
  });

  function renderScreen() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/app/buyer-handle/network/partner-catalog/supplier-org']}>
          <Routes>
            <Route
              element={<BuyerPartnerCatalogScreen />}
              path="/app/:handle/network/partner-catalog/:supplierOrgId"
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('renders loading state then catalog items if authorized and connected', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getAllByText('Item A')).toHaveLength(2);
    });

    expect(screen.getAllByText('Item B')).toHaveLength(2);
    expect(screen.getAllByText('SKU-A')).toHaveLength(2);
    expect(catalogMocks.listBuyerPartnerCatalog).toHaveBeenCalledWith('buyer-org', 'conn-1', 100);
  });

  it('requires an ACTIVE connection', async () => {
    catalogMocks.findActiveSupplierConnection.mockResolvedValue(null);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/ACTIVE supplier connection is required/i)).toBeTruthy();
    });
    expect(catalogMocks.listBuyerPartnerCatalog).not.toHaveBeenCalled();
  });

  it('filters results locally without making another callable request', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getAllByText('Item A')).toHaveLength(2);
    });

    const searchInput = screen.getByLabelText('Search returned items');
    fireEvent.change(searchInput, { target: { value: 'Item B' } });

    expect(screen.queryAllByText('Item A')).toHaveLength(0);
    expect(screen.getAllByText('Item B')).toHaveLength(2);

    expect(catalogMocks.listBuyerPartnerCatalog).toHaveBeenCalledTimes(1);
  });

  it('allows exact SKU lookup via C-24 callable', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getAllByText('Item A')).toHaveLength(2);
    });

    const skuInput = screen.getByLabelText('Exact partner SKU');
    fireEvent.change(skuInput, { target: { value: 'SKU-A' } });

    const lookupButton = screen.getByRole('button', { name: /Look up/i });
    fireEvent.click(lookupButton);

    await waitFor(() => {
      expect(screen.getAllByText('Exact SKU match')).toBeTruthy();
    });
    expect(catalogMocks.lookupBuyerPartnerCatalogSku).toHaveBeenCalledWith(
      'buyer-org',
      'conn-1',
      'SKU-A',
    );
  });

  it('denies access if unauthorized', async () => {
    catalogMocks.canManageSupplierCatalog.mockReturnValue(false);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/Partner Catalog is available to/)).toBeTruthy();
    });
  });
});
