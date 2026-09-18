import { useEffect, useState } from 'react';

import {
  fetchUnreadNotificationCount,
  subscribeToUnreadNotifications,
} from '@/services/notifications/notificationService';

export interface UnreadNotificationState {
  readonly count: number;
  readonly isCapped: boolean;
  readonly isLoading: boolean;
  readonly error: Error | null;
}

const EMPTY_STATE: UnreadNotificationState = {
  count: 0,
  isCapped: false,
  isLoading: false,
  error: null,
};

/** Loads the exact Q-005 count first, then hands off to its bounded listener. */
export function useUnreadNotifications(uid: string | null): UnreadNotificationState {
  const [state, setState] = useState<UnreadNotificationState>(EMPTY_STATE);

  useEffect(() => {
    if (!uid) {
      let isCurrent = true;
      queueMicrotask(() => {
        if (isCurrent) setState(EMPTY_STATE);
      });
      return () => {
        isCurrent = false;
      };
    }

    let isActive = true;
    let unsubscribe = () => {};
    setState((current) => ({ ...current, isLoading: true, error: null }));

    const start = async () => {
      try {
        const exact = await fetchUnreadNotificationCount(uid);
        if (!isActive) return;
        setState({ ...exact, isLoading: false, error: null });
      } catch (error) {
        if (!isActive) return;
        setState((current) => ({
          ...current,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      }

      unsubscribe = subscribeToUnreadNotifications(
        uid,
        (next) => {
          if (isActive) setState({ ...next, isLoading: false, error: null });
        },
        (error) => {
          if (isActive) setState((current) => ({ ...current, error }));
        },
      );
    };

    void start();

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [uid]);

  return state;
}
