# 39 — Stockmok Information Architecture & Workflow Audit

**Authority under audit:** 07 (IA), 19 (screen registry), 20 (route map). Per authority order, 07 owns approved route/screen architecture unless a verified usability defect requires an OWNER change request.

---

## 1. Overall IA verdict

**UI_INFORMATION_ARCHITECTURE: PASS (with minor refinements).** The route strategy, navigation grouping, role-aware nav, guard layers and state contract are well-designed and coursework-appropriate. The IA is **not** the problem; the visual expression is. No structural re-architecture is recommended. The refinements below are presentation-level and mostly do not require an OWNER architecture change (exceptions flagged).

---

## 2. Navigation structure audit

Current top-level nav: Dashboard · INVENTORY (Products, Categories, Warehouses, Stock Movements) · PROCUREMENT (Purchase Orders, Receiving, Suppliers, Buyers) · NETWORK [flagged] (Connected Businesses, Partner Catalog, Product Mappings) · Reports · Notifications · Team · Settings.

| Criterion | Assessment | Action |
|---|---|---|
| Label clarity | Strong; plain-language, no jargon in nav | KEEP |
| Grouping | Logical (Inventory / Procurement / Network) | KEEP |
| Task frequency | Receiving and Products are high-frequency and correctly near the top of their groups; Adjust Stock is an action, not a nav item — correct | KEEP |
| Discoverability | Good; Categories given an explicit item (fixing a v2 ambiguity) | KEEP |
| Mental model | Matches an inventory/procurement operator's model | KEEP |
| Depth | Shallow (2 levels max) — appropriate | KEEP |
| Breadcrumbs | Present and accurate (`Inventory / Products / …`); "breadcrumbs never contain inaccessible links" | KEEP |
| Cross-linking | Dashboard KPIs/Needs-Attention deep-link to filtered screens; partner→connection→mapping links present | KEEP; verify all deep links resolve in redesign |
| Role relevance | Role-aware sidebar per 07 §4 is correct and segregation-of-duties-literate | KEEP |
| Mobile nav | Slide-over drawer (SCREEN-043) is the strongest current asset — role-filtered, monogram+name, unread count | KEEP/REFINE |
| Feature-flag behaviour | NETWORK hidden when `networkEnabled` off; direct route → 404 (not silent redirect) | KEEP (excellent) |

### Scope-leakage rejection check (explicit)
No `Sales & Storefronts`, Sales, Production, People, Vessels, Voyages, POS, Accounting, Marketplace, or AI section exists. **PASS.** The redesign must not add any of these "because enterprise software usually has them."

### Minor IA refinements (presentation-level)
1. **Private/Connected structural signalling.** Suppliers/Buyers use Private/Connected/Pending tabs (good). Purchase Orders use Private/Connected tabs (good). Strengthen the *visual* distinction inside detail screens (header band + accent), not the IA. (No architecture change.)
2. **Dashboard role-variants (044–047).** Present these as one adaptive dashboard with role-driven module visibility, not five separate design targets. (No architecture change; a design-consolidation note.)
3. **Audit-log surface (OWNER decision).** Consider a first-class Owner/Admin "Audit log" route under Settings or Team. Adding a route *is* an IA change → OWNER_DECISION_REQUIRED (file 49 ACR-001). Default: keep audit inside per-object Activity to avoid scope growth before submission.

---

## 3. Route map audit (07 §2 / 19 §2)

| Area | Routes | Verdict |
|---|---|---|
| Public | `/`, `/login`, `/signup`, `/b/:handle`, `/invite/:token`, `/store/:handle` [C, not built], `*` | Correct; storefront route present but gated to C — must not be linked in A/B |
| Pre-org | `/select-workspace`, `/onboarding` | Correct (workspace selector added in v3 — good) |
| Org-scoped | `/app/:handle/…` for dashboard, inventory/*, procurement/*, network/*, reports, notifications, team, settings | Correct, organization-explicit, handle is context-only |
| Not routes | stock adjustment (modal), publish (dialog), invite (dialog), confirmations | Correct — appropriate use of overlays |
| Guard layers | PublicLayout / AuthLayout / OrgLayout / RequireRole; skeleton while unresolved; direct-URL forbidden → permission-denied (not silent redirect) | Excellent; keep verbatim |

**Route findings:**
- **Defect (visual, not routing):** every deterministic render prints the raw route as an on-screen pill (`/app/grand-ocean/dashboard`). Routes must be in the address bar only, never in the page body. REMOVE_FROM_UI. (file 40 §user-copy.)
- **KEEP:** the decision to render permission-denied and 404 rather than silently redirect — this is a coursework strength (it surfaces bugs and demonstrates the security boundary).

---

## 4. Task-hierarchy / action-hierarchy audit

| Screen class | Primary action | Current treatment | Action |
|---|---|---|---|
| Lists (Products, POs, Suppliers) | Add / Create | Present, top-right | KEEP; ensure single unambiguous primary |
| Detail (PO, Product) | State-appropriate primary (Mark Ordered / Receive / Edit) | Present but multiple same-weight buttons on some renders | REFINE — one primary, rest secondary/ghost |
| Wizards (Onboarding, PO builder, Mapping) | Continue / Create | **Mapping (036) shows 4 competing primary-styled buttons** ("Create verified mapping", "Continue", "Create verified mapping on review", repeated) | REDESIGN — single stepper with one contextual primary |
| Receiving | Confirm Receipt (sticky) | Mobile good; desktop weak | REDESIGN desktop |
| Destructive | Archive/Cancel/Disable/Remove | Correctly danger-styled + object-named confirmation | KEEP |

**Finding:** action hierarchy is well-specified in 07/19 (destructive confirmations name the object; ordinary saves are not confirmed — avoids confirmation fatigue). The *renders* violate it on wizard screens by showing multiple equal-weight primaries. REFINE/REDESIGN as noted.

---

## 5. Role-visibility (IA) audit

Cross-check of 07 §4 nav table against 06 RBAC matrix:

| Role | Nav shown | Matches RBAC? |
|---|---|---|
| Owner/Admin | Everything | ✔ |
| Inventory Manager | Dashboard, Products, Categories, Warehouses, Movements, Receiving, Reports, Notifications | ✔ (no Network — connections are procurement's; correct) |
| Procurement Manager | Dashboard, POs, Receiving, Suppliers, Buyers, Connections, Partner Catalog, Mappings, Reports, Notifications | ✔ (PM cannot Disable connection — hidden action, server-enforced) |
| Storekeeper | Dashboard, Products (read), Receiving, Movements, Notifications | ✔ (cannot Adjust stock — segregation of duties) |
| Analyst | Dashboard, Products (read), Movements (read), POs (read), Reports, Notifications | ✔ (no audit, no team) |
| Viewer | Dashboard, Products (read), Reports (Stock-on-Hand only), Notifications | ✔ (narrowest; no PO/movements) |

**Findings:**
- **PASS:** nav visibility is consistent with the RBAC matrix and with the "hidden ≠ security" principle. State board STATE-010 correctly demonstrates permission-denied for direct-URL access.
- **KEEP:** the explicit statement that hiding is convenience and the server is the boundary — this is exactly what a marker wants to see and what portfolio reviewers respect.
- **REFINE:** the four role-dashboard renders should be shown as *deltas* of one dashboard in the redesign, with a small legend of "what each role sees", which is more impressive than five near-identical pages.

---

## 6. Mobile IA audit

| Aspect | Assessment |
|---|---|
| Drawer nav (043/MOBILE-011) | Strong; role-filtered; NETWORK gated; focus-trapped |
| Mobile priority order (login, dashboard, product list/detail, adjustment, PO detail, receiving) | Correct per 07 §24 |
| Receiving one-handed (MOBILE-009) | Strong — stepper, sticky confirm, arithmetic above fold |
| Bottom-nav | Correctly *not* invented (drawer chosen) — keep |
| Info preservation at 390px | Good in dashboard (004) and product list (005) via labelled cards |

**Finding:** mobile IA is the **best-realised part of the current package**. The redesign should treat mobile receiving (009) and the drawer (043) as reference-quality and bring desktop up to their standard, not the reverse.

---

## 7. IA gate

| Gate | Verdict |
|---|---|
| Navigation structure | PASS |
| Route strategy & guards | PASS |
| Scope-leakage | PASS (none) |
| Role visibility vs RBAC | PASS |
| Deep-link / cross-link integrity | PASS (verify in redesign) |
| Mobile IA | PASS |
| On-screen route/engineering copy | **NEEDS_CHANGE** (remove) |
| Action-hierarchy on wizards | **NEEDS_CHANGE** (single primary) |
| **UI_INFORMATION_ARCHITECTURE overall** | **PASS with presentation refinements** |

No OWNER architecture change is required for the IA except the optional Audit-log route (ACR-001). Everything else is presentation and belongs to Claude Design within its authority boundary.
