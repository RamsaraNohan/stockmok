// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadSettingsPage,
  saveBusinessDefaults,
  saveOrganizationProfile,
  type SettingsPageData,
} from '@/services/settings/settingsService';
import { useWorkspace } from '@/services/workspace/useWorkspace';

import { SettingsScreen } from './SettingsScreen';

vi.mock('@/services/settings/settingsService', () => ({
  loadSettingsPage: vi.fn(),
  saveBusinessDefaults: vi.fn(),
  saveOrganizationProfile: vi.fn(),
}));

vi.mock('@/services/workspace/useWorkspace', () => ({
  useWorkspace: vi.fn(),
}));

const pageData: SettingsPageData = {
  organizationId: 'org-a',
  name: 'Grand Ocean Hotel',
  handle: 'grand-ocean',
  industry: 'Hospitality',
  country: 'LK',
  defaultWarehouseId: 'warehouse-a',
  defaultWarehouseName: 'Cold Room',
  currency: 'LKR',
  timezone: 'Asia/Colombo',
  lowStockNotificationsEnabled: true,
  purchaseOrderPrefix: 'PO',
  quantityPrecision: 3,
  networkEnabled: true,
  activeWarehouses: [],
};

describe('SettingsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkspace).mockReturnValue({
      activeMembership: { organizationId: 'org-a' },
      activeRole: 'OWNER',
    } as ReturnType<typeof useWorkspace>);
    vi.mocked(loadSettingsPage).mockResolvedValue(pageData);
    vi.mocked(saveOrganizationProfile).mockResolvedValue(pageData);
    vi.mocked(saveBusinessDefaults).mockResolvedValue(pageData);
  });

  it('renders immutable handle and quantity precision with supported settings', async () => {
    render(<SettingsScreen />);

    const handle = await screen.findByLabelText('Handle');
    const precision = screen.getByLabelText('Quantity precision');
    expect(handle).toHaveProperty('value', '@grand-ocean');
    expect(handle.getAttribute('readonly')).not.toBeNull();
    expect(precision).toHaveProperty('value', '3');
    expect(precision.getAttribute('readonly')).not.toBeNull();
    expect(screen.getByLabelText('Default warehouse')).toHaveProperty('value', 'Cold Room');
    expect(screen.getByLabelText('Purchase order prefix')).toHaveProperty('value', 'PO');
  });

  it('retains valid profile input when C-02 fails', async () => {
    vi.mocked(saveOrganizationProfile).mockRejectedValueOnce(new Error('Please try again.'));
    render(<SettingsScreen />);

    const name = await screen.findByLabelText(/Organization name/);
    fireEvent.change(name, { target: { value: 'Grand Ocean Resort' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save organization profile' }));

    expect(await screen.findByText('Please try again.')).toBeTruthy();
    expect(name).toHaveProperty('value', 'Grand Ocean Resort');
  });

  it('returns refreshed Network state through the integration callback', async () => {
    const onSettingsUpdated = vi.fn();
    const networkOff = { ...pageData, networkEnabled: false };
    vi.mocked(saveBusinessDefaults).mockResolvedValueOnce(networkOff);
    render(<SettingsScreen onSettingsUpdated={onSettingsUpdated} />);

    const networkSwitch = await screen.findByRole('switch', { name: /Network/ });
    fireEvent.click(networkSwitch);
    fireEvent.click(screen.getByRole('button', { name: 'Save business defaults' }));

    await waitFor(() => {
      expect(saveBusinessDefaults).toHaveBeenCalledWith('org-a', {
        currency: 'LKR',
        timezone: 'Asia/Colombo',
        lowStockNotificationsEnabled: true,
        networkEnabled: false,
      });
    });
    expect(onSettingsUpdated).toHaveBeenCalledWith(networkOff);
  });

  it('does not load settings for a role outside Owner/Admin', () => {
    vi.mocked(useWorkspace).mockReturnValue({
      activeMembership: { organizationId: 'org-a' },
      activeRole: 'STOREKEEPER',
    } as ReturnType<typeof useWorkspace>);

    render(<SettingsScreen />);

    expect(screen.getByText('Settings access is restricted')).toBeTruthy();
    expect(loadSettingsPage).not.toHaveBeenCalled();
  });
});
