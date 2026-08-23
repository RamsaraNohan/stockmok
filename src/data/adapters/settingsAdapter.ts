import { createReadClient } from '@stockmok/data';
import type {
  CommandResult,
  Organization,
  OrganizationSettings,
  Warehouse,
} from '@stockmok/shared';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from '../firebase/client';

export interface SettingsRecords {
  readonly organization: Organization | null;
  readonly settings: OrganizationSettings | null;
  readonly warehouses: readonly Warehouse[];
}

export interface UpdateSettingsPayload {
  readonly name?: string;
  readonly industry?: string;
  readonly country?: string;
  readonly currency?: string;
  readonly timezone?: string;
  readonly lowStockNotificationsEnabled?: boolean;
  readonly networkEnabled?: boolean;
}

// SCREEN-028 reads only its frozen Q-006, Q-007 and Q-017 contracts.
export async function fetchSettingsRecords(orgId: string): Promise<SettingsRecords> {
  const client = createReadClient(db, { orgId });
  const [organization, settings, warehouses] = await Promise.all([
    client.get<Organization>('Q-006'),
    client.get<OrganizationSettings>('Q-007'),
    client.list<Warehouse>('Q-017', { status: 'ACTIVE' }),
  ]);

  return { organization, settings, warehouses: warehouses.items };
}

// C-02 org.updateSettings is non-idempotent and therefore has no operationId.
export async function executeUpdateSettingsCommand(
  orgId: string,
  payload: UpdateSettingsPayload,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'orgUpdateSettings',
  );
  await callable({ orgId, payload });
}
