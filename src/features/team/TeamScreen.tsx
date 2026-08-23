import type { Member, MemberStatus } from '@stockmok/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useWorkspace } from '@/services/workspace/useWorkspace';
import {
  ASSIGNABLE_TEAM_ROLES,
  TEAM_ROLE_LABELS,
  buildOneTimeInvitationLink,
  changeMemberRole,
  createInvitation,
  isProtectedOwner,
  listPendingInvitations,
  listTeamMembers,
  revokeInvitation,
  setMemberStatus,
  type AssignableTeamRole,
  type PendingTeamInvitation,
} from '@/services/team/teamService';
import { Button } from '@/ui/primitives/Button';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Input } from '@/ui/primitives/Input';
import { Modal } from '@/ui/primitives/Modal';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { StatusPill } from '@/ui/primitives/StatusPill';
import { PageHeader } from '@/ui/shell/PageHeader';

interface MemberAction {
  readonly member: Member;
  readonly kind: 'ROLE' | 'SUSPEND' | 'REACTIVATE' | 'REMOVE';
}

interface OneTimeInvitationView {
  readonly invitationId: string;
  readonly email: string;
  readonly role: AssignableTeamRole;
  readonly token: string;
  readonly expiresAt: PendingTeamInvitation['expiresAt'] | null;
}

function readableRole(role: Member['role']): string {
  return TEAM_ROLE_LABELS[role];
}

function readableDate(value: { readonly toDate: () => Date }): string {
  return value.toDate().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function mutationMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Nothing has been changed. Try again.';
}

export function TeamScreen() {
  const { activeMembership, activeOrg, activeRole } = useWorkspace();
  const queryClient = useQueryClient();
  const orgId = activeMembership?.organizationId;
  const ownerUid = activeOrg?.ownerUid;
  const canManageTeam = activeRole === 'OWNER' || activeRole === 'ADMIN';

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AssignableTeamRole>('VIEWER');
  const [inviteOperationId, setInviteOperationId] = useState<string | null>(null);
  const [inviteValidation, setInviteValidation] = useState<string | null>(null);
  const [oneTimeInvitation, setOneTimeInvitation] = useState<OneTimeInvitationView | null>(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [memberAction, setMemberAction] = useState<MemberAction | null>(null);
  const [selectedRole, setSelectedRole] = useState<AssignableTeamRole>('VIEWER');
  const [revokeTarget, setRevokeTarget] = useState<PendingTeamInvitation | null>(null);

  const membersQuery = useQuery({
    queryKey: ['team', orgId, 'members'],
    queryFn: () => listTeamMembers(orgId as string),
    enabled: Boolean(orgId && canManageTeam),
  });
  const invitationsQuery = useQuery({
    queryKey: ['team', orgId, 'invitations'],
    queryFn: () => listPendingInvitations(orgId as string),
    enabled: Boolean(orgId && canManageTeam),
  });

  const membersByUid = useMemo(
    () => new Map((membersQuery.data ?? []).map((member) => [member.uid, member])),
    [membersQuery.data],
  );

  const refreshTeam = async () => {
    await queryClient.invalidateQueries({ queryKey: ['team', orgId] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !inviteOperationId) throw new Error('Workspace is unavailable.');
      const email = inviteEmail.trim();
      if (!email) {
        setInviteValidation('Enter the invited email address.');
        throw new Error('Enter the invited email address.');
      }
      setInviteValidation(null);
      const result = await createInvitation(orgId, inviteOperationId, {
        email,
        role: inviteRole,
      });
      const pending = await listPendingInvitations(orgId);
      const created = pending.find((invitation) => invitation.invitationId === result.invitationId);
      setOneTimeInvitation({
        ...result,
        email: email.toLowerCase(),
        role: inviteRole,
        expiresAt: created?.expiresAt ?? null,
      });
    },
    onSuccess: async () => {
      setInviteOpen(false);
      setInviteEmail('');
      setInviteOperationId(null);
      setCopyFeedback('');
      await refreshTeam();
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !revokeTarget) return;
      await revokeInvitation(orgId, revokeTarget.invitationId);
    },
    onSuccess: async () => {
      setRevokeTarget(null);
      await refreshTeam();
    },
  });

  const memberMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !ownerUid || !memberAction) return;
      if (memberAction.kind === 'ROLE') {
        await changeMemberRole(orgId, ownerUid, memberAction.member, selectedRole);
        return;
      }
      const nextStatus: MemberStatus =
        memberAction.kind === 'SUSPEND'
          ? 'SUSPENDED'
          : memberAction.kind === 'REACTIVATE'
            ? 'ACTIVE'
            : 'REMOVED';
      await setMemberStatus(orgId, ownerUid, memberAction.member, nextStatus);
    },
    onSuccess: async () => {
      setMemberAction(null);
      await refreshTeam();
    },
  });

  const openInvite = () => {
    setInviteEmail('');
    setInviteRole('VIEWER');
    setInviteValidation(null);
    setInviteOperationId(crypto.randomUUID());
    setInviteOpen(true);
  };

  const closeOneTimeInvitation = () => {
    setOneTimeInvitation(null);
    setCopyFeedback('');
    createMutation.reset();
  };

  if (!canManageTeam) {
    return (
      <ErrorState
        title="You do not have access to this page"
        message="Your role does not include permission to view or manage the Team page."
      />
    );
  }

  const oneTimeLink = oneTimeInvitation
    ? buildOneTimeInvitationLink(oneTimeInvitation.token, window.location.origin)
    : '';

  const memberActions = (member: Member) => {
    const protectedOwner = ownerUid ? isProtectedOwner(member, ownerUid) : true;
    if (protectedOwner) {
      return <span className="text-xs font-semibold text-text-muted">Protected Owner</span>;
    }
    return (
      <div className="flex flex-wrap justify-end gap-2 max-md:justify-start">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setSelectedRole(member.role === 'OWNER' ? 'VIEWER' : member.role);
            setMemberAction({ member, kind: 'ROLE' });
          }}
        >
          Change role
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setMemberAction({
              member,
              kind: member.status === 'ACTIVE' ? 'SUSPEND' : 'REACTIVATE',
            });
          }}
        >
          {member.status === 'ACTIVE' ? 'Suspend member' : 'Reactivate'}
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            setMemberAction({ member, kind: 'REMOVE' });
          }}
        >
          Remove member
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team"
        actions={
          <Button onClick={openInvite} variant="primary">
            Invite user
          </Button>
        }
      />

      {membersQuery.isLoading ? (
        <div className="space-y-3" aria-label="Loading team members">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : membersQuery.isError ? (
        <ErrorState
          title="Failed to load team"
          message="We could not load this workspace's team members."
          onRetry={() => {
            void membersQuery.refetch();
          }}
        />
      ) : membersQuery.data?.length ? (
        <section className="overflow-hidden rounded-panel border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-bold text-text">Team members</h2>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-background text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name and email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {membersQuery.data.map((member) => (
                  <tr key={member.uid}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-text">{member.displayName}</div>
                      <div className="text-xs text-text-muted">{member.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={member.role} label={readableRole(member.role)} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={member.status} />
                    </td>
                    <td className="px-4 py-3 text-text-muted">{readableDate(member.joinedAt)}</td>
                    <td className="px-4 py-3 text-right">{memberActions(member)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-border md:hidden">
            {membersQuery.data.map((member) => (
              <article key={member.uid} className="space-y-4 p-4">
                <div>
                  <h3 className="font-semibold text-text">{member.displayName}</h3>
                  <p className="text-sm text-text-muted">{member.email}</p>
                </div>
                <dl className="grid grid-cols-[6rem_1fr] items-center gap-x-3 gap-y-3 text-sm">
                  <dt className="font-semibold text-text-muted">Role</dt>
                  <dd>
                    <StatusPill status={member.role} label={readableRole(member.role)} />
                  </dd>
                  <dt className="font-semibold text-text-muted">Status</dt>
                  <dd>
                    <StatusPill status={member.status} />
                  </dd>
                  <dt className="font-semibold text-text-muted">Joined</dt>
                  <dd>{readableDate(member.joinedAt)}</dd>
                  <dt className="font-semibold text-text-muted">Actions</dt>
                  <dd>{memberActions(member)}</dd>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          title="No other team members yet"
          description="Invite a team member and assign the access they need."
          action={<Button onClick={openInvite}>Invite user</Button>}
        />
      )}

      <section className="overflow-hidden rounded-panel border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-bold text-text">Pending invitations</h2>
        </div>
        {invitationsQuery.isLoading ? (
          <div className="space-y-3 p-4" aria-label="Loading pending invitations">
            <Skeleton className="h-12 w-full" />
          </div>
        ) : invitationsQuery.isError ? (
          <div className="p-4">
            <ErrorState
              title="Failed to load invitations"
              message="Pending invitations could not be loaded."
              onRetry={() => {
                void invitationsQuery.refetch();
              }}
            />
          </div>
        ) : invitationsQuery.data?.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Offered role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Expires</th>
                    <th className="px-4 py-3 font-medium">Invited by</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invitationsQuery.data.map((invitation) => (
                    <tr key={invitation.invitationId}>
                      <td className="px-4 py-3 font-medium text-text">{invitation.email}</td>
                      <td className="px-4 py-3">{TEAM_ROLE_LABELS[invitation.role]}</td>
                      <td className="px-4 py-3">
                        <StatusPill status="PENDING" label="Pending" />
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {readableDate(invitation.expiresAt)}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {membersByUid.get(invitation.createdBy)?.displayName ?? 'Workspace admin'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setRevokeTarget(invitation);
                          }}
                        >
                          Revoke invitation
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-border md:hidden">
              {invitationsQuery.data.map((invitation) => (
                <article key={invitation.invitationId} className="space-y-4 p-4">
                  <h3 className="break-all font-semibold text-text">{invitation.email}</h3>
                  <dl className="grid grid-cols-[6rem_1fr] items-center gap-x-3 gap-y-3 text-sm">
                    <dt className="font-semibold text-text-muted">Offered role</dt>
                    <dd>{TEAM_ROLE_LABELS[invitation.role]}</dd>
                    <dt className="font-semibold text-text-muted">Status</dt>
                    <dd>
                      <StatusPill status="PENDING" label="Pending" />
                    </dd>
                    <dt className="font-semibold text-text-muted">Expires</dt>
                    <dd>{readableDate(invitation.expiresAt)}</dd>
                    <dt className="font-semibold text-text-muted">Invited by</dt>
                    <dd>
                      {membersByUid.get(invitation.createdBy)?.displayName ?? 'Workspace admin'}
                    </dd>
                  </dl>
                  <Button
                    className="w-full"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setRevokeTarget(invitation);
                    }}
                  >
                    Revoke invitation
                  </Button>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="p-4 text-sm text-text-muted">No pending invitations.</p>
        )}
      </section>

      <Modal
        isOpen={inviteOpen}
        onClose={() => {
          if (!createMutation.isPending) {
            setInviteOpen(false);
            setInviteOperationId(null);
            setInviteValidation(null);
          }
        }}
        title="Invite a team member"
        description="The invitation expires after 7 days and can be accepted only by the invited email address."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <Input
            id="team-invite-email"
            type="email"
            label="Email"
            value={inviteEmail}
            error={inviteValidation ?? undefined}
            disabled={createMutation.isPending}
            required
            onChange={(event) => {
              setInviteEmail(event.target.value);
              setInviteValidation(null);
            }}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-text" htmlFor="team-invite-role">
              Role
            </label>
            <select
              id="team-invite-role"
              className="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text focus-visible:outline-2 focus-visible:outline-primary"
              value={inviteRole}
              disabled={createMutation.isPending}
              onChange={(event) => {
                setInviteRole(event.target.value as AssignableTeamRole);
              }}
            >
              {ASSIGNABLE_TEAM_ROLES.map((role) => (
                <option key={role} value={role}>
                  {TEAM_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          {createMutation.isError && !inviteValidation && (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {mutationMessage(createMutation.error)}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={createMutation.isPending}
              onClick={() => {
                setInviteOpen(false);
                setInviteOperationId(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Invite user
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(oneTimeInvitation)}
        onClose={closeOneTimeInvitation}
        title="Invitation link created"
        description="Copy this link now. It is shown only once and no email has been sent."
      >
        {oneTimeInvitation && (
          <div className="space-y-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="font-semibold text-text-muted">Email</dt>
              <dd>{oneTimeInvitation.email}</dd>
              <dt className="font-semibold text-text-muted">Role</dt>
              <dd>{TEAM_ROLE_LABELS[oneTimeInvitation.role]}</dd>
              <dt className="font-semibold text-text-muted">Expiry</dt>
              <dd>
                {oneTimeInvitation.expiresAt
                  ? readableDate(oneTimeInvitation.expiresAt)
                  : '7 days after creation'}
              </dd>
            </dl>
            <div>
              <label className="text-sm font-bold text-text" htmlFor="one-time-invitation-link">
                Invitation link
              </label>
              <input
                id="one-time-invitation-link"
                readOnly
                value={oneTimeLink}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-xs text-text"
                onFocus={(event) => {
                  event.currentTarget.select();
                }}
              />
            </div>
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              This link will not be shown again after you close this dialog.
            </p>
            <p aria-live="polite" className="text-sm text-text-muted">
              {copyFeedback}
            </p>
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button
                variant="primary"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(oneTimeLink)
                    .then(() => {
                      setCopyFeedback('Invitation link copied.');
                    })
                    .catch(() => {
                      setCopyFeedback('Copy failed. Select and copy the link manually.');
                    });
                }}
              >
                Copy invitation link
              </Button>
              <Button variant="secondary" onClick={closeOneTimeInvitation}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(memberAction)}
        onClose={() => {
          if (!memberMutation.isPending) setMemberAction(null);
        }}
        title={
          memberAction?.kind === 'ROLE'
            ? `Change ${memberAction.member.displayName}'s role?`
            : memberAction?.kind === 'SUSPEND'
              ? `Suspend ${memberAction.member.displayName}?`
              : memberAction?.kind === 'REACTIVATE'
                ? `Reactivate ${memberAction.member.displayName}?`
                : `Remove ${memberAction?.member.displayName ?? 'member'}?`
        }
      >
        {memberAction && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              {memberAction.kind === 'ROLE'
                ? `Their access will update to ${TEAM_ROLE_LABELS[selectedRole]} across this workspace.`
                : memberAction.kind === 'SUSPEND'
                  ? 'They will lose access until reactivated. Their history will remain.'
                  : memberAction.kind === 'REACTIVATE'
                    ? 'They will regain access using their assigned role.'
                    : 'Their access will be removed permanently. Their history will remain.'}
            </p>
            {memberAction.kind === 'ROLE' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-text" htmlFor="member-new-role">
                  New role
                </label>
                <select
                  id="member-new-role"
                  value={selectedRole}
                  className="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text focus-visible:outline-2 focus-visible:outline-primary"
                  onChange={(event) => {
                    setSelectedRole(event.target.value as AssignableTeamRole);
                  }}
                >
                  {ASSIGNABLE_TEAM_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {TEAM_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {memberMutation.isError && (
              <p role="alert" className="text-sm font-semibold text-red-600">
                {mutationMessage(memberMutation.error)}
              </p>
            )}
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button
                variant="secondary"
                disabled={memberMutation.isPending}
                onClick={() => {
                  setMemberAction(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant={
                  memberAction.kind === 'SUSPEND' || memberAction.kind === 'REMOVE'
                    ? 'danger'
                    : 'primary'
                }
                isLoading={memberMutation.isPending}
                onClick={() => {
                  memberMutation.mutate();
                }}
              >
                {memberAction.kind === 'ROLE'
                  ? 'Change role'
                  : memberAction.kind === 'SUSPEND'
                    ? 'Suspend member'
                    : memberAction.kind === 'REACTIVATE'
                      ? 'Reactivate'
                      : 'Remove member'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(revokeTarget)}
        onClose={() => {
          if (!revokeMutation.isPending) setRevokeTarget(null);
        }}
        title={`Revoke invitation for ${revokeTarget?.email ?? ''}?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            The current link will stop working. A new invitation can be created later.
          </p>
          {revokeMutation.isError && (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {mutationMessage(revokeMutation.error)}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="secondary"
              disabled={revokeMutation.isPending}
              onClick={() => {
                setRevokeTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={revokeMutation.isPending}
              onClick={() => {
                revokeMutation.mutate();
              }}
            >
              Revoke invitation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
