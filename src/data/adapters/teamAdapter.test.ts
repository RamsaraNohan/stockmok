import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listMock, callableMock, httpsCallableMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  callableMock: vi.fn(),
  httpsCallableMock: vi.fn(),
}));

vi.mock('@stockmok/data', () => ({
  createReadClient: () => ({ list: listMock }),
}));

vi.mock('firebase/firestore', () => ({
  Timestamp: { now: () => ({ marker: 'now' }) },
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: httpsCallableMock,
}));

vi.mock('../firebase/client', () => ({
  db: { marker: 'db' },
  functions: { marker: 'functions' },
}));

import {
  executeCreateInvitationCommand,
  executeSetMemberStatusCommand,
  fetchPendingTeamInvitations,
  fetchTeamMembers,
} from './teamAdapter';

describe('F5 Team adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    httpsCallableMock.mockReturnValue(callableMock);
  });

  it('uses the frozen bounded Q-009 shape', async () => {
    listMock.mockResolvedValue({ items: [{ uid: 'member-1' }], nextCursor: null });

    await expect(fetchTeamMembers('org-1')).resolves.toEqual([{ uid: 'member-1' }]);
    expect(listMock).toHaveBeenCalledWith('Q-009', {}, { limit: 25 });
  });

  it('drops tokenHash and organization routing data from Q-010 feature results', async () => {
    listMock.mockResolvedValue({
      items: [
        {
          invitationId: 'invite-1',
          organizationId: 'org-1',
          emailNormalized: 'member@example.com',
          role: 'VIEWER',
          tokenHash: 'secret-hash-that-must-not-cross-the-adapter',
          status: 'PENDING',
          expiresAt: { marker: 'expiry' },
          createdAt: { marker: 'created' },
          createdBy: 'owner-1',
        },
      ],
      nextCursor: null,
    });

    const result = await fetchPendingTeamInvitations('org-1');

    expect(listMock).toHaveBeenCalledWith('Q-010', { now: { marker: 'now' } }, { limit: 25 });
    expect(result).toEqual([
      {
        invitationId: 'invite-1',
        email: 'member@example.com',
        role: 'VIEWER',
        status: 'PENDING',
        expiresAt: { marker: 'expiry' },
        createdAt: { marker: 'created' },
        createdBy: 'owner-1',
      },
    ]);
    expect(result[0]).not.toHaveProperty('tokenHash');
    expect(result[0]).not.toHaveProperty('organizationId');
  });

  it('uses the approved callable envelopes and preserves the C-04 operation id', async () => {
    callableMock
      .mockResolvedValueOnce({
        data: { ok: true, data: { invitationId: 'invite-1', token: 'one-time-token' } },
      })
      .mockResolvedValueOnce({ data: { ok: true, data: { uid: 'member-1' } } });

    await expect(
      executeCreateInvitationCommand('org-1', 'operation-1', {
        email: 'member@example.com',
        role: 'VIEWER',
      }),
    ).resolves.toEqual({ invitationId: 'invite-1', token: 'one-time-token' });
    expect(httpsCallableMock).toHaveBeenNthCalledWith(
      1,
      { marker: 'functions' },
      'teamCreateInvitation',
    );
    expect(callableMock).toHaveBeenNthCalledWith(1, {
      orgId: 'org-1',
      operationId: 'operation-1',
      payload: { email: 'member@example.com', role: 'VIEWER' },
    });

    await executeSetMemberStatusCommand('org-1', 'member-1', 'SUSPENDED');
    expect(httpsCallableMock).toHaveBeenNthCalledWith(
      2,
      { marker: 'functions' },
      'teamSetMemberStatus',
    );
    expect(callableMock).toHaveBeenNthCalledWith(2, {
      orgId: 'org-1',
      payload: { uid: 'member-1', status: 'SUSPENDED' },
    });
  });
});
