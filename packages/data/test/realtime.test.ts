import { deleteApp, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import type * as FirestoreSdk from 'firebase/firestore';
import { afterEach, describe, expect, it, vi } from 'vitest';

const listener = vi.hoisted(() => ({
  error: undefined as ((error: Error) => void) | undefined,
  unsubscribe: vi.fn(),
}));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof FirestoreSdk>();
  return {
    ...actual,
    onSnapshot: vi.fn((...args: unknown[]): (() => void) => {
      listener.error = args.at(-1) as (error: Error) => void;
      return listener.unsubscribe;
    }),
  };
});

import { createReadClient, formatUnreadBadge } from '../src/client.js';

afterEach(() => {
  listener.error = undefined;
  listener.unsubscribe.mockReset();
});

describe('realtime listener lifecycle', () => {
  it('forwards Firestore errors and unsubscribes the underlying listener once', async () => {
    const app = initializeApp({ projectId: 'stockmok', apiKey: 'test-only' }, 'c2-listener-unit');
    const client = createReadClient(getFirestore(app), { orgId: 'org-a', uid: 'user-a' });
    const onError = vi.fn();
    const unsubscribe = client.subscribe('Q-008', {}, vi.fn(), onError);
    const denied = new Error('permission denied');

    listener.error?.(denied);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(denied);

    unsubscribe();
    unsubscribe();
    expect(listener.unsubscribe).toHaveBeenCalledOnce();

    listener.error?.(new Error('late error'));
    expect(onError).toHaveBeenCalledOnce();
    await deleteApp(app);
  });

  it('forwards a Q-005 listener error once and keeps cleanup idempotent', async () => {
    const app = initializeApp({ projectId: 'stockmok', apiKey: 'test-only' }, 'c2-q005-error-unit');
    const client = createReadClient(getFirestore(app), { uid: 'user-a' });
    const onError = vi.fn();
    const unsubscribe = client.subscribeUnreadBadge(vi.fn(), onError);
    const denied = new Error('permission denied');

    listener.error?.(denied);
    listener.error?.(denied);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(denied);

    unsubscribe();
    unsubscribe();
    expect(listener.unsubscribe).toHaveBeenCalledOnce();
    await deleteApp(app);
  });

  it('formats a capped badge conservatively as 50+', () => {
    expect(formatUnreadBadge({ count: 49, capped: false })).toBe('49');
    expect(formatUnreadBadge({ count: 50, capped: true })).toBe('50+');
  });
});
