import type { Member } from '@stockmok/shared';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/adapters/teamAdapter', () => ({
  executeChangeMemberRoleCommand: vi.fn(),
  executeCreateInvitationCommand: vi.fn(),
  executeRevokeInvitationCommand: vi.fn(),
  executeSetMemberStatusCommand: vi.fn(),
  fetchPendingTeamInvitations: vi.fn(),
  fetchTeamMembers: vi.fn(),
}));

import { executeChangeMemberRoleCommand } from '@/data/adapters/teamAdapter';
import { buildOneTimeInvitationLink, changeMemberRole, isProtectedOwner } from './teamService';

function member(overrides: Partial<Member> = {}): Member {
  return {
    uid: 'member-1',
    role: 'ADMIN',
    status: 'ACTIVE',
    displayName: 'Nimal Perera',
    email: 'nimal@example.com',
    joinedAt: { toDate: () => new Date('2026-08-01T00:00:00Z') } as Member['joinedAt'],
    updatedAt: { toDate: () => new Date('2026-08-01T00:00:00Z') } as Member['updatedAt'],
    ...overrides,
  };
}

describe('F5 Team service', () => {
  it('protects the canonical Owner by uid and never delegates the mutation', () => {
    const owner = member({ uid: 'owner-1', role: 'OWNER' });

    expect(isProtectedOwner(owner, 'owner-1')).toBe(true);
    expect(() => changeMemberRole('org-1', 'owner-1', owner, 'ADMIN')).toThrow('canonical Owner');
    expect(executeChangeMemberRoleCommand).not.toHaveBeenCalled();
  });

  it('delegates ordinary-member role changes without permitting OWNER as an input type', async () => {
    vi.mocked(executeChangeMemberRoleCommand).mockResolvedValue(undefined);
    const ordinaryMember = member();

    await changeMemberRole('org-1', 'owner-1', ordinaryMember, 'VIEWER');

    expect(executeChangeMemberRoleCommand).toHaveBeenCalledWith('org-1', 'member-1', 'VIEWER');
  });

  it('builds the one-time route without persisting or transforming the token', () => {
    expect(buildOneTimeInvitationLink('raw-token_123', 'https://stockmok.example')).toBe(
      'https://stockmok.example/invite/raw-token_123',
    );
  });
});
