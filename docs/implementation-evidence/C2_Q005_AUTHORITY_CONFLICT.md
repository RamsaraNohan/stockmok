# C2 Q-005 Authority Conflict

**Status:** owner ruling required.

**Implementation boundary:** Q-005 has no substitute implementation. The other 91 active query IDs are
implemented and independently reviewable.

## Conflict

- DB-04 defines Q-005 as `count()` over `users/{uid}/notifications` with `read == false`, while also
  classifying it as realtime listener RT-2.
- DB-03 requires RT-2 to be a bounded, automatically updating unread-notification count.
- Firestore read-time aggregation queries return a server response and do not support realtime listeners.
  See [Firestore aggregation queries](https://firebase.google.com/docs/firestore/query-data/aggregation-queries).
- A bounded `limit(50)` query listener can report only the number of documents in its snapshot. Its
  `snapshot.size` is therefore not an exact unread count when more than 50 matching notifications exist.
- A write-time aggregate could be made realtime, but it requires a persisted counter and write-path
  maintenance. That is a schema/write/command decision outside C2 and is not authorized by the frozen
  contracts. See
  [Firestore write-time aggregations](https://firebase.google.com/docs/firestore/solutions/aggregation).

## Rejected substitutes

C2 does not add a capped `snapshot.size`, an unbounded notification listener, polling, a persisted counter,
write-time aggregation, a new schema field, a backend write, or another approximation.

```text
QUERY_ID = Q-005
DB04_REQUIREMENT = count() + RT-2
DB03_REQUIREMENT = bounded automatically updating exact unread count
IMPLEMENTATION_STATUS = BLOCKED_PENDING_OWNER_RULING
OWNER_RULING_REQUIRED = YES
READY_FOR_C2_PARTIAL_INDEPENDENT_REVIEW = YES
READY_FOR_C2_FULL_PROMOTION = NO
NEXT_ACTION = OWNER_RULING_FOR_Q005
```

This evidence file is non-authoritative. It records the contradiction without modifying or reinterpreting
DB-03 or DB-04.
