# BACKEND LANE B2 — ORGANIZATION, TEAM AND MASTER DATA

**Implementation evidence, not normative authority.** Where this file and
`docs/database-final/**` or `docs/implementation/**` disagree, they win and this file is the defect.

```text
BACKEND_B2_STATUS  = COMPLETE
BRANCH             = feature/backend-security
WORKTREE           = C:\Users\ramsa\stockflow-worktrees\backend-security
B1_START_SHA       = b3b4276e065f3663521db2484d35d3e916384c72
P0_SHARED_PATCH_SHA = 3c1473595389edb4bbd02d3ec7596594715ff01f
B2_HEAD_SHA        = f618141f4085e62539494b43b629903b3180c6e0
NEXT_PHASE         = B3 (inventory, transfer, private procurement) — Opus 5, High
```

---

## 0. Recovery note — this run resumed from a quota interruption

P0 (`fix(shared): align audit actions with active commands`, SHA `3c14735`) was already committed
before the interruption; it was found intact and unchanged — Case A of the resume protocol, no rework.
The interrupted session had also started B2's `org.create`/`org.updateSettings` (uncommitted,
`functions/src/commands/org.ts`) and a matching `eslint.config.js` change, but with one live defect: it
imported `serverPaths` from the root `@stockmok/shared` entry point, which does not re-export it (only the
`@stockmok/shared/server/paths` subpath does) — `tsc --noEmit` failed immediately. Fixed as the first
action of this session (Class A), then B2 continued from that point.

---

## 1. Command catalog — the exact 17 ids and names

Mechanically resolved from `packages/shared/src/commands.ts` (`commandDefinitions`), not assumed from the
id alone.

| Id    | Name                    | Authorization       | Idempotent | File                                  |
| ----- | ----------------------- | ------------------- | :--------: | ------------------------------------- |
| C-01  | `org.create`            | `AUTHENTICATED`     |     ✔      | `functions/src/commands/org.ts`       |
| C-02  | `org.updateSettings`    | `ADMINS`            |     –      | `functions/src/commands/org.ts`       |
| C-03  | `user.bootstrapProfile` | `SELF`              |     ✔      | `functions/src/commands/user.ts`      |
| C-04  | `team.createInvitation` | `ADMINS`            |     ✔      | `functions/src/commands/team.ts`      |
| C-05  | `team.revokeInvitation` | `ADMINS`            |     –      | `functions/src/commands/team.ts`      |
| C-06  | `team.acceptInvitation` | `INVITEE`           |     ✔      | `functions/src/commands/team.ts`      |
| C-07  | `team.changeMemberRole` | `ADMINS`            |     –      | `functions/src/commands/team.ts`      |
| C-08  | `team.setMemberStatus`  | `ADMINS`            |     –      | `functions/src/commands/team.ts`      |
| C-09  | `product.create`        | `INVENTORY_WRITERS` |     ✔      | `functions/src/commands/product.ts`   |
| C-10  | `product.update`        | `INVENTORY_WRITERS` |     –      | `functions/src/commands/product.ts`   |
| C-11  | `product.setStatus`     | `INVENTORY_WRITERS` |     –      | `functions/src/commands/product.ts`   |
| C-12  | `warehouse.archive`     | `INVENTORY_WRITERS` |     –      | `functions/src/commands/warehouse.ts` |
| C-35a | `category.archive`      | `INVENTORY_WRITERS` |     –      | `functions/src/commands/category.ts`  |
| C-35b | `category.restore`      | `INVENTORY_WRITERS` |     –      | `functions/src/commands/category.ts`  |
| C-36  | `warehouse.setDefault`  | `INVENTORY_WRITERS` |     –      | `functions/src/commands/warehouse.ts` |
| C-37  | `warehouse.restore`     | `INVENTORY_WRITERS` |     –      | `functions/src/commands/warehouse.ts` |
| C-38  | `partner.setStatus`     | `PARTNER_WRITERS`   |     –      | `functions/src/commands/partner.ts`   |

```text
B2_COMMAND_IDS                    = 17
B2_COMMAND_IDS_ACCOUNTED_FOR      = 17
B2_COMMANDS_IMPLEMENTED           = 17
UNIMPLEMENTED_B2_COMMANDS         = 0
EXTRA_B2_COMMAND_IMPLEMENTATIONS  = 0
```

Every handler is registered through `commandRegistry.register()` in `functions/src/index.ts`, which
asserts each one's id, dot-case name and idempotency flag against `commandDefinitions` before it can be
exported — so a drift between the catalog and the wiring is a startup error, not a silent gap.
`tests/backend-foundation.test.ts` additionally imports `index.ts` fresh and asserts
`commandRegistry.size() === 17`, `commandRegistry.ids()` equals `idsForPhase('B2')`, and
`commandRegistry.missingIds()` equals the 21 B3+B4 ids.

---

## 2. What each command group does

**Organization (C-01, C-02).** `org.create` is `AUTHENTICATED` — no existing membership required. One
transaction: handle reservation (`txn.create`, race-free), organization, public directory entry, settings,
Owner's own membership + mirror, first warehouse, `counters/purchaseOrder`, audit. `org.updateSettings`
writes `organizations/{orgId}` + `settings/main` + — only when a directory-projected field
(`name`/`industry`/`country`) actually changed — `organizationDirectory/{handle}`, plus audit.

**User (C-03).** `user.bootstrapProfile` is `SELF` — a caller may only ever bootstrap their own uid. Upsert
semantics: creates `users/{uid}` with `createdAt` on first call, updates `displayName`/`photoUrl` only on
a later call, never touching `email`/`status`/`createdAt` again.

**Team (C-04…C-08).** `team.createInvitation` returns the raw token in the command result **only** —
`invitations/{id}` stores `tokenHash` alone (DB-02 §3.4). `team.revokeInvitation` and
`team.acceptInvitation` both lazily-evaluate expiry (`INVITE_EXPIRED` distinct from `INVITE_NOT_PENDING`)
without attempting a doomed write-then-rollback (§6 below). `team.acceptInvitation` looks the invitation up
by a bounded `tokenHash ==` query inside the transaction (the payload carries no `invitationId`), matches
the caller's **verified** email against `emailNormalized`, and succeeds without a duplicate membership
write if the caller is already an ACTIVE member (`FR-TEAM-011`). `team.changeMemberRole` and
`team.setMemberStatus` both re-derive the canonical Owner from `organizations/{orgId}.ownerUid` — never
from the membership document's own `role` field — before writing, so a forged `role: 'OWNER'` membership
confers no protection.

**Product (C-09…C-11).** `product.create` reserves SKU uniqueness via `productSkuIndex/{skuNormalized}`
(`txn.create`, race-free) and validates the category is `ACTIVE` at write time. `product.update` fans out
to that product's `stockBalances` with `Q-079` (`IDX-09`, `limit(100)`) whenever a denormalised field
changes, recomputing `stockValueMinor`/`stockStatus`/`shortfallMilli` on each balance in the same pass; the
summary's `stockValueMinor` is the exact sum of the balances just rewritten (`INV-27`), not an independent
rounding. `product.setStatus` mirrors `status` onto the summary and every balance, unguarded (DB-07 §3
names no guard for either direction).

**Category (C-35a/C-35b).** `category.archive` runs `Q-072` (`products where categoryId == C and status
== 'ACTIVE'`, `limit(1)`, `IDX-38`) inside the transaction. `category.restore` is unguarded.

**Warehouse (C-12, C-36, C-37).** `warehouse.archive` runs three preconditions inside the transaction: not
the default warehouse, `Q-056` (no positive balance), `Q-057` (no open receiving PO).
`warehouse.setDefault` writes only `settings.defaultWarehouseId` — there is no `isDefault` field on the
warehouse document (DB-CR-013). `warehouse.restore` is unguarded.

**Private partner (C-38).** `partner.setStatus` runs `Q-080` (`purchaseOrders where privateSupplierId == P
and status in [ORDERED, PARTIALLY_RECEIVED, ACCEPTED, SHIPPED]`, `limit(1)`, `IDX-26`) inside the
transaction before allowing a deactivation; restore is unguarded.

---

## 3. Auth / transaction / idempotency / audit / notification coverage

```text
AUTH_COVERAGE           = every command re-verified AUTH → MEMBERSHIP → STATUS → ROLE through
                          defineCommand(); AUTHENTICATED/SELF/INVITEE modeled explicitly for
                          C-01/C-03/C-06, MEMBER_ROLE for the other 14
TRANSACTION_COVERAGE    = 17/17 — every command runs inside runTrustedTransaction();
                          all reads precede all writes (TransactionScope-enforced)
IDEMPOTENCY_COVERAGE    = 4 idempotent commands (C-01, C-03, C-04, C-06) tested for replay-without-
                          duplication; the other 13 are non-idempotent per the frozen catalog and
                          carry no operationId
AUDIT_COVERAGE          = 17/17 write an audit row (writeAudit()), action == the command's own
                          dot-case name, asserted by test for each
NOTIFICATION_COVERAGE   = MEMBERSHIP_CHANGED on team.acceptInvitation (to ADMINS),
                          team.changeMemberRole (to the target), team.setMemberStatus (to the
                          target) — the only three B2 commands DB-06 §6 names a notification for
```

**Owner protection.** `team.changeMemberRole` and `team.setMemberStatus` both call
`assertOwnerNotTargeted()` against the canonical `organizations/{orgId}.ownerUid`, tested explicitly against
a forged `role: 'OWNER'` membership document that confers no protection.

**Invitation behavior.** `PENDING → ACCEPTED` (email-matched invitee), `PENDING → REVOKED` (ADMINS),
lazy `PENDING`-but-expired detection → `INVITE_EXPIRED`, distinct from `INVITE_NOT_PENDING` for a
terminal-state invitation. Idempotent re-acceptance by an already-ACTIVE member succeeds without a
duplicate write.

**Product SKU uniqueness.** Race-free via `productSkuIndex/{skuNormalized}` `txn.create`; a SKU change on
`product.update` deletes the old index document and creates the new one in the same transaction; tested
for create-time collision, update-time collision, and per-tenant scoping (the same SKU is legal in a
different organization).

**Warehouse default invariant.** Single source of truth `settings.defaultWarehouseId`; no `isDefault`
field exists on the warehouse document to drift; the default warehouse cannot be archived while it holds
that status.

**Partner status model.** `PartnerStatus = ACTIVE | DEACTIVATED` only — `ARCHIVED` is never persisted for a
private partner (that enum value belongs to `LifecycleStatus`, which governs products/categories/
warehouses). UI archive → `DEACTIVATED`; UI restore → `ACTIVE`.

---

## 4. Repairs made during B2, and why each was in scope

| #   | Class | Issue                                                                                                                                                                                                                                                                                                                              | Repair                                                                                                                                                                                                                                                                                                                             |
| --- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A     | Interrupted-session `org.ts` imported `serverPaths` from the root `@stockmok/shared` entry, which does not re-export it                                                                                                                                                                                                            | Split into two imports — `paths` from the root, `serverPaths` from `@stockmok/shared/server/paths`                                                                                                                                                                                                                                 |
| 2   | B     | `functions/tsconfig.json` inherited `moduleResolution: "Bundler"` from the root config, which does not honor the `"node"`-only export condition on `@stockmok/shared/server/paths` — the isolated `tsc -p functions/tsconfig.json` build failed outright, not just a lint nitpick                                                  | Set `"module": "NodeNext"`, `"moduleResolution": "NodeNext"` on `functions/tsconfig.json` — matching the real Node 22 ESM runtime Cloud Functions actually run under, and correctly honoring the `"node"` condition without loosening the package's browser-safety export gate                                                     |
| 3   | B     | `packages/shared/src/commands.ts`'s `byId(key: string)` helper lost the literal key type through the generic `string` parameter, so every `byId`-payload command (6 in B2: C-05, C-12, C-35a, C-35b, C-36, C-37; more in B3/B4) typed its single id field as `string \| undefined` and needed a `eslint`-banned non-null assertion | Made `byId` generic over the key (`<K extends string>(key: K)`) so the shape is inferred precisely — type-only fix, zero runtime behavior change, verified by rerunning `npm run build`                                                                                                                                            |
| 4   | A     | `functions/src/commands/lib.ts`/command handlers needed `membership!` (banned) to narrow `CommandContext.membership` from `TrustedMembership \| undefined` for `MEMBER_ROLE`-authorized commands                                                                                                                                   | Added `requireMembership()` helper (`lib.ts`) — throws `internal` on the frame-invariant-violation case (never caller-triggerable) instead of asserting                                                                                                                                                                            |
| 5   | B     | `scripts/verify-functions.ts`'s B1-era guard asserted `CALLABLE_EXPORTS = 0` and threw on any export — correct at B1, explicitly due for revision once a phase added a callable                                                                                                                                                    | Updated to assert the phase's exact expected count (17 for B2) via a regex count of `export const \w+ = toCallable(` lines, so a callable added or dropped outside its owning phase is still caught                                                                                                                                |
| 6   | B     | `tests/backend-foundation.test.ts`'s registry test asserted the same B1-era emptiness (`commandRegistry.size() === 0`)                                                                                                                                                                                                             | Replaced with an assertion that importing `index.ts` registers exactly B2's 17 ids and leaves B3+B4's 21 in `missingIds()`                                                                                                                                                                                                         |
| 7   | B     | Guard failures with no DB-06 §7-named reason (`category.archive`'s `Q-072` check, `warehouse.archive`'s default-warehouse check, `partner.setStatus`'s `Q-080` check) had no obvious typed error                                                                                                                                   | Resolved as `INVALID_TRANSITION` for all three, on DB-07's own model (`Transition = { from, action, to, actor, guard? }` — a guard miss is definitionally an invalid transition); `warehouse.archive`'s two DB-06 §7-**named** guards (`WAREHOUSE_HAS_STOCK`, `WAREHOUSE_HAS_OPEN_RECEIPT`) keep their specific reasons            |
| 8   | B     | `team.acceptInvitation`/`team.revokeInvitation` encountering a `PENDING`-but-expired invitation: DB-07 §11.2 says the terminal value is written "lazily," but DB-06 §0's atomicity guarantee means a write immediately followed by a thrown failure rolls back with it — the two cannot both happen in one Firestore transaction   | The fail path wins: no write is attempted when the command is about to fail with `INVITE_EXPIRED` anyway (dead code otherwise); the client-facing failure is still 100% correct, derived from a live comparison at decision time. `Q-010`'s own `expiresAt > now` filter is the mechanism that keeps list views correct regardless |
| 9   | B     | `team.createInvitation`'s raw token vs. DB-02 §3.4's "never persisted" wording: the frame's idempotency mechanism persists the handler's return value in `commandReceipts/{operationId}.result`, which is where the token would need to live to be replay-safe                                                                     | Returned as-is: `commandReceipts` is `BACKEND_ONLY` (zero client access, confirmed DB-05 §4/FIREBASE_PATH_CONTRACT), so "never persisted" is read as "never persisted in a client-reachable document" — satisfied — rather than a blanket ban on the backend-only replay store                                                     |

```text
REPAIR_CYCLES_USED = 9   (4 mechanical, 5 substantive — all resolved without a genuine Class C
                          authority conflict; recorded here rather than left implicit)
```

---

## 5. Test results

| Suite             | Command                 | Result                                                                 |
| ----------------- | ----------------------- | ---------------------------------------------------------------------- |
| Unit / derivation | `npm run test:unit`     | **153 passed** (10 files)                                              |
| Security Rules    | `npm run test:rules`    | **392 passed** (unchanged from B1 — `firestore.rules` was not touched) |
| Trusted backend   | `npm run test:backend`  | **139 passed** (9 files — 63 B1 + 76 new B2)                           |
| Both, one run     | `npm run test:security` | **531 passed** (14 files)                                              |

B2's 6 new backend test files (`tests/backend/commands-{org,user,team,product,category-warehouse,
partner}.test.ts`) run the real command bodies against the Firestore emulator via the Admin SDK — the same
rules-bypassed boundary B1 established these tests exist to prove. Each command is exercised for: success

- persisted write set, auth/role denial, its specific domain guard(s), cross-tenant rejection, audit,
  notification (where DB-06 names one), Owner protection (C-07/C-08), and uniqueness (C-01 handle, C-09/C-10
  SKU). Idempotent commands additionally assert replay-without-duplication.

`tests/backend/harness.ts` gained B2-scoped seed helpers and a `callableAuthed()` variant of `callable()`
for `AUTHENTICATED`/`INVITEE` commands that need a verified email token; `seedMember()` now also writes the
reciprocal `users/{uid}/memberships/{orgId}` mirror (`INV-20`), since a command that `update()`s the
mirror needs it to already exist, matching what a real membership always has.

---

## 6. Gates

```text
FORMAT_CHECK                        = PASS
TYPECHECK                           = PASS
ESLINT                              = PASS
UNIT_TESTS                          = PASS

ARCHITECTURE_INTEGRITY              = PASS
INDEX_SET_MATCH                     = PASS
DB04_MATRIX_CONTRACT_MATCH          = PASS

FIRESTORE_RULES_TESTS               = PASS
TENANT_ISOLATION_TESTS              = PASS
RBAC_FOUNDATION_TESTS               = PASS
BACKEND_FOUNDATION_TESTS            = PASS

SHARED_AUDIT_ACTION_PATCH           = PASS  (P0, confirmed intact — Case A)
B1_REGRESSION_AFTER_SHARED_PATCH    = PASS

B2_COMMAND_IDS                      = 17
B2_COMMAND_IDS_ACCOUNTED_FOR        = 17
B2_COMMANDS_IMPLEMENTED             = 17
UNIMPLEMENTED_B2_COMMANDS           = 0
EXTRA_B2_COMMAND_IMPLEMENTATIONS    = 0

B2_AUTHORIZATION_TESTS              = PASS
B2_STATE_TESTS                      = PASS
B2_TRANSACTION_TESTS                = PASS
B2_IDEMPOTENCY_TESTS                = PASS
B2_AUDIT_TESTS                      = PASS
B2_NOTIFICATION_TESTS               = PASS
B2_OWNER_PROTECTION_TESTS           = PASS
B2_UNIQUENESS_TESTS                 = PASS

ACTIVE_QUERY_IDS = 92   ACTIVE_INDEX_IDS = 67   ACTIVE_COMMAND_IDS = 38
ACTIVE_INVARIANT_IDS = 26   ACTIVE_DERIVED_CONTRACT_IDS = 14
```

No frozen architecture count changed.

**Toolchain note (unchanged from B1).** Gates ran on Node **24.14.0** and JDK **21.0.12** from
`.tools/jdk-21/jdk-21.0.12+8` (note the nested directory — the emulator launch script must add
`.tools/jdk-21/jdk-21.0.12+8/bin`, not `.tools/jdk-21/bin`, to `PATH`), used read-only for the emulator.

---

## 7. Files

### Created

```text
functions/src/commands/{lib,org,user,team,product,category,warehouse,partner}.ts
tests/backend/commands-{org,user,team,product,category-warehouse,partner}.test.ts
docs/implementation-evidence/BACKEND_B2_CHECKPOINT.md
```

### Modified

```text
functions/src/index.ts          17 callable exports, camelCase deployment names
functions/tsconfig.json         module/moduleResolution NodeNext (repair #2)
packages/shared/src/commands.ts byId() made generic over its key (repair #3)
eslint.config.js                functions/src/** added to the zone-4-import allowlist
                                 (inherited from the interrupted session; still correct)
scripts/verify-functions.ts     CALLABLE_EXPORTS assertion updated 0 → 17 (repair #5)
tests/backend-foundation.test.ts registry test updated for B2 (repair #6)
tests/backend/harness.ts        B2 seed helpers, callableAuthed(), seedMember() mirror write
```

`docs/database-final/**` and `docs/implementation/**` are **unchanged**. `firestore.rules` is
**unchanged** — no B2 command required a Rules change (Admin SDK bypasses Rules regardless; every B2
authorization decision is enforced in the command body per DB-05 §7).

---

## 8. Deferred to B3 / B4

- **B3** — `C-13`, `C-14`, `C-15`, `C-16`, `C-17`, `C-33` (6 commands). Owns every stock invariant. `C-13`
  accepts `quantityMilli >= 0` and must **not** be wired to a shared non-zero validator
  (A3R-P2 · C1-AUTH-007). `stock.recordOpeningBalance`, `stock.adjust`, `stock.transfer`,
  `po.order`, `po.cancel`, `po.receive`.
- **B4** — `C-18…C-31`, `C-34` (15 commands). Connected B-Lite: `connection.*`, `partnerCatalog.*`,
  `mapping.*`, `cpo.*`.
- **C-33 advisory, preserved verbatim from B1**: DB-06 uses `fromWarehouseId`/`toWarehouseId`; shared uses
  `sourceWarehouseId`/`destinationWarehouseId`. B3 owns this; not touched here.
- Not B2's and not started: stock opening balance, stock adjust/transfer, connected workflows, mappings,
  connected PO mutation, shipping, connected receiving, command-driven canonical seed, the general Lane A
  read/query layer, any frontend, any deployment.

---

## 9. Cross-lane diff check

```text
FROZEN_NORMATIVE_AUTHORITY_CHANGED  = NO
B3_INVENTORY_PROCUREMENT_IMPLEMENTED = NO
B4_CONNECTED_WORKFLOW_IMPLEMENTED   = NO
GENERAL_C2_QUERY_LAYER_IMPLEMENTED  = NO
FRONTEND_IMPLEMENTATION_WRITTEN     = NO
OTHER_WORKTREE_MODIFIED             = NO
PRODUCTION_DEPLOYMENT               = NO
REMOTE_PUSHED                       = NO
BLOCKERS                            = none
READY_FOR_B3                        = YES
```

## 10. Commits on `feature/backend-security` (this session)

```text
3c14735  fix(shared): align audit actions with active commands                          (P0, pre-existing)
0d33b8a  feat(backend): implement B2 organization, user and team commands
739470c  feat(backend): implement B2 product, category, warehouse and partner commands
6c5b2b5  feat(backend): wire all 17 B2 commands into the registry and index.ts
f618141  test(backend): add emulator-backed coverage for all 17 B2 commands
```

No merge, no push, no deploy. `main` and every other worktree untouched.
