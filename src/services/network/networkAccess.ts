import type { Role } from '@stockmok/shared';

export const NETWORK_ROLES = [
  'OWNER',
  'ADMIN',
  'PROCUREMENT_MANAGER',
] as const satisfies readonly Role[];

export function canAccessNetwork(role: Role | null, networkEnabled: boolean): boolean {
  return (
    role !== null &&
    NETWORK_ROLES.includes(role as (typeof NETWORK_ROLES)[number]) &&
    networkEnabled
  );
}
