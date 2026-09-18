// @vitest-environment jsdom

import type { PurchaseOrder, PurchaseOrderItem } from '@stockmok/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useRepositoriesMock, useWorkspaceMock } = vi.hoisted(() => ({
  useRepositoriesMock: vi.fn(),
  useWorkspaceMock: vi.fn(),
}));

vi.mock('@/services/data/useRepositories', () => ({ useRepositories: useRepositoriesMock }));
vi.mock('@/services/workspace/useWorkspace', () => ({ useWorkspace: useWorkspaceMock }));

import { ConnectedReceiveOrderScreen } from './ConnectedReceiveOrderScreen';

const order = {
  purchaseOrderId: 'cpo-1',
  orderNumber: 'W01-2026-001',
  viewRole: 'BUYER',
  status: 'SHIPPED',
  counterpartyName: 'Supplier Co',
  receivingWarehouseId: 'warehouse-1',
} as unknown as PurchaseOrder;

const items = {
  items: [
    {
      itemId: 'line-1',
      buyerProductId: 'product-1',
      buyerProductNameSnapshot: 'Widget',
      supplierProductNameSnapshot: 'Widget Pack',
      orderedSupplierMilli: 1000,
      receivedSupplierMilli: 0,
      supplierOrderUnitSnapshot: 'PACK',
    } as unknown as PurchaseOrderItem,
  ],
};

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ConnectedReceiveOrderScreen initialOrder={order} poId="cpo-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ConnectedReceiveOrderScreen — receive-quantity input ids', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceMock.mockReturnValue({
      activeMembership: { organizationId: 'org-1', handle: 'qa-wide-01' },
    });
    useRepositoriesMock.mockReturnValue({
      procurement: {
        getOrder: vi.fn().mockResolvedValue(order),
        listOrderItems: vi.fn().mockResolvedValue(items),
      },
      inventory: {
        listWarehouses: vi
          .fn()
          .mockResolvedValue({ items: [{ warehouseId: 'warehouse-1', name: 'Main' }] }),
        listProductBalances: vi.fn().mockResolvedValue({ items: [] }),
      },
    });
  });

  it('renders the desktop and mobile receive-quantity inputs under distinct, non-duplicated DOM ids', async () => {
    renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Receipt lines')).toBeTruthy();
    });

    // Both layouts render unconditionally (CSS, not React, decides which is
    // visible at a given viewport), so both ids must exist exactly once each.
    expect(document.querySelectorAll('#receive-line-1')).toHaveLength(1);
    expect(document.querySelectorAll('#receive-mobile-line-1')).toHaveLength(1);

    const allIds = Array.from(document.querySelectorAll('[id]')).map((element) => element.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
