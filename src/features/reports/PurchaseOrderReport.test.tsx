// @vitest-environment jsdom

import type { PurchaseOrder } from '@stockmok/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';

import { ReportsScreen } from './ReportsScreen';

vi.mock('@/services/data/useRepositories', () => ({ useRepositories: vi.fn() }));
vi.mock('@/services/workspace/useWorkspace', () => ({ useWorkspace: vi.fn() }));
vi.mock('./PurchaseOrderStatusChart', () => ({
  default: ({ counts }: { readonly counts: readonly { readonly count: number }[] }) => (
    <div data-testid="status-chart">{counts.map(({ count }) => count).join(',')}</div>
  ),
}));

const timestamp = (iso: string) => ({ toDate: () => new Date(iso) }) as PurchaseOrder['createdAt'];

const order = {
  purchaseOrderId: 'po-1',
  orderNumber: 'PO-0042',
  viewRole: 'BUYER',
  supplierKind: 'PRIVATE',
  counterpartyName: 'Green Farm Poultry',
  status: 'ORDERED',
  currency: 'LKR',
  totalMinor: 6_000_000,
  isProjection: false,
  createdBy: 'user-1',
  createdAt: timestamp('2026-08-20T00:00:00.000Z'),
  expectedDate: timestamp('2026-08-25T00:00:00.000Z'),
} as PurchaseOrder;

function createRepositories() {
  return {
    inventory: {
      listCategories: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      listWarehouses: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      listProducts: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    },
    reports: {
      listStockOnHand: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      listStockOnHandByCategory: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      listPurchaseOrders: vi.fn().mockResolvedValue({ items: [order], nextCursor: null }),
      countStatusFamilies: vi.fn().mockResolvedValue([
        { queryId: 'Q-085', count: 2 },
        { queryId: 'Q-086', count: 9 },
        { queryId: 'Q-087', count: 4 },
        { queryId: 'Q-088', count: 6 },
        { queryId: 'Q-089', count: 1 },
      ]),
    },
    raw: { aggregate: vi.fn().mockResolvedValue({ count: 4 }) },
  } as unknown as NonNullable<ReturnType<typeof useRepositories>>;
}

function renderReport() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/app/grand-ocean/reports?tab=purchase-orders']}>
      <QueryClientProvider client={client}>
        <ReportsScreen />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('PurchaseOrderReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkspace).mockReturnValue({
      activeMembership: { organizationId: 'org-a' },
      activeRole: 'ANALYST',
    } as ReturnType<typeof useWorkspace>);
  });

  it('renders TABLE-014 and a complete aggregation-backed text/chart alternative', async () => {
    const repositories = createRepositories();
    vi.mocked(useRepositories).mockReturnValue(repositories);

    renderReport();

    expect(await screen.findByRole('columnheader', { name: 'PO Number' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Counterparty' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Private/Connected' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Total' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Created' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Expected' })).toBeTruthy();
    expect(screen.getAllByText('PO-0042')).toHaveLength(2);
    expect((await screen.findByTestId('status-chart')).textContent).toBe('2,9,4,6,1');
    expect(repositories.reports.countStatusFamilies).toHaveBeenCalledWith(
      [
        ['DRAFT'],
        ['ORDERED', 'SUBMITTED'],
        ['ACCEPTED', 'SHIPPED', 'PARTIALLY_RECEIVED'],
        ['RECEIVED'],
        ['REJECTED', 'CANCELLED'],
      ],
      {},
    );

    const exportButton = screen.getByRole('button', {
      name: 'Export current purchase-order report page as CSV',
    });
    expect(exportButton.parentElement?.className).toContain('hidden');
    expect(exportButton.parentElement?.className).toContain('md:block');
  });

  it('applies the same governed family and kind filter to table and distribution', async () => {
    const repositories = createRepositories();
    vi.mocked(useRepositories).mockReturnValue(repositories);
    renderReport();
    await screen.findAllByText('Green Farm Poultry');

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ACTIVE' } });
    fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'CONNECTED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() => {
      expect(repositories.reports.listPurchaseOrders).toHaveBeenLastCalledWith(
        ['ACCEPTED', 'SHIPPED', 'PARTIALLY_RECEIVED'],
        { supplierKind: 'CONNECTED' },
        { limit: 25 },
      );
      expect(repositories.raw.aggregate).toHaveBeenCalledWith('Q-087', {
        statusFamily: ['ACCEPTED', 'SHIPPED', 'PARTIALLY_RECEIVED'],
        supplierKind: 'CONNECTED',
      });
    });
    expect(screen.getByText(/Filters applied: Active · Connected/)).toBeTruthy();
  });

  it('rejects an inverted date range without issuing another report read', async () => {
    const repositories = createRepositories();
    vi.mocked(useRepositories).mockReturnValue(repositories);
    renderReport();
    await screen.findAllByText('Green Farm Poultry');

    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-08-22' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-08-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(screen.getByRole('alert').textContent).toContain(
      'The start date must be on or before the end date.',
    );
    expect(repositories.reports.listPurchaseOrders).toHaveBeenCalledTimes(1);
  });
});
