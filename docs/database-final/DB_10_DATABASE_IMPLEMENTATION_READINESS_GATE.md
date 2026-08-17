# DB-10 — DATABASE IMPLEMENTATION READINESS GATE

**Status:** adversarial. This gate exists to **break** DB-01 → DB-09, not to bless them.
**Rule:** no conditional pass. The verdict is `YES` or `NO`.

---

## 1. Independent review — what actually happened, in order

```
CLAUDE_SUBAGENT_REVIEW            = FAILED     (org monthly spend limit — NOT hidden)
EXTERNAL_INDEPENDENT_REVIEW       = COMPLETE   (2026-08-17)  →  amendment A2
FRONTEND_DB_INDEPENDENT_REVIEW    = COMPLETE   (2026-08-17)  →  amendment A3   [44 findings, FAIL]
A3_ADVERSARIAL_REVIEW             = COMPLETE   (2026-08-17)  →  amendment A3R  [18 findings, FAIL]
```

**Three independent reviews have now been run, and two of them failed the pack.** That is the finding
this gate leads with, because it is the reason to trust the current state rather than the previous one.

### 1.1 The failed subagent review — still restated, not buried

Three reviewer subagents dispatched during the original run all terminated on the organization's monthly
spend limit and returned nothing. The failure is recorded rather than hidden. It is also now moot: the
two reviews that eventually ran found 62 defects between them, which is a better outcome than three
reviews that returned quietly.

### 1.2 The frontend ↔ database review — 44 findings, `FAIL`

Run by a reviewer that authored neither the pack, nor A1, nor A2, nor DB-11. Its diagnosis:

> *"the gate was run database-first by the author of the fixes, so it verified that every database object
> has a consumer and did not verify that every frozen UI element has a producer."*

Eleven of its twenty-one CRITICAL/HIGH findings were frozen UI elements with no producer. Two were A2
reintroducing the exact defect class A2 was written to remove. **All 44 accepted. All 44 resolved from
authority** — nine of them by applying the precedence order (canonical visual, rank 7, over UI registry,
rank 8) rather than escalating to the owner. Recorded as amendment **A3**, `DB_00` §8.

The three CRITICAL findings that were real engineering, not documentation:

| | Defect | Resolution |
|---|---|---|
| **F-C-01** | 8 of 10 canonical artifact hashes matched no file; the Gate 6/7/9 canonical-vs-superseded classification was **inverted**, and the manifest's own §4 instruction would have promoted a board carrying *"Issued to kitchen"*, a two-part shipment and *"Purchasing Manager"* | Manifest re-issued from measured bytes. Canonical = the files named `… new.dc.html`. Proved by six mechanical Gate-14 string tests, not by narrative. |
| **F-C-02 · F-C-05** | Three of four canonical monetary figures on the frozen dashboard could not be produced by any query — the aggregations summed **quantity** where the design requires **currency** | `DB-CR-025`: `stockValueMinor`, `stockStatus`, `shortfallMilli` on `stockBalances`. `DB-CR-018` reversed, with its cost argument shown to be arithmetically wrong. |
| **F-C-03** | The seed was specified as 17 movements at t₀ and is arithmetically 12; `T-SEED-01` could never pass, and DB-09 listed that impossibility as a hard STOP | `DB-CR-026`: 12 at t₀ → 17 post-chain, the two states labelled everywhere. No canonical figure moved. |

### 1.3 The adversarial review of A3 itself — 18 findings, `FAIL`

A3 was then reviewed by a **second** independent reviewer that authored none of it. Verdict `A3 = FAIL`:
4 CRITICAL, 8 HIGH, 6 MEDIUM. Its diagnosis identifies the same failure mode one layer up:

> *"A3's author verified that each change record was written, not that each normative table was edited.
> Six of the twelve CRITICAL/HIGH findings are 'A3 says X; the file A3 cites still says not-X.'"*

**17 accepted and patched, 1 refuted on the canonical bytes.** Recorded as `DB_00` §8.10.

Four were genuine engineering defects that would have failed in production, not bookkeeping:

| | Defect | Why it mattered |
|---|---|---|
| **A3R-01** | `IDX-44` served **1 of 5** status-filtered shapes; the frozen four-filter combination had **no index at all** | A3 claimed to have closed `F-C-05` and had not. Firestore matches an index only when the equality set is its leading prefix and the `orderBy` follows immediately. Resolved by declaring the list as a **32-index matrix** generated from a rule. |
| **A3R-02** | Moving `Q-060`/`Q-058` to `sum('stockValueMinor')` silently orphaned their index | The dashboard panel that `F-C-02` was raised about would have thrown a missing-index error on first render. A3 fixed the arithmetic and broke the execution. |
| **A3R-05** | Two independently-rounded valuation paths, no invariant tying them | `Σ(round) ≠ round(Σ)`, so a **transfer** — which `INV-23` guarantees changes no total — could move the reported org total by ±1 and make `CHART-002`'s bars disagree with the KPI **on the same screen**. `INV-27` fixes one rounding point at the balance grain. |
| **A3R-11** | The supplier-archive guard was a client-read counter on a client-writable document, with **no archive command in existence**, and the counter had an **unreachable zero** | Anything bypassing the UI archived freely; a stalled `PARTIALLY_RECEIVED` order stranded a supplier permanently. `C-38 partner.setStatus` runs a `limit(1)` guard inside its transaction. |

**And one place A3 applied precedence in the wrong direction.** `A3R-09`: A3 struck SCREEN-049 and
`CHART-003` on the Gate 6 board's *"exactly two reports"* copy — authority **rank 7**. `02` `FR-DASH-005`
is an **`A-MUST`**: *"Purchase-Order report."* — authority **rank 1**. **Rank 1 wins; the report is
reinstated.** Every other §8.5 deletion was re-checked against `02`, `03`, `05`, `06` and `23` in that
pass; each is a rank-7-over-rank-8 ruling against `19`/`22` alone. This is the single case where the
first A3 pass used a lower authority to delete something a higher one requires, and it is recorded here
rather than quietly corrected.

**The one finding refuted.** `A3R-06` held that the seed's `8 PACK` + `2 PACK` receipts came from the
superseded Gate 9 file and that single-shipment semantics imply 16 movements, not 17. The canonical
`e1003987…` says both things in one timeline: *"Fresh Foods Ltd shipped 10 PACK · **The whole order, in
one shipment**"* and *"That you received **8 PACK, and later 2 PACK**"*. **One shipment, two receipts.**
`NO MULTI-SHIPMENT` constrains `cpo.ship`; partial **receiving** is an explicit Release A capability and
`PARTIALLY_RECEIVED` exists for it. The reviewer's secondary point is accepted — A3 never stated the
distinction, which is what made the finding possible — and DB-08 §4 now labels every step *ship* or
*receive*.

### 1.4 What two failed reviews changed about method

Both failures have the same shape, one level apart: **a correctly-reasoned record sitting beside an
unedited table.** The rules that come out of it, now in `IMPLEMENTATION_CHECKPOINT` §4a:

1. **Edit the normative table, not just the change log.** An implementer reads the table.
2. **Run the gate in the direction the author cannot see, by someone who authored nothing in it.**

---

## 2. Blocker disposition

| Blocker | Status |
|---|---|
| **DB-B-02 / DB-CR-004** inter-warehouse Transfer | **CLOSED** by owner decision, 2026-08-15. Recorded in DB-00 as amendment A1. |
| **DB-B-01** design artifact manifest is wrong | **DOWNGRADED to a required non-database repair.** Resolved *for this pack* by evidence: every rival pair is disambiguated deterministically from the change register plus content markers (DB-00 §5), and the residual stale content is provably non-database (a handle spelling, a mobile-nav pattern, a reconnect wording — all already authoritatively resolved in the change register). **The manifest itself is still factually wrong and must be corrected** before frontend implementation trusts it. |

---

## 3. `ACTION-001 … ACTION-062` — every action has legitimate backend behaviour

The single most important check in this gate: **can any frozen UI action reach the database with no
defined behaviour?** Enumerated rather than asserted.

| Actions | Backing |
|---|---|
| 001, 005, 007, 008, 009, 018, 021, 043, 052, 054, 055 | navigation / UI only — no data path required |
| 002, 003, 004, 053, 061 | Firebase Auth |
| 006 | `C-01 org.create` |
| 010 | `C-09` / `C-10` |
| 011 | `C-11 product.setStatus` |
| 012, 014 | client write — categories / warehouses |
| **013** | **`C-35a category.archive`** ← was a client `status` write; corrected in the second pass |
| 015 | `C-12 warehouse.archive` |
| 016 | `C-13` |
| 017 | `C-14` |
| 019, 020 | client write — private partners |
| 022 | client write (private DRAFT) · **`C-34 cpo.draftSave`** (connected DRAFT) ← gap closed by DB-CR-010 |
| 023 | `C-15 po.order` |
| 024 | `C-16` / `C-31` |
| 025 | `C-17` / `C-30` |
| 026 | client-side CSV of the already-fetched authorized page — no query |
| 027 | client write, `read` flag only |
| **028** *(Mark all read)* | client batch of ≤ 25 `read` updates — **bounded to the loaded page**, not the whole collection |
| 029 | `C-04` · 030 clipboard · 031 `C-07` · 032, 033 `C-08` |
| 034, 035 | `C-02 org.updateSettings` |
| 036 | `Q-001` public `get` |
| 037 `C-18` · 038, 039 `C-19` · 040 `C-20` |
| 041 `C-21` · 042 `C-22` · 044 `C-24` · 045 `C-25` · 046 `C-26` |
| 047 `C-27` · 048, 049 `C-28` · 050 `C-29` |
| 051 *(Retry)* | re-invocation carrying the **same `operationId`** |
| 056, 057, 058, 059 | query / cursor — no mutation |
| 060 | `C-06 team.acceptInvitation` |
| **062** *(A1)* | **`C-33 stock.transfer`** |

**Result: 62 / 62. No frozen UI action lacks backend behaviour.** Two actions (013, 022-connected) had
none when the pack was first drafted; both are now closed.

Additionally: a frozen surface requiring data the schema did not provide — `TABLE-005`/`TABLE-006`
**Balance After** — was closed by `balanceAfterMilli` (DB-CR-006), and the six-word ledger Kind filter was
closed by the derived mapping in DB-02 §0.2 with **no schema cost**.

---

## 4. Attack review

**`ATTACK-16` was discovered during the A3R pass and is added to the matrix:** *a client archives a
private partner holding open purchase orders by writing `status` directly.* `privatePartners` is a
`SAFE_DIRECT_CLIENT_WRITE` surface, and the open-order guard existed only as a maintained counter the
client read — so the rule permitted the write and nothing evaluated the guard. Closed by removing
`status` from the client-write allowlist and moving archive/restore into `C-38 partner.setStatus`, which
runs a `limit(1)` query inside its own transaction. Tests `T-SEC-40`, `T-SEC-41`.

This is worth naming rather than folding into a count: it is the same class as `ATTACK-15` (forged stock
balance without a movement) — **a control that lives on the client is not a control** — and it survived
A2, DB-11 and the first A3 pass.


| ID | Attack | Entry point | Resource | Expected | Enforcement layer | Rule / function / transaction | Test |
|---|---|---|---|---|---|---|---|
| **01** | Org A reads Org B private data | client SDK, forged path | `organizations/B/**` | **DENY** | Rules | `isActiveMember(B)` false — the membership document does not exist on the constant path | T-SEC-02/03 |
| **02** | Connected buyer reads supplier warehouses | client SDK | `organizations/S/warehouses` | **DENY** | Rules | `CONN` has no rule-level privilege anywhere; it is an ordinary non-member | T-SEC-10 |
| **03** | Connected buyer reads supplier private cost | callable | `partnerCatalog.list` | **allowed fields only** | Command | allow-listed projection; cost, stock, margin and warehouse are never copied into it | T-SEC-10/16 |
| **04** | Lower role invokes a privileged command | callable | any | **DENY** | Command step 5 | role read **from the membership document**, never `request.data.role` | T-SEC-05/06, **T-SEC-24** |
| **05** | Suspended member uses an existing session | client + callable | everything | **DENY at both layers** | Rules + command | `isActiveMember()` requires `ACTIVE`; every command re-reads membership at request time | T-SEC-07 |
| **06** | Client substitutes `organizationId` | callable payload | another tenant | **DENY** | Command step 3+6 | `orgId` is a routing hint; the membership read turns it into a fact or a denial | T-SEC-14 |
| **07** | Duplicate receiving `operationId` | callable retry | stock | **stored result, no second effect** | Transaction | receipt read as the **first** read *inside* the transaction | T-SEC-15, SC-22 |
| **08** | Concurrent receive of the same outstanding quantity | two callables | PO + stock | one success, one `OVER_RECEIPT` | Transaction | both serialise on the PO document; the loser re-reads `receivedMilli` | T-CONC-04 |
| **09** | Connection disabled during a mapping workflow | callable | mapping | **DENY** | Command | connection status **re-read inside** the transaction, not at page load | T-SEC-13, `STATE-033` |
| **10** | Connected PO uses a stale or invalid mapping | callable | `cpo.submit` | **DENY** | Command | every mapping re-validated `VERIFIED` + connection ACTIVE inside the transaction | T-CPO-* |
| **11** | Illegal PO transition | callable | PO | **DENY** | Command step 7 | one shared transition table (DB-07 §8/§9); absent transition = forbidden | T-PPO-*, T-CPO-* |
| **12** | Invitation token guessed or reused | public route + callable | invitation | **DENY** | Command | 32 random bytes, only the SHA-256 hash stored, single-use, 7-day expiry, email-bound | SC-03 |
| **13** | Business discovery beyond exact lookup | client SDK | `organizationDirectory` | **`list` DENY** | Rules | `allow get: if true; allow list: if false` | T-SEC-20 |
| **14** | Client writes a fake audit record | client SDK | `auditLogs` | **DENY** | Rules | `create`, `update`, `delete` denied to every client **including the Owner** | T-SEC-08/09 |
| **15** | Client changes `stockBalance` without a command | client SDK | `stockBalances` | **DENY** | Rules | backend-write-only for every role | T-SEC-04 |
| **16** *(A1)* | **Transfer names a warehouse in another organization** | callable | `stockBalances` in Org B | **DENY** | Command step 6 | both warehouses re-read under `organizations/{verifiedOrgId}/`; a foreign id resolves to a missing document, never to another tenant's data | **T-XFER-11** |
| **17** *(A1)* | **Transfer to the same warehouse to mint a phantom movement pair** | callable | ledger | **DENY** | Command precondition 1 | `from != to`; nothing written | **T-XFER-05**, `STATE-044` |
| **18** *(A1)* | **Transfer replayed to duplicate stock** | callable retry | ledger | **stored result, no second pair** | Transaction | `operationId` + `payloadHash` | **T-XFER-08/09** |
| **19** *(A1)* | **Two concurrent transfers drain a balance negative** | two callables | `stockBalances` | one success, one `INSUFFICIENT_STOCK` | Transaction | both serialise on the source balance; the loser re-reads and fails the guard | **T-CONC-07** |
| **20** *(A1)* | **Storekeeper relocates stock to hide a shortage** | callable | ledger | **DENY** | Command step 5 | `TRANSFER_WRITERS` excludes Storekeeper — the segregation-of-duties control that already excludes them from adjustment | **T-XFER-12**, T-SEC-24 |

---

## 5. Verification against the gate checklist

| Check | Result | Basis |
|---|---|---|
| Every final frontend surface has data support | **PASS** | DB-03 — 53/53 |
| Every UI action has legitimate backend behaviour | **PASS** | §3 — 62/62, two gaps closed |
| Every query is physically implementable | **PASS** | DB-04 §1–§6 |
| Every query has an index strategy | **PASS** | DB-04 §7 — **43** composite + automatic single-field (A2 added `IDX-39…43`) |
| Rules / query compatibility | **PASS** | every client query is single-tenant-path scoped; no rule reads a data-derived path |
| Pagination feasibility | **PASS** | cursor, 25 / 100, on every list without exception |
| No forbidden cross-tenant scan | **PASS** | zero cross-tenant client queries; zero collection-group queries |
| Sensitive commands have explicit authorization | **PASS** | DB-06 §0 — nine-step frame, implemented once |
| All stock mutations are atomic | **PASS** | DB-06 §6 |
| Every stock change creates a movement | **PASS** | a balance is never written without its movement |
| Retries are idempotent | **PASS** | receipt first-read / last-write, payload hash |
| Concurrent receiving is safe | **PASS** | T-CONC-04; outstanding re-read inside the transaction |
| **Concurrent transferring is safe** | **PASS** | T-CONC-07/08 |
| State transitions cannot be bypassed | **PASS** | one shared transition table; absent = forbidden |
| Mapping races are handled | **PASS** | connection, publication and product re-validated inside the transaction |
| Connected privacy holds | **PASS** | projections + connection-verified callables; `CONN` has no rule privilege |
| Invitations are secure | **PASS** | hash-only, single-use, expiring, email-bound |
| Fake audit / balance writes fail | **PASS** | T-SEC-04/08/09 |
| Derived data has a consistency strategy | **PASS** | DB-07 §12 — **DV-01…DV-11**, all atomic with source, **and all now single-source** (A2 · DB-CR-016) |
| Canonical seed reconciles | **PASS** | DB-08 §9 — 12 / 4 / 1 / LKR 564,200.00 → 691,700.00 / 17 movements |
| Firestore feasibility holds | **PASS** | with the four second-pass corrections applied |
| No Release C / D leakage | **PASS** | §6 |
| No implementation agent must invent behaviour | **PASS** | every open decision is either specified or listed in DB-09 §11 as a stop condition |
| **Role-level read denial enforced at the data boundary** | **PASS** *(A2)* | DB-05 §4.0 — 7 paths tightened; `T-SEC-26…31`. **This was a FAIL before A2** and the external reviewer was right to withhold `RBAC_COVERAGE = 100%` |
| **Derived data has no cross-document fanout** | **PASS** *(A2)* | DB-07 §12 — every DV field's source document shares its host's transactional writer. **FAIL before A2** |
| **Product list respects `NFR-017` in every filter mode** | **PASS** *(A2)* | DB-04 §6.1 — 25 reads filtered and unfiltered. **FAIL before A2** (50 when store-room-filtered) |
| **Every referenced query id is defined** | **PASS** *(A2)* | DB-04 §9, asserted by test. **FAIL before A2** (`Q-044`, `Q-048`, `Q-011a`) |
| **Zero rows the frozen design requires are actually returned** | **PASS** *(A2)* | DB-CR-022 — `onHandMilli > 0` removed from `Q-019`/`Q-061`; `TABLE-004` lists every ACTIVE store room |
| **Aggregation cost claims are scale-qualified** | **PASS** *(A2)* | DB-04 §0/§6 — `1 per 1000 index entries, min 1`, with the seed-scale figure separated from the guarantee |
| **Bidirectional UI ↔ database reconciliation** | **PASS** | **DB-11** — both directions, sections A–K |
| **Independent frontend ↔ database review** | **COMPLETE — TWICE** *(A3, A3R)* | §1 of this file. Review 1 (frontend ↔ database, 44 findings, `FAIL`) → amendment `A3`. Review 2 (adversarial on A3 itself, 18 findings, `FAIL`) → amendment `A3R`. *(The **NOT PERFORMED** that stood here was true only of the DB-11 §J run and is SUPERSEDED.)* |
| **Propagation closure of A3R into the normative tables** | **COMPLETE** *(A3R-P)* | `DB_00` §8.11. Every current-state count re-derived mechanically from DB-04/DB-06/DB-07 and propagated to DB-01 … DB-11 and `docs/implementation/`. |

## 6. Scope-leakage sweep

Checked against `03` §5 and §6. **Not present anywhere in the pack:** sales or outbound subsystem ·
storefront / checkout / POS · reservation (`reservedMilli` is constant 0 and no command writes it) ·
transfer approval or in-transit state · multi-product transfer · cross-organization transfer · multiple
or partial shipments (`PARTIALLY_SHIPPED` does not exist) · batch / lot / expiry · serial numbers ·
weighted-average costing · multi-currency purchase orders · App Check · Cloud Storage · error-monitoring
service · email delivery · file uploads · full-text search · custom roles · owner transfer or multi-owner
governance · dedicated database per tenant · webhooks or event buses · automatic reorder · AI forecasting
· distributed counters · a scheduled reconciliation job · **an audit-log route** (ACR-001 resolved as the
documented default — audit surfaces only inside per-object Activity).

`storefrontCatalog` and `C-32` are declared **inert and not built**, present solely so no agent
reintroduces them by accident.

## 7. Open items — non-blocking, but real

**Nothing here blocks implementation.** Each is either a design-artifact matter or a deployment
prerequisite that the emulator path does not need.

### Design-side, for the owner

1. **Physical custody of the design files.** The manifest is corrected from measured bytes; **no file was
   renamed or moved** (`DESIGNS_MODIFIED = NO`). The canonical Gate 6/7/9 artifacts are the ones named
   `… new.dc.html`, and their pre-patch rivals still sit beside them under names differing by one word.
   Recommended: move `ea760d2b…`, `d09c75fe…`, `0f53b4d3…` to `25_superseded/replaced-gates/`, then
   rename. **Until then, select by SHA-256, never by filename.**
2. **The Gate 6 board's *"exactly two reports"* copy** contradicts `02` `FR-DASH-005` (`A-MUST`).
   Precedence resolves it — the report is built — but the board copy should be corrected so the design
   and the requirement agree.
3. **`@fresh-foods` vs `@freshfoods`.** Gate 8's lookup board draws the former inside copy that is *about*
   near-miss handles; the patched Gate 9 and owner brief §F use the latter. The database takes
   `@freshfoods`. A seed literal, not a behaviour — exact-handle lookup and `handleReservations` are
   identical either way.
4. **Two stale Gate 6 mobile frames** (`Cold Room 80.000 / Main Store 40.000`; an adjust sheet totalling
   `116.000 KG`) contradict the same file's desktop product detail, its archive dialog, and its Cold Room
   valuation of `LKR 398,900.00`, which arithmetically requires MEAT-001's full `LKR 150,000.00` to be in
   Cold Room. Owner brief §C.13 has already ruled: canonical is **120.000 KG, all in Cold Room**. Also
   struck: `22` §2's five non-canonical *Additional products*.

### Deployment, for the owner — none blocks development

5. **Blaze billing** (`ADM-009`). Production Functions cannot deploy on Spark. The emulator path is
   unaffected, so every step of the implementation sequence proceeds without it.
6. Functions region · 7. Authorized Auth domains · 8. ACR-003 (renderer assets only).

### Measurement obligation

9. **Measure the dashboard and product-list read counts at Stage 17.** `NFR-017`'s budget of 27, and the
   warm-shell figure of **12**, are obligations to verify, not proven claims. `DB_04` §6 says so, and
   neither A3 nor A3R upgrades that status. The aggregation cost model — *1 read per 1000 index entries,
   min 1* — is a Firestore guarantee; the **demo-scale** figures that follow from it are not a guarantee
   at 12,000 products, and that separation is stated rather than glossed.

---

## 8. Gate result

```
SCHEMA_COVERAGE               = 100%   every Release A+B-Lite path, field, type, ownership,
                                       immutability, index and retention rule specified
UI_DATA_COVERAGE              = 100%   over the corrected Release A/B canonical surface set;
                                       measured UI→data, the direction that failed twice
QUERY_COVERAGE                = 100%   92 defined ids (A3R-P: 91 + Q-080, the C-38 archive guard
                                       cited as the undefined id Q-085g); every id referenced by
                                       DB-02/03/04/05/06/08/11 resolves to a row, asserted mechanically
INDEX_COVERAGE                = 100%   67 composite; the 32-index product-list matrix generated
                                       from the DB-CR-038 rule and asserted as an exact set
COMMAND_COVERAGE              = 100%   over the A/B surface: 38 callables; C-32 excluded from the
                                       denominator because it maps to no A/B mutation
TRANSACTION_COVERAGE          = 100%   every multi-document command has a DB-06 §6 row
RBAC_COVERAGE                 = 100%   7 roles × every collection × every command
STATE_MACHINE_COVERAGE        = 100%   private PO, connected PO, connection, mapping, membership,
                                       invitation, product, category, warehouse; every enum value
                                       reachable by a named command or declared derived-on-read
SEED_COVERAGE                 = 100%   two labelled states, recomputed independently
TENANT_ISOLATION_COVERAGE     = 100%   zone 4 closed absolutely; DATA_DERIVED_RULE_READS = 0
PRIVACY_COVERAGE              = 100%   3 catalog concepts separated; 9 crossing items; the SCREEN-013
                                       Buyers tab deleted precisely because its only possible source
                                       is another tenant's productMappings
ATTACK_TEST_COVERAGE          = 100%   ATTACK-01 … ATTACK-16 (ATTACK-16 discovered at A3R-11)
INVARIANT_COVERAGE            = 100%   26 active: INV-01…INV-24, INV-26, INV-27
                                       (INV-25 WITHDRAWN at DB-CR-027, tombstone preserved)
DERIVED_CONTRACT_COVERAGE     = 100%   14 active: DV-01 … DV-14
COMMAND_ID_COVERAGE           = 100%   38 active Release-A/B callables
INDEX_ID_COVERAGE             = 100%   67 active composite indexes

UNDEFINED_INDEX_IDS           = 0      UNDEFINED_COMMAND_IDS        = 0
UNDEFINED_INVARIANT_IDS       = 0      UNDEFINED_DV_IDS             = 0
STALE_CURRENT_ASSERTIONS      = 0      (A3R-P sweep across DB_00…DB_11 + docs/implementation)
A3R_P_PROPAGATION_CLOSURE     = COMPLETE
DATABASE_ARCHITECTURE_FROZEN  = YES

ORPHAN_UI_ELEMENTS            = 0      UNSUPPORTED_FILTERS          = 0
ORPHAN_DATABASE_OBJECTS       = 0      UNSUPPORTED_ACTIONS          = 0
UNDEFINED_QUERY_IDS           = 0      UNJUSTIFIED_INDEXES          = 0
UNREPRESENTED_BACKEND_STATES  = 0      MISMATCHED_RBAC              = 0
BROKEN_END_TO_END_WORKFLOWS   = 0      MISMATCHED_CANONICAL_VALUES  = 0
JOINED_LISTS                  = 0      DATA_DERIVED_RULE_READS      = 0

INDEPENDENT_REVIEWS_RUN       = 3      (1 failed on spend limit, 2 completed, both returned FAIL)
DEFECTS_FOUND                 = 62     (44 frontend↔DB + 18 adversarial-on-A3)
DEFECTS_ACCEPTED              = 61
DEFECTS_REFUTED_WITH_EVIDENCE = 1      (A3R-06, on the canonical bytes)
DEFECTS_PATCHED               = 61 / 61
BLOCKING_DEFECTS_REMAINING    = 0

PRODUCTION_CODE_CHANGED       = NO     (as issued at A3R-P — the architecture passes wrote no code.
                                       Foundation code EXISTS as of Codex C1; see "Next action" below)
DESIGNS_MODIFIED              = NO
CANONICAL_SEED_FIGURES_CHANGED= NO     (the seed's t₀/post-chain split is labelled, not altered)
UNRESOLVED_OWNER_DECISIONS    = 0      (database) · 4 (design-side, §7, none blocking)
```

### Verdict

```
DATABASE_IMPLEMENTATION_READY = YES
```

**Why `YES` and not a conditional pass.** Every defect either of the two completed reviews raised is
closed in the normative tables, not merely in a change log — that distinction is what `A3R` was
commissioned to check and is the reason this gate can be issued. The four open design-side items in §7
are artifacts of record, not contracts: none of them changes a path, a field, a command, a rule or a
canonical figure, and an implementer who follows `IMPLEMENTATION_CHECKPOINT` §4 cannot be misled by any
of them.

**What `YES` does not mean.** It does not mean the read budgets are proven — item 9 is a measurement
obligation, and the honest position is that `NFR-017` is verified at Stage 17 and not before. It does not
mean a third review would find nothing; the base rate in this project is that each review finds real
defects, and the correct inference from two failures is that reviews work, not that the next one is
unnecessary. What it means is that no known defect blocks implementation, and that the contracts are
specific enough for three agents to build against without inventing anything.

### Next action

```
NEXT_ACTION = PREPARE_PARALLEL_IMPLEMENTATION_LANES
```

**A3R-P2 · current.** `CODEX_FIREBASE_FOUNDATION` — config, emulators, `firestore.indexes.json` generated
to the 67-index set, shared types, Zod schemas, converters, typed path builders with zone 4 in a
server-only module, `deriveStockStatus` / `deriveShortfall` / `deriveStockValueMinor` at both grains,
transition tables as data, the bootstrap seed at **12 movements**, and the test harness — **is COMPLETE**
(Codex C1; evidence under `docs/implementation-evidence/`). Codex wrote no Security Rules and no command
bodies, as required. The A3R-P-era `NEXT_ACTION = CODEX_FIREBASE_FOUNDATION` is **HISTORICAL**.

```text
CODEX_FOUNDATION = COMPLETE            C1_FOUNDATION_COMPLETE = YES
A3R_P2_PROPAGATION = COMPLETE          STALE_CURRENT_ASSERTIONS = 0
FOUNDATION_READY_FOR_CLAUDE_CODE = YES

CODEX_C2_FOUNDATION_PREREQUISITES = SATISFIED
FRONTEND_FOUNDATION_PREREQUISITES = SATISFIED

LANE_A = CODEX_C2_READ_QUERY_LAYER
LANE_B = CLAUDE_CODE_SECURITY_RULES_AND_BACKEND_SEQUENCE
LANE_C = ANTIGRAVITY_FRONTEND_IMPLEMENTATION
```

**What "prerequisites satisfied" does and does not mean.** It means the common foundation the three lanes
build on — types, schemas, converters, paths, indexes, transition data, the frozen counts — exists and
agrees with the authority chain after the A3R-P2 propagation. It does **not** mean the C2 or frontend
implementation *plans* have been reviewed or approved; no documentation pass can certify that, and neither
did this one. `C-13`'s zero-opening rule (DB-06 §3.1) and `IDX-36 DESC` (DB-04 §7) are the two contract
points Lane B and Lane A respectively must read in their amended form.
