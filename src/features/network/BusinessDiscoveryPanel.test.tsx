// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConnectionProjection, OrganizationDirectory } from '@stockmok/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as NetworkServiceModule from '@/services/network/networkService';

import { BusinessDiscoveryPanel } from './BusinessDiscoveryPanel';

const networkMocks = vi.hoisted(() => ({
  findBusinessByHandle: vi.fn(),
  requestSupplierConnection: vi.fn(),
}));

vi.mock('@/services/network/networkService', async (importOriginal) => ({
  ...(await importOriginal<typeof NetworkServiceModule>()),
  findBusinessByHandle: networkMocks.findBusinessByHandle,
  requestSupplierConnection: networkMocks.requestSupplierConnection,
}));

vi.mock('@/services/workspace/useWorkspace', () => ({
  useWorkspace: () => ({
    activeMembership: {
      organizationId: 'grand-org',
      handle: 'grand-table',
    },
  }),
}));

const directory = {
  organizationId: 'fresh-org',
  handle: 'freshfoods',
  name: 'Fresh Foods Ltd',
  monogram: 'FF',
  monogramColor: '#166534',
  industry: 'Food supplier',
  country: 'LK',
} as OrganizationDirectory;

function renderPanel(connections: readonly ConnectionProjection[] = []) {
  return render(<BusinessDiscoveryPanel connections={connections} isOpen onClose={vi.fn()} />);
}

describe('BusinessDiscoveryPanel', () => {
  beforeEach(() => {
    networkMocks.findBusinessByHandle.mockReset();
    networkMocks.requestSupplierConnection.mockReset();
  });

  it('blocks a self handle without issuing Q-001', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByLabelText('Business handle'), '@grand-table');
    await user.click(screen.getByRole('button', { name: 'Find business' }));

    expect(screen.getByText('You cannot connect this workspace to itself.')).toBeTruthy();
    expect(networkMocks.findBusinessByHandle).not.toHaveBeenCalled();
  });

  it('renders only the safe exact-handle directory result and sends C-18', async () => {
    const user = userEvent.setup();
    networkMocks.findBusinessByHandle.mockResolvedValue(directory);
    networkMocks.requestSupplierConnection.mockResolvedValue(undefined);
    renderPanel();

    await user.type(screen.getByLabelText('Business handle'), '@FreshFoods');
    await user.click(screen.getByRole('button', { name: 'Find business' }));

    expect(await screen.findByRole('heading', { name: 'Fresh Foods Ltd' })).toBeTruthy();
    expect(screen.getByText('@freshfoods')).toBeTruthy();
    expect(screen.getByText('Food supplier · LK')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Connect as Supplier' }));

    expect(networkMocks.requestSupplierConnection).toHaveBeenCalledWith(
      'grand-org',
      'freshfoods',
      expect.any(String),
    );
    expect(await screen.findByText('Connection request sent.')).toBeTruthy();
  });

  it('does not offer another request for a pending connection', async () => {
    const user = userEvent.setup();
    networkMocks.findBusinessByHandle.mockResolvedValue(directory);
    renderPanel([
      {
        buyerOrgId: 'grand-org',
        supplierOrgId: 'fresh-org',
        status: 'PENDING',
      } as ConnectionProjection,
    ]);

    await user.type(screen.getByLabelText('Business handle'), 'freshfoods');
    await user.click(screen.getByRole('button', { name: 'Find business' }));

    expect(await screen.findByText('A connection request is already pending.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Connect as Supplier' })).toBeNull();
  });
});
