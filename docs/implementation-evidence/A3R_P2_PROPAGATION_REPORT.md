# A3R-P2 — C1 IMPLEMENTATION-DISCOVERY PROPAGATION REPORT

**Date:** 2026-08-17 · **Scope:** documentation / authority propagation only.
**Controlled amendment:** `DB_00` **§8.12**.
**Nature:** six propagation corrections + **one owner-approved semantic exception** (`C1-AUTH-007`).
No new feature, no reopened decision, no changed count, no production or C1 implementation code touched.

## 1. The seven findings, their final representation, and where each landed

| ID              | Final current representation                                                                                                                                                                                                                                                                                                | Class                                 | Files changed                                                                                                                                                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1-AUTH-001** | `MovementType = OPENING_BALANCE · ADJUSTMENT_IN · ADJUSTMENT_OUT · PURCHASE_RECEIPT · CONNECTED_DISPATCH_OUT · TRANSFER_OUT · TRANSFER_IN`; the generic `ADJUSTMENT` is not a storage value                                                                                                                                 | propagation                           | `DOMAIN_TYPES.md`, `COMMAND_CONTRACTS.md` (`adjustmentReason` now cited on `ADJUSTMENT_IN`/`ADJUSTMENT_OUT`), `DB_00` §8.12, `DB_09` §13                                                                                                                         |
| **C1-AUTH-002** | `ConnectionStatus = PENDING · ACTIVE · REJECTED · DISABLED`; `DECLINED` is not a stored value                                                                                                                                                                                                                               | propagation                           | `DOMAIN_TYPES.md`, `DB_00` §8.12                                                                                                                                                                                                                                 |
| **C1-AUTH-003** | `MappingStatus = VERIFIED · DISABLED`; `DRAFT` and `INVALID` are not Release A/B mapping states, `PENDING`/`REJECTED` stay B-PLUS-only                                                                                                                                                                                      | propagation                           | `DOMAIN_TYPES.md`, `DB_00` §8.12                                                                                                                                                                                                                                 |
| **C1-AUTH-004** | Private partners: bounded `partnerTypes: ('SUPPLIER'\|'BUYER')[]` (≥ 1, ≤ 2) and `PartnerStatus = ACTIVE \| DEACTIVATED`. UI **archive → `DEACTIVATED`**, **restore → `ACTIVE`**; `ARCHIVED` never persisted here. `C-38 partner.setStatus` remains the trusted status-changing command — authorization and guard untouched | propagation                           | `DB_05` (`T-SEC-41` → `DEACTIVATED`), `DB_07` §5 (the A1-era _"needs no command and is a client write"_ line, superseded by A3R-11, is retired), `DOMAIN_TYPES.md` (`partnerTypes` + `PartnerStatus` replace singular `kind` + `LifecycleStatus`), `DB_00` §8.12 |
| **C1-AUTH-005** | `UserStatus = ACTIVE \| DISABLED` — `DB_02` §2.1 already owned both values                                                                                                                                                                                                                                                  | propagation                           | `DOMAIN_TYPES.md`, `DB_00` §8.12                                                                                                                                                                                                                                 |
| **C1-AUTH-006** | `IDX-36 = productStockSummaries · productStatus ASC, stockStatus ASC, onHandMilli DESC`; every product-list matrix variant sorting on `onHandMilli` is `DESC` because the later **DB-CR-038** matrix rule controls                                                                                                          | propagation                           | `DB_04` §3 (`Q-013b` order) and §7 (`IDX-36` row), `DB_09` §13, `DB_00` §8.12                                                                                                                                                                                    |
| **C1-AUTH-007** | `if movementType == OPENING_BALANCE: signedQuantityMilli >= 0` · `else: signedQuantityMilli != 0`. `C-13` accepts `quantityMilli >= 0`; a zero creates the deliberate immutable zero opening-ledger entry                                                                                                                   | **OWNER-APPROVED SEMANTIC EXCEPTION** | `DB_02` §4.6, `DB_06` §3 + §3.1, `DB_08` §2 + §6.5, `DB_09` §13, `DB_00` §8.12, `DOMAIN_TYPES.md`, `COMMAND_CONTRACTS.md`, `FRONTEND_BACKEND_CONTRACT.md`                                                                                                        |

**Owner-approved status of `C1-AUTH-007`.** `DB-02` said every `signedQuantityMilli` is non-zero; `DB-08` §2
requires Cooking Oil to carry an explicit `OPENING_BALANCE` of `0` so the out-of-stock KPI is provable from
the ledger. Both cannot hold. The owner ruled for `DB-08`'s semantics, narrowly — zero is legal for
`OPENING_BALANCE` **only**, and stays rejected for `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `PURCHASE_RECEIPT`,
`CONNECTED_DISPATCH_OUT`, `TRANSFER_IN` and `TRANSFER_OUT`. The exception is now recorded in the controlled
authority chain (`DB_00` §8.12) rather than only in implementation evidence.

## 2. Mechanical verification — derived from the current documents, not copied forward

Query ids enumerated from `DB_04` §1–§6 and §8 row ids plus the `Q-085 … Q-089` aggregation row (5 ids);
indexes from `DB_04` §7 rows plus `IDX-32` (declared in prose, consumed in §8); commands from `DB_06` §1
rows less `C-32` (Release C); invariants from `DB_07` §11 rows plus `INV-26` (defined in the DB-CR-027
paragraph) less the withdrawn `INV-25`; derived contracts from the `DV-01 … DV-14` register in `DB_07` §12.

```text
ACTIVE_QUERY_IDS             = 92        ACTIVE_INDEX_IDS            = 67
ACTIVE_COMMAND_IDS           = 38        ACTIVE_INVARIANT_IDS        = 26
ACTIVE_DERIVED_CONTRACT_IDS  = 14        PRODUCT_LIST_MATRIX_INDEXES = 32  (2 modes × 4 filters × 4 sorts)

UNDEFINED_QUERY_IDS = 0   UNDEFINED_INDEX_IDS = 0   UNDEFINED_COMMAND_IDS = 0
UNDEFINED_INVARIANT_IDS = 0   UNDEFINED_DV_IDS = 0
```

Every id referenced across `DB_00 … DB_11`, `docs/implementation/` and the handoff resolves to a definition.
The only unresolved tokens are the packs' own declared tombstones, each labelled historical where it appears:
`Q-011a`, `Q-021`, `Q-049`, `Q-081`, `Q-082`, `Q-084`, `Q-085g`, `IDX-03`, `IDX-19`,
`C-35`, `INV-25`. No id was added, deleted or renumbered by this pass.

### 2.1 Index verification

`IDX_36_DIRECTION = DESC`. All **eight** product-list matrix on-hand slots are `DESC` — mode A `IDX-47`,
`IDX-49`, `IDX-36`, `IDX-56`; mode B `IDX-41`, `IDX-59`, `IDX-62`, `IDX-66`. The one remaining
`onHandMilli ASC` in `DB_04` is **`IDX-04`** (`stockStatus ASC, onHandMilli ASC`), which is the low-stock
list / `count()` index and **not** part of the product-list matrix — it is `ASC` in the C1 generator too, so
the document and the generated index set agree. `ACTIVE_INDEX_IDS = 67`,
`PRODUCT_LIST_MATRIX_INDEXES = 32`, no new index, none deleted, no renumbering.

### 2.2 Zero-opening-balance verification

```text
ZERO_OPENING_BALANCE_RULE = PROPAGATED        C13_SYNCHRONIZED = YES
```

The conditional rule is carried verbatim in `DB_02` §4.6 and restated in `DB_06` §3/§3.1, `DB_08` §2,
`DB_09` §13, `DOMAIN_TYPES.md` and `COMMAND_CONTRACTS.md`; `FRONTEND_BACKEND_CONTRACT.md` §3 states that a
quantity of `0` must be submittable on `SCREEN-042`/`FORM-023`. `C-13` keeps one opening balance per product
**and** warehouse, the immutable movement, the correct `balanceAfterMilli`, and its existing
auth / RBAC / transaction / idempotency semantics; `INVALID_QUANTITY` now applies to it for a negative value
or precision > 3 dp only. Both `DB_06` §3 and `COMMAND_CONTRACTS.md` state explicitly that the shared
`nonZeroQuantity` validator must not be wired into `C-13`.

**No other command was relaxed.** Verified still in force: `C-33` `quantityMilli > 0` and
`INVALID_QUANTITY | q <= 0`; `C-17` per-line `0 < receiveMilli <= orderedMilli − receivedMilli`; the
blanket statement that every other material stock command keeps its strictly-positive requirement.

**Cooking Oil** remains `movementType = OPENING_BALANCE`, `signedQuantityMilli = 0`,
`balanceAfterMilli = 0` — one of the twelve t₀ opening movements. Canonical seed figures re-checked and
unchanged: 12 products · 12 movements · 4 low · 1 out · `LKR 564,200.00`; post-chain 17 movements ·
MEAT-001 6 movements / `120.000 KG` · 3 low · 1 out · Cold Room `LKR 398,900.00` + Main Store
`LKR 292,800.00` = `LKR 691,700.00`.

### 2.3 Stale-current-assertion scan

```text
STALE_CURRENT_ASSERTIONS = 0
```

Fourteen patterns swept across `DB_00 … DB_11`, `docs/implementation/` and the handoff: generic
`ADJUSTMENT` as a persisted `MovementType` · `DECLINED` · `MappingStatus DRAFT` · `MappingStatus INVALID` ·
private-partner singular `kind` · persisted private-partner `ARCHIVED` · `UserStatus = ACTIVE` only ·
`IDX-36 onHandMilli ASC` · unconditional `signedQuantityMilli != 0` · `C-13` strictly positive ·
`QUERY IDS = 91` · `INVARIANTS = 25` · `CODEX FOUNDATION = NOT STARTED` ·
`NEXT_ACTION = CODEX_FIREBASE_FOUNDATION`.

Every surviving occurrence is one of two kinds, and neither is a stale current truth: text that **names the
old value in order to forbid it** (e.g. `DB_07` §5's _"`ARCHIVED` is never persisted as a private-partner
status"_), or a block **explicitly labelled** `HISTORICAL` / `SUPERSEDED` / `[A2-ERA]` — for instance
`DB_11` §K's A2-era metrics (`INVARIANTS 25`, `QUERIES 78`, `INDEXES 43`), which A3R-P had already labelled
and which `DB_11` §M supersedes.

### 2.4 Evidence boundary preserved

The C1 bootstrap runs (`seed:bootstrap` / `replay:bootstrap`, `T-SEED-01a-BOOTSTRAP` /
`T-SEED-01b-BOOTSTRAP`) remain **fixture / schema / arithmetic / reproducibility** evidence only, now stated
in `DB_08` §6.5, `OWNERSHIP_MAP` §4 and `INTEGRATION_STATUS` §1. They are **not** command, RBAC,
Security-Rules, transaction, audit, notification, concurrency or idempotency evidence, and this pass did not
upgrade them. Canonical `T-SEED-01a` / `T-SEED-01b` stay command-driven and outstanding.

## 3. Frozen counts and current state after propagation

```text
CODEX_FOUNDATION = COMPLETE          C1_FOUNDATION_COMPLETE = YES
A3R_P2_PROPAGATION = COMPLETE

ACTIVE_QUERY_IDS = 92   ACTIVE_INDEX_IDS = 67   ACTIVE_COMMAND_IDS = 38
ACTIVE_INVARIANT_IDS = 26   ACTIVE_DERIVED_CONTRACT_IDS = 14

FOUNDATION_READY_FOR_CLAUDE_CODE  = YES
CODEX_C2_FOUNDATION_PREREQUISITES = SATISFIED
FRONTEND_FOUNDATION_PREREQUISITES = SATISFIED
NEXT_ACTION = PREPARE_PARALLEL_IMPLEMENTATION_LANES
```

The prerequisite verdicts certify the **shared foundation** only. The future C2 and frontend implementation
_plans_ were not reviewed or approved by this documentation pass.

## 4. Start-baseline comparison and protected-scope confirmation

`A3R_P2_START_BASELINE` was captured **before** the first edit. The repository is **not** a Git working tree
(no `.git` directory), so `git status --short`, `git diff --name-only` and `git diff --cached --name-only`
were unavailable — recorded as `NOT_A_GIT_REPOSITORY` — and the baseline was taken instead as an MD5
content snapshot of every file under `packages/`, `scripts/`, `functions/`, `tests/` (103 files, excluding
`node_modules/`) plus `firestore.indexes.json`, `firebase.json`, `package.json` and `package-lock.json`,
with a parallel snapshot of every `.md` under `docs/` and the repository root. `src/` does not exist.

```text
A3R_P2_PRODUCTION_OR_C1_CODE_PATHS_CHANGED = 0    (103 / 103 protected files byte-identical)
A3R_P2_UNEXPECTED_CHANGED_PATHS            = 0
PREEXISTING_C1_CHANGES_PRESERVED           = YES  (nothing reverted, reformatted, staged or overwritten)
```

**Modified by A3R-P2 (16):** `DB_00`, `DB_02`, `DB_04`, `DB_05`, `DB_06`, `DB_07`, `DB_08`, `DB_09`, `DB_10`
under `docs/database-final/`; `DOMAIN_TYPES.md`, `COMMAND_CONTRACTS.md`, `FRONTEND_BACKEND_CONTRACT.md`,
`IMPLEMENTATION_CHECKPOINT.md`, `INTEGRATION_STATUS.md`, `OWNERSHIP_MAP.md` under `docs/implementation/`;
and the handoff `STOCKMOK_DATABASE_HANDOFF_NEXT_CHAT.md` at the repository root.

**Created by A3R-P2 (1):** this file, `docs/implementation-evidence/A3R_P2_PROPAGATION_REPORT.md`.

**Not modified:** `DB_01`, `DB_03`, `DB_11`, `FIREBASE_PATH_CONTRACT.md`, and — deliberately —
`C1_COMPLETION_REPORT.md` and `C1_AUTHORITY_DISCREPANCIES.md`, which are retained as historical evidence of
what C1 found before propagation. `DB_11` was inspected: its current §M inventory, its status-enum rows
(`ACTIVE`/`DEACTIVATED`, `PENDING`/`ACTIVE`/`REJECTED`/`DISABLED`, `VERIFIED`/`DISABLED`) and its Cooking
Oil zero-opening statement already agree with the final representation, so it required no edit.

**Housekeeping disclosure.** A zero-byte write-permission probe was created at `docs/.a3rp2_write_test`
before editing and could not be deleted from this environment (`rm` is not permitted over the bridge). It
was moved to `docs/implementation-evidence/_to_delete/a3rp2_write_test_DELETE_ME`; that folder can be
deleted. It contains no content and is not part of the propagation.

## 5. Result

```text
A3R_P2_PROPAGATION = COMPLETE
C1_AUTH_DISCREPANCIES = 7            C1_AUTH_DISCREPANCIES_PROPAGATED = 7
OWNER_APPROVED_SEMANTIC_EXCEPTION_PROPAGATED = YES   (C1-AUTH-007)
NEW_ARCHITECTURE_DECISIONS_INTRODUCED = NO
UNRESOLVED_CONFLICTS = 0

BUSINESS_SCOPE_CHANGED = NO    PATH_MODEL_CHANGED = NO    RBAC_CHANGED = NO
STATE_MACHINE_SEMANTICS_CHANGED = NO   CANONICAL_SEED_FIGURES_CHANGED = NO
DESIGNS_MODIFIED = NO          PRODUCTION_CODE_CHANGED = NO
FIRESTORE_RULES_WRITTEN = NO   COMMAND_BODIES_WRITTEN = NO   FRONTEND_WRITTEN = NO
```
