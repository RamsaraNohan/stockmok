# StockFlow — Final Reconciliation Report v2.0

**Status:** Final pre-design control review  
**Project:** StockFlow — Cloud Multi-Tenant Inventory & Procurement Management System  
**Coursework:** PUSL2021 Referral Coursework 2025/26  
**Review date:** 09 August 2026  
**Working deadline supplied by student:** 24 August 2026  
**Official brief deadline:** **TBA — DLE verification still required**

---

## 1. Purpose

This document replaces the previous reconciliation report as the authoritative record of what was checked, which earlier decisions remain valid, which decisions were improved, what technical ambiguity is now closed, and what still requires administrative verification.

This pass uses the **actual PUSL2021 coursework brief**, all StockFlow concept documents, the first Cowork final-control pack, and targeted verification of current official Firebase documentation.

The objective is not to add more product ideas. The objective is to remove ambiguity before design and coding.

---

## 2. Sources reviewed

### 2.1 Coursework authority

**CW-00 — Original PUSL2021 Referral Coursework 2025/26 brief**

Verified requirements:

- coursework type is **Individual Assignment**;
- student must design and implement a **Management System of their choice**;
- system must be a **fully working software application**;
- system must demonstrate **Create, Read/View, Update, Delete**;
- a **database connection** is expected;
- technologies listed in the brief are examples, not an exclusive mandated stack;
- all major features must be fully functional;
- work must be the student's own individual submission;
- final report must be submitted to DLE;
- completed source code must be submitted to DLE;
- source code must also be uploaded to GitHub;
- evaluators must be able to access the GitHub repository or the brief warns of zero marks;
- GitHub repository link must be included in the final report;
- final PDF must be renamed with the student's index number;
- marking text emphasizes an error-free system, quality, performance, adaptability, reflection and individual contribution;
- reflection should explain technologies, problems and solutions;
- report should be properly written and descriptive;
- plagiarism/referencing guidance applies;
- the brief itself lists the deadline as **TBA**;
- the brief references "submission and presentation" when discussing feedback but provides no presentation format, date or separate deliverable specification.

### 2.2 Original StockFlow concept pack

Reviewed:

- `00_DOCUMENT_INDEX.md`
- `01_PROJECT_BLUEPRINT.md`
- `02_DATABASE_CONCEPTUAL_DESCRIPTION.md`
- `03_END_TO_END_BUSINESS_STORY_FLOWS.md`
- `04_ROLE_BASED_LOGIN_AND_PERMISSIONS.md`
- `05_UI_UX_DESIGN_SPECIFICATION.md`
- `06_CROSS_DOCUMENT_CONSISTENCY_AND_GAP_REVIEW.md`
- `07_PROJECT_REVIEW_AND_COURSEWORK_ALIGNMENT.md`
- `08_FEASIBILITY_REPORT_12_DAY_EXECUTION.md`

### 2.3 First Cowork control pack

Reviewed and improved:

- `01_FINAL_RECONCILIATION_REPORT.md`
- `02_FINAL_REQUIREMENTS_SPECIFICATION.md`
- `03_FINAL_SCOPE_FREEZE.md`
- `04_FINAL_USE_CASES_AND_ACCEPTANCE.md`
- `05_FINAL_DOMAIN_AND_DATA_CONTRACT.md`
- `06_FINAL_SECURITY_AND_RBAC_MODEL.md`
- `07_FINAL_UI_INFORMATION_ARCHITECTURE.md`
- `08_FINAL_TEST_AND_QA_MATRIX.md`
- `09_FINAL_IMPLEMENTATION_READINESS_GATE.md`

### 2.4 Current technical verification

Current Firebase assumptions were checked against official documentation as of 09 August 2026.

Verified technical facts used in this pack:

1. Cloud Firestore transactions are atomic across multiple documents.
2. Firestore Security Rules can use `get()`, `exists()` and `getAfter()` to validate authorization and coordinated atomic writes.
3. Security Rules are not filters: queries must be structured so every returned document is permitted.
4. Web/mobile Firestore client access is evaluated by Security Rules.
5. Firebase/Admin server SDK access bypasses Firestore Security Rules, so backend code must perform its own authorization checks.
6. Production Cloud Functions deployment requires the Firebase **Blaze** plan.
7. Cloud Storage for Firebase also requires Blaze as of 03 February 2026.
8. Firestore supports aggregation queries including `count`, `sum` and `average`.
9. Firestore reads are document-level; sensitive and public fields should not be mixed in one readable document and expected to be hidden by rules.

Official references:

- https://firebase.google.com/docs/firestore/manage-data/transactions
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://firebase.google.com/docs/firestore/security/insecure-rules
- https://firebase.google.com/docs/firestore/solutions/role-based-access
- https://firebase.google.com/docs/firestore/query-data/aggregation-queries
- https://firebase.google.com/docs/firestore/security/rules-fields
- https://firebase.google.com/docs/functions
- https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024

---

## 3. Coursework traceability against the actual brief

| ID | Actual coursework requirement | StockFlow evidence | Status |
|---|---|---|---|
| CW-01 | Individual assignment | StockFlow is scoped as one student's project; repo/evidence rules require clear individual authorship | PASS conceptually |
| CW-02 | Design and implement a Management System | Inventory & Procurement Management System is the central product identity | PASS |
| CW-03 | Fully working software | Release A is independently complete and demonstrable | PASS conceptually; build pending |
| CW-04 | Create | Product/category/warehouse/partner/PO creation | PASS conceptually |
| CW-05 | Read/View | Lists, detail pages, dashboard, reports, history | PASS conceptually |
| CW-06 | Update | Editable master data and valid workflow updates | PASS conceptually |
| CW-07 | Delete | Safe archive/deactivate plus true deletion only where history is absent | PASS conceptually |
| CW-08 | Database connection | Firebase Authentication + Cloud Firestore | PASS conceptually |
| CW-09 | Major features fully functional | Scope freeze prevents unfinished features being counted as major coursework features | PASS conceptually |
| CW-10 | Own individual work | Student must understand, review and explain implementation and report content | PROCESS REQUIREMENT |
| CW-11 | Final report to DLE | Included in submission gate | PENDING |
| CW-12 | Source code to DLE | Included in submission gate | PENDING |
| CW-13 | GitHub repository | Required in final gate | PENDING |
| CW-14 | GitHub evaluator access | Explicit zero-mark-risk item in final gate | PENDING |
| CW-15 | Repository link in final report | Explicit final-report checklist item | PENDING |
| CW-16 | PDF renamed with index number | Explicit final packaging checklist item | PENDING |
| CW-17 | Error-free implementation strongly weighted | QA matrix gives P0 integrity/security tests priority over feature expansion | PASS conceptually |
| CW-18 | Quality/performance/adaptability | Multi-tenant design, bounded queries, reusable roles/categories/locations | PASS conceptually |
| CW-19 | Reflection covering technologies/problems/solutions | Development evidence log + reflection topics defined | PASS conceptually |
| CW-20 | Properly written descriptive report | Final report workflow included in feasibility/readiness plan | PENDING |
| CW-21 | Referencing / plagiarism compliance | Source log and student-review requirement added | PROCESS REQUIREMENT |
| CW-22 | Deadline | Brief says TBA | OPEN ADMIN — verify DLE |
| CW-23 | Presentation | Mentioned indirectly in feedback paragraph but no format/date specified | OPEN ADMIN — verify DLE |

**Coursework fit verdict:** **PASS.** No requirement in the supplied brief conflicts with the planned React/TypeScript/Firebase stack.

---

## 4. Authority model for the new nine-file pack

| Concern | Authority |
|---|---|
| Active implementation scope / feature cuts | `03_FINAL_SCOPE_FREEZE.md` |
| Functional / non-functional / business requirements | `02_FINAL_REQUIREMENTS_SPECIFICATION.md` |
| Entities, states, invariants, data ownership | `05_FINAL_DOMAIN_AND_DATA_CONTRACT.md` |
| Authentication, authorization, Firestore/Function trust boundaries | `06_FINAL_SECURITY_AND_RBAC_MODEL.md` |
| Use cases / acceptance stories | `04_FINAL_USE_CASES_AND_ACCEPTANCE.md` |
| Routes, screens, navigation, UI states | `07_FINAL_UI_INFORMATION_ARCHITECTURE.md` |
| Tests, evidence, release gates | `08_FINAL_TEST_AND_QA_MATRIX.md` |
| Whether work may proceed | `09_FINAL_IMPLEMENTATION_READINESS_GATE.md` |
| Decision history / rationale | this file |

If two documents appear to disagree, resolve the issue in the document that owns that concern, then update dependent references. Do not silently choose whichever sentence is convenient.

---

## 5. Reconciliation improvements over the first Cowork pack

### RC-01 — BLOCKER-00 closed

The actual brief has now been read. Technology compatibility is confirmed. There is no hidden requirement mandating Java/Python/PHP/MySQL specifically.

Residual items:
- official deadline remains TBA in the brief;
- presentation details are unspecified.

### RC-02 — Stock-changing writes now have one definitive architecture

All material stock-changing commands in Release A/B are executed by trusted backend command functions in the recommended deployment profile.

Each command:

1. authenticates the caller;
2. reads authoritative membership/role;
3. validates entity ownership and current state;
4. performs a Firestore transaction;
5. writes immutable StockMovement;
6. updates StockBalance and ProductStockSummary;
7. writes command/idempotency receipt;
8. writes required audit event;
9. returns committed result.

A rules-constrained client transaction is technically possible as a fallback but is not the primary implementation pattern.

### RC-03 — Blaze billing is now explicit

Production Cloud Functions require Blaze. Cloud Storage also requires Blaze.

Therefore:
- **Release A+B recommended deployment:** Blaze enabled + budget alerts;
- if Blaze cannot be enabled, do not quietly replace trusted backend commands with insecure client writes;
- logo upload cannot become a blocker: use monogram/default logo or safe static URL.

### RC-04 — Public business lookup separated from private Organization

New entity: `OrganizationDirectoryEntry`.

Used for:
- branded login lookup;
- exact-handle business discovery;
- safe pre-auth business name/logo.

The private `organizations/{orgId}` document is not made public.

### RC-05 — Business discovery is exact-handle first

Release B MUST support exact handle lookup such as `@freshfoods`.

Optional:
- name-prefix search.

Not required:
- fuzzy/full-text search.

### RC-06 — Handle is globally unique and immutable in coursework

Handle is:
- normalized;
- globally unique;
- atomically reserved;
- immutable in A/B.

### RC-07 — App routes are organization-explicit

Previous:
`/app/dashboard`

Final:
`/app/:handle/dashboard`

This makes business context visible and safer for bookmarks. Handle remains lookup context, not authorization.

### RC-08 — ProductStockSummary added

New derived entity:
- onHandTotal;
- reservedTotal;
- availableTotal;
- stockStatus;
- updatedAt.

It is updated atomically with stock commands and simplifies product list, low-stock queries and dashboard metrics.

### RC-09 — Private and connected PO state machines are separated

**Private supplier**
`DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED`

**Connected supplier**
`DRAFT → SUBMITTED → ACCEPTED → SHIPPED → PARTIALLY_RECEIVED → RECEIVED`

This prevents StockFlow from pretending an unconnected supplier "accepted" an order inside the platform.

### RC-10 — PARTIALLY_SHIPPED removed from coursework

Partial receiving stays. Multiple/partial dispatches are future scope.

### RC-11 — PO line snapshots mandatory

PO items snapshot names, SKUs, units, conversion and price at submission/ordering so later Product/Mapping edits do not rewrite history.

### RC-12 — Money and quantity representation clarified

Money:
- explicit currency;
- integer minor units where practical.

Quantity:
- explicit unit;
- consistent decimal precision (recommended max 3 decimals).

Canonical mapping:
`buyerBaseQuantity = supplierOrderQuantity × supplierToBuyerBaseFactor`

### RC-13 — ProductMapping creation is definitive

Default B-Lite:

1. connection ACTIVE;
2. supplier selected;
3. exact partner SKU found;
4. matched item shown;
5. user confirms semantic equivalence;
6. conversion entered;
7. backend re-validates;
8. mapping becomes VERIFIED.

Bilateral supplier confirmation is B-PLUS, not a B-MUST dependency.

### RC-14 — Invitation no longer depends on email delivery

Release A requires:
- invitation record for email + role;
- secure invite link/token;
- authenticated matching-email acceptance.

Email sending is optional convenience.

### RC-15 — Audit model made consistent

Server-audited actions:
- opening balance;
- adjustment;
- receipt;
- role/status change;
- product archive;
- connection response;
- connected PO transition;
- mapping verification.

Ordinary product field edits may rely on updatedBy/updatedAt; enterprise full-field audit is unnecessary for coursework.

### RC-16 — One canonical Owner

For coursework:
- one Owner created with org;
- Admin cannot change/remove Owner;
- owner transfer/multi-owner is future scope.

### RC-17 — Partner/public projections strengthened

Private Product, PartnerCatalogItem and StorefrontCatalogItem remain separate documents because Firestore reads are whole-document reads.

### RC-18 — Academic-integrity controls strengthened

Student must:
- understand and be able to explain code;
- review generated report prose;
- reference sources;
- verify institutional/module AI-use rules separately.

---

## 6. Explicitly rejected before submission

- dedicated database per customer;
- customer-owned Firebase project;
- full online order API;
- POS integration;
- automated reorder;
- AI forecasting;
- accounting integration;
- supplier marketplace;
- subscription billing;
- mobile app;
- multi-currency;
- batch/lot/expiry;
- barcode/serial;
- enterprise custom roles.

---

## 7. Remaining administrative risks

### ADMIN-01 — Official deadline
Brief says **TBA**; student working date is 24 Aug 2026.

Action: verify exact DLE date/time/timezone now.

### ADMIN-02 — Presentation
Brief references presentation but gives no format/date.

Action: verify DLE/module announcements.

### ADMIN-03 — AI-use policy
Brief contains own-work/plagiarism rules but no explicit AI rule.

Action: verify current module/university AI policy.

---

## 8. Final verdict

| Dimension | Result |
|---|---|
| Actual coursework brief verified | **YES** |
| Conceptual consistency | **PASS** |
| Technical consistency | **PASS** |
| Database concept | **PASS** |
| Security architecture | **PASS**, with Blaze prerequisite for recommended backend profile |
| 12-day feasibility | **CONDITIONAL PASS**, controlled by scope gates |
| UI-ready | **YES** |
| Implementation-ready | **YES**, after Day-1 deployment prerequisites are checked |
| Coursework fit | **PASS** |
| Unresolved conceptual blockers | **0** |
| Unresolved administrative items | **3** — deadline, presentation details, AI-use policy |

### Final project position

> Build **Release A + Release B-Lite first**. Promote to full Release B only after Release A and B-Lite are demonstrably stable. Release C remains optional. Release D remains excluded.

StockFlow is now sufficiently specified to proceed into UI design without further product brainstorming.
