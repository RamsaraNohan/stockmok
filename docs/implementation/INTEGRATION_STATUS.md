# INTEGRATION_STATUS

Live status of the contracts between Antigravity, Codex and Claude Code.
**Updated 2026-08-24 at `DB-CR-040` (`DB_00` §8.13), the owner-approved DV-12 lifetime
placed-order reconciliation. The governed counts remain unchanged from `A3R-P2`.**

## 1. Phase status

```
BUSINESS ARCHITECTURE     COMPLETE   Stockmok_Final_Control_Pack_v4 (01–17)
DESIGN                    COMPLETE   STOCKMOK_DESIGN_FREEZE_v1.0, Gate 14 APPROVED 2026-08-15
DATABASE ARCHITECTURE     COMPLETE   DB_00 … DB_11, through owner amendment DB-CR-040
DATABASE_ARCHITECTURE_FROZEN  YES      A3R_P_PROPAGATION_CLOSURE = COMPLETE
IMPLEMENTATION CONTRACTS  COMPLETE   docs/implementation/ (7 files), DV-12 synchronized at DB-CR-040
CODEX FOUNDATION          COMPLETE    Codex C1 Firebase Foundation.  C1_FOUNDATION_COMPLETE = YES
                                      67 indexes generated (matrix 32, IDX-36 onHandMilli DESC),
                                      shared types/schemas/converters/paths, transition data,
                                      emulator + bootstrap tooling, foundation tests, Node-22 CI.
                                      Evidence: docs/implementation-evidence/C1_COMPLETION_REPORT.md
A3R_P2_PROPAGATION        COMPLETE    C1-AUTH-001 … C1-AUTH-007 propagated (DB_00 §8.12)
DV12_OWNER_RECONCILIATION COMPLETE    LIFETIME_PLACED_ORDERS; submittedAt rebuild marker (DB_00 §8.13)
FIRESTORE RULES           NOT STARTED
CLOUD FUNCTIONS           NOT STARTED   (CALLABLE_EXPORTS = 0; functions scaffold only)
FRONTEND                  NOT STARTED
PRODUCTION_DATA_WRITTEN   NO
A3R_P2_PRODUCTION_CODE_CHANGED  NO    this propagation pass edited documentation only; the C1
                                      implementation files were left exactly as C1 wrote them
FOUNDATION_READY_FOR_CLAUDE_CODE  YES
NEXT_ACTION               PREPARE_PARALLEL_IMPLEMENTATION_LANES
                          LANE_A = CODEX_C2_READ_QUERY_LAYER
                          LANE_B = CLAUDE_CODE_SECURITY_RULES_AND_BACKEND_SEQUENCE
                          LANE_C = ANTIGRAVITY_FRONTEND_IMPLEMENTATION
```

**Seed evidence boundary.** The C1 bootstrap runs (`seed:bootstrap` / `replay:bootstrap`,
`T-SEED-01a-BOOTSTRAP` / `T-SEED-01b-BOOTSTRAP`) are **fixture / schema / arithmetic / reproducibility**
evidence. Canonical `T-SEED-01a` / `T-SEED-01b` are **command-driven** and remain outstanding until the
command layer exists (`DB_08` §6.5).

## 2. Frozen counts — the numbers every agent asserts against

```
ROLES                     7      OWNER · ADMIN · INVENTORY_MANAGER · PROCUREMENT_MANAGER
                                 STOREKEEPER · ANALYST · VIEWER
PATH FAMILIES             4 zones, registry frozen in FIREBASE_PATH_CONTRACT §1
COMPOSITE INDEXES         67     IDX-01…IDX-69 less the deleted IDX-03, IDX-19
                                 (incl. the 32-index product-list matrix, DB-CR-038)
QUERY IDS                 92     A3R-P: 91 + Q-080, the C-38 archive guard that A3R-11 created
                                 in DB-06 and cited as the undefined id Q-085g
COMMANDS                  38     Release A/B callables (C-32 = declared-inert Release C, excluded)
                                 C-01…C-31, C-33, C-34, C-35a, C-35b, C-36, C-37, C-38
IDEMPOTENT COMMANDS       17
DERIVED CONTRACTS         14     DV-01 … DV-14
INVARIANTS                26     INV-01…INV-24 (24) − INV-25 (withdrawn at A3 · DB-CR-027)
                                 + INV-26 + INV-27  =  26.   A3R-P recount: the figure read 25,
                                 which was correct at A3 and stopped being correct the moment
                                 A3R-05 added INV-27.  INV-25's number is a preserved tombstone.
REALTIME LISTENERS        4
SAFE_DIRECT_CLIENT_WRITE  6 surfaces
SEED t₀                   12 products · 12 movements · 4 low · 1 out · LKR 564,200.00
SEED post-chain           12 products · 17 movements · 3 low · 1 out · LKR 691,700.00
                          Cold Room LKR 398,900.00 + Main Store LKR 292,800.00
```

**If an implementation produces a different number for any line above, the implementation is wrong or the
contract needs an amendment. It is never resolved silently.**

## 3. Amendment history

| Amendment | Date | Trigger | Outcome |
|---|---|---|---|
| **A1** | 2026-08-15 | Inter-warehouse transfer confirmed real from the Gate 6 board | `stock.transfer`, `INV-22`/`INV-23`, no new path |
| **A2** | 2026-08-17 | External independent review, 6 findings | DB-CR-015…DB-CR-023; 3 HIGH accepted, IR-06 rejected on bytes; 9 further defects found while verifying (`VR-01`…`VR-09`) |
| **A3** | 2026-08-17 | **Independent frontend ↔ database consistency review, 44 findings, verdict FAIL** | DB-CR-024…DB-CR-037. All 44 accepted, all resolved from authority. DB-CR-018 reversed. `INV-25` withdrawn. Design artifact manifest re-issued from measured bytes. |
| **A3R** | 2026-08-17 | **Adversarial review of A3 itself, 18 findings, verdict FAIL** | DB-CR-038, DB-CR-039, `C-38`, `INV-27`, `DV-14`. 17 accepted and patched; 1 rejected on the canonical bytes. 12 were propagation failures — the change record was written, the normative table was not. 4 were real engineering defects: the index matrix, the aggregation index, dual rounding, and an unenforceable archive guard. **SCREEN-049 reinstated** — A3 had struck an `A-MUST` requirement using a rank-7 authority. |
| **A3R-P2** | 2026-08-17 | **C1 implementation-discovery propagation** (`DB_00` §8.12). Not an architecture pass: no decision reopened, no feature added or removed, no count changed, no code touched. | Seven rulings accepted during executable Codex C1 made current in the normative text. Six propagation corrections — `MovementType` (generic `ADJUSTMENT` is not a storage value), `ConnectionStatus` (`REJECTED`, not `DECLINED`), `MappingStatus` (`VERIFIED`/`DISABLED` only), private partners (bounded `partnerTypes` + `PartnerStatus`; UI archive → `DEACTIVATED`, restore → `ACTIVE`; `ARCHIVED` never persisted), `UserStatus = ACTIVE \| DISABLED`, and **`IDX-36 … onHandMilli DESC`** (the later `DB-CR-038` matrix rule controls; no index added, deleted or renumbered). One **owner-approved semantic exception**, `C1-AUTH-007`: `OPENING_BALANCE` permits `signedQuantityMilli >= 0`, every other type requires non-zero, `C-13` accepts `quantityMilli >= 0`, and the canonical Cooking Oil zero opening balance is a recorded fact. Counts re-derived and **unchanged**: 92 · 67 · 38 · 26 · 14. `STALE_CURRENT_ASSERTIONS = 0`. |
| **A3R-P** | 2026-08-17 | **Propagation closure of A3R into the normative files** (`DB_00` §8.11). Not an architecture pass: no decision reopened, no schema semantics changed, no feature added or removed. | Nine defects `P-01 … P-09`. A3R fixed the counts it *inherited* and did not re-count after its *own* additions: invariants **25 → 26** (`INV-27` uncounted), derived-contract heading **DV-13 → DV-14**, queries **91 → 92** (`Q-085g` undefined → defined as **`Q-080`**, the `C-38` guard — `A3 · F-H-01` one pass later). `DB_03`'s normative rows corrected to **SCREEN-049 / CHART-003 = INCLUDED**; ledger search to `Q-015r`, PO search to `Q-084a`/`Q-084b`. `DB_11`'s A2-era inventory labelled historical, superseded by a new **§M**. Owner-item count reconciled to **4**. `STALE_CURRENT_ASSERTIONS = 0`. |
| **DB-CR-040** | 2026-08-24 | Owner decision after bounded QA review found DV-12 rebuild/maintenance contradiction | `ordersPlacedCount = LIFETIME_PLACED_ORDERS`; `cpo.submit +1`, later transitions `+0`; rebuild counts canonical connected orders with retained `submittedAt`. Backend and governed ID totals unchanged. |

## 4. Open items

### Blocking implementation
**None.**

### Owner action, design-side, non-blocking — **four items, numbered as in `DB_00` §8.9**

1. **Physical custody of the design files.** The manifest is corrected but no file was renamed or moved.
   The canonical Gate 6/7/9 artifacts are the ones named `… new.dc.html`; their pre-patch rivals sit
   beside them. Select by **SHA-256**, never by filename.
2. **`@fresh-foods` vs `@freshfoods`.** Gate 8's lookup board draws the former; the patched Gate 9 and the
   owner brief use the latter. The database takes `@freshfoods`. Seed literal, not behaviour.
3. **Two stale Gate 6 mobile frames** (`Cold Room 80.000 / Main Store 40.000`, and a `116.000 KG` total)
   contradict the same file's desktop detail, archive dialog and Cold Room valuation. Canonical is
   **120.000 KG, all in Cold Room**. Also: `22` §2's five non-canonical *Additional products*.
4. **The Gate 6 board's *"exactly two reports"* copy** contradicts `02` `FR-DASH-005` (`A-MUST`,
   Purchase-Order report). Precedence resolves it — rank 1 wins, the report is built (`A3R-09`) — but the
   board copy should be corrected so the design and the requirement agree.

**⇒ `OWNER_DESIGN_SIDE_ITEMS = 4`**, derived from the list above, identical in `DB_00` §8.9, `DB_10` §7,
`IMPLEMENTATION_CHECKPOINT` §5 and the handoff. *(Reconciled at `A3R-P` · P-08, where `DB_00` §8.9 and the
checkpoint said 3 and this file, `DB_10` and the handoff said 4. Item 3 and item 4 were also in opposite
order here; the `DB_00` §8.9 numbering is now the single source.)*

### Owner action, deployment, non-blocking for development
5. **Blaze billing** (`ADM-009`). Production Functions cannot deploy on Spark. The emulator path is
   unaffected, so every step of §4 in `OWNERSHIP_MAP` proceeds without it.
6. Functions region · 7. Authorized Auth domains · 8. ACR-003 (renderer assets only).

### Measurement obligation
9. **Measure the dashboard and product-list read counts at Stage 17.** The `NFR-017` budget of 27 is an
   obligation to verify, not a proven claim — `DB_04` §6 says so and A3 does not upgrade it.

## 5. Contract change protocol

1. Raise it against `DB_00` as a numbered change record.
2. Owner approves.
3. Update **every** affected file in one change: `DB_01…DB_11`, then `docs/implementation/`.
4. Update the counts in §2 of this file.
5. Re-run the id-integrity test, which parses `DB-02, DB-03, DB-04, DB-05, DB-06, DB-08, DB-11`.
6. **Re-derive every count in §2 from the normative tables *after* your own edits — including the counts
   the previous pass just corrected.**

Step 5 exists because a narrower version of that test passed while `Q-079` was referenced and undefined,
and the pack reported `QUERY_COVERAGE = 100%` on the strength of it.

Step 6 exists because `A3R` corrected three counts it inherited and then left two of its own additions
uncounted — `INV-27` and the `C-38` guard query. The now-SUPERSEDED figures the pack carried were
**25** and **91**; the mechanically derived current values are **26** and **92** (§2). Fixing an inherited
count is not the same as re-deriving the count.
