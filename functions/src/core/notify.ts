import {
  IdSchema,
  NotificationTypeSchema,
  ReferenceTypeSchema,
  paths,
  type NotificationCategory,
} from '@stockmok/shared';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { fail } from './errors.js';
import { serverTimestamp } from './time.js';
import type { TransactionScope } from './transaction.js';
import { readActiveMemberUidsByRole } from '../guards/reads.js';

/**
 * The notification foundation.
 *
 * `users/{uid}/notifications/{notificationId}` — backend-created, self-read,
 * and self-updatable on `read` alone. `create` and `delete` are denied to
 * everyone, so a user cannot fabricate their own notification (DB-02 §2.3).
 *
 * Recipients are resolved **before any write**, by `Q-059` on the organization's
 * own members, and the fan-out is hard-bounded at 50. Exceeding the bound skips
 * the notification and logs, rather than aborting a command whose real work
 * already succeeded (control pack 11 §17, DB-06 §7
 * `NOTIFICATION_FANOUT_EXCEEDED`).
 */

export type NotificationType = (typeof NotificationTypeSchema.options)[number];
export type ReferenceType = (typeof ReferenceTypeSchema.options)[number];

/** DB-04 §8 `Q-059`. */
export const NOTIFICATION_FANOUT_LIMIT = 50;

/**
 * DB-02 §2.3 · A3R-14 — total over all ten `type` values, so the frozen tab
 * arithmetic `All = Stock + Orders + Network` holds. `MEMBERSHIP_CHANGED` sits
 * under NETWORK, the tab that already carries "who has access" events; there is
 * no fourth tab.
 */
export const NOTIFICATION_CATEGORY_BY_TYPE = {
  LOW_STOCK: 'STOCK',
  OUT_OF_STOCK: 'STOCK',
  PO_RECEIVED: 'ORDERS',
  CPO_SUBMITTED: 'ORDERS',
  CPO_RESPONDED: 'ORDERS',
  CPO_SHIPPED: 'ORDERS',
  CPO_RECEIVED: 'ORDERS',
  CONNECTION_REQUESTED: 'NETWORK',
  CONNECTION_RESPONDED: 'NETWORK',
  MEMBERSHIP_CHANGED: 'NETWORK',
} as const satisfies Record<NotificationType, NotificationCategory>;

export function categoryForType(type: NotificationType): NotificationCategory {
  return NOTIFICATION_CATEGORY_BY_TYPE[type];
}

/** `Q-059` — ACTIVE members of `orgId` holding one of `roles`, bounded at 50. */
export async function resolveNotificationRecipients(
  db: Firestore,
  orgId: string,
  roles: readonly string[],
  txn?: Transaction,
): Promise<readonly string[]> {
  return readActiveMemberUidsByRole(db, orgId, roles, NOTIFICATION_FANOUT_LIMIT, txn);
}

export interface NotifyRequest {
  readonly recipients: readonly string[];
  readonly orgId: string;
  readonly organizationName: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly referenceType: ReferenceType;
  readonly referenceId: string;
}

export interface NotifyOutcome {
  readonly written: number;
  /** True when the fan-out bound was exceeded and nothing was written. */
  readonly skipped: boolean;
  readonly recipients: readonly string[];
}

export interface NotificationRecord {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly type: NotificationType;
  readonly category: NotificationCategory;
  readonly title: string;
  readonly message: string;
  readonly referenceType: ReferenceType;
  readonly referenceId: string;
  readonly read: false;
}

/**
 * Builds one recipient's record. `category` is derived from `type` rather than
 * supplied, and `read` is always `false` on create — the only field the
 * recipient may ever change.
 */
export function buildNotification(request: NotifyRequest): NotificationRecord {
  if (!NotificationTypeSchema.safeParse(request.type).success) {
    fail('SCHEMA_INVALID', 'Unknown notification type.', { path: 'type' });
  }
  if (!ReferenceTypeSchema.safeParse(request.referenceType).success) {
    fail('SCHEMA_INVALID', 'Unknown notification reference type.', { path: 'referenceType' });
  }
  if (request.title.length === 0 || request.title.length > 120) {
    fail('SCHEMA_INVALID', 'A notification title is required.', { path: 'title' });
  }
  if (request.message.length === 0 || request.message.length > 400) {
    fail('SCHEMA_INVALID', 'A notification message is required.', { path: 'message' });
  }
  if (!IdSchema.safeParse(request.referenceId).success) {
    fail('SCHEMA_INVALID', 'A notification reference id must be one path segment.', {
      path: 'referenceId',
    });
  }
  return {
    organizationId: request.orgId,
    organizationName: request.organizationName,
    type: request.type,
    category: categoryForType(request.type),
    title: request.title,
    message: request.message,
    referenceType: request.referenceType,
    referenceId: request.referenceId,
    read: false,
  };
}

/** Every recipient must be a valid uid. Duplicates collapse to one document. */
export function normalizeRecipients(recipients: readonly string[]): readonly string[] {
  const unique = [...new Set(recipients)];
  for (const uid of unique) {
    if (!IdSchema.safeParse(uid).success) {
      fail('SCHEMA_INVALID', 'A notification recipient must be a valid uid.', {
        path: 'recipients',
      });
    }
  }
  return unique;
}

/**
 * Writes one notification per recipient inside the caller's transaction. The
 * writes are part of the atomic unit, which is exactly why the recipient list is
 * bounded and resolved before any write.
 */
export function writeNotifications(
  scope: TransactionScope,
  db: Firestore,
  request: NotifyRequest,
): NotifyOutcome {
  const recipients = normalizeRecipients(request.recipients);
  if (recipients.length === 0) return { written: 0, skipped: false, recipients };
  if (recipients.length > NOTIFICATION_FANOUT_LIMIT) {
    console.warn(
      `NOTIFICATION_FANOUT_EXCEEDED org=${request.orgId} type=${request.type} recipients=${String(recipients.length)}`,
    );
    return { written: 0, skipped: true, recipients };
  }

  const record = buildNotification(request);
  for (const uid of recipients) {
    const notificationId = db.collection(`${paths.user(uid)}/notifications`).doc().id;
    scope.create(db.doc(paths.notification(uid, notificationId)), {
      ...record,
      createdAt: serverTimestamp(),
    });
  }
  return { written: recipients.length, skipped: false, recipients };
}
