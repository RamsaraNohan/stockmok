# StockFlow — Final Scope Freeze v3.0

**Authority:** this file controls what is and is not built before coursework submission. It outranks enthusiasm.
**Build window:** 10 August 2026 (Day 1) → 22 August 2026 (Day 13). Submission 23–24 August 2026.
**Change from v2:** Release C is now **default NOT BUILT** rather than "optional", and the daily gates carry real dates.

---

## 1. Target release

| Level | Decision |
|---|---|
| **Required** | Release A + Release B-Lite |
| **Stretch** | Selected full-Release-B items, only if every gate is green |
| **Default NOT BUILT** | Release C read-only Storefront Catalog |
| **Never before submission** | Release D |

**The one-sentence scope:** *complete Release A, plus the largest Release B-Lite subset that passes every security and data-integrity test before code freeze on Day 13.*

---

# 2. Release A — the grade-protecting core

Release A must be complete, tested and independently demonstrable before any Release B work begins.

## A1 — Public site and authentication
One-page public site · email/password sign-up and sign-in · Google sign-in · logout · password reset · global login routing by membership count · branded login at `/b/:handle` with all eight states · non-enumerating error copy.

## A2 — Organization onboarding
Create business · name · globally unique immutable handle with reserved-word protection · industry · country · currency · timezone · monogram identity (**no logo upload**) · first warehouse · canonical Owner membership · organization settings with feature flags · user-scoped membership index · workspace selector · organization-explicit `/app/:handle/…` routes.

## A3 — Team and RBAC
Seven fixed built-in roles · one role per membership · invite by email with a secure single-use expiring link · accept invitation bound to the authenticated email · change ordinary member role · suspend and remove ordinary members · canonical Owner protected from Admin · role-aware navigation · authoritative server-side authorization · Security Rules with a tested deny-by-default posture.

## A4 — Inventory master data
Product create/read/update/archive with race-free SKU uniqueness · Category CRUD · Warehouse create/update and backend-guarded archive · search, filter, sort and bounded pagination · product detail with four tabs · per-warehouse stock visibility.

## A5 — Stock integrity
Opening balance movement · per-warehouse StockBalance · per-product StockSummary with derived stock value · adjustment with mandatory reason and result preview · negative-result rejection · low/out-of-stock derivation with defined precedence · immutable movement history · trusted backend stock commands · `operationId` idempotency with payload hashing · required audit events · integer milli-unit quantities and integer minor-unit money.

## A6 — Private partners
Private supplier CRUD · private buyer CRUD · deactivation preserving history · clear Private vs Connected visual distinction.

## A7 — Private procurement
DRAFT purchase order · ORDERED with generated order number and frozen snapshots · full and partial receiving with over-receipt rejection · atomic stock update · cancellation before any receipt · immutable history and timeline.

## A8 — Dashboard and reports
Inventory Value · active SKU count · Low Stock · Open POs · Awaiting Receipt · Recent Activity · Needs Attention with working deep links · Stock-on-Hand report · Purchase-Order report · in-app notifications with unread count · all KPIs derived by aggregation from operational data.

## A9 — Quality and security
Tenant isolation proven by rules tests · RBAC proven by tests · loading/empty/error/success/denied on every screen · responsive primary flows · no unhandled console errors · reproducible seed script · public GitHub repository with no committed secrets · CI green.

### Release A gate

> A marker must be able to grade Release A **alone** as a complete Inventory & Procurement Management System that satisfies every explicit requirement in the coursework brief.

---

# 3. Release B-Lite — the required differentiator

Built only after GATE-A passes. The minimum connected-business story, in order:

1. public `OrganizationDirectoryEntry` (get-only, listing denied)
2. exact-handle lookup
3. buyer → supplier connection request with a deterministic, duplicate-proof id
4. supplier accept or reject
5. supplier publishes a Partner Catalog item with allow-listed fields only
6. buyer selects the connected supplier
7. buyer enters the supplier partner SKU
8. the system validates it server-side against the published catalog
9. the matched item is shown beside the buyer's product
10. explicit semantic confirmation
11. explicit unit conversion with a worked preview
12. the backend creates a VERIFIED mapping
13. buyer creates a connected DRAFT purchase order (buyer-tenant only)
14. buyer submits — canonical shared record plus both org projections created atomically
15. supplier accepts or rejects
16. supplier ships
17. **supplier** stock decreases, via a supplier-side command
18. buyer receives fully or partially, entered in supplier order units
19. **buyer** stock increases, via a buyer-side command
20. both parties see the same attributed status history
21. in-app notifications on every connection and PO transition

---

# 4. Full Release B — stretch only

Permitted only when B-Lite is green and at least two build days remain:

richer connection detail · name-prefix discovery · mapping filters and bulk actions · bilateral mapping confirmation · richer notification routing · connected-supplier analytics.

**No B-PLUS item may delay QA, deployment or the report.**

---

# 5. Release C — read-only storefront

**Default: NOT BUILT.**

Permitted only if every P0 and every implemented P1 test is green by the end of Day 11 *and* the student explicitly decides to spend Day 12 on it instead of hardening.

If built: publish `StorefrontCatalogItem` · public read-only page at `/store/:handle` · allow-listed fields only · coarse availability state, never a quantity.

Never: checkout · sales order · reservation · payment · POS · any external stock write path.

---

# 6. Release D — explicitly excluded

Storefront order API · POS integration · any sales/outbound subsystem · dedicated Firestore database per business · customer-owned Firebase projects · webhooks and event buses · automatic reorder · AI forecasting or recommendations · accounting integration · subscription billing · mobile app · supplier marketplace · custom role builder · multi-owner governance · owner transfer · batch/lot/expiry tracking · serial numbers and barcodes · multi-currency purchase orders · multiple or partial shipments · weighted-average costing · enterprise full-text search · App Check · error-monitoring service · email delivery provider · file uploads.

---

# 7. Deliberate coursework simplifications

Each is a defensible engineering decision, not an omission. The report should present them this way.

| Area | Coursework decision | Future path |
|---|---|---|
| Roles | seven fixed roles, one per member | custom roles, multiple roles |
| Owner | one canonical Owner | transfer, multi-owner governance |
| Discovery | exact handle only | prefix and fuzzy search |
| Mapping | buyer-confirmed after server validation | bilateral confirmation |
| Supplier units | catalog order unit equals supplier base unit | multi-level conversion |
| Shipment | one SHIPPED event | multiple partial shipments |
| Receiving | full and partial | goods-received notes, QC, batches |
| Invitation | secure link, copied by the inviter | email delivery |
| Logo | monogram only | Cloud Storage upload with resizing |
| Costing | replacement cost from current purchase cost | weighted average / FIFO |
| Storefront | not built | read-only catalog, then ordering |
| Analytics | core actionable KPIs by aggregation | BI, forecasting |
| Cross-tenant reads | backend callables and projections | rules-level access via custom claims |
| Errors | typed reason codes, logged server-side | external error monitoring |

---

# 8. Technical deployment profile

## P1 — recommended, assumed

Firebase Authentication · Cloud Firestore · Hosting · Cloud Functions (2nd gen, Node 22, callable only) · Local Emulator Suite for all development and testing. **No Cloud Storage.**

**Requires the Blaze plan** for production Cloud Functions. Expected cost is effectively zero within the Blaze no-cost tier; a $5 budget alert and `maxInstances: 10` cap the risk.

## P0 — contingency if Blaze cannot be enabled

Do not weaken security to compensate. Apply this order:

1. Retain a fully secure Release A, moving commands into client-side Firestore transactions using the same shared domain functions.
2. Strengthen Security Rules substantially: field whitelists, arithmetic validation, `getAfter()` to require coordinated writes, `create`-only receipts for replay protection.
3. **Cut Release B entirely** — cross-tenant state transitions cannot meet the security contract without a trusted server.
4. Document the connected-business concept as future scope, honestly.

**A smaller, fully secure Release A beats a larger insecure system.** This decision is made on Day 1, not discovered on Day 10.

---

# 9. Feature-cut ladder

Apply in order, from the top, whenever the schedule slips.

| Cut | What goes | Trigger |
|---|---|---|
| **CUT-0** | Dashboard charts | any slippage — they are decorative and lazy-loaded |
| **CUT-1** | Release C | already the default |
| **CUT-2** | All B-PLUS extras | one day behind at Day 6 |
| **CUT-3** | Connected PO, keeping Connection + Partner Catalog + Mapping | one day behind at Day 8 |
| **CUT-4** | Release B entirely | GATE-A not passed on Day 9 |
| **CUT-5** | E2E specs reduced from 8 to 5 | two days behind |

**Never cut, under any circumstance:** CRUD · database connection · authentication · tenant isolation · stock correctness · private procurement and receiving · dashboard basics · the test suite · production deployment · the report and its evidence.

The report is scheduled *before* optional features and is protected by cutting features, never the reverse.

---

# 10. Daily gates with dates

| Day | Date | Gate |
|---|---|---|
| 1 | Mon 10 Aug | Repository green in CI · Firebase project created · **Blaze decided** · emulators running · **a real function and site deployed to production once** · UI design started · no stack ambiguity remains |
| 2 | Tue 11 Aug | Design system built · public site and authentication working · **UI design frozen** |
| 3 | Wed 12 Aug | Command framework built and reviewed · organization creation atomic · handle uniqueness proven under concurrency |
| 4 | Thu 13 Aug | RBAC enforced in rules, backend and UI · first rules test suite green · invitations working |
| 5 | Fri 14 Aug | Product/Category/Warehouse CRUD complete · SKU uniqueness race-free · warehouse archive guarded |
| 6 | Sat 15 Aug | **Stock ledger correct**: atomic, idempotent, exactly reconciling under a randomised property test |
| 7 | Sun 16 Aug | Private partners and private purchase orders complete with frozen snapshots |
| 8 | Mon 17 Aug | Receiving complete · dashboard and reports reconcile against the seed table |
| 9 | Tue 18 Aug | **GATE-A: every P0 test green, zero Critical, zero High.** Written go/no-go for Release B. Dependencies frozen. |
| 10 | Wed 19 Aug | Connections and Partner Catalog working with no cross-tenant leakage |
| 11 | Thu 20 Aug | Mapping wizard complete with all error states · connected PO underway · **final feature-scope decision** |
| 12 | Fri 21 Aug | **GATE-B-LITE: every implemented P1 test green.** Feature freeze declared. |
| 13 | Sat 22 Aug | Polish, responsive and accessibility done · **production deployed, seeded and smoke-tested** · code freeze |
| 14 | Sun 23 Aug | Final regression · all evidence captured · demo recorded · report written |
| — | Mon 24 Aug | **Deadline.** Buffer only. No code changes. |

---

# 11. Scope-change protocol

A new implementation feature is permitted only when **all six** hold:

1. Release A is green.
2. It closes a real requirement gap or fixes a defect.
3. The student approves it in writing.
4. Tests and documents are updated in the same change.
5. At least two build days remain.
6. It requires no redesign of stable core code.

**AI agents cannot self-approve a scope change.** An agent that believes something is missing must stop and report.

---

# 12. Design-scope freeze

Designers produce: all P0 Release A screens; all P1 Release B-Lite screens; nothing else. Release C is designed only if separately commissioned. Release D screens must not be produced at all — they distract implementation and tempt scope creep.

Design must be frozen at the end of **Day 2**. After that, only defect fixes and the responsive/accessibility pass in Stage 17.

---

# 13. Final declaration

> **StockFlow Coursework Release = a complete, tested, deployed Release A, plus the largest Release B-Lite subset that passes every security and data-integrity test before code freeze on 22 August 2026.**
>
> If a feature cannot be made green, it is removed from the interface and documented as future scope. Nothing broken ships visible.
