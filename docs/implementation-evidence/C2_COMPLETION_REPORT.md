# Stockmok C2 Read/Query Layer Completion Report

- **Date:** 2026-08-18
- **Branch:** `feature/data-c2`
- **Baseline:** `a0d500ac5953dc6a6a12bdb6ce3a4592a4c23ec1`
- **Implementation head before evidence commit:** `89472cb2813ed484a81697dd58060f60e3cd857e`

**Evidence commit:** the commit containing this report; resolve with
`git log -1 --format=%H -- docs/implementation-evidence/C2_COMPLETION_REPORT.md`.

## Result

```text
C2_STATUS = BLOCKED_BY_Q005

ACTIVE_QUERY_IDS = 92
ACTIVE_QUERY_IDS_ACCOUNTED_FOR = 92
ACTIVE_QUERY_IDS_IMPLEMENTED = 91

BLOCKED_QUERY_IDS = [Q-005]
UNIMPLEMENTED_ACTIVE_QUERY_IDS = 1
EXTRA_QUERY_IMPLEMENTATIONS = 0
DUPLICATE_ACTIVE_QUERY_IDS = 0
UNDEFINED_ACTIVE_QUERY_IDS = 0

ACTIVE_INDEX_IDS = 67
PRODUCT_LIST_MATRIX_INDEXES = 32
INDEX_SET_MATCH = PASS
DB04_MATRIX_CONTRACT_MATCH = PASS

REALTIME_QUERY_COUNT = 4
REALTIME_QUERIES_IMPLEMENTED = 3
BLOCKED_REALTIME_QUERY_IDS = [Q-005]

READY_FOR_C2_PARTIAL_INDEPENDENT_REVIEW = YES
READY_FOR_C2_FULL_PROMOTION = NO

NEXT_ACTION = OWNER_RULING_FOR_Q005
```

## Implemented boundary

- Added lane-owned `@stockmok/data` through the existing `packages/*` workspace glob. No root workspace or
  shared configuration change was required.
- Added browser `createReadClient(firestore, scope)`, grouped repositories, shared-schema converters,
  exact integer aggregations, bounded resolver behavior, and query-scoped last-document pagination.
- Added a Node-only `@stockmok/data/server` export for Admin SDK query/reference builders. It implements no
  writes, transactions, guards, callable authorization, connection validation, or command bodies.
- Generated and verified all 32 product-list shapes, including descending `onHandMilli` orders.
- Applied DB-CR-039 to Q-053 with `productStatus == ACTIVE` and `IDX-69`, and verified reconciliation with
  Q-060.
- Implemented only Q-008, Q-036, and Q-042 as realtime reads. Q-005 remains explicitly blocked.
- Added a 92-row `QUERY_COVERAGE_REGISTRY` and mechanical DB-04/shared-ID/index/matrix/realtime checks.

## Validation evidence

| Validation                                                                                        | Result                  |
| ------------------------------------------------------------------------------------------------- | ----------------------- |
| `@stockmok/data` format, typecheck, ESLint, unit tests, contract verifier, build on Node 22.23.2  | PASS                    |
| Data package unit tests                                                                           | PASS (16/16 in 5 files) |
| Firestore emulator C2 read/query suite on Temurin 21.0.12                                         | PASS (6/6)              |
| Root C1/G0 format, typecheck, ESLint, unit, index, architecture, functions, build on Node 22.23.2 | PASS                    |
| Root C1/G0 unit regressions                                                                       | PASS (24/24 in 8 files) |
| `T-SEED-01a-BOOTSTRAP`                                                                            | PASS                    |
| `T-SEED-01b-BOOTSTRAP`                                                                            | PASS                    |

The emulator suite validates pagination with repeated sort values and exact page boundaries, cross-shape
cursor rejection, tenant isolation with identical document IDs, Q-053/Q-060 integer reconciliation,
shared-schema rejection of corrupted data, and the three feasible realtime reads. Realtime coverage includes
initial delivery, parsed updates, irrelevant-tenant isolation, error forwarding, idempotent unsubscribe, and
no callbacks after unsubscribe.

The emulator intentionally uses the unchanged C1 configuration, which has no Firestore Rules file. These
tests are read/query semantics evidence, not Security Rules, RBAC, callable authorization, or production
evidence.

## Reviewable commits

1. `869520bd958de9d02a84b07609ace84f526df55c` — `feat(data): implement core query registry and builders`
2. `af2e7e52be2f0a7bd6dd1ed58ae03c9062c1c719` — `test(data): verify pagination and product query matrix`
3. `b12299e03f9c0b804f4a9334df881083a2963646` — `feat(data): implement domain read repositories`
4. `4999d3aa6a0e667a10f3fd13c21534f66bbfc23e` — `feat(data): implement realtime and aggregation reads`
5. `89472cb2813ed484a81697dd58060f60e3cd857e` — `test(data): add C2 contract and emulator verification`
6. Evidence commit — `docs(data): record Q-005 blocker and C2 checkpoint`

## Changed files

- `package-lock.json`
- `packages/data/package.json`
- `packages/data/tsconfig.json`
- `packages/data/tsconfig.build.json`
- `packages/data/vitest.config.ts`
- `packages/data/vitest.emulator.config.ts`
- `packages/data/src/**`
- `packages/data/scripts/verify-c2.ts`
- `packages/data/test/**`
- `docs/implementation-evidence/C2_Q005_AUTHORITY_CONFLICT.md`
- `docs/implementation-evidence/C2_COMPLETION_REPORT.md`

## Scope confirmation

```text
FROZEN_DATABASE_AUTHORITY_MODIFIED = NO
FROZEN_IMPLEMENTATION_STATUS_MODIFIED = NO
PACKAGES_SHARED_SOURCE_MODIFIED = NO
FIRESTORE_INDEX_AUTHORITY_MODIFIED = NO
FIRESTORE_RULES_WRITTEN = NO
COMMAND_BODIES_WRITTEN = NO
FRONTEND_WRITTEN = NO
PRODUCTION_DATA_WRITTEN = NO
REMOTE_PUSHED = NO
OTHER_WORKTREES_TOUCHED = NO
```

The Q-005 contradiction and rejected substitutes are recorded in
`docs/implementation-evidence/C2_Q005_AUTHORITY_CONFLICT.md`.
