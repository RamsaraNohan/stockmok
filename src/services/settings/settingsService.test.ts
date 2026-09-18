import type { Organization, OrganizationSettings, Warehouse } from '@stockmok/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  executeUpdateSettingsCommand,
  fetchSettingsRecords,
} from '@/data/adapters/settingsAdapter';

import { loadSettingsPage, saveBusinessDefaults, saveOrganizationProfile } from './settingsService';

vi.mock('@/data/adapters/settingsAdapter', () => ({
  executeUpdateSettingsCommand: vi.fn(),
  fetchSettingsRecords: vi.fn(),
}));

const organization = {
  organizationId: 'org-a',
  name: 'Grand Ocean Hotel',
  handle: 'grand-ocean',
  industry: 'Hospitality',
  country: 'LK',
} as Organization;

const settings = {
  defaultWarehouseId: 'warehouse-a',
  currency: 'LKR',
  timezone: 'Asia/Colombo',
  lowStockNotificationsEnabled: true,
  purchaseOrderPrefix: 'PO',
  quantityPrecision: 3,
  networkEnabled: true,
} as OrganizationSettings;

const warehouse = { warehouseId: 'warehouse-a', name: 'Cold Room' } as Warehouse;

describe('settingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSettingsRecords).mockResolvedValue({
      organization,
      settings,
      warehouses: [warehouse],
    });
    vi.mocked(executeUpdateSettingsCommand).mockResolvedValue();
  });

  it('maps Q-006/Q-007/Q-017 records into the Settings integration surface', async () => {
    await expect(loadSettingsPage('org-a')).resolves.toMatchObject({
      handle: 'grand-ocean',
      defaultWarehouseName: 'Cold Room',
      purchaseOrderPrefix: 'PO',
      quantityPrecision: 3,
      networkEnabled: true,
    });
    expect(fetchSettingsRecords).toHaveBeenCalledWith('org-a');
  });

  it('forwards only the supported C-02 profile fields and reloads the snapshot', async () => {
    await saveOrganizationProfile('org-a', {
      name: 'Grand Ocean Resort',
      industry: 'Hospitality',
      country: 'LK',
    });

    expect(executeUpdateSettingsCommand).toHaveBeenCalledWith('org-a', {
      name: 'Grand Ocean Resort',
      industry: 'Hospitality',
      country: 'LK',
    });
    expect(fetchSettingsRecords).toHaveBeenCalledTimes(1);
  });

  it('forwards only supported A/B defaults and feature flags', async () => {
    await saveBusinessDefaults('org-a', {
      currency: 'LKR',
      timezone: 'Asia/Colombo',
      lowStockNotificationsEnabled: false,
      networkEnabled: false,
    });

    expect(executeUpdateSettingsCommand).toHaveBeenCalledWith('org-a', {
      currency: 'LKR',
      timezone: 'Asia/Colombo',
      lowStockNotificationsEnabled: false,
      networkEnabled: false,
    });
  });
});
