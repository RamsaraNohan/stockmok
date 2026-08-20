// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PartnerCreateScreen } from '@/features/procurement/partners/PartnerCreateScreen';
import { PartnerDetailScreen } from '@/features/procurement/partners/PartnerDetailScreen';
import { SupplierListScreen } from '@/features/procurement/partners/SupplierListScreen';
import { BuyerListScreen } from '@/features/procurement/partners/BuyerListScreen';
import * as partnerAdapter from '@/data/adapters/partnerAdapter';

vi.mock('@/data/adapters/partnerAdapter', () => ({
  executePartnerCreate: vi.fn(),
  executePartnerUpdate: vi.fn(),
  executePartnerSetStatusCommand: vi.fn(),
}));

const mockUser = { uid: 'user-123', email: 'test@example.com' } as any;
const mockOrg = { organizationId: 'org-123', name: 'Test Org' } as any;

vi.mock('@/services/auth/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/services/workspace/useWorkspace', () => ({
  useWorkspace: () => ({ activeOrg: mockOrg, user: mockUser }),
}));

const mockRepositories = {
  partners: {
    listPrivate: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    getPrivate: vi.fn().mockResolvedValue({
      partnerId: 'partner-1',
      name: 'Test Partner',
      partnerTypes: ['SUPPLIER'],
      status: 'ACTIVE',
      ordersPlacedCount: 0,
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
    // Render supplier list
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

    // Render buyer list
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

    // Check that status and ordersPlacedCount are not in payload (they are added in adapter)
    const payload = vi.mocked(partnerAdapter.executePartnerCreate).mock.calls[0][2];
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
