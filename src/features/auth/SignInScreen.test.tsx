// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { navigateMock, refreshMembershipsMock, loginWithEmailMock, fetchMembershipsMock } =
  vi.hoisted(() => ({
    navigateMock: vi.fn(),
    refreshMembershipsMock: vi.fn(),
    loginWithEmailMock: vi.fn(),
    fetchMembershipsMock: vi.fn(),
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

import { SignInScreen } from './SignInScreen';

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <SignInScreen />
    </MemoryRouter>,
  );
}

/** A promise plus its own resolve/reject, for controlling exactly when a mock settles. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function submit() {
  renderScreen();
  // The Input primitive appends a hidden "*" to a required field's label
  // text ("Email Address*"), so an exact match on the visible label fails.
  fireEvent.change(screen.getByLabelText('Email Address', { exact: false }), {
    target: { value: 'owner@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Password', { exact: false }), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
}

describe('SignInScreen — post-login membership routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginWithEmailMock.mockResolvedValue({ uid: 'user-1', email: 'owner@example.com' });
  });

  it('does not navigate while the membership read is still pending', async () => {
    const { promise } = deferred<readonly { handle: string }[]>();
    fetchMembershipsMock.mockReturnValue(promise);

    submit();
    await waitFor(() => {
      expect(fetchMembershipsMock).toHaveBeenCalledWith('user-1');
    });

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('routes to the workspace dashboard for an account with one existing membership', async () => {
    fetchMembershipsMock.mockResolvedValue([{ handle: 'qa-wide-01' }]);

    submit();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/qa-wide-01/dashboard');
    });
    expect(navigateMock).not.toHaveBeenCalledWith('/onboarding');
  });

  it('routes to select-workspace for an account with multiple memberships', async () => {
    fetchMembershipsMock.mockResolvedValue([{ handle: 'org-a' }, { handle: 'org-b' }]);

    submit();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/select-workspace');
    });
  });

  it('routes to onboarding only for an authoritative empty membership list', async () => {
    fetchMembershipsMock.mockResolvedValue([]);

    submit();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('a slow membership read that eventually resolves non-empty still reaches the dashboard, never onboarding first', async () => {
    const { promise, resolve } = deferred<readonly { handle: string }[]>();
    fetchMembershipsMock.mockReturnValue(promise);

    submit();
    await waitFor(() => {
      expect(fetchMembershipsMock).toHaveBeenCalled();
    });
    expect(navigateMock).not.toHaveBeenCalled();

    resolve([{ handle: 'qa-wide-01' }]);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/qa-wide-01/dashboard');
    });
    expect(navigateMock).not.toHaveBeenCalledWith('/onboarding');
  });

  it('a membership read failure shows a workspace-access error and never redirects to onboarding', async () => {
    fetchMembershipsMock.mockRejectedValue(new Error('Backend unavailable'));

    submit();

    await waitFor(() => {
      expect(
        screen.getByText('We could not confirm your workspace access. Please try again.'),
      ).toBeTruthy();
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('an invalid-credentials login failure never attempts a membership read', async () => {
    loginWithEmailMock.mockRejectedValue(new Error('auth/wrong-password'));

    submit();

    await waitFor(() => {
      expect(
        screen.getByText('Invalid email or password. Please check your credentials and try again.'),
      ).toBeTruthy();
    });
    expect(fetchMembershipsMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
