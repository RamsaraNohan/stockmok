// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Notification } from '@stockmok/shared';
import {
  fetchNotificationPage,
  fetchUnreadNotificationCount,
} from '@/services/notifications/notificationService';

import { NotificationsScreen } from './NotificationsScreen';

function timestamp(milliseconds: number): Notification['createdAt'] {
  return {
    toDate: () => new Date(milliseconds),
    toMillis: () => milliseconds,
  } as Notification['createdAt'];
}

vi.mock('@/services/auth/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'user-a' } }),
}));

vi.mock('@/services/workspace/useWorkspace', () => ({
  useWorkspace: () => {
    const activeMembership = {
      organizationId: 'org-a',
      handle: 'grand-table',
      role: 'OWNER',
      status: 'ACTIVE',
    };
    return {
      memberships: [activeMembership],
      activeMembership,
      activeSettings: { networkEnabled: true },
    };
  },
}));

vi.mock('@/services/notifications/notificationService', () => ({
  fetchNotificationPage: vi.fn(),
  fetchUnreadNotificationCount: vi.fn(),
}));

const unreadNotification: Notification = {
  organizationId: 'org-a',
  organizationName: 'Grand Table',
  type: 'LOW_STOCK',
  category: 'STOCK',
  title: 'Chicken Breast is low',
  message: 'Chicken Breast fell below its minimum.',
  referenceType: 'PRODUCT',
  referenceId: 'product-a',
  read: false,
  createdAt: timestamp(1_700_000_000_000),
};

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NotificationsScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SCREEN-026 Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchUnreadNotificationCount).mockResolvedValue({ count: 57, isCapped: false });
    vi.mocked(fetchNotificationPage).mockResolvedValue({
      items: [unreadNotification],
      nextCursor: null,
    });
  });

  it('shows capped badge semantics and keeps read mutations visibly gated', async () => {
    renderScreen();

    expect(await screen.findByText('Chicken Breast is low')).toBeTruthy();
    expect(screen.getAllByText(/50\+ unread/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: 'Mark visible as read' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Mark as read unavailable' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.getByRole('link', { name: /Open product/ }).getAttribute('href')).toBe(
      '/app/grand-table/inventory/products/product-a',
    );
  });

  it('maps the Unread tab to Q-004 read=false without a Read tab', async () => {
    renderScreen();
    await screen.findByText('Chicken Breast is low');

    fireEvent.click(screen.getByRole('tab', { name: /Unread/ }));

    await waitFor(() => {
      expect(fetchNotificationPage).toHaveBeenLastCalledWith(
        'user-a',
        { read: false },
        { limit: 25 },
      );
    });
    expect(screen.queryByRole('tab', { name: 'Read' })).toBeNull();
  });
});
