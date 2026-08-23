import type { OrganizationDirectory } from '@stockmok/shared';
import type { ConnectionProjection, Role } from '@stockmok/shared';

import {
  executeConnectionDisableCommand as disableConnectionAdapter,
  executeConnectionRequestCommand as requestConnectionAdapter,
  executeConnectionRespondCommand as respondConnectionAdapter,
} from '@/data/adapters/networkAdapter';
import { fetchDirectoryByHandle } from '@/data/adapters/workspaceAdapter';

const HANDLE_PATTERN = /^[a-z0-9-]{3,30}$/;

export function normalizeBusinessHandle(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase();
}

export function isValidBusinessHandle(value: string): boolean {
  return HANDLE_PATTERN.test(normalizeBusinessHandle(value));
}

export async function findBusinessByHandle(handle: string): Promise<OrganizationDirectory | null> {
  const normalizedHandle = normalizeBusinessHandle(handle);
  if (!HANDLE_PATTERN.test(normalizedHandle)) return null;
  return fetchDirectoryByHandle(normalizedHandle);
}

export async function requestSupplierConnection(
  orgId: string,
  supplierHandle: string,
  operationId: string,
): Promise<void> {
  return requestConnectionAdapter(orgId, normalizeBusinessHandle(supplierHandle), operationId);
}

export function getConnectionCounterparty(
  connection: ConnectionProjection,
  organizationId: string,
): { readonly handle: string; readonly name: string; readonly direction: 'INCOMING' | 'OUTGOING' } {
  if (connection.buyerOrgId === organizationId) {
    return {
      handle: connection.supplierHandle,
      name: connection.supplierName,
      direction: 'OUTGOING',
    };
  }
  return {
    handle: connection.buyerHandle,
    name: connection.buyerName,
    direction: 'INCOMING',
  };
}

export function canRespondToConnection(
  connection: ConnectionProjection,
  organizationId: string,
  role: Role | null,
): boolean {
  return (
    connection.status === 'PENDING' &&
    connection.supplierOrgId === organizationId &&
    (role === 'OWNER' || role === 'ADMIN' || role === 'PROCUREMENT_MANAGER')
  );
}

export function canDisableConnection(connection: ConnectionProjection, role: Role | null): boolean {
  return connection.status === 'ACTIVE' && (role === 'OWNER' || role === 'ADMIN');
}

export async function respondToConnection(
  orgId: string,
  connectionId: string,
  response: 'ACCEPT' | 'REJECT',
  operationId: string,
): Promise<void> {
  return respondConnectionAdapter(orgId, connectionId, response, operationId);
}

export async function disableConnection(orgId: string, connectionId: string): Promise<void> {
  return disableConnectionAdapter(orgId, connectionId);
}
