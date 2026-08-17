import {
  CommandRequestEnvelopeSchema,
  NonIdempotentCommandRequestEnvelopeSchema,
  commandDefinitions,
  type ActiveCommandId,
  type CommandResult,
  type Role,
} from '@stockmok/shared';
import type { Firestore } from 'firebase-admin/firestore';
import { fail, toCommandResult } from './errors.js';
import { getDb } from './firestore.js';
import {
  computePayloadHash,
  readCommandReceipt,
  resolveReplay,
  writeCommandReceipt,
  type CommandReceiptResult,
  type ReceiptClaim,
} from './idempotency.js';
import { runTrustedTransaction, type TransactionScope } from './transaction.js';
import {
  requireAuth,
  requireTrustedEmail,
  type AuthContext,
  type CallableEnvelope,
} from '../guards/auth.js';
import {
  assertOrgId,
  requireActiveMembership,
  type TrustedMembership,
} from '../guards/membership.js';
import { assertOperationId } from '../guards/operation-id.js';
import { directReader } from '../guards/reads.js';
import { requireRole } from '../guards/role.js';

/**
 * `defineCommand()` — the shared frame.
 *
 * DB-05 §7 and DB-06 §0 specify one authorization sequence, implemented **once**
 * here so it cannot be forgotten in the thirty-fourth command written late on
 * Day 11:
 *
 *     AUTH        → unauthenticated
 *     INPUT       → invalid-argument
 *     MEMBERSHIP  → permission-denied / NOT_A_MEMBER
 *     STATUS      → permission-denied / MEMBERSHIP_NOT_ACTIVE
 *     ROLE        → permission-denied / ROLE_NOT_PERMITTED
 *     ─── open transaction ────────────────────────────────────────────
 *     IDEMPOTENCY   commandReceipts/{operationId}   ← FIRST READ
 *     …the command body: reads, ownership, validation, state, writes,
 *      audit, notify…
 *     RECEIPT       txn.create(commandReceipts/{operationId})  ← LAST WRITE
 *     ─── commit ──────────────────────────────────────────────────────
 *
 * **The Admin SDK bypasses `firestore.rules`, so this frame is the only
 * authorization a command has.** That is why the checks are structural rather
 * than conventional: a body cannot run before the frame has produced a verified
 * membership, and a body has no access to a raw payload role, a raw `orgId`
 * claim or an unverified caller.
 *
 * `request.data.orgId` is a routing hint, never a claim. The MEMBERSHIP step
 * turns it into a fact or a denial.
 */

/** How a command establishes the caller's right to run it. */
export type CommandAuthorization =
  /** `C-01 org.create` — any authenticated user, no membership yet exists. */
  | { readonly kind: 'AUTHENTICATED' }
  /** `C-03 user.bootstrapProfile` — acts on the caller's own user document. */
  | { readonly kind: 'SELF' }
  /** `C-06 team.acceptInvitation` — an authenticated invitee, matched by verified email. */
  | { readonly kind: 'INVITEE' }
  /** Everything else: ACTIVE membership in `orgId` plus a role from the frozen group. */
  | { readonly kind: 'MEMBER_ROLE'; readonly roles: readonly Role[] };

type PayloadOf<Id extends ActiveCommandId> = (typeof commandDefinitions)[Id]['payload'] extends {
  parse(value: unknown): infer TPayload;
}
  ? TPayload
  : never;

export interface CommandContext<Id extends ActiveCommandId> {
  readonly db: Firestore;
  readonly scope: TransactionScope;
  readonly auth: AuthContext;
  /** Verified — the membership was read from the database this request. */
  readonly membership: TrustedMembership | undefined;
  /** The tenant every read and write in this command must stay inside. */
  readonly orgId: string;
  readonly payload: PayloadOf<Id>;
  readonly operationId: string | undefined;
  /** Present only for `INVITEE` commands; the verified token email, lowercased. */
  readonly trustedEmail: string | undefined;
}

export interface CommandDefinition<Id extends ActiveCommandId> {
  readonly id: Id;
  readonly authorization: CommandAuthorization;
  /** Runs inside the transaction, after the receipt read and before the receipt write. */
  readonly handler: (context: CommandContext<Id>) => Promise<CommandReceiptResult>;
}

export interface CommandHandler {
  readonly id: ActiveCommandId;
  /** The dot-case catalog name, e.g. `stock.transfer`. */
  readonly name: string;
  readonly idempotent: boolean;
  readonly authorization: CommandAuthorization;
  execute(request: CallableEnvelope, db?: Firestore): Promise<CommandResult>;
}

interface ValidatedEnvelope {
  readonly orgId: string;
  readonly operationId: string | undefined;
  readonly payload: unknown;
}

function parseEnvelope(idempotent: boolean, data: unknown): ValidatedEnvelope {
  const schema = idempotent
    ? CommandRequestEnvelopeSchema
    : NonIdempotentCommandRequestEnvelopeSchema;
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    fail('SCHEMA_INVALID', 'The command request envelope is invalid.', {
      path: parsed.error.issues[0]?.path.join('.') ?? '',
    });
  }
  const envelope = parsed.data;
  return {
    orgId: assertOrgId(envelope.orgId),
    operationId: 'operationId' in envelope ? assertOperationId(envelope.operationId) : undefined,
    payload: envelope.payload,
  };
}

export function defineCommand<Id extends ActiveCommandId>(
  definition: CommandDefinition<Id>,
): CommandHandler {
  const contract = commandDefinitions[definition.id];
  const { name, idempotent } = contract;

  async function execute(
    request: CallableEnvelope,
    injectedDb?: Firestore,
  ): Promise<CommandResult> {
    try {
      // 1 · AUTH — a verified Firebase ID token, or nothing.
      const auth = requireAuth(request);

      // 2 · INPUT — the envelope, then the same Zod object the browser form used.
      const envelope = parseEnvelope(idempotent, request.data);
      const payloadResult = contract.payload.safeParse(envelope.payload);
      if (!payloadResult.success) {
        fail('SCHEMA_INVALID', 'The command payload is invalid.', {
          path: payloadResult.error.issues[0]?.path.join('.') ?? '',
        });
      }
      const payload = payloadResult.data as PayloadOf<Id>;

      const db = injectedDb ?? getDb();

      // 3-5 · MEMBERSHIP, STATUS, ROLE — read from the database, never the payload.
      let membership: TrustedMembership | undefined;
      let trustedEmail: string | undefined;
      switch (definition.authorization.kind) {
        case 'MEMBER_ROLE': {
          const verified = await requireActiveMembership(db, directReader(), auth, envelope.orgId);
          membership = requireRole(verified, definition.authorization.roles);
          break;
        }
        case 'INVITEE':
          trustedEmail = requireTrustedEmail(auth);
          break;
        case 'AUTHENTICATED':
        case 'SELF':
          break;
      }

      const payloadHash = idempotent ? await computePayloadHash(envelope.payload) : '';
      const claim: ReceiptClaim | undefined =
        idempotent && envelope.operationId !== undefined
          ? {
              orgId: envelope.orgId,
              operationId: envelope.operationId,
              commandType: name,
              actorUid: auth.uid,
              payloadHash,
            }
          : undefined;

      const data = await runTrustedTransaction(db, async (scope) => {
        // 6 · IDEMPOTENCY — the FIRST read inside the transaction.
        if (claim) {
          const stored = await readCommandReceipt(scope, db, claim.orgId, claim.operationId);
          if (stored) return resolveReplay(stored, claim);
        }

        const result = await definition.handler({
          db,
          scope,
          auth,
          membership,
          orgId: envelope.orgId,
          payload,
          operationId: envelope.operationId,
          trustedEmail,
        });

        // 7 · RECEIPT — the LAST write inside the transaction.
        if (claim) writeCommandReceipt(scope, db, claim, result);
        return result;
      });

      return { ok: true, data };
    } catch (error) {
      return toCommandResult(error);
    }
  }

  return {
    id: definition.id,
    name,
    idempotent,
    authorization: definition.authorization,
    execute,
  };
}
