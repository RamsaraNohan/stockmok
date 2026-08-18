import { ActiveCommandNameSchema, paths } from '@stockmok/shared';
import type { Firestore } from 'firebase-admin/firestore';
import { fail } from './errors.js';
import { isSafeScalar, type SafeScalar } from './idempotency.js';
import { serverTimestamp } from './time.js';
import type { TransactionScope } from './transaction.js';
import type { TrustedMembership } from '../guards/membership.js';

/**
 * The audit foundation.
 *
 * `organizations/{orgId}/auditLogs/{auditId}` — Owner/Admin read only; `create`,
 * `update` and `delete` denied to every client including the Owner, so
 * immutability is structural rather than conventional (DB-02 §6.4).
 *
 * Every privileged field is taken from the **verified membership** and the
 * server clock. The caller supplies only what it is entitled to describe: the
 * action, the entity, a human summary and safe-scalar metadata. There is no
 * parameter through which an actor, a role, an organization or a time can be
 * asserted — that is the whole design of {@link AuditRequest}.
 */

export type AuditMetadata = Readonly<Record<string, SafeScalar>>;

/** Fields a command may supply. Everything else is derived. */
export interface AuditRequest {
  /** Dot-case, and always the command's own name, e.g. `stock.transfer`. */
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly operationId?: string | undefined;
  /** A short human sentence for the Activity tab. */
  readonly summary: string;
  readonly metadata?: AuditMetadata | undefined;
}

/** Keys a caller must never be able to set; rejected at runtime as well as by type. */
const SERVER_CONTROLLED_KEYS = [
  'auditId',
  'actorUid',
  'actorName',
  'actorRole',
  'organizationId',
  'createdAt',
] as const;

export function assertAuditRequest(request: AuditRequest): void {
  const supplied = Object.keys(request);
  const forged = supplied.filter((key) =>
    (SERVER_CONTROLLED_KEYS as readonly string[]).includes(key),
  );
  if (forged.length > 0) {
    fail('SCHEMA_INVALID', 'Audit actor, organization and time are server-derived.', {
      path: forged.join(','),
    });
  }
  // DB-02 §6.4 gives `stock.transfer` as the form; every audited event in the
  // frozen architecture is a command, so the action set IS the catalog. Binding
  // to the catalog rather than to a shape means an audit row can never name an
  // action no command performs.
  if (!ActiveCommandNameSchema.safeParse(request.action).success) {
    fail('SCHEMA_INVALID', 'An audit action must name an active command.', { path: 'action' });
  }
  if (request.entityType.length === 0 || request.entityType.length > 80) {
    fail('SCHEMA_INVALID', 'An audit entity type is required.', { path: 'entityType' });
  }
  if (request.entityId.length === 0 || request.entityId.includes('/')) {
    fail('SCHEMA_INVALID', 'An audit entity id must be one path segment.', { path: 'entityId' });
  }
  if (request.summary.length === 0 || request.summary.length > 240) {
    fail('SCHEMA_INVALID', 'An audit summary must be a short sentence.', { path: 'summary' });
  }
  assertAuditMetadata(request.metadata);
}

/** Safe scalars only — never a whole document, never another tenant's data. */
export function assertAuditMetadata(metadata: AuditMetadata | undefined): AuditMetadata {
  if (metadata === undefined) return {};
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    fail('SCHEMA_INVALID', 'Audit metadata must be a flat map of safe scalars.', {
      path: 'metadata',
    });
  }
  for (const [key, value] of Object.entries(metadata)) {
    if (!isSafeScalar(value)) {
      fail('SCHEMA_INVALID', 'Audit metadata must be a flat map of safe scalars.', {
        path: `metadata.${key}`,
      });
    }
  }
  return metadata;
}

export interface AuditRecord {
  readonly auditId: string;
  readonly actorUid: string;
  readonly actorName: string;
  readonly actorRole: string;
  readonly organizationId: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly operationId?: string;
  readonly summary: string;
  readonly metadata: AuditMetadata;
}

/**
 * Builds the record from trusted context. Exported separately from the write so
 * the derivation can be asserted without an emulator.
 */
export function buildAuditRecord(
  actor: TrustedMembership,
  auditId: string,
  request: AuditRequest,
  organizationId: string = actor.orgId,
): AuditRecord {
  assertAuditRequest(request);
  const base = {
    auditId,
    actorUid: actor.uid,
    actorName: actor.displayName,
    actorRole: actor.role,
    organizationId,
    action: request.action,
    entityType: request.entityType,
    entityId: request.entityId,
    summary: request.summary,
    metadata: assertAuditMetadata(request.metadata),
  };
  return request.operationId === undefined ? base : { ...base, operationId: request.operationId };
}

/**
 * Writes one audit record inside the caller's transaction and returns its id.
 *
 * A cross-tenant action calls this **once per organization**, each with that
 * organization's own verified membership, so each record carries only what that
 * organization is entitled to know (DB-02 §6.4).
 */
export function writeAudit(
  scope: TransactionScope,
  db: Firestore,
  actor: TrustedMembership,
  request: AuditRequest,
): string {
  return writeAuditFor(scope, db, actor, actor.orgId, request);
}

/**
 * The counterparty half of a cross-tenant audit pair — `connection.*` and
 * `cpo.*` (DB-06 §4: *audit ×2*).
 *
 * The acting user is a verified ACTIVE member of **their own** organization and
 * of no other, so there is no second `TrustedMembership` to pass to
 * {@link writeAudit}. This writes the counterparty's record under
 * `organizations/{organizationId}/auditLogs`, carrying the acting user's
 * identity — which is exactly what DB-02 §5.4 already shares across the
 * boundary for connected order history, *"so both parties see one timeline with
 * correct attribution"*.
 *
 * It is a **separate function rather than a flag** so that every cross-tenant
 * audit row is greppable, and so no ordinary command can write into another
 * tenant by accident. The `summary` and `metadata` a caller passes here must
 * carry only what the receiving organization is entitled to know — that
 * judgement belongs to the command, which is why the two rows of a pair are
 * always written with different text.
 */
export function writeAuditFor(
  scope: TransactionScope,
  db: Firestore,
  actor: TrustedMembership,
  organizationId: string,
  request: AuditRequest,
): string {
  const auditId = db.collection(`${paths.organization(organizationId)}/auditLogs`).doc().id;
  const record = buildAuditRecord(actor, auditId, request, organizationId);
  scope.create(db.doc(paths.auditLog(organizationId, auditId)), {
    ...record,
    createdAt: serverTimestamp(),
  });
  return auditId;
}
