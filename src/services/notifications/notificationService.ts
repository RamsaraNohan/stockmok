import type { Notification } from '@stockmok/shared';
import {
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
