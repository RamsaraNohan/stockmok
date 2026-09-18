import { describe, expect, it, vi } from 'vitest';
import * as firestore from 'firebase/firestore';
import {
  fetchUnreadNotificationCount,
  subscribeToUnreadNotifications,
} from '@/services/notifications/notificationService';

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof firestore>();
  return {
    ...actual,
    collection: vi.fn(() => ({ type: 'collection', withConverter: vi.fn().mockReturnThis() })),
    query: vi.fn((...args: unknown[]) => ({ type: 'query', args })),
    where: vi.fn((field: string, op: string, val: unknown) => ({ type: 'where', field, op, val })),
    orderBy: vi.fn((field: string, dir?: string) => ({ type: 'orderBy', field, dir })),
    limit: vi.fn((n: number) => ({ type: 'limit', n })),
    getCountFromServer: vi.fn(),
    onSnapshot: vi.fn(),
  };
});

describe('Q-005 Notifications Contract', () => {
  it('Transport A: maps exact server count via getCountFromServer without capping', async () => {
    const mockSnap = {
      data: () => ({ count: 127 }),
    };
    vi.mocked(firestore.getCountFromServer).mockResolvedValueOnce(
      mockSnap as unknown as firestore.AggregateQuerySnapshot<
        { count: firestore.AggregateField<number> },
        unknown
      >,
    );

    const result = await fetchUnreadNotificationCount('user-123');

    expect(result).toEqual({ count: 127, isCapped: false });
    expect(firestore.collection).toHaveBeenCalledWith(
      expect.anything(),
      'users/user-123/notifications',
    );
    expect(firestore.where).toHaveBeenCalledWith('read', '==', false);
  });

  it('Transport B: includes read==false, createdAt DESC, limit(50) in query constraints', () => {
    const unsubMock = vi.fn();
    vi.mocked(firestore.onSnapshot).mockReturnValue(unsubMock);

    const unsub = subscribeToUnreadNotifications('user-456', vi.fn());

    expect(firestore.where).toHaveBeenCalledWith('read', '==', false);
    expect(firestore.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(firestore.limit).toHaveBeenCalledWith(50);
    expect(typeof unsub).toBe('function');
  });

  it('Transport B: maps count and isCapped correctly for 0, 1, 49, 50', () => {
    let snapshotCallback: (snap: unknown) => void = () => {};
    vi.mocked(firestore.onSnapshot).mockImplementation((_q, arg1: unknown, arg2: unknown) => {
      if (typeof arg1 === 'function') {
        snapshotCallback = arg1 as (snap: unknown) => void;
      } else if (typeof arg2 === 'function') {
        snapshotCallback = arg2 as (snap: unknown) => void;
      }
      return vi.fn();
    });

    const onUpdate = vi.fn();
    subscribeToUnreadNotifications('user-123', onUpdate);

    // 0
    snapshotCallback({ size: 0, metadata: { fromCache: false } });
    expect(onUpdate).toHaveBeenLastCalledWith({ count: 0, isCapped: false });

    // 1
    snapshotCallback({ size: 1, metadata: { fromCache: false } });
    expect(onUpdate).toHaveBeenLastCalledWith({ count: 1, isCapped: false });

    // 49
    snapshotCallback({ size: 49, metadata: { fromCache: false } });
    expect(onUpdate).toHaveBeenLastCalledWith({ count: 49, isCapped: false });

    // 50 => capped true
    snapshotCallback({ size: 50, metadata: { fromCache: false } });
    expect(onUpdate).toHaveBeenLastCalledWith({ count: 50, isCapped: true });
  });

  it('Transport B: suppresses stale cache-only snapshots', () => {
    let snapshotCallback: (snap: unknown) => void = () => {};
    vi.mocked(firestore.onSnapshot).mockImplementation((_q, arg1: unknown, arg2: unknown) => {
      if (typeof arg1 === 'function') {
        snapshotCallback = arg1 as (snap: unknown) => void;
      } else if (typeof arg2 === 'function') {
        snapshotCallback = arg2 as (snap: unknown) => void;
      }
      return vi.fn();
    });

    const onUpdate = vi.fn();
    subscribeToUnreadNotifications('user-123', onUpdate);

    // Cache-only snapshot (fromCache: true)
    snapshotCallback({ size: 10, metadata: { fromCache: true } });
    expect(onUpdate).not.toHaveBeenCalled();

    // Server-backed snapshot (fromCache: false)
    snapshotCallback({ size: 10, metadata: { fromCache: false } });
    expect(onUpdate).toHaveBeenCalledWith({ count: 10, isCapped: false });
  });

  it('Transport B: cleans up subscription on unmount / cleanup call', () => {
    const unsubMock = vi.fn();
    vi.mocked(firestore.onSnapshot).mockReturnValue(unsubMock);

    const unsub = subscribeToUnreadNotifications('user-123', vi.fn());
    unsub();

    expect(unsubMock).toHaveBeenCalledTimes(1);
  });
});
