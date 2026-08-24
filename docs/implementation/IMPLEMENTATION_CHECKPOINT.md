# IMPLEMENTATION_CHECKPOINT

**Checkpoint: `CODEX_C1_FOUNDATION_COMPLETE_A3R_P2`** · 2026-08-17.
*(Preceding checkpoint: `DATABASE_ARCHITECTURE_FROZEN_A3R_P` — retained below as the record of what the
architecture passes froze.)*

```
DATABASE_ARCHITECTURE_FROZEN  = YES
DATABASE_IMPLEMENTATION_READY = YES
A3R_P_PROPAGATION_CLOSURE     = COMPLETE
CODEX_FOUNDATION              = COMPLETE
C1_FOUNDATION_COMPLETE        = YES
A3R_P2_PROPAGATION            = COMPLETE
FOUNDATION_READY_FOR_CLAUDE_CODE = YES
A3R_P2_PRODUCTION_CODE_CHANGED = NO      (A3R-P2 edited documentation only)
NEXT_ACTION                   = PREPARE_PARALLEL_IMPLEMENTATION_LANES
```

## 1. What is frozen

| Artifact | State |
|---|---|
| Business control pack | `Stockmok_Final_Control_Pack_v4/01–17` — FROZEN |
| Design | `STOCKMOK_DESIGN_FREEZE_v1.0`, Gate 14 APPROVED — FROZEN |
| Design artifact manifest | **Re-issued 2026-08-17 from measured bytes** — canonical set unambiguous **by hash** |
| Database pack | `DB_00 … DB_11` with A1 · A2 · **A3** · **A3R** · **A3R-P** · **A3R-P2** — FROZEN |
| Implementation contracts | `docs/implementation/` — 7 files — FROZEN at A3R-P, propagated at **A3R-P2** |
| Foundation code | **PRESENT — Codex C1 Firebase Foundation, COMPLETE.** Workspace config, `packages/shared` contracts / schemas / converters / paths / transition data, generated `firestore.indexes.json` (67, matrix 32), emulator + bootstrap tooling, DB-08 factories and foundation tests, Node-22 CI. Evidence: `docs/implementation-evidence/C1_COMPLETION_REPORT.md` |
| Security Rules · command bodies · frontend | **NOT STARTED** — `FIRESTORE_RULES_WRITTEN = NO`, `COMMAND_BODIES_WRITTEN = NO`, `FRONTEND_WRITTEN = NO`, `PRODUCTION_DATA_WRITTEN = NO` |

## 2. Verification performed at this checkpoint

| Check | Method | Result |
|---|---|---|
| Design artifact identity | SHA-256 recomputed over all 20 `.dc.html` files | **8 of 10 prior canonical hashes were wrong; Gates 6/7/9 classification inverted.** Corrected. |
| Gate-14 corrections present in the canonical set | String tests for Print, "Purchasing Manager", two-part shipment, "Issued to kitchen" | All six pass on the `… new` files; all six fail on the rivals |
| Seed arithmetic | Recomputed independently from unit costs | t₀ `LKR 564,200.00`; `+102.000 KG × 1,250 = 127,500`; post-chain `691,700.00` ✔ |
| Warehouse split | Recomputed from category membership | Cold Room `398,900.00` + Main Store `292,800.00` = `691,700.00` ✔; share `57.7%` ✔ |
| Movement count | Read from the canonical board's own copy | *"twelve opening balances on 1 August, five later movements"* → **12 at t₀, 17 post-chain** ✔ |
| Connected flow | Traced end to end | `SUBMITTED → ACCEPTED → SHIPPED (10 PACK, once) → 8 PACK = 40 KG (70→110) → PARTIALLY_RECEIVED → 2 PACK = 10 KG (110→120) → RECEIVED` ✔ |
| Query id integrity | Every id referenced in DB-02/03/04/05/06/08/11 resolved | `Q-079` was undefined; now defined. **0 undefined.** |
| Index consumers | Every `IDX-` cross-referenced against a query | 4 orphans; 2 deleted, 2 given consumers. **0 orphans.** |
| Independent review 1 | Frontend ↔ database, by a non-author | 44 findings, **all accepted, all resolved** |
| Independent review 2 | **Adversarial review of A3 itself**, by a second non-author | 18 findings. 17 accepted and patched, 1 refuted on the canonical bytes. 12 were "the change record was written, the normative table was not" — which is why this pass edited tables, not annotations. |
| Firestore index matching | Every status-filtered product-list shape re-derived against the equality-prefix rule | `IDX-44` alone served **1 of 5**; the four-filter combination had **none**. Matrix of 32 declared. |
| Aggregation indexes | Every `count()`/`sum()` checked for a composite containing filter **and** aggregated field | 2 missing; added. |
| Rounding | `Σ(round)` vs `round(Σ)` traced through transfer | Divergence found; `INV-27` fixes one rounding point at the balance grain. |
| **C1 implementation-discovery propagation (`A3R-P2`)** | **Seven rulings accepted during executable C1 (`C1-AUTH-001 … 007`) propagated into the current normative text, then every count re-derived from the normative tables again** | Six were propagation corrections where `DB_02` was already right and a derived document had drifted: `MovementType` (generic `ADJUSTMENT`), `ConnectionStatus` (`DECLINED`), `MappingStatus` (`DRAFT`/`INVALID`), private-partner `kind`/`ARCHIVED`, `UserStatus` (`ACTIVE` only), and `IDX-36 onHandMilli ASC` (superseded by the later `DB-CR-038` matrix rule → **`DESC`**). One — **`C1-AUTH-007`** — is an **owner-approved semantic exception**: `OPENING_BALANCE` permits `signedQuantityMilli >= 0`, every other movement type requires non-zero, and `C-13` accepts `quantityMilli >= 0`. **Counts unchanged: 92 · 67 · 38 · 26 · 14.** `STALE_CURRENT_ASSERTIONS = 0`. `DB_00` §8.12. |
| **Propagation closure (`A3R-P`)** | **Every current-state count re-derived from the normative tables — DB-04 §1–§8, DB-06 §1, DB-07 §11/§12 — then swept across `DB_00…DB_11` and `docs/implementation/`** | Nine defects (`P-01 … P-09`). Invariants **25 → 26** (`INV-27` was never counted). Derived contracts heading **DV-13 → DV-14**. Queries **91 → 92** (`Q-085g` was undefined; now `Q-080`). `SCREEN-049`/`CHART-003` corrected to **INCLUDED** in `DB_03`'s normative rows. `DB_11`'s A2-era inventory labelled historical and superseded by a new §M. **`STALE_CURRENT_ASSERTIONS = 0`.** |

## 2a. The counts every agent asserts against — A3R-P, mechanically derived

```
ACTIVE_QUERY_IDS             = 92    DB-04 §1-§6 and §8
ACTIVE_INDEX_IDS             = 67    DB-04 §7   IDX-01…IDX-69 less deleted IDX-03, IDX-19
ACTIVE_COMMAND_IDS           = 38    DB-06 §1   Release A/B callables (C-32 Release C, excluded)
ACTIVE_INVARIANT_IDS         = 26    DB-07 §11  INV-01…INV-24, INV-26, INV-27 (INV-25 withdrawn)
ACTIVE_DERIVED_CONTRACT_IDS  = 14    DB-07 §12  DV-01 … DV-14
```

A different number for any line above means the implementation is wrong or the contract needs an
amendment. It is never resolved silently.

## 3. Resume instructions for the next agent

**Read, in this order:** `DB_00` **§8 (A3) → §8.10 (A3R) → §8.11 (A3R-P)** → `docs/implementation/`
(all 7) → `DB_02` → `DB_04` → `DB_06` → `DB_09`. `DB_10` is the verdict and the honest caveats.
`DB_11` §L records why the previous gate failed and **§M is its current inventory**.
**Do not read the v2 or v3 control packs.**

Then read `DB_00` **§8.12 (A3R-P2)** and `docs/implementation-evidence/` (both C1 files).

**`OWNERSHIP_MAP` §4 step 1 — `CODEX_FIREBASE_FOUNDATION` — is COMPLETE** (Codex C1): config, emulators,
`firestore.indexes.json` **generated** to the 67-index set with the 32-index product-list matrix derived
from the `DB-CR-038` rule rather than transcribed, shared types, Zod schemas, converters, typed path
builders with zone 4 in a server-only module, `deriveStockStatus` / `deriveShortfall` /
`deriveStockValueMinor` at **both** grains, transition tables as data, the **bootstrap** seed at
**12 movements**, and the test harness. Codex wrote no Security Rules and no command bodies.

**Next: `NEXT_ACTION = PREPARE_PARALLEL_IMPLEMENTATION_LANES`.**

```text
LANE_A = CODEX_C2_READ_QUERY_LAYER
LANE_B = CLAUDE_CODE_SECURITY_RULES_AND_BACKEND_SEQUENCE
LANE_C = ANTIGRAVITY_FRONTEND_IMPLEMENTATION
```

Two contract points the lanes must read in their **amended** form: `C-13`'s `quantityMilli >= 0`
(`DB_06` §3.1 — do not apply a shared non-zero validator to it) and `IDX-36 … onHandMilli DESC`
(`DB_04` §7). The C1 **bootstrap** seed/tests are fixture, schema, arithmetic and reproducibility evidence
only — the canonical `T-SEED-01a` / `T-SEED-01b` stay reserved for the command-driven run (`DB_08` §6.5).

## 4. The four traps this checkpoint exists to prevent

1. **Do not select a design artifact by filename.** The canonical Gate 6, 7 and 9 files are the ones whose
   names contain the word `new`. The prior manifest instructed the opposite, and following it would have
   promoted a pre-patch board carrying "Issued to kitchen", a two-part shipment and "Purchasing Manager".
   Select by SHA-256.
2. **Do not seed 17 movements.** The seed is **12**. 17 is the post-chain count. A seed of 17 cannot
   reconcile to `LKR 564,200.00`, `MEAT-001 = 18.000 KG` or `4 low`, and `T-SEED-01a` will fail.
3. **Do not build the PO report's status chart from page 1.** `CHART-003` needs `count()` aggregations
   over the whole filtered set. A distribution computed from 25 rows is a sample wearing a chart's clothes.
4. **Do not denormalise a field from a document written by a different writer than its host.** That is the
   defect DB-CR-016 repaired, DB-CR-017 then reintroduced as `warehouseName`, and DB-CR-027 removed. If a
   field you are about to add fails that test, stop and report.

## 4a. Two rules that cost this project two failed reviews

**Edit the normative table, not just the change log.** Both failed reviews found the same shape: a
correctly-reasoned change record sitting beside an unedited table that still said the opposite. An
implementer reads the table.

**Run the gate in the direction the author cannot see, by someone who authored nothing in it.** Applied
twice now; it found 44 defects the first time and 18 the second, including four that were live
production failures rather than bookkeeping.

## 5. Gate

**Owner decisions outstanding — the list first, the count derived from it.** All four are design-side and
none blocks Codex. The numbering is `DB_00` §8.9's, and every file that cites them uses it:

1. **Physical custody of the design files** — the manifest is corrected but nothing was renamed or moved;
   select the canonical Gate 6/7/9 artifacts by **SHA-256**, never by filename.
2. **`@fresh-foods` vs `@freshfoods`** — Gate 8 vs Gate 9. A seed literal. The database takes
   `@freshfoods`.
3. **Two stale Gate 6 mobile frames** (`Cold Room 80.000 / Main Store 40.000`, and a `116.000 KG` total),
   plus `22` §2's five non-canonical *Additional products*. Canonical is **120.000 KG, all in Cold Room**.
4. **The Gate 6 board's *"exactly two reports"* copy** contradicts `02` `FR-DASH-005` (`A-MUST`). Rank 1
   wins and the report is built (`A3R-09`); the board copy should be corrected so design and requirement
   agree.

**⇒ `OWNER_DESIGN_SIDE_ITEMS = 4`.** *(This file previously said 3 while `DB_10`, `INTEGRATION_STATUS` and
the handoff said 4 — reconciled at `A3R-P` · P-08.)*

```
A3R_P_PROPAGATION_CLOSURE     = COMPLETE
A3R_P2_PROPAGATION            = COMPLETE
C1_AUTH_DISCREPANCIES         = 7     PROPAGATED = 7 / 7
DB_00_TO_DB_11_SYNCHRONIZED   = YES
IMPLEMENTATION_CONTRACTS_SYNCHRONIZED = YES
STALE_CURRENT_ASSERTIONS      = 0
UNDEFINED_QUERY_IDS           = 0     UNDEFINED_INDEX_IDS     = 0
UNDEFINED_COMMAND_IDS         = 0     UNDEFINED_INVARIANT_IDS = 0
UNDEFINED_DV_IDS              = 0

ZERO_OPENING_BALANCE_RULE     = PROPAGATED    IDX_36_DIRECTION = DESC
C13_SYNCHRONIZED              = YES

DATABASE_ARCHITECTURE_FROZEN  = YES
DATABASE_IMPLEMENTATION_READY = YES
CODEX_FOUNDATION              = COMPLETE      C1_FOUNDATION_COMPLETE = YES
FOUNDATION_READY_FOR_CLAUDE_CODE  = YES
CODEX_C2_FOUNDATION_PREREQUISITES = SATISFIED
FRONTEND_FOUNDATION_PREREQUISITES = SATISFIED
BLOCKING_DEFECTS              = 0
UNRESOLVED_OWNER_DECISIONS    = 0 (database) · 4 (design-side, non-blocking)
A3R_P2_PRODUCTION_CODE_CHANGED = NO
NEXT_ACTION                   = PREPARE_PARALLEL_IMPLEMENTATION_LANES
```

## 6. Post-checkpoint owner amendment — DB-CR-040

On 2026-08-24 the owner resolved DV-12 as `LIFETIME_PLACED_ORDERS`. A successfully submitted connected
order contributes once; cancellation and every other later lifecycle transition contribute zero. The
verified rebuild marker is retained `submittedAt`, absent from an unsubmitted connected DRAFT and written
atomically by `cpo.submit`. This forward amendment changes documentation only and preserves the frozen
backend behavior and all governed totals: `92 · 67 · 38 · 26 · 14`.
