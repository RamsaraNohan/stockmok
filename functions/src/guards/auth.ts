import { fail } from '../core/errors.js';

/**
 * Step 1 of DB-05 §7 — AUTH.
 *
 * The only facts a caller may assert about themselves are the ones Firebase Auth
 * verified: the uid, and the email on the verified ID token. Everything else —
 * organization, membership, role, owner status — is read from the database by
 * the guards in this directory. `request.data.orgId` is a routing hint, never a
 * claim (DB-05 §7).
 */

/** The subset of a verified ID token this backend is allowed to trust. */
export interface VerifiedIdToken {
  readonly email?: string;
  readonly email_verified?: boolean;
}

/** The shape `firebase-functions` gives a callable; narrowed to what we trust. */
export interface CallableAuth {
  readonly uid: string;
  readonly token?: VerifiedIdToken;
}

export interface CallableEnvelope {
  readonly auth?: CallableAuth | undefined;
  readonly data?: unknown;
}

/** The authenticated caller, before any organization is involved. */
export interface AuthContext {
  readonly uid: string;
  readonly email: string | undefined;
  readonly emailVerified: boolean;
}

export function requireAuth(request: CallableEnvelope): AuthContext {
  const auth = request.auth;
  if (!auth || typeof auth.uid !== 'string' || auth.uid.length === 0) {
    fail('NOT_SIGNED_IN', 'This action requires a signed-in user.');
  }
  const rawEmail = auth.token?.email;
  const email =
    typeof rawEmail === 'string' && rawEmail.length > 0 ? rawEmail.toLowerCase() : undefined;
  return {
    uid: auth.uid,
    email,
    emailVerified: auth.token?.email_verified === true,
  };
}

/**
 * `team.acceptInvitation` matches the invitee by email, so it needs a trusted
 * email rather than one supplied in the payload.
 */
export function requireTrustedEmail(context: AuthContext): string {
  if (context.email === undefined) {
    fail('INVITE_EMAIL_MISMATCH', 'The signed-in account has no verified email address.');
  }
  return context.email;
}
