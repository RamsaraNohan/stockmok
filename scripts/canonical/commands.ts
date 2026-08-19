import type { Firestore } from 'firebase-admin/firestore';
import type { CommandHandler } from '../../functions/src/core/define-command.js';

/**
 * The seed's command runner.
 *
 * DB-08 §5: *"the seed runs through the command layer… a seed that writes
 * documents directly would hide exactly the defects the seed is meant to
 * expose."* Every state transition below therefore goes through the same
 * `defineCommand()` frame a browser call would, with the same authorization,
 * the same transaction, the same audit and the same receipt.
 *
 * What the seed still writes directly is exactly what a **client** writes
 * directly in production and no command owns: categories, store rooms beyond
 * the one `org.create` makes, private partners, and purchase-order drafts and
 * their lines. Writing those through a command the catalog does not contain
 * would be inventing backend surface, which is a worse defect than the one
 * DB-08 §5 warns about.
 */

export interface CommandCall {
  readonly uid: string;
  readonly email?: string;
  /** The routing hint. The frame turns it into a verified membership or a denial. */
  readonly orgId: string;
  readonly operationId?: string;
  readonly payload: unknown;
}

export class SeedCommandError extends Error {
  readonly code: string;
  readonly reason: string;

  constructor(commandName: string, code: string, reason: string, message: string) {
    super(`${commandName} failed: ${code}/${reason} — ${message}`);
    this.name = 'SeedCommandError';
    this.code = code;
    this.reason = reason;
  }
}

/**
 * Runs one command and returns its result data, or throws with the typed reason.
 * A seed that ignored a failure would produce a database that looks seeded and
 * is not, which is precisely what `T-SEED-01a` exists to catch — so it fails
 * loudly at the first refusal instead.
 */
export async function runCommand(
  handler: CommandHandler,
  call: CommandCall,
  db: Firestore,
): Promise<Record<string, unknown>> {
  const auth =
    call.email === undefined
      ? { uid: call.uid }
      : { uid: call.uid, token: { email: call.email, email_verified: true } };
  const data = {
    orgId: call.orgId,
    ...(call.operationId === undefined ? {} : { operationId: call.operationId }),
    payload: call.payload,
  };
  const result = await handler.execute({ auth, data }, db);
  if (!result.ok) {
    const reason = (result.details as { reason?: string } | undefined)?.reason ?? 'UNKNOWN';
    throw new SeedCommandError(handler.name, result.code, reason, result.message);
  }
  return result.data;
}

/**
 * A stable UUID v4 for a named seed step.
 *
 * Every idempotent command in the seed carries one, which is what makes a rerun
 * a no-op through the system's **own** mechanism rather than through a flag the
 * seed invented: the second run reads the `commandReceipt`, returns the stored
 * result and writes nothing (`INV-06`).
 */
export function seedOperationId(slot: number): string {
  if (!Number.isInteger(slot) || slot < 0 || slot > 0xff_ff_ff_ff) {
    throw new RangeError('A seed operation slot must fit in 32 bits');
  }
  const hex = slot.toString(16).padStart(8, '0');
  return `${hex}-5eed-4000-8000-5eed5eed5eed`;
}
