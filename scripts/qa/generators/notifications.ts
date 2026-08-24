import { paths } from '../../../packages/shared/src/paths.js';
import type { NotificationCategory } from '../../../packages/shared/src/primitives.js';
import type { ReferenceTypeSchema } from '../../../packages/shared/src/primitives.js';
import { NotificationSchema } from '../../../packages/shared/src/schemas/core.js';
import type { DatasetBuilder, QaOrg, QaPlan, QaUser } from '../dataset.js';
import { epochPlus, ordinal } from '../deterministic.js';
import { connectedNetworkPlan } from './network.js';
import { privateProcurementPlan } from './procurement.js';

/**
 * Per-user notifications, sized to exercise Q-005.
 *
 * Q-005 reads the unread count two ways: an exact aggregate, and a
 * `read == false` / `createdAt DESC` / `limit(50)` listener that reports
 * `isCapped` once it fills. The alpha organization therefore carries users with
 * exactly 0, 1, 49, 50 and 51 unread rows, which are the values that separate
 * "empty", "under the cap", "at the cap" and "over the cap".
 *
 * The `read` flag is seeded directly as state. It is *not* a claim that a
 * mark-read command exists: NOTIFICATION_MARK_READ remains a blocked authority
 * dependency, and nothing here defines or implies that surface.
 */

interface NotificationShape {
  readonly type:
    | 'LOW_STOCK'
    | 'OUT_OF_STOCK'
    | 'MEMBERSHIP_CHANGED'
    | 'PO_RECEIVED'
    | 'CONNECTION_REQUESTED'
    | 'CONNECTION_RESPONDED'
    | 'CPO_SUBMITTED'
    | 'CPO_RESPONDED'
    | 'CPO_SHIPPED'
    | 'CPO_RECEIVED';
  readonly category: NotificationCategory;
  readonly referenceType: (typeof ReferenceTypeSchema)['options'][number];
  readonly referenceId: string;
  readonly title: string;
  readonly message: string;
}

/**
 * Every notification points at a document that exists in the same organization,
 * so the dangling-reference verifier has something real to resolve.
 */
function shapesFor(org: QaOrg, plan: QaPlan): readonly NotificationShape[] {
  const shapes: NotificationShape[] = [];

  const lowStock = org.products.filter((product) => product.status === 'ACTIVE').slice(0, 3);
  for (const product of lowStock) {
    shapes.push({
      type: 'LOW_STOCK',
      category: 'STOCK',
      referenceType: 'PRODUCT',
      referenceId: product.productId,
      title: `Low stock: ${product.name}`,
      message: `${product.name} (${product.internalSku}) has fallen below its minimum.`,
    });
    shapes.push({
      type: 'OUT_OF_STOCK',
      category: 'STOCK',
      referenceType: 'PRODUCT',
      referenceId: product.productId,
      title: `Out of stock: ${product.name}`,
      message: `${product.name} (${product.internalSku}) is out of stock.`,
    });
  }

  for (const order of privateProcurementPlan(org)) {
    if (order.status !== 'RECEIVED' && order.status !== 'PARTIALLY_RECEIVED') continue;
    shapes.push({
      type: 'PO_RECEIVED',
      category: 'ORDERS',
      referenceType: 'PURCHASE_ORDER',
      referenceId: order.purchaseOrderId,
      title: `Order received: ${order.orderNumber ?? order.purchaseOrderId}`,
      message: `Stock was received against ${order.orderNumber ?? order.purchaseOrderId}.`,
    });
  }

  for (const user of org.users.slice(0, 2)) {
    shapes.push({
      type: 'MEMBERSHIP_CHANGED',
      category: 'NETWORK',
      referenceType: 'MEMBERSHIP',
      referenceId: user.uid,
      title: `Role updated for ${user.displayName}`,
      message: `${user.displayName} is now ${user.role} in ${org.name}.`,
    });
  }

  const network = connectedNetworkPlan(plan);
  if (network !== undefined && org.networkRole !== 'ISOLATED') {
    shapes.push({
      type: 'CONNECTION_RESPONDED',
      category: 'NETWORK',
      referenceType: 'CONNECTION',
      referenceId: network.connectionId,
      title: 'Connection accepted',
      message: `${network.supplier.name} accepted the connection with ${network.buyer.name}.`,
    });
    const connectedTypes = [
      { type: 'CPO_SUBMITTED' as const, status: 'SUBMITTED' },
      { type: 'CPO_RESPONDED' as const, status: 'ACCEPTED' },
      { type: 'CPO_SHIPPED' as const, status: 'SHIPPED' },
      { type: 'CPO_RECEIVED' as const, status: 'RECEIVED' },
    ];
    for (const entry of connectedTypes) {
      const order = network.orders.find((candidate) => candidate.status === entry.status);
      if (order === undefined) continue;
      shapes.push({
        type: entry.type,
        category: 'ORDERS',
        referenceType: 'PURCHASE_ORDER',
        referenceId: order.purchaseOrderId,
        title: `Connected order ${entry.status.toLowerCase()}`,
        message: `${order.orderNumber ?? order.purchaseOrderId} is now ${entry.status}.`,
      });
    }
  }

  if (shapes.length === 0) throw new Error(`${org.orgId} produced no notification shapes`);
  return shapes;
}

function writeForUser(
  builder: DatasetBuilder,
  org: QaOrg,
  user: QaUser,
  shapes: readonly NotificationShape[],
): void {
  const total = user.unreadNotifications + user.readNotifications;
  for (let index = 0; index < total; index += 1) {
    const shape = shapes[index % shapes.length];
    if (shape === undefined) throw new Error('notification shape lookup failed');
    const notificationId = `qa-notif-${ordinal(index + 1, 3)}`;
    builder.add(paths.notification(user.uid, notificationId), NotificationSchema, {
      organizationId: org.orgId,
      organizationName: org.name,
      type: shape.type,
      category: shape.category,
      title: shape.title,
      message: shape.message,
      referenceType: shape.referenceType,
      referenceId: shape.referenceId,
      // Unread rows come first so the `limit(50)` listener sees a full window
      // wherever the user has more than fifty of them.
      read: index >= user.unreadNotifications,
      // Distinct minutes keep `createdAt DESC` a total order with no ties.
      createdAt: epochPlus(14, 9, index),
    });
  }
}

export function generateNotifications(builder: DatasetBuilder, plan: QaPlan): void {
  for (const org of plan.organizations) {
    const shapes = shapesFor(org, plan);
    for (const user of org.users) {
      writeForUser(builder, org, user, shapes);
    }
  }
}
