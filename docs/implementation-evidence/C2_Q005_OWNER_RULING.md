# C2 Q-005 Owner Ruling

This non-normative evidence records the targeted implementation of the Q-005 owner ruling. The historical
conflict record remains preserved in `C2_Q005_AUTHORITY_CONFLICT.md`.

```text
STATUS = IMPLEMENTED

PREVIOUS_CONFLICT_EVIDENCE = C2_Q005_AUTHORITY_CONFLICT.md

OWNER_RULING = ONE_LOGICAL_QUERY_TWO_TRANSPORTS

Q005_LOGICAL_QUERY_ID_COUNT = 1
Q005_TRANSPORT_COUNT = 2

EXACT_TRANSPORT = READ_TIME_COUNT_AGGREGATION
EXACT_TRANSPORT_RESULT = { count: exact_nonnegative_integer, capped: false }

REALTIME_TRANSPORT = BOUNDED_LIMIT_50_DOCUMENT_LISTENER
REALTIME_OVERFLOW_SEMANTICS = 50_OR_MORE
REALTIME_DISPLAY = 50+

PERSISTED_COUNTER_ADDED = NO
BACKEND_WRITE_ADDED = NO
NEW_QUERY_ID_ADDED = NO
NEW_INDEX_ADDED = NO
POLLING_ADDED = NO
UNBOUNDED_LISTENER_ADDED = NO
```

## Implementation

- Exact transport: `getCountFromServer()` over `users/{uid}/notifications` with `read == false`.
- Realtime transport: `onSnapshot()` over the same bound user collection with `read == false`, ordered by
  `createdAt DESC` through the existing IDX-17 authority, and limited to 50 documents.
- Realtime results are `{ count: snapshot.size, capped: snapshot.size >= 50 }`. Capped results render as
  `50+`, meaning 50 or more, never exact 50.
- The repository binds `uid` when constructed; neither transport accepts a replacement user ID.
- Cache-only listener snapshots are not emitted, preventing a false initial zero before the server-backed
  bounded result arrives.

## Test evidence

```text
NODE_22_PACKAGE_VERIFY = PASS
PACKAGE_UNIT_TESTS = PASS (19/19)
JAVA_21_C2_EMULATOR_TESTS = PASS (14/14)

Q005_ZERO = PASS
Q005_ONE = PASS
Q005_49 = PASS
Q005_EXACTLY_50 = PASS
Q005_57 = PASS
Q005_NEW_UNREAD_UPDATE = PASS
Q005_MARK_READ_UPDATE = PASS
Q005_USER_ISOLATION = PASS
Q005_UNSUBSCRIBE = PASS
Q005_ERROR_FORWARDING_ONCE = PASS
Q005_FROZEN_REALTIME_SET = PASS

C1_G0_REGRESSION = PASS (24/24)
INDEX_SET_MATCH = PASS (67/67)
PRODUCT_LIST_MATRIX = PASS (32/32)
T_SEED_01A_BOOTSTRAP = PASS
T_SEED_01B_BOOTSTRAP = PASS
```

The emulator has no Firestore Rules file and therefore proves read/query behavior only. It is not Security
Rules, RBAC, callable authorization, or production evidence.
