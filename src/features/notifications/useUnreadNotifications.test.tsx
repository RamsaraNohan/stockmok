// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchUnreadNotificationCount,
  subscribeToUnreadNotifications,
} from '@/services/notifications/notificationService';

import { useUnreadNotifications } from './useUnreadNotifications';

vi.mock('@/services/notifications/notificationService', () => ({
  fetchUnreadNotificationCount: vi.fn(),
  subscribeToUnreadNotifications: vi.fn(),
}));

function Probe({ uid }: { readonly uid: string | null }) {
  const state = useUnreadNotifications(uid);
  return (
    <output>
      {state.count}|{String(state.isCapped)}|{state.error?.message ?? 'ok'}
    </output>
  );
}

describe('Q-005 frontend handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes the exact initial result before starting the bounded listener', async () => {
    let resolveExact: (value: {
      readonly count: number;
      readonly isCapped: false;
    }) => void = () => {
      throw new Error('Exact-count resolver was not initialized');
    };
    const exact = new Promise<{ readonly count: number; readonly isCapped: false }>((resolve) => {
      resolveExact = resolve;
    });
    vi.mocked(fetchUnreadNotificationCount).mockReturnValue(exact);

    let onUpdate: (value: { readonly count: number; readonly isCapped: boolean }) => void = () => {
      throw new Error('Realtime callback was not initialized');
    };
    const unsubscribe = vi.fn();
    vi.mocked(subscribeToUnreadNotifications).mockImplementation((_uid, update) => {
      onUpdate = update;
      return unsubscribe;
    });

    render(<Probe uid="user-a" />);
    expect(subscribeToUnreadNotifications).not.toHaveBeenCalled();

    resolveExact({ count: 57, isCapped: false });
    expect(await screen.findByText('57|false|ok')).toBeTruthy();
    expect(subscribeToUnreadNotifications).toHaveBeenCalledWith(
      'user-a',
      expect.any(Function),
      expect.any(Function),
    );

    onUpdate({ count: 50, isCapped: true });
    expect(await screen.findByText('50|true|ok')).toBeTruthy();
  });

  it('unsubscribes and ignores an old identity callback after the uid changes', async () => {
    vi.mocked(fetchUnreadNotificationCount)
      .mockResolvedValueOnce({ count: 1, isCapped: false })
      .mockResolvedValueOnce({ count: 49, isCapped: false });
    const callbacks = new Map<
      string,
      (value: { readonly count: number; readonly isCapped: boolean }) => void
    >();
    const unsubscribeA = vi.fn();
    const unsubscribeB = vi.fn();
    vi.mocked(subscribeToUnreadNotifications).mockImplementation((uid, update) => {
      callbacks.set(uid, update);
      return uid === 'user-a' ? unsubscribeA : unsubscribeB;
    });

    const view = render(<Probe uid="user-a" />);
    expect(await screen.findByText('1|false|ok')).toBeTruthy();
    await waitFor(() => {
      expect(callbacks.has('user-a')).toBe(true);
    });

    view.rerender(<Probe uid="user-b" />);
    expect(await screen.findByText('49|false|ok')).toBeTruthy();
    expect(unsubscribeA).toHaveBeenCalledTimes(1);

    callbacks.get('user-a')?.({ count: 0, isCapped: false });
    expect(screen.getByText('49|false|ok')).toBeTruthy();
  });
});
