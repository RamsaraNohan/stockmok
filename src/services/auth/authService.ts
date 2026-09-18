import type { UserMembership } from '@stockmok/shared';

import type { AuthUser } from '@/data/adapters/authAdapter';
import {
  fetchUserMemberships as fetchMembershipsAdapter,
  fetchUserMembershipsFromServer as fetchMembershipsFromServerAdapter,
  loginWithEmail as loginAdapter,
  registerWithEmail as registerAdapter,
  requestPasswordReset as resetAdapter,
} from '@/data/adapters/authAdapter';

export async function loginWithEmail(email: string, pass: string): Promise<AuthUser> {
  return loginAdapter(email, pass);
}

export async function fetchMembershipsForUser(uid: string): Promise<readonly UserMembership[]> {
  return fetchMembershipsAdapter(uid);
}

// Authoritative variant for the post-login redirect decision — see
// fetchUserMembershipsFromServer for why this bypasses the cache-tolerant read.
export async function fetchMembershipsForUserFromServer(
  uid: string,
): Promise<readonly UserMembership[]> {
  return fetchMembershipsFromServerAdapter(uid);
}

export async function registerWithEmail(email: string, pass: string): Promise<AuthUser> {
  return registerAdapter(email, pass);
}

export async function requestPasswordReset(email: string): Promise<void> {
  return resetAdapter(email);
}
