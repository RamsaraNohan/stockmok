import {
  ConnectionStatusSchema,
  paths,
  type ConnectionStatus,
  type PoStatus,
} from '@stockmok/shared';
import { serverPaths } from '@stockmok/shared/server/paths';
import type { DocumentReference, DocumentSnapshot, Firestore } from 'firebase-admin/firestore';
import { fail, untypedFailure } from '../core/errors.js';
import { NOTIFICATION_FANOUT_LIMIT, writeNotifications } from '../core/notify.js';
import { serverTimestamp, type ServerTimestamp } from '../core/time.js';
import type { TransactionScope } from '../core/transaction.js';
import type { TrustedMembership } from '../guards/membership.js';
import { readActiveMemberUidsByRole } from '../guards/reads.js';

/**
 * The connected-business utility — B4's shared half of `connection.*`,
 * `partnerCatalog.*`, `mapping.*` and `cpo.*`.
 *
 * Three things every connected command needs and none may improvise:
 *
 *  1. **The canonical connection is the only source of direction.** The caller
 *     never states which side it is acting as. `buyerOrgId` and `supplierOrgId`
 *     are read from `connections/{id}` inside the transaction and compared to
 *     the **verified** membership (DB-05 §7.2). The document id happens to be
 *     `{buyerOrgId}__{supplierOrgId}`, and nothing here parses it — an id is a
 *     name, not evidence.
 *
 *  2. **Canonical and both projections are written together**, which is what
 *     makes `INV-19` hold by construction rather than by a reconciler
 *     (DB-06 §4). {@link writeConnectionProjections} and
 *     {@link writeConnectedHistory} exist so a command physically cannot write
 *     one and forget the other.
 *
 *  3. **A connection is collaboration, not access** (`INV-14`, DB-05 §8).
 *     Nothing in this module reads a counterparty's products, balances,
 *     movements, costs, partners, settings or members for display. The one
 *     cross-tenant member read is `Q-059` recipient resolution, which returns
 *     uids for notification fan-out and never leaves the backend.
 */

/** A connected order carries a bounded number of lines; DB-04 §8 caps every in-transaction query. */
export const MAX_CPO_ITEMS = 100;

/** DB-04 §6 `Q-046` — the hard server-side ceiling on a partner-catalog page. */
export const MAX_PARTNER_CATALOG_PAGE = 100;

/**
 * `partnerSkuNormalized` — the stored lookup key (DB-02 §6.1). The typed SKU is
 * only ever a lookup key and never the stored link (`BR-008`, `FR-NET-014`), so
 * both sides of the comparison are normalised the same way, here, once.
 */
export function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase();
}

export async function readOrganizationName(
  scope: TransactionScope,
  db: Firestore,
  orgId: string,
): Promise<string> {
  const snapshot = await scope.get(db.doc(paths.organization(orgId)));
  const name: unknown = snapshot.get('name');
  return typeof name === 'string' ? name : orgId;
}

// ─── canonical connection ───────────────────────────────────────────────────

export interface CanonicalConnectionState {
  readonly ref: DocumentReference;
  readonly exists: boolean;
  readonly connectionId: string;
  readonly buyerOrgId: string;
  readonly supplierOrgId: string;
  readonly buyerHandle: string;
  readonly buyerName: string;
  readonly supplierHandle: string;
  readonly supplierName: string;
  readonly status: ConnectionStatus | undefined;
  readonly requestedByUid: string | undefined;
}

function toConnectionState(
  ref: DocumentReference,
  connectionId: string,
  snapshot: DocumentSnapshot,
): CanonicalConnectionState {
  if (!snapshot.exists) {
    return {
      ref,
      exists: false,
      connectionId,
      buyerOrgId: '',
      supplierOrgId: '',
      buyerHandle: '',
      buyerName: '',
      supplierHandle: '',
      supplierName: '',
      status: undefined,
      requestedByUid: undefined,
    };
  }
  const status = ConnectionStatusSchema.safeParse(snapshot.get('status'));
  if (!status.success) {
    // A canonical connection that does not carry one of the four frozen
    // statuses is not a connection. Deny rather than guess.
    untypedFailure('internal', 'The connection record does not carry a valid status.');
  }
  const requestedByUid: unknown = snapshot.get('requestedByUid');
  return {
    ref,
    exists: true,
    connectionId,
    buyerOrgId: snapshot.get('buyerOrgId') as string,
    supplierOrgId: snapshot.get('supplierOrgId') as string,
    buyerHandle: snapshot.get('buyerHandle') as string,
    buyerName: snapshot.get('buyerName') as string,
    supplierHandle: snapshot.get('supplierHandle') as string,
    supplierName: snapshot.get('supplierName') as string,
    status: status.data,
    requestedByUid: typeof requestedByUid === 'string' ? requestedByUid : undefined,
  };
}

/** By deterministic id — `connections/{buyerOrgId}__{supplierOrgId}` (DB-02 §7.2). */
export async function readCanonicalConnectionByParties(
  scope: TransactionScope,
  db: Firestore,
  buyerOrgId: string,
  supplierOrgId: string,
): Promise<CanonicalConnectionState> {
  const connectionId = `${buyerOrgId}__${supplierOrgId}`;
  const ref = db.doc(serverPaths.canonicalConnection(buyerOrgId, supplierOrgId));
  return toConnectionState(ref, connectionId, await scope.get(ref));
}

/**
 * By the id the caller supplied. The id is a routing hint exactly as `orgId`
 * is: it locates a document, and the **document** then states who the parties
 * are. A caller that names a connection it is not party to is refused by
 * {@link requireConnectionParty}, not by anything about the id's shape.
 */
export async function readCanonicalConnection(
  scope: TransactionScope,
  db: Firestore,
  connectionId: string,
): Promise<CanonicalConnectionState> {
  if (connectionId.length === 0 || connectionId.includes('/')) {
    fail('SCHEMA_INVALID', 'A connection id must be one path segment.', { path: 'connectionId' });
  }
  const ref = db.doc(`connections/${connectionId}`);
  const state = toConnectionState(ref, connectionId, await scope.get(ref));
  if (!state.exists) {
    fail('RESOURCE_NOT_FOUND', 'That connection was not found.');
  }
  return state;
}

/** The caller must be one of the two named parties — nothing else is a party. */
export function requireConnectionParty(
  actor: TrustedMembership,
  connection: CanonicalConnectionState,
): 'BUYER' | 'SUPPLIER' {
  if (actor.orgId === connection.buyerOrgId) return 'BUYER';
  if (actor.orgId === connection.supplierOrgId) return 'SUPPLIER';
  fail('CROSS_TENANT_REFERENCE', 'Your organization is not part of this connection.');
}

/**
 * DB-05 §7.2 step 2 — *buyer transitions require `buyerOrgId`, supplier
 * transitions require `supplierOrgId`*. Derived from the persisted record, so a
 * payload claiming a side is not merely ignored: there is no such payload field
 * anywhere in the frozen catalog to ignore.
 */
export function requireBuyerSide(
  actor: TrustedMembership,
  connection: CanonicalConnectionState,
): void {
  if (actor.orgId !== connection.buyerOrgId) {
    fail('CROSS_TENANT_REFERENCE', 'Only the buying organization can do that.');
  }
}

export function requireSupplierSide(
  actor: TrustedMembership,
  connection: CanonicalConnectionState,
): void {
  if (actor.orgId !== connection.supplierOrgId) {
    fail('CROSS_TENANT_REFERENCE', 'Only the supplying organization can do that.');
  }
}

/**
 * DB-05 §7.2 step 3 — re-read **inside the transaction**, so a connection
 * disabled between page load and submit is rejected rather than acted on
 * (`ATTACK-09`). Every `cpo.*` and `mapping.*` command calls this; `DISABLED`
 * blocks new work while leaving history intact and readable (`SC-17`).
 */
export function requireConnectionActive(connection: CanonicalConnectionState): void {
  if (connection.status !== 'ACTIVE') {
    fail('CONNECTION_NOT_ACTIVE', 'This connection is not active.');
  }
}

// ─── connection projections ─────────────────────────────────────────────────

export interface ConnectionFields {
  readonly connectionId: string;
  readonly buyerOrgId: string;
  readonly supplierOrgId: string;
  readonly buyerHandle: string;
  readonly buyerName: string;
  readonly supplierHandle: string;
  readonly supplierName: string;
  readonly status: ConnectionStatus;
  readonly requestedByUid: string;
  readonly requestedAt: unknown;
  readonly respondedByUid?: string | undefined;
  readonly respondedAt?: unknown;
  readonly disabledAt?: unknown;
  readonly updatedAt: ServerTimestamp;
}

export function projectionRef(db: Firestore, orgId: string, connectionId: string) {
  return db.doc(paths.connectionProjection(orgId, connectionId));
}

/**
 * Reads a projection's `ordersPlacedCount` so the projection can be rewritten
 * as a complete, exact field set instead of merged into. DV-12's counter is
 * owned by `cpo.submit`; a connection transition must carry it forward, and a
 * fresh request starts it at zero (DB-02 §6.3).
 */
export async function readProjectionOrdersPlacedCount(
  scope: TransactionScope,
  db: Firestore,
  orgId: string,
  connectionId: string,
): Promise<number> {
  const snapshot = await scope.get(projectionRef(db, orgId, connectionId));
  const value: unknown = snapshot.get('ordersPlacedCount');
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/**
 * Writes **both** organization projections from one canonical field set
 * (DB-02 §6.3: *"same field set as the canonical record, written for both
 * parties in the same transaction"*).
 *
 * Both, always, in one call — a command cannot update the canonical record and
 * one projection and leave the other stale, because there is no function here
 * that writes a single projection.
 */
export function writeConnectionProjections(
  scope: TransactionScope,
  db: Firestore,
  fields: ConnectionFields,
  ordersPlacedCount: { readonly buyer: number; readonly supplier: number },
): void {
  const base = canonicalConnectionData(fields);
  scope.set(projectionRef(db, fields.buyerOrgId, fields.connectionId), {
    ...base,
    ordersPlacedCount: ordersPlacedCount.buyer,
  });
  scope.set(projectionRef(db, fields.supplierOrgId, fields.connectionId), {
    ...base,
    ordersPlacedCount: ordersPlacedCount.supplier,
  });
}

/** The canonical document's exact allow-listed field set (DB-02 §7.2, `INV-13`). */
export function canonicalConnectionData(fields: ConnectionFields): Record<string, unknown> {
  return {
    connectionId: fields.connectionId,
    buyerOrgId: fields.buyerOrgId,
    supplierOrgId: fields.supplierOrgId,
    buyerHandle: fields.buyerHandle,
    buyerName: fields.buyerName,
    supplierHandle: fields.supplierHandle,
    supplierName: fields.supplierName,
    status: fields.status,
    requestedByUid: fields.requestedByUid,
    requestedAt: fields.requestedAt,
    ...(fields.respondedByUid !== undefined ? { respondedByUid: fields.respondedByUid } : {}),
    ...(fields.respondedAt !== undefined ? { respondedAt: fields.respondedAt } : {}),
    ...(fields.disabledAt !== undefined ? { disabledAt: fields.disabledAt } : {}),
    updatedAt: fields.updatedAt,
  };
}

// ─── connected purchase order ───────────────────────────────────────────────

export interface CanonicalOrderState {
  readonly ref: DocumentReference;
  readonly snapshot: DocumentSnapshot;
  readonly purchaseOrderId: string;
  readonly buyerOrgId: string;
  readonly supplierOrgId: string;
  readonly connectionId: string;
  readonly status: PoStatus;
  readonly orderNumber: string | undefined;
}

/**
 * The canonical connected order — `connectedPurchaseOrders/{poId}`, zone 4, no
 * client access at all (DB-05 §5). Both parties' sides are read from **this**
 * document; the caller's projection is never trusted for direction, status or
 * quantity, because a projection is an output of the workflow rather than an
 * input to it.
 */
export async function readCanonicalOrder(
  scope: TransactionScope,
  db: Firestore,
  purchaseOrderId: string,
): Promise<CanonicalOrderState> {
  const ref = db.doc(serverPaths.connectedPurchaseOrder(purchaseOrderId));
  const snapshot = await scope.get(ref);
  if (!snapshot.exists) {
    fail('RESOURCE_NOT_FOUND', 'That connected purchase order was not found.');
  }
  const orderNumber: unknown = snapshot.get('orderNumber');
  return {
    ref,
    snapshot,
    purchaseOrderId,
    buyerOrgId: snapshot.get('buyerOrgId') as string,
    supplierOrgId: snapshot.get('supplierOrgId') as string,
    connectionId: snapshot.get('connectionId') as string,
    status: snapshot.get('status') as PoStatus,
    orderNumber: typeof orderNumber === 'string' ? orderNumber : undefined,
  };
}

export async function readCanonicalOrderItems(
  scope: TransactionScope,
  db: Firestore,
  purchaseOrderId: string,
): Promise<readonly DocumentSnapshot[]> {
  const snapshot = await scope.query(
    db.collection(`${serverPaths.connectedPurchaseOrder(purchaseOrderId)}/items`),
    MAX_CPO_ITEMS,
  );
  return snapshot.docs;
}

/**
 * Applies one transition to the canonical record **and both projections** in a
 * single call, so `INV-19` cannot be broken by forgetting a document. `shared`
 * is written identically to all three — that is what the invariant means by
 * *"always agree on status and quantities"*.
 *
 * `buyerOnly` exists for exactly one field, and the reason is a privacy rule
 * rather than a convenience: `receivingWarehouseId` is the buyer's own store
 * room, and **warehouse identity never crosses the connected boundary**
 * (DB-05 §8). It is written to the buyer's projection because
 * `warehouse.archive`'s `Q-057` guard reads it there, and to nothing else —
 * the canonical record carries only fields *both* parties are entitled to see
 * (DB-02 §7.3).
 */
export function updateConnectedOrderEverywhere(
  scope: TransactionScope,
  db: Firestore,
  order: CanonicalOrderState,
  shared: Record<string, unknown>,
  buyerOnly: Record<string, unknown> = {},
): void {
  scope.update(order.ref, shared);
  scope.update(db.doc(paths.purchaseOrder(order.buyerOrgId, order.purchaseOrderId)), {
    ...shared,
    ...buyerOnly,
  });
  scope.update(db.doc(paths.purchaseOrder(order.supplierOrgId, order.purchaseOrderId)), shared);
}

/**
 * DB-02 §5.4 — *"for connected orders the identical row is written to the
 * canonical record **and** both projections, so both parties see one timeline
 * with correct attribution."* Identical means identical: one `historyId`, one
 * field set, three locations.
 *
 * `operationId` is present only when the command that caused the transition is
 * idempotent. `cpo.cancel` is not (DB-06 §1), so its row carries none rather
 * than a fabricated receipt id that resolves to nothing.
 */
export function writeConnectedHistory(
  scope: TransactionScope,
  db: Firestore,
  actor: TrustedMembership,
  actorOrgName: string,
  order: {
    readonly purchaseOrderId: string;
    readonly buyerOrgId: string;
    readonly supplierOrgId: string;
  },
  fromStatus: PoStatus | null,
  toStatus: PoStatus,
  operationId: string | undefined,
  note?: string,
): string {
  const historyId = db
    .collection(`${serverPaths.connectedPurchaseOrder(order.purchaseOrderId)}/history`)
    .doc().id;
  const row = {
    historyId,
    fromStatus,
    toStatus,
    actorUid: actor.uid,
    actorName: actor.displayName,
    actorOrgId: actor.orgId,
    actorOrgName,
    ...(operationId !== undefined ? { operationId } : {}),
    ...(note !== undefined ? { note } : {}),
    createdAt: serverTimestamp(),
  };
  scope.create(
    db.doc(serverPaths.connectedPurchaseOrderHistory(order.purchaseOrderId, historyId)),
    row,
  );
  scope.create(
    db.doc(paths.purchaseOrderHistory(order.buyerOrgId, order.purchaseOrderId, historyId)),
    row,
  );
  scope.create(
    db.doc(paths.purchaseOrderHistory(order.supplierOrgId, order.purchaseOrderId, historyId)),
    row,
  );
  return historyId;
}

// ─── notifications ──────────────────────────────────────────────────────────

export interface CounterpartyNotification {
  readonly orgId: string;
  readonly organizationName: string;
  readonly recipients: readonly string[];
}

/**
 * Resolves recipients in the **receiving** organization before any write, via
 * `Q-059`, bounded at 50 (DB-06 §0). A notification belongs to the workspace
 * the recipient will read it in, so `organizationId` is the recipient's own
 * organization — never the actor's.
 */
export async function resolveCounterpartyNotification(
  scope: TransactionScope,
  db: Firestore,
  orgId: string,
  roles: readonly string[],
): Promise<CounterpartyNotification> {
  const organizationName = await readOrganizationName(scope, db, orgId);
  const recipients = await readActiveMemberUidsByRole(
    db,
    orgId,
    roles,
    NOTIFICATION_FANOUT_LIMIT,
    scope.raw,
  );
  return { orgId, organizationName, recipients };
}

export function writeCounterpartyNotification(
  scope: TransactionScope,
  db: Firestore,
  target: CounterpartyNotification,
  notification: {
    readonly type:
      | 'CONNECTION_REQUESTED'
      | 'CONNECTION_RESPONDED'
      | 'CPO_SUBMITTED'
      | 'CPO_RESPONDED'
      | 'CPO_SHIPPED'
      | 'CPO_RECEIVED';
    readonly title: string;
    readonly message: string;
    readonly referenceType: 'CONNECTION' | 'PURCHASE_ORDER';
    readonly referenceId: string;
  },
): void {
  if (target.recipients.length === 0) return;
  writeNotifications(scope, db, {
    recipients: target.recipients,
    orgId: target.orgId,
    organizationName: target.organizationName,
    ...notification,
  });
}
