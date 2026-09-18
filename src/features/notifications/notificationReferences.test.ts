import { describe, expect, it } from 'vitest';

import type { Notification, OrganizationSettings, Role, UserMembership } from '@stockmok/shared';

import { resolveNotificationReference } from './notificationReferences';

function timestamp(milliseconds: number): Notification['createdAt'] {
  return {
    toDate: () => new Date(milliseconds),
    toMillis: () => milliseconds,
  } as Notification['createdAt'];
}

function membership(role: Role = 'OWNER'): UserMembership {
  return {
    organizationId: 'org-a',
    handle: 'grand-table',
    organizationName: 'Grand Table',
    monogram: 'GT',
    monogramColor: '#112233',
    role,
    status: 'ACTIVE',
    joinedAt: timestamp(1),
    updatedAt: timestamp(1),
  };
}

function settings(networkEnabled = true): OrganizationSettings {
  return {
    defaultWarehouseId: 'warehouse-a',
    currency: 'LKR',
    timezone: 'Asia/Colombo',
    lowStockNotificationsEnabled: true,
    purchaseOrderPrefix: 'PO',
    quantityPrecision: 3,
    networkEnabled,
    storefrontEnabled: false,
    updatedAt: timestamp(1),
    updatedBy: 'owner-a',
  };
}

function notification(referenceType: Notification['referenceType']): Notification {
  return {
    organizationId: 'org-a',
    organizationName: 'Grand Table',
    type: referenceType === 'CONNECTION' ? 'CONNECTION_REQUESTED' : 'LOW_STOCK',
    category: referenceType === 'CONNECTION' ? 'NETWORK' : 'STOCK',
    title: 'Update',
    message: 'An item changed.',
    referenceType,
    referenceId: 'ref/a b',
    read: false,
    createdAt: timestamp(1),
  };
}

describe('notification reference access', () => {
  it('builds an encoded product target for an active membership', () => {
    expect(
      resolveNotificationReference(notification('PRODUCT'), [membership()], 'org-a', settings()),
    ).toEqual({
      href: '/app/grand-table/inventory/products/ref%2Fa%20b',
      label: 'Open product',
    });
  });

  it('renders an access-changed state when membership or role no longer permits the target', () => {
    expect(
      resolveNotificationReference(notification('PRODUCT'), [], 'org-a', settings()),
    ).toBeNull();
    expect(
      resolveNotificationReference(
        notification('PURCHASE_ORDER'),
        [membership('VIEWER')],
        'org-a',
        settings(),
      ),
    ).toBeNull();
  });

  it('suppresses current-workspace Network targets when the feature is disabled', () => {
    expect(
      resolveNotificationReference(
        notification('CONNECTION'),
        [membership('PROCUREMENT_MANAGER')],
        'org-a',
        settings(false),
      ),
    ).toBeNull();
  });
});
