// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  navigateMock,
  refreshMembershipsMock,
  loginWithEmailMock,
  fetchMembershipsMock,
  fetchDirectoryByHandleMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  refreshMembershipsMock: vi.fn(),
  loginWithEmailMock: vi.fn(),
  fetchMembershipsMock: vi.fn(),
  fetchDirectoryByHandleMock: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/services/workspace/useWorkspace', () => ({
  useWorkspace: () => ({ refreshMemberships: refreshMembershipsMock }),
}));

vi.mock('@/services/auth/authService', () => ({
  loginWithEmail: loginWithEmailMock,
  fetchMembershipsForUserFromServer: fetchMembershipsMock,
}));

vi.mock('@/services/workspace/workspaceService', () => ({
  fetchDirectoryByHandle: fetchDirectoryByHandleMock,
}));

import { BrandedLoginScreen } from './BrandedLoginScreen';

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/b/qa-wide-01']}>
      <Routes>
        <Route element={<BrandedLoginScreen />} path="/b/:handle" />
      </Routes>
    </MemoryRouter>,
  );
}

async function submit() {
  renderScreen();
  await screen.findByText('QA Wide Organization 01');
  fireEvent.change(screen.getByLabelText('Email Address', { exact: false }), {
    target: { value: 'owner@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password', { exact: false }), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Sign In to/ }));
}

describe('BrandedLoginScreen — post-login membership routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginWithEmailMock.mockResolvedValue({ uid: 'user-1', email: 'owner@example.com' });
    fetchDirectoryByHandleMock.mockResolvedValue({
      handle: 'qa-wide-01',
      name: 'QA Wide Organization 01',
      monogram: 'W1',
      monogramColor: '#000000',
    });
  });

  it('routes to the matching org dashboard when the account is an authoritative member', async () => {
    fetchMembershipsMock.mockResolvedValue([{ handle: 'qa-wide-01' }]);

    await submit();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/qa-wide-01/dashboard');
    });
  });

  it('reports non-membership only for an authoritative empty/mismatched list, never onboarding', async () => {
    fetchMembershipsMock.mockResolvedValue([]);

    await submit();

    await waitFor(() => {
      expect(
        screen.getByText('Your account is not an active member of QA Wide Organization 01.'),
      ).toBeTruthy();
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('a membership read failure shows a workspace-access error, not the generic invalid-credentials message', async () => {
    fetchMembershipsMock.mockRejectedValue(new Error('Backend unavailable'));

    await submit();

    await waitFor(() => {
      expect(
        screen.getByText('We could not confirm your workspace access. Please try again.'),
      ).toBeTruthy();
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
