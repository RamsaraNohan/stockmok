# Stockmok — Final Reconciliation Report v3.0

**Status:** the audit record and decision history for the final pre-implementation control pass.
**Project:** Stockmok — Cloud Multi-Tenant Inventory & Procurement Management System.
**Coursework:** PUSL2021 Referral Coursework 2025/26 (Element C1, individual).
**Review date:** 09–10 August 2026.
**Deadline:** **24 August 2026** (student-confirmed; the brief itself states TBA and the DLE is not accessible for re-verification).
**Presentation:** **not required** (student-confirmed).
**AI tool use:** **permitted by the university and the module** (student-confirmed). The brief's own-work, referencing and plagiarism requirements still apply in full.

---

# 1. READ_CONFIRMATION

Every mandatory file was located and read in full before any recommendation was made.

### FILE: PUSL2021 Referral Coursework 2025/26 brief
- **FOUND:** YES — `Stockmok_Final_Control_Pack_v2_10of10/PUSL2021 Referral C1.docx`
- **READ COMPLETELY:** YES — all 88 body paragraphs, both assessment tables and the rubric extracted from the document XML
- **PURPOSE:** defines what is actually being marked
- **AUTHORITY AREA:** supreme authority for every coursework requirement
- **IMPORTANT DEPENDENCIES:** everything. `02` §9, `08` and `16` all derive from it

### FILE: 01_FINAL_RECONCILIATION_REPORT.md (v2)
- **FOUND:** YES · **READ COMPLETELY:** YES (393 lines)
- **PURPOSE:** decision history and rationale from the previous pass
- **AUTHORITY AREA:** decision history
- **DEPENDENCIES:** references all other eight; carried RC-01 … RC-18 forward

### FILE: 02_FINAL_REQUIREMENTS_SPECIFICATION.md (v2)
- **FOUND:** YES · **READ COMPLETELY:** YES (340 lines)
- **PURPOSE:** functional, non-functional, business, security and administrative requirements
- **AUTHORITY AREA:** requirements
- **DEPENDENCIES:** `03` scope, `05` data, `06` security, `08` tests

### FILE: 03_FINAL_SCOPE_FREEZE.md (v2)
- **FOUND:** YES · **READ COMPLETELY:** YES (320 lines)
- **PURPOSE:** what is and is not built
- **AUTHORITY AREA:** scope and feature cuts
- **DEPENDENCIES:** `02` priorities, `12` schedule

### FILE: 04_FINAL_USE_CASES_AND_ACCEPTANCE.md (v2)
- **FOUND:** YES · **READ COMPLETELY:** YES (503 lines)
- **PURPOSE:** story-level acceptance contract
- **AUTHORITY AREA:** use cases and end-to-end behaviour
- **DEPENDENCIES:** `02`, `05` state machines, `08` tests, `16` demo script

### FILE: 05_FINAL_DOMAIN_AND_DATA_CONTRACT.md (v2)
- **FOUND:** YES · **READ COMPLETELY:** YES (782 lines)
- **PURPOSE:** entities, paths, states, invariants, ownership
- **AUTHORITY AREA:** data contract
- **DEPENDENCIES:** `06` rules, `11` implementation, `08` integrity tests

### FILE: 06_FINAL_SECURITY_AND_RBAC_MODEL.md (v2)
- **FOUND:** YES · **READ COMPLETELY:** YES (351 lines)
- **PURPOSE:** authentication, authorization, rules, trust boundary, threat model
- **AUTHORITY AREA:** security
- **DEPENDENCIES:** `05` paths, `11` rules implementation, `08` security tests

### FILE: 07_FINAL_UI_INFORMATION_ARCHITECTURE.md (v2)
- **FOUND:** YES · **READ COMPLETELY:** YES (752 lines)
- **PURPOSE:** routes, screens, navigation, states
- **AUTHORITY AREA:** UI information architecture
- **DEPENDENCIES:** `02` requirements, `06` roles, `17` design brief

### FILE: 08_FINAL_TEST_AND_QA_MATRIX.md (v2)
- **FOUND:** YES · **READ COMPLETELY:** YES (415 lines)
- **PURPOSE:** test levels, cases, gates, evidence
- **AUTHORITY AREA:** verification
- **DEPENDENCIES:** every requirement, invariant and use case

### FILE: 09_FINAL_IMPLEMENTATION_READINESS_GATE.md (v2)
- **FOUND:** YES · **READ COMPLETELY:** YES (349 lines)
- **PURPOSE:** go/no-go conditions
- **AUTHORITY AREA:** readiness
- **DEPENDENCIES:** all of the above

**FILES_REQUIRED: 10 · FILES_READ: 10 · MISSING: 0 · UNREADABLE: 0.** No STOP condition was triggered.

---

# 2. Technical verification against current primary sources

Verified on 09 August 2026 against official Firebase documentation and the public npm registry. Full detail, with consequences, is in `10` §1. The findings that changed the architecture:

| # | Verified fact | Consequence |
|---|---|---|
| VF-03 | Security Rules permit **10 document access calls** per single-document or query request (20 for multi-document reads, transactions and batched writes); identical calls are cached. | **A rule may only `get()` a path that is constant across the whole request.** This single fact forced the cross-tenant redesign in ISS-001. |
| VF-04 | Rules `get()` calls are billed **even when the request is denied**. | Keep rules shallow; push cross-tenant checks into the backend. |
| VF-05 | Rules are not filters; a query fails unless the ruleset can permit the whole potential result set. | No cross-tenant list query may exist. |
| VF-06 | The Admin SDK **bypasses Security Rules entirely**. | Every Cloud Function must re-authorize explicitly. Implemented once in `defineCommand()`. |
| VF-01 | Production Cloud Functions require the **Blaze** plan; Blaze includes a substantial no-cost tier. | Day-1 decision; expected spend ≈ $0. |
| VF-02 | Cloud Storage for Firebase also requires Blaze. | Storage removed entirely; monogram identity instead. |
| VF-07 | Firestore supports `count()`, `sum()` and `average()` at read time, billed at one read per 1000 index entries. | Made the Inventory Value KPI implementable within bounded cost (ISS-010). |
| VF-08 | Firestore warns about sustained write rates to a single document (500/50/5). | `ProductStockSummary` documented as a known hotspot with a future path. |
| VF-09 | Cloud Functions fully support Node 20 and 22. | Runtime pinned to Node 22. |
| VF-10 | The Local Emulator Suite emulates Auth, Firestore with rules, Functions (including callables) and Hosting. | 100 % of development and automated testing runs offline and free. |

Current published versions were checked directly against the npm registry; the observed values and the resulting version policy are in `10` §1 and §17. One notable consequence: **TypeScript's current release is 7.0.2 (the native compiler port), but `typescript-eslint` is built against the 5.x line, so TypeScript is deliberately pinned to `~5.9.3`.** Adopting a compiler rewrite during a 13-day graded build is uncompensated risk.

---

# 3. FINAL_COURSEWORK_TRACEABILITY_MATRIX

Every requirement is taken verbatim from the brief. "Implementation evidence" names where it is built; "test evidence" names the verifying test; "report evidence" names the report section in `16` §2.

| CW-ID | Actual requirement | Exact brief location | Stockmok requirement IDs | Implementation evidence | Test evidence | Report evidence | Demo evidence | Status |
|---|---|---|---|---|---|---|---|---|
| CW-01 | "Coursework Type: Individual Assignment" | header block | ADM-007, ADM-008 | one repository, one author, commit history with task ids | CI history | §11 individual contribution | git log shown | **PASS** |
| CW-02 | "design and implement a Management System of your choice" | Project Requirement | product objective `02` §1 | the whole system | T-UI-01 | §1, §4 | full demo | **PASS** |
| CW-03 | "must be a fully working software application" | Project Requirement | all A-MUST | Release A deployed to production | GATE-A, T-NFR-06..08 | §6 | live URL | **PASS (build pending)** |
| CW-04 | "Create records" | Project Requirement | FR-INV-001..003, FR-PART-001/002, FR-PO-001, FR-TEAM-001, FR-ORG-001 | product/category/warehouse/partner/PO/invitation/organization creation | T-CRUD-01, T-PART-01, T-PPO-01, T-ORG-01 | §6 | demo beat 6 | **PASS** |
| CW-05 | "Read/View records" | Project Requirement | FR-INV-007/012, FR-STOCK-011, FR-DASH-001..005 | lists, detail pages, dashboard, reports, movement history, audit | T-CRUD-02, T-REPORT-06/07 | §6 | beats 4, 5, 8, 19 |**PASS** |
| CW-06 | "Update records" | Project Requirement | FR-INV-001, FR-TEAM-006, FR-PO-003 | product/category/warehouse/partner edits, role changes, PO transitions | T-CRUD-03, T-ORG-05 | §6 | beat 6 | **PASS** |
| CW-07 | "Delete records" | Project Requirement | FR-INV-008, FR-PART-005, BR-013, INV-21 | archive and deactivate everywhere; hard delete denied by rules to protect history | T-CRUD-04, T-SEC-19 | §4 + §10 — **must be presented as a deliberate integrity decision, with the rule shown** | beat 6 | **PASS with an explanation obligation** |
| CW-08 | "with the connection of Database" | Technical Expectations | SEC-001, `05`, `11` | Firebase Auth + Cloud Firestore, transactions, rules, indexes | T-NFR-02, T-INT-01..03 | §3, §4 | beat 20 (Firestore console) | **PASS** |
| CW-09 | "All major features must be fully functional" | Technical Expectations | `03` scope freeze | scope freeze plus release gates stop half-features counting | GATE-A, GATE-B-LITE | §7 | full demo | **PASS** |
| CW-10 | "The project must be your own work – individual submission only" | Technical Expectations | ADM-007 | student specifies, reviews and commits everything; five-file explain test | — | §11 + AI statement | — | **PROCESS REQUIREMENT** |
| CW-11 | "Final report … on the DLE" | Deliverables | ADM-006 | Stage 20 | — | the report itself | — | **PENDING (S20)** |
| CW-12 | "Completed project source code … on the DLE" | Deliverables | ADM-006 | SF-0410 packaging task | — | — | — | **PENDING (S20)** |
| CW-13 | "Upload project source code to GitHub" | Deliverables | ADM-003 | public repository from Day 1 | — | §11 | beat 22 | **PENDING → in progress Day 1** |
| CW-14 | "provide access to the link for all users (evaluators) or you will get zero marks" | Deliverables | ADM-003 | public repository; verified signed-out | SF-0396 | title page + §11 | beat 22 | **PENDING — highest-consequence item in the project** |
| CW-15 | "Get the GitHub Repository link and copy and paste it to the Final Report" | Deliverables | ADM-004 | SF-0406 | — | title page | — | **PENDING (S20)** |
| CW-16 | "upload the PDF file after renaming it with your index number" | Deliverables | ADM-005 | SF-0409 | — | filename | — | **PENDING (S20)** |
| CW-17 | "Producing an error free system will give you 50% from allocated marks" | Assessment criteria table | all P0 tests, NFR-015 | full test suite, CI, zero Critical/High | every P0 test | §7 | beat 21 | **PASS by design** |
| CW-18 | "Full marks will be given on the quality, performance and adaptability" | Assessment criteria table | NFR-016, NFR-017, NFR-019 | design system, typed contracts, aggregation queries, bounded queries, tokens, roles-as-data, feature flags | T-PERF-01..04, T-UI-07 | §8 | beats 4, 19 | **PASS by design** |
| CW-19 | "reflect report … containing all technologies, explanation, problems and solutions found" | Assessment criteria table | ADM-007 | `10` (technologies) + `docs/PROGRESS.md` (problems) | — | §3, §9, §10 | — | **PLANNED (`16`)** |
| CW-20 | "Report should be properly written and descriptive" | Assessment criteria table | ADM-007 | structure in `16` §2, figures, captions, references | — | whole report | — | **PLANNED** |
| CW-21 | plagiarism, own words, referencing, Turnitin | General Guidance | ADM-007 | `docs/references.md` from Day 1; Draft Coach; student-written prose | — | references section | — | **PROCESS REQUIREMENT** |
| CW-22 | "Submission Deadline: TBA" | header block | ADM-001 | plan targets 22 Aug completion, 24 Aug deadline | — | — | — | **ASSUMPTION — student-confirmed 24 Aug** |
| CW-23 | "within 20 working days of the submission and presentation" | Assignment Feedback | ADM-002 | student confirms no presentation; a demo recording is produced regardless | — | appendix E | recording | **CLOSED** |
| CW-24 | Rubric: "High-quality, adaptable system with excellent reflection and clear individual contributions" (1st, 70 %+) | Assessment rubrics table | all | the entire pack is aimed at this row | all | whole report | full demo | **TARGET** |

**No coursework requirement is unaddressed. No BLOCKER arises from the brief.**

Two items carry disproportionate risk and are called out deliberately: **CW-14** (an inaccessible repository is an explicit zero-mark condition) and **CW-19/20**, because the rubric attaches roughly half the mark to the report rather than to the code.

---

# 4. CONFLICT REGISTER

Conflicts between authority documents in the v2 pack. Each is resolved in the document that owns the concern.

### CONFLICT-01 — Where do purchase orders, connections and mappings live?
- **DOCUMENT A:** `05` v2 §2 — `purchaseOrders/{poId}`, `connections/{connectionId}`, `productMappings/{mappingId}` as **root collections**.
- **DOCUMENT B:** `06` v2 §9 — "Structural tenant ownership: private data under `organizations/{orgId}/…`" with deny-by-default.
- **ROOT CAUSE:** the data model was designed for logical sharing; the security model was designed for structural isolation. Neither document tested the combination against Firestore's rules-evaluation limits.
- **CORRECT AUTHORITY:** `06` (security), constrained by verified fact VF-03.
- **FINAL DECISION:** private purchase orders move **into** the tenant subtree. Cross-tenant canonical records (`connections`, `connectedPurchaseOrders`, `handleReservations`) become a fourth zone with **no client access at all**, surfaced through backend-written per-organization projections. Mappings move under the buyer organization.
- **FILES UPDATED:** `05` §2, §5.19–5.25 · `06` §6, §9, §12 · `11` §5–7 · `07` route notes · `08` T-SEC-12.

### CONFLICT-02 — Are notifications Release A or Release B?
- **A:** `02` v2 FR-NOTIFY-001 — **A-MUST**.
- **B:** `07` v2 §5 — the Notifications screen listed as **P1 / Release B**.
- **ROOT CAUSE:** the requirement was written for low-stock alerts; the screen inventory was written thinking of connection events.
- **AUTHORITY:** `02` (requirements).
- **DECISION:** Notifications is **P0 / Release A**, extended in B.
- **FILES UPDATED:** `07` §5 screen 26 · `08` new T-NOTIFY group · `12` Stage 10 · `13` SF-0208.

### CONFLICT-03 — Who archives a warehouse?
- **A:** `06` v2 §6.1 — "Warehouse CRUD subject to safe constraints" via client + rules.
- **B:** `02` v2 FR-INV-010/011 — archive requires proof that no non-zero balance and no open receiving dependency exist.
- **ROOT CAUSE:** those checks are unbounded queries, which Security Rules cannot express. The conflict was invisible because neither document said how the check would run.
- **AUTHORITY:** `02` (requirements) — the check is mandatory, so the mechanism must change.
- **DECISION:** warehouse create and update stay client-writable; **archive becomes a backend command** using in-transaction bounded queries. Rules explicitly deny a client setting `status: 'ARCHIVED'`.
- **FILES UPDATED:** `02` FR-INV-014 · `06` §6.2, §6.4 · `11` §11 C-12, §14 · `08` T-CRUD-16, T-SEC-21.

### CONFLICT-04 — Who creates products?
- **A:** `06` v2 §6.1 — "Product field CRUD" via client + rules.
- **B:** `02` v2 FR-INV-004 — `internalSku` unique within the organization.
- **ROOT CAUSE:** rules cannot query a collection, so uniqueness is unenforceable client-side. Both statements could not be true simultaneously.
- **AUTHORITY:** `02`.
- **DECISION:** product create, update and status change become backend commands using a `productSkuIndex` document created with `txn.create`, so Firestore itself enforces uniqueness.
- **FILES UPDATED:** `02` FR-INV-004 · `05` §5.12 · `06` §6.1, §6.3 · `11` §5, §11, §14 · `08` T-CRUD-13/14.

### CONFLICT-05 — Storefront tests referenced but absent
- **A:** `08` v2 §3 traceability — "C | SF-01..05".
- **B:** `08` v2 contains no such table.
- **ROOT CAUSE:** the section was planned and never written.
- **AUTHORITY:** `08`.
- **DECISION:** the T-SF table is written (`08` §20), and the `SF-` prefix is retired for tests because it now collides with task ids `SF-0001…`.
- **FILES UPDATED:** `08` §2, §20 · `13` (task id namespace clarified).

### CONFLICT-06 — Test IDs collide with requirement IDs
- **A:** `02` §7 and `06` define security **requirements** `SEC-001 … SEC-016`; `02` §5 defines non-functional **requirements** `NFR-001 … NFR-016`.
- **B:** `08` v2 §10 and §16 define **tests** `SEC-01 … SEC-16` and `NFR-01 … NFR-12`.
- **ROOT CAUSE:** independently authored ID schemes.
- **AUTHORITY:** `08` owns test identity, so the tests move.
- **DECISION:** every test id is prefixed `T-`. A migration table is published (`08` §2). Requirement ids are unchanged.
- **FILES UPDATED:** `08` throughout · `12` and `13` test references · `06` §17.

### CONFLICT-07 — Scenario arithmetic does not chain
- **A:** `04` v2 §4 — a chained canonical demonstration flow.
- **B:** `04` v2 SC-16 — "stock 18 → 58", assuming a starting balance that SC-06 and SC-09 had already raised.
- **ROOT CAUSE:** scenarios written independently and never reconciled as a sequence.
- **AUTHORITY:** `04`, corrected against a single canonical seed.
- **DECISION:** one canonical seed and one arithmetic chain, published in `16` §7.4 and referenced from `04`. Final balance 120 KG; final inventory value LKR 691,700.00.
- **WHY IT MATTERED:** `08` T-REPORT-01..05 require KPIs to reconcile against known seed values. With inconsistent scenario numbers, either the tests or the demo would have appeared wrong in front of a marker.
- **FILES UPDATED:** `04` SC-04/06/09/14/16, §4 · `16` §7 · `08` T-REPORT-01..05.

### CONFLICT-08 — Cloud Storage: used or not?
- **A:** `03` v2 §8 — "optional Cloud Storage" in the recommended profile.
- **B:** `01` v2 RC-03 — "logo upload cannot become a blocker: use monogram/default logo".
- **ROOT CAUSE:** a soft decision left as "optional", which under time pressure becomes "someone builds it".
- **AUTHORITY:** `10` (technology).
- **DECISION:** **Cloud Storage is not used.** Monogram identity, with an optional validated external logo URL. Removes a Blaze-coupled dependency and roughly half a day of upload, rules and cleanup work.
- **FILES UPDATED:** `02` FR-ORG-003 · `03` §7, §8 · `10` TECH-026 · `07` §26.

**No unresolved contradiction remains between the nine final documents.**

---

# 5. ISSUE REGISTER — adversarial review

Findings from re-examining the v2 pack as a senior SaaS architect, Firebase architect, database engineer, security engineer, inventory domain engineer, senior frontend engineer, QA architect, university marker and future maintainer.

## CRITICAL

### ISS-001 — Cross-tenant Security Rules are unimplementable as designed
- **Category:** security-rule limitation · tenant isolation · Firestore limitation
- **Source:** `05` v2 §2, `06` v2 §11, §12
- **Description:** v2 required a connected buyer to read a supplier's partner catalog and a shared purchase order via client Security Rules. A rule cannot determine *which* of the caller's organizations they are acting for, because a user may belong to several. Answering that requires a `get()` on a path derived from `resource.data`, which varies per candidate document.
- **Why it matters:** Firestore permits ten document access calls per query request (VF-03), and identical calls are cached only when the path is identical. A 25-row list where each row triggers a different `get()` fails outright. The likely field fix under deadline pressure would have been a permissive rule — a cross-tenant data leak in a project whose central claim is tenant isolation.
- **Coursework impact:** would have failed T-SEC-10/12 and undermined the security section, which is where the strongest marks are available.
- **Technical impact:** architectural.
- **Schedule impact:** discovered on Day 12 it costs two days; discovered now it costs nothing.
- **Fix:** close cross-tenant collections to clients entirely. Partner catalog reads go through connection-verified callables; connected purchase orders and connections are mirrored into each participant's tenant by the backend in the same transaction as the canonical write.
- **MANDATORY.** Files: `05`, `06`, `07`, `08`, `11`, `10` TECH-049.

### ISS-002 — Idempotency check outside the transaction is a race
- **Category:** idempotency · race condition
- **Source:** `05` v2 §6 (step 7 "check operationId", step 8 "open transaction")
- **Description:** checking the receipt before opening the transaction lets two concurrent retries both observe "not applied" and both commit.
- **Why it matters:** it defeats the entire idempotency guarantee under exactly the conditions idempotency exists for — a flaky connection and an impatient user. It would pass casual testing and fail in a demo.
- **Fix:** the receipt is the **first read inside** the transaction and the last write before commit. A payload hash is added so a replay carrying different data is rejected rather than silently returning the earlier result.
- **MANDATORY.** Files: `05` §5.17, §6 · `11` §15 · `10` TECH-035 · `08` T-STOCK-13.

### ISS-003 — Floating-point quantities break the ledger invariant
- **Category:** data integrity · precision
- **Source:** `05` v2 §4 ("decimals allowed, recommended max 3"), INV-03
- **Description:** INV-03 demands `sum(signed movements) == StockBalance` exactly. IEEE-754 doubles cannot satisfy that: summing a thousand movements of 0.001 does not equal 1.
- **Why it matters:** the reconciliation property test (T-INT-01/03) is the strongest single piece of evidence the project can produce. With floats it either fails, or passes by luck on the demo dataset and fails when a marker adds data.
- **Fix:** persist all quantities as integer milli-units behind a branded type; money as integer minor units. One shared arithmetic module, fully unit-tested.
- **MANDATORY.** Files: `05` §4 · `10` TECH-042/043 · `11` §21 · `08` T-INT-07.

### ISS-004 — SKU uniqueness cannot be enforced under the v2 write model
- **Category:** data integrity · missing rule
- **Source:** `02` v2 FR-INV-004 versus `06` v2 §6.1
- **Description:** see CONFLICT-04. A required uniqueness constraint was assigned to a layer incapable of enforcing it.
- **Why it matters:** duplicate SKUs corrupt mapping, reporting and the demo narrative, and a marker will try creating a duplicate.
- **Fix:** backend command plus a `productSkuIndex` document created with `txn.create`.
- **MANDATORY.**

## HIGH

### ISS-005 — No way to answer "which organizations does this user belong to?"
- **Source:** `05` v2 §2 · `02` v2 FR-ORG-009/010
- **Description:** memberships live in a subcollection under each organization. There is no user-side index, so the workspace switcher and multi-membership routing are unimplementable without a collection-group query (needing a manually declared collection-group index and an extra rules surface).
- **Fix:** a backend-maintained `users/{uid}/memberships/{orgId}` mirror written in the same transaction as the membership.
- **MANDATORY.** Files: `05` §5.2 · `10` TECH-046 · `11` §5 · `07` screen 6 · `08` T-ORG-11.

### ISS-006 — The backend command catalog was one-third incomplete
- **Source:** `09` v2 §6
- **Description:** missing `warehouse.archive`, `po.order`, `po.cancel`, `product.create`, `product.update`, `connection.disable`, `mapping.disable`, all four `partnerCatalog.*`, `cpo.cancel`, `org.updateSettings`.
- **Why it matters:** undefined write paths get invented under time pressure, and that is precisely when authorization checks are skipped.
- **Fix:** a complete 32-command catalog with roles, release, idempotency, transaction and audit requirements (`11` §11).
- **MANDATORY.**

### ISS-007 — Test IDs collide with requirement IDs
See CONFLICT-06. **MANDATORY** — a traceability matrix that cannot be read is worth nothing to a marker.

### ISS-008 — Notifications priority contradiction
See CONFLICT-02. **MANDATORY.**

### ISS-009 — Warehouse archive assigned to a layer that cannot perform it
See CONFLICT-03. **MANDATORY.**

### ISS-010 — The Inventory Value KPI had no bounded implementation
- **Source:** `02` v2 FR-DASH-001 versus NFR-003
- **Description:** inventory value requires summing on-hand × cost across all products — an unbounded read that contradicts the bounded-query requirement, with no denormalisation specified.
- **Fix:** maintain `stockValueMinor` on each product summary inside stock commands and on cost change, then use a Firestore `sum()` aggregation (VF-07).
- **MANDATORY.** Files: `02` FR-STOCK-016, FR-DASH-008/009 · `05` §5.15 · `10` TECH-045 · `08` T-CRUD-15, T-REPORT-05.

### ISS-011 — Command receipts were globally scoped
- **Source:** `05` v2 §2 `commandReceipts/{operationId}`
- **Description:** a root collection keyed only by operation id lets one tenant probe or occupy another tenant's operation ids, and risks returning one tenant's "already applied" result to another.
- **Fix:** scope to `organizations/{orgId}/commandReceipts/{operationId}`, with no client access.
- **MANDATORY.**

### ISS-012 — Ambiguous RBAC cells
- **Source:** `06` v2 §5 — "limited/–", "view", "limited"
- **Description:** at least five cells were not decisions. Three engineers would implement three different systems, and the tests could not be written.
- **Fix:** a fully binary matrix with the reasoning recorded (`06` v3 §5): Storekeeper cannot adjust stock; Inventory Manager has no Network access; Viewer is limited to dashboard, products, stock and the Stock-on-Hand report.
- **MANDATORY.**

### ISS-013 — Scenario arithmetic does not chain
See CONFLICT-07. **MANDATORY.**

### ISS-014 — No order-number generation strategy
- **Source:** `05` v2 §5.18 (`orderNumber`), §5.4 (PO prefix)
- **Description:** the field and the prefix existed; the allocation mechanism did not. Any read-then-write approach collides under concurrency.
- **Fix:** a per-organization counter document incremented inside the ordering transaction.
- **MANDATORY.** Files: `05` §5.7 · `11` §14 · `02` FR-PO-012 · `08` T-PPO-13.

### ISS-015 — Test coverage gaps
- **Source:** `08` v2
- **Description:** no tests at all for notifications (three requirements), audit field completeness, the public site, workspace switching, partner selection on a PO, or performance. The storefront table was referenced but missing. Roughly nine requirements had no verifying test.
- **Fix:** new T-NOTIFY and T-PERF groups; T-SF written; additional cases across every group; a requirement→test map in `08` §4 so gaps are visible.
- **MANDATORY.**

### ISS-016 — Supplier-side dispatch quantity was undecidable
- **Source:** `05` v2 §5.16 `PartnerCatalogItem.orderUnit` versus `02` v2 FR-CPO-008
- **Description:** if a catalog item's order unit differs from the supplier product's base unit, `cpo.ship` cannot know how much supplier stock to decrement — a second conversion factor would be required and none was specified.
- **Fix:** INV-17 — a catalog item's order unit must equal the supplier product's base unit in Release B. Multi-level conversion is Release D.
- **MANDATORY.** Files: `05` §5.20, INV-17 · `02` FR-NET-019 · `08` T-NET-16.

## MEDIUM

| ID | Issue | Fix | Class |
|---|---|---|---|
| ISS-017 | `organizationDirectory` allowed `list`, letting anyone enumerate every business on the platform | `allow get: if true; allow list: if false` — exact-handle lookup needs only `get` | MANDATORY |
| ISS-018 | No reserved-handle list; a business could take `app`, `b` or `store` and break routing | reserved-word deny-list in the shared normalisation utility (`11` §18) | MANDATORY |
| ISS-019 | Ownership of `users/{uid}` was undefined — nobody was specified to create it | client-created idempotently, rules-restricted to self and a field whitelist | MANDATORY |
| ISS-020 | Stock-status precedence undefined: FR-STOCK-009 and FR-STOCK-010 overlap at `onHand = 0` with `minimum > 0` | explicit precedence — out-of-stock first, then low; `minimum = 0` never low | MANDATORY |
| ISS-021 | Negative-stock scope undefined: per warehouse or per product total? | per `StockBalance`, so a surplus elsewhere cannot mask a negative | MANDATORY |
| ISS-022 | Missing screens: workspace selector, permission-denied, 404 — all required by the guards | added as P0 screens 6, 29, 30 | MANDATORY |
| ISS-023 | Stock adjustment had a screen entry but no route or placement | defined as a modal | MANDATORY |
| ISS-024 | "Global search only if implemented meaningfully" is not a decision | **cut** from Release A/B | MANDATORY |
| ISS-025 | "Categories may be managed from Products or a submenu" is not a decision | its own navigation item | MANDATORY |
| ISS-026 | Private Buyer is an entity with no workflow in Release A — the classic "requirement with no purpose" a marker will question | kept (zero marginal cost — same entity, filtered tab) but **explicitly reframed as a directory**, with FR-PART-007 forbidding any UI that implies a sales workflow | RECOMMENDED |
| ISS-027 | Money rounding undefined for `unitPrice × decimal quantity` | `roundHalfUp` on integers in one shared module, unit-tested at the boundary | MANDATORY |
| ISS-028 | No error model — the UI could not render precise messages and tests could not assert on them | typed `HttpsError` codes plus machine-readable `reason` values (`10` TECH-033) | MANDATORY |
| ISS-029 | No pagination contract | 25 per page, cursor-based, hard maximum 100 | MANDATORY |
| ISS-030 | NFR-014 required a reproducible dataset with no mechanism | committed `scripts/seed.ts` producing the canonical dataset | MANDATORY |
| ISS-031 | Notification generation had no owner and no trigger definition | generated inside stock and workflow commands, on status **transition** only, bounded to 50 recipients | MANDATORY |
| ISS-032 | A pre-authentication role dropdown reads as confused design and multiplies failure states | default "Detect automatically"; explicit selection optional and labelled as a preference | RECOMMENDED |
| ISS-033 | The rubric names *performance* explicitly, but v2 had no performance requirement or test | NFR-017 plus the T-PERF group with concrete targets | MANDATORY |
| ISS-034 | No CI decision, despite CI being cheap third-party evidence that the suite passed | GitHub Actions on every push (`10` TECH-063) | RECOMMENDED |
| ISS-035 | The P0 (no-Blaze) fallback was described only in outline | concrete profile with rules strategy, audit weakening stated honestly, and Release B cut (`10` §16) | MANDATORY |

## LOW

| ID | Issue | Resolution |
|---|---|---|
| ISS-036 | `reservedTotal` is a dead field in A/B/C | kept as a cheap future hook, documented as constant zero; no UI may imply reservations |
| ISS-037 | `ProductStockSummary` is a single-document write hotspot | documented as a known limit with sharded counters as the future path (`11` §31) |
| ISS-038 | v2 implied audit tamper-evidence it does not provide | restated as tamper-*resistant*; true evidence needs append-only external storage |
| ISS-039 | The invite token appears in a URL and therefore in browser history | accepted and documented: single-use, 7-day expiry, email-bound, useless without a matching identity |
| ISS-040 | Release C described as "optional" invites late scope creep | changed to **default NOT BUILT**, with an explicit condition for reconsideration |
| ISS-041 | Callable cold starts (1–3 s) could make the demo look sluggish | warm-up script before recording; `minInstances` deliberately not purchased |
| ISS-042 | Role lists are necessarily duplicated between `firestore.rules` and TypeScript | accepted, with T-SEC-17 asserting the two agree |

**Totals: 4 Critical · 12 High · 19 Medium · 7 Low = 42 issues. All 42 are resolved in v3.**

---

# 6. Substantive changes in v3, by file

| File | Changes |
|---|---|
| `01` | rewritten as the full audit record: read confirmation, technical verification, coursework matrix, conflict register, issue register, cross-document validation, adversarial check |
| `02` | 30 new requirements appended (FR-AUTH-011/012, FR-ORG-011..013, FR-TEAM-010/011, FR-INV-013/014, FR-STOCK-016/017, FR-PART-007, FR-PO-012/013, FR-NET-019/020, FR-CPO-015..017, FR-DASH-008/009, FR-NOTIFY-004, FR-AUD-005/006, FR-SF-005, NFR-017..020, SEC-017..020, BR-023..025, ADM-009). FR-STOCK-009/010 precedence clarified. FR-NOTIFY-001 confirmed A-MUST. **No existing ID changed.** |
| `03` | Release C reduced to default-not-built; dated daily gates; CUT-0 added; P0 fallback expanded; Storage removed |
| `04` | canonical seed chaining; SC-16 arithmetic corrected; UC-23/24/25 and SC-20/21/22 added; Storekeeper adjustment restriction reflected |
| `05` | four zones; paths restructured; five new entities; integer milli-units; stock-status precedence; org-scoped receipts with payload hash; INV-17..21 |
| `06` | binary RBAC matrix; the path-constancy prohibition; cross-tenant closure; product and warehouse writes moved to backend; directory `list` denied; deletes denied everywhere; T-SEC-01..23 |
| `07` | workspace selector, permission-denied and 404 screens added; Notifications to P0; adjustment defined as a modal; global search cut; categories navigation decided; per-screen roles; buyer catalog route |
| `08` | all test IDs prefixed `T-` with a migration table; T-NOTIFY, T-PERF and T-SF groups added; ~40 new cases; requirement→test map |
| `09` | admin prerequisites closed; Blaze isolated as the only fork; complete command catalog referenced; AGENTS.md non-negotiables 15 and 17 added |
| `10`–`17` | new documents |

**No requirement ID changed**, so no ID migration table is needed for requirements. Test IDs did change; their migration table is `08` §2.

---

# 7. CROSS_DOCUMENT_VALIDATION_TABLE

Performed after all seventeen documents were written.

| # | Relationship | Check | Result |
|---|---|---|---|
| 1 | Requirements ↔ Scope | every A-MUST appears in `03` §2; every B-MUST in `03` §3; no requirement outside the freeze | **PASS** |
| 2 | Requirements ↔ Data | every entity referenced by a requirement exists in `05` §5; no orphan entity | **PASS** |
| 3 | Requirements ↔ Security | every SEC requirement maps to a rule, a command check or a test | **PASS** |
| 4 | Requirements ↔ UI | every A/B functional requirement has at least one screen in `07` §5 | **PASS** |
| 5 | Requirements ↔ Tests | every requirement group maps to tests in `08` §4; the nine v2 gaps are closed | **PASS** |
| 6 | Use cases ↔ State machines | every transition in `04` exists in `05` §7 | **PASS** |
| 7 | State machines ↔ Tests | every transition and every illegal transition has a test | **PASS** |
| 8 | Data ↔ Security Rules | every collection in `05` §2 has a rule block in `11` §9, plus a catch-all | **PASS** |
| 9 | Backend commands ↔ Transaction boundaries | all 32 commands in `11` §11 appear in the transaction table `11` §14 | **PASS** |
| 10 | UI actions ↔ Permissions | every action on every screen maps to a cell in the `06` §5 matrix | **PASS** |
| 11 | Task register ↔ Implementation plan | every task in `13` belongs to a stage in `12`; every stage has tasks | **PASS** |
| 12 | Implementation plan ↔ 13-day feasibility | 145 Release A tasks over Days 1–9, 48 Release B tasks over Days 10–12, with a cut ladder and slippage protocol | **CONDITIONAL PASS** — see §8 |
| 13 | Tech stack ↔ Architecture | every technology in `10` is used by something in `11`; nothing in `11` needs a technology not in `10` | **PASS** |
| 14 | Tech stack ↔ Cost | every service is free or within a no-cost tier; Blaze isolated with a budget alert and instance cap | **PASS** |
| 15 | Coursework requirements ↔ Report evidence | every CW-ID in §3 maps to a report section in `16` §2 | **PASS** |
| 16 | Seed dataset ↔ KPI tests | the arithmetic in `16` §7 reconciles with T-REPORT-01..10 and with SC-04/06/09/14/16 | **PASS** |
| 17 | Screen inventory ↔ Design brief | all 41 screens in `07` §5 appear in `17` §4 with priorities | **PASS** |
| 18 | AGENTS.md spec ↔ Control documents | every non-negotiable in `09` §6 appears in `15` §2 | **PASS** |
| 19 | Invariants ↔ Tests | INV-01..21 each have at least one asserting test | **PASS** |
| 20 | Evidence plan ↔ Stages | every stage in `12` has an evidence row in `16` §3 | **PASS** |

**19 PASS · 1 CONDITIONAL PASS · 0 FAIL.**

---

# 8. The one conditional result, stated plainly

**Relationship 12 — implementation plan versus 13-day feasibility — is a CONDITIONAL PASS, not a PASS.**

Release A is 145 atomic tasks across nine days, of which roughly 40 are tests and evidence. That is achievable for a focused developer with AI assistance, but it has no meaningful slack. Release B adds 47 tasks across three days and depends on Release A finishing on time.

This is honest rather than pessimistic, and it is why the plan contains machinery instead of optimism:

- a dated gate at the end of every day (`03` §10);
- a six-step cut ladder with defined triggers (`03` §9);
- a slippage protocol checked daily (`12` §22);
- the hardest, highest-risk work — the ledger — scheduled on Day 6, early enough to absorb failure;
- Release B behind an explicit written go/no-go on Day 9;
- the report and deployment scheduled *before* optional features, so features are cut to protect them rather than the reverse.

**The single most likely failure mode is not technical.** It is spending Days 10–12 on Release B when Release A is not genuinely green, and arriving at Day 14 with a half-finished differentiator, no deployment and a rushed report. GATE-A on Day 9 exists solely to prevent that, and the decision must be written down in `docs/qa/gate-a.md` rather than made implicitly by continuing to code.

---

# 9. FINAL ADVERSARIAL CHECK

### Q1 — If three separate engineers received these files tomorrow with no conversation history, would they independently build essentially the same Stockmok?

**Now: yes, in every respect that matters.** Same collection paths, same 32 commands, same transaction boundaries, same rules structure, same 41 screens, same 7 roles with identical permissions, same integer representations, same state machines, same test IDs, same technology at pinned versions.

They would differ only in cosmetics: file naming inside features, component internals, exact CSS, and the wording of user-facing copy. All four are deliberately left free.

**Against v2 the answer was no**, because of at least twelve genuine ambiguities: where purchase orders live, who can adjust stock, how SKU uniqueness is enforced, how order numbers are generated, how inventory value is computed, whether quantities are floats, where the idempotency check runs, what "limited" means in the RBAC matrix, who creates the user document, whether notifications are Release A or B, how a warehouse archive is validated, and how a user's organizations are listed. Each of those has been closed with a stated decision and a reason.

### Q2 — If only Release A is finished, is the result obviously a complete Inventory & Procurement Management System satisfying the actual brief?

**YES.** Release A alone delivers: a management system of a recognised type; full Create, Read, Update and Delete on products, categories, warehouses, partners and purchase orders; a real database connection with transactions, rules and indexes; multi-tenant authentication with seven roles; a complete stock ledger; end-to-end procurement from draft order to received goods; a dashboard and two reports where every figure traces to operational data; audit and notifications; a deployed production URL; and a full automated test suite.

`03` §2 states the gate in exactly these terms, and `12` schedules the Release A QA gate on Day 9 — before any Release B work — precisely so that this answer stays true regardless of what happens afterwards.

### Q3 — If Release B is built, can one Stockmok business ever gain direct access to another's private inventory data merely by being connected?

**NO — and this is now structural rather than aspirational.**

1. Private data lives only under `organizations/{orgId}/…`, and the only rule that grants access reads a path fixed by the matched `orgId`.
2. Cross-tenant canonical collections are closed to clients completely; every role in every organization is denied by rule.
3. A connected buyer reads only the partner catalog **projection**, only through a callable that verifies the connection is ACTIVE, and only the fields the supplier explicitly published.
4. Shared purchase orders reach each party as a backend-written projection inside their own tenant; a third organization has no projection and cannot read the canonical record.
5. Every cross-tenant write is a backend command that re-reads membership and connection status from the database.
6. T-SEC-10 asserts denial for a **connected** buyer against seven separate supplier collections — the connected party, not a stranger, is treated as the interesting attacker.

### Q4 — Can stock quantity change without an immutable StockMovement and an atomic authoritative balance update?

**NO.**

1. `stockBalances` and `productStockSummaries` are backend-write-only; T-STOCK-06 asserts client denial for every role including Owner.
2. `stockMovements` is create-only for the backend and immutable; update and delete are denied to everyone.
3. Every stock command writes movement, balance and summary in one transaction; T-INT-05 proves rollback leaves no partial state.
4. T-INT-01/02 assert exact reconciliation, and T-INT-03 re-asserts them after every command in a randomised sequence of several hundred operations with random replays.
5. Integer milli-units make that equality exact rather than approximate (ISS-003).

**A fifth question, added because it is the one a marker is most likely to ask:**

### Q5 — Why does a system that must demonstrate "Delete" deny deletion?

Because destroying a product that appears in a purchase order, a stock movement and an audit record would corrupt history and break referential integrity, and no real inventory system does it. Stockmok implements Delete as archive and deactivate, denies hard deletion at the Security Rules layer, and can show the rule that enforces it. The report must make this argument explicitly (`16` §2 sections 4 and 10) rather than leaving a marker to guess — presented well it is evidence of judgement; left unexplained it looks like a gap.

---

# 10. Remaining risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Blaze cannot be enabled | low–medium | high | Day-1 decision; complete P0 profile documented; Release A remains fully deliverable |
| Release A slips past Day 9 | medium | high | daily gates, cut ladder, GATE-A go/no-go in writing |
| Deployment fails late | low | critical | a real production deploy is proven on **Day 1** (SF-0027) |
| Repository inaccessible to evaluators | low | **catastrophic — explicit zero-mark condition** | public from Day 1; verified signed-out in S19; on the submission checklist |
| Report rushed | medium | high | S20 has 13 scheduled tasks; evidence captured during every stage |
| Deadline is not actually 24 August | low | high | plan completes on 22 August; re-verify if DLE access is regained |
| Ledger defect found late | low | critical | ledger built Day 6, property-tested immediately, externally reviewed |
| Agent scope creep | medium | medium | `AGENTS.md`, the forbidden-decisions list, the one-writer rule |
| A test weakened to go green | medium | high | explicitly forbidden; CI history makes it visible in review |
| Student cannot explain the code in a viva | medium | high | mandatory diff review; the five-file explain test before submission |

---

# 11. FINAL_CONTROL_SUMMARY

```text
FILES_REQUIRED:                      10
FILES_READ:                          10 / 10
ACTUAL_COURSEWORK_BRIEF_VERIFIED:    YES

CRITICAL_ISSUES_FOUND:                4
CRITICAL_ISSUES_RESOLVED:             4
HIGH_ISSUES_FOUND:                   12
HIGH_ISSUES_RESOLVED:                12
MEDIUM_ISSUES_FOUND:                 19
MEDIUM_ISSUES_RESOLVED:              19
LOW_ISSUES_FOUND:                     7
LOW_ISSUES_RESOLVED:                  7
DOCUMENT_CONFLICTS_FOUND:             8
DOCUMENT_CONFLICTS_RESOLVED:          8

UNRESOLVED_CONCEPTUAL_BLOCKERS:       0
UNRESOLVED_TECHNICAL_BLOCKERS:        0
UNRESOLVED_ADMIN_ITEMS:               0
OPEN_ASSUMPTIONS:                     1   (deadline 24 Aug 2026, student-confirmed)
DAY_1_DECISIONS_REQUIRED:             1   (Firebase Blaze billing)

COURSEWORK_TRACEABILITY:             PASS
TECH_STACK:                          FROZEN
FIREBASE_ARCHITECTURE:               FROZEN
DATABASE_MODEL:                      PASS
SECURITY_MODEL:                      PASS
UI_INFORMATION_ARCHITECTURE:         PASS
TEST_ARCHITECTURE:                   PASS
IMPLEMENTATION_PLAN:                 READY
TASK_REGISTER:                       READY   (236 tasks)

CROSS_DOCUMENT_VALIDATION:           19 PASS · 1 CONDITIONAL · 0 FAIL

READY_FOR_UI_DESIGN:                 YES
READY_FOR_IMPLEMENTATION_AFTER_UI:   YES

RECOMMENDED_SCOPE:                   A + B-LITE
```

---

# 12. Final position

Stockmok is specified to the point where implementation is a matter of execution rather than discovery. The remaining decisions are: whether Blaze can be enabled (Day 1), and whether Release A is genuinely green on Day 9.

From here the only useful question is:

> **"How do we implement and prove the frozen requirements safely before 22 August?"**

Everything else — every idea about what Stockmok could additionally become — is recorded in `03` §6 as Release D, and Release D is not built.
