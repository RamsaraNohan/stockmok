# StockFlow — Final Coursework Evidence & Report Plan v3.0

**Status:** the plan that converts 13 days of engineering into marks.
**Why this document is not optional:** the rubric splits the mark between *Implementation (completion of project)* and *Reflect and Contribution*, and states that an error-free system earns **50 % of the allocated marks**, with full marks depending on **quality, performance and adaptability**, and on a reflection report that is **well formatted, contains all technologies, explanation, problems and solutions, properly written and descriptive**.

Read that rubric literally: roughly half the available credit is attached to things that exist only if they are *written down and evidenced*. A perfect system with a thin report loses a large fraction of the total.

**Confirmed administrative position (student-supplied, 09 Aug 2026):** deadline **24 August 2026**; **no presentation required**; AI tool use permitted by the university and the module. The brief's own-work, referencing and plagiarism requirements still apply in full.

---

# 1. The rubric, decoded into deliverables

| Rubric phrase | What actually earns it | Where it comes from |
|---|---|---|
| "error free system" | zero Critical/High defects, a green test suite, a clean console, no manual database correction during the demo | `08` gates, CI history |
| "quality" | consistent UI, validation, accessible components, typed contracts, a design system, code structure | S2, S17, `10` |
| "performance" | Lighthouse scores, bundle size, Firestore read counts per screen, aggregation instead of scans, bounded queries | S17, `10` TECH-058 |
| "adaptability" | multi-tenancy, config-driven roles, design tokens, unit-agnostic quantities, feature flags, documented replacement paths | `10`, `11` |
| "containing all technologies" | a technologies section that lists every choice **and why**, including rejected alternatives | `10` |
| "explanation" | architecture diagrams + data model + security model explained in the student's words | S19 |
| "problems and solutions" | a log of at least eight real problems with real resolutions | `docs/PROGRESS.md` |
| "properly written and descriptive" | structured report, figures with captions, referenced sources, proofread | S20 |
| "individual contribution" | commit history with task ids, CI runs, the decision log, an honest AI-assistance statement | git + `01` |
| GitHub accessible to evaluators | public repo verified from a signed-out browser | SF-0396 — **zero-mark risk if missed** |

---

# 2. Recommended report structure

Target 6,000–9,000 words plus figures. Every section below maps to evidence that already exists if this plan is followed.

| § | Section | Content | Words | Evidence used |
|---|---|---|---|---|
| — | Title page | Title, module PUSL2021, index number, name, date, **GitHub URL**, **live URL** | — | SF-0406 |
| — | Abstract | 200 words: what was built, with what, and what it proves | 200 | — |
| — | Contents, figures, tables | auto-generated | — | — |
| 1 | Introduction | The problem: small hospitality/retail businesses tracking stock in spreadsheets and ordering by phone. Why an Inventory & Procurement system. Objectives. Scope statement naming Release A/B and what was deliberately excluded. | 700 | `02` §1, `03` |
| 2 | Requirements | Actors, functional requirements by module, non-functional requirements, business rules. Present as tables with IDs. State the CRUD mapping explicitly. | 900 | `02`, `04` |
| 3 | Technologies used and justification | Every layer, the choice, the alternatives rejected, and the reason. Include the honest ones: why not MySQL, why not Redux, why TypeScript 5.9 not 7.0, why no Cloud Storage. | 1,400 | **`10` — this section is nearly pre-written** |
| 4 | System design | Architecture diagram, three-zone data model, collection map, entity relationships, state machines for membership/connection/mapping/private PO/connected PO, the command pattern. | 1,300 | `05`, `11`, diagrams |
| 5 | Security design | Threat model table, trust boundary, RBAC matrix, Security Rules strategy, the Admin-SDK-bypasses-rules problem and its solution, tenant isolation, projections, idempotency. | 1,100 | `06`, `11` §9 |
| 6 | Implementation | Walk the reader through 4–5 representative features: organization creation with atomic handle reservation, the stock adjustment command, private receiving, the product-mapping wizard, the connected PO round trip. Code excerpts of 10–20 lines with commentary. Screenshots. | 1,600 | screenshots + code |
| 7 | Testing | Test strategy pyramid, what each level proves, the rules test results, the ledger property test, the integration matrix, E2E, browser QA, CI. Include real numbers: counts, pass rates, coverage. | 1,100 | `08`, `docs/qa/**` |
| 8 | Performance and adaptability | Lighthouse, bundle size, read counts per screen, aggregation query rationale, hotspot analysis; then adaptability: multi-tenant, tokens, roles, units, currencies, feature flags, documented upgrade paths. | 700 | `docs/evidence/performance/**` |
| 9 | Problems encountered and solutions | Eight to twelve entries, each: symptom → diagnosis → resolution → what it cost. **The strongest-scoring section in the report if done concretely.** | 1,200 | `docs/PROGRESS.md` |
| 10 | Critical evaluation and reflection | What works, what does not, known limitations stated honestly, what would be done differently, what was learned, how the AI-assisted workflow was structured and controlled. | 1,000 | `docs/qa/known-issues.md`, `14` |
| 11 | Individual contribution | Commit statistics, the task register with statuses, CI run history, the decision log, and a factual statement of AI tool use and the permission granted. | 400 | git, `13`, `01` |
| 12 | Conclusion and future work | Release C/D roadmap framed as future work, not as unfinished work. | 400 | `03` §6 |
| — | References | Plymouth referencing style. Official documentation sources from `10` §1 plus any academic sources. | — | `10` §1 |
| — | Appendices | A: full requirement tables. B: full test matrix and results. C: Security Rules listing. D: seed dataset and KPI reconciliation. E: demo script. F: screenshot catalogue. | — | all |

**Formatting rules:** every figure numbered and captioned and referenced from the body; every table numbered; consistent heading hierarchy; page numbers; a real table of contents. "Well formatted" is an explicit rubric phrase — treat it as a scored item.

---

# 3. Evidence to capture at each stage — capture it *while building*

This table is the whole point of the document. Reconstructing evidence on the last day is how projects lose the reflection marks.

| Stage | Capture immediately | Destination |
|---|---|---|
| S0 | Repo created, first green CI run, fresh-clone build output | `docs/evidence/setup/` |
| S1 | Firebase console (products enabled), **budget alert config**, emulator UI running, first successful production deploy | `docs/evidence/setup/` |
| S2 | Design tokens file, component gallery, home/login/signup, **all 8 branded-login states** | `docs/evidence/screenshots/stage-02/` |
| S3 | Onboarding steps 1–4, handle normalisation and taken-handle states, dashboard on first login, **handle concurrency test output** | `stage-03/`, `docs/qa/` |
| S4 | Team screen, invite link dialog, role change, suspended-user denial, **first rules test run output** | `stage-04/`, `docs/qa/security-rules-results.md` |
| S5 | Product create → read → update → archive (the four CRUD screenshots the brief literally asks for), duplicate-SKU rejection, warehouse-archive-blocked message | `stage-05/` |
| S6 | Adjustment dialog with Current→Change→Result, movement history, **ledger property test output**, replay-safety test output, concurrency test output | `stage-06/`, `docs/qa/` |
| S7 | Suppliers Private/Connected tabs, partner detail | `stage-07/` |
| S8 | PO builder steps, PO detail timeline, PO ordered, snapshot-immutability test output | `stage-08/` |
| S9 | Receiving screen desktop **and 390 px mobile**, partial then full receipt, over-receipt rejection | `stage-09/` |
| S10 | Populated dashboard, empty dashboard, Needs Attention, both reports, notifications, **KPI reconciliation table** | `stage-10/` |
| S11 | Full test run output, coverage summary, role walkthrough log, responsive log, **Codex review document**, `test-run-release-a.md` | `docs/qa/` |
| S12 | Handle discovery, business card, connection request, supplier accepting, connections list on both sides | `stage-12/` |
| S13 | Publish dialog with the disclosure statement, supplier catalog table, **buyer view side-by-side with supplier private view** | `stage-13/` |
| S14 | **Every mapping wizard state** including all seven error states | `stage-14/` |
| S15 | Connected PO buyer view, supplier view, dual representation, timeline, ship, connected receiving, ledger-separation test output | `stage-15/` |
| S16 | Full P1 test run, E2E trace/video of the two-org round trip, `test-run-release-b.md` | `docs/qa/`, `docs/evidence/e2e/` |
| S17 | Lighthouse reports (home + dashboard), bundle report, read-count measurements, contrast audit, before/after responsive shots | `docs/evidence/performance/` |
| S18 | Production URL, production sign-in, production PO cycle, **signed-out denial proof**, deploy log, rollback rehearsal | `docs/qa/production-smoke.md` |
| S19 | Final regression log, all diagrams, demo recording, **signed-out GitHub screenshot** | `docs/evidence/` |

**Naming convention:** `stage-NN_screen-name_state.png` — e.g. `stage-14_mapping-wizard_sku-not-found.png`. Consistent names make the report's figure list trivial to assemble.

---

# 4. Screenshot inventory (minimum set)

**Release A — 34 screenshots**

Public home (2: hero, features) · Sign-up · Global login · Branded login normal · Branded login handle-not-found · Branded login role-denied · Branded login no-membership · Invitation accept · Onboarding ×4 · Empty dashboard · Populated dashboard · Needs Attention detail · Product list · Product list filtered · Product create form · Product form validation error · Product detail Overview · Product detail Stock tab · Product detail Activity tab · Category management · Warehouse management · Warehouse archive blocked · Stock adjustment dialog · Adjustment success with movement reference · Movement history · Suppliers Private tab · Supplier detail · PO builder · PO detail ordered · Receiving desktop · Receiving mobile 390 px · Stock-on-Hand report · Purchase-Order report · Team screen · Invite link dialog · Notifications · Role-denied screen · 404.

**Release B — 14 screenshots**

Business discovery empty · Discovery result card · Connection request sent · Incoming request (supplier) · Connection accepted both sides · Partner catalog publish dialog · Supplier catalog table · Buyer catalog browse · **Supplier private product screen next to the buyer's catalog view** (the single most valuable security screenshot) · Mapping wizard steps 1–5 · Mapping SKU-not-found · Mapping semantic-confirmation · Connected PO buyer detail · Connected PO supplier detail · Shared timeline · Connected receiving with conversion preview.

**Evidence — 12 artifacts**

Firebase console · Budget alert · Emulator UI · Rules test output · Integration test output · Ledger property test output · Coverage summary · CI run history · Lighthouse home · Lighthouse dashboard · Bundle report · Signed-out GitHub page.

---

# 5. Diagrams required

| # | Diagram | Tool | Shows | Report § |
|---|---|---|---|---|
| D1 | System architecture | Mermaid or draw.io | Browser (React SPA) → Firebase Auth / Firestore / Callable Functions / Hosting, with the trust boundary drawn explicitly and the Admin SDK marked as *bypasses rules* | 4 |
| D2 | Three-zone data model | Mermaid | Public projections · tenant-private · cross-tenant canonical, with the arrows that are permitted and the arrows that are denied | 4, 5 |
| D3 | Entity relationship diagram | Mermaid `erDiagram` | Organization, Membership, Product, Warehouse, StockBalance, StockMovement, ProductStockSummary, PrivatePartner, PurchaseOrder, PurchaseOrderItem, Connection, PartnerCatalogItem, ProductMapping, AuditLog, Notification | 4 |
| D4 | Collection path tree | code block | The exact Firestore layout from `11` §5 | 4 |
| D5 | Private PO state machine | Mermaid `stateDiagram` | DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED, CANCELLED | 4 |
| D6 | Connected PO state machine | Mermaid `stateDiagram` | DRAFT → SUBMITTED → ACCEPTED → SHIPPED → PARTIALLY_RECEIVED → RECEIVED, with REJECTED/CANCELLED | 4 |
| D7 | Stock command sequence | Mermaid `sequenceDiagram` | Client → callable → auth check → membership → transaction → movement/balance/summary/audit/receipt → response, with the idempotency branch | 4, 6 |
| D8 | RBAC matrix | table | roles × capabilities from `06` §5 | 5 |
| D9 | Connected PO cross-tenant flow | Mermaid `sequenceDiagram` | Buyer org and supplier org as separate lifelines, showing which ledger moves at which step | 5, 6 |
| D10 | Test pyramid | figure | unit → component → rules → integration → E2E, with the actual counts | 7 |

Draw these in S19 from the **built** system, not from the plan — a diagram that does not match the code is worse than none.

---

# 6. Technology explanation — pre-mapped

Section 3 of the report is largely a rewrite of `10`. For each entry give: what it is, why it was chosen, what was rejected and why, and one concrete consequence in the code.

Highest-value entries, because they show engineering judgement rather than tool familiarity:

1. **Firestore over MySQL** — the brief's examples are examples, not a mandate; the deciding factors were testable declarative Security Rules and real multi-document transactions without hosting a server.
2. **Integer milli-units for quantities** — floats made the ledger reconciliation invariant probabilistic; integers make it exact. Include the failing-float example.
3. **Zod as one shared schema** — the same object validates the browser form and re-validates inside the Cloud Function, so "the client is untrusted" is structural rather than aspirational.
4. **No Redux or Zustand** — the app's state is almost entirely remote; TanStack Query solves caching and invalidation, and a client store would add ceremony without solving anything.
5. **Callable functions for every mutation** — the Admin SDK bypasses Security Rules, so the framework re-authorizes on every call; that inversion is the core security insight of the project.
6. **Cross-tenant documents closed to clients** — because a Security Rule cannot know which of a user's organizations they are acting for, and a `get()` on a data-derived path breaks Firestore's access-call limits.
7. **TypeScript 5.9 rather than 7.0** — a compiler rewrite during a graded 13-day build is uncompensated risk.
8. **No Cloud Storage** — Blaze-gated and only needed for logos, which monograms replace.
9. **One Firebase project plus emulators** — deterministic, free, and removes the risk of demoing against the wrong backend.
10. **Firebase Hosting rather than App Hosting** — the app is a static SPA; SSR infrastructure would add cost and moving parts for nothing.

---

# 7. The canonical seed dataset and KPI reconciliation

This exists so that every number in the report, the demo and the dashboard can be checked. `scripts/seed.ts` (SF-0223) produces exactly this.

## 7.1 Organizations

| Org | Handle | Industry | Currency | Timezone | Role in demo |
|---|---|---|---|---|---|
| Grand Ocean Hotel | `grand-ocean` | Hospitality | LKR | Asia/Colombo | buyer |
| Fresh Foods Ltd | `freshfoods` | Food & Beverage | LKR | Asia/Colombo | supplier |

Grand Ocean warehouses: **Main Store**, **Cold Room**.
Grand Ocean categories: Meat, Dairy, Dry Goods, Beverages.
Grand Ocean team: Owner (Nohan), Admin, Inventory Manager (Nimal), Procurement Manager, Storekeeper, Analyst, Viewer — one user per role so RBAC can be demonstrated.

## 7.2 Grand Ocean products and opening balances

| SKU | Product | Category | Unit | Min | Cost (LKR) | Opening | Warehouse | Status at t₀ |
|---|---|---|---|---|---|---|---|---|
| MEAT-001 | Chicken Breast | Meat | KG | 20 | 1,250.00 | 18 | Cold Room | **LOW** |
| MEAT-002 | Beef Mince | Meat | KG | 15 | 2,100.00 | 40 | Cold Room | IN_STOCK |
| MEAT-003 | Fish Fillet | Meat | KG | 12 | 1,850.00 | 10 | Cold Room | **LOW** |
| DAIR-001 | Fresh Milk | Dairy | L | 50 | 380.00 | 120 | Cold Room | IN_STOCK |
| DAIR-002 | Butter Block | Dairy | KG | 10 | 2,600.00 | 8 | Cold Room | **LOW** |
| DAIR-003 | Cheddar Cheese | Dairy | KG | 8 | 3,200.00 | 25 | Cold Room | IN_STOCK |
| DRY-001 | Basmati Rice | Dry Goods | KG | 100 | 420.00 | 250 | Main Store | IN_STOCK |
| DRY-002 | Wheat Flour | Dry Goods | KG | 80 | 210.00 | 60 | Main Store | **LOW** |
| DRY-003 | Sugar | Dry Goods | KG | 60 | 260.00 | 300 | Main Store | IN_STOCK |
| DRY-004 | Cooking Oil | Dry Goods | L | 40 | 690.00 | 0 | Main Store | **OUT_OF_STOCK** |
| BEV-001 | Bottled Water 1L | Beverages | EACH | 200 | 90.00 | 600 | Main Store | IN_STOCK |
| BEV-002 | Orange Juice 1L | Beverages | EACH | 60 | 480.00 | 90 | Main Store | IN_STOCK |

**Dashboard at t₀ — these are the numbers the report must show:**

| KPI | Value | Derivation |
|---|---|---|
| Active SKUs | **12** | `count()` over products where `status == ACTIVE` |
| Low stock | **4** | MEAT-001, MEAT-003, DAIR-002, DRY-002 |
| Out of stock | **1** | DRY-004 |
| Open POs | **0** | none seeded |
| Awaiting receipt | **0** | none seeded |
| Inventory value | **LKR 564,200.00** | `sum(stockValueMinor)` — see below |

Inventory value arithmetic: 18×1,250 = 22,500 · 40×2,100 = 84,000 · 10×1,850 = 18,500 · 120×380 = 45,600 · 8×2,600 = 20,800 · 25×3,200 = 80,000 · 250×420 = 105,000 · 60×210 = 12,600 · 300×260 = 78,000 · 0×690 = 0 · 600×90 = 54,000 · 90×480 = 43,200 → **564,200**.

## 7.3 Fresh Foods (supplier) seed

| SKU | Product | Unit | Opening | Partner SKU published | Order unit | Pack |
|---|---|---|---|---|---|---|
| FF-CHK-05 | Chicken Breast 5 KG Pack | PACK | 200 PACK | `CKN-B5` | PACK | 5 KG |
| FF-BTR-01 | Butter Block 1 KG | KG | 300 KG | `BTR-1K` | KG | 1 KG |

> **Release B simplification, recorded as a rule:** a partner catalog item's **order unit must equal the supplier product's base unit**. Without this, `cpo.ship` would need a second conversion factor (order unit → supplier base unit) to know how much supplier stock to decrement. One conversion, buyer-side only, is enough to demonstrate the concept. Multi-level unit conversion is Release D. `05` v3 records this as invariant INV-17.

## 7.4 The canonical demonstration chain — MEAT-001 Chicken Breast

Every scenario in `04` chains from t₀ in this exact order. **These numbers are authoritative; any document, screenshot or report figure that disagrees is wrong.**

| Step | Action | Movement | Qty | Balance after | Inventory value after |
|---|---|---|---|---|---|
| t₀ | seed | OPENING_BALANCE | +18 | **18 KG** LOW | 564,200.00 |
| 1 | adjustment, reason "Recount correction" | ADJUSTMENT_IN | +2 | **20 KG** IN_STOCK | 566,700.00 |
| 2 | private PO from Green Farm, 50 KG ordered, first receipt | PURCHASE_RECEIPT | +40 | **60 KG** | 616,700.00 |
| 3 | private PO second receipt → RECEIVED | PURCHASE_RECEIPT | +10 | **70 KG** | 629,200.00 |
| 4 | connected PO from Fresh Foods, 10 PACK = 50 KG, supplier ships | *(supplier ledger only: Fresh Foods 200 → 190 PACK)* | 0 | **70 KG** unchanged | 629,200.00 |
| 5 | buyer receives 8 PACK = 40 KG | PURCHASE_RECEIPT | +40 | **110 KG** | 679,200.00 |
| 6 | buyer receives 2 PACK = 10 KG → RECEIVED | PURCHASE_RECEIPT | +10 | **120 KG** | 691,700.00 |

Checks the report should state explicitly:

- Total movements for MEAT-001 = **6**; signed sum = 18+2+40+10+40+10 = **120** = `StockBalance.onHandMilli / 1000` ✔
- Step 1 changes the status from LOW_STOCK to IN_STOCK, so the dashboard low-stock count goes 4 → 3 ✔
- Step 4 changes **only** the supplier's ledger — Grand Ocean is unchanged at SHIPPED ✔ (INV-10)
- Steps 5–6 change **only** the buyer's ledger — Fresh Foods is unchanged ✔ (INV-11)
- Inventory value uses the product's current purchase cost (1,250.00), not the PO price. Stated as a deliberate design decision: StockFlow reports replacement-cost value, not weighted-average cost. Weighted-average costing is Release D.

> **This table fixes a numeric inconsistency in the v2 pack**, where SC-16 assumed a starting balance of 18 KG even though the earlier chained scenarios had already raised it. Reconciling KPIs against inconsistent scenario numbers would have made the dashboard look wrong during the demo.

---

# 8. Problems-and-solutions log — seed entries

Keep `docs/PROGRESS.md` daily. The following are already-known problems that this design pass surfaced; they are legitimate report entries because they were real problems that changed the design. Add at least four more from the actual build.

| # | Problem | Diagnosis | Solution | Cost |
|---|---|---|---|---|
| P1 | Security Rules could not authorize a connected buyer reading a supplier's partner catalog | A rule cannot know which of the caller's organizations is the buyer; resolving it needs a `get()` per candidate org, and Firestore allows only 10 document access calls per query | Closed all cross-tenant collections to clients; cross-tenant reads go through authorized callables and backend-written per-org projections | 1 design pass; simpler rules and a smaller attack surface |
| P2 | The ledger reconciliation invariant failed intermittently | Quantities stored as floating-point decimals; summing many 3-decimal movements does not equal the expected total in IEEE-754 | All quantities persisted as integer milli-units behind a branded `Milli` type | ~2 h of refactoring; the invariant became exact |
| P3 | A retried command could apply twice | The operation-id check ran before the transaction opened, so two concurrent retries both saw "not applied" | Read the receipt as the first read *inside* the transaction; added a payload hash so a retry with different data is rejected rather than silently returning a stale result | ~1 h; closed a duplicate-stock defect |
| P4 | "Which organizations does this user belong to?" was unanswerable | Memberships live in a subcollection under each organization; there was no user-side index | Backend-maintained `users/{uid}/memberships/{orgId}` mirror written in the same transaction as the membership | ~1 h; also made the workspace switcher cheap |
| P5 | `internalSku` uniqueness could not be enforced by rules | Rules cannot query a collection | A `productSkuIndex/{skuNormalized}` document created with `create` inside the product transaction — Firestore's create precondition does the enforcing | ~1.5 h; race-free uniqueness |
| P6 | Warehouse archive could race against a concurrent receipt | The "no stock exists" check was a query outside any transaction | Admin SDK transactions support query reads, so the bounded check runs inside the transaction | ~1 h |
| P7 | Inventory Value KPI had no bounded implementation | Summing on-hand × cost across all products is an unbounded read | Maintain `stockValueMinor` on each product summary inside stock commands and use a Firestore `sum()` aggregation | ~2 h; bounded cost, still no hand-maintained KPI |
| P8 | A business could reserve the handle `app` and break routing | `/app/:handle`, `/b/:handle` and `/store/:handle` are real routes | Reserved-handle deny-list enforced in the shared normalisation utility | 20 min |
| P9 | Anyone could enumerate every business on the platform | The public directory allowed `list` | `allow get: if true; allow list: if false` — exact-handle lookup needs only `get` | 10 min |
| P10 | `cpo.ship` did not know how much supplier stock to decrement | The catalog order unit could differ from the supplier product's base unit, needing a second conversion | Release B requires order unit == supplier base unit; multi-level conversion deferred | 30 min; documented simplification |

Each entry in the report should read as symptom → why → fix → consequence. Concrete beats general: "the ledger test failed because 0.001 × 1000 ≠ 1 in floating point" scores; "we had some bugs" does not.

---

# 9. Demo script

Recorded in S19 against **production**, after warming every function. One clean take, roughly 8–10 minutes. Even with no presentation required, the recording is evidence of a working system and is the safety net if the marker cannot run it themselves.

| # | Beat | Shows | Say |
|---|---|---|---|
| 1 | Public home page | the product proposition | one sentence on the problem |
| 2 | `/b/grand-ocean` branded login | multi-tenant identity | "each business gets its own branded entry point" |
| 3 | Sign in as **Nimal, Inventory Manager**, having selected Owner | role context is untrusted | "identity succeeded, but the requested role was rejected because authorization comes from the Membership record, not the form" |
| 4 | Dashboard | KPIs, Needs Attention | quote the seed numbers: 12 SKUs, 4 low, LKR 564,200 |
| 5 | Product list → Chicken Breast detail | CRUD read, per-warehouse stock | "18 KG, below the minimum of 20" |
| 6 | Create a product, edit it, archive it | **CRUD — the brief's core requirement** | "archive, not delete, so history survives" |
| 7 | Adjust Chicken Breast +2 KG | ledger, preview, audit | "the balance is never written directly; this creates an immutable movement" |
| 8 | Movement history | ledger explains every unit | "six movements, summing to the current balance" |
| 9 | Private supplier → PO → mark Ordered | procurement | "no fake in-platform acceptance for a supplier who isn't a StockFlow user" |
| 10 | Receive 40 of 50 as **Storekeeper** on a phone-width window | partial receiving, mobile | "stock 20 → 60, PO partially received" |
| 11 | Attempt an Owner-only action as Storekeeper via a direct URL | RBAC enforcement | "hidden navigation is convenience; the server denies it" |
| 12 | Attempt to read Fresh Foods' data as Grand Ocean | tenant isolation | show the permission-denied result |
| 13 | Discover `@freshfoods`, send a connection request | Release B | "exact-handle discovery from a public projection with no private fields" |
| 14 | Switch to Fresh Foods, accept, publish `CKN-B5` | partner catalog | "the buyer will see these five fields and nothing else" |
| 15 | Back as Grand Ocean: map `CKN-B5` → MEAT-001, 1 PACK = 5 KG | **the signature workflow** | show an invalid SKU first, then the valid match, then semantic confirmation |
| 16 | Create and submit a connected PO for 10 PACK | dual representation | "10 PACK = 50 KG, snapshotted at submission" |
| 17 | Fresh Foods accepts and ships | supplier ledger only | "Fresh Foods 200 → 190 PACK; Grand Ocean unchanged" |
| 18 | Grand Ocean receives 8 PACK, then 2 PACK | buyer ledger only, conversion | "70 → 110 → 120 KG" |
| 19 | Reports and final dashboard | reconciliation | "inventory value LKR 691,700, and every number traces to a movement" |
| 20 | Firestore console: movements and audit logs | data integrity | "immutable, server-timestamped, actor-attributed" |
| 21 | Test suite run | quality | rules, integration, ledger property test |
| 22 | GitHub repository, signed out | evaluator access | "public, with the full documentation set" |

---

# 10. Individual-contribution evidence

| Artifact | How it is produced | What it proves |
|---|---|---|
| Commit history with task ids | one task, one commit, `[SF-NNNN]` in every message | a traceable, incremental build by one person |
| `git shortlog -sn` and a commits-per-day chart | generated in S19 | sustained individual effort over 13 days |
| Tag timeline (`s0-baseline` … `submission`) | tagged at every gate | the project timeline as a figure |
| CI run history | GitHub Actions | independent, timestamped proof the suite passed |
| `docs/PROGRESS.md` | daily entries | decisions and problems, in the student's words |
| `01_FINAL_RECONCILIATION_REPORT.md` | this pack | evidence of design reasoning before coding |
| `13` with statuses | maintained through the build | scope control and completion tracking |
| Code review documents | Codex reviews with resolutions | engineering rigour |
| AI-assistance statement | written in S20 | honest disclosure; permitted use, student-controlled |

**Suggested wording for the AI statement** (adapt, do not copy blindly): *"Development used AI assistance under the permission granted by the module. Architecture and requirements were specified in advance in the documents in `docs/final/`. Implementation was drafted with an AI coding assistant against those specifications, reviewed independently with a second model for security and correctness, and browser-tested with an agentic QA tool. Every change was reviewed and committed by me, every design decision recorded in the decision log is mine, and this report is written in my own words. Sources of technical facts are referenced."*

---

# 11. Referencing log

Maintain `docs/references.md` from Day 1 — retrofitting citations is painful and error-prone.

Minimum set, all already used in this pack:

- Firebase Authentication — https://firebase.google.com/docs/auth
- Cloud Firestore data model — https://firebase.google.com/docs/firestore/data-model
- Firestore transactions and batched writes — https://firebase.google.com/docs/firestore/manage-data/transactions
- Security Rules conditions and access-call limits — https://firebase.google.com/docs/firestore/security/rules-conditions
- Insecure rules / Admin SDK bypass — https://firebase.google.com/docs/firestore/security/insecure-rules
- Role-based access solutions — https://firebase.google.com/docs/firestore/solutions/role-based-access
- Aggregation queries — https://firebase.google.com/docs/firestore/query-data/aggregation-queries
- Firestore best practices (hotspots, 500/50/5) — https://firebase.google.com/docs/firestore/best-practices
- Cloud Functions for Firebase — https://firebase.google.com/docs/functions
- Firebase pricing plans (Blaze requirement) — https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- Cloud Storage billing change — https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- Local Emulator Suite — https://firebase.google.com/docs/emulator-suite
- Firebase Hosting — https://firebase.google.com/docs/hosting
- React — https://react.dev
- Vite — https://vite.dev
- TypeScript — https://www.typescriptlang.org/docs/
- React Router — https://reactrouter.com
- TanStack Query — https://tanstack.com/query
- Zod — https://zod.dev
- React Hook Form — https://react-hook-form.com
- Tailwind CSS — https://tailwindcss.com
- Vitest — https://vitest.dev
- React Testing Library — https://testing-library.com/docs/react-testing-library/intro/
- Playwright — https://playwright.dev
- WCAG 2.2 — https://www.w3.org/TR/WCAG22/
- GitHub Actions — https://docs.github.com/actions

Record each as: URL, page title, date accessed. Format to Plymouth's referencing guide at the end.

---

# 12. Submission checklist

Mirrors `09` §11; reproduced here because this is the document open on the last day.

- [ ] Release A: every P0 test green
- [ ] Release B: every implemented P1 test green, or the feature removed and documented
- [ ] Zero Critical, zero High defects open
- [ ] Tenant isolation and idempotency proven by automated tests
- [ ] Production URL loads, both sign-in methods work, a full PO cycle completes live
- [ ] **GitHub repository verified in a signed-out private window**
- [ ] GitHub URL and live URL in the report
- [ ] Report covers: technologies, architecture, security, testing, performance, adaptability, problems and solutions, reflection, individual contribution
- [ ] All figures numbered, captioned and referenced
- [ ] References complete in Plymouth style
- [ ] Turnitin / Draft Coach check done
- [ ] AI-assistance statement included
- [ ] **PDF exported and renamed to the index number**
- [ ] Source code packaged (no `node_modules`, includes `docs/` and tests)
- [ ] Report and source submitted to the DLE
- [ ] Submitted PDF reopened and verified
- [ ] Submission receipt saved
- [ ] Deadline reconfirmed on the DLE — the brief itself says **TBA**; the working date is **24 August 2026**

---

# 13. Closing note

The system will be finished on 22 August. Whether it scores in the 60s or the 70s+ will be decided by the two days after that: whether the evidence was captured while building, whether the report explains the engineering rather than describing the screens, and whether the reflection contains real problems with real solutions.

**Capture the evidence as you go. Write the report as a technical argument, not a tour.**
