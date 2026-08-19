import type { Notification } from '@stockmok/shared';
import {
  fetchUnreadNotificationCount as fetchUnreadCountAdapter,
  fetchUserNotifications as fetchNotifsAdapter,
  markNotificationRead as markReadAdapter,
  subscribeToUnreadNotifications as subscribeUnreadAdapter,
} from '@/data/adapters/notificationAdapter';

export async function fetchUserNotifications(
  uid: string,
  maxResults = 50,
): Promise<readonly Notification[]> {
  return fetchNotifsAdapter(uid, maxResults);
}

export async function fetchUnreadNotificationCount(
  uid: string,
): Promise<{ readonly count: number; readonly isCapped: false }> {
  return fetchUnreadCountAdapter(uid);
}

export function subscribeToUnreadNotifications(
  uid: string,
  onUpdate: (payload: { readonly count: number; readonly isCapped: boolean }) => void,
  onError?: (err: Error) => void,
): () => void {
  return subscribeUnreadAdapter(uid, onUpdate, onError);
}

export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  return markReadAdapter(uid, notificationId);
}
