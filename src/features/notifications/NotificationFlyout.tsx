import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Notification } from '@stockmok/shared';
import { useQuery } from '@tanstack/react-query';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/services/auth/useAuth';
import { fetchUserNotifications } from '@/services/notifications/notificationService';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Badge } from '@/ui/primitives/Badge';

import { resolveNotificationReference } from './notificationReferences';
import { useUnreadNotifications } from './useUnreadNotifications';

export function NotificationFlyout() {
  const { user } = useAuth();
  const { memberships, activeMembership, activeSettings } = useWorkspace();
  const unreadState = useUnreadNotifications(user?.uid ?? null);
  const [isOpen, setIsOpen] = useState(false);
  const listQuery = useQuery({
    queryKey: ['notifications', 'flyout', user?.uid],
    queryFn: () => fetchUserNotifications(user?.uid ?? '', 5),
    enabled: isOpen && !!user,
  });
  const notifications: readonly Notification[] = listQuery.data ?? [];

  const viewAllHref = activeMembership
    ? `/app/${encodeURIComponent(activeMembership.handle)}/notifications`
    : null;

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Notifications"
          className="border-border hover:bg-background focus-visible:outline-primary relative flex items-center justify-center rounded-full border p-2 text-text-muted transition-colors cursor-pointer min-h-[40px] min-w-[40px] max-md:min-h-[44px] max-md:min-w-[44px]"
        >
          <Bell className="size-5" />
          {unreadState.count > 0 && (
            <Badge
              className="absolute -top-1 -right-1"
              count={unreadState.count}
              isCapped={unreadState.isCapped}
            />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="bg-surface border-border z-50 w-80 rounded-panel border p-4 shadow-xl focus:outline-none max-md:w-[calc(100vw-2rem)]"
          sideOffset={8}
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-text font-bold text-sm">Notifications</h3>
            {unreadState.count > 0 && (
              <span className="text-primary font-bold text-xs">
                {unreadState.isCapped ? '50+' : unreadState.count} unread
              </span>
            )}
          </div>

          <div className="mt-3 max-h-80 overflow-y-auto flex flex-col gap-2">
            {listQuery.isLoading ? (
              <p className="text-text-muted py-6 text-center text-xs" role="status">
                Loading notifications…
              </p>
            ) : listQuery.isError ? (
              <p className="text-red-700 py-6 text-center text-xs" role="alert">
                Notifications could not be loaded.
              </p>
            ) : notifications.length === 0 ? (
              <p className="text-text-muted py-6 text-center text-xs">You&apos;re all caught up.</p>
            ) : (
              notifications.map((notification) => {
                const target = resolveNotificationReference(
                  notification,
                  memberships,
                  activeMembership?.organizationId ?? null,
                  activeSettings,
                );
                const key = `${String(notification.createdAt.toMillis())}-${notification.referenceType}-${notification.referenceId}`;
                return (
                  <div
                    key={key}
                    className={`flex flex-col gap-1 rounded-lg border p-3 text-xs transition-colors ${
                      notification.read
                        ? 'border-border/50 bg-surface text-text-muted'
                        : 'border-primary/30 bg-primary-subtle text-text font-medium'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold">{notification.title}</span>
                      {!notification.read && (
                        <button
                          aria-label="Mark as read unavailable"
                          className="text-text-muted cursor-not-allowed p-0.5 opacity-50"
                          disabled
                          title="Read status updates are temporarily unavailable"
                        >
                          <Check className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="leading-normal">{notification.message}</p>
                    <p className="text-text-muted mt-1">{notification.organizationName}</p>
                    {target ? (
                      <Link
                        className="text-primary mt-1 inline-flex items-center gap-1 font-bold hover:underline"
                        onClick={() => {
                          setIsOpen(false);
                        }}
                        to={target.href}
                      >
                        {target.label}
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </Link>
                    ) : (
                      <span className="text-text-muted mt-1">
                        Access to this item may have changed.
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="border-border mt-3 border-t pt-3">
            {viewAllHref ? (
              <Link
                className="text-primary flex min-h-10 items-center justify-center rounded-control text-sm font-bold hover:bg-primary-subtle max-md:min-h-11"
                onClick={() => {
                  setIsOpen(false);
                }}
                to={viewAllHref}
              >
                View all notifications
              </Link>
            ) : (
              <span className="text-text-muted block py-2 text-center text-xs">
                Select a workspace to view all notifications.
              </span>
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
