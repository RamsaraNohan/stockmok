import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Notification } from '@stockmok/shared';
import { Bell, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '@/services/auth/useAuth';
import {
  fetchUserNotifications,
  markNotificationRead,
  subscribeToUnreadNotifications,
} from '@/services/notifications/notificationService';
import { Badge } from '@/ui/primitives/Badge';

export function NotificationFlyout() {
  const { user } = useAuth();
  const [unreadState, setUnreadState] = useState<{ count: number; isCapped: boolean }>({
    count: 0,
    isCapped: false,
  });
  const [notifications, setNotifications] = useState<readonly Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;
    const unsub = subscribeToUnreadNotifications(user.uid, (data) => {
      if (isMounted) {
        setUnreadState(data);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [user]);

  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;
    void fetchUserNotifications(user.uid).then((list) => {
      if (isMounted) {
        setNotifications(list);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  const handleMarkAsRead = async (id: string) => {
    if (!user) return;
    await markNotificationRead(user.uid, id);
    setNotifications((prev) => prev.map((n) => (n.referenceId === id ? { ...n, read: true } : n)));
  };

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
            {notifications.length === 0 ? (
              <p className="text-text-muted py-6 text-center text-xs">
                No notifications to display.
              </p>
            ) : (
              notifications.map((n, idx) => (
                <div
                  key={n.referenceId || idx}
                  className={`flex flex-col gap-1 rounded-lg border p-3 text-xs transition-colors ${
                    n.read
                      ? 'border-border/50 bg-surface text-text-muted'
                      : 'border-primary/30 bg-primary-subtle text-text font-medium'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold">{n.title}</span>
                    {!n.read && (
                      <button
                        aria-label="Mark notification as read"
                        className="text-primary hover:text-primary/80 cursor-pointer p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleMarkAsRead(n.referenceId);
                        }}
                      >
                        <Check className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="leading-normal">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
