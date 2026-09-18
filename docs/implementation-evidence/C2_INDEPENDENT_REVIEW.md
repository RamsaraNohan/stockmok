# C2 Independent Cross-Model Review

- **Review date:** 2026-08-18
- **Reviewer:** Claude Code · Sonnet 5 · High (independent, authored none of the reviewed implementation)
- **Author:** Codex GPT-5.6 Sol
- **Reviewed branch:** `feature/data-c2`
- **Reviewed HEAD:** `5d3c45386380b2df5fffd0c17a97aa51f72cdeac`
- **G0 baseline:** `a0d500ac5953dc6a6a12bdb6ce3a4592a4c23ec1` (tag `baseline-c1-a3r-p2`)

## 1. Start-gate verification

Worktree, branch, HEAD and baseline all matched the required values exactly. Working tree was clean.
`git merge-base --is-ancestor` confirmed the baseline is an ancestor of HEAD. `git diff --check` reported
no conflict markers or whitespace errors.

```text
DIFF_SCOPE = PASS
```

24 files changed, 4024 insertions(+), 0 deletions(-). Entirely confined to:
`docs/implementation-evidence/{C2_COMPLETION_REPORT,C2_Q005_AUTHORITY_CONFLICT,C2_Q005_OWNER_RULING}.md`,
`package-lock.json` (a minimal, correctly-scoped workspace-registration diff for `@stockmok/data`), and
`packages/data/**`. No `packages/shared/**`, no `firestore.rules` (none exists yet, correctly — Lane B has
not started), no `firestore.indexes.json`, no `functions/**`, no frontend paths, no other worktree.

## 2. Independent active-query-ID derivation

Before reading `packages/shared/src/query-ids.ts` or any C2 implementation file, I mechanically enumerated
every query ID defined as a row across DB-04 §1–§6 and §8, excluding the seven documented tombstones
(`Q-011a`, `Q-021`, `Q-049`, `Q-081`, `Q-082`, `Q-084`, `Q-085g`). This produced exactly **92** IDs.

I then compared this hand-derived set against `packages/shared/src/query-ids.ts` (`ACTIVE_QUERY_IDS`,
pre-existing C1 foundation, untouched by this diff) using a script, not eyeballing:

```text
MINE_COUNT = 92 (92 unique)   REGISTRY_COUNT = 92 (92 unique)
IN_MINE_NOT_IN_REGISTRY = []   IN_REGISTRY_NOT_IN_MINE = []
DUP_IN_MINE = []                DUP_IN_REGISTRY = []
```

Exact set equality, independently proven.

## 3. Query registry audit

`packages/data/src/registry.ts` defines exactly 92 rows via `QUERY_COVERAGE_REGISTRY`. Full manual read of
every definition (not a 10-query sample) against the independently-derived DB-04 contract, cross-checked
against DB-02 (schema), DB-05 (tenant/security), DB-03 (UI traceability) and DOMAIN_TYPES. Findings:

- Path, scope, filters, ordering, limits, cursor flags and index references match DB-04 row-for-row for
  every query I checked in depth (all 92 read; ~40 checked field-by-field against the authority text,
  including every high-risk ID named in the review brief: Q-005, Q-008, Q-036, Q-042, Q-046, Q-047, Q-053,
  Q-058, Q-059, Q-060, Q-061, Q-061b, Q-062, Q-066, Q-067, Q-074–Q-078, Q-085–Q-089).
- Q-021a/Q-021b (Needs Attention) correctly implement the sequential `limit(5)` then `limit(5-k)` pattern,
  skipping Q-021b entirely when `k = 5` (`repositories.ts` `dashboard.getNeedsAttention`).
- Q-056 (guard, `onHandMilli > 0`, `limit(1)`, server-only) is correctly distinguished from Q-058 (display,
  no `onHandMilli` predicate, `scope: 'organization'`, client-executable) — this is the A3R-16 distinction
  and the registry gets it right, including the subtle point that Q-058 is _not_ server-only despite being
  documented in DB-04 §8 (its own row text says "outside the transaction", and DB-03 SCREEN-015 confirms it
  is a client read triggered from the archive-confirmation dialog).
- Q-046/Q-047 are `scope: 'server'` with no client read path, matching the callable-only architecture DB-04
  §6 requires and explains (a rule cannot determine the calling buyer org without an unbounded `get()`).
- No `products`/`purchaseOrders` write call, `runTransaction`, or `writeBatch` exists anywhere in
  `packages/data/src` (grepped for `.set(`, `.update(`, `.add(`, `.delete(`, `.create(`, `runTransaction`,
  `writeBatch` — zero matches). `COMMAND_WRITE_LEAKAGE = 0`.

## 4. Index authority

`firestore.indexes.json` (67 entries, pre-existing C1 foundation, untouched by this diff) was compared
field-by-field, in order, against my independently-derived expected list from DB-04 §7 (IDX-01…IDX-69 less
the deleted IDX-03/IDX-19). All 67 entries match exactly, including the critical **IDX-36
`productStatus ASC, stockStatus ASC, onHandMilli DESC`** (the A3R-P2 direction correction).

Every `indexIds` reference inside `registry.ts` and `product-matrix.ts` was checked against the valid
67-ID set programmatically: `UNDEFINED_REFS = []` for both files.

Three valid indexes (`IDX-01`, `IDX-02`, `IDX-30` — the PO-builder product picker) have no consumer among
the 92 active query IDs. This is a pre-existing gap in DB-04's own prose (its own IDX-01 row claims to
serve "active-SKU `count()`", which is superseded text — DB-04 §6 and DB-03 both route that KPI through
`Q-050`/IDX-33 instead) that predates C2 and is outside C2's declared 92-query scope. Not a C2 defect;
recorded as an observation only.

## 5. Product-list matrix (32 shapes)

`packages/data/src/product-matrix.ts`'s `matrixIds` table was compared, cell-by-cell, against my own
independently-derived 32-entry matrix from DB-04 §7's `DB-CR-038` rule (2 modes × 4 filters × 4 sorts).
Exact match on every one of the 32 index-ID assignments, including IDX-36 sitting at
`summary × status × onHand`. `sortDirections.onHand = 'desc'` is applied uniformly across all 8 on-hand
matrix slots (both modes × 4 filter combinations) via a single shared table — structurally impossible for
an accidental `ASC` to slip in for one shape only. No `onHandMilli ASC` or client-side sort found anywhere
in `packages/data/src`.

```text
PRODUCT_LIST_MATRIX_INDEXES = 32   PRODUCT_MATRIX_EXACT_SET = PASS
IDX36 = PASS                        ALL_ON_HAND_SORTS_DESC = PASS
```

## 6. Q-005 deep review

DB-04 literally requires Q-005 to be both a `count()` aggregation and realtime (RT-2) in the same cell —
an architecturally impossible request, since Firestore aggregation queries have no realtime listener
capability. `C2_Q005_AUTHORITY_CONFLICT.md` records this correctly and accurately (verified independently:
this is a genuine, well-known Firestore product limitation, not a manufactured excuse). The recorded owner
ruling — one logical query ID, two transports — is exactly what section 13 of this review's own brief
specifies, and exactly what is implemented in `client.ts`.

Verified by direct emulator execution (`q005.emulator.test.ts`, raw Admin-SDK writes as the independent
oracle, bypassing the code under test entirely):

| actual unread | exact `getUnreadCount()`  | realtime badge            | display |
| ------------- | ------------------------- | ------------------------- | ------- |
| 0             | `{count:0,capped:false}`  | `{count:0,capped:false}`  | `0`     |
| 1             | `{count:1,capped:false}`  | `{count:1,capped:false}`  | `1`     |
| 49            | `{count:49,capped:false}` | `{count:49,capped:false}` | `49`    |
| 50            | `{count:50,capped:false}` | `{count:50,capped:true}`  | `50+`   |
| 57            | `{count:57,capped:false}` | `{count:50,capped:true}`  | `50+`   |

The exact transport (`getCountFromServer`, no `limit()`) is never capped at any tested value, including 57.
The realtime transport is a bounded `where(read==false) orderBy(createdAt desc) limit(50)` listener matching
IDX-17; `formatUnreadBadge` renders `capped:true` as `"50+"` (50-or-more), never a literal `"50"` —
`Q005_NO_FALSE_EXACTNESS = PASS`, checked at the type level too (`ExactUnreadCountResult.capped` is the
literal type `false`, not `boolean`, so an exact result can never even be typed as capped).

Cache handling: `subscribeUnreadBadge` uses `{ includeMetadataChanges: true }` and drops any snapshot with
`metadata.fromCache === true`. Emulator tests confirm this doesn't cause permanent silence (every test
resolves within its timeout), duplicate callbacks (`events.length` asserted precisely), or lost updates
(add/mark-read transition test observes both `{count:2}` and the final `{count:1}`). No isolated unit test
targets the `fromCache` branch specifically — noted as a minor test-design gap (P3), not a proof gap, since
the end-to-end emulator behavior is what was actually verified and it is correct.

Grepped the full diff for `unreadCount`, counter fields, `setInterval`, polling, new Cloud Function
references, unbounded listeners, new query IDs, and backend writes tied to Q-005: none found.

```text
Q005_EXACT_COUNT = PASS        Q005_BOUNDED_REALTIME = PASS
Q005_50_PLUS_SEMANTICS = PASS  Q005_NO_FALSE_EXACTNESS = PASS
Q005_CACHE_SNAPSHOT_HANDLING = PASS (via integration evidence)
Q005_USER_SCOPE = PASS (adversarial cross-user emulator test, see §7)
PERSISTED_COUNTER_ADDED = NO   POLLING_ADDED = NO
UNBOUNDED_LISTENER_ADDED = NO  NEW_QUERY_ID_ADDED = NO   BACKEND_WRITE_ADDED = NO
```

## 7. Realtime set, pagination, tenant/user scope

Realtime set independently derived from DB-04's explicit RT-1…RT-4 tags: `{Q-005, Q-008, Q-036, Q-042}`.
`registry.ts` marks exactly these four `realtime: true`. `boundaries.test.ts` and `realtime.test.ts` prove
error-forwarding-once and idempotent-unsubscribe at the unit level (mocked `onSnapshot`); the emulator suite
proves the same properties end-to-end for all four listeners against a real Firestore emulator, including a
genuine cross-tenant adversarial case: `reads.emulator.test.ts` subscribes Org A's member/PO/connection
listeners, then mutates the _identically-shaped_ Org B documents and asserts zero additional callbacks
fire, then mutates Org A's documents and asserts the expected callback does fire — then unsubscribes twice
and confirms no further callbacks after further mutations.

Pagination (`reads.emulator.test.ts`): 6 products sharing an identical `productName` (deliberately
adversarial — a naive cursor keyed only on the sort value would break) paginated in pages of 2 across an
exact 3-page boundary; the fourth page (page-boundary-exact case) returns empty with a null cursor.
`ids.length === 6`, `new Set(ids).size === 6` — no duplicates, no skips. A cursor obtained under `sort:
'name'` is rejected with `invalid-argument` when replayed under `sort: 'onHand'`. The general (non-matrix)
`client.list()` cursor path independently enforces the same `queryId`+`signature` binding, and `signature`
is derived from `{queryId, scope, parameters}`, so a cursor cannot cross query, org, or filter boundaries.

Tenant isolation (`reads.emulator.test.ts`): Org A and Org B seeded with **identical `product-01`
document IDs** but different `productName` markers. Org A's repository (bound at construction) returns
exactly 6 items, all carrying Org A's marker — zero Org B leakage despite colliding IDs. `server.ts`'s
`scopedValue()` and `client.ts`'s `valueFor()` both hard-code `orgId`/`uid` resolution to come from the
constructor-bound `scope`, never from caller-supplied `parameters` — proven directly by
`boundaries.test.ts`'s "prevents a query payload from replacing the bound organization" test
(`server.build('Q-073', { orgId: 'org-attacker' })` on a server bound to `org-bound` still resolves to
`organizations/org-bound/settings/main`). No `collectionGroup` query exists anywhere in `packages/data/src`.

```text
REALTIME_EXACT_SET = PASS (4/4, 0 extra)          NO_DUPLICATE_ROWS = PASS
CURSOR_SCOPE_PROTECTION = PASS                     NO_SKIPPED_ROWS = PASS
CROSS_QUERY_CURSOR_REJECTED = PASS                 CROSS_SCOPE_CURSOR_REJECTED = PASS
TENANT_SCOPE_BINDING = PASS (adversarial, colliding IDs)   COLLECTION_GROUP_QUERIES = 0
USER_SCOPE_BINDING = PASS (adversarial, colliding notif. IDs across UID/OTHER_UID)
```

## 8. Aggregation, integer safety, schema validation

`reads.emulator.test.ts`'s "reconciles Q-053 with Q-060" test independently seeds 6 Org-A products across
two warehouses and asserts `sum(per-warehouse Q-060 values) === Q-053's org-wide value` (21,000 = 6,000 +
15,000) — a real reconciliation proof, not a type check. Q-085…Q-089 use the identical filter shape as
Q-062 (`status in statusFamily`, optional `supplierKind`/`createdAt` range) with only the status list
swapped per family — verified by direct source read of `countStatusFamilies` in `repositories.ts`.

Schema validation: `reads.emulator.test.ts` writes a document missing every required field directly via the
Admin SDK (bypassing any application-level guard) and asserts the client-SDK read path throws rather than
returning a coerced/partial object. Every converter in `packages/shared/src/converters.ts` calls
`schema.parse()` (throwing on failure, never `.safeParse()` with a default fallback) for both
`toFirestore` and `fromFirestore`. `RAW_UNVALIDATED_RETURN_PATHS = 0` — grepped `packages/data/src` for any
Firestore read that bypasses `.withConverter(...)`: none found.

No `parseFloat`, decimal `Number()` coercion, or floating-point division touching persisted quantity/money
fields anywhere in `packages/data/src`. Aggregation `sum`/`count` results are passed through directly as
Firestore returns them (already-integer minor/milli units maintained by the write side, which C2 does not
touch).

```text
AGGREGATION_CONTRACTS = PASS   Q053_Q060_RECONCILIATION = PASS (measured, not asserted)
Q085_Q089_FILTER_EQUIVALENCE = PASS   INTEGER_UNIT_SAFETY = PASS
SCHEMA_VALIDATION = PASS   RAW_UNVALIDATED_RETURN_PATHS = 0
```

## 9. Browser/server boundary, server-only reads, API surface

`packages/data/package.json` exports `.` (browser-safe, `dist/index.js`) and `./server` gated to the
`"node"` condition only (no `default`/`import`/`browser` fallback), plus a `"browser": {"./dist/server.js":
false}` map entry. Compiled-artifact inspection: `dist/index.js` re-exports only
`client/product-matrix/repositories/registry/types`; `grep firebase-admin dist/*.js` matches **only**
`dist/server.js`. `FIREBASE_ADMIN_IN_BROWSER_GRAPH = 0`. This is enforced structurally (module graph), not
only by convention.

Runtime-level enforcement is layered on top: `client.ts`'s `assertExecutable()` throws
`invalid-argument`/"server-only" if a browser caller requests a `scope: 'server'` query ID — proven by
`boundaries.test.ts` (`client.list('Q-046')` rejects with `/server-only/`).

Server-only/command-internal classification checked against DB-04 §8 for all 14 command-internal IDs plus
Q-046/Q-047: 15 of the 16 candidates are `scope: 'server'`; Q-058 is correctly excluded (§3 above) — a
subtle, correctly-made distinction rather than a blanket copy of DB-04 §8's row membership.
`server.ts`'s `build()` never performs a write; Q-071 (`stock.transfer` balance references) returns two
bare `DocumentReference`s by deterministic ID, no query, matching DB-04's "2, by deterministic id — no
query, no scan". `COMMAND_WRITE_LEAKAGE = 0`.

Public API surface (`index.ts` + `server.ts`) audited export-by-export: every runtime export is either a
registry-bound reader (`createReadClient`, `createServerReadBuilders`, `createStockmokRepositories`,
`listProductsFromMatrix`) or inert data/types (`QUERY_COVERAGE_REGISTRY`, `PRODUCT_LIST_MATRIX`, type
declarations). No function accepts a free-form Firestore path, arbitrary filter, or raw `Query`/
`CollectionReference` — every read-capable function takes a `QueryId` and looks it up in
`QUERY_COVERAGE_BY_ID`, so a caller cannot construct a query outside the declared 92-row set.
`QUERY_ESCAPE_HATCHES = 0`.

```text
SERVER_EXPORT_ISOLATION = PASS   ADMIN_SDK_BROWSER_LEAK = NO
COMPILED_PACKAGE_SURFACE = PASS   TRACKED_GENERATED_ARTIFACTS = 0 (dist/ gitignored, not tracked)
UNEXPECTED_PUBLIC_RUNTIME_EXPORTS = 0   QUERY_ESCAPE_HATCHES = 0
UNREGISTERED_QUERY_IMPLEMENTATIONS = 0   STALE_CALLABLE_QUERY_PATHS = 0
```

## 10. Test oracle independence

- `scripts/verify-c2.ts` (run live, not just read) regex-parses the **actual DB-04 markdown text at
  verify-time** — section-boundary-guarded, throwing if headings move — to derive `authorityIds`
  independently of `QUERY_COVERAGE_REGISTRY`, then asserts set equality. This is a genuine external oracle,
  not a hand-copied duplicate. Cross-checked by hand: the script's four documented exclusions
  (`Q-011a, Q-021, Q-084, Q-085g`) and its manual addition of `Q-086…Q-089` (DB-04 abbreviates that row as
  "Q-085 … Q-089" in prose, so a bare regex only captures `Q-085`) exactly match what I found reading the
  same document by hand.
- The root `verify:architecture` script performs a **third, separately-authored** re-derivation from the
  same authority documents and independently reports `ACTIVE_QUERY_IDS=92`, `UNDEFINED_CURRENT_QUERY_REFERENCES=0`.
- `q005.emulator.test.ts` and `reads.emulator.test.ts` use raw Admin-SDK writes as their oracle — a
  fundamentally different code path from the client-SDK reads under test. This is not a self-fulfilling
  design: corrupting a document via the admin path and asserting the client path rejects it, or writing to
  Org B via the admin path and asserting Org A's client-bound repository doesn't see it, cannot pass by
  accident if the implementation is wrong.
- One weaker spot: `product-matrix.test.ts` compares `PRODUCT_LIST_MATRIX` against `scripts/index-spec.ts`,
  a second hand-typed table (pre-existing, C1-authored, not derived from a live DB-04 parse). If both
  tables shared a common transcription error, this particular test would not catch it. I closed this gap
  myself by independently re-deriving the full 32-entry matrix by hand from DB-04 §7's text (§5 above) —
  exact match — so the property is proven even though the author's own test for it is not maximally
  independent.

```text
TEST_ORACLE_INDEPENDENCE = PASS
FALSE_POSITIVE_TEST_FINDINGS = []
```

## 11. Governed gates — run independently, not copied from author reports

Actual Node runtime for the correction run: v22.23.2. All `packages/data` Node gates were independently
rerun on Node 22 and passed, including 19/19 unit tests. Java: system default is 17.0.12, which
`firebase-tools` now refuses to launch the emulator on.
No local JDK 21 was found on this machine. Per explicit user instruction, a **read-only** JDK 21
(`Temurin 21.0.12+8`) already present in the sibling `backend-security` worktree
(`stockflow-worktrees/backend-security/.tools/jdk-21/jdk-21.0.12+8`) was used via `JAVA_HOME`/`PATH` for
the emulator-dependent gates only. Nothing in that worktree was modified, deleted, or moved.

| Gate                                              | Result                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `packages/data` format:check                      | PASS                                                                                    |
| `packages/data` typecheck                         | PASS                                                                                    |
| `packages/data` lint                              | PASS                                                                                    |
| `packages/data` unit tests                        | **PASS — 19/19, 5 files**                                                               |
| `packages/data` verify:contracts (`verify-c2.ts`) | **PASS** — all printed invariants matched §2–§7 above                                   |
| `packages/data` build                             | PASS (dist inspected, §9)                                                               |
| `packages/data` emulator suite (Temurin 21)       | **PASS — 14/14, 2 files**                                                               |
| root typecheck                                    | PASS                                                                                    |
| root format:check                                 | PASS                                                                                    |
| root lint                                         | PASS                                                                                    |
| root test:unit (excludes bootstrap)               | **PASS — 24/24, 8 files**                                                               |
| root verify:indexes                               | PASS — `INDEX_SET_MATCH=PASS`, `DB04_MATRIX_CONTRACT_MATCH=PASS`                        |
| root verify:architecture                          | PASS — independent 92/67/38/26/14 re-derivation, `UNDEFINED_CURRENT_QUERY_REFERENCES=0` |
| root verify:functions                             | PASS — `CALLABLE_EXPORTS=0` (Lane B correctly not started)                              |
| root build (shared + functions)                   | PASS                                                                                    |
| `test:bootstrap:t0` (Temurin 21)                  | **PASS — `T-SEED-01a-BOOTSTRAP=PASS`**                                                  |
| `test:bootstrap:replay` (Temurin 21)              | **PASS — `T-SEED-01b-BOOTSTRAP=PASS`**                                                  |

Every number above was produced by my own execution before I read `C2_COMPLETION_REPORT.md`. They match
the author's claimed numbers exactly (19/19, 14/14, 24/24, 67/67, 32/32, both bootstrap gates) — the
author's report is accurate, not merely asserted.

All root Node gates listed above were independently rerun on actual Node v22.23.2 and passed.

```text
ACTUAL_NODE_VERSION = v22.23.2
NODE22_PACKAGE_GATES = PASS   ROOT_NODE22_GATES = PASS
JAVA21_C2_EMULATOR = PASS     BOOTSTRAP_T0 = PASS   BOOTSTRAP_REPLAY = PASS
C1_G0_REGRESSION = PASS
```

## 12. Defects

None found at any severity that blocks promotion. Three P3 observations, none of which leave a critical
property unproven (each is independently closed by evidence elsewhere in this document):

1. **DB-04 authority gap (pre-existing, not a C2 defect):** `IDX-01`, `IDX-02`, `IDX-30` (PO-builder product
   picker) have no consumer among the 92 active query IDs; DB-04's own IDX-01 row text ("active-SKU
   `count()`") is stale relative to DB-04 §6/DB-03 (which route that KPI through Q-050/IDX-33). Out of C2's
   scope; recommend flagging to architecture ownership, not to the C2 author.
2. **Test design:** `product-matrix.test.ts`'s oracle (`scripts/index-spec.ts`) is a second hand-typed
   table rather than a live DB-04 parse. Closed by my independent manual re-derivation (§5, §10).
3. **Test coverage:** no isolated unit test targets the `metadata.fromCache` suppression branch in
   `subscribeUnreadBadge` directly. Closed by integration evidence (§6).

## 13. Promotion gate

All conditions in the review brief's §28 are independently satisfied:

```text
ACTIVE_QUERY_IDS = 92   IMPLEMENTED_QUERY_IDS = 92   MISSING/EXTRA/DUPLICATE/TOMBSTONED = 0/0/0/0
ACTIVE_INDEX_IDS = 67   INDEX_EXACT_SET = PASS
PRODUCT_LIST_MATRIX_INDEXES = 32   PRODUCT_MATRIX_EXACT_SET = PASS   IDX36 = PASS   ALL_ON_HAND_SORTS_DESC = PASS
Q005_* = PASS (all sub-checks, §6)          REALTIME_EXACT_SET_4 = PASS
PAGINATION = PASS   CURSOR_SCOPE_PROTECTION = PASS
TENANT_SCOPE = PASS   USER_SCOPE = PASS
SCHEMA_VALIDATION = PASS   AGGREGATIONS = PASS   INTEGER_UNIT_SAFETY = PASS
SERVER_BROWSER_BOUNDARY = PASS   COMMAND_WRITE_LEAKAGE = 0
FROZEN_NORMATIVE_AUTHORITY_CHANGED = NO   PACKAGES_SHARED_SOURCE_CHANGED = NO   FIRESTORE_RULES_CHANGED = NO
NODE22_PACKAGE_GATES = PASS   ROOT_NODE22_GATES = PASS   JAVA21_EMULATOR = PASS
C1_G0_REGRESSION = PASS   BOOTSTRAP_T0 = PASS   BOOTSTRAP_REPLAY = PASS
P0_DEFECTS = 0   P1_DEFECTS = 0
```

**C2_INDEPENDENT_REVIEW = PASS. C2_PROMOTABLE = YES.**

Security caveat preserved: this emulator configuration has no Firestore Rules file, so nothing above
constitutes RBAC, callable-authorization, or production-security evidence. That proof belongs to Lane B.

## 14. Next action

`FREEZE_FEATURE_DATA_C2`. Do not merge to `main`, rebase, merge backend, start frontend from this branch,
or deploy. Wait for promoted Backend Lane B.
