// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createVerifiedMappingMock,
  listActiveBuyerProductsMock,
  listActiveSupplierConnectionsMock,
  lookupPartnerSkuMock,
  useRepositoriesMock,
  useWorkspaceMock,
} = vi.hoisted(() => ({
  createVerifiedMappingMock: vi.fn(),
  listActiveBuyerProductsMock: vi.fn(),
  listActiveSupplierConnectionsMock: vi.fn(),
  lookupPartnerSkuMock: vi.fn(),
  useRepositoriesMock: vi.fn(),
  useWorkspaceMock: vi.fn(),
}));

vi.mock('@/services/data/useRepositories', () => ({ useRepositories: useRepositoriesMock }));
vi.mock('@/services/workspace/useWorkspace', () => ({ useWorkspace: useWorkspaceMock }));
vi.mock('@/services/mappings/mappingService', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    createVerifiedMapping: createVerifiedMappingMock,
    listActiveBuyerProducts: listActiveBuyerProductsMock,
    listActiveSupplierConnections: listActiveSupplierConnectionsMock,
    lookupPartnerSku: lookupPartnerSkuMock,
  };
});

import { MAPPING_REFUSAL_COPY } from '@/services/mappings/mappingService';
import { ProductMappingWizardScreen } from './ProductMappingWizardScreen';

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/grand-ocean/network/mappings/new']}>
        <ProductMappingWizardScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductMappingWizardScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRepositoriesMock.mockReturnValue({ network: {}, inventory: {} });
    useWorkspaceMock.mockReturnValue({
      activeMembership: { organizationId: 'buyer-org' },
      activeRole: 'PROCUREMENT_MANAGER',
    });
    listActiveSupplierConnectionsMock.mockResolvedValue({
      items: [
        {
          connectionId: 'connection-1',
          buyerOrgId: 'buyer-org',
          supplierName: 'Supplier A',
          supplierHandle: 'supp-a',
        },
      ],
    });
    listActiveBuyerProductsMock.mockResolvedValue({
      items: [{ productId: 'product-1', productName: 'Chicken', internalSku: 'CKN', unit: 'KG' }],
    });
  });

  const setupForm = async () => {
    renderScreen();
    await screen.findByText('Supplier A (@supp-a)');

    // Choose connection
    fireEvent.change(screen.getByLabelText(/Supplier connection/i), {
      target: { value: 'connection-1' },
    });

    // Fill SKU
    fireEvent.change(screen.getByLabelText(/Supplier SKU/i), { target: { value: 'SKU123' } });
  };

  const executeLookup = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Check supplier SKU' }));
  };

  const completeForm = async () => {
    await waitFor(() => {
      expect(screen.getByText('Published supplier item found')).toBeTruthy();
    });
    // Choose product
    fireEvent.change(screen.getByLabelText(/Buyer product/i), { target: { value: 'product-1' } });
  };

  it('shows NO_ACTIVE_CONNECTION when no connections available', async () => {
    listActiveSupplierConnectionsMock.mockResolvedValue({ items: [] });
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText(MAPPING_REFUSAL_COPY.NO_ACTIVE_CONNECTION)).toBeTruthy();
    });
  });

  it('shows SKU_NOT_FOUND when lookup fails with SKU_NOT_FOUND', async () => {
    await setupForm();
    lookupPartnerSkuMock.mockRejectedValue({ details: { reason: 'SKU_NOT_FOUND' } });
    executeLookup();
    await waitFor(() => {
      expect(screen.getByText(MAPPING_REFUSAL_COPY.SKU_NOT_FOUND)).toBeTruthy();
    });
  });

  it('shows ITEM_UNPUBLISHED when lookup fails with ITEM_UNPUBLISHED (CATALOG_ITEM_NOT_PUBLISHED)', async () => {
    await setupForm();
    lookupPartnerSkuMock.mockRejectedValue({ details: { reason: 'CATALOG_ITEM_NOT_PUBLISHED' } });
    executeLookup();
    await waitFor(() => {
      expect(screen.getByText(MAPPING_REFUSAL_COPY.ITEM_UNPUBLISHED)).toBeTruthy();
    });
  });

  it('shows SEMANTIC_NOT_CONFIRMED when trying to create without semantic confirmation', async () => {
    await setupForm();
    lookupPartnerSkuMock.mockResolvedValue({
      catalogItemId: 'cat-1',
      displayName: 'Item 1',
      partnerSku: 'SKU123',
      orderUnit: 'PACK',
    });
    executeLookup();
    await completeForm();

    fireEvent.change(screen.getByLabelText(/Buyer base units per 1 supplier order unit/i), {
      target: { value: '5' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create verified mapping' }));
    await waitFor(() => {
      expect(screen.getByText(MAPPING_REFUSAL_COPY.SEMANTIC_NOT_CONFIRMED)).toBeTruthy();
    });
  });

  it('shows INVALID_FACTOR when trying to create with invalid factor', async () => {
    await setupForm();
    lookupPartnerSkuMock.mockResolvedValue({
      catalogItemId: 'cat-1',
      displayName: 'Item 1',
      partnerSku: 'SKU123',
      orderUnit: 'PACK',
    });
    executeLookup();
    await completeForm();

    fireEvent.click(
      screen.getByLabelText(/I confirm both records refer to the same real-world item/i),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create verified mapping' }));
    await waitFor(() => {
      expect(screen.getByText(MAPPING_REFUSAL_COPY.INVALID_FACTOR)).toBeTruthy();
    });
  });

  it('shows STALE_CONNECTION when create fails with CONNECTION_NOT_ACTIVE', async () => {
    await setupForm();
    lookupPartnerSkuMock.mockResolvedValue({
      catalogItemId: 'cat-1',
      displayName: 'Item 1',
      partnerSku: 'SKU123',
      orderUnit: 'PACK',
    });
    executeLookup();
    await completeForm();

    fireEvent.click(
      screen.getByLabelText(/I confirm both records refer to the same real-world item/i),
    );
    fireEvent.change(screen.getByLabelText(/Buyer base units per 1 supplier order unit/i), {
      target: { value: '5' },
    });

    createVerifiedMappingMock.mockRejectedValue({ details: { reason: 'CONNECTION_NOT_ACTIVE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create verified mapping' }));

    await waitFor(() => {
      expect(screen.getByText(MAPPING_REFUSAL_COPY.STALE_CONNECTION)).toBeTruthy();
    });
  });

  it('shows DUPLICATE_MAPPING when create fails with MAPPING_EXISTS', async () => {
    await setupForm();
    lookupPartnerSkuMock.mockResolvedValue({
      catalogItemId: 'cat-1',
      displayName: 'Item 1',
      partnerSku: 'SKU123',
      orderUnit: 'PACK',
    });
    executeLookup();
    await completeForm();

    fireEvent.click(
      screen.getByLabelText(/I confirm both records refer to the same real-world item/i),
    );
    fireEvent.change(screen.getByLabelText(/Buyer base units per 1 supplier order unit/i), {
      target: { value: '5' },
    });

    createVerifiedMappingMock.mockRejectedValue({ details: { reason: 'MAPPING_EXISTS' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create verified mapping' }));

    await waitFor(() => {
      expect(screen.getByText(MAPPING_REFUSAL_COPY.DUPLICATE_MAPPING)).toBeTruthy();
    });
  });
});
