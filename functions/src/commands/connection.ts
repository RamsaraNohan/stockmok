import { paths } from '@stockmok/shared';
import {
  canonicalConnectionData,
  readCanonicalConnection,
  readCanonicalConnectionByParties,
  readOrganizationName,
  readProjectionOrdersPlacedCount,
  requireConnectionParty,
  requireSupplierSide,
  resolveCounterpartyNotification,
  writeConnectionProjections,
  writeCounterpartyNotification,
  type ConnectionFields,
} from './connected-lib.js';
import { requireMembership } from './lib.js';
import { requireOperationId } from './stock-lib.js';
import { writeAudit, writeAuditFor } from '../core/audit.js';
import { defineCommand } from '../core/define-command.js';
import { fail } from '../core/errors.js';
import { serverTimestamp } from '../core/time.js';
import { ADMINS, PARTNER_WRITERS } from '../guards/roles.js';

/**
 * `C-18`, `C-19`, `C-20` — the connected-business relationship.
 *
 * **A connection is a directional workflow relationship and nothing else.**
 * `buyerOrgId → supplierOrgId`; the reverse relationship is a separate document,
 * so two businesses can be each other's supplier without ambiguity (DB-02 §7.2).
 * An ACTIVE connection grants collaboration — a partner catalog page, a mapping,
 * a connected order. It grants **no** read of the counterparty's products, stock
 * balances, movements, costs, private partners, settings or members (`INV-14`,
 * DB-05 §8), and nothing in this file reads any of them.
 *
 * Every mutation writes the canonical zone-4 record **and both zone-3
 * projections in the same transaction**, which is what makes `INV-19` hold by
 * construction (DB-06 §4). There is no code path here that writes one and not
 * the others.
 */

const CONNECTION_ENTITY = 'CONNECTION';

/**
 * C-18 `connection.request` — buyer `PARTNER_WRITERS`, idempotent,
 * transactional, audited in both organizations, notifies the supplier's
 * `ADMINS`.
 *
 * **Directional uniqueness is structural, not checked.** The document id is the
 * deterministic `{buyerOrgId}__{supplierOrgId}` and a first request is
 * `txn.create`, so two concurrent requests for the same pair produce exactly one
 * winner and one `already-exists` — with no partially-created connection,
 * because the canonical record and both projections are one transaction
 * (DB-06 §5, `T-CONC-06`). A fresh request is permitted only when no document
 * exists or the existing one is `REJECTED`/`DISABLED` (DB-07 §6); `PENDING` and
 * `ACTIVE` are refused `CONNECTION_EXISTS`.
 *
 * **This is not a re-enable.** A `DISABLED` record is not reactivated: it is
 * replaced by a new `PENDING` request on the same document, which the supplier
 * must accept again. That is the frozen transition, and replacing the record
 * outright is what stops a stale `respondedAt` or `disabledAt` surviving into
 * the new state.
 *
 * The supplier is resolved from the **public directory** by handle, which is
 * the only cross-tenant lookup a buyer is entitled to make. Nothing about the
 * supplier beyond its public directory entry is read.
 */
export const connectionRequest = defineCommand({
  id: 'C-18',
  authorization: { kind: 'MEMBER_ROLE', roles: PARTNER_WRITERS },
  handler: async ({ db, scope, membership, orgId, payload, operationId }) => {
    const actor = requireMembership(membership);
    const opId = requireOperationId(operationId);
    const supplierHandle = payload.supplierHandle;

    // The buyer's own identity comes from its own organization document, never
    // from the payload.
    const buyerOrg = await scope.get(db.doc(paths.organization(orgId)));
    if (!buyerOrg.exists) {
      fail('RESOURCE_NOT_FOUND', 'Your organization was not found.');
    }
    const buyerHandle = buyerOrg.get('handle') as string;
    const buyerOrgName = buyerOrg.get('name') as string;

    if (supplierHandle === buyerHandle) {
      fail('SELF_CONNECTION', 'An organization cannot connect to itself.');
    }

    const supplierEntry = await scope.get(db.doc(paths.organizationDirectory(supplierHandle)));
    if (!supplierEntry.exists) {
      fail('RESOURCE_NOT_FOUND', 'No business is registered with that handle.');
    }
    const supplierOrgId = supplierEntry.get('organizationId') as string;
    const supplierName = supplierEntry.get('name') as string;

    // Belt and braces: two handles differing does not prove two organizations
    // do, if a directory entry were ever mis-keyed.
    if (supplierOrgId === orgId) {
      fail('SELF_CONNECTION', 'An organization cannot connect to itself.');
    }

    // DB-06 §6 names **both** directory entries in the read set. The buyer's own
    // is read so its projection carries the same public name the supplier sees.
    const buyerEntry = await scope.get(db.doc(paths.organizationDirectory(buyerHandle)));
    const buyerDirectoryName: unknown = buyerEntry.get('name');

    const existing = await readCanonicalConnectionByParties(scope, db, orgId, supplierOrgId);
    if (existing.exists && (existing.status === 'PENDING' || existing.status === 'ACTIVE')) {
      fail('CONNECTION_EXISTS', 'A connection with this business already exists.');
    }

    // DV-12's counter belongs to the relationship, not to one attempt at it, so
    // a re-request after a disable carries the orders already placed forward.
    const buyerCount = await readProjectionOrdersPlacedCount(
      scope,
      db,
      orgId,
      existing.connectionId,
    );
    const supplierCount = await readProjectionOrdersPlacedCount(
      scope,
      db,
      supplierOrgId,
      existing.connectionId,
    );
    const supplierNotify = await resolveCounterpartyNotification(scope, db, supplierOrgId, ADMINS);

    // ─── every read is done; the write phase begins here ────────────────────
    const now = serverTimestamp();
    const fields: ConnectionFields = {
      connectionId: existing.connectionId,
      buyerOrgId: orgId,
      supplierOrgId,
      buyerHandle,
      buyerName: typeof buyerDirectoryName === 'string' ? buyerDirectoryName : buyerOrgName,
      supplierHandle,
      supplierName,
      status: 'PENDING',
      requestedByUid: actor.uid,
      requestedAt: now,
      updatedAt: now,
    };

    if (existing.exists) {
      scope.set(existing.ref, canonicalConnectionData(fields));
    } else {
      scope.create(existing.ref, canonicalConnectionData(fields));
    }
    writeConnectionProjections(scope, db, fields, { buyer: buyerCount, supplier: supplierCount });

    writeAudit(scope, db, actor, {
      action: 'connection.request',
      entityType: CONNECTION_ENTITY,
      entityId: fields.connectionId,
      operationId: opId,
      summary: `Requested a connection with ${supplierName}.`,
    });
    writeAuditFor(scope, db, actor, supplierOrgId, {
      action: 'connection.request',
      entityType: CONNECTION_ENTITY,
      entityId: fields.connectionId,
      operationId: opId,
      summary: `${fields.buyerName} requested a connection.`,
    });

    writeCounterpartyNotification(scope, db, supplierNotify, {
      type: 'CONNECTION_REQUESTED',
      title: 'Connection request',
      message: `${fields.buyerName} would like to connect with you as a supplier.`,
      referenceType: 'CONNECTION',
      referenceId: fields.connectionId,
    });

    return { connectionId: fields.connectionId, status: 'PENDING', supplierOrgId };
  },
});

/**
 * C-19 `connection.respond` — **supplier** `PARTNER_WRITERS`, idempotent,
 * transactional, audited in both organizations, notifies the requester.
 *
 * `PENDING → ACTIVE` or `PENDING → REJECTED` (DB-07 §6). The acting side is
 * derived from the canonical record, so a buyer answering its own request is
 * `CROSS_TENANT_REFERENCE`: it is denied the *side*, not merely the role, which
 * is the check that still holds when the same person is a `PARTNER_WRITERS` in
 * both organizations.
 *
 * The three status fields are merged onto the projections rather than rewritten,
 * so `ordersPlacedCount` — which this command has no business touching — is
 * preserved by construction rather than by remembering to copy it.
 */
export const connectionRespond = defineCommand({
  id: 'C-19',
  authorization: { kind: 'MEMBER_ROLE', roles: PARTNER_WRITERS },
  handler: async ({ db, scope, membership, payload, operationId }) => {
    const actor = requireMembership(membership);
    const opId = requireOperationId(operationId);

    const connection = await readCanonicalConnection(scope, db, payload.connectionId);
    requireSupplierSide(actor, connection);
    if (connection.status !== 'PENDING') {
      fail(
        'INVALID_TRANSITION',
        `A ${connection.status ?? 'unknown'} connection cannot be answered.`,
      );
    }
    const requestedByUid = connection.requestedByUid;
    if (requestedByUid === undefined) {
      fail('INVALID_TRANSITION', 'This connection request has no requester.');
    }

    const accepted = payload.response === 'ACCEPT';
    const nextStatus = accepted ? 'ACTIVE' : 'REJECTED';

    // DB-06 §4 — *"notification to the requester"*, singular. Sent only while
    // that person is still an ACTIVE member of the buying organization; someone
    // who has left is not told about a workspace they can no longer open.
    const requesterMembership = await scope.get(
      db.doc(paths.member(connection.buyerOrgId, requestedByUid)),
    );
    const requesterActive =
      requesterMembership.exists && requesterMembership.get('status') === 'ACTIVE';
    const buyerOrgName = await readOrganizationName(scope, db, connection.buyerOrgId);

    // ─── every read is done; the write phase begins here ────────────────────
    const now = serverTimestamp();
    const patch = {
      status: nextStatus,
      respondedByUid: actor.uid,
      respondedAt: now,
      updatedAt: now,
    };
    scope.update(connection.ref, patch);
    scope.set(
      db.doc(paths.connectionProjection(connection.buyerOrgId, connection.connectionId)),
      patch,
      { merge: true },
    );
    scope.set(
      db.doc(paths.connectionProjection(connection.supplierOrgId, connection.connectionId)),
      patch,
      { merge: true },
    );

    writeAudit(scope, db, actor, {
      action: 'connection.respond',
      entityType: CONNECTION_ENTITY,
      entityId: connection.connectionId,
      operationId: opId,
      summary: accepted
        ? `Accepted the connection request from ${connection.buyerName}.`
        : `Declined the connection request from ${connection.buyerName}.`,
    });
    writeAuditFor(scope, db, actor, connection.buyerOrgId, {
      action: 'connection.respond',
      entityType: CONNECTION_ENTITY,
      entityId: connection.connectionId,
      operationId: opId,
      summary: accepted
        ? `${connection.supplierName} accepted your connection request.`
        : `${connection.supplierName} declined your connection request.`,
    });

    if (requesterActive) {
      writeCounterpartyNotification(
        scope,
        db,
        {
          orgId: connection.buyerOrgId,
          organizationName: buyerOrgName,
          recipients: [requestedByUid],
        },
        {
          type: 'CONNECTION_RESPONDED',
          title: accepted ? 'Connection accepted' : 'Connection declined',
          message: accepted
            ? `${connection.supplierName} accepted your connection request.`
            : `${connection.supplierName} declined your connection request.`,
          referenceType: 'CONNECTION',
          referenceId: connection.connectionId,
        },
      );
    }

    return { connectionId: connection.connectionId, status: nextStatus };
  },
});

/**
 * C-20 `connection.disable` — `ADMINS`, **not** idempotent, transactional,
 * audited in both organizations, no notification.
 *
 * `ACTIVE → DISABLED` (DB-07 §6). **Either party's `ADMINS` may disable**: the
 * transition table names a role and, uniquely among the connection rows, no
 * side — every other row says *"of the buyer"* or *"of the supplier"*. A
 * Procurement Manager cannot disable even though it can request and respond.
 *
 * **There is no re-enable** — no reconnect command, flow or reactivation exists.
 * `DISABLED` blocks new mappings and new connected orders while leaving every
 * historical mapping, order and stock movement intact and readable by the
 * legitimate parties (`SC-17`).
 */
export const connectionDisable = defineCommand({
  id: 'C-20',
  authorization: { kind: 'MEMBER_ROLE', roles: ADMINS },
  handler: async ({ db, scope, membership, payload }) => {
    const actor = requireMembership(membership);

    const connection = await readCanonicalConnection(scope, db, payload.connectionId);
    const side = requireConnectionParty(actor, connection);
    if (connection.status !== 'ACTIVE') {
      fail(
        'INVALID_TRANSITION',
        `A ${connection.status ?? 'unknown'} connection cannot be disabled.`,
      );
    }

    // ─── every read is done; the write phase begins here ────────────────────
    const now = serverTimestamp();
    const patch = { status: 'DISABLED', disabledAt: now, updatedAt: now };
    scope.update(connection.ref, patch);
    scope.set(
      db.doc(paths.connectionProjection(connection.buyerOrgId, connection.connectionId)),
      patch,
      { merge: true },
    );
    scope.set(
      db.doc(paths.connectionProjection(connection.supplierOrgId, connection.connectionId)),
      patch,
      { merge: true },
    );

    const counterpartyOrgId = side === 'BUYER' ? connection.supplierOrgId : connection.buyerOrgId;
    const actorOrgName = side === 'BUYER' ? connection.buyerName : connection.supplierName;
    const counterpartyName = side === 'BUYER' ? connection.supplierName : connection.buyerName;

    writeAudit(scope, db, actor, {
      action: 'connection.disable',
      entityType: CONNECTION_ENTITY,
      entityId: connection.connectionId,
      summary: `Disabled the connection with ${counterpartyName}.`,
    });
    writeAuditFor(scope, db, actor, counterpartyOrgId, {
      action: 'connection.disable',
      entityType: CONNECTION_ENTITY,
      entityId: connection.connectionId,
      summary: `${actorOrgName} disabled the connection.`,
    });

    return { connectionId: connection.connectionId, status: 'DISABLED' };
  },
});
