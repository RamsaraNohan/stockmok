# Stockmok Final Backend Independent Promotion Review

## Verdict

```text
BACKEND_INDEPENDENT_REVIEW = PASS
REVIEWED_BACKEND_IMPLEMENTATION_HEAD = f08242f3e7326a4a3a89561058903b780cf2393d
BACKEND_PROMOTABLE = YES
BACKEND_FROZEN = YES
READY_FOR_DATA_BACKEND_INTEGRATION = YES
```

Review date: 2026-08-19

Reviewer role: independent Backend Lane B promotion reviewer

Implementation reviewed: `f08242f3e7326a4a3a89561058903b780cf2393d` on
`feature/backend-security`

This report replaces the historical failed review only after the exact candidate passed
the complete governed Node 22 and Java 21 gate, independent Firestore Rules attacks,
independent C-15 malformed-state attacks, canonical-seed reconciliation, and the
evidence-only freeze preconditions. No implementation was changed by this review.

## Immutable-input and scope proof

- Worktree: `C:\Users\ramsa\stockflow-worktrees\backend-security`
- Candidate: `f08242f3e7326a4a3a89561058903b780cf2393d`
- Previous candidate: `c4e2c2d1eb5577b051056317b39557b4f475cb45`
- Pre-repair backend: `b673ef3530c2a0fd7af8147337886c1d0f62c9a2`
- B3 ancestor: `f1ae30a23ad311b4d309058a2e8b66aca30eaabf`
- G0 baseline: `a0d500ac5953dc6a6a12bdb6ce3a4592a4c23ec1`
- Frozen C2 head: `694a6979b5516017b61a46f8a61d97214ab74dd5`
- Historical report SHA-256 before replacement:
  `b6b85f883fa169518f2d9784ecb0c179c5ad3aa52a6c99102920016d53be346b`
- All required ancestry checks passed.
- `git diff --check c4e2c2d1eb5577b051056317b39557b4f475cb45..f08242f3e7326a4a3a89561058903b780cf2393d`
  passed.
- The second repair changed exactly the six expected files:
  - `firestore.rules`
  - `functions/src/commands/purchase-order.ts`
  - `tests/rules/attribution-and-draft-quantity.test.ts`
  - `tests/rules/validated-shapes.test.ts`
  - `tests/rules/write-surfaces.test.ts`
  - `tests/backend/commands-private-po.test.ts`
- No frozen authority, C2, frontend, index, canonical-seed, C-34, or Release C path
  changed in the second repair.

## Frozen-authority reconciliation

The active registries and implementation were compared as exact sets, not only as
counts. No active callable command is missing or extra, and no current query or command
reference is undefined.

```text
ACTIVE_QUERY_IDS = 92
ACTIVE_INDEX_IDS = 67
ACTIVE_COMMAND_IDS = 38
ACTIVE_INVARIANT_IDS = 26
ACTIVE_DERIVED_CONTRACT_IDS = 14
CALLABLE_EXPORTS = 38
UNDEFINED_CURRENT_QUERY_REFERENCES = 0
UNDEFINED_CURRENT_COMMAND_REFERENCES = 0
```

## BACKEND-IR-001 closure

### Private DRAFT received quantity

Rules independently proved all required boundaries:

- valid private DRAFT line creation with `receivedBuyerBaseMilli = 0` succeeds;
- a valid update retaining zero succeeds;
- positive received quantity is denied on creation and update;
- positive received quantity is denied when less than or equal to ordered quantity;
- the remaining sanctioned DRAFT behavior continues to pass its valid twins.

The Rules implementation requires an integer, non-negative received quantity, bounds it
by ordered quantity, and additionally requires exactly zero while the private PO remains
DRAFT.

### Trusted C-15 malformed-state defense

An independent external harness used Admin SDK privilege to inject an otherwise-valid
private DRAFT PO line with positive `receivedBuyerBaseMilli`, then invoked authorized
`C-15 po.order`.

The callable rejected with typed `failed-precondition` and reason
`INVALID_TRANSITION`. Independent reads then proved:

```text
PO state = DRAFT
PO number assigned = NO
numbering counter mutation = 0
partner purchase count mutation = 0
history rows = 0
audit rows = 0
notification rows = 0
stock movement rows = 0
receipt rows = 0
forged received quantity remained = 1000
partial persistence = NONE
```

The otherwise-identical zero-received valid twin succeeded and independently read back:

```text
PO state = ORDERED
PO number = PO-2026-001
numbering counter = 1
partner purchase count = 1
receivedBuyerBaseMilli = 0
history rows = 1
audit rows = 1
receipt rows = 1
stock movement rows = 0
notification rows = 0
```

The command validates every line before entering its write phase. It therefore does not
depend on client Rules to preserve the trusted-backend invariant.

### Caller-bound attribution and provenance

Independent Rules tests proved for categories, warehouses, and private partners:

- another user's identity cannot be supplied as `updatedBy` on create or update;
- a later authorized writer can make a legitimate edit when `updatedBy` is that current
  caller;
- caller-bound creation provenance is required;
- creation metadata remains immutable after creation.

Every original BACKEND-IR-001 malformed-shape family was repeated with otherwise-valid
authentication, active membership, role, tenant, and parent state. Valid direct-write
twins passed. Wrong role, wrong organization, inactive membership, and cross-tenant
attempts were denied independently.

## Test-oracle independence

The repaired Rules and C-15 tests were inspected for shape masking, unsafe helper reuse,
broad catches, self-referential expectations, missing positive twins, and failure-only
assertions that omit persisted-state verification. No such material proof defect remains.

Two new harnesses were created outside every repository and worktree. They did not import
the repaired test helpers or assertions. The fresh Rules harness passed 22 of 22 cases;
the fresh C-15 harness passed 22 of 22 cases. The original independent malformed-shape
harness passed 49 of 49 cases. Combined independent result: 93 of 93 passed, 0 failed.

## Broader Backend Lane B regression

Representative B1-B4 behavior and the full security suite reconfirmed tenant isolation,
RBAC, connected privacy, trusted Admin SDK reauthorization, state transitions,
idempotency, atomicity, concurrency, typed failures, audit and notification effects, and
exactly-once stock effects.

```text
B1_REGRESSION = PASS
B2_REGRESSION = PASS
B3_REGRESSION = PASS
B4_REGRESSION = PASS
RULES_TENANT_ISOLATION = PASS
RULES_RBAC = PASS
ADMIN_SDK_REAUTHORIZATION = PASS
```

## C-34 authority boundary

C-34 was not changed. Its frozen payload still lacks draft-line intent. The following six
safeguards were independently confirmed:

1. the frozen C-34 command and payload remain unchanged;
2. backend creation accepts only an existing valid private DRAFT PO in the authorized
   connection and tenant context;
3. line normalization and strict validation remain backend-enforced;
4. C-15 independently rejects any malformed positive-received DRAFT state;
5. no unsupported client or frontend write path was invented;
6. SCREEN-038 cannot be declared fully backend-wired until owner authority supplies the
   missing draft-line path.

This is the single non-blocking P3 authority gap:

```text
CPO_DRAFT_LINE_FRONTEND_PATH = AUTHORITY_GAP
SCREEN_038_FULL_BACKEND_WIRING_READY = NO
OWNER_CONTROL_AMENDMENT_REQUIRED = YES
```

## Canonical seed and rerun

The command-driven canonical seed passed and its rerun produced an identical database
fingerprint. It includes the legal Cooking Oil zero opening, a 10-PACK connected shipment,
and the corresponding 8-PACK and 2-PACK receipts.

```text
CANONICAL_SEED = PASS
CANONICAL_SEED_RERUN = PASS
FINAL_CHICKEN_KG = 120
FINAL_TOTAL_MINOR = 69170000
FINAL_COLD_ROOM_MINOR = 39890000
FINAL_MAIN_STORE_MINOR = 29280000
POST_CHAIN_MOVEMENT_COUNT = 17
```

## Governed validation evidence

Actual runtimes:

```text
Node = v22.23.2
npm = 11.9.0
Java = Temurin 21.0.12+8
```

`npm run verify` was inspected before execution. It expands to exactly the governed
non-emulator set: `format:check`, `typecheck`, `lint`, `test:unit`, `verify:indexes`,
`verify:architecture`, `verify:functions`, and `build`.

| Gate                      | Result | Actual total              |
| ------------------------- | ------ | ------------------------- |
| Node 22 non-emulator gate | PASS   | unit: 10 files, 158 tests |
| Firestore Rules           | PASS   | 7 files, 466 tests        |
| Backend                   | PASS   | 19 files, 350 tests       |
| Security                  | PASS   | 26 files, 816 tests       |
| Canonical seed            | PASS   | 1 file, 7 tests           |
| Independent attacks       | PASS   | 93 passed, 0 failed       |

Index verification reported 67 expected and 67 implemented indexes, 0 missing and 0
extra. The architecture and callable-export checks reported the exact active counts shown
above.

## Findings and promotion decision

```text
P0_DEFECTS = 0
P1_DEFECTS = 0
P2_DEFECTS = 0
CRITICAL_P2_DEFECTS = 0
P3_DEFECTS = 1
```

The sole P3 is `BACKEND-AUTH-001`: the documented C-34 draft-line frontend authority gap.
It is not a security, correctness, or implementation blocker for the frozen backend and
does not authorize a C-34 change in this cycle.

All substantive promotion conditions passed. This report is the only permitted tracked
review change. After the evidence-only commit, standalone Backend Lane B review stops; no
Review #4 is scheduled. The next authorized action is Data/C2 plus frozen Backend
integration on `integration/parallel-implementation`.
