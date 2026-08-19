import type { AuthUser } from '@/data/adapters/authAdapter';
import {
  loginWithEmail as loginAdapter,
  registerWithEmail as registerAdapter,
  requestPasswordReset as resetAdapter,
} from '@/data/adapters/authAdapter';

export async function loginWithEmail(email: string, pass: string): Promise<AuthUser> {
  return loginAdapter(email, pass);
}

export async function registerWithEmail(email: string, pass: string): Promise<AuthUser> {
  return registerAdapter(email, pass);
}

export async function requestPasswordReset(email: string): Promise<void> {
  return resetAdapter(email);
}
