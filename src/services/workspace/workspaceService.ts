import type { OrganizationDirectory } from '@stockmok/shared';
import {
  executeAcceptInvitationCommand as acceptInviteAdapter,
  executeCreateOrgCommand as createOrgAdapter,
  fetchDirectoryByHandle as directoryAdapter,
} from '@/data/adapters/workspaceAdapter';

export async function fetchDirectoryByHandle(
  handle: string,
): Promise<OrganizationDirectory | null> {
  return directoryAdapter(handle);
}

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
  return createOrgAdapter(payload);
}

export async function executeAcceptInvitationCommand(payload: {
  readonly token: string;
}): Promise<{ readonly organizationId: string }> {
  return acceptInviteAdapter(payload);
}
