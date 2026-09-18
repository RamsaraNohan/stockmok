import type { Notification } from '@stockmok/shared';
import type { PageRequest, PageResult } from '@stockmok/data';
import {
  fetchNotificationPage as fetchPageAdapter,
  fetchUnreadNotificationCount as fetchUnreadCountAdapter,
  fetchUserNotifications as fetchNotifsAdapter,
  markNotificationRead as markReadAdapter,
  subscribeToUnreadNotifications as subscribeUnreadAdapter,
  type NotificationListFilters,
} from '@/data/adapters/notificationAdapter';

export type { NotificationListFilters };
export type NotificationPageCursor = NonNullable<PageResult<Notification>['nextCursor']>;
export type NotificationPageResult = PageResult<Notification>;

export async function fetchUserNotifications(
  uid: string,
  maxResults = 50,
): Promise<readonly Notification[]> {
  return fetchNotifsAdapter(uid, maxResults);
}

export async function fetchNotificationPage(
  uid: string,
  filters: NotificationListFilters = {},
  page: PageRequest = {},
): Promise<PageResult<Notification>> {
  return fetchPageAdapter(uid, filters, page);
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
