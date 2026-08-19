import type { Notification } from '@stockmok/shared';
import { createReadClient } from '@stockmok/data';
import { doc, updateDoc } from 'firebase/firestore';

import { db } from '../firebase/client';

// Q-004: Notification list users/{uid}/notifications
export async function fetchUserNotifications(
  uid: string,
  maxResults = 50,
): Promise<readonly Notification[]> {
  const client = createReadClient(db, { uid });
  const result = await client.list<Notification>('Q-004', undefined, { limit: maxResults });
  return result.items;
}

// Q-005 Transport A: Exact one-shot count from server via getCountFromServer
export async function fetchUnreadNotificationCount(
  uid: string,
): Promise<{ readonly count: number; readonly isCapped: false }> {
  const client = createReadClient(db, { uid });
  const result = await client.getUnreadCount();
  return {
    count: result.count,
    isCapped: false,
  };
}

// Q-005 Transport B: Bounded realtime unread notification badge on users/{uid}/notifications
export function subscribeToUnreadNotifications(
  uid: string,
  onUpdate: (payload: { readonly count: number; readonly isCapped: boolean }) => void,
  onError?: (err: Error) => void,
): () => void {
  const client = createReadClient(db, { uid });
  return client.subscribeUnreadBadge(
    (value) => {
      onUpdate({ count: value.count, isCapped: value.capped });
    },
    (error) => {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    },
  );
}

// Safe direct write: Mark single notification as read by setting read: true boolean
export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  const notifRef = doc(db, 'users', uid, 'notifications', notificationId);
  await updateDoc(notifRef, {
    read: true,
  });
}
