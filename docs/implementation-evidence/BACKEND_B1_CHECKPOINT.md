# BACKEND LANE B1 — SECURITY AND COMMAND FOUNDATION

**Implementation evidence, not normative authority.** Where this file and
`docs/database-final/**` or `docs/implementation/**` disagree, they win and this file is the defect.

```text
BACKEND_B1_STATUS  = COMPLETE
BRANCH             = feature/backend-security
WORKTREE           = C:\Users\ramsa\stockflow-worktrees\backend-security
BASELINE_ANCESTOR  = a0d500ac5953dc6a6a12bdb6ce3a4592a4c23ec1
NEXT_PHASE         = B2 (organization, team, master data)
```

---

## 1. Command catalog compatibility gate

Derived mechanically from the DB-06 §1 catalog table twice, by two independent parsers
(`scripts/verify-architecture.ts` and `tests/backend-foundation.test.ts`), then compared to
`packages/shared/src/commands.ts`.

```text
DB06_ACTIVE_COMMAND_IDS               = 38
SHARED_ACTIVE_COMMAND_IDS             = 38
DB06_VS_SHARED_COMMAND_SET_MATCH      = PASS
ACTIVE_COMMAND_IDS_INTERSECT_TOMBSTONES = 0     (C-32 Release C, C-35 split into C-35a/C-35b)
RELEASE_C_COMMANDS_INCLUDED           = 0
IDEMPOTENT_COMMANDS                   = 17
```

The set is `C-01 … C-31`, `C-33`, `C-34`, `C-35a`, `C-35b`, `C-36`, `C-37`, `C-38`. It is **not**
contiguous and was never assumed to be.

### Command coverage map — `functions/src/commands/coverage.ts`

Every active id carries the authorization shape the frame will apply and the phase that owns its body.
The role group on each row is asserted against DB-06 §1's own catalog cell by test, so the map cannot
drift from the contract.

| Phase                                               | Count | Ids                                         |
| --------------------------------------------------- | ----- | ------------------------------------------- |
| **B2** — organization, team, master data            | 17    | C-01 … C-12, C-35a, C-35b, C-36, C-37, C-38 |
| **B3** — inventory, transfer, private procurement   | 6     | C-13, C-14, C-15, C-16, C-17, C-33          |
| **B4** — connected B-Lite, mappings, canonical seed | 15    | C-18 … C-31, C-34                           |

Three commands are not membership-scoped and the frame models each explicitly:
`C-01 org.create` = `AUTHENTICATED`, `C-03 user.bootstrapProfile` = `SELF`,
`C-06 team.acceptInvitation` = `INVITEE` (verified token email). Every other id is `MEMBER_ROLE`.

**No command body was implemented.** `commandRegistry.size() === 0`, `missingIds().length === 38`,
`CALLABLE_EXPORTS = 0`.

---

## 2. What B1 implemented

### Firestore Security Rules — `firestore.rules` (new, wired into `firebase.json`)

The full DB-05 matrix.

| Zone                       | Implemented                                                                                                                                                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · public                 | `organizationDirectory/{handle}` `get` public, **`list` denied** (T-SEC-20); all client writes denied; `storefrontCatalog/**` declared inert (Release C)                                                                                                               |
| 2 · user-private           | `users/{uid}` self get, create restricted to the client-writable key set, update restricted to `displayName`/`photoUrl`/`lastSeenAt`; `memberships` self read, bounded at 100; `notifications` self read, update **`read` only**, create and delete denied to everyone |
| 3 · org-private            | `isActiveMember(orgId)` plus per-role `hasRole()` on every path, exactly per DB-05 §4 after DB-CR-015; `counters`, `commandReceipts`, `productSkuIndex` fully BACKEND_ONLY; the six `SAFE_DIRECT_CLIENT_WRITE` surfaces and no seventh                                 |
| 4 · cross-tenant canonical | `handleReservations`, `connections`, `connectedPurchaseOrders/**` — `allow read, write: if false` for **every** principal including a participating Owner                                                                                                              |
| catch-all                  | `match /{document=**} { allow read, write: if false; }` (T-SEC-18)                                                                                                                                                                                                     |

Properties asserted by test rather than claimed:

```text
DATA_DERIVED_RULE_READS = 0    the only paths any rule get()s or exists()s are
                               organizations/{orgId}/members/{request.auth.uid} and the
                               matched parent purchaseOrders/{poId} — both constant for the request
CLIENT_WRITE_SURFACES   = 6    users · notifications(read) · categories · warehouses ·
                               privatePartners · purchaseOrders(PRIVATE+DRAFT)
CLIENT_DELETE_PATHS     = 0
ZONE_4_CLIENT_ACCESS    = 0
QUERY_LIMIT_ENFORCED    = 9 collections at <= 100; the aggregation-bearing paths exempt
MISMATCHED_RBAC         = 0
```

Field-level denials implemented as the contract requires, each with its own test:
category `status` (DB-CR-012), warehouse `status` **in both directions** (DB-CR-033, T-SEC-35),
warehouse `isDefault` (no such field, DB-CR-013), private-partner `status` (T-SEC-40 · ATTACK-16) and
`ordersPlacedCount` (T-SEC-36), the derived `stockBalances` fields (T-SEC-37), and the
`isNewPrivateDraft()` / `isEditableDraft()` / `draftFieldsOnly()` predicates verbatim from DB-05 §4.1.

### Trusted backend — `functions/src/`

```text
core/
  firestore.ts       singleton Admin app; emulator-compatible; no explicit credential, ever
  errors.ts          the DB-06 §7 reason → HttpsError table as data; stable client mapping
  time.ts            serverTimestamp()/serverNow(); a client clock never becomes a stored value
  transaction.ts     TransactionScope: reads-before-writes enforced, every in-transaction query
                     bounded by construction, delete restricted to productSkuIndex
  idempotency.ts     commandReceipts/{operationId}: read first, created last, replay resolution
  audit.ts           writeAudit(): actor/role/organization/time all server-derived
  notify.ts          Q-059 recipient resolution, the total type→category map, fan-out bound 50
  define-command.ts  the frame — AUTH → INPUT → MEMBERSHIP → STATUS → ROLE → txn(receipt … receipt)
  registry.ts        catalog-checked registration; camelCase deployment names
  callable.ts        onCall adapter, region asia-southeast1, maxInstances 10, 256 MiB, 60 s
guards/
  auth.ts            uid and verified token email; nothing else is trusted about a caller
  membership.ts      membership read from the database, ACTIVE required
  role.ts            role read from the membership document, never from the payload
  owner.ts           canonical Owner from organizations/{orgId}.ownerUid; Owner protection primitives
  tenant.ts          path scoping + organizationId comparison + acting-for direction
  operation-id.ts    UUID v4 only
  reads.ts           the narrow trusted reads B1 needs, and nothing that resembles Lane A's layer
commands/
  coverage.ts        the 38-id phase and authorization map. No bodies.
```

### Admin SDK re-authorization principle

`ADMIN_SDK_REAUTHORIZATION_FOUNDATION = PASS`, and it is demonstrated rather than asserted:
`tests/backend/infrastructure.test.ts` writes an `auditLogs` document straight through the Admin SDK —
a write `firestore.rules` denies to every client including the Owner — and reads a zone-4 canonical
document no client may read. Every denial in `tests/backend/**` is therefore produced by the guards
alone.

The frame makes the sequence structural: a handler cannot run before `defineCommand()` has produced a
verified membership, and a handler receives no raw `orgId` claim and no payload-supplied role.

**Owner protection.** `readCanonicalOwnerUid()` reads `organizations/{orgId}.ownerUid`, so a membership
document whose `role` field says `OWNER` confers nothing. `assertOwnerNotTargeted()` refuses any
membership mutation aimed at the canonical Owner — including the Owner's own, which would leave the
organization without one — and `assertRoleAssignable()` refuses to assign `OWNER` at all.

---

## 3. Test results

| Suite             | Command                 | Result                   |
| ----------------- | ----------------------- | ------------------------ |
| Unit / derivation | `npm run test:unit`     | **103 passed** (9 files) |
| Security Rules    | `npm run test:rules`    | **392 passed** (5 files) |
| Trusted backend   | `npm run test:backend`  | **63 passed** (3 files)  |
| Both, one run     | `npm run test:security` | **455 passed** (8 files) |

Emulator: Firestore only, `firebase emulators:exec --project stockmok --only firestore`.

### Negative control — DB-08 §6.2

_"A rules test that passes before the fix it exists to prove is not evidence."_ Four deliberate
regressions were applied to `firestore.rules` and the suite was re-run:

| Regression                                                     | Caught by                                                        |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| `stockMovements` read widened from `NOT_VIEWER` to any member  | `T-SEC-26 · VIEWER`                                              |
| `boundedList()` removed from `categories` and `stockMovements` | `T-SEC-32` (both paths)                                          |
| `auditLogs` write opened to `ADMINS`                           | audit immutability, all three assertions, plus the group-4 sweep |
| private-partner `status` dropped from the never-changed set    | `T-SEC-40 · ATTACK-16`                                           |

Seven assertions failed under the weakened ruleset and all passed again after restoring it. The control
ran against the same suite that reports green, not a variant of it.

### Coverage against DB-05 §9

All seven roles participate in the read matrix in **both** organizations, and the matrix is asserted in
both directions — the roles DB-05 grants succeed, the roles it denies fail. Also covered: the
unauthenticated visitor, an authenticated non-member, a `SUSPENDED` member, a `REMOVED` member, a
connected counterparty's Owner reading cross-tenant, `T-SEC-31` members `get`/`list`, `T-SEC-23`
notifications, `T-SEC-39` memberships bound, `T-SEC-33` aggregation exemptions, zone-4 denial for all
seven roles in both organizations, and the catch-all on four invented paths.

`T-SEC-38` (a connected buyer sees no supplier-private snapshot) is covered at B1 in its structural
half — a connected counterparty is denied `partnerCatalog` outright — because the projection the
callable returns is `C-23`/`C-24`, a **B4** body.

---

## 4. Gates

```text
FORMAT_CHECK                        = PASS
TYPECHECK                           = PASS
ESLINT                              = PASS
UNIT_TESTS                          = PASS
ARCHITECTURE_INTEGRITY              = PASS
INDEX_SET_MATCH                     = PASS
DB04_MATRIX_CONTRACT_MATCH          = PASS

FIREBASE_ADMIN_FOUNDATION           = PASS
AUTH_CONTEXT                        = PASS
MEMBERSHIP_GUARDS                   = PASS
ROLE_GUARDS                         = PASS
OWNER_GUARDS                        = PASS
TENANT_GUARDS                       = PASS

FIRESTORE_RULES_IMPLEMENTED         = YES
FIRESTORE_RULES_TESTS               = PASS
TENANT_ISOLATION_TESTS              = PASS
RBAC_FOUNDATION_TESTS               = PASS

COMMAND_EXECUTION_FRAMEWORK         = PASS
OPERATION_ID_VALIDATION             = PASS
COMMAND_RECEIPT_FRAMEWORK           = PASS
IDEMPOTENCY_FOUNDATION_TESTS        = PASS
TRANSACTION_FOUNDATION              = PASS
AUDIT_FOUNDATION                    = PASS
AUDIT_IMMUTABILITY_TESTS            = PASS
NOTIFICATION_FOUNDATION             = PASS
ADMIN_SDK_REAUTHORIZATION_FOUNDATION = PASS

ACTIVE_QUERY_IDS = 92   ACTIVE_INDEX_IDS = 67   ACTIVE_COMMAND_IDS = 38
ACTIVE_INVARIANT_IDS = 26   ACTIVE_DERIVED_CONTRACT_IDS = 14
```

No frozen architecture count changed.

**Toolchain note.** The gates ran on Node **24.14.0** (the only runtime installed; `engines` asks for
22.x and npm warns `EBADENGINE`) and JDK **21.0.12** from `.tools/jdk-21`, used read-only for the
emulator. Current `firebase-tools` refuses any JDK below 21, so the system JDK 17 cannot run the
emulator. Neither fact changed any assertion.

---

## 5. Files

### Created

```text
firestore.rules
vitest.security.config.ts
functions/src/core/{firestore,errors,time,transaction,idempotency,audit,notify,define-command,registry,callable,index}.ts
functions/src/guards/{auth,membership,role,owner,tenant,operation-id,reads,index}.ts
functions/src/commands/coverage.ts
tests/backend-foundation.test.ts
tests/rules/{harness.ts,public-and-user,tenant-rbac,write-surfaces,zone4-and-catchall,query-limits}.test.ts
tests/backend/{harness.ts,guards,command-framework,infrastructure}.test.ts
docs/implementation-evidence/BACKEND_B1_CHECKPOINT.md
```

### Modified

```text
firebase.json               firestore.rules wired in
functions/src/index.ts      comment only; still exports nothing
package.json                security test scripts; @firebase/rules-unit-testing; format list
package-lock.json           @firebase/rules-unit-testing
scripts/verify-functions.ts C1-phase assertions updated to B1 (see §6)
tsconfig.json               vitest.security.config.ts included
vitest.config.ts            emulator suites excluded from the unit run
.gitignore                  build artifacts the functions build emits into packages/shared/src
README.md                   B1 test instructions and the JDK 21 requirement
```

`packages/shared/**` and every file under `docs/database-final/**` and `docs/implementation/**` are
**unchanged**.

---

## 6. Repairs made, and why each was in scope

| #   | Class | Issue                                                                                                                    | Repair                                                                                                                                                  |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A     | `scripts/verify-functions.ts` asserted _"C1 must not configure `firestore.rules`"_ — true of the phase before this one   | Inverted to require `firestore.rules`, kept `CALLABLE_EXPORTS = 0`                                                                                      |
| 2   | A     | The same script's export regex matched `export const stockTransfer = …` inside a **comment** in `functions/src/index.ts` | Strip comments before testing. A guard that trips on its own documentation is not a guard                                                               |
| 3   | A     | `npm run build:functions` emits the shared sources it imports beside them in `packages/shared/src/`                      | Artifacts deleted and ignored. The build config that causes it is Codex-owned and was **not** changed                                                   |
| 4   | A     | A test fixture re-seeded `INVENTORY_MANAGER` as `SUSPENDED`, so a role-denial case failed for the wrong reason           | Suspended member given its own uid; the assertion now proves what it names                                                                              |
| 5   | B     | `AuditLogSchema.action`'s regex in `packages/shared` cannot represent 16 of the 38 frozen command names (see §7)         | B1's audit validator binds `action` to the **active command name set** instead of to a shape — stricter, and derived from DB-06 §1 rather than invented |

```text
REPAIR_CYCLES_USED = 5   (4 mechanical, 1 substantive)
```

---

## 7. Shared-foundation issues

```text
SHARED_FOUNDATION_PATCH_REQUIRED = YES   (non-blocking; B1 is complete without it)
```

**`AuditLogSchema.action` rejects 16 of the 38 frozen command names.**
`packages/shared/src/schemas/network.ts` constrains `action` to
`/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/`, which forbids an uppercase letter inside a segment. DB-02 §6.4
requires `action` to be the dot-case command name and DB-06 §1 names the commands with camelCase
segments, so the schema cannot represent:

```text
org.updateSettings · user.bootstrapProfile · team.createInvitation · team.revokeInvitation
team.acceptInvitation · team.changeMemberRole · team.setMemberStatus · product.setStatus
stock.recordOpeningBalance · partnerCatalog.publish · partnerCatalog.unpublish · partnerCatalog.list
partnerCatalog.lookupBySku · cpo.draftSave · warehouse.setDefault · partner.setStatus
```

Proposed narrow patch: relax the pattern to `/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/`, or bind it to
`ActiveCommandNameSchema` as B1's validator already does. **B1 invented no competing local contract**;
it validates against the frozen catalog, which is strictly narrower than either pattern. The defect bites
the first time B2 parses a written audit record through the shared converter.

### Advisory, no patch requested

- **`packages/shared/permissions.ts` does not exist.** DB-05 §0.2 names it as the source the rules
  duplicate. B1 sited the permission table in `functions/src/guards/roles.ts`, which is backend-owned,
  and made `T-SEC-17` assert agreement across **three** sources — DB-05 §0.2, `firestore.rules` and the
  backend table — rather than two. If the frontend later needs the table, relocating it to
  `packages/shared` is the natural narrow patch.
- **`COMMAND_CONTRACTS.md` §2 declares `STOCK_WRITERS`**, which appears in no DB-05 §7.1 or DB-06 §1
  role gate. B1 did not define it. Not a conflict — an unused constant.
- **DB-05 §8 says the public directory carries "exactly nine fields"; DB-02 §1.1's table lists ten.**
  DB-02 is the schema authority and `OrganizationDirectorySchema` has ten keys. No behaviour depends on
  the count: clients cannot write the collection at all.
- **DB-06 §2's `C-33` input names `fromWarehouseId`/`toWarehouseId`; the shared payload uses
  `sourceWarehouseId`/`destinationWarehouseId`.** A field-name adaptation DB-02 §9 permits. Recorded
  here because **B3** implements that body and should not rediscover it.

---

## 8. Deferred to B2 / B3 / B4

B1 built the infrastructure; the bodies plug into it.

- **B2** — `C-01 … C-12`, `C-35a`, `C-35b`, `C-36`, `C-37`, `C-38`. Consumes: `defineCommand()`, the
  Owner primitives (`team.changeMemberRole` / `setMemberStatus` are their first callers), `writeAudit`,
  `notify` for `MEMBERSHIP_CHANGED`, and `TransactionScope.create` for the `handleReservations` and
  `productSkuIndex` uniqueness preconditions.
- **B3** — `C-13`, `C-14`, `C-15`, `C-16`, `C-17`, `C-33`. Owns every stock invariant. `C-13` accepts
  `quantityMilli >= 0` and must **not** be wired to a shared non-zero validator (A3R-P2 · C1-AUTH-007).
  `T-XFER-01 … T-XFER-12`, `T-CONC-01 … T-CONC-08` and `T-INT-03` belong here and to B4.
- **B4** — `C-18 … C-31`, `C-34`, plus the command-driven canonical seed and `T-SEED-01a` / `T-SEED-01b`.
  Every `cpo.*` and `connection.*` re-reads the canonical connection **inside** its transaction
  (`ATTACK-09`); `assertActingFor()` is the direction guard.

Not B1's and not started: the general Lane A read/query layer, any frontend, any deployment.

---

## 9. Cross-lane diff check

```text
FROZEN_NORMATIVE_AUTHORITY_CHANGED = NO
B2_BUSINESS_COMMANDS_IMPLEMENTED   = NO
B3_INVENTORY_PROCUREMENT_IMPLEMENTED = NO
B4_CONNECTED_WORKFLOW_IMPLEMENTED  = NO
GENERAL_C2_QUERY_LAYER_IMPLEMENTED = NO
FRONTEND_IMPLEMENTATION_WRITTEN    = NO
OTHER_WORKTREE_MODIFIED            = NO
PRODUCTION_DEPLOYMENT              = NO
REMOTE_PUSHED                      = NO
BLOCKERS                           = none
READY_FOR_B2                       = YES
```

`tests/backend/command-framework.test.ts` exercises the frame through **frame probes** that borrow the
ids `C-04`, `C-05` and `C-15` so the real payload schemas and role gates run. Their handlers write
nothing and return a counter. They are test-local, are never registered or exported, and implement none
of those commands' semantics.
