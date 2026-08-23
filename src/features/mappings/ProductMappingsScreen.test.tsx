// @vitest-environment jsdom

import type { ProductMapping } from '@stockmok/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { disableMappingMock, listMappingsMock, useRepositoriesMock, useWorkspaceMock } = vi.hoisted(
  () => ({
    disableMappingMock: vi.fn(),
    listMappingsMock: vi.fn(),
    useRepositoriesMock: vi.fn(),
    useWorkspaceMock: vi.fn(),
  }),
);

vi.mock('@/services/data/useRepositories', () => ({ useRepositories: useRepositoriesMock }));
vi.mock('@/services/workspace/useWorkspace', () => ({ useWorkspace: useWorkspaceMock }));
vi.mock('@/services/mappings/mappingService', () => ({
  canManageMappings: (role: string | null) =>
    role === 'OWNER' || role === 'ADMIN' || role === 'PROCUREMENT_MANAGER',
  disableMapping: disableMappingMock,
  formatFactorMilli: (value: number) => String(value / 1000),
  listMappings: listMappingsMock,
}));

import { ProductMappingsScreen } from './ProductMappingsScreen';

const verifiedMapping = {
  mappingId: 'mapping-verified',
  connectionId: 'connection-1',
  buyerOrgId: 'buyer-org',
  buyerProductId: 'product-1',
  buyerProductNameSnapshot: 'Chicken Breast',
  buyerSkuSnapshot: 'MEAT-001',
  supplierOrgId: 'supplier-org',
  supplierCatalogItemId: 'catalog-1',
  supplierPartnerSkuSnapshot: 'CKN-B5',
  supplierDisplayNameSnapshot: 'Fresh Chicken Breast 5 KG Pack',
  buyerBaseUnit: 'KG',
  supplierOrderUnit: 'PACK',
  supplierToBuyerBaseFactorMilli: 5000,
  semanticConfirmedByUid: 'user-1',
  semanticConfirmedByName: 'Nimal Perera',
  semanticConfirmedAt: { toDate: () => new Date('2026-08-21T00:00:00Z') },
  status: 'VERIFIED',
  createdAt: { toDate: () => new Date('2026-08-21T00:00:00Z') },
} as ProductMapping;

const disabledMapping = {
  ...verifiedMapping,
  mappingId: 'mapping-disabled',
  status: 'DISABLED',
  disabledAt: { toDate: () => new Date('2026-08-21T01:00:00Z') },
} as ProductMapping;

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/grand-ocean/network/mappings']}>
        <ProductMappingsScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductMappingsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRepositoriesMock.mockReturnValue({ network: {} });
    useWorkspaceMock.mockReturnValue({
      activeMembership: { organizationId: 'buyer-org' },
      activeRole: 'PROCUREMENT_MANAGER',
    });
    listMappingsMock.mockImplementation((_repositories: unknown, status: 'VERIFIED' | 'DISABLED') =>
      Promise.resolve({
        items: status === 'VERIFIED' ? [verifiedMapping] : [disabledMapping],
        nextCursor: null,
      }),
    );
    disableMappingMock.mockResolvedValue(undefined);
  });

  it('uses a named confirmation for C-26 and keeps the outcome durable', async () => {
    renderScreen();

    const disableButtons = await screen.findAllByRole('button', { name: 'Disable mapping' });
    const firstDisableButton = disableButtons.at(0);
    if (!firstDisableButton) throw new Error('Expected the responsive disable controls');
    fireEvent.click(firstDisableButton);
    expect(
      screen.getByRole('heading', { name: 'Disable mapping for Chicken Breast?' }),
    ).toBeTruthy();
    expect(screen.getByText(/This action has no restore path/)).toBeTruthy();

    const confirmButtons = screen.getAllByRole('button', { name: 'Disable mapping' });
    const confirmButton = confirmButtons.at(-1);
    if (!confirmButton) throw new Error('Expected the confirmation control');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(disableMappingMock).toHaveBeenCalledWith('buyer-org', 'mapping-verified');
    });
    expect(
      await screen.findByText(
        'Chicken Breast mapping disabled. Historical orders remain available.',
      ),
    ).toBeTruthy();
  });

  it('shows disabled mappings as terminal with no restore action', async () => {
    renderScreen();
    await screen.findAllByText('Chicken Breast');

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'DISABLED' } });

    expect(await screen.findByText(/Disabled mappings are retained/)).toBeTruthy();
    expect(await screen.findAllByText('No actions')).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: /restore/i })).toBeNull();
    expect(screen.queryByText(/^Pending$/i)).toBeNull();
    expect(screen.queryByText(/^Rejected$/i)).toBeNull();
  });
});
