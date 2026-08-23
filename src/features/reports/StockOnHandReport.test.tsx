// @vitest-environment jsdom

import type { ProductStockSummary } from '@stockmok/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';

import { ReportsScreen } from './ReportsScreen';

vi.mock('@/services/data/useRepositories', () => ({ useRepositories: vi.fn() }));
vi.mock('@/services/workspace/useWorkspace', () => ({ useWorkspace: vi.fn() }));

const chicken = {
  productId: 'meat-001',
  productName: 'Chicken Breast',
  internalSku: 'MEAT-001',
  internalSkuNormalized: 'meat-001',
  categoryId: 'category-meat',
  productStatus: 'ACTIVE',
  baseUnitPriceMinor: 125_000,
  productUpdatedAt: {} as ProductStockSummary['productUpdatedAt'],
  onHandMilli: 120_000,
  reservedMilli: 0,
  availableMilli: 120_000,
  minimumStockMilli: 10_000,
  stockStatus: 'IN_STOCK',
  stockValueMinor: 15_000_000,
  shortfallMilli: 0,
  unit: 'KG',
  updatedAt: {} as ProductStockSummary['updatedAt'],
} as unknown as ProductStockSummary;

function createRepositories() {
  return {
    inventory: {
      listCategories: vi.fn().mockResolvedValue({
        items: [{ categoryId: 'category-meat', name: 'Meat' }],
        nextCursor: null,
      }),
      listWarehouses: vi.fn().mockResolvedValue({
        items: [{ warehouseId: 'cold-room', name: 'Cold Room' }],
        nextCursor: null,
      }),
      listProducts: vi.fn().mockResolvedValue({ items: [chicken], nextCursor: null }),
    },
    reports: {
      listStockOnHand: vi.fn().mockResolvedValue({ items: [chicken], nextCursor: null }),
      listStockOnHandByCategory: vi.fn().mockResolvedValue({ items: [chicken], nextCursor: null }),
    },
  } as unknown as NonNullable<ReturnType<typeof useRepositories>>;
}

function renderReports(ui: ReactNode, route = '/app/grand-ocean/reports?tab=stock-on-hand') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('StockOnHandReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkspace).mockReturnValue({
      activeMembership: { organizationId: 'org-a' },
      activeSettings: { currency: 'LKR' },
      activeRole: 'VIEWER',
    } as ReturnType<typeof useWorkspace>);
  });

  it('renders exact report fields, semantic table, labelled mobile cards, and desktop-only CSV', async () => {
    vi.mocked(useRepositories).mockReturnValue(createRepositories());

    renderReports(<ReportsScreen />);

    expect(await screen.findByRole('table')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Product' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'SKU' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Category' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'On hand' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Unit cost' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Stock value' })).toBeTruthy();
    expect(screen.getByLabelText('Store room')).toBeTruthy();
    expect(screen.queryByLabelText('Status')).toBeNull();
    expect(screen.getAllByText('Chicken Breast')).toHaveLength(2);
    expect(screen.getAllByText('120.000 KG').length).toBeGreaterThan(0);
    expect(screen.getByText(/Meat subtotal:/)).toBeTruthy();

    const exportButton = screen.getByRole('button', {
      name: 'Export current stock-on-hand page as CSV',
    });
    expect(exportButton.parentElement?.className).toContain('hidden');
    expect(exportButton.parentElement?.className).toContain('md:block');
    expect(screen.queryByRole('tab', { name: 'Purchase Orders' })).toBeNull();
  });

  it('applies only the governed store-room and category matrix shape', async () => {
    const repositories = createRepositories();
    vi.mocked(useRepositories).mockReturnValue(repositories);
    renderReports(<ReportsScreen />);

    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Store room'), { target: { value: 'cold-room' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'category-meat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() => {
      expect(repositories.inventory.listProducts).toHaveBeenCalledWith({
        productStatus: 'ACTIVE',
        warehouseId: 'cold-room',
        categoryId: 'category-meat',
        sort: 'name',
        limit: 25,
      });
    });
  });

  it('denies a typed purchase-order tab before mounting any stock query for Storekeeper', () => {
    const repositories = createRepositories();
    vi.mocked(useRepositories).mockReturnValue(repositories);
    vi.mocked(useWorkspace).mockReturnValue({
      activeMembership: { organizationId: 'org-a' },
      activeSettings: { currency: 'LKR' },
      activeRole: 'STOREKEEPER',
    } as ReturnType<typeof useWorkspace>);

    renderReports(<ReportsScreen />, '/app/grand-ocean/reports?tab=purchase-orders');

    expect(screen.getByRole('alert').textContent).toContain('Purchase-order report unavailable');
    expect(repositories.reports.listStockOnHand).not.toHaveBeenCalled();
    expect(repositories.inventory.listCategories).not.toHaveBeenCalled();
  });
});
