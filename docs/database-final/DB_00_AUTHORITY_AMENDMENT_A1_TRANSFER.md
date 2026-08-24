# DB-00 — AUTHORITY AMENDMENTS A1 (TRANSFER) AND A2 (EXTERNAL REVIEW REMEDIATION)

**Instrument type:** owner-approved authority amendment
**Raised by:** DB-CR-004 (`STOCKMOK_DATABASE_FRONTEND_INGESTION_STOP.md` §3); A2 raised by the external
independent review, 2026-08-17
**Decided by:** Owner, 2026-08-15 (A1); external-review remediation adopted 2026-08-17 (A2)
**Status:** APPROVED — binding on all downstream implementation

> **A2 is recorded in §7 of this file.** It changes no owner decision and adds no capability. It repairs
> six defects found by an external independent reviewer plus nine found while verifying that review.
> §1 – §6 below are the A1 record and are unchanged except where §7 explicitly supersedes them.

```
DB_CR_004                 = RESOLVED
INTER_WAREHOUSE_TRANSFER  = INCLUDE
TRANSFER_CURRENT_RELEASE  = YES
TRANSFER_RELEASE          = A
DB_CR_005                 = RESOLVED
```

The owner's decision supersedes every prior classification of inter-warehouse transfer as Future /
Release D. Transfer is **not** removed from the approved frontend. This document is the minimal,
exact delta each frozen authority requires; DB-01 → DB-10 are written against it.

**Scope guard.** This amendment authorises exactly one new capability. It adds no Release C or
Release D surface, no sales/outbound subsystem, no multi-product transfer, no cross-organization
movement, no transfer approval workflow and no in-transit state. Anything beyond a single-product,
same-organization, two-warehouse, immediately-applied stock move remains out of scope.

---

## 1. Design authority already satisfied — no design change required

The workflow is already drawn and owner-approved, so **no frozen UI is modified by this amendment**.
Verified in the canonical (patched) Gate 6 artifact `cb94a73c…`, board **6i**:

> **Move stock between store rooms** — From `Main Store ▾` · To `Cold Room ▾` · Product
> `Basmati Rice · DRY-001 ▾` · Quantity `50.000 KG` · Main Store `250.000 → 200.000 KG` ·
> Cold Room `0.000 → 50.000 KG` · **Total stock unchanged · 250.000 KG**
> *"A transfer never changes what you own, only where it is — and it writes both halves at once."*

Corroborating frozen content: Gate 6 ledger *"A transfer is two lines — out of one store room, into
another, at the same moment, each with its own resulting balance"*; Gate 12 refusal frame
*"TRANSFER · same room twice"*; Gate 12 warehouse-archive remedy action *"Transfer this stock"*;
Gate 11 *"Stock moves only through an adjustment, a transfer or a receipt"*; Gate 14 (approved)
*"transfer writing both halves at once — Drawn"*; `DEC-012`; `CHG-024`.

**Single product per transfer is proven by existing authority.** The drawn form carries exactly one
`Product ▾` selector. No multi-line transfer surface exists anywhere in the frozen package. The
owner's "unless existing authority proves otherwise" therefore resolves to **one product per
transfer operation**.

---

## 2. Amendments by authority file

### A1-01 · `02_FINAL_REQUIREMENTS_SPECIFICATION.md` §4.5 — add three requirements

| ID | Priority | Requirement |
|---|---|---|
| FR-STOCK-018 | **A-MUST** | An authorised user may transfer a quantity of one product from one ACTIVE warehouse to another ACTIVE warehouse within the same organization. The transfer executes through a trusted backend command. |
| FR-STOCK-019 | **A-MUST** | A transfer writes a paired, immutable `TRANSFER_OUT` and `TRANSFER_IN` movement sharing one `transferId`, and updates both `StockBalance` documents, in a single atomic transaction. Partial persistence is impossible. Total organization stock for that product is unchanged. |
| FR-STOCK-020 | **A-MUST** | Source and destination warehouses must differ; quantity must be greater than zero; the resulting source balance must not be negative. Each is rejected with a distinct reason code. |

### A1-02 · `03_FINAL_SCOPE_FREEZE.md` — move transfer from future to Release A

- §A5 *Stock integrity* — append: *"· inter-warehouse transfer with paired movements and an unchanged organization total"*.
- §7 *Deliberate coursework simplifications* — add a row: *Transfer · single product, single quantity, immediate · multi-line transfer requests and in-transit state*.
- No entry in §6 (Release D) is added or removed; inter-warehouse transfer was never listed there.

### A1-03 · `05_FINAL_DOMAIN_AND_DATA_CONTRACT.md` — the substantive delta

1. **§5.16 movement types.** Release A/B set becomes:
   `OPENING_BALANCE · ADJUSTMENT_IN · ADJUSTMENT_OUT · PURCHASE_RECEIPT · CONNECTED_DISPATCH_OUT · `**`TRANSFER_OUT · TRANSFER_IN`**.
   Remove `TRANSFER` from the *Future* list. Source types gain `TRANSFER`.
2. **§5.16 new fields on `StockMovement`** — see DB-02 §4.11 for the full contract:
   `transferId?` · `counterpartWarehouseId?` · `balanceAfterMilli` · `adjustmentReason?` · `note?` · `effectiveAt`.
3. **§11 Future compatibility** — strike *"inter-warehouse transfers"*.
4. **New invariants:**

| ID | Invariant |
|---|---|
| INV-22 | A `TRANSFER_OUT` movement exists if and only if exactly one `TRANSFER_IN` movement shares its `transferId`, and the two carry equal absolute quantities, the same product, the same unit and different warehouses. |
| INV-23 | A transfer leaves `ProductStockSummary.onHandMilli`, `availableMilli`, `stockStatus` and `stockValueMinor` unchanged. The summary document is therefore **not written** by `stock.transfer`, which makes INV-04 hold by construction rather than by arithmetic. |
| INV-24 | `StockMovement.balanceAfterMilli` equals the `StockBalance.onHandMilli` of that movement's own product-and-warehouse immediately after the movement was applied. |

### A1-04 · `06_FINAL_SECURITY_AND_RBAC_MODEL.md` — one capability row, one list entry

- §5 matrix — insert after *Adjust stock*:

  | Capability | Owner | Admin | Inventory Mgr | Procurement Mgr | Storekeeper | Analyst | Viewer |
  |---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
  | **Transfer stock between warehouses** | ✔ | ✔ | ✔ | ✘ | **✘** | ✘ | ✘ |

  **Reasoning, in the style of the existing resolved ambiguities.** Transfer is grouped with opening
  balance and adjustment on frozen board 6i, drawn in an Inventory Manager session, and it is a
  free-form quantity movement with no external document — the same property that excludes Storekeeper
  from *Adjust stock*. It is therefore `INVENTORY_WRITERS`, not `RECEIVERS`. Segregation of duties is
  preserved: a Storekeeper can receive documented goods but cannot silently relocate stock.
- §6.2 backend-command list — append `· inter-warehouse transfer`.
- §17 minimum security tests — add `T-SEC-24`: *a Storekeeper, Procurement Manager, Analyst or Viewer calling `stock.transfer` → denied*; and `T-SEC-25`: *a transfer naming a warehouse in another organization → denied after the membership and ownership reads*.

### A1-05 · `08_FINAL_TEST_AND_QA_MATRIX.md` — new test family

`T-XFER-01 … T-XFER-12`, all **P0**. Full definitions in DB-08 §6.4.

### A1-06 · `11_FINAL_FIREBASE_IMPLEMENTATION_ARCHITECTURE.md` — command, transaction, indexes

- §11 command catalog: **C-33 `stock.transfer`** · `INVENTORY_WRITERS` · Release A · idempotent **yes** · transaction **yes** · audit **yes**. With C-34, C-35 and C-36 the catalog becomes **36 commands** *(HISTORICAL — the A1-era figure. `C-35` later split into `C-35a`/`C-35b` and A3/A3R added `C-37`/`C-38`; the current total is **38** Release-A/B callables. SUPERSEDED.)*.
- §14 transaction boundaries: one new row, reproduced in DB-06 §6.
- §8 indexes: `IDX-20 … IDX-24` and `IDX-33 … IDX-38` (DB-04 §7). Note that `IDX-21` closes a pre-existing gap — `TABLE-006` already permitted a combined product **and** warehouse filter, for which no composite index was declared.
- §32 freeze statement is otherwise unchanged: no document moves zone, no client write path is added, no HTTP endpoint, no trigger, no data-derived rule read.

### A1-07 · `23_FINAL_UI_STATE_AND_PERMISSION_MATRIX.md` — remove the exclusion

- Header **Excluded** line: strike `transfer`. It now reads *"Release D sales, reservation and multi-level conversion"*.
- §3 hard matrix — add the *Transfer stock between warehouses* row: `FULL / FULL / FULL / HIDDEN / HIDDEN / HIDDEN / HIDDEN`.
- §7.2 — add: *Stock transfer · source ACTIVE warehouse → destination ACTIVE warehouse · O/A/IM only · same-warehouse and negative-result attempts refused inline.*
- §4 screen matrix — add `SCREEN-053` row: `FULL / FULL / FULL / HIDDEN / HIDDEN / HIDDEN / HIDDEN`.

### A1-08 · `19` and `22` — registry entries for an already-drawn surface

| New ID | Definition |
|---|---|
| `SCREEN-053` | **Stock Transfer** — modal / 390 px sheet, **not a route**. Hosted by `SCREEN-015` Warehouses and `SCREEN-013` Product Detail → Stock. Exactly analogous to `SCREEN-016` and `SCREEN-042`. |
| `FORM-024` | From warehouse; To warehouse; Product; Quantity + unit; read-only source-after, destination-after and unchanged-total previews. `operationId` generated when the modal opens. Validation: warehouses differ; quantity > 0; source result ≥ 0; both warehouses ACTIVE; product ACTIVE. |
| `ACTION-062` | **Transfer stock** — dialog submit. Outcome: paired atomic movements and both balances. Constraint: Owner / Admin / Inventory Manager; same organization only. |
| `STATE-044` | Transfer refused — source and destination are the same store room. (Drawn: Gate 12 *"TRANSFER · same room twice"*.) |

`SCREEN-053` state coverage: `L N R R R R R C` — Loading R, Empty N, Error R, Success R, Permission
denied R, Submitting R, Validation R, Confirmation C (contextual; a transfer is not destructive, so
`STATE-008` is required only when the movement reduces the source balance by more than 50 %, matching
the existing large-reduction rule).

---

## 3. DB-CR-005 — movement "Kind" taxonomy — **RESOLVED, no schema cost**

**The problem.** The frozen ledger states *"Plain words for every kind: Opening balance · Received ·
Issued · Transferred in · Transferred out · Correction. The Kind filter offers exactly these words and
nothing from the system underneath."* — six words against seven movement types.

**Resolution.** `movementKind` is a **derived display and filter value, not a persisted field.** Every
frozen word maps onto movement types with no ambiguity:

| Frozen UI word | Movement type(s) | Filter predicate |
|---|---|---|
| Opening balance | `OPENING_BALANCE` | `movementType == 'OPENING_BALANCE'` |
| Received | `PURCHASE_RECEIPT` | `movementType == 'PURCHASE_RECEIPT'` |
| **Issued** | `CONNECTED_DISPATCH_OUT` | `movementType == 'CONNECTED_DISPATCH_OUT'` |
| Transferred in | `TRANSFER_IN` | `movementType == 'TRANSFER_IN'` |
| Transferred out | `TRANSFER_OUT` | `movementType == 'TRANSFER_OUT'` |
| **Correction** | `ADJUSTMENT_IN`, `ADJUSTMENT_OUT` | `movementType in ['ADJUSTMENT_IN','ADJUSTMENT_OUT']` |

**Why "Issued" is the connected dispatch and not an adjustment.** The canonical Gate 6 adjustment form
was patched to carry an **enumerated** Reason — *"Recount correction · Damaged in storage · Expired ·
Wastage · Theft or loss · Other"* — and not one of those six is an issue. Every adjustment is therefore
a correction. `CONNECTED_DISPATCH_OUT` is the only movement that issues stock out of the workspace to
another party, so it is the only candidate for "Issued". This mapping reproduces the six frozen words
exactly, needs no new form field, no new persisted column and no new index, and leaves `FORM-009`
untouched.

**Consequence for the canonical seed.** Grand Ocean never dispatches and the seed contains no
transfer, so in the seeded buyer workspace the Kind filter legitimately returns zero rows for *Issued*,
*Transferred in* and *Transferred out*. This matches the frozen board, which states the whole record is
*"Twelve opening balances plus the five later movements on Chicken Breast"* — 17 movements, no invented
traffic. **The canonical seed is not amended by A1.**

**Firestore note.** `in` accepts up to 30 values and uses the same composite index as an equality on
the field, so *Correction* costs no additional index.

---

## 4. Two further contract corrections adopted with A1

Both are required by the frozen UI, neither needs an owner decision, and neither moves a document
between zones, adds a client write path, adds a trigger or adds a data-derived rule read — so both sit
inside the `11` §32 freeze.

### DB-CR-006 — `StockMovement.balanceAfterMilli` — **ADOPTED**
`TABLE-005` and `TABLE-006` both require a **Balance After** column and every drawn ledger row shows
one. It cannot be computed from a filtered, paginated, reverse-chronological page without reading the
whole ledger. Persist it as an immutable field written inside the transaction that already computes the
new balance. Governed by INV-24 and by derived-value contract `DV-07` (DB-07 §5).

### DB-CR-009 — adjustment `adjustmentReason` enum, `note`, and `effectiveAt` — **ADOPTED**
The canonical Gate 6 forms are more specific than `05` §5.16's free-text `reason?`:

- **Reason is a select**, not free text: `RECOUNT_CORRECTION · DAMAGED_IN_STORAGE · EXPIRED · WASTAGE · THEFT_OR_LOSS · OTHER`. Choosing `OTHER` makes `note` **required**.
- **`note`** is an optional bounded free-text field (drawn: *"Recounted the cold room shelf on Monday"*).
- **`effectiveAt`** — the opening-balance form carries *"As at 1 Aug 2026 ▾ · Cannot be later than today"*. Opening balances are back-datable for display; `createdAt` remains the immutable server timestamp and is the only ordering key. Balances are never recomputed from `effectiveAt`.

### DB-CR-010 — the connected DRAFT has no write path — **ADOPTED (gap closure, not new capability)**
`11` §9.3 permits a client write to `purchaseOrders/{poId}` **only while `supplierKind == 'PRIVATE'` and
`status == 'DRAFT'`**, and `05` §5.22 makes client DRAFT editing explicit for private orders only. But
`11` §11's catalog has no command that **creates or edits a connected draft** — `cpo.submit` is
`DRAFT → SUBMITTED` and presupposes the draft exists. `SCREEN-038` / `FORM-021` require a buyer to build
one. As written, a frozen UI action has no legitimate backend behaviour.

Left unclosed, the only way to make the screen work would be to widen rule 6 to connected drafts — which
would let a buyer create a purchase order client-side carrying a forged `counterpartyOrgId`,
`connectionId` and `mappingId`, none of which a rule can validate.

**Resolution: add `C-34 cpo.draftSave`** (`PO_WRITERS` of the buyer org, Release B, idempotent, transaction,
no audit). It creates or updates the buyer-tenant connected draft after server-validating the ACTIVE
connection, the VERIFIED mappings and the ACTIVE products. No client write path is added, no capability is
added — `FR-CPO-001` and `FR-CPO-015` already require exactly this behaviour. The draft still lives only in
the buyer's tenant and stays invisible to the supplier until `cpo.submit`.

### DB-CR-011 — the product list breached its own read budget — **ADOPTED**
The first draft read 25 `products` then joined 25 `productStockSummaries` by `documentId() in [...]`.
An `in` query still bills **one read per returned document**, so the page cost 50 reads against a frozen
`NFR-017` budget of 27. **Resolution:** `TABLE-001` is served entirely from `productStockSummaries`,
which now carries denormalised product display fields written in the same transaction that already
writes the summary. 25 reads, one collection. Governed by derived-value contract `DV-10`.

### DB-CR-012 — category archive is guarded and cannot be a client write — **ADOPTED**
The frozen design blocks category archive *"by physical truth rather than by permission"* — an archive is
refused while ACTIVE products still reference the category. That is an unbounded query, exactly the
warehouse-archive situation, and `06` §6.1 nevertheless listed categories as fully client-writable.
**Resolution:** `C-35 category.archive` / `category.restore` with a `limit(1)` guard inside the
transaction; rules deny a client setting `status`.

### DB-CR-013 — the default warehouse had two sources of truth — **ADOPTED**
A `warehouse.isDefault` boolean and `settings.defaultWarehouseId` would be two copies of one fact, and
"exactly one is true" is not expressible in a Security Rule while switching it is inherently a
two-document write. **Resolution:** `settings.defaultWarehouseId` is the only source of truth, the
`isDefault` field does not exist, and the frozen *"Make this the default store room"* control is
`C-36 warehouse.setDefault`.

### DB-CR-014 — `cpo.draftSave` must not be idempotent — **ADOPTED**
Receipts are never deleted in Release A/B. Giving a draft save an `operationId` would create one
permanent receipt document per keystroke-batch. A draft save is an upsert with no side effect and is
idempotent by nature. **Resolution:** no `operationId`, no receipt, no audit; it keeps its transaction
only to re-validate the connection, mappings and products server-side.

### DB-CR-007 — handle length — **RESOLVED by authority order**
`05` §3 and `11` §18 specify **3–30**; `19` `FORM-005` says 3–40. Two authorities to one, and 3–30 is a
strict subset. **3–30 binds.**

---

## 5. Blocker DB-B-01 — resolved by evidence, with a required repair

`STOCKMOK_FINAL_DESIGN_ARTIFACT_MANIFEST.md` remains factually wrong (8 of 10 canonical SHA-256 values
match no file; the Gate 6 "byte-identical" claim is false by 31,392 bytes). It is **no longer a blocker
for this pack**, because every rival pair is resolvable deterministically from the change register plus
content markers, and the residual staleness is provably non-database.

| Logical artifact | Resolved canonical file | Basis |
|---|---|---|
| Gate 6 | `…Dashboard Inventory **new**.dc.html` `cb94a73c` | Carries the frozen twelve-product seed; `CHG-027`. The manifest's own canonical hash is this file's hash. |
| Gate 7 | `…Private Procurement **new**.dc.html` `f8a7c504` | `Print` absent; `CHG-036`. |
| Gate 9 | `…Connected Workflows **new**.dc.html` `e1003987` | `@freshfoods` ×3, `Print` absent; `CHG-033`, `CHG-036`. |
| Design System, Gates 5, 8, 10, 11, 12, 14 | the single local copy | No rival exists. |

**Known-stale, non-database deltas** in the single-copy artifacts, already authoritatively resolved in
the change register and therefore mapped from the *record* rather than the file: `@fresh-foods` →
`@freshfoods` (Gates 8, 12 — `CHG-033`); the 390 px bottom-tab navigation (Gate 11 — `CHG-044`,
`MOBILE_BOTTOM_TAB_NAV = 0`); `reconnect` wording (Gate 8 — `CHG-041`). None touches a document, a
field, a query, a command, an RBAC cell or a privacy boundary.

**Residual risk, stated rather than hidden.** If a patched Gate 5/8/10/11/12 artifact exists outside
this repository and contains a further capability-level addition comparable to Transfer, this pack would
not know about it. Every board's full semantic content was read and Transfer was the only such finding.
**Required repair, non-blocking: correct the manifest** (re-hash all artifacts, invert the Gate 6/7/9
supersession, and either locate the patched Gate 5/8/10/11/12 files or record that the local copies are
pre-patch).

---

## 6. Amendment result

```
AUTHORITY_AMENDMENT          = A1
AMENDED_AUTHORITIES          = 02, 03, 05, 06, 08, 11, 19, 22, 23
NEW_COMMANDS                 = 4   (C-33 stock.transfer · C-34 cpo.draftSave · C-35 category.archive · C-36 warehouse.setDefault)
COMMAND_CATALOG_TOTAL        = 36
NEW_MOVEMENT_TYPES           = 2   (TRANSFER_OUT, TRANSFER_IN)
NEW_INVARIANTS               = 3   (INV-22, INV-23, INV-24)
NEW_INDEXES                  = 11  (IDX-20 … IDX-24 transfer/ledger · IDX-33 … IDX-38 second-pass corrections)
NEW_REGISTRY_ENTRIES         = 4   (SCREEN-053, FORM-024, ACTION-062, STATE-044)
NEW_SECURITY_TESTS           = 2   (T-SEC-24, T-SEC-25)
NEW_TEST_FAMILY              = T-XFER-01 … T-XFER-12
DESIGNS_MODIFIED             = NO
CANONICAL_SEED_MODIFIED      = NO
RELEASE_C_D_SCOPE_EXPANSION  = NONE
CROSS_ORG_TRANSFER           = FORBIDDEN
```

---

# 7. AMENDMENT A2 — EXTERNAL INDEPENDENT REVIEW REMEDIATION

**Raised by:** an external independent reviewer, 2026-08-17, against the exported DB-00 → DB-10 pack.
**Why external:** the three reviewer subagents commissioned during the original run all terminated on the
organization monthly spend limit and returned nothing (DB-10 §1). That failure is **not hidden**; it is
restated here and in DB-10 §1. The external review is the replacement for it.

```
EXTERNAL_INDEPENDENT_REVIEW = COMPLETE
REVIEW_SOURCE               = external independent reviewer (not a Claude subagent)
FINDINGS_RECEIVED           = 6   (IR-01 … IR-06)
FINDINGS_ACCEPTED           = 5   (IR-01, IR-02, IR-03, IR-04 partial, IR-05 wording)
FINDINGS_REJECTED           = 1   (IR-06 — refuted by the canonical artifact, evidence in §7.6)
FINDINGS_FOUND_WHILE_VERIFYING = 9  (VR-01 … VR-09, §7.8)
NEW_CHANGE_REQUESTS         = DB-CR-015 … DB-CR-023
OWNER_DECISION_REQUIRED     = NO   (no capability, role, zone, release or seed value changes)
CANONICAL_SEED_MODIFIED     = NO
DESIGNS_MODIFIED            = NO
NEW_COMMANDS                = 0    (catalog stays at 36)
NEW_TRIGGERS                = 0
NEW_HTTP_ENDPOINTS          = 0
DATA_DERIVED_RULE_READS     = 0
```

Every finding was verified against the final authorities (`02`, `03`, `05`, `06`, `08`, `11`, `16`, `19`,
`22`, `23`) and the canonical artifacts before being accepted or rejected. **A reviewer finding is not
authority.** Two are stated below in the reviewer's own terms and then corrected on the evidence.

---

## 7.1 IR-01 — RBAC read enforcement — **ACCEPTED (HIGH)**

**Reviewer claim.** DB-03 records role-denied surfaces; DB-05 nevertheless allows every ACTIVE member to
read the underlying collections, relying on a route guard. A route guard is not authorization against a
user driving the Firestore client SDK directly.

**Verdict: the claim is correct, and DB-05's stated reason for the gap was a category error.**

DB-05 §4 argued that *"expressing a per-role read denial on a list would require the rule to be a filter,
which it is not."* That is true of a **per-document** condition. It is false of a **per-role** condition.
A per-role denial is uniform across the entire potential result set, so the "rules are not filters"
constraint is satisfied trivially — which is exactly why the same ruleset already enforces
`hasRole(orgId, ADMINS)` on `invitations` and `auditLogs`. The pack applied the correct technique in two
places and then argued it was impossible in six others.

**Cost.** `hasRole(orgId, roles)` reads `organizations/{orgId}/members/{request.auth.uid}` — the *same*
constant path `isActiveMember(orgId)` already reads. Firestore caches identical document access calls
within a request, so every tightening below costs **zero additional** access calls, at any page size.
`DATA_DERIVED_RULE_READS` stays `0` and the 10-call limit is untouched.

### Authority evidence

| Authority | Statement |
|---|---|
| `06` §1 | *"UI visibility is convenience. Security is enforced by Firebase Authentication, Firestore Security Rules and trusted backend authorization."* |
| `06` §5 | Hard-boolean matrix. **View stock movement history: Viewer ✘.** **View purchase orders: Viewer ✘.** **View Connections: IM ✘, SK ✘, AN ✘, V ✘.** **Manage private suppliers and buyers: O/A/PM only.** **Read connected Partner Catalog: O/A/PM only.** |
| `06` §5 note | *"Permissions may never be broadened silently."* |
| `23` §1 | `DENIED` = *"A valid route was requested but the role cannot open it. Render SCREEN-029 and **execute no page query or command**."* |
| `23` §3 | Stock movement history `V = HIDDEN`; View purchase orders `V = HIDDEN`; View Connections `IM/SK/AN/V = HIDDEN`. |
| `23` §4 | SCREEN-017 `V = DENIED`; SCREEN-018/019/020 `IM/SK/AN/V = DENIED`; SCREEN-021/023/038/039 `V = DENIED`; SCREEN-027 `IM/PM/SK/AN/V = DENIED`; SCREEN-031/033/034/037 `IM/SK/AN/V = DENIED`. |
| `23` §11 | *"Inventory Manager has no Network access. Analyst has no Network access… Viewer is limited to dashboard, product/stock read, Stock-on-Hand report and notifications."* |
| `23` header | *"the hard boolean matrix in `06` overrides broader prose"* — which resolves `06` §6.1's *"Reads are broader"* sentence against the §5 matrix wherever the two disagree. |

### DB-CR-015 — Rules-level read tightening — **ADOPTED**

Seven paths change. DB-05 §4 is rewritten accordingly.

| Path | Was | Becomes | Binding authority |
|---|---|---|---|
| `…/stockMovements/**` | all 7 members | **`NOT_VIEWER`** | `06` §5 · `23` §3 · `23` §4 SCREEN-017 |
| `…/purchaseOrders/**` (+ `items`, `history`) | all 7 | **`NOT_VIEWER`** | `06` §5 · `23` §4 SCREEN-021/023/038/039 |
| `…/privatePartners/**` | all 7 | **`PARTNER_WRITERS`** | `06` §5 · `23` §4 SCREEN-018/019/020 |
| `…/connections/**` (projection) | all 7 | **`PARTNER_WRITERS`** | `06` §5 *View Connections* · `23` §3 |
| `…/productMappings/**` | all 7 | **`PARTNER_WRITERS`** | `23` §11 (IM/AN/V have no Network) · `23` §4 SCREEN-037 |
| `…/partnerCatalog/**` (own org) | own-org, all 7 | **`PARTNER_WRITERS`** | `23` §4 SCREEN-034/051 |
| `…/members/**` | all 7, `get` + `list` | **`get`: `isSelf(uid)` OR `ADMINS` · `list`: `ADMINS`** | `23` §4 SCREEN-027 |

```text
NOT_VIEWER = ['OWNER','ADMIN','INVENTORY_MANAGER','PROCUREMENT_MANAGER','STOREKEEPER','ANALYST']
```

`NOT_VIEWER` is added to the role-constant block in DB-05 §0.2 and is covered by `T-SEC-17`, which already
asserts that every rules-side role list equals the shared permission table.

**Consequences the UI side must honour**, each recorded in DB-03:

1. **The Viewer dashboard omits *Recent stock movements* and every purchase-order KPI and panel**
   (`Q-063`, `Q-033`, `Q-054`, `Q-055`, `Q-065`). This is not a new restriction — `06` §5 already denies
   Viewer both capabilities, and `23` §11 already limits Viewer to *"dashboard, product/stock read,
   Stock-on-Hand report and notifications"*. It was simply never written into DB-03's role columns.
2. **The Viewer Product Detail omits the recent-movements block** (`Q-023`) for the same reason.
3. **The Product Detail *Mappings* tab is O/A/PM + `networkEnabled`**, not all-roles.
4. **The Product Detail *Activity* tab is Owner/Admin only**, because it reads `auditLogs`, which `06` §5
   and `23` §3 restrict to Owner/Admin and which rules already enforce. DB-03 previously listed it under
   an all-roles surface — a documentation defect, not a live leak.

### Paths that stay readable by all seven roles — with the reason stated

The reviewer required that any deliberately broader read be justified and checked for field leakage.

| Path | Why every role must read it | Leak check |
|---|---|---|
| `organizations/{orgId}`, `…/settings/main` | The app shell renders for all seven roles and needs org identity, `currency`, `timezone`, `quantityPrecision` and the `networkEnabled` flag. | No money, stock, partner or member data. |
| `…/products/**`, `…/stockBalances/**`, `…/productStockSummaries/**` | `06` §5 *View products and stock* = all seven; `23` §4 SCREEN-048 Stock-on-Hand Report = all seven. | Carries purchase cost and stock value, which `06` §5 grants to all seven explicitly. |
| `…/categories/**` | The `TABLE-001` **Category** filter (`FIELD-050`) and the `SCREEN-048` category filter are offered to all seven roles; the dropdown needs the option set. | Fields are `name`, `description`, `status` only. |
| `…/warehouses/**` | The `TABLE-001` **Store room** filter (`FIELD-051`) and the `SCREEN-048` warehouse filter are offered to all seven roles; `TABLE-004` must render **one row per ACTIVE warehouse including zeros** (§7.8 VR-04). | Fields are `name`, `code`, `type`, `status`, `address` only. No quantity, no value. |
| `users/{uid}/**` | Self-scoped throughout. | Unchanged. |

**A deliberate consequence, stated rather than buried.** `SCREEN-049` Purchase-Order Report is `DENIED`
to Storekeeper while `purchaseOrders` remains readable by Storekeeper. This is correct and is **not** a
MISMATCHED_RBAC: `06` §5 grants Storekeeper *View purchase orders* (they must see the order they are
receiving against) and denies only the **report surface**. The denial is a tab-level product decision over
data the role may lawfully read, so a route guard is the right and only enforcement layer. `23` §5 already
specifies it as *"inline STATE-006, no query"*. The same reasoning applies to Viewer's Stock-on-Hand
access, which is granted, not denied.

### New security tests

| ID | Assertion |
|---|---|
| `T-SEC-26` | A Viewer `list` or `get` on `…/stockMovements/**` → **denied by rules**. |
| `T-SEC-27` | A Viewer `list` or `get` on `…/purchaseOrders/**`, `…/items/**`, `…/history/**` → **denied by rules**. |
| `T-SEC-28` | `IM`, `SK`, `AN`, `V` reading `…/privatePartners/**` → denied; `O`, `A`, `PM` succeed. |
| `T-SEC-29` | `IM`, `SK`, `AN`, `V` reading `…/connections/**` and `…/productMappings/**` → denied; `O`, `A`, `PM` succeed. |
| `T-SEC-30` | `IM`, `SK`, `AN`, `V` reading their own org's `…/partnerCatalog/**` → denied; `O`, `A`, `PM` succeed. |
| `T-SEC-31` | A non-Admin `list` on `…/members/**` → denied; a non-Admin `get` of **their own** member document → allowed; a non-Admin `get` of **another** member document → denied. |

---

## 7.2 IR-02 — ProductStockSummary denormalisation drift — **ACCEPTED (HIGH)**

**Reviewer claim.** `categoryName` and `preferredSupplierName` are declared strongly consistent by DV-10,
but their sources — `categories` and `privatePartners` — are `SAFE_DIRECT_CLIENT_WRITE`, and no
`category.update` command exists to perform the fanout DV-10 describes.

**Verdict: correct, and worse than stated.** DV-10's own text says the fanout happens *"inside
`category.update`"*. **`category.update` is not in the 36-command catalog and never was.** DV-10 therefore
named a non-existent owner for a value it declared strongly consistent, and `preferredSupplierName` had no
maintenance story at all. A private-supplier rename would silently rot every affected product row.

The reviewer offered two exits: (A) move the mutations behind trusted commands, or (B) change the derived-
data design so the names need not be strongly denormalized. **B is adopted**, for four reasons:

1. **A would break a frozen authority.** `06` §6.1 lists categories and private partners as two of exactly
   six client-writable surfaces. Narrowing `status` (DB-CR-012) was justified because a rule cannot express
   an unbounded guard; narrowing `name` has no such justification — a rename needs no guard.
2. **A would create an unbounded write.** DV-10's own `limit(500)` cap with *"a documented refusal above
   500 products in one category"* is an admission that the fanout does not bound. A design whose failure
   mode is *"you may not rename this category"* is worse than the column it serves.
3. **`preferredSupplierName` is a privacy defect once IR-01 is fixed.** After DB-CR-015, `privatePartners`
   is readable only by `PARTNER_WRITERS`. Copying a partner's name into `productStockSummaries` — readable
   by all seven roles — would hand Viewer, Analyst, Storekeeper and Inventory Manager exactly the partner
   data the RBAC matrix denies them. **IR-01 and IR-02 converge on the same removal.**
4. **The canonical Gate 6 product-list board shows neither column.** Its columns are
   `Product ↑ · SKU · Category · On hand · Minimum · Stock value`. `productStockSummaries` already carries
   `minimumStockMilli` and `stockValueMinor`, so the drawn board is served with **no** denormalised name.

### DB-CR-016 — remove the two cross-document denormalised names — **ADOPTED**

- **`ProductStockSummary.categoryName` is deleted.** `categoryId` stays (it is an identifier, and the
  category filter needs the equality). The **Category** column renders from the ACTIVE-category reference
  map the page already loads for its own filter dropdown (`Q-016`, ≤ 25 documents, four in the canonical
  seed), cached by TanStack Query across navigations — the same mechanism DB-04 §6 already relies on for
  the shell reads. Read cost is recorded honestly in DB-04 §6: **25 warm, 25 + |ACTIVE categories| cold**.
- **`ProductStockSummary.preferredSupplierName` is deleted.** `products.preferredPrivateSupplierId` remains
  the single source of truth. The **Preferred Supplier** column renders only for `PARTNER_WRITERS`, from the
  partner reference map those screens already load (`Q-031`); for every other role the column is absent,
  which is what the RBAC matrix requires and what the drawn board shows.

**Result.** Every field remaining in DV-10 — `productName`, `internalSku`, `internalSkuNormalized`,
`categoryId`, `productStatus`, `baseUnitPriceMinor`, `minimumStockMilli`, `productUpdatedAt` — has
**exactly one source document** (`products/{productId}`) and **exactly three writers**
(`product.create`, `product.update`, `product.setStatus`), each of which already writes the summary in the
same transaction. There is no cross-document fanout left anywhere in the derived-data contract, so
`DERIVED_DATA_CONSISTENCY` is now structural rather than procedural. No command is added, no client write
surface is narrowed, and `06` §6.1 is untouched.

---

## 7.3 IR-03 — the warehouse filter breaches NFR-017 — **ACCEPTED (HIGH)**

**Reviewer claim.** DB-04 §6 serves the product list's warehouse filter as `Q-019` (25 `stockBalances`)
plus the matching `productStockSummaries` (25) ≈ **50 reads**, against the frozen `02` NFR-017 budget of
**≤ 27 reads per product-list page** — the identical defect DB-CR-011 was created to repair.

**Verdict: correct, verbatim.** DB-04 §6 states the two-step in its own words and calls it *"the only
two-step list in the system"* without noticing it costs the same 50 reads that DB-CR-011 had just rejected
as a breach. The filter is frozen and drawn (`19` `TABLE-001` *"warehouse"* filter; `22` `FIELD-051`
*Warehouse filter / select*; canonical Gate 6 board `Store room: All ▾`), so it may not be exempted or
removed. It is resolved **physically**.

### DB-CR-017 — serve the warehouse-filtered list from `stockBalances` — **ADOPTED**

`stockBalances/{productId}__{warehouseId}` gains the same denormalised product display field set that
DB-CR-011 gave the summary, minus the two fields DB-CR-016 just deleted:

`productName` · `internalSku` · `internalSkuNormalized` · `categoryId` · `productStatus` ·
`baseUnitPriceMinor` · `minimumStockMilli` · `productUpdatedAt` · `warehouseName`

**Why this is the smallest Firestore-safe resolution.**

- *"Products held in store room W"* is a per-`(product, warehouse)` fact. It lives in `stockBalances` and
  nowhere else. Any solution that keeps the list on `productStockSummaries` must either join (50 reads) or
  carry a `warehouseIds` array — which DB-02 §0 forbids (*"No field anywhere is an unbounded array"*) and
  which `stock.transfer` would have to maintain, breaking `INV-23`.
- `stockBalances` is already written **in the same transaction** by every stock command, exactly like the
  summary. The denormalised fields therefore inherit DB-CR-011's consistency argument unchanged — same
  single source document, same three writers, no new drift class.
- Cost: **25 reads, one collection, one index per sort.** Inside the 27-read budget.
- It simultaneously repairs `Q-061` (§7.8 VR-02), which carried the identical undeclared join.

**Semantics, stated so no implementer invents them.** When the store-room filter is active the list is a
**per-store-room** view: *On hand*, *Stock value* and *Status* are that store room's figures, and the
column group is labelled accordingly. Showing an organization-wide total under an active store-room filter
would be precisely the class of lie DB-04 §3 already refuses when it forces the sort to the searched field.

**Fanout.** `product.update` and `product.setStatus` must now also update that product's balance documents.
This is a **bounded** fanout — one product, at most one document per ACTIVE warehouse — queried by the
existing `IDX-09` (`productId ASC, onHandMilli DESC`) with `limit(100)` inside the same transaction. Two
store rooms exist in the canonical seed; a hundred would still sit far under Firestore's 500-write
transaction cap. This is categorically unlike the category fanout rejected in §7.2, which was bounded only
by *"how many products share a category"* and refused above 500.

**`stock.transfer` is unaffected in kind.** It already reads `products/{productId}` and already writes both
balance documents, including creating the destination balance when absent; it now populates these fields on
that create. The write set stays at **six documents**, the summary is still untouched, and `INV-23` holds.

### DB-CR-018 — `stockStatus` on a balance row is derived, never persisted — **ADOPTED**

`TABLE-004` (Product Stock tab) and `TABLE-013` (Stock-on-Hand report) both carry a **Status** column at
per-store-room granularity, and the warehouse-filtered `TABLE-001` needs one too. Persisting it would force
a fanout across every warehouse of a product on **every** movement — the one fanout class this amendment is
removing.

Instead it is computed at render time from the row's own `onHandMilli` and the denormalised
`minimumStockMilli`, by the **same `deriveStockStatus` function** already specified in DB-02 §4.5 and
DB-09 §6.5. No persisted field, no index, no fanout, no drift — the same technique as `movementKind`
(DB-CR-005). Governed by new derived-value contract **DV-11** (DB-07 §12).

New indexes `IDX-39 … IDX-43` (DB-04 §7) serve the four frozen `TABLE-001` sorts and the
category-plus-warehouse combination against `stockBalances`.

---

## 7.4 IR-04 — the hard query limit is not enforced — **ACCEPTED, PARTIAL (MEDIUM)**

**Reviewer claim.** DB-04 declares page size 25 and a hard maximum of 100, but `firestore.rules` never
requires a bounded `request.query.limit`. If the maximum is a system invariant rather than UI behaviour,
enforce it at the data boundary.

**Verdict: correct, and enforceable — but not on every collection, and the pack must say which.**

Verified against the current official documentation: Security Rules expose `request.query.limit`, and
`allow list: if request.query.limit <= N;` *"denies any query without a limit or with a limit greater
than N."* So the invariant is genuinely expressible.

**The constraint that makes it partial.** The same documentation states: *"The same rules apply to both
normal queries that return documents and aggregation queries."* An unbounded `count()` or `sum()` carries
no limit and would therefore be **denied** by that rule. Every dashboard KPI in `FR-DASH-008` is exactly
such an aggregation, and an aggregation cannot be given a limit without changing its answer — a capped
`sum('stockValueMinor')` is not the inventory value. Applying the rule blindly would break the frozen
dashboard.

### DB-CR-019 — bound `request.query.limit` where it is expressible — **ADOPTED**

`allow list: if request.query.limit <= 100;` is added to the eleven client-listed collections that carry
**no** client aggregation:

`categories` · `warehouses` · `members` · `invitations` · `privatePartners` · `stockMovements` ·
`productMappings` · `partnerCatalog` · `purchaseOrders/{poId}/items` · `purchaseOrders/{poId}/history` ·
`users/{uid}/memberships`

It is **not** applied to the six collections carrying a client aggregation, and the reason is recorded on
each: `products` (`Q-050`) · `productStockSummaries` (`Q-051`, `Q-052`, `Q-053`) · `stockBalances`
(`Q-058`, `Q-060`) · `purchaseOrders` (`Q-054`, `Q-055`, `Q-065`) · `connections` (`Q-064`) ·
`users/{uid}/notifications` (`Q-005`).

**What the exception does and does not expose.** An unbounded `list` on those six paths returns only the
caller's **own tenant's** data, which their role is already entitled to read under DB-CR-015 — so this is a
**cost** exposure, not a privacy or tenancy one. The compensating controls are the existing ones: every
tenant path is membership-gated, every callable is `maxInstances: 10`, and the Blaze budget alert in
DB-10 §7 item 2 is the backstop. Recorded here rather than discovered on a bill.

`T-SEC-32`: a `list` on each of the eleven bounded collections **without** a limit → denied; with
`limit(101)` → denied; with `limit(100)` → allowed. `T-SEC-33`: each of the six dashboard aggregations
still succeeds for a permitted role.

---

## 7.5 IR-05 — aggregation read-budget wording — **ACCEPTED (MEDIUM, wording)**

**Reviewer claim.** DB-04 treats each `count()`/`sum()` as exactly one read; real aggregation billing
depends on index entries scanned and is not universally one.

**Verdict: correct about the table, and the pack was already half-right.** DB-04 §0 states the accurate
model — *"Aggregation queries bill one read per 1000 index entries scanned"* — and then DB-04 §6's table
prints a flat `1` in the **Reads** column for all nine aggregations, which reads as an architectural
guarantee.

Verified against current official pricing: aggregation queries are billed *"one read operation for each
batch of up to 1000 index entries read by the query"*, with *"a minimum charge of one document read"* for
an aggregation reading zero index entries.

### DB-CR-020 — state the aggregation cost honestly — **ADOPTED**

DB-04 §6's Reads column becomes **`1 per 1000 index entries, min 1`**, and the dashboard budget table is
annotated: *"**6** at the canonical seed's scale (every KPI matches far fewer than 1000 index entries) —
a measured expectation at current and demo scale, **not** an unbounded architectural guarantee."*

The `NFR-017` ≤ 12 figure is preserved as what it always was: a target to be **measured at Stage 17**
(DB-10 §7 item 7), now with the scale at which it holds written down. `Q-060` remains the figure that
scales with warehouse count. **No distributed counter is introduced** — at twelve products and two store
rooms, every aggregation matches double-digit index entries, three orders of magnitude below the first
billing boundary, and a counter would be premature complexity (`03` §6, DB-07 §12).

---

## 7.6 IR-06 — movement kind / "Issued" semantics — **REJECTED, with proof**

**Reviewer claim.** *"Earlier ingestion evidence recorded a frozen Gate-6 ledger row: `Issued to kitchen
−15.000 KG`, separately from `Correction · damaged in storage −5.000 KG`. If 'Issued to kitchen' still
exists in the canonical final artifact, DB-CR-005 is not resolved as currently written."*

The reviewer set the correct test and asked for the canonical **patched** artifact to be inspected
directly rather than inferred from the Adjustment form. That was done. **The row does not exist in the
canonical artifact. It exists only in the superseded pre-patch file.**

### Exact evidence

| File | SHA-256 | Bytes | `"Issued to"` | `"kitchen"` | `"damaged in storage"` | `"Recount"` |
|---|---|---:|---:|---:|---:|---:|
| `Stockmok Gate 6 Dashboard Inventory.dc.html` — **pre-patch, superseded** | `ea760d2b…3b891a47` | 142,682 | **5** | 5 | 2 | 0 |
| `Stockmok Gate 6 Dashboard Inventory new.dc.html` — **canonical** | **`cb94a73c…ecf8f984`** | 174,074 | **0** | 2 | 0 | 4 |

`cb94a73c…` is the hash DB-00 §5 already resolved as canonical for Gate 6, and 174,074 − 142,682 = **31,392
bytes** — precisely the discrepancy the manifest repair item records. The reviewer's evidence is
traceable, and it is traceable to the file the change register supersedes.

**The canonical MEAT-001 ledger, transcribed verbatim from `cb94a73c…`:**

> *Movement history — Newest first · six entries · each shows the balance it produced*
>
> | Date | What happened | Store room | Change | Balance after | By |
> |---|---|---|---|---|---|
> | 12 Aug | Received against CPO-2026-003 · 2 PACK from Fresh Foods Ltd | Cold Room | +10.000 | 120.000 KG | Nimal Perera |
> | 11 Aug | Received against CPO-2026-003 · 8 PACK from Fresh Foods Ltd | Cold Room | +40.000 | 110.000 KG | Nimal Perera |
> | 7 Aug | Received against PO-2026-001 · Green Farm | Cold Room | +10.000 | 70.000 KG | Nimal Perera |
> | 4 Aug | Received against PO-2026-001 · Green Farm | Cold Room | +40.000 | 60.000 KG | Nimal Perera |
> | 2 Aug | **Correction · recount correction** | Cold Room | **+2.000** | 20.000 KG | Nohan |
> | 1 Aug | Opening balance recorded | Cold Room | +18.000 | 18.000 KG | Nohan |
>
> *"18 + 2 + 40 + 10 + 40 + 10 = 120.000 KG"*

There is no `Issued` row and no negative movement anywhere in the canonical seeded ledger. The single
adjustment is an `ADJUSTMENT_IN` of `+2.000` carrying reason **`RECOUNT_CORRECTION`** — the first value of
the enumerated Reason list DB-CR-009 adopted. The pre-patch `−15.000` issue and `−5.000` damage rows were
replaced by that one `+2.000` correction when Gate 6 was patched.

**Corroborating evidence in the same canonical file** — the report table *Stock movement · by product*:

> | Product | Opening | Received | **Issued** | Corrected | Closing |
> |---|---|---|---|---|---|
> | Chicken Breast · KG | 18.000 | 100.000 | **0.000** | +2.000 | 120.000 |

The canonical artifact states the seeded **Issued** total is **0.000** in its own words. DB-00 §3's
consequence — *"in the seeded buyer workspace the Kind filter legitimately returns zero rows for Issued,
Transferred in and Transferred out"* — is therefore confirmed by the artifact, not merely inferred from the
Adjustment form.

```
DB_CR_005                       = RESOLVED (unchanged)
ISSUED = CONNECTED_DISPATCH_OUT = CONFIRMED against cb94a73c…
CANONICAL_ARTIFACT_INSPECTED    = YES, byte-level
IR_06                           = REJECTED — evidence belongs to the superseded pre-patch artifact
```

**One thing the reviewer's finding does prove.** The pre-patch file is still sitting in
`visual-designs/completed Stockmok Design programme/` beside the canonical one with a nearly identical
name, which is how it reached an external reader as evidence. DB-10 §7 item 1 (correct the artifact
manifest) is **raised from "before frontend implementation" to "before any further review"**, and gains a
second clause: physically move every superseded artifact into `25_superseded/`.

---

## 7.7 Amendment A2 result

```
DB_CR_015  Rules-level read tightening — 7 paths                       ADOPTED
DB_CR_016  Remove categoryName + preferredSupplierName from summary    ADOPTED
DB_CR_017  Warehouse-filtered list served from stockBalances           ADOPTED
DB_CR_018  Per-row stockStatus derived, never persisted (DV-11)        ADOPTED
DB_CR_019  request.query.limit <= 100 where expressible                ADOPTED
DB_CR_020  Honest aggregation cost wording                             ADOPTED
DB_CR_021  Q-044/Q-048/Q-011a defined; query coverage repaired         ADOPTED  (VR-01)
DB_CR_022  onHandMilli > 0 removed from list queries (zero rows shown) ADOPTED  (VR-03)
DB_CR_023  IDX-38 collision, command counts, misc arithmetic repaired  ADOPTED  (VR-06/07/08)

AMENDED_DB_FILES        = DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, DB-08, DB-09, DB-10, DB-11 (new)
AMENDED_AUTHORITIES     = none — A2 changes no file outside docs/database-final/
NEW_INDEXES             = 5   (IDX-39 … IDX-43; total 43. Q-044 reuses IDX-15, Q-048 reuses IDX-18)
DELETED_FIELDS          = 2   (ProductStockSummary.categoryName, .preferredSupplierName)
NEW_FIELDS              = 9   (StockBalance denormalised display set)
NEW_DERIVED_CONTRACTS   = 1   (DV-11)
NEW_SECURITY_TESTS      = 8   (T-SEC-26 … T-SEC-33)
NEW_COMMANDS            = 0
CAPABILITY_CHANGE       = NONE
SEED_CHANGE             = NONE
```

---

## 7.8 Findings raised while verifying the external review

The review procedure requires that verifying a finding not be treated as the end of the audit. Nine
further defects surfaced during verification. They are recorded with the same weight as the reviewer's.

| ID | Defect | Sev | Resolution |
|---|---|---|---|
| **VR-01** | `Q-044` and `Q-048` are referenced by DB-03 (SCREEN-013) but **defined nowhere in DB-04**; `Q-011a` is referenced by DB-04 `Q-061`'s own row and defined nowhere. DB-04 §9 claims *"74 query ids"* against **71** defined rows. **`QUERY_COVERAGE = 100%` was false.** | **HIGH** | DB-CR-021. `Q-044` (product-detail mappings, O/A/PM) and `Q-048` (product-detail Activity, Owner/Admin) are defined in DB-04 §5; `Q-011a` is deleted along with the join it named. Count restated and asserted. |
| **VR-02** | `Q-061` (Stock-on-Hand report) carried *"`stockBalances` (+ `Q-011a` join)"* — the **identical** undeclared 25 + 25 join that DB-CR-011 rejected and IR-03 caught elsewhere. | **HIGH** | Absorbed into DB-CR-017. Unfiltered → `productStockSummaries` (product-level, 25). Warehouse-filtered → `stockBalances` (25). No join in either mode. |
| **VR-03** | `Q-019` and `Q-061` filter `onHandMilli > 0`. The canonical Gate 6 artifact states the opposite twice: *"Cooking Oil is listed at zero rather than omitted"* and *"A store room with none of this product is listed at zero rather than hidden, so nobody wonders whether it was checked."* The queries would hide exactly the rows the design insists on showing. | **HIGH** | DB-CR-022. `onHandMilli > 0` is removed from `Q-019` and `Q-061`. `IDX-08` serves both unchanged. `Q-056` (`warehouse.archive` guard) **keeps** the predicate — it is a guard, not a list. |
| **VR-04** | `TABLE-004` must render **one row per ACTIVE warehouse including zeros** (canonical board: `Cold Room 120.000 · Main Store 0.000` for MEAT-001, which has no Main Store balance document). `Q-018` alone returns one row. `Q-017` is not listed among SCREEN-013's reads. | MEDIUM | DB-03 SCREEN-013 gains `Q-017`; `TABLE-004` is `Q-017` left-joined onto `Q-018` client-side. Both bounded, ≤ 25 each, not on an `NFR-017`-budgeted surface. |
| **VR-05** | The `TABLE-001` **Category** and **Store room** filter dropdowns, and the `SCREEN-048` category and warehouse filters, have no declared query — `Q-016`/`Q-017` list neither `011` nor `048` as callers. | MEDIUM | DB-04 §3 caller lists corrected. These are the reference reads DB-CR-016 now also relies on; their cost is stated in DB-04 §6. |
| **VR-06** | DB-02 §4.1 names **`IDX-33`** as the `category.archive` guard index on `products`; DB-04 §7 assigns `IDX-33` to `productStockSummaries` and gives the guard **`IDX-38`**. A direct collision between two frozen files. | MEDIUM | DB-CR-023. DB-02 §4.1 corrected to `IDX-38`. DB-04 §7 is authoritative for index numbering. |
| **VR-07** *(HISTORICAL / A2-ERA — SUPERSEDED at A3R-P: the denominator is now 8 × **37**, being the **38** Release-A/B callables less the optional `C-03`)* | DB-08 §6 and §9 specify command tests as *"8 cases × **34** commands"* against a **36**-command catalog, with no statement of which two are excluded. | LOW | DB-CR-023. Restated as **8 × 34 = C-01 … C-36 less `C-32` (Release C, not built) and `C-03` (optional; the client `setDoc` covers it)**, with the exclusion named. |
| **VR-08** | DB-03 §7 asserts *"`FORM-001…024` → 24/24"* and *"`TABLE-001…027` → 27/27"* as bare counts with no per-item enumeration, unlike `ACTION-001…062`, which DB-10 §3 enumerates one by one. | LOW | DB-11 §A enumerates every `TABLE`, `FORM` and `FIELD` individually. |
| **VR-09** | `19` `TABLE-001` specifies columns *Preferred Supplier* and *Updated*; the canonical Gate 6 board draws *Minimum* and *Stock value* instead. Two UI authorities disagree about a frozen table. | LOW | **Non-database, no DB change.** `productStockSummaries` carries `minimumStockMilli`, `stockValueMinor` **and** `productUpdatedAt`, and `stockBalances` now carries the same set — so the database serves either reading at 25 reads. Raised to the owner in DB-10 §7 as a UI-authority reconciliation item alongside the manifest repair. |

---

# 8. AMENDMENT A3 — FRONTEND ↔ DATABASE INDEPENDENT REVIEW REMEDIATION

**Trigger.** `docs/database-final/reviews/STOCKMOK_FRONTEND_DB_INDEPENDENT_REVIEW.md`, dated 2026-08-17,
run by a reviewer that authored neither the pack, nor A1, nor A2, nor DB-11 — the review DB-11 §J and the
database handoff both recorded as the one outstanding obligation. It returned **44 findings**
(5 CRITICAL, 16 HIGH, 18 MEDIUM, 5 LOW) and the verdict `FRONTEND_DB_INDEPENDENT_REVIEW = FAIL`.

**Disposition.** All 44 are **ACCEPTED**. None is rejected. The reviewer's central diagnosis is correct
and is recorded here without softening: DB-11 was run *database-first* by the author of the A2 fixes, so
it verified that every database object has a consumer and did **not** verify that every frozen UI element
has a producer. Eleven of the twenty-one CRITICAL/HIGH findings are frozen UI elements with no producer,
and two are A2 reintroducing the exact defect class A2 was written to remove.

**What A3 changes about method.** Every finding below is resolved **from authority**, and the authority
is named. Where the previous run would have escalated a frozen-UI-versus-Firestore tension to the owner,
A3 applies the precedence order in force: **the canonical visual artifact (rank 7) outranks the UI
registry (rank 8).** Nine findings dissolve on that rule alone, because the registry element the reviewer
correctly found unserved is *not drawn on the canonical board at all*. Three more dissolve because the
board states the answer in its own explanatory copy.

```
A3_FINDINGS_ACCEPTED   = 44 / 44
A3_RESOLVED_BY_AUTHORITY = 44
A3_ESCALATED_TO_OWNER  = 0   (database)   3 (design-side, non-blocking — §8.9)
DESIGNS_MODIFIED       = NO
PRODUCTION_CODE_CHANGED = NO
CANONICAL_SEED_VALUES_CHANGED = NO  (the seed *timing* is corrected; no figure moves)
```

---

## 8.1 F-C-01 — the canonical artifact set — **RESOLVED FROM BYTES; THE MANIFEST IS INVERTED**

The reviewer recomputed SHA-256 over every `.dc.html` and found that **8 of the manifest's 10 canonical
hashes match no file present**. This was re-verified independently in this run. Measured, 2026-08-17:

| File on disk | Measured SHA-256 | Manifest's claim |
|---|---|---|
| `Stockmok Design System.dc.html` | `8f1880d5…` | canonical `81e6fba3…` — **absent** |
| `Stockmok Gate 5 Public Auth Onboarding.dc.html` | `27de3d9e…` | canonical `8a0ddc07…` — **absent** |
| `Stockmok Gate 6 Dashboard Inventory.dc.html` | `ea760d2b…` | *(unrecorded)* |
| **`Stockmok Gate 6 Dashboard Inventory new.dc.html`** | **`cb94a73c…`** | **the manifest's own CANONICAL hash**, filed as `DUPLICATE → superseded/` |
| `Stockmok Gate 7 Private Procurement.dc.html` | `d09c75fe…` | *(unrecorded)* |
| **`Stockmok Gate 7 Private Procurement new.dc.html`** | **`f8a7c504…`** | recorded `SUPERSEDED, pre-Gate-13-patch` |
| `Stockmok Gate 8 Network Foundation.dc.html` | `4d6246a2…` | canonical `9a953ffd…` — **absent** |
| `Stockmok Gate 9 Connected Workflows.dc.html` | `0f53b4d3…` | *(unrecorded)* |
| **`Stockmok Gate 9 Connected Workflows new.dc.html`** | **`e1003987…`** | recorded `SUPERSEDED, pre-Gate-13-patch` |
| `Stockmok Gate 9 Connected Workflows new.dc (1).html` | `e1003987…` | true byte-duplicate ✔ |
| `Stockmok Gate 10 Supporting Operations.dc.html` | `5b1bcf46…` | canonical `7267ee22…` — **absent** |
| `Stockmok Gate 11 Responsive Reconciliation.dc.html` | `e51514dd…` | canonical `0f571341…` — **absent** |
| `Stockmok Gate 12 States Accessibility.dc.html` | `1ab770af…` | ✔ matches |
| `Stockmok Gate 14 Owner Approval.dc.html` | `a1bbc21b…` | ✔ matches |

### The resolution, and why it is authority and not preference

The manifest's **filename** column is inverted for Gates 6, 7 and 9. Its **hash** column is right for
Gate 6. Content decides, and the content test is not subjective — §B of the owner brief lists the Gate-14
corrections that MUST override stale HTML, and each is a mechanical string test:

| Gate-14 correction (owner brief §B) | `… new.dc.html` | `…dc.html` (no "new") |
|---|---|---|
| No Print / PDF / document export for purchase orders | **absent ✔** | `Print` button present ✗ |
| Canonical wording "Procurement Manager" | **present ✔** | `Purchasing Manager` ✗ |
| Corrected one-shipment connected-order wording | *"one shipment of 10 PACK"*, *"The whole order, in one shipment"* ✔ | *"shipped in two parts"*, *"Fresh Foods Ltd shipped 8 PACK · Part of the order"* ✗ |
| Canonical connected flow (owner brief §F) | `@freshfoods` ✔ | `@fresh-foods` ✗ |
| Gate 6 — no "Issued to kitchen" row (IR-06) | **0 occurrences ✔** | **5 occurrences ✗** |
| Gate 6 — warehouse valuation `398,900` / `292,800` | **present ✔** | **0 occurrences ✗** |

The files named `… new.dc.html` carry the Gate-13 patch and the Gate-14 approved state. The files without
`new` are the **pre-patch** artifacts. `NO MULTI-SHIPMENT` is a non-negotiable business invariant
(owner brief §E); the non-`new` Gate 9 file draws a two-part shipment. It cannot be canonical.

```
CANONICAL_GATE_6 = Stockmok Gate 6 Dashboard Inventory new.dc.html   sha256 cb94a73c…
CANONICAL_GATE_7 = Stockmok Gate 7 Private Procurement new.dc.html   sha256 f8a7c504…
CANONICAL_GATE_9 = Stockmok Gate 9 Connected Workflows new.dc.html   sha256 e1003987…
```

**Consequence for the pack, stated plainly.** Every DB claim certified `VERIFIED_AGAINST_ARTIFACT =
cb94a73c…` was certified against the **correct bytes** — DB-08 §9, DB-11 §G and DB-00 §7.6 are sound.
The pack was reading the right file under the wrong name. IR-06's rejection stands on its bytes and now
also stands on its filename. What was wrong was the manifest, and the manifest's §4 instruction — *move
`cb94a73c…` to `superseded/duplicate-downloads/`* — would have destroyed the evidentiary basis of the
entire pack. **That instruction is void.**

**DB-CR-024 — the manifest is corrected, the design files are not touched.**
`STOCKMOK_FINAL_DESIGN_ARTIFACT_MANIFEST.md` is re-issued from measured bytes: canonical rows point at
the `… new.dc.html` filenames for Gates 6/7/9, the six single-copy artifacts carry their measured hashes,
and §4's destination column is rewritten so the **pre-patch** files are the ones classified superseded.
No `.dc.html` file is renamed, moved or edited — `DESIGNS_MODIFIED = NO` is preserved, and physical
custody of the design artifacts remains an owner action (§8.9 item 1).

---

## 8.2 F-C-02 · F-C-05 — per-warehouse **value** and per-warehouse **status** — **DB-CR-025, ADOPTED**

Two CRITICAL findings with one root cause and one fix. The reviewer escalated both to the owner as schema
amendments. They do not need the owner, because the owner has already ruled on the requirement
(brief §C.2, §C.5, §I, §J: *"If a UI combination cannot be expressed safely/efficiently in Firestore: do
NOT silently remove the UI feature. Design an approved projection/index/summary strategy instead."*), and
the cost objection that produced DB-CR-018 is arithmetically wrong.

**What the canonical board actually requires.** Verified in this run against `cb94a73c…`:

- Dashboard *"Where your stock sits"*: `Cold Room LKR 398,900.00 · Main Store LKR 292,800.00 · Total LKR 691,700.00`
- Warehouse list `TABLE-027`: columns *Name · Type · Products held · **Share** · **Stock value***, `Cold Room … 6 … 57.7% … LKR 398,900.00`
- Warehouse-archive refusal: *"Cold Room holds 6 products worth LKR 398,900.00"*
- Product detail *Stock by store room*: *Store room · On hand · **Share** · **Value*** — `Cold Room 120.000 KG · 100% · LKR 150,000.00`
- Product list filter bar: `Category: All ▾ · Store room: All ▾ · Status: All ▾ · Archived: Excluded ▾` — **all four simultaneously**

`Q-060` and `Q-058` are `sum('onHandMilli')`. Summing milli-quantities across a store room holding KG, L
and EACH produces a dimensionally meaningless number — for Cold Room, `323,000`, which is not `398,900`,
is not currency, and cannot reconcile to the Inventory Value KPI that `CHART-002` explicitly requires it
to reconcile with. The reviewer is correct: **no aggregation over the A2 `stockBalances` shape can produce
this figure**, because Firestore `sum()` cannot multiply two fields.

### DB-CR-025 — `stockBalances` gains `stockValueMinor`, `stockStatus` and `shortfallMilli`

| Field | Type | Derivation | Writer |
|---|---|---|---|
| `stockValueMinor` | integer ≥ 0 | `roundHalfUp(onHandMilli × baseUnitPriceMinor / 1000)` | same document, same transaction |
| `stockStatus` | `StockStatus` | `deriveStockStatus(onHandMilli, minimumStockMilli)` — the §4.5 function, unchanged | same document, same transaction |
| `shortfallMilli` | integer ≥ 0 | `max(0, minimumStockMilli − onHandMilli)` | same document, same transaction |

**Why DB-CR-018 was wrong, in one paragraph.** DB-CR-018 refused to persist `stockStatus` on a balance row
because *"persisting it would force a fanout across every warehouse of a product on every movement."*
It would not. A movement changes `onHandMilli` on **exactly one** balance row — two for a transfer, and a
transfer writes both anyway. All three new values are computed from **fields already on the row being
written**, inside a transaction that is **already writing that row**. The marginal cost is zero reads and
zero writes. The only input that can change without a movement is `minimumStockMilli` and
`baseUnitPriceMinor`, and **DB-CR-017 already established the fanout that maintains both** —
`product.update` / `product.setStatus` fan out to that product's balances with `IDX-09` and `limit(100)`
inside the same transaction, bounded by the ACTIVE warehouse count. A3 adds three recomputations to a
write that is already happening. It adds no writer, no command, no trigger and no new fanout.

**DB-CR-018 is hereby REVERSED.** It is superseded by DB-CR-025. The `movementKind` render-time technique
remains correct for `movementKind`; it was misapplied to `stockStatus`.

### Consequences

- `Q-060` (Inventory by location) → `sum('stockValueMinor')` per ACTIVE warehouse. Currency. Reconciles.
- `Q-058` (archive refusal detail) → `count()` + `sum('stockValueMinor')`. Yields *"6 products worth LKR 398,900.00"* literally.
- `TABLE-027` *Stock value* and *Share* are served; *Share* = row value ÷ `Q-053`, client-side, no read.
- Product-detail *Stock by store room* *Value* and *Share* columns are served from the balance row.
- **F-C-05 dissolves.** `stockStatus` is now a persisted, indexable field on `stockBalances`, so the frozen `Store room × Status` combination becomes an ordinary two-equality query. `Q-074`…`Q-078` gain a `stockStatus ==` predicate; **`IDX-44`** `stockBalances` `productStatus ASC, warehouseId ASC, stockStatus ASC, productName ASC` serves it. No client-side page filtering, no unbounded fetch, no lying control.
- `TABLE-001`'s *Stock value* column in store-room mode becomes a **field read** rather than a client multiplication.

---

## 8.3 F-C-03 — the seed is **12 movements at t₀**, 17 after the chain — **DB-CR-026, ADOPTED**

The canonical board states the arithmetic in its own words. Verified in this run against `cb94a73c…`:

> **"17 movements · twelve opening balances on 1 August, five later movements, all of them on Chicken Breast"**

and, in the movement report:

> `Chicken Breast · KG · Opening 18.000 · Received 100.000 · Issued 0.000 · Corrected +2.000 · Closing 120.000`

The pack asserted in five places that the **seeded** ledger is 17 while simultaneously asserting that at t₀
MEAT-001 is `18.000 KG`, inventory value is `LKR 564,200.00` and low stock is `4`. Those are mutually
exclusive, and `T-SEED-01` — which asserts all three in one block — could never pass. The owner brief §C.11
rules identically: *"12 opening movements initially. Then 5 later Chicken Breast movements. 17 total after
the full chain. Do not seed 17 movements at t0."*

**DB-CR-026 — the two states are separated everywhere.**

| | **t₀ — after `seed`** | **post-chain — after the `04` use-case chain** |
|---|---|---|
| Ledger | **12** movements (twelve openings, 1 Aug) | **17** (+5, all MEAT-001) |
| MEAT-001 | `18.000 KG` | `120.000 KG` |
| Inventory value | `LKR 564,200.00` | `LKR 691,700.00` |
| Low stock | **4** (incl. MEAT-001 at 18 < 20) | **3** (MEAT-001 clears) |
| Out of stock | 1 (Cooking Oil) | 1 |
| Cold Room / Main Store | — | `398,900.00` / `292,800.00` |

**Arithmetic proof that the two states are one workspace, recomputed independently in this run:**
`120.000 − 18.000 = 102.000 KG × LKR 1,250.00/KG = LKR 127,500.00`, and
`564,200.00 + 127,500.00 = 691,700.00` ✔. The five later movements are `+40.000` and `+10.000` against
`PO-2026-001` (Green Farm, 50.000 KG total), `+40.000` and `+10.000` against `CPO-2026-003`
(Fresh Foods Ltd, 10 PACK = 50.000 KG), and a `+2.000` correction — `Received 100.000` and
`Corrected +2.000` exactly as the board's movement report states. One opening plus five later = the
**six** MEAT-001 movements the handoff records.

`T-SEED-01` is split into `T-SEED-01a` (t₀ block: 12 / 18.000 / 564,200.00 / 4 / 1) and `T-SEED-01b`
(post-chain block: 17 / 120.000 / 691,700.00 / 3 / 1 / 398,900.00 / 292,800.00). DB-09 §11's STOP
condition is restated against the correct t₀ target so Codex's first green build is reachable.
**No canonical figure changes. Only the moment each is asserted.**

---

## 8.4 F-C-04 — `warehouseName` on `stockBalances` — **DB-CR-027, DELETED**

DB-07 §12 states the rule A2 introduced: *"a derived field may only be denormalised from a document
written by the same transactional writer as its host."* `StockBalance.warehouseName` fails it. Its source
`warehouses/{warehouseId}.name` is a `SAFE_DIRECT_CLIENT_WRITE` document; its host is command-written; no
`warehouse.update` command exists to carry a fanout. An Inventory Manager renaming *Cold Room* → *Cold
Store* is a plain client write, and every balance row keeps the stale label indefinitely. `INV-25` becomes
false in production, and `T-INT-03` cannot catch it because a rename is not a command.

**DB-CR-027 — `warehouseName` is deleted from `stockBalances`.** This is DB-CR-016's remedy applied to the
identical defect: the *Warehouse* column renders from `Q-017`, which SCREEN-011 and SCREEN-048 already
load for their own **Store room** filter dropdown (VR-05). The warehouse set is bounded by design — the
canonical workspace has two, and `TABLE-027` is a full-page list of it. Cost is unchanged: zero additional
reads on any budgeted surface.

`INV-25` is **withdrawn** — it existed only to police this field. The audit rule in DB-07 §12 now holds
for every entry in DV-01…DV-11 without exception, which was the point of writing it.

---

## 8.5 The registry-versus-board findings — **RESOLVED BY PRECEDENCE, NOT BY DECISION**

Nine findings the reviewer raised as unserved frozen UI elements are unserved because **they are not on
the canonical board.** `19`/`22` are rank 8; the canonical visual is rank 7. Each was re-verified in this
run against the canonical bytes.

| Finding | Registry claim (rank 8) | Canonical board (rank 7) — measured | Resolution |
|---|---|---|---|
| **F-H-05** | SCREEN-013 tabs incl. *Suppliers*, *Buyers* | tabs are exactly `Overview · Stock by store room · Movement history · Purchase orders` | Both tabs **deleted**. A *Buyers* tab could only be sourced from other tenants' `productMappings`, which the privacy contract forbids absolutely (DB-01 §13) — it implies a capability Release A/B does not have, which the freeze forbids. Matches owner brief §C.7. |
| **F-H-04 · F-M-04** | *Preferred supplier* field, `FORM-006` select, `TABLE-001` column | **0 occurrences** of "Preferred" anywhere in `cb94a73c…` | Field, select, column and the `Q-031` read on SCREEN-011/012/013 all **deleted**. Matches owner brief §C.8 and closes `UI-OD-001`. `products.preferredPrivateSupplierId` is removed from the A/B schema. |
| **F-H-12** | `TABLE-013` = *Product, Warehouse, On Hand, Unit, Status, Value*; status filter; warehouse sort | report header draws `Store room: All ▾ · Category: All ▾` and columns `Product · SKU · Category · On hand · Unit cost · Stock value`, with **category subtotal rows** and *"Total inventory value · 4 categories · LKR 691,700.00"* | Canonical columns adopted (= owner brief §C.6). **No** *Warehouse* column, **no** status filter, **no** warehouse sort. Category grouping is real: `Q-061` gains a category-ordered variant `Q-061b` on `IDX-34`, subtotals derived client-side over the bounded page. |
| **F-H-15** | SCREEN-049 PO report + `CHART-003` status bar | *"Two reports in this release… The Reports page lists exactly **two** entries and says so"* — `Stock on hand`, `Stock movement` | ~~**SCREEN-049 and `CHART-003` are OMITTED in Release A/B.**~~ **SUPERSEDED BY A3R-09 (§8.10). BOTH ARE INCLUDED.** This ruling used a rank-7 authority to strike what rank-1 `FR-DASH-005` (`A-MUST`, *"Purchase-Order report"*) requires. `Q-062` serves the table and `Q-085…Q-089` serve `CHART-003`. The board copy is a design-side item (§8.9 item 4). |
| **F-H-14** | `TABLE-016` *"Search; role/status filter; sort name/joined"* | Team draws header *"5 members · 4 active, 1 suspended · 1 invitation waiting"* then the table head directly — **no filter bar**, where Gate 6's product list and Gate 7's supplier list both draw theirs explicitly | No search, no role filter, no name sort. `Q-009` is a single bounded page ordered `joinedAt ASC`, served by `IDX-31`. **No new index.** The contrast with the boards that *do* draw filter bars is what makes the absence evidence rather than an omission. |
| **F-M-09** | `TABLE-015` tabs *All / Unread / **Read***, plus an event-type filter | tabs are `All 8 · Unread 3 · **Stock 4** · **Orders 2** · **Network 2**` | No *Read* tab — read/unread stays a state, exactly as owner brief §C.9 rules. The **category** tabs are real: `notifications` gains `category: 'STOCK' \| 'ORDERS' \| 'NETWORK'`, `Q-004` extends to `category ==`, and `IDX-45` `category ASC, createdAt DESC` serves it. Tab counts are four `count()` aggregations, 1 read each. |
| **F-H-13** (part) | `TABLE-018` *Mapped Items*, *Open Connected POs* | connection list draws `Business · Handle · Relationship · State · Action` with a sub-line *"Connected since 9 Aug 2026 · 1 order placed"* and tabs `All 4 · Connected 1 · Waiting 2 · Past 1` | Both columns **deleted**. The sub-line count and the four tab counts are real and are served by `connectionOrdersPlacedCount` (DV-12) and four `count()` aggregations. |
| **F-M-07** (part) | `TABLE-023` *sort verified time*, supplier filter | not drawn | Sort and filter dropped; the display **snapshots** are still added (below), because the columns themselves are drawn. |
| **F-L-05** | SCREEN-011 filters *"FIELD-049..055"* | four filters drawn | Range replaced by the explicit list `FIELD-049, 050, 051, 052, 055`. |

**This is the finding class the reviewer could not close and A3 can**, because closing it requires
applying the precedence order rather than treating every registry line as frozen. The registry is a
derived inventory of the design; where it disagrees with the artifact the owner approved at Gate 14, the
artifact wins. Recorded once, per owner brief §P.

---

## 8.6 The genuinely-unserved surfaces — **DB-CR-028 … DB-CR-034, ADOPTED**

These *are* on the canonical board and *were* unserved. Each is fixed.

### DB-CR-028 — Needs Attention (F-H-02)
Board 6c: rows `Cooking Oil ✕ Out`, `Wheat Flour`, `Butter Block`, `Fish Fillet`; footer
*"Showing 4 of 12 products · 1 out of stock, 3 low"*; explanatory copy *"**Out is ordered before low.** The
one product at zero sits at the top regardless of the sort… **Low rows follow in shortfall order.**"*
`Q-021` filtered `stockStatus == 'LOW_STOCK'` only, so the row the board places **first** could never
appear, and shortfall was neither persisted nor indexable.

`productStockSummaries` gains **`shortfallMilli`** (`max(0, minimumStockMilli − onHandMilli)`, same writer,
same transaction — the same argument as DB-CR-025). `Q-021` is replaced by two indexed queries on
**`IDX-46`** `productStatus ASC, stockStatus ASC, shortfallMilli DESC`:

```
Q-021a  productStatus == 'ACTIVE' and stockStatus == 'OUT_OF_STOCK'  orderBy shortfallMilli DESC  limit 5
Q-021b  productStatus == 'ACTIVE' and stockStatus == 'LOW_STOCK'     orderBy shortfallMilli DESC  limit 5
```

concatenated in that order and truncated to 5. The frozen ordering is now **produced by the query**, not
approximated client-side. Cost ≤ 10 reads, bounded, replacing a 5-read query that returned the wrong set.
Empty copy corrected from *"All tracked products are above their minimum level."* to cover both states.

### DB-CR-029 — the *Archived* filter (F-H-08)
Board 6d draws `Archived: Excluded ▾`; board 6f states *"Anything you archive appears here, behind the
Archived filter and **never mixed into the active list**, and can be restored with its history intact."*
The design therefore has **no *Included* (mixed) option** — the copy forbids it. The filter is
**`Excluded` (default) | `Only`**:

```
Excluded → productStatus == 'ACTIVE'     (existing queries, unchanged)
Only     → productStatus == 'ARCHIVED'   (identical shape, same indexes)
```

Both are single-equality predicates on the existing leading field. **`IDX-33`, `IDX-34`, `IDX-39`,
`IDX-40` serve both unchanged. No new index.** The reviewer's `productStatus in [...]` option is not
needed and would have produced the mixed list the board forbids.

### DB-CR-030 — Movement History search (F-H-09)
Board 6h draws `Search these movements by product or SKU` **beside** `Product: All ▾`, and fixes the sort
as *"Date ↓"* only. A prefix range on `skuSnapshot` would force the first `orderBy` onto the searched
field and break the frozen time sort.

The search box is therefore specified as a **product resolver, not a ledger text scan**: the term resolves
against `productStockSummaries` through the *already-defined, already-indexed* `Q-013b` (name prefix) and
`Q-015` (SKU prefix, `limit 10`), and the resulting ids are applied to the existing ledger query as
`productId in [...]`. `createdAt DESC` is preserved, the frozen sort is untouched, and **no index is added
to `stockMovements`.** Defined as `Q-083`. Firestore's 30-value `in` ceiling bounds it; >10 matches asks
the user to narrow, which is the same bounded-search honesty `Q-015` already applies. Owner brief §C.4 is
satisfied — the feature is implemented, not deleted.

### DB-CR-031 — the ledger *Reference* column (F-H-06)
`TABLE-005`/`TABLE-006` render `Received · CPO-2026-003` and `Received · PO-2026-001`; `stockMovements`
stores only `sourceId`, so the column needed one `purchaseOrders` read per referencing row and
`JOINED_LISTS = 0` was false. **`sourceReferenceSnapshot: string?`** is added to `stockMovements`, written
by `po.receive`, `cpo.receive` and `cpo.ship` from the order number already inside the transaction. A
DV-09-class snapshot on an immutable document: no fanout, no drift obligation, zero new reads.
`JOINED_LISTS = 0` is restored to truth.

### DB-CR-032 — organization rename → directory (F-H-07 · F-M-06)
`FORM-015`/`ACTION-034` let Owner/Admin edit business name, industry and country;
`organizationDirectory/{handle}` projects exactly those; DB-02 §1.1 said the directory is written *only*
by `org.create`; and `C-02 org.updateSettings` had **no write set at all** in DB-06 §6 and was marked
non-transactional while needing to write two or three documents. Owner brief §C.12 requires this
synchronization be designed explicitly.

`C-02 org.updateSettings` becomes **transactional**, with the write set
`organizations/{orgId}` + `organizations/{orgId}/settings/main` + `organizationDirectory/{handle}` + audit,
and is added to **DV-08**'s owner list. The duplicated `currency` and `timezone` resolve to a single home
on **`settings/main`** (DB-CR-013's reasoning for `defaultWarehouseId`); the copies on `organizations` are
deleted. `handle` remains immutable.

### DB-CR-033 — warehouse restore (F-H-03)
`ARCHIVED → ACTIVE` is declared legal and *"always permitted"* by DB-07 §4 and DB-01 §8, and had no
execution path; DB-02 §4.2 and DB-05 §4 also contradicted each other about whether a client may set
`status`. **`C-37 warehouse.restore`** is added (`INVENTORY_WRITERS`, transactional, audited), mirroring
`C-35b category.restore`. DB-02 §4.2 and DB-05 §4 are aligned: a client may **not** change `status` in
either direction. `UNSUPPORTED_ACTIONS` → 0.

### DB-CR-034 — `org.create` creates the PO counter (F-H-16)
`FORM-005`'s submit outcome names *"…settings, **counter**, and first warehouse creation"*; `Q-068` reads
`counters/purchaseOrder`; `po.order` increments it inside its transaction — and `org.create`'s write set
never created it. `counters/purchaseOrder` `{ value: 0 }` is added to `org.create`'s write set in DB-06 §6
and DB-11 §H. `po.order` / `cpo.submit` additionally upsert with `value: 0` when absent, as defence in
depth.

### DB-CR-035 — partner and connection counts (F-H-13 · F-M-10 · F-M-12)
Gate 7 draws supplier list column **Orders placed** (`1 · 1 · 0 · 1`), the archive dialog *"Green Farm
Poultry has **1 completed order**"*, and the rule *"A supplier with an order still open cannot be archived"*.
Owner brief §C.10 rules that a displayed aggregate is supported, not deleted. `privatePartners` gains
a maintained counter **`ordersPlacedCount`**, written transactionally by `po.order` (+1) and `po.cancel`
(−1) (**DV-13**). *(A3R-11 later deleted the second counter this record proposed, `openOrdersCount`, and
moved the archive guard into `C-38 partner.setStatus` — see §8.10.)*
`connections` projections gain **`ordersPlacedCount`** (**DV-12**) for the *"1 order placed"* sub-line.
The Buyers list *Orders* column renders `—` in Release A/B (the board draws em-dashes for both rows) and
requires no data. SCREEN-018/019 add `Q-041` as a read for their Connected and Pending tabs; SCREEN-020
adds `Q-043` for its mappings section, drops *related products* (not drawn), and scopes *activity* to
Owner/Admin exactly as `Q-048` is scoped on SCREEN-013.

### DB-CR-036 — display snapshots on catalog and mapping rows (F-M-07)
`TABLE-021` draws *Internal Product* / *Internal SKU*; `TABLE-023` draws *Buyer Product/SKU* and
*Verified By*; none of those values exists on the host document, so each column was a per-row join, and
*Verified By* additionally required `members`, which is `ADMINS`-only and therefore unreadable by the
Procurement Manager who owns SCREEN-037. Four DV-09-class snapshots are added at create time:
`internalProductNameSnapshot`, `internalSkuSnapshot` on `partnerCatalog`; `buyerProductNameSnapshot`,
`buyerSkuSnapshot`, `semanticConfirmedByName` on `productMappings`. No fanout, no drift, no cross-role
read. The *sort by internal product* and *sort verified time* are dropped with the registry (§8.5).

---

## 8.7 Mechanical and bookkeeping corrections — **DB-CR-037, ADOPTED**

| Finding | Correction |
|---|---|
| **F-H-01** | `Q-079` is defined in DB-04 §8: `stockBalances`, `productId ==`, `limit(100)`, `IDX-09`, callers `product.update` / `product.setStatus`. DB-09 §8's id-integrity test is widened to parse **DB-02, DB-05, DB-06 and DB-08** as well as DB-04/03/11 — the scope gap that let the defect through. |
| **F-H-10** | The `limit ≤ 100` bounded set is marked explicitly in the DB-05 §4 table and the count corrected from eleven to the **eight** actually marked, plus `users/{uid}/memberships` assigned to the bounded set → **nine**. `T-SEC-32` is restated per-path so it is testable. |
| **F-M-01** | `IDEMPOTENT_COMMANDS` corrected `13 → 17`, matching the `✔` column. |
| **F-M-02** | `Q-015` cites **`IDX-37`** (`productStockSummaries`), not `IDX-30` (`products`). `IDX-37` gains its consumer. |
| **F-M-03** | `IDX-03` and `IDX-19` **deleted** (no surface; DB-01 §12 states there is no audit-log route). `IDX-02`'s justification corrected to the PO-builder category-scoped picker actually declared in DB-03 §3. |
| **F-M-05** | `organizations.status` reduced to `ACTIVE` (lifecycle deferred, no command writes the others); `users.status` reduced to `ACTIVE`; `DirectoryStatus.UNLISTED` deleted; **`InviteStatus.EXPIRED` retained but declared derived-on-read** — `Q-010` additionally filters `expiresAt > now`, the *Expired* pill is derived, and `team.acceptInvitation` / `team.revokeInvitation` lazily write the terminal value. `UNREPRESENTED_BACKEND_STATES` → 0. |
| **F-M-08** | PO-list search resolved the same way as DB-CR-030: the term resolves to a counterparty via `Q-031`/`Q-041` and applies the existing `counterpartyId ==` predicate, preserving `createdAt DESC`. Defined as `Q-084`. No new index. |
| **F-M-11** | Each of the five SCREEN-009 checklist items gets a declared query and a role gate: products `Q-050`, categories `Q-016`, opening stock `Q-022 limit(1)`, suppliers `Q-031` (PARTNER_WRITERS), team `Q-009` (ADMINS). Items whose existence check the role may not perform are rendered from the role filter alone and **issue no query** — `19`'s *"unavailable steps explain responsible role without a dead CTA"* now has its database meaning written down. |
| **F-M-13** | `22` §2's five *Additional products* (Mini Bar Water, Premium Towel, Hotel Shampoo, Coffee Beans, Cleaning Supplies) are **not** canonical: the seed authority is `16` §7 and the board draws twelve, footered *"Total · 12 products"* and *"Showing 1–12 of 12"*. Struck as a design-side registry error (§8.9 item 3). No seed change. |
| **F-M-14** | `TABLE-004`'s *Available* is declared **derived** — equal to `onHandMilli` while `reservedMilli` is constant `0` — at balance grain, the same technique as DV-11. DB-11 §C's product-grain answer was the wrong grain. |
| **F-M-15** | The DB-CR-015 explanatory paragraph is moved **below** the DB-02 §8 table so `handleReservations`, `connections` and `connectedPurchaseOrders` render as rows rather than literal pipe text. |
| **F-M-16** | `C-35` split into **`C-35a category.archive`** / **`C-35b category.restore`**. Operational count restated: **38 callables in Release A/B** (`C-01…C-31`, `C-33…C-37`, `C-35a`, `C-35b`) **plus 2 declared-inert Release C** (`C-32`). `COMMAND_COVERAGE` is redefined over the A/B surface only, so `C-32` no longer sits inside a 100% claim it cannot satisfy. |
| **F-M-17** | `Q-050` redefined as `count() productStockSummaries where productStatus == 'ACTIVE'` on `IDX-33`, so all four `CHART-001` figures share one collection and one query boundary as `24` requires. Cost unchanged. |
| **F-M-18** | DB-06's `Q-079` subsection renumbered `§6.1 → §4.1`. |
| **F-L-01** | `Unit` trimmed to the supported set `KG · L · EACH · PACK`; `BOX`, `CAN`, `BOTTLE` deleted. |
| **F-L-02** | `reservedMilli` reclassified honestly as `FUTURE_PLACEHOLDER, constant 0`; `availableMilli` declared derived. Not `DOMAIN_INVARIANT`. |
| **F-L-03** | `storefrontCatalog/**` reclassified `DECLARED_INERT_SCOPE_GUARD`, not `CANONICAL_SEED_REQUIRED`. |
| **F-L-04** | `Q-010`, `Q-039`, `Q-040` cite `IDX-27` / `IDX-26` by id. |

---

## 8.8 Amendment A3 result

```
FINDINGS_ACCEPTED        = 44 / 44        REJECTED = 0
CHANGE_RECORDS           = DB-CR-024 … DB-CR-037   (14)
REVERSED_PRIOR_DECISIONS = 1  (DB-CR-018, by DB-CR-025 — reasoned, not silent)
WITHDRAWN_INVARIANTS     = 1  (INV-25, with the field it policed)

SCHEMA        + stockValueMinor, stockStatus, shortfallMilli   (stockBalances)
              + shortfallMilli                                  (productStockSummaries)
              + sourceReferenceSnapshot                          (stockMovements)
              + ordersPlacedCount                                (privatePartners)
              + ordersPlacedCount                                (connections projection)
              + category                                         (notifications)
              + 5 display snapshots                (partnerCatalog, productMappings)
              − warehouseName                                    (stockBalances)
              − preferredPrivateSupplierId                       (products)
              − currency, timezone                               (organizations)

COMMANDS      36 catalog rows → 38 A/B callables   (C-35 split a/b; +C-37 warehouse.restore;
                                                  +C-38 partner.setStatus.  C-35 no longer exists
                                                  as an id, so the arithmetic is 36 − 1 + 3 = 38)
INDEXES       43 → 67   (+IDX-44 … IDX-69, −IDX-03, −IDX-19; the 32-index product-list matrix
                        is generated from the DB-CR-038 rule, not transcribed)
QUERIES       78 → 91 → 92 defined ids   (A3R-P: +Q-080, the C-38 archive guard that A3R-11
                                          created in DB-06 and cited as the undefined id Q-085g)
DERIVED       DV-01 … DV-14 = 14   (+DV-12, +DV-13, +DV-14 movement snapshots)
INVARIANTS    25 → 26              (−INV-25 withdrawn, +INV-26 in-row derivations,
                                    +INV-27 one rounding point.  A3R-P CORRECTION: this line
                                    read "25 → 25" while listing one withdrawal and TWO
                                    additions.  24 active + INV-26 + INV-27 = 26.  INV-25's
                                    number is a preserved tombstone.)

SURFACES REMOVED FROM A/B SCOPE, BY PRECEDENCE, NOT BY CONVENIENCE
  [SUPERSEDED] SCREEN-049 PO report + CHART-003  — REINSTATED by A3R-09: FR-DASH-005 is
                                                   A-MUST (rank 1) and beats the board copy
                                                   (rank 7).  This entry is HISTORICAL.
  SCREEN-013 Suppliers tab, Buyers tab           — board: four tabs
  Preferred supplier field / select / column     — board: 0 occurrences
  TABLE-016 search, role filter, name sort       — board: no filter bar
  TABLE-015 Read tab                             — board: All/Unread/Stock/Orders/Network
  TABLE-018 Mapped Items, Open Connected POs     — board: five columns + sub-line
```

---

## 8.9 The four items that remain with the owner — **design-side, none blocking**

Each is a **design-artifact** matter. None changes a database contract, and none blocks Codex.

**A3R-P reconciled the count.** This heading read *"three items"* and listed three, while `DB_04` §5,
`DB_10` §8 and the handoff all cited **four** — the fourth being item 4 below, which `A3R-09` created
when it reinstated SCREEN-049 and left the board copy contradicting the requirement. The list is now the
single source and the count is derived from it: **`OWNER_DESIGN_SIDE_ITEMS = 4`.** This numbering is the
one every other file cites.

1. **Physical custody of the design files.** A3 corrects the manifest from measured bytes but renames and
   moves nothing (`DESIGNS_MODIFIED = NO`). The pre-patch files still sit beside the canonical ones under
   confusingly similar names. Recommended: rename `… new.dc.html` → the canonical name and move
   `ea760d2b…`, `d09c75fe…`, `0f53b4d3…` into `visual-designs/generated/25_superseded/replaced-gates/`.
   Until then the trap the reviewer found remains physically present.
2. **`@fresh-foods` vs `@freshfoods`.** The patched Gate 9 and owner brief §F use `@freshfoods`; Gate 8's
   lookup board draws `@fresh-foods`, inside copy that is *about* near-miss handles
   (*"@fresh-foods and @freshfoods are two different businesses, and only one of them exists"*). The
   database takes `@freshfoods` per §F. This is a seed **literal**, not a behaviour: exact-handle lookup,
   `handleReservations` and normalisation are identical either way. Design-side tidy-up.
3. **Two stale Gate 6 mobile frames.** Board 6m draws *"Where it sits · Cold Room 80.000 KG · Main Store
   40.000 KG"* and an adjust sheet totalling *"116.000 KG"*, while the same file's desktop product detail
   draws `Cold Room 120.000 KG · 100% · Main Store 0.000 KG`, its archive dialog says *"120.000 KG in Cold
   Room"*, and its Cold Room valuation of `LKR 398,900.00` arithmetically **requires** MEAT-001's full
   `LKR 150,000.00` to be in Cold Room. Owner brief §C.13 has already ruled: the canonical state is
   **120.000 KG, all in Cold Room**, and the database is not designed around the isolated mobile typo.
   Also struck: `22` §2's five non-canonical *Additional products* (F-M-13).
4. **The Gate 6 board's *"exactly two reports"* copy contradicts `02` `FR-DASH-005`.** The board states
   *"The Reports page lists exactly two entries and says so"*; `FR-DASH-005` is an **`A-MUST`**
   *"Purchase-Order report"* and `23` carries a per-role row for `SCREEN-049`. **Precedence already
   resolves it** — rank 1 beats rank 7, the report is built, `CHART-003` is served by `Q-085 … Q-089`
   (`A3R-09`) — so **nothing is blocked and no database contract is open**. What remains is that the
   board copy should be corrected so the design and the requirement agree rather than the precedence rule
   having to be re-derived by every future reader. Raised by `A3R-09`; recorded here at `A3R-P`, which is
   where it should have been recorded when `A3R-09` was written.

**DB-08 §9 and DB-11 §G stop claiming byte-level reconciliation of boards 6m and `22` §2** and cite
items 1–3 above instead (item 4 is a copy matter, not a reconciliation one). Every other canonical figure reconciles exactly and is recomputed in DB-08 §9.

---

## 8.10 The A3 adversarial pass — 18 further findings, all accepted

A3 was itself reviewed by an independent adversarial reviewer that authored none of it. It returned
**18 findings (4 CRITICAL, 8 HIGH, 6 MEDIUM)** and the verdict `A3 = FAIL`. Its diagnosis is recorded
without softening, because it identifies the same failure mode one layer up:

> *"A3's author verified that each change record was written, not that each normative table was edited.
> Six of the twelve CRITICAL/HIGH findings are 'A3 says X; the file A3 cites still says not-X.'"*

Twelve findings were **propagation failures** — the change record was right and the normative table was
never edited. Six were **new engineering defects**. All 18 are fixed.

### The four that were genuine engineering errors, not bookkeeping

| ID | Defect | Fix |
|---|---|---|
| **A3R-01** | `IDX-44` serves **one** of the five status-filtered shapes. Firestore matches an index only when the query's equality set is its leading prefix and the `orderBy` follows immediately, so an index with `stockStatus` in the middle does not serve a query that omits it or sorts on something else. The frozen four-filter combination had **no index at all** — the very `F-C-05` failure A3 claimed to close. | **DB-CR-038.** The product list is declared as a **matrix**: 2 modes × 4 filter combinations × 4 frozen sorts = **32 indexes**, of which 11 existed. 21 added (`IDX-47 … IDX-67`), generated from a stated rule rather than transcribed. |
| **A3R-02** | Changing `Q-060`/`Q-058` from `sum('onHandMilli')` to `sum('stockValueMinor')` silently broke their index. `IDX-08` contained the old aggregated field; a *single-field* index on the new one cannot serve `where warehouseId == W`. A3 fixed F-C-02's arithmetic and broke its execution — the dashboard panel would have thrown a missing-index error on first render. | **DB-CR-039.** `IDX-68` `stockBalances (warehouseId, stockValueMinor)` and `IDX-69` `productStockSummaries (productStatus, stockValueMinor)`. |
| **A3R-05** | Two independently-rounded valuation paths with no invariant tying them. `Q-053` rounds per product; `Q-060` rounds per balance. `Σ(round) ≠ round(Σ)`, so a transfer — which `INV-23` guarantees changes no total — could move the reported org total by ±1 minor unit, with `CHART-002`'s bars and the KPI disagreeing **on the same screen**. | **`INV-27`: one rounding point, at the balance grain.** `summary.stockValueMinor == Σ` of that product's balance values, so every higher total is an exact integer sum. `stock.transfer` therefore writes the summary for that one field: write set **6 → 7**. `onHandMilli` on the summary is still untouched, so `INV-04` and the quantity half of `INV-23` remain structural — which was always that invariant's purpose. |
| **A3R-11** | The supplier-archive guard was a maintained `openOrdersCount` **read by the client**, on a `SAFE_DIRECT_CLIENT_WRITE` document, with **no `partner.archive` command in existence**. Worse, the counter had an unreachable zero: its decrements were terminal receipt and cancellation, while DB-06 §3.3 forbids cancelling after any receipt — a stalled `PARTIALLY_RECEIVED` order stranded the supplier permanently. | **`C-38 partner.setStatus`** performs archive/restore as a trusted command with a `limit(1)` guard query **inside its transaction**. `openOrdersCount` is deleted; `status` leaves the client-write allowlist. One read, on one action, no drift, no stuck state. The N+1 concern was always about the *list column*, which `ordersPlacedCount` serves. |

### The one place A3 applied precedence in the wrong direction

**A3R-09 — SCREEN-049 and `CHART-003` are REINSTATED.** §8.5 struck the purchase-order report on the
canonical Gate 6 board's copy (*"The Reports page lists exactly two entries"*), which is authority
**rank 7**. `02_FINAL_REQUIREMENTS_SPECIFICATION` **`FR-DASH-005` is `A-MUST`: "Purchase-Order report."**
— authority **rank 1** — and `23` carries a per-role row for the screen. **Rank 1 outranks rank 7.**
`Q-062` returns, and `CHART-003` is served by five declared `count()` aggregations (`Q-085 … Q-089`) over
the same filter set as the table, so it is a distribution rather than a sample of page 1.

Every other §8.5 deletion was re-checked against `02`, `03`, `05`, `06` and `23` in this pass and each is
a rank-7-over-rank-8 ruling against `19`/`22` only. The reviewer was right that the first pass never
performed that check.

### The one finding refuted, on the canonical bytes

**A3R-06 — REJECTED.** The reviewer held that the seed's `8 PACK` + `2 PACK` receipts were lifted from the
**superseded** Gate 9 file, and that single-shipment semantics imply a single receipt and therefore
**16** movements, not 17. The canonical `e1003987…` was re-read in this pass and says both things, in the
same timeline:

- line 465–466 — *"Fresh Foods Ltd shipped 10 PACK · **The whole order, in one shipment**, sent the same day they accepted it. Your stock changes only when you receive it."*
- line 461 — *"You received 8 PACK"* · line 484 — *"That you received **8 PACK, and later 2 PACK**."*
- line 429 — the `Receive 2 PACK` action · line 448 — *"Outstanding · 2 PACK · **Of the 10 PACK shipped on 11 Aug**"*

**One shipment, two receipts.** `NO MULTI-SHIPMENT` constrains `cpo.ship`; partial **receiving** is an
explicit Release A capability, and `PARTIALLY_RECEIVED` exists precisely for it. The superseded file's
defect was *"shipped in two parts"* and *"Fresh Foods Ltd shipped 8 PACK · Part of the order"* — a split
**shipment**, which is a different thing. The five later movements and the 17 total stand.

The reviewer's secondary point is accepted and fixed: A3 never stated the shipment/receipt distinction
explicitly, which is what made the finding possible. DB-08 §4 now labels each step **ship** or **receive**.

### The twelve propagation failures — all applied to the normative tables

`A3R-03` DV-11 rewritten in DB-07 §12 (it still named `warehouseName` and still asserted the reversed
DB-CR-018 ruling) · `A3R-04` DB-03 §2/§3 and DB-11 §B/§H rows edited, not merely annotated · `A3R-07`
`Q-084` filtered a field that does not exist — replaced by `Q-084a`/`Q-084b` matching the board's frozen
*"Search by order number or supplier"* · `A3R-08` `Q-083` cited `Q-013b` (the stock-status filter, not a
name prefix), an undefined `limit 10`, an undetectable overflow, and excluded archived products from a
permanent ledger — replaced by `Q-015r` at `limit(11)` over `productStatus in ['ACTIVE','ARCHIVED']` ·
`A3R-10` `Q-009` still declared the `role ==` filter and `displayName` sort A3 said it had dropped ·
`A3R-12` five commands had no §6 transaction row and `C-02`'s `T` column still read `–` · `A3R-13` three
counts wrong (invariants **25**, not 24; commands **38**; queries **91**) — *`A3R-P` corrects two of these
one step further: the invariant total is **26** once `A3R-05`'s own `INV-27` is counted, and the query
total is **92** once `A3R-11`'s own guard is defined (`Q-080`). A3R fixed the counts it inherited and did
not re-count after its own additions.* · `A3R-14` the notification
`category` enum did not cover `MEMBERSHIP_CHANGED`, so the board's `8 = 4 + 2 + 2` tab arithmetic would
break on the first team-role change — a total mapping table is now declared · `A3R-15` `JOINED_LISTS = 0`
was still false: the ledger's *Store room* column had no producer, and the board **requires a snapshot**
(*"Its past movements keep the name, so old lines still read correctly"*) — `DV-14` adds
`warehouseNameSnapshot` · `A3R-16` `TABLE-027` had two conflicting producers and `Q-058`'s
`onHandMilli > 0` predicate would have reported Main Store as holding **5** products where the board says
**6** · `A3R-17` the dashboard budget still priced Needs Attention at the deleted query's cost; the two
queries are now sequential (`limit(5)`, then `limit(5 − k)`), ≤ 6 reads, warm shell **12** ·
`A3R-18` `product.update` never said a `minimumStockMilli` change recomputes the **summary's**
`stockStatus`, and `Q-079`'s `limit(100)` could silently truncate — `warehouse.create` now refuses beyond
**100 ACTIVE warehouses**, making the fanout provably complete.

### What the reviewer checked and could not break

The DB-CR-018 reversal on its own terms · the seed arithmetic, recomputed independently
(`564,200 + 127,500 = 691,700`; Cold Room `271,400 + 127,500 = 398,900`; Main Store `292,800`) ·
`DV-09`-class snapshots · `IDX-46` and the two-query Needs Attention ordering · `DB-CR-029`'s
`Excluded | Only` · `IDEMPOTENT_COMMANDS = 17` · the 500-document transaction ceiling
(`product.update` ≈ 105 writes) · the Firestore `in` ceiling of 30 · `stock.transfer` needing no summary
**quantity** write.

```
A3R_FINDINGS      = 18     ACCEPTED = 17     REJECTED = 1 (A3R-06, on the canonical bytes)
A3R_PATCHED       = 17 / 17
NEW_CHANGE_RECORDS = DB-CR-038, DB-CR-039, C-38, INV-27, DV-14
```

---

# 8.11 AMENDMENT A3R-P — A3R PROPAGATION CLOSURE

**This is not an architecture pass.** No decision of A1, A2, A3 or A3R is reopened, no schema semantics
change, no feature is added or removed, no visual design is touched, and no production code exists to
change. `A3R-P` does one thing: it makes every normative file physically agree with the already-approved
`A3R` state, and it derives every current-state count **mechanically from the normative tables** rather
than copying it from a prior summary.

## Why it was needed

`A3R` diagnosed A3's failure mode precisely — *"the change record was written, the normative table was
not"* — and then reproduced a narrower version of it. A3R corrected the counts it **inherited** and did
not re-count after its **own** additions, and it wrote its new objects into the amendment record while
several normative files kept the A3 text. An export-byte inspection found `A3R` correct in the amendment
and readiness documents and stale in the files an implementer actually builds from.

The rule, restated one level up: **a propagation pass must re-derive every count from the tables, after
its own edits, including the counts the previous pass just fixed.**

## The defects closed

| # | Defect | Where it stood | Resolution |
|---|---|---|---|
| **P-01** | `DB_01` §16 carried the A3-era line *"44 indexes · 38 callables · 84 query ids · 13 derived contracts · 25 invariants"* as current truth | `DB_01` | Replaced with the mechanically derived set and the invariant arithmetic written out. The old line is retained, explicitly labelled `HISTORICAL (PRE-A3R)`. |
| **P-02** | `DB_03` §0.A3 still stated **SCREEN-049 + `CHART-003` = omitted**, contradicting `A3R-09` | `DB_03` | The annotation **and** the normative `049` row in §3 are rewritten: `Q-062` + `Q-085 … Q-089`, `CHART-003` drawn from the complete distribution, roles `O/A/IM/PM/AN` with `SK`/`V` denied per `DB_05` §4.0 and `DB_11` §E.3. |
| **P-03** | `DB_03` cited `Q-083 → Q-013b/Q-015` and a singular `Q-084` | `DB_03` | `Q-083` resolves through **`Q-015r`**; `TABLE-010` search is **`Q-084a`** (order number) and **`Q-084b`** (supplier, via resolver, `IDX-26`). Propagated to the `SCREEN-017` and `SCREEN-021` rows and to `DB_11` §A.2. |
| **P-04** | `DB_11` presented A2-era inventory (*78 queries · 43 indexes · 36 commands · 11 derived contracts*) and `FRONTEND_DB_INDEPENDENT_REVIEW = NOT PERFORMED` as current | `DB_11` | §F, §I, §J and §K are labelled `HISTORICAL / SUPERSEDED` where they are audit trail, and a new **§M** carries the A3R-P inventory. Both completed independent reviews are recorded. |
| **P-05** | `FRONTEND_BACKEND_CONTRACT` asserted *"one of the 84 declared query ids"* | `docs/implementation/` | Restated to the verified total, with the A3R query families (`Q-083`, `Q-084a/b`, `Q-085 … Q-089`, `Q-015r`) named. |
| **P-06** | Invariant total stated as **25** in `DB_00` §8.8, `DB_01`, `DB_07` §11, `INTEGRATION_STATUS` and the handoff | pack-wide | Recounted: `INV-01…INV-24` active (24) − `INV-25` withdrawn + `INV-26` + `INV-27` = **26**. `INV-25`'s number is a preserved tombstone. `INV-26` and `INV-27` are added to `T-INT-03`'s executable obligations (`DB_07` §11, `DB_08` §6.1). |
| **P-07** | `DB_07` §12 was headed *"DV-01 … DV-13"* while `DV-14` sat inside it | `DB_07` | Heading and every current-state count corrected to **`DV-01 … DV-14` = 14**. |
| **P-08** | Owner-item count read **3** in `DB_00` §8.9 and `IMPLEMENTATION_CHECKPOINT`, **4** in `DB_10`, `INTEGRATION_STATUS` and the handoff | pack-wide | The list is now the single source and the count is derived from it: **4**, numbered 1–4 in `DB_00` §8.9, with every citing file using that numbering. |
| **P-09** | **`Q-085g`** — the `C-38 partner.setStatus` archive guard — was referenced in `DB_06` §6.2 and `DB_07` §12 and **defined nowhere**. It also collided with `Q-085 … Q-089`, the `CHART-003` aggregations. | `DB_04`, `DB_06`, `DB_07` | Defined as **`Q-080`** in `DB_04` §8 (`purchaseOrders where privateSupplierId == P and status in [ORDERED, PARTIALLY_RECEIVED, ACCEPTED, SHIPPED] limit(1)`, index `IDX-26`, inside the transaction). This is `A3 · F-H-01` exactly one pass later: a command-internal query created inside `DB_06` and never back-ported to `DB_04`, while `QUERY_COVERAGE = 100%` was claimed. **`ACTIVE_QUERY_IDS` 91 → 92.** |

## The stale-assertion sweep — every string below is SUPERSEDED text, quoted only to record its removal

Each was a contradiction with the final `A3R` tables, not a new decision. **Nothing in this table is
current truth.** Read the *Replaced with* column for the current state.

| File | SUPERSEDED string it carried | Replaced with |
|---|---|---|
| `DB_05` §4.0.1, §9 group 25, §10 | *"the **eleven** client-listed collections"* / `QUERY_LIMIT_ENFORCED = 11` | **nine** — `A3 · F-H-10`'s definitive set; the `users/{uid}/memberships` row is now marked in the §4 table |
| `DB_05` §4 table | `privatePartners` ARCHIVE = *"via `status` (client)"* | `COMMAND_ONLY — C-38 partner.setStatus`; `status` and `ordersPlacedCount` left the client-write allowlist at `A3R-11` |
| `DB_08` §6.4 `T-XFER-01` | *"writes exactly **six** documents"* | **seven** — `A3R-05` added the summary's `stockValueMinor` write |
| `DB_08` §6.4 `T-XFER-03` | *"`ProductStockSummary` is **byte-identical**"* | `onHandMilli`/`availableMilli`/`stockStatus` unchanged; `stockValueMinor` = Σ of the product's balance values (`INV-27`) |
| `DB_08` §6, §9 | command tests *"8 cases × **34** commands"* | **8 × 37** — the 38 A/B callables less the optional `C-03` |
| `DB_08` §6.1 `T-INT-03` | the withdrawn `INV-25` assertion, and *"no persisted per-row status"* | `INV-25` removed; `INV-26`, `INV-27` and `DV-14` added as executable assertions |
| `DB_09` §8, §11 | *"there is no persisted per-row status field"* + the §11 stop-condition forbidding it | reversed by `DB-CR-025` — `stockStatus` **is** persisted on the balance row; `INV-26` asserts it |
| `DB_09` §2, §3 | index set *"**44** total"* | **67** composite, the 32-index matrix generated from the `DB-CR-038` rule |
| `DB_09` §12 | *"all **36** command signatures"* | **38** Release-A/B callables |
| `DB_11` §A.2 | `TABLE-001` index set `IDX-33…37 / 39…43`; `TABLE-013`/`TABLE-014` query sets; the `024–027` panel row's withdrawn-`Q-021` empty copy and `IDX-04` attribution | the full 32-index matrix; `+Q-061b`; `+Q-085…Q-089`; `IDX-46`/`IDX-68` and the `DB-CR-028` empty copy |
| `DB_03` §2 | `TABLE-001` displaying *"preferred supplier, updated"* | the six canonical columns — `A3 · F-H-04`/`F-M-04` deleted both |
| `DB_06` §6.2 | *"**three** commands … had no row"* | **five**, plus `stock.transfer` amended — and the mangled inline `TRANSACTION_COVERAGE` paste is repaired |

## What A3R-P did NOT do

It reopened no accepted decision, changed no schema semantics, added no feature, removed no feature,
touched no visual design, started no Codex work and wrote no production code. `Q-080` is **not** a new
query: it is the guard `A3R-11` specified in prose, given the id its own file's coverage rule requires.
No invariant, query, index, command or derived contract was renumbered — every gap is a tombstone and
every tombstone is evidence of a decision.

## Result

```
A3R_P_SCOPE            = PROPAGATE · COUNT · CROSS-REFERENCE · VERIFY
A3R_P_DEFECTS          = 9 named (P-01 … P-09) + the stale-assertion sweep
A3R_P_PATCHED          = 9 / 9
NEW_SEMANTIC_CONTRADICTIONS_FOUND = 0
NEW_CHANGE_RECORDS     = Q-080 (identifier only; the query itself is A3R-11's)

ACTIVE_QUERY_IDS             = 92     ACTIVE_INDEX_IDS            = 67
ACTIVE_COMMAND_IDS           = 38     ACTIVE_INVARIANT_IDS        = 26
ACTIVE_DERIVED_CONTRACT_IDS  = 14     OWNER_DESIGN_SIDE_ITEMS     = 4

UNDEFINED_QUERY_IDS = 0   UNDEFINED_INDEX_IDS = 0   UNDEFINED_COMMAND_IDS = 0
UNDEFINED_INVARIANT_IDS = 0   UNDEFINED_DV_IDS = 0   STALE_CURRENT_ASSERTIONS = 0

SCREEN_049 = INCLUDED     CHART_003 = INCLUDED
PRODUCTION_CODE_CHANGED = NO   DESIGNS_MODIFIED = NO   CANONICAL_SEED_FIGURES_CHANGED = NO

A3R_P_PROPAGATION_CLOSURE    = COMPLETE
DATABASE_ARCHITECTURE_FROZEN = YES
DATABASE_IMPLEMENTATION_READY = YES
NEXT_ACTION                  = CODEX_FIREBASE_FOUNDATION
```

*(HISTORICAL from here down for this section: `NEXT_ACTION = CODEX_FIREBASE_FOUNDATION` was **satisfied** by
the Codex C1 Firebase Foundation. The current state is in **§8.12 — A3R-P2** below.)*

---

# 8.12 AMENDMENT A3R-P2 — C1 IMPLEMENTATION-DISCOVERY PROPAGATION

**Scope:** propagation only, plus **one owner-approved semantic exception**. `A3R-P2` reopens no accepted
decision, adds no feature, removes no feature, touches no visual design, changes no canonical seed figure,
no path, no RBAC rule, no state-machine semantics, and no production or C1 implementation code. It makes the
current normative database and implementation documents physically agree with seven rulings that were
already accepted during the executable **Codex C1** foundation.

**Source evidence, not amended by this pass:** `docs/implementation-evidence/C1_COMPLETION_REPORT.md` and
`docs/implementation-evidence/C1_AUTHORITY_DISCREPANCIES.md`. They record what C1 found **before**
propagation and are retained as historical evidence.

## Authority applied

`DB-02` controls persisted fields and enums unless superseded by an already-approved amendment.
`DB-CR-038` controls the generated product-list index matrix. **`C1-AUTH-007` is an explicit OWNER ruling
and therefore supersedes the incompatible `DB-02` non-zero wording for `OPENING_BALANCE`.** Clearly
labelled historical text may keep its earlier values; every **current** statement must agree.

## The seven items

| ID | Final current representation | Class | Files propagated |
|---|---|---|---|
| **C1-AUTH-001** | `MovementType = OPENING_BALANCE · ADJUSTMENT_IN · ADJUSTMENT_OUT · PURCHASE_RECEIPT · CONNECTED_DISPATCH_OUT · TRANSFER_OUT · TRANSFER_IN` — the generic `ADJUSTMENT` is not a storage value | propagation correction | `DOMAIN_TYPES`, `COMMAND_CONTRACTS` |
| **C1-AUTH-002** | `ConnectionStatus = PENDING · ACTIVE · REJECTED · DISABLED` — `DECLINED` is not a stored value | propagation correction | `DOMAIN_TYPES` |
| **C1-AUTH-003** | `MappingStatus = VERIFIED · DISABLED` — `DRAFT` and `INVALID` are not Release A/B mapping states, and `PENDING`/`REJECTED` stay B-PLUS-only | propagation correction | `DOMAIN_TYPES` |
| **C1-AUTH-004** | Private partners: bounded `partnerTypes: ('SUPPLIER'\|'BUYER')[]` (≥ 1, ≤ 2) and `PartnerStatus = ACTIVE \| DEACTIVATED`. UI **archive → `DEACTIVATED`**, **restore → `ACTIVE`**; `ARCHIVED` is never persisted here. `C-38 partner.setStatus` remains the trusted status-changing command, authorization and guard unchanged | propagation correction | `DB_05` (`T-SEC-41`), `DB_07` §5, `DOMAIN_TYPES` |
| **C1-AUTH-005** | `UserStatus = ACTIVE \| DISABLED` — `DB-02` §2.1 already owned both values; the narrowing to `ACTIVE` only was the derived copy's defect | propagation correction | `DOMAIN_TYPES` |
| **C1-AUTH-006** | `IDX-36 = productStockSummaries · productStatus ASC, stockStatus ASC, onHandMilli DESC`. Every product-list matrix variant sorting on `onHandMilli` is `DESC`, because the later `DB-CR-038` matrix rule controls. **No index added, deleted or renumbered:** `ACTIVE_INDEX_IDS = 67`, `PRODUCT_LIST_MATRIX_INDEXES = 32` | propagation correction | `DB_04` (`Q-013b`, `IDX-36`) |
| **C1-AUTH-007** | `if movementType == OPENING_BALANCE: signedQuantityMilli >= 0` · `else: signedQuantityMilli != 0`. `C-13 stock.recordOpeningBalance` accepts `quantityMilli >= 0` and a zero creates the deliberate immutable zero opening-ledger entry | **OWNER-APPROVED SEMANTIC EXCEPTION** | `DB_02` §4.6, `DB_06` §3 / §3.1, `DB_08` §2, `DB_09` §13, `DOMAIN_TYPES`, `COMMAND_CONTRACTS`, `FRONTEND_BACKEND_CONTRACT` |

**Six are propagation corrections** discovered while implementing C1: in each case `DB-02` was already
right and a derived document had drifted, which is why none of the six reached the shared code.
**One — `C1-AUTH-007` — is a genuine semantic exception**, and it is recorded here in the controlled
authority chain rather than left in implementation evidence.

## Why the zero opening balance is approved

`DB-02` said every `signedQuantityMilli` is non-zero. `DB-08` §2 requires **Cooking Oil** to carry an
explicit `OPENING_BALANCE` of `0`, because *"a product with no movement and a product at zero are different
states, and the out-of-stock KPI must be provable from the ledger"*. Both cannot hold. The owner ruled for
`DB-08`'s semantics, narrowly:

```text
movementType = OPENING_BALANCE     signedQuantityMilli = 0     balanceAfterMilli = 0
```

Zero stays **rejected** for `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `PURCHASE_RECEIPT`,
`CONNECTED_DISPATCH_OUT`, `TRANSFER_IN` and `TRANSFER_OUT` — a zero-quantity movement of any of those types
records no event. The exception preserves the twelve t₀ opening movements and a ledger-provable
out-of-stock state without admitting meaningless zero adjustments, receipts, dispatches or transfers.
Consequence for the command layer, stated once so it cannot be missed: **the shared non-zero quantity
validator must not be applied to `C-13`**, and `INVALID_QUANTITY` applies to `C-13` only for a negative
value or precision > 3 dp.

## Current project state after A3R-P2

```text
CODEX_FOUNDATION             = COMPLETE      C1_FOUNDATION_COMPLETE = YES
A3R_P2_PROPAGATION           = COMPLETE

ACTIVE_QUERY_IDS             = 92     ACTIVE_INDEX_IDS            = 67
ACTIVE_COMMAND_IDS           = 38     ACTIVE_INVARIANT_IDS        = 26
ACTIVE_DERIVED_CONTRACT_IDS  = 14     PRODUCT_LIST_MATRIX_INDEXES = 32
```

The active architecture counts are **unchanged** by this pass — they were re-derived from the normative
tables after these edits, not copied forward. The superseded figures `QUERY IDS = 91` and `INVARIANTS = 25`,
and the superseded current claims `CODEX FOUNDATION = NOT STARTED` and
`NEXT_ACTION = CODEX_FIREBASE_FOUNDATION`, are removed from every **current** statement and survive only
where a document is explicitly labelled historical.

## Evidence boundary preserved

The C1 bootstrap tests (`T-SEED-01a-BOOTSTRAP` / `T-SEED-01b-BOOTSTRAP`, `seed:bootstrap` /
`replay:bootstrap`) are **fixture, schema, arithmetic and reproducibility** evidence. They are **not**
command, RBAC, Security-Rules, transaction, audit, notification, concurrency or idempotency evidence, and
`A3R-P2` does not upgrade them. The canonical `T-SEED-01a` / `T-SEED-01b` remain command-driven and stay
reserved for the real command layer (`DB_08` §6.5).

## What A3R-P2 did NOT do

No decision reopened. No business scope, path model, RBAC rule, state-machine semantic, visual design or
canonical seed figure changed. No command, query, index, invariant or derived-contract id was added,
removed or renumbered. No Firestore Security Rule, command body, C2 query implementation or frontend code
was written. **No file under `packages/**`, `scripts/**`, `functions/**`, `tests/**`, `src/**`, nor
`firestore.indexes.json`, `firebase.json`, `package.json` or `package-lock.json` was created or modified by
this pass** — the C1 changes already present in those paths were left exactly as C1 wrote them.

## Result

```text
A3R_P2_SCOPE                      = PROPAGATE · RECORD OWNER EXCEPTION · VERIFY
C1_AUTH_DISCREPANCIES             = 7
C1_AUTH_DISCREPANCIES_PROPAGATED  = 7 / 7
OWNER_APPROVED_SEMANTIC_EXCEPTION = C1-AUTH-007
NEW_ARCHITECTURE_DECISIONS_INTRODUCED = NO
NEW_SEMANTIC_CONTRADICTIONS_FOUND = 0

ZERO_OPENING_BALANCE_RULE = PROPAGATED       IDX_36_DIRECTION = DESC
C13_SYNCHRONIZED          = YES              STALE_CURRENT_ASSERTIONS = 0

UNDEFINED_QUERY_IDS = 0   UNDEFINED_INDEX_IDS = 0   UNDEFINED_COMMAND_IDS = 0
UNDEFINED_INVARIANT_IDS = 0   UNDEFINED_DV_IDS = 0

BUSINESS_SCOPE_CHANGED = NO   PATH_MODEL_CHANGED = NO   RBAC_CHANGED = NO
STATE_MACHINE_SEMANTICS_CHANGED = NO   CANONICAL_SEED_FIGURES_CHANGED = NO
PRODUCTION_CODE_CHANGED = NO   DESIGNS_MODIFIED = NO
PREEXISTING_C1_CHANGES_PRESERVED = YES

DATABASE_ARCHITECTURE_FROZEN     = YES
FOUNDATION_READY_FOR_CLAUDE_CODE = YES
CODEX_C2_FOUNDATION_PREREQUISITES = SATISFIED
FRONTEND_FOUNDATION_PREREQUISITES = SATISFIED
NEXT_ACTION                      = PREPARE_PARALLEL_IMPLEMENTATION_LANES

LANE_A = CODEX_C2_READ_QUERY_LAYER
LANE_B = CLAUDE_CODE_SECURITY_RULES_AND_BACKEND_SEQUENCE
LANE_C = ANTIGRAVITY_FRONTEND_IMPLEMENTATION
```

---

# 8.13 OWNER DECISION — DV-12 LIFETIME PLACED-ORDER SEMANTIC

**DB-CR-040 — ADOPTED 2026-08-24.** A bounded QA review found that DV-12's current rebuild row excluded
`CANCELLED` while every current command contract and the frozen backend maintained the field only at
`cpo.submit`. The owner resolved the contradiction without rewriting the historical evidence that exposed
it:

```text
OWNER_DECISION_DV12 = LIFETIME_PLACED_ORDERS

ordersPlacedCount is a historical connection-activity counter.

successful cpo.submit       +1
later cpo.cancel             0
accept/reject/ship/receive   0
```

A connected purchase order contributes exactly once when `cpo.submit` successfully places it. A later
lifecycle transition, including `CANCELLED`, does not erase that historical fact and does not decrement
the counter. This is intentionally different from private-partner DV-13, whose owner-approved meaning is
non-cancelled private orders.

## Mechanically verified submission evidence

`submittedAt` is the persisted marker for successful connected submission:

1. `cpo.draftSave` creates a `DRAFT` without `submittedAt`.
2. `cpo.submit` creates the canonical record and both projections with the same server-generated
   `submittedAt` in the transaction that increments both connection projections.
3. Every later connected transition uses partial updates and retains `submittedAt`, including
   `SUBMITTED → CANCELLED`.
4. The shared purchase-order schema accepts `submittedAt` as a Firestore timestamp.

Therefore DV-12 rebuild means: for one connection, count canonical connected purchase orders carrying a
valid `submittedAt`. Current status is not a rebuild predicate; a submitted order still contributes after
becoming `CANCELLED`. An unsubmitted `DRAFT` cannot contribute.

## Propagation and scope

The current normative DV-12 rows in `DB_07` and the affected current schema, command and frontend
contracts are corrected by this same forward amendment. Historical implementation-evidence files remain
unchanged. No backend, frontend, Rules, path, schema, query, index, command, invariant or derived-contract
identifier is added, removed or renumbered.

```text
DV12_SEMANTIC                  = LIFETIME_PLACED_ORDERS
DV12_SUBMISSION_MARKER         = submittedAt
DV12_REBUILD                   = count valid submittedAt for the connection
FROZEN_BACKEND_BEHAVIOR_CHANGE = NO
FRONTEND_MACRO_B_CHANGE        = NO

ACTIVE_QUERY_IDS             = 92
ACTIVE_INDEX_IDS             = 67
ACTIVE_COMMAND_IDS           = 38
ACTIVE_INVARIANT_IDS         = 26
ACTIVE_DERIVED_CONTRACT_IDS  = 14
```
