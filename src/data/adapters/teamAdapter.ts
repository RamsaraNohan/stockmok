import { createReadClient } from '@stockmok/data';
import type { CommandResult, Invitation, Member, MemberStatus, Role } from '@stockmok/shared';
import { Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from '../firebase/client';

const TEAM_PAGE_LIMIT = 25;

export type AssignableTeamRole = Exclude<Role, 'OWNER'>;

export interface PendingTeamInvitation {
  readonly invitationId: string;
  readonly email: string;
  readonly role: AssignableTeamRole;
  readonly status: 'PENDING';
  readonly expiresAt: Invitation['expiresAt'];
  readonly createdAt: Invitation['createdAt'];
  readonly createdBy: string;
}

export interface OneTimeInvitationToken {
  readonly invitationId: string;
  readonly token: string;
}

function commandData(response: Extract<CommandResult, { ok: true }>): Record<string, unknown> {
  return response.data;
}

async function executeCommand(
  functionName: string,
  envelope: Readonly<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    functionName,
  );
  const response = await callable(envelope);
  return commandData(response.data);
}

// Q-009: one bounded page, ordered by joinedAt ASC by the frozen query plan.
export async function fetchTeamMembers(orgId: string): Promise<readonly Member[]> {
  const client = createReadClient(db, { orgId });
  const page = await client.list<Member>('Q-009', {}, { limit: TEAM_PAGE_LIMIT });
  return page.items;
}

// Q-010: only unexpired PENDING invitations. The raw token hash is intentionally
// discarded at the adapter boundary and cannot reach feature state or rendering.
export async function fetchPendingTeamInvitations(
  orgId: string,
): Promise<readonly PendingTeamInvitation[]> {
  const client = createReadClient(db, { orgId });
  const page = await client.list<Invitation>(
    'Q-010',
    { now: Timestamp.now() },
    { limit: TEAM_PAGE_LIMIT },
  );
  return page.items.map((invitation) => ({
    invitationId: invitation.invitationId,
    email: invitation.emailNormalized,
    role: invitation.role,
    status: 'PENDING',
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    createdBy: invitation.createdBy,
  }));
}

// C-04: idempotent. The caller owns operationId so a focused retry can reuse it.
export async function executeCreateInvitationCommand(
  orgId: string,
  operationId: string,
  payload: { readonly email: string; readonly role: AssignableTeamRole },
): Promise<OneTimeInvitationToken> {
  const data = await executeCommand('teamCreateInvitation', { orgId, operationId, payload });
  const invitationId = data.invitationId;
  const token = data.token;
  if (typeof invitationId !== 'string' || typeof token !== 'string') {
    throw new Error('The invitation command returned an invalid result.');
  }
  return { invitationId, token };
}

// C-05: non-idempotent.
export async function executeRevokeInvitationCommand(
  orgId: string,
  invitationId: string,
): Promise<void> {
  await executeCommand('teamRevokeInvitation', {
    orgId,
    payload: { invitationId },
  });
}

// C-07: non-idempotent.
export async function executeChangeMemberRoleCommand(
  orgId: string,
  uid: string,
  role: AssignableTeamRole,
): Promise<void> {
  await executeCommand('teamChangeMemberRole', {
    orgId,
    payload: { uid, role },
  });
}

// C-08: non-idempotent.
export async function executeSetMemberStatusCommand(
  orgId: string,
  uid: string,
  status: MemberStatus,
): Promise<void> {
  await executeCommand('teamSetMemberStatus', {
    orgId,
    payload: { uid, status },
  });
}
