# 37 — Stockmok End-to-End Concept & Service Audit

**Companion to:** 36 (vision), 39 (IA/workflow detail), 38 (screen/visual verdicts).
**Scope:** business-capability completeness, end-to-end journeys, private-vs-connected distinction. Concept is judged against the North Star; visual support is judged against the current renders.

---

## 1. Release completeness verdicts

| Question | Verdict | Basis |
|---|---|---|
| Does Release A function independently as a complete Management System? | **YES (by design)** | A1–A9 in scope-freeze cover public+auth, org, RBAC, inventory master data, stock integrity, private partners, private procurement, dashboard/reports, quality/security. Every CRUD verb is present (create/read/update/archive-or-deactivate). |
| Can a role create / read / update / archive data through clear CRUD flows? | **YES (conceptually); NO (in current visuals for form screens)** | CRUD is fully specified; the current *visual* for create/edit screens (Product, Category, Warehouse, mapping) is spec-scaffold, so a reviewer cannot see the CRUD clearly today. |
| Can a real small business understand the value? | **PARTIALLY** | Public home + dashboard communicate well; the operational screens read as internal wireframes, undercutting comprehension. |
| Is Stockmok primarily inventory + procurement (not ERP/POS/sales/marketplace/AI)? | **YES** | Zero scope leakage confirmed in navigation and all 52 screens. |
| Does B-Lite improve the project without making A depend on it? | **YES** | NETWORK is feature-flagged; A is gated (GATE-A) before any B work; cut-ladder can remove B entirely (CUT-4) without breaking A. |

### Completeness classification

| Class | Items |
|---|---|
| **MISSING_CRITICAL** | None at the concept/data level. (Critical gap is *visual*: the Product Mapping wizard has no usable design — tracked as a design blocker, not a missing capability.) |
| **MISSING_USEFUL** | (a) No dedicated **Audit Log viewer** screen for Owner/Admin — audit exists in data (5.27) and in per-object Activity, but a first-class "Audit log" screen would strengthen the trust story and the viva. OWNER decision. (b) No **CSV import** for opening balances (acceptable omission; seed script covers demo). |
| **OVERBUILT** | Dashboard charts (CHART-001..003) — already correctly flagged as CUT-0/first-to-cut and lazy-loaded; keep only if free. Six review contact sheets + eight showcase boards + eight review boards is heavy QA scaffolding for a coursework package (fine as internal evidence, not a product concern). |
| **FUTURE_ONLY (correctly excluded)** | Storefront (C), sales/outbound, reservations, batch/lot/expiry, barcodes, multi-shipment, weighted-average costing, auto-reorder, AI forecasting, per-tenant DB, file uploads, custom roles, owner transfer, email delivery. All correctly deferred. |
| **DUPLICATED** | The four dashboard role-variants (SCREEN-044..047) plus the base populated dashboard (010) overlap heavily; in implementation these are one role-filtered component, not five screens. Not a defect — but the *design* should present them as one adaptive layout with role deltas, not five bespoke pages. |
| **UNNECESSARY** | None in product scope. |

---

## 2. End-to-end journey audit

Each journey judged for friction, ambiguity, permission boundary, data effect, mobile, and current visual support. "Current visual support" is the honest state of the rendered assets.

### JOURNEY 01 — Public → signup → org creation → dashboard
- **Actor:** Visitor → Owner. **Entry:** `/`.
- **Steps:** home → Create Workspace → sign up (email/Google) → onboarding (name, handle w/ live normalisation, industry, locale, first warehouse) → atomic create → empty dashboard with setup checklist.
- **System feedback:** live handle availability; "handle immutable" warning; no half-created org on failure.
- **Permission boundary:** none pre-auth; org created with canonical Owner membership.
- **Data effect:** one transaction writes user, handleReservation, org, directory, settings, Owner membership + mirror, first warehouse, audit.
- **Current visual support:** STRONG (001, 002, 007, 009 legible & polished-ish). **Friction:** none material. **Ambiguity:** low. **Improvement:** remove route pills; ensure empty-dashboard checklist links resolve.

### JOURNEY 02 — Invitation → auth → workspace → role-aware dashboard
- **Actor:** Invitee. **Entry:** `/invite/:token` or `/b/:handle`.
- **Steps:** open invite → authenticate with matching email → membership ACTIVE → role-aware dashboard/sidebar.
- **Feedback:** distinct reasons for mismatch/expired/reused; branded login shows role-preference ≠ access.
- **Data effect:** invitation PENDING→ACCEPTED; membership + mirror; audit.
- **Current visual support:** STRONG (004, 005, 006, 050; STATE-001/009). **Improvement:** REFINE only.

### JOURNEY 03 — Create category/warehouse/product → opening stock
- **Actor:** Inventory Manager.
- **Steps:** add category (Meat) → add warehouse (Cold Room) → add product (Chicken Breast, MEAT-001, KG, min 20, reorder 50, cost 1,250) → record opening balance 18 KG into Cold Room → product shows LOW STOCK (18<20).
- **Data effect:** SkuIndex create (race-free), OPENING_BALANCE +18, balance 18, summary value 22,500, audit, receipt.
- **Current visual support:** **WEAK.** Product form (012), Category (014), Warehouse (015), Opening balance (042) all render spec text ("nonnegative money/quantity", "FORM-006") instead of real labelled fields. **Friction:** high for a reviewer — the core CRUD is not legibly shown. **Improvement:** REDESIGN these forms (file 38).

### JOURNEY 04 — Find low stock → adjustment → ledger → updated summary
- **Actor:** Inventory Manager.
- **Steps:** dashboard low-stock deep link → adjust +2 KG (reason "Recount correction", operationId OP-A) → preview 18→20 → confirm → status LOW→IN_STOCK → movement history entry.
- **Feedback:** live Current→Change→Result; negative-result reject; idempotent retry; low-stock count 4→3.
- **Current visual support:** **MIXED.** Desktop adjustment (016) is spec-scaffold; **mobile adjustment (007) is good** (real fields, preview 20 KG). Movement history (017) legible. **Improvement:** REDESIGN desktop modal to match the mobile quality.

### JOURNEY 05 — Private supplier → PO → order → partial → full receipt
- **Actor:** Procurement Manager + Storekeeper.
- **Steps:** add supplier Green Farm → DRAFT PO (Chicken Breast, 50 KG @1,200) → Mark Ordered (order number allocated, line snapshot) → receive 40 KG (PARTIALLY_RECEIVED, balance 60) → receive 10 KG (RECEIVED, balance 70).
- **Feedback:** no fake "Supplier Accepted"; over-receipt blocked; idempotent.
- **Current visual support:** **MIXED.** PO builder (022) scaffold; PO detail (023) acceptable; **desktop receiving (024) scaffold form but correct Receiving-Lines table**; **mobile receiving (009) STRONG.** **Improvement:** REDESIGN PO builder + desktop receiving form to the mobile standard.

### JOURNEY 06 — Connection discovery → request → approval
- **Actor:** Procurement Manager (buyer + supplier orgs).
- **Steps:** discovery by exact handle `@freshfoods` → safe result card → Connect as Supplier → supplier accepts → ACTIVE connection + projections + notifications.
- **Feedback:** duplicate-proof id; self-connection rejected; list denied.
- **Current visual support:** **WEAK.** Discovery (032) and Connected Businesses (031)/detail (033) are scaffold. STATE-006 documents the states well. **Improvement:** REDESIGN.

### JOURNEY 07 — Supplier publishes Partner Catalog
- **Steps:** supplier picks a product → publish dialog (allow-listed fields, order unit locked = base unit, privacy explanation) → PartnerCatalogItem projection.
- **Current visual support:** **WEAK.** Supplier catalog (034) + publish dialog (051) scaffold. The privacy explanation (a strong selling point) is not legibly designed. **Improvement:** REDESIGN — make the "buyers cannot see your stock/cost/warehouse" message a designed, prominent panel.

### JOURNEY 08 — Buyer product mapping (SIGNATURE)
- **Steps:** select connected supplier → enter partner SKU `CKN-B5` → server validates against catalog → matched item shown beside buyer product → semantic confirm (unticked) → conversion 1 PACK=5 KG with worked preview 10 PACK=50 KG → VERIFIED mapping.
- **Feedback:** 7 error states (no connection, SKU not found, not published, semantic declined, invalid factor, stale connection, duplicate).
- **Current visual support:** **FAIL.** SCREEN-036 renders five empty inputs labelled with the spec's step descriptions; no stepper, no side-by-side cards, no checkbox, no preview, duplicate buttons, raw route + FORM-020 exposed. STATE-007 lists the states as text but does not design them. **This is the #1 redesign priority (file 42 DI-001).**

### JOURNEY 09 — Connected PO submit → accept/reject → ship → receive
- **Steps:** buyer connected DRAFT (private) → submit (canonical + two projections atomic) → supplier accept/reject → ship (supplier stock 200→190 PACK) → buyer receive 8 PACK (110 KG) then 2 PACK (120 KG).
- **Feedback:** attributed shared timeline; buyer stock unchanged at SHIPPED; over-receipt blocked; idempotent.
- **Current visual support:** **ACCEPTABLE.** Buyer PO (038) shows dual representation well; supplier PO (039) ok; connected receiving (040) has the arithmetic. STATE-008 covers the chain. **Improvement:** REFINE (add designed timeline; unify with private PO detail pattern; strip route pill).

### JOURNEY 10 — Reports / notifications / auditability
- **Steps:** Stock-on-Hand report (value = replacement cost disclosure) + PO report (filters, CSV) → notifications (unread, mark read, one per status change) → audit (Owner/Admin).
- **Current visual support:** **MIXED.** Reports shell (025) scaffold; report tabs (048/049) acceptable tables; notifications (026/052) legible; no dedicated audit screen. **Improvement:** REDESIGN reports shell; consider audit-log screen (OWNER).

---

## 3. Private vs Connected procurement — distinction audit

The North Star requires these two models be **obviously different, without Private looking broken**.

| Aspect | Private | Connected | Current visual clarity |
|---|---|---|---|
| Counterparty | External supplier, no account | Another Stockmok org | Buyer PO (038) shows Supplier + "Connected" badge; private PO (023) shows "Private" badge — **distinction present but subtle** |
| PO states | DRAFT→ORDERED→PARTIALLY_RECEIVED→RECEIVED→CANCELLED | DRAFT→SUBMITTED→ACCEPTED→SHIPPED→PARTIALLY_RECEIVED→RECEIVED→REJECTED | STATE-004 vs STATE-008 — both documented |
| Supplier acceptance | **Never shown** (supplier not a user) | Shown (accept/reject/ship) | Correctly absent on private (022/023) ✔ |
| Units | Base unit | Supplier order unit + conversion | Connected shows dual representation ✔; private single unit ✔ |
| Ledger effect | Buyer receipt only | Supplier ship (out) + buyer receive (in) | Correct in data; timelines need design |

**Findings:**
- **PASS on logic:** the models are not blurred; private never fakes acceptance; connected shows dual units.
- **REFINE on visual signalling:** the Private vs Connected badge is currently a small pill. The redesign should make the distinction *structural* (e.g., a persistent "Private order" / "Connected order — Fresh Foods" header band and a distinct accent), not just a pill, so a marker sees it instantly. (file 38, SCREEN-021/023/038.)
- **KEEP:** the shared PO list/report serving both kinds (one TABLE-010/014) is a smart, defensible simplification — preserve it.

---

## 4. Service-completeness summary

| Capability | Concept | Data | Security | Workflow | Test | Current visual | Net action |
|---|---|---|---|---|---|---|---|
| Auth & public | ✔ | ✔ | ✔ | ✔ | ✔ | STRONG | REFINE |
| Org & multi-tenant | ✔ | ✔ | ✔ | ✔ | ✔ | ACCEPTABLE | REFINE |
| RBAC & team | ✔ | ✔ | ✔ | ✔ | ✔ | ACCEPTABLE | REFINE |
| Inventory master data (CRUD) | ✔ | ✔ | ✔ | ✔ | ✔ | WEAK visual | REDESIGN forms |
| Stock ledger | ✔ | ✔ | ✔ | ✔ | ✔ | MIXED | REDESIGN adj/opening |
| Private procurement | ✔ | ✔ | ✔ | ✔ | ✔ | MIXED | REDESIGN builder/receiving-desktop |
| Dashboard & reports | ✔ | ✔ | ✔ | ✔ | ✔ | MIXED | REFINE dash / REDESIGN reports shell |
| Notifications | ✔ | ✔ | ✔ | ✔ | ✔ | ACCEPTABLE | REFINE |
| Connections | ✔ | ✔ | ✔ | ✔ | ✔ | WEAK | REDESIGN |
| Partner catalog | ✔ | ✔ | ✔ | ✔ | ✔ | WEAK | REDESIGN |
| Product mapping (signature) | ✔ | ✔ | ✔ | ✔ | ✔ | **FAIL** | **REDESIGN (blocker)** |
| Connected PO (signature) | ✔ | ✔ | ✔ | ✔ | ✔ | ACCEPTABLE | REFINE |
| Audit | ✔ | ✔ | ✔ | ✔ | ✔ | no dedicated screen | ADD (owner decision) |

**Conclusion:** the *service* is complete and coursework-true. The *service made visible* is incomplete: 1 signature screen fails, ~7 form/network screens are weak, the rest is acceptable-to-strong. This is a design deliverable problem, cleanly separable from architecture.
