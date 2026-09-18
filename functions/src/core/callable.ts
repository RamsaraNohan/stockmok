import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import type { CommandHandler } from './define-command.js';
import { deploymentName } from './registry.js';

/**
 * The callable adapter.
 *
 * Every endpoint is `onCall`. Zero HTTP endpoints, zero Firestore triggers
 * (DB-06 §9). B1 builds the adapter; B2/B3/B4 apply it to their handlers and
 * export the result from `index.ts`.
 *
 * `HttpsError.code` and `details` are what surface the typed error model to the
 * client SDK (DB-06 §7), so a failure is thrown rather than returned. A success
 * returns the frozen `{ ok: true, data }` envelope.
 */

/** DB-09 §5 and DB-06 §8 — frozen runtime facts. */
export const COMMAND_RUNTIME_OPTIONS = {
  region: 'asia-southeast1',
  maxInstances: 10,
  memory: '256MiB',
  timeoutSeconds: 60,
} as const;

export function toCallable(handler: CommandHandler) {
  return onCall(COMMAND_RUNTIME_OPTIONS, async (request: CallableRequest) => {
    const result = await handler.execute({
      auth: request.auth ? { uid: request.auth.uid, token: request.auth.token } : undefined,
      data: request.data,
    });
    if (result.ok) return result;
    throw new HttpsError(result.code, result.message, result.details);
  });
}

export function callableName(handler: CommandHandler): string {
  return deploymentName(handler.name);
}
