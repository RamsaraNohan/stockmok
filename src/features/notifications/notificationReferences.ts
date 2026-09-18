import type { Notification, OrganizationSettings, Role, UserMembership } from '@stockmok/shared';

export interface NotificationReferenceTarget {
  readonly href: string;
  readonly label: string;
}

const NETWORK_ROLES: readonly Role[] = ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER'];

export function resolveNotificationReference(
  notification: Notification,
  memberships: readonly UserMembership[],
  activeOrganizationId: string | null,
  activeSettings: OrganizationSettings | null,
): NotificationReferenceTarget | null {
  const membership = memberships.find(
    (candidate) =>
      candidate.organizationId === notification.organizationId && candidate.status === 'ACTIVE',
  );
  if (!membership) return null;

  const root = `/app/${encodeURIComponent(membership.handle)}`;
  switch (notification.referenceType) {
    case 'PRODUCT':
      return {
        href: `${root}/inventory/products/${encodeURIComponent(notification.referenceId)}`,
        label: 'Open product',
      };
    case 'PURCHASE_ORDER':
      return membership.role === 'VIEWER'
        ? null
        : {
            href: `${root}/procurement/purchase-orders/${encodeURIComponent(notification.referenceId)}`,
            label: 'Open purchase order',
          };
    case 'CONNECTION': {
      if (!NETWORK_ROLES.includes(membership.role)) return null;
      const isActiveWorkspace = activeOrganizationId === notification.organizationId;
      if (isActiveWorkspace && activeSettings?.networkEnabled !== true) return null;
      return {
        href: `${root}/network/connections/${encodeURIComponent(notification.referenceId)}`,
        label: 'Open connection',
      };
    }
    case 'MEMBERSHIP':
      return membership.role === 'OWNER' || membership.role === 'ADMIN'
        ? { href: `${root}/team`, label: 'Open team' }
        : null;
  }
}
