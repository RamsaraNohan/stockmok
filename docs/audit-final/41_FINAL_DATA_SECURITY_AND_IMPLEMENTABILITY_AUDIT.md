# 41 — Stockmok Data, Security & Implementability Audit

**Purpose:** confirm the upcoming *design* remains implementable with the frozen stack (Firebase Auth + Firestore + Hosting + Cloud Functions 2nd-gen callables, Local Emulator Suite; **no Cloud Storage**) and the zone/RBAC/command architecture. No UI may require data the system cannot safely query.

---

## 1. Visual ↔ data availability

Every screen's data need checked against the domain contract (05) and dashboard strategy (05 §10).

| Screen data need | Backing source | Available? | Note |
|---|---|---|---|
| Dashboard KPIs (value, SKUs, low, open POs, awaiting) | `ProductStockSummary` (`stockValueMinor`, `stockStatus`) + PO `count()`/`sum()` aggregations | ✔ | Bounded reads (NFR-017: dashboard ≤12 reads). Redesign must not add KPIs needing unbounded scans |
| Stock status donut / by-location bar | `ProductStockSummary` + per-location `StockBalance` rollup (`TABLE-027`) | ✔ | Keep as lazy-loaded; text-alt already present |
| Product list rows | `products` + `productStockSummaries` | ✔ | Preferred-supplier name from `preferredPrivateSupplierId` |
| Product detail per-warehouse | `stockBalances/{productId}__{warehouseId}` | ✔ | Deterministic id |
| Movement history | `stockMovements` (immutable, paginated) | ✔ | Sort by time only (indexed) |
| Receiving previews (current/after/outstanding) | balance + PO line snapshots + conversion | ✔ | All present on line snapshots; no client math trusted |
| Connected PO dual representation | PO item snapshots (buyer + supplier units + factor) | ✔ | Both quantities persisted (no re-derivation) |
| Partner catalog (buyer) | `partnerCatalog.list`/`lookupBySku` callables | ✔ | **No direct client read** — design must route through callable |
| Mapping matched card | `partnerCatalog.lookupBySku` result | ✔ | Server-validated; typed SKU is lookup only |
| Notifications | `users/{uid}/notifications` | ✔ | Recipient updates `read` only |
| Audit | `organizations/{orgId}/auditLogs` (Owner/Admin) | ✔ | If an audit screen is added (ACR-001), read is bounded |

**Finding:** every current and proposed screen is backed by an available, bounded source. **No UI requires data the system cannot safely query.** The redesign must preserve two rules: (a) partner-catalog reads go through callables, never direct client reads; (b) no new KPI that needs an unbounded collection scan.

---

## 2. Visual ↔ RBAC

| UI expectation | RBAC source | Consistent? |
|---|---|---|
| Role-filtered sidebar | 06 matrix / 07 §4 | ✔ |
| Storekeeper: Receiving yes, Adjust no | matrix | ✔ (renders hide Adjust for SK) |
| Inventory Mgr: no Network | matrix | ✔ |
| PM: Connections yes, Disable no | matrix | ✔ (Disable hidden for PM) |
| Viewer: dashboard/products/Stock-on-Hand only | matrix | ✔ |
| Owner row protected from Admin | matrix / 07 §21 | ✔ (destructive actions absent, not disabled) |
| Report PO tab: SK/VW denied | matrix | ✔ (direct query → permission-denied) |

**Finding:** UI role-gating matches the RBAC matrix exactly, and correctly treats hiding as convenience (server is the boundary). The redesign must keep permission-denied as a *designed screen*, not a redirect. **Consistent — no conflict.**

---

## 3. Visual ↔ query / command feasibility

| Interaction | Command/query | Feasible on stack? |
|---|---|---|
| Product create w/ unique SKU | `product.create` + `productSkuIndex` txn.create | ✔ backend-only (rules can't enforce uniqueness) — design must show create as a server action (spinner + success), not optimistic client write |
| Warehouse archive | `warehouse.archive` bounded query in txn | ✔ backend-only — design must show archive-blocked message from server, not client-inferred |
| Stock adjust/opening/receipt | trusted stock commands w/ operationId | ✔ — design must generate operationId on form open, disable trigger while pending, safe-retry |
| Connection request/accept | zone-4 canonical + projections in one txn | ✔ callable |
| Mapping create | server re-validates connection/publication/product | ✔ callable — design must reflect server verification (not client "verified") |
| Connected PO submit/accept/ship/receive | canonical + both projections atomic | ✔ callables |
| KPIs | aggregation `count`/`sum` | ✔ bounded |

**Finding:** every action the UI offers maps to a defined command or bounded query. The one design-discipline requirement: **screens for backend-only operations (product create/update, warehouse archive, all stock/PO/connection/mapping transitions) must be designed around server round-trips** — loading state on submit, disabled trigger, idempotent retry, server-returned success/error — not optimistic client mutation. The mobile receiving (009) already models this well.

---

## 4. Cross-tenant privacy feasibility

| UI surface | Privacy control | Design obligation |
|---|---|---|
| Business discovery | public directory `get` only; `list` denied | Design exact-handle search only — **no browse/marketplace** grid |
| Partner catalog (buyer) | callable, allow-listed fields | Show only published fields + "partner projection" note; never render a stock quantity |
| Connected PO (supplier view) | projection excludes buyer-private | Supplier view must not show buyer internal notes/cost |
| Publish dialog | allow-list + order-unit lock | Design the privacy statement prominently |

**Finding:** the privacy model is enforceable and the UI honours it in intent. The redesign must **not** introduce any surface that displays another tenant's exact stock, cost, warehouse, members, or private partners. This is a hard boundary; the master prompt forbids it.

---

## 5. Trusted-backend / transactions / idempotency / feature-flags

| Property | Status | Design impact |
|---|---|---|
| Trusted commands (`defineCommand()`) | Specified; auth+membership+role+ownership+state re-checked | Design shows server-authoritative outcomes |
| Transactions | Movement+Balance+Summary+PO+audit+receipt atomic | Design shows single success, not multi-step partials |
| Idempotency (operationId + payload hash) | Specified | Design: generate id on open; "retry is safe" microcopy; no duplicate on double-click |
| Feature flags (`networkEnabled`, `storefrontEnabled`) | Settings-driven | Design NETWORK nav + routes to appear/disappear with flag; direct route → 404 |
| Loading/empty/error/denied states | Required on every P0/P1 | Design all states (this is "where the marks are") |
| Failure behaviour | Typed reason codes | Design human messages mapped from reason codes (not raw codes) |

**Finding:** all feasible on the frozen stack. The **P0 contingency** (no Blaze) is well-handled in the authorities: if backend commands can't run, cut Release B and keep a secure rules-constrained Release A. The design should be built so the NETWORK lane can be removed via feature flag without breaking Release A layouts — which the current IA already supports.

---

## 6. Implementation-complexity of proposed design improvements

Classified LOW/MED/HIGH complexity × HIGH/LOW value. Prefer HIGH_VALUE + LOW/MED.

| Proposed improvement | Value | Complexity | Verdict |
|---|---|---|---|
| Remove engineering copy (routes, FORM-###, spec sentences) | HIGH | LOW | **DO FIRST** |
| Redesign Product Mapping wizard (stepper, cards, preview, states) | HIGH | MED | **DO (signature)** |
| Bring desktop receiving/adjustment to mobile standard | HIGH | LOW-MED | **DO** |
| Redesign inventory forms with real labels | HIGH | LOW | **DO** |
| Strengthen Private/Connected structural signalling | HIGH | LOW | **DO** |
| Designed PO/connection timelines | MED | LOW | DO |
| Consolidate 5 dashboards into 1 adaptive + role deltas | MED | LOW | DO |
| Glyph refinement (S readability) | MED | MED | OWNER |
| Audit-log screen | MED | MED | OWNER (adds a route) |
| Animated transitions / micro-interactions | LOW | HIGH | **REJECT** (deadline risk; tokens prohibit motion) |
| Gradients / glass / dark theme | LOW | MED | **REJECT** (prohibited; off-brand) |
| Custom illustration set | LOW | HIGH | REJECT (use simple empty-state icons) |
| BI/trend charts | NEGATIVE | HIGH | **REJECT** (implies Release D) |

**Flagged risks (beautiful-but-expensive / deadline):** any motion system, custom illustration, bespoke charting, or per-screen novelty. The design must stay within the token system and reuse components; novelty belongs in *product substance*, not chrome.

---

## 7. Gates

| Gate | Verdict |
|---|---|
| DATA_AVAILABILITY for all UI | PASS |
| RBAC_CONSISTENCY | PASS |
| QUERY/COMMAND_FEASIBILITY | PASS |
| CROSS_TENANT_PRIVACY | PASS (hard boundary) |
| IDEMPOTENCY/TXN reflected in design | NEEDS design discipline (server round-trip screens) |
| FEATURE_FLAG behaviour | PASS |
| IMPLEMENTABILITY within frozen stack | PASS |
| COMPLEXITY of redesign | LOW-MED (safe for deadline if novelty is refused) |

**No UI in scope requires data the intended system cannot safely query.** The redesign is implementable without any architecture change.

---

# AMENDMENT — post complete-read of files 10 and 11

**IMPLEMENTABILITY_SCORE unchanged at 90.** Files 10 and 11 read end to end confirm the architecture is
sound and that every recommended redesign (DI-001…DI-010) is technically cheap — all are
presentation/microcopy/layout work over data that already exists with declared indexes.

**Nine design-binding constraints are now on record** (full list in file 51 F-06, and now stated in
file 45): closed four-surface realtime list · 25-row server pagination · indexed-sort-only · 25-component
cap · 17-package dependency freeze · no optimistic timestamps · no Delete anywhere · prefix-only search ·
no offline capability.

**Feasibility notes for the redesign:**
- DI-002 and DI-009 are free. DI-004/005/007/008/010 are free-to-low, provided new filter/sort controls
  stay inside the declared index set.
- DI-003 is fully backed — every number desktop receiving needs is persisted on the line snapshot.
- DI-001 is medium and fully backed by `partnerCatalog.lookupBySku`, but must be an explicit-lookup
  pattern (callable, 1–3 s cold start) and needs an **eighth** error state.
- **DI-006 has a real constraint:** the connections list is not realtime, so "incoming-request
  prominence" must use the notification badge or an explicit refresh — a live requests panel would be a
  forbidden fifth realtime surface.
- **DI-010's CSV export has no backing command** (none of C-01…C-32 is an export) and every query is
  `.limit()`-bounded, so any export must operate on already-fetched bounded rows and say so.

**Audit-log complexity corrected:** the "MED complexity" estimate in §6 is an overstatement. The
collection, its rules, its immutability tests and **two indexes** (IDX-18, IDX-19 *"org audit stream"*)
already exist. See file 49 ACR-001.

**New security-presentation finding — DI-023 (tenant context).** SCREEN-039 renders "Grand Ocean Hotel"
in the shell while its route is `/app/freshfoods/…`, i.e. the buyer's organisation on the supplier's
screen; MOBILE-007 replaces the org block with a route chip; MOBILE-011's drawer carries no organisation
context at all. This is **presentation-only** — no rule, query or data boundary is affected, and the
enforced isolation model is unchanged — but it is recorded here because tenant identity is the coursework's
central security claim and file 19 §5.4 requires *"Wrong organization denied"*. Severity HIGH, design-fixable.
