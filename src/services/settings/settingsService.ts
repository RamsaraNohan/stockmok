import type { Warehouse } from '@stockmok/shared';

import {
  executeUpdateSettingsCommand,
  fetchSettingsRecords,
  type UpdateSettingsPayload,
} from '@/data/adapters/settingsAdapter';

export interface SettingsPageData {
  readonly organizationId: string;
  readonly name: string;
  readonly handle: string;
  readonly industry: string;
  readonly country: string;
  readonly defaultWarehouseId: string;
  readonly defaultWarehouseName: string;
  readonly currency: string;
  readonly timezone: string;
  readonly lowStockNotificationsEnabled: boolean;
  readonly purchaseOrderPrefix: string;
  readonly quantityPrecision: 3;
  readonly networkEnabled: boolean;
  readonly activeWarehouses: readonly Warehouse[];
}

export interface OrganizationProfileInput {
  readonly name: string;
  readonly industry: string;
  readonly country: string;
}

export interface BusinessDefaultsInput {
  readonly currency: string;
  readonly timezone: string;
  readonly lowStockNotificationsEnabled: boolean;
  readonly networkEnabled: boolean;
}

function toPageData(records: Awaited<ReturnType<typeof fetchSettingsRecords>>): SettingsPageData {
  if (!records.organization || !records.settings) {
    throw new Error('Organization settings are unavailable.');
  }

  const defaultWarehouse = records.warehouses.find(
    (warehouse) => warehouse.warehouseId === records.settings?.defaultWarehouseId,
  );

  return {
    organizationId: records.organization.organizationId,
    name: records.organization.name,
    handle: records.organization.handle,
    industry: records.organization.industry,
    country: records.organization.country,
    defaultWarehouseId: records.settings.defaultWarehouseId,
    defaultWarehouseName: defaultWarehouse?.name ?? 'Unavailable or archived warehouse',
    currency: records.settings.currency,
    timezone: records.settings.timezone,
    lowStockNotificationsEnabled: records.settings.lowStockNotificationsEnabled,
    purchaseOrderPrefix: records.settings.purchaseOrderPrefix,
    quantityPrecision: records.settings.quantityPrecision,
    networkEnabled: records.settings.networkEnabled,
    activeWarehouses: records.warehouses,
  };
}

export async function loadSettingsPage(orgId: string): Promise<SettingsPageData> {
  return toPageData(await fetchSettingsRecords(orgId));
}

async function updateAndReload(
  orgId: string,
  payload: UpdateSettingsPayload,
): Promise<SettingsPageData> {
  await executeUpdateSettingsCommand(orgId, payload);
  return loadSettingsPage(orgId);
}

export async function saveOrganizationProfile(
  orgId: string,
  input: OrganizationProfileInput,
): Promise<SettingsPageData> {
  return updateAndReload(orgId, input);
}

export async function saveBusinessDefaults(
  orgId: string,
  input: BusinessDefaultsInput,
): Promise<SettingsPageData> {
  return updateAndReload(orgId, input);
}
