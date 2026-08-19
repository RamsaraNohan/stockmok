import type {
  Member,
  Organization,
  OrganizationDirectory,
  OrganizationSettings,
  CommandResult,
} from '@stockmok/shared';
import { createReadClient } from '@stockmok/data';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from '../firebase/client';

// Q-001: Public handle lookup from organizationDirectory/{handle}
export async function fetchDirectoryByHandle(
  handle: string,
): Promise<OrganizationDirectory | null> {
  const client = createReadClient(db, {});
  return await client.get<OrganizationDirectory>('Q-001', { handle: handle.toLowerCase() });
}

// Q-006: Organization document organizations/{orgId}
export async function fetchOrganization(orgId: string): Promise<Organization | null> {
  const client = createReadClient(db, { orgId });
  return await client.get<Organization>('Q-006');
}

// Q-007: Organization settings organizations/{orgId}/settings/main
export async function fetchOrganizationSettings(
  orgId: string,
): Promise<OrganizationSettings | null> {
  const client = createReadClient(db, { orgId });
  return await client.get<OrganizationSettings>('Q-007');
}

// Q-008: Realtime member document organizations/{orgId}/members/{uid}
export function subscribeToMemberDoc(
  orgId: string,
  uid: string,
  onUpdate: (member: Member | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const client = createReadClient(db, { orgId, uid });
  return client.subscribe<Member>('Q-008', {}, onUpdate, (error) => {
    if (onError) onError(error instanceof Error ? error : new Error(String(error)));
  });
}

// C-01: org.create Command Adapter (authorization: AUTHENTICATED)
export async function executeCreateOrgCommand(payload: {
  readonly name: string;
  readonly handle: string;
  readonly industry: string;
  readonly country: string;
  readonly currency: string;
  readonly timezone: string;
  readonly warehouseName: string;
  readonly warehouseType: string;
}): Promise<{ readonly organizationId: string }> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'orgCreate',
  );
  const response = await callable(payload);
  const result = response.data;
  return result.data as { readonly organizationId: string };
}

// C-03: user.bootstrapProfile Command Adapter (authorization: SELF)
export async function executeBootstrapProfileCommand(payload: {
  readonly displayName: string;
}): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'userBootstrapProfile',
  );
  await callable(payload);
}

// C-06: team.acceptInvitation Command Adapter (authorization: INVITEE)
export async function executeAcceptInvitationCommand(payload: {
  readonly token: string;
}): Promise<{ readonly organizationId: string }> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'teamAcceptInvitation',
  );
  const response = await callable(payload);
  const result = response.data;
  return result.data as { readonly organizationId: string };
}
