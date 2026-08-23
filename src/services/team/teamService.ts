import type { Member, MemberStatus } from '@stockmok/shared';

import {
  executeChangeMemberRoleCommand,
  executeCreateInvitationCommand,
  executeRevokeInvitationCommand,
  executeSetMemberStatusCommand,
  fetchPendingTeamInvitations,
  fetchTeamMembers,
  type AssignableTeamRole,
  type OneTimeInvitationToken,
  type PendingTeamInvitation,
} from '@/data/adapters/teamAdapter';

export type { AssignableTeamRole, PendingTeamInvitation };

export const ASSIGNABLE_TEAM_ROLES: readonly AssignableTeamRole[] = [
  'ADMIN',
  'INVENTORY_MANAGER',
  'PROCUREMENT_MANAGER',
  'STOREKEEPER',
  'ANALYST',
  'VIEWER',
];

export const TEAM_ROLE_LABELS: Readonly<Record<AssignableTeamRole | 'OWNER', string>> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  INVENTORY_MANAGER: 'Inventory Manager',
  PROCUREMENT_MANAGER: 'Procurement Manager',
  STOREKEEPER: 'Storekeeper',
  ANALYST: 'Analyst',
  VIEWER: 'Viewer',
};

export function isProtectedOwner(member: Member, ownerUid: string): boolean {
  return member.uid === ownerUid || member.role === 'OWNER';
}

function assertOrdinaryMember(member: Member, ownerUid: string): void {
  if (isProtectedOwner(member, ownerUid)) {
    throw new Error('The canonical Owner cannot be changed, suspended, or removed.');
  }
}

export function listTeamMembers(orgId: string): Promise<readonly Member[]> {
  return fetchTeamMembers(orgId);
}

export function listPendingInvitations(orgId: string): Promise<readonly PendingTeamInvitation[]> {
  return fetchPendingTeamInvitations(orgId);
}

export function createInvitation(
  orgId: string,
  operationId: string,
  input: { readonly email: string; readonly role: AssignableTeamRole },
): Promise<OneTimeInvitationToken> {
  return executeCreateInvitationCommand(orgId, operationId, {
    email: input.email.trim().toLowerCase(),
    role: input.role,
  });
}

export function revokeInvitation(orgId: string, invitationId: string): Promise<void> {
  return executeRevokeInvitationCommand(orgId, invitationId);
}

export function changeMemberRole(
  orgId: string,
  ownerUid: string,
  member: Member,
  role: AssignableTeamRole,
): Promise<void> {
  assertOrdinaryMember(member, ownerUid);
  return executeChangeMemberRoleCommand(orgId, member.uid, role);
}

export function setMemberStatus(
  orgId: string,
  ownerUid: string,
  member: Member,
  status: MemberStatus,
): Promise<void> {
  assertOrdinaryMember(member, ownerUid);
  return executeSetMemberStatusCommand(orgId, member.uid, status);
}

export function buildOneTimeInvitationLink(token: string, origin: string): string {
  return new URL(`/invite/${encodeURIComponent(token)}`, origin).toString();
}
