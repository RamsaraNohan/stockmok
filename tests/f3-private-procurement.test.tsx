// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PartnerCreateScreen } from '@/features/procurement/partners/PartnerCreateScreen';
import { PartnerDetailScreen } from '@/features/procurement/partners/PartnerDetailScreen';
import { SupplierListScreen } from '@/features/procurement/partners/SupplierListScreen';
import { BuyerListScreen } from '@/features/procurement/partners/BuyerListScreen';
import { PurchaseOrderCreateScreen } from '@/features/procurement/purchase-orders/PurchaseOrderCreateScreen';
import { PurchaseOrderDetailScreen } from '@/features/procurement/purchase-orders/PurchaseOrderDetailScreen';
import { ReceiveOrderScreen } from '@/features/procurement/receiving/ReceiveOrderScreen';

import * as partnerAdapter from '@/data/adapters/partnerAdapter';
import * as poAdapter from '@/data/adapters/poAdapter';

vi.mock('@/data/adapters/partnerAdapter', () => ({
  executePartnerCreate: vi.fn(),
  executePartnerUpdate: vi.fn(),
  executePartnerSetStatusCommand: vi.fn(),
}));

vi.mock('@/data/adapters/poAdapter', () => ({
  executePrivatePoHeaderCreate: vi.fn(),
  executePrivatePoHeaderUpdate: vi.fn(),
  executePrivatePoLineCreate: vi.fn(),
  executePrivatePoLineUpdate: vi.fn(),
  executePrivatePoLineRemove: vi.fn(),
  executePoOrderCommand: vi.fn(),
  executePoCancelCommand: vi.fn(),
  executePoReceiveCommand: vi.fn(),
}));

const mockUser = { uid: 'user-123', email: 'test@example.com' } as any;
const mockOrg = { organizationId: 'org-123', name: 'Test Org' } as any;
const mockSettings = { currency: 'USD' } as any;

vi.mock('@/services/auth/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/services/workspace/useWorkspace', () => ({
  useWorkspace: () => ({ activeOrg: mockOrg, activeSettings: mockSettings, user: mockUser }),
}));

const mockRepositories = {
  partners: {
    listPrivate: vi.fn().mockResolvedValue({
      items: [
        { partnerId: 'supplier-1', name: 'Acme Supplier', partnerTypes: ['SUPPLIER'], status: 'ACTIVE' }
      ],
      nextCursor: null
    }),
    getPrivate: vi.fn().mockResolvedValue({
      partnerId: 'partner-1',
      name: 'Test Partner',
      partnerTypes: ['SUPPLIER'],
      status: 'ACTIVE',
      ordersPlacedCount: 0,
    }),
  },
  procurement: {
    listOrders: vi.fn().mockResolvedValue({
      items: [
        { purchaseOrderId: 'po-1', counterpartyName: 'Acme Supplier', status: 'DRAFT', totalMinor: 10000, currency: 'USD' }
      ],
      nextCursor: null
    }),
    getOrder: vi.fn().mockResolvedValue({
      purchaseOrderId: 'po-1',
      counterpartyName: 'Acme Supplier',
      status: 'DRAFT',
      totalMinor: 10000,
      currency: 'USD',
      expectedDate: '2026-10-10'
    }),
    listOrderItems: vi.fn().mockResolvedValue({
      items: [
        { itemId: 'item-1', productName: 'Widget', orderedBuyerBaseMilli: 10000, receivedBuyerBaseMilli: 0 }
      ],
      nextCursor: null
    }),
  }
};

vi.mock('@/services/data/useRepositories', () => ({
  useRepositories: () => mockRepositories,
}));

function renderWithProviders(ui: React.ReactElement, route = '/app/test/procurement/suppliers') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('A7: Private Partners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Supplier and Buyer Q-031 request shapes & separate route/filter state', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/app/:handle/procurement/suppliers" element={<SupplierListScreen />} />
      </Routes>,
      '/app/test/procurement/suppliers'
    );
    await waitFor(() => {
      expect(mockRepositories.partners.listPrivate).toHaveBeenCalledWith('SUPPLIER', 'ACTIVE');
    });

    vi.clearAllMocks();

    renderWithProviders(
      <Routes>
        <Route path="/app/:handle/procurement/buyers" element={<BuyerListScreen />} />
      </Routes>,
      '/app/test/procurement/buyers'
    );
    await waitFor(() => {
      expect(mockRepositories.partners.listPrivate).toHaveBeenCalledWith('BUYER', 'ACTIVE');
    });
  });

  it('safe create boundary creates partner accurately without status', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/app/:handle/procurement/suppliers/new" element={<PartnerCreateScreen />} />
      </Routes>,
      '/app/test/procurement/suppliers/new'
    );

    const nameInput = screen.getByLabelText(/Name/i);
    await user.type(nameInput, 'Acme Corp');

    const createBtn = screen.getByRole('button', { name: /Create Partner/i });
    await user.click(createBtn);

    await waitFor(() => {
      expect(partnerAdapter.executePartnerCreate).toHaveBeenCalledWith(
        'org-123',
        expect.any(String),
        expect.objectContaining({
          name: 'Acme Corp',
          partnerTypes: ['SUPPLIER']
        }),
        'user-123'
      );
    });

    const payload = vi.mocked(partnerAdapter.executePartnerCreate).mock.calls[0]![2];
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('ordersPlacedCount');
  });

  it('C38 status change', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/app/:handle/procurement/suppliers/:partnerId" element={<PartnerDetailScreen />} />
      </Routes>,
      '/app/test/procurement/suppliers/partner-1'
    );

    const deactivateBtn = await screen.findByRole('button', { name: /Deactivate/i });
    await user.click(deactivateBtn);

    await waitFor(() => {
      expect(partnerAdapter.executePartnerSetStatusCommand).toHaveBeenCalledWith(
        'org-123',
        'partner-1',
        'DEACTIVATED'
      );
    });
  });
});

describe('A8: Private Purchase Orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates draft PO header safely', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/app/:handle/procurement/purchase-orders/new" element={<PurchaseOrderCreateScreen />} />
      </Routes>,
      '/app/test/procurement/purchase-orders/new'
    );

    const select = await screen.findByLabelText(/Supplier/i);
    await waitFor(() => {
      expect(screen.getByText('Acme Supplier')).toBeDefined();
    });
    await user.selectOptions(select, 'supplier-1');

    const createBtn = screen.getByRole('button', { name: /Create PO/i });
    await user.click(createBtn);

    await waitFor(() => {
      expect(poAdapter.executePrivatePoHeaderCreate).toHaveBeenCalledWith(
        'org-123',
        expect.any(String),
        expect.objectContaining({
          privateSupplierId: 'supplier-1',
          counterpartyName: 'Acme Supplier',
          currency: 'USD',
          totalMinor: 0
        }),
        'user-123'
      );
    });
  });

  it('C15 and C16 command executions', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/app/:handle/procurement/purchase-orders/:poId" element={<PurchaseOrderDetailScreen />} />
      </Routes>,
      '/app/test/procurement/purchase-orders/po-1'
    );

    const orderBtn = await screen.findByRole('button', { name: /Order/i });
    await user.click(orderBtn);

    await waitFor(() => {
      expect(poAdapter.executePoOrderCommand).toHaveBeenCalledWith('org-123', 'po-1');
    });

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(poAdapter.executePoCancelCommand).toHaveBeenCalledWith('org-123', 'po-1');
    });
  });
});

describe('A9: Private Receiving', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('C17 receive command execution', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/app/:handle/procurement/receiving/:poId" element={<ReceiveOrderScreen />} />
      </Routes>,
      '/app/test/procurement/receiving/po-1'
    );

    const inputs = await screen.findAllByRole('spinbutton');
    await user.type(inputs[0]!, '5');

    const receiveBtn = screen.getByRole('button', { name: /Receive/i });
    await user.click(receiveBtn);

    await waitFor(() => {
      expect(poAdapter.executePoReceiveCommand).toHaveBeenCalledWith(
        'org-123',
        'po-1',
        [{ itemId: 'item-1', quantityMinor: 5000 }],
        undefined
      );
    });
  });
});
