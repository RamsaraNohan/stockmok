// @vitest-environment jsdom

import type { Member } from '@stockmok/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listTeamMembersMock, listPendingInvitationsMock, createInvitationMock } = vi.hoisted(
  () => ({
    listTeamMembersMock: vi.fn(),
    listPendingInvitationsMock: vi.fn(),
    createInvitationMock: vi.fn(),
  }),
);

vi.mock('@/services/workspace/useWorkspace', () => ({
  useWorkspace: () => ({
    activeMembership: { organizationId: 'org-1' },
    activeOrg: { ownerUid: 'owner-1' },
    activeRole: 'ADMIN',
  }),
}));

vi.mock('@/services/team/teamService', () => ({
  ASSIGNABLE_TEAM_ROLES: [
    'ADMIN',
    'INVENTORY_MANAGER',
    'PROCUREMENT_MANAGER',
    'STOREKEEPER',
    'ANALYST',
    'VIEWER',
  ],
  TEAM_ROLE_LABELS: {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    INVENTORY_MANAGER: 'Inventory Manager',
    PROCUREMENT_MANAGER: 'Procurement Manager',
    STOREKEEPER: 'Storekeeper',
    ANALYST: 'Analyst',
    VIEWER: 'Viewer',
  },
  buildOneTimeInvitationLink: (token: string, origin: string) =>
    new URL(`/invite/${encodeURIComponent(token)}`, origin).toString(),
  isProtectedOwner: (member: Member, ownerUid: string) =>
    member.uid === ownerUid || member.role === 'OWNER',
  listTeamMembers: listTeamMembersMock,
  listPendingInvitations: listPendingInvitationsMock,
  createInvitation: createInvitationMock,
  revokeInvitation: vi.fn(),
  changeMemberRole: vi.fn(),
  setMemberStatus: vi.fn(),
}));

import { TeamScreen } from './TeamScreen';

function timestamp(iso: string) {
  return { toDate: () => new Date(iso) } as Member['joinedAt'];
}

const members: readonly Member[] = [
  {
    uid: 'owner-1',
    role: 'OWNER',
    status: 'ACTIVE',
    displayName: 'Nohan',
    email: 'nohan@example.com',
    joinedAt: timestamp('2026-08-01T00:00:00Z'),
    updatedAt: timestamp('2026-08-01T00:00:00Z'),
  },
  {
    uid: 'member-1',
    role: 'INVENTORY_MANAGER',
    status: 'ACTIVE',
    displayName: 'Nimal Perera',
    email: 'nimal@example.com',
    joinedAt: timestamp('2026-08-02T00:00:00Z'),
    updatedAt: timestamp('2026-08-02T00:00:00Z'),
  },
];

function renderTeam(): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view: ReactElement = (
    <QueryClientProvider client={queryClient}>
      <TeamScreen />
    </QueryClientProvider>
  );
  return render(view);
}

describe('F5 Team screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTeamMembersMock.mockResolvedValue(members);
    listPendingInvitationsMock.mockResolvedValue([]);
  });

  it('renders the joined-at Team page with no stale search or role filter and protects Owner', async () => {
    renderTeam();

    expect(await screen.findAllByText('Nohan')).toHaveLength(2);
    expect(screen.getAllByText('Protected Owner')).toHaveLength(2);
    expect(screen.getAllByText('Nimal Perera')).toHaveLength(2);
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByLabelText(/filter.*role/i)).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Change role' })).toHaveLength(2);
  });

  it('shows a raw invitation link once and removes it from the DOM on close', async () => {
    createInvitationMock.mockResolvedValue({
      invitationId: 'invite-1',
      token: 'raw-secret-invitation-token',
    });
    listPendingInvitationsMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          invitationId: 'invite-1',
          email: 'new.member@example.com',
          role: 'VIEWER',
          status: 'PENDING',
          expiresAt: timestamp('2026-08-28T00:00:00Z'),
          createdAt: timestamp('2026-08-21T00:00:00Z'),
          createdBy: 'owner-1',
        },
      ])
      .mockResolvedValue([]);

    renderTeam();
    await screen.findAllByText('Nohan');
    fireEvent.click(screen.getByRole('button', { name: 'Invite user' }));
    await waitFor(() => {
      expect(document.getElementById('team-invite-email')).toBeTruthy();
    });
    fireEvent.change(document.getElementById('team-invite-email') as HTMLInputElement, {
      target: { value: 'new.member@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Invite user' }));

    const link = await screen.findByDisplayValue(
      'http://localhost:3000/invite/raw-secret-invitation-token',
    );
    expect(link).toBeTruthy();
    expect(createInvitationMock).toHaveBeenCalledWith('org-1', expect.any(String), {
      email: 'new.member@example.com',
      role: 'VIEWER',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.queryByDisplayValue(/raw-secret-invitation-token/)).toBeNull();
    });
  });
});
