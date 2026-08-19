import type { Notification } from '@stockmok/shared';
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebase/client';

// Q-004: Notification list users/{uid}/notifications
export async function fetchUserNotifications(
  uid: string,
  maxResults = 50,
): Promise<readonly Notification[]> {
  const notifRef = collection(db, 'users', uid, 'notifications');
  const q = query(notifRef, orderBy('createdAt', 'desc'), limit(maxResults));
  const snap = await getDocs(q);
  const items: Notification[] = [];
  snap.forEach((docSnap) => {
    items.push(docSnap.data() as Notification);
  });
  return items;
}

// Q-005 Transport A: Exact one-shot count from server via getCountFromServer
export async function fetchUnreadNotificationCount(
  uid: string,
): Promise<{ readonly count: number; readonly isCapped: false }> {
  const notifRef = collection(db, 'users', uid, 'notifications');
  const q = query(notifRef, where('read', '==', false));
  const snap = await getCountFromServer(q);
  return {
    count: snap.data().count,
    isCapped: false,
  };
}

// Q-005 Transport B: Bounded realtime unread notification badge on users/{uid}/notifications
export function subscribeToUnreadNotifications(
  uid: string,
  onUpdate: (payload: { readonly count: number; readonly isCapped: boolean }) => void,
  onError?: (err: Error) => void,
): () => void {
  const notifRef = collection(db, 'users', uid, 'notifications');
  const q = query(notifRef, where('read', '==', false), orderBy('createdAt', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snap) => {
      // Suppress stale cache-only snapshots to enforce server-backed metadata
      if (snap.metadata.fromCache) {
        return;
      }
      const size = snap.size;
      onUpdate({
        count: size,
        isCapped: size >= 50,
      });
    },
    (err) => {
      if (onError) onError(err);
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
