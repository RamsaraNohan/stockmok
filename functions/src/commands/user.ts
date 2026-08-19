import { paths } from '@stockmok/shared';
import { defineCommand } from '../core/define-command.js';
import { serverTimestamp } from '../core/time.js';
import { requireTrustedEmail } from '../guards/auth.js';

/**
 * C-03 `user.bootstrapProfile` — SELF, idempotent, no audit (DB-06 §1 marks it
 * "optional; client `setDoc` covers it" — the client already upserts this
 * document on first render, so this command is a same-shape trusted fallback).
 *
 * A caller may only ever bootstrap their own `uid` — there is no membership to
 * verify and no `orgId` involved. `email` and `status` are never taken from the
 * payload; `email` is the verified token email (DB-02 §2.1: "backend-written
 * only") and `createdAt` is set once, on first write, never on a later call.
 */
export const userBootstrapProfile = defineCommand({
  id: 'C-03',
  authorization: { kind: 'SELF' },
  handler: async ({ db, scope, auth, payload }) => {
    const email = requireTrustedEmail(auth);
    const userRef = db.doc(paths.user(auth.uid));
    const existing = await scope.get(userRef);

    if (existing.exists) {
      const update: Record<string, unknown> = { displayName: payload.displayName };
      if (payload.photoUrl !== undefined) update.photoUrl = payload.photoUrl;
      scope.update(userRef, update);
    } else {
      const data: Record<string, unknown> = {
        uid: auth.uid,
        displayName: payload.displayName,
        email,
        status: 'ACTIVE',
        createdAt: serverTimestamp(),
      };
      if (payload.photoUrl !== undefined) data.photoUrl = payload.photoUrl;
      scope.create(userRef, data);
    }

    return { uid: auth.uid };
  },
});
