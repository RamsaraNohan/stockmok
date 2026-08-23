import type { Notification, NotificationCategory } from '@stockmok/shared';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/services/auth/useAuth';
import {
  fetchNotificationPage,
  fetchUnreadNotificationCount,
  type NotificationListFilters,
  type NotificationPageCursor,
} from '@/services/notifications/notificationService';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { PageHeader } from '@/ui/shell/PageHeader';

import { resolveNotificationReference } from './notificationReferences';

type NotificationTab = 'ALL' | 'UNREAD' | NotificationCategory;

const TABS: readonly { readonly id: NotificationTab; readonly label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'UNREAD', label: 'Unread' },
  { id: 'STOCK', label: 'Stock' },
  { id: 'ORDERS', label: 'Orders' },
  { id: 'NETWORK', label: 'Network' },
];

function filtersFor(tab: NotificationTab): NotificationListFilters {
  if (tab === 'UNREAD') return { read: false };
  if (tab === 'STOCK' || tab === 'ORDERS' || tab === 'NETWORK') return { category: tab };
  return {};
}

function formatNotificationTime(notification: Notification): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(notification.createdAt.toDate());
}

export function NotificationsScreen() {
  const { user } = useAuth();
  const { memberships, activeMembership, activeSettings } = useWorkspace();
  const [activeTab, setActiveTab] = useState<NotificationTab>('ALL');
  const uid = user?.uid ?? '';
  const filters = filtersFor(activeTab);

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count', uid],
    queryFn: () => fetchUnreadNotificationCount(uid),
    enabled: uid.length > 0,
  });

  const notificationsQuery = useInfiniteQuery({
    queryKey: ['notifications', 'list', uid, filters],
    queryFn: ({ pageParam }) =>
      fetchNotificationPage(
        uid,
        filters,
        pageParam ? { limit: 25, cursor: pageParam } : { limit: 25 },
      ),
    initialPageParam: null as NotificationPageCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: uid.length > 0,
  });

  const notifications = notificationsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const unreadLabel = unreadQuery.data
    ? unreadQuery.data.count >= 50
      ? '50+'
      : String(unreadQuery.data.count)
    : '—';

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Notifications" />
      <div className="flex flex-1 flex-col gap-5 p-4 md:p-6 lg:p-8">
        <div className="bg-surface border-border rounded-panel border p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-text text-sm font-bold" aria-live="polite">
              {unreadLabel} unread
            </p>
            <Button
              aria-describedby="notification-write-gate"
              disabled
              size="sm"
              title="Read status updates are temporarily unavailable"
              variant="secondary"
            >
              Mark visible as read
            </Button>
          </div>
          <p className="text-text-muted mt-2 text-xs" id="notification-write-gate" role="status">
            Read status updates are temporarily unavailable. Notification viewing remains available.
          </p>

          <div
            aria-label="Notification filters"
            className="mt-4 flex gap-2 overflow-x-auto"
            role="tablist"
          >
            {TABS.map((tab) => (
              <button
                aria-controls="notifications-panel"
                aria-selected={activeTab === tab.id}
                className={`min-h-10 shrink-0 rounded-control px-4 text-sm font-bold max-md:min-h-11 ${
                  activeTab === tab.id
                    ? 'bg-primary text-surface'
                    : 'bg-background text-text-muted hover:text-text'
                }`}
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                }}
                role="tab"
                type="button"
              >
                {tab.label}
                {tab.id === 'UNREAD' ? ` ${unreadLabel}` : ''}
              </button>
            ))}
          </div>
        </div>

        <div id="notifications-panel" role="tabpanel">
          {notificationsQuery.isLoading ? (
            <div className="space-y-3" aria-label="Loading notifications" role="status">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : notificationsQuery.isError ? (
            <ErrorState
              message={
                notificationsQuery.error instanceof Error
                  ? notificationsQuery.error.message
                  : 'Notifications could not be loaded.'
              }
              onRetry={() => {
                void notificationsQuery.refetch();
              }}
              title="Could not load notifications"
            />
          ) : notifications.length === 0 ? (
            <EmptyState
              description="New stock, order, and network updates will appear here."
              icon={<Bell className="size-12" />}
              title="You're all caught up."
            />
          ) : (
            <div className="bg-surface border-border rounded-panel overflow-hidden border shadow-sm">
              <div className="text-text-muted border-border hidden grid-cols-[7rem_1fr_12rem_10rem_8rem] gap-4 border-b bg-background px-4 py-3 text-xs font-bold lg:grid">
                <span>State</span>
                <span>Event</span>
                <span>Organization</span>
                <span>Related object</span>
                <span>Time</span>
              </div>
              <ul className="divide-border divide-y">
                {notifications.map((notification) => {
                  const target = resolveNotificationReference(
                    notification,
                    memberships,
                    activeMembership?.organizationId ?? null,
                    activeSettings,
                  );
                  const key = `${String(notification.createdAt.toMillis())}-${notification.referenceType}-${notification.referenceId}`;

                  return (
                    <li
                      className={`grid gap-3 p-4 lg:grid-cols-[7rem_1fr_12rem_10rem_8rem] lg:items-center lg:gap-4 ${
                        notification.read ? 'bg-surface' : 'bg-primary-subtle/40'
                      }`}
                      key={key}
                    >
                      <div className="flex items-center justify-between gap-3 lg:block">
                        <span className="text-text-muted text-xs font-bold lg:hidden">State</span>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                            notification.read
                              ? 'bg-background text-text-muted'
                              : 'bg-primary-subtle text-primary'
                          }`}
                        >
                          {notification.read ? 'Read' : 'Unread'}
                        </span>
                      </div>
                      <div>
                        <p className="text-text text-sm font-bold">{notification.title}</p>
                        <p className="text-text-muted mt-1 text-sm leading-relaxed">
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex items-start justify-between gap-3 lg:block">
                        <span className="text-text-muted text-xs font-bold lg:hidden">
                          Organization
                        </span>
                        <span className="text-text text-sm">{notification.organizationName}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3 lg:block">
                        <span className="text-text-muted text-xs font-bold lg:hidden">
                          Related object
                        </span>
                        {target ? (
                          <Link
                            className="text-primary inline-flex items-center gap-1 text-sm font-bold hover:underline"
                            to={target.href}
                          >
                            {target.label}
                            <ExternalLink aria-hidden="true" className="size-3.5" />
                          </Link>
                        ) : (
                          <span className="text-text-muted text-xs">Access may have changed</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 lg:block">
                        <span className="text-text-muted text-xs font-bold lg:hidden">Time</span>
                        <time
                          className="text-text-muted text-xs"
                          dateTime={notification.createdAt.toDate().toISOString()}
                        >
                          {formatNotificationTime(notification)}
                        </time>
                      </div>
                      {!notification.read && (
                        <button
                          aria-label="Mark as read unavailable"
                          className="text-text-muted col-span-full inline-flex min-h-10 cursor-not-allowed items-center justify-center gap-2 rounded-control border border-border px-3 text-xs font-bold opacity-60 max-md:min-h-11 lg:justify-self-start"
                          disabled
                          title="Read status updates are temporarily unavailable"
                          type="button"
                        >
                          <Check aria-hidden="true" className="size-4" />
                          Mark as read
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {notificationsQuery.hasNextPage && (
          <div className="flex justify-center">
            <Button
              isLoading={notificationsQuery.isFetchingNextPage}
              onClick={() => {
                void notificationsQuery.fetchNextPage();
              }}
              variant="secondary"
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
