# Stockmok Final Multi-Screen and Review-Board Prompts

**Status:** `PROMPT_BOARD_LIBRARY_FREEZE = PASS`  
**Prompt status:** all 16 records are `APPROVED_FOR_GENERATION`  
**Scope:** Release A and Release B-Lite only; these boards are additional review and showcase artifacts and never substitute for any individual source visual.  
**Authority:** frozen screen, route, design-system, state, chart, and brand contracts in files 18–25. File 27 owns the prompt bodies below; no other file may duplicate or modify them.

## 1. Board register

| Prompt ID | Visual ID | Board | Exact output path | Status |
|---|---|---|---|---|
| `PROMPT-BOARD-001` | `VISUAL-BOARD-001` | Brand + Design System | `visual-designs/generated/22_showcase-boards/VISUAL-BOARD-001_brand-design-system.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-BOARD-002` | `VISUAL-BOARD-002` | Public + Auth | `visual-designs/generated/22_showcase-boards/VISUAL-BOARD-002_public-auth.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-BOARD-003` | `VISUAL-BOARD-003` | Dashboard + Inventory | `visual-designs/generated/22_showcase-boards/VISUAL-BOARD-003_dashboard-inventory.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-BOARD-004` | `VISUAL-BOARD-004` | Procurement + Receiving | `visual-designs/generated/22_showcase-boards/VISUAL-BOARD-004_procurement-receiving.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-BOARD-005` | `VISUAL-BOARD-005` | Connected + Mapping | `visual-designs/generated/22_showcase-boards/VISUAL-BOARD-005_connected-mapping.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-BOARD-006` | `VISUAL-BOARD-006` | Reports + Team + Settings | `visual-designs/generated/22_showcase-boards/VISUAL-BOARD-006_reports-team-settings.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-BOARD-007` | `VISUAL-BOARD-007` | Mobile | `visual-designs/generated/22_showcase-boards/VISUAL-BOARD-007_mobile.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-BOARD-008` | `VISUAL-BOARD-008` | Complete Showcase | `visual-designs/generated/22_showcase-boards/VISUAL-BOARD-008_complete-showcase.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-REVIEW-001` | `VISUAL-REVIEW-001` | All Public + Auth | `visual-designs/review-boards/VISUAL-REVIEW-001_all-public-auth.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-REVIEW-002` | `VISUAL-REVIEW-002` | All Dashboard + Inventory | `visual-designs/review-boards/VISUAL-REVIEW-002_all-dashboard-inventory.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-REVIEW-003` | `VISUAL-REVIEW-003` | All Procurement | `visual-designs/review-boards/VISUAL-REVIEW-003_all-procurement.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-REVIEW-004` | `VISUAL-REVIEW-004` | All Network | `visual-designs/review-boards/VISUAL-REVIEW-004_all-network.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-REVIEW-005` | `VISUAL-REVIEW-005` | All Admin | `visual-designs/review-boards/VISUAL-REVIEW-005_all-admin.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-REVIEW-006` | `VISUAL-REVIEW-006` | All Mobile | `visual-designs/review-boards/VISUAL-REVIEW-006_all-mobile.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-REVIEW-007` | `VISUAL-REVIEW-007` | All States | `visual-designs/review-boards/VISUAL-REVIEW-007_all-states.png` | `APPROVED_FOR_GENERATION` |
| `PROMPT-REVIEW-008` | `VISUAL-REVIEW-008` | Complete Product Overview | `visual-designs/review-boards/VISUAL-REVIEW-008_complete-product-overview.png` | `APPROVED_FOR_GENERATION` |

## 2. Product showcase board prompts

### PROMPT-BOARD-001 — Brand + Design System

**Visual:** `VISUAL-BOARD-001`  
**Exact source visuals:** `VISUAL-BRAND-002`, `VISUAL-BRAND-003`, `VISUAL-BRAND-004`, `VISUAL-BRAND-005`, `VISUAL-BRAND-006`, `VISUAL-COMP-001`, `VISUAL-COMP-002`, `VISUAL-COMP-003`, `VISUAL-COMP-004`, `VISUAL-COMP-005`, `VISUAL-COMP-006`, `VISUAL-COMP-007`, `VISUAL-COMP-008`, `VISUAL-COMP-009`, `VISUAL-COMP-010`.

```text
Create one 3200 × 1800 PNG product showcase board titled “Stockmok — Brand + Design System”. Compose only the exact approved source visuals VISUAL-BRAND-002 through VISUAL-BRAND-006 and VISUAL-COMP-001 through VISUAL-COMP-010; place them as immutable source-led crops, never redraw or reinterpret their UI, logo geometry, labels, values, or states. Use a controlled #F8FAFC canvas, a clear 12-column editorial grid, generous margins, and three labelled zones: Stockmok Identity, Frozen Foundations, and Operational Components. Give the selected Stackline S family the strongest hierarchy while retaining the refinement, wordmark, favicon, monogram, and complete-system evidence. Show all ten component boards at a size where button labels, field labels, table headers, status text, navigation labels, dialog copy, alerts, KPI values, chart labels, and state messages remain inspectable. Add only the exact source visual IDs and short zone headings outside the crops; invent no marketing claim.

This board represents a light-first operational SaaS system using #1D4ED8, restrained slate neutrals, one system sans-serif family, Lucide-style icons, a 4 px spacing base, visible two-layer focus, WCAG AA text/status pairs, tabular quantities and money, and 44 × 44 px minimum mobile targets. The design vocabulary is exactly five layouts and 25 primitives. Exactly three charts are permitted: stock-status donut, inventory-by-location bar, and purchase-order-status bar, each secondary to a text/table alternative. The Stackline S boards are approval references only; production logos remain DESIGN_AS_VECTOR.

Viewport and composition: output 16:9 at 3200 × 1800; preserve source aspect ratios, use no perspective distortion, and keep all source IDs readable. Role and route context: design-system/brand review, not an application route and not a role-specific screen. Fields, columns, actions, and statuses must be the exact ones already visible in the source boards; add none. Accessibility: maintain source contrast, never encode status by colour alone, do not crop focus rings, labels, table alternatives, or accessible state text. Responsive behavior: this is a desktop review board; show existing mobile component examples only where present in the source visuals and do not fabricate a breakpoint state. Exclude dark theme, gradients, glass, stock photography, decorative animation, global search, command palette, crowns, hotel imagery, copied marks, customer logos, testimonials, awards, pricing, uptime, AI, forecasting, marketplace, storefront, checkout, POS, and Release B-PLUS/C/D. Save exactly to visual-designs/generated/22_showcase-boards/VISUAL-BOARD-001_brand-design-system.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-BOARD-002 — Public + Auth

**Visual:** `VISUAL-BOARD-002`  
**Exact source visuals:** `VISUAL-SCREEN-001`, `VISUAL-SCREEN-002`, `VISUAL-SCREEN-003`, `VISUAL-SCREEN-004`, `VISUAL-SCREEN-005`, `VISUAL-SCREEN-006`, `VISUAL-SCREEN-007`, `VISUAL-SCREEN-041`, `VISUAL-STATE-001`, `VISUAL-STATE-009`.

```text
Create one 3200 × 1800 PNG product showcase board titled “Stockmok — Public + Auth”. Compose only the exact approved source visuals VISUAL-SCREEN-001, 002, 003, 004, 005, 006, 007, 041 and VISUAL-STATE-001, 009 as immutable source-led crops; do not redraw, relabel, merge, or invent UI. Use a #F8FAFC editorial canvas with a dominant Public Home panel, a coherent authentication journey, and a distinct invitation-state strip. Keep the following route captions exact: /, /signup, /login, /b/:handle, /invite/:token, /select-workspace, and /onboarding. Password Reset is a focused subordinate /login surface, not a new route.

Show public/auth content exactly as sourced: truthful Release A product introduction; Release B-Lite copy only where the enabled-state source already shows it; email and password fields; branded organization handle context; offered invitation role and expiry; workspace cards; onboarding business name, handle, currency, timezone, Network choice; and neutral password-reset response. Preserve exact actions such as Login, Create Workspace, Create account, Continue, Accept invitation, Open workspace, and Send reset instructions only where they appear in the sources. Show source statuses and errors without account enumeration: loading/resolving, ready, invalid credentials, authenticated non-member, requested-role mismatch, assigned-role offer, suspended membership, expired/revoked/reused invite, and email mismatch. Nimal’s requested Owner role is denied and assigned Inventory Manager is offered; expose no private organization data before authorization.

Viewport and composition: 16:9, 3200 × 1800, desktop review composition with source pages large enough for all field labels, messages, and CTAs to be read; never use perspective mockups. Shell: public header/auth frame only as present in each source; do not add the authenticated application sidebar. Roles: anyone/new user/returning user/invitee/active multi-organization user/new authenticated user exactly as each source requires. Sample data: Grand Ocean Hotel and @grand-ocean only where sourced; no alternative organization, person, price, or claim. Accessibility: preserve visible labels, neutral errors, focus indicators, 44 px mobile-ready targets, semantic headings, and safe focus order; do not crop validation. Responsive behavior: this board is desktop, with no newly invented mobile layout. Exclude Release B claims when its flag is off, Release B-PLUS/C/D, dark theme, gradients, glass, stock photography, customer proof, pricing, uptime, AI, forecasting, marketplace, global search, command palette, and any route or action not present in the exact sources. Save exactly to visual-designs/generated/22_showcase-boards/VISUAL-BOARD-002_public-auth.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-BOARD-003 — Dashboard + Inventory

**Visual:** `VISUAL-BOARD-003`  
**Exact source visuals:** `VISUAL-SCREEN-008`, `VISUAL-SCREEN-009`, `VISUAL-SCREEN-010`, `VISUAL-SCREEN-011`, `VISUAL-SCREEN-012`, `VISUAL-SCREEN-013`, `VISUAL-SCREEN-014`, `VISUAL-SCREEN-015`, `VISUAL-SCREEN-016`, `VISUAL-SCREEN-017`, `VISUAL-SCREEN-042`, `VISUAL-SCREEN-044`, `VISUAL-SCREEN-045`, `VISUAL-SCREEN-046`, `VISUAL-SCREEN-047`, `VISUAL-COMP-009`.

```text
Create one 3200 × 1800 PNG product showcase board titled “Stockmok — Dashboard + Inventory”. Compose only the exact approved source visuals VISUAL-SCREEN-008 through 017, VISUAL-SCREEN-042, VISUAL-SCREEN-044 through 047, and VISUAL-COMP-009 as immutable crops. Do not redraw or synthesize a new dashboard, table, modal, data point, or role variant. Arrange a dominant populated dashboard and Product Detail in the centre, with product list/create-edit, category, warehouse, movement-history, stock-adjustment, opening-balance, app-shell, empty-dashboard, and four role-dashboard variants around them. Label each crop only with its exact VISUAL-ID and exact existing screen title.

The authenticated shell must remain as sourced: Stockmok mark; Grand Ocean Hotel monogram and untruncated name; active role badge; notification bell; user menu; role-filtered sidebar; no Network item when disabled. Preserve routes APP/dashboard, APP/inventory/products, APP/inventory/products/new, APP/inventory/products/:productId, APP/inventory/categories, APP/inventory/warehouses, and APP/inventory/movements; stock adjustment and opening balance remain overlays with no routes. Preserve fields and columns already present in sources, including product name, SKU, category, base unit, minimum stock, reorder target, purchase cost, warehouse, quantity, movement type, reason, operation reference, dates, status, and role-permitted actions. Unauthorized mutations remain hidden.

Use only canonical source data: Grand Ocean Hotel; Meat; Chicken Breast; MEAT-001; KG; minimum 20 KG; reorder target 50 KG; purchase cost LKR 1,250.00; 18 KG opening balance in Cold Room; +2 KG Recount correction with operationId OP-A; 18 → 20 KG; idempotent replay returns stored success. Seed dashboard values are 12 active SKUs, 4 low stock, 1 out of stock, 0 open POs, 0 awaiting receipt, and LKR 564,200.00. KPI names are Inventory Value, Active SKUs, Low Stock, Open POs, and Awaiting Receipt. Only stock-status donut and inventory-by-location bar may appear here, each with its sourced table/text alternative; no other chart.

Viewport and composition: 16:9, 3200 × 1800, flat orthographic board, legible text and table headers, no perspective. Roles represented only by their exact sources: Owner/Admin, Inventory Manager, Procurement Manager, Storekeeper, plus read-only Analyst/Viewer contexts already present. Storekeeper must not gain Adjust Stock. Accessibility: preserve semantic status icon + text, visible focus, complete field labels, inline errors, tabular numerals, and readable alternatives for charts. Responsive behavior: desktop board only; do not invent mobile adaptations. Exclude private-versus-Connected confusion, Network UI on disabled sources, sales, revenue, forecasting, AI, Release B-PLUS/C/D, invented trends, dark theme, gradients, glass, photography, global search, and command palette. Save exactly to visual-designs/generated/22_showcase-boards/VISUAL-BOARD-003_dashboard-inventory.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-BOARD-004 — Procurement + Receiving

**Visual:** `VISUAL-BOARD-004`  
**Exact source visuals:** `VISUAL-SCREEN-018`, `VISUAL-SCREEN-019`, `VISUAL-SCREEN-020`, `VISUAL-SCREEN-021`, `VISUAL-SCREEN-022`, `VISUAL-SCREEN-023`, `VISUAL-SCREEN-024`, `VISUAL-STATE-004`, `VISUAL-STATE-005`.

```text
Create one 3200 × 1800 PNG product showcase board titled “Stockmok — Procurement + Receiving”. Compose only the exact approved source visuals VISUAL-SCREEN-018 through 024 and VISUAL-STATE-004, 005 as immutable source-led crops; do not redraw, combine, or invent screens. Give Purchase Order Detail and Receiving the largest panels; support them with private Suppliers, private Buyers, Partner Detail, PO List, PO Builder, and exact purchase-order/receiving state evidence. Private partners must remain a complete neutral directory workflow, not a degraded Connected experience, and Buyers must have no sales CTA.

Preserve only the sourced application shell and these route families: APP/procurement/suppliers, APP/procurement/suppliers/:partnerId, APP/procurement/buyers, APP/procurement/buyers/:partnerId, APP/procurement/purchase-orders, APP/procurement/purchase-orders/new, APP/procurement/purchase-orders/:poId, APP/procurement/receiving, and APP/procurement/receiving/:poId. Preserve sourced fields, table columns, filters, and actions including partner identity/contact, PO number, supplier, kind Private/Connected, status, line item, ordered quantity, unit price, line total, currency, expected date, received quantity, receive-now quantity, outstanding quantity, notes, Create purchase order, Save draft, Place order, Cancel order, Receive goods, Receive selected items, and legal state transitions. Do not expose any action to a role that lacks it; Viewer is denied PO routes and Analyst cannot receive.

Use only canonical private-PO data visible in the sources: Green Farm; Chicken Breast; 50 KG at LKR 1,200.00 per KG; receive 40 KG then 10 KG. Preserve exact Draft, Ordered, Partially Received, Received, Cancelled and applicable error/confirmation states from the source visuals. Over-receipt is blocked inline, finalized/ordered immutability remains clear, and an identical operationId replay returns the stored receipt reference without duplicate stock movement.

Viewport and composition: 16:9, 3200 × 1800, flat editorial grid with readable fields, quantities, money, state labels, and timeline/table rows. Roles: Owner, Admin, Procurement Manager full where sourced; Inventory Manager and Storekeeper receiving access exactly as sourced; read-only/denied roles unchanged. Accessibility: preserve full labels, tabular numerals, explicit KG and LKR, icon-plus-text statuses, visible focus, inline error association, confirmation focus safety, and unchanged table/card semantics. Responsive behavior: desktop showcase only; do not fabricate a mobile screen. Exclude sales/orders-to-customers, storefront, checkout, POS, spend/trend charts, Network actions in private partner surfaces, dark theme, gradients, glass, photography, AI, forecasting, marketplace, Release B-PLUS/C/D, invented data, and invented routes. Save exactly to visual-designs/generated/22_showcase-boards/VISUAL-BOARD-004_procurement-receiving.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-BOARD-005 — Connected + Mapping

**Visual:** `VISUAL-BOARD-005`  
**Exact source visuals:** `VISUAL-SCREEN-031`, `VISUAL-SCREEN-032`, `VISUAL-SCREEN-033`, `VISUAL-SCREEN-034`, `VISUAL-SCREEN-035`, `VISUAL-SCREEN-036`, `VISUAL-SCREEN-037`, `VISUAL-SCREEN-038`, `VISUAL-SCREEN-039`, `VISUAL-SCREEN-040`, `VISUAL-SCREEN-051`, `VISUAL-STATE-006`, `VISUAL-STATE-007`, `VISUAL-STATE-008`.

```text
Create one 3200 × 1800 PNG product showcase board titled “Stockmok — Connected + Mapping”. Compose only the exact approved source visuals VISUAL-SCREEN-031 through 040, VISUAL-SCREEN-051, and VISUAL-STATE-006 through 008 as immutable source-led crops; do not redraw their UI, invent a route, or merge buyer and supplier projections. Use a clear left-to-right operational story: exact-handle discovery and connection, supplier publish, buyer catalog browse, verified mapping, Connected PO buyer projection, Connected PO supplier projection, and Connected receiving. Keep discovery and publish as panels/dialogs with no invented route; Connected PO screens reuse the procurement PO route.

Preserve exact route captions APP/network/connections, APP/network/connections/:connectionId, APP/network/partner-catalog, APP/network/partner-catalog/:supplierOrgId, APP/network/mappings, APP/network/mappings/new, APP/procurement/purchase-orders/:poId, and APP/procurement/receiving/:poId. The shell shows NETWORK only for Network-enabled eligible roles. Owner/Admin have full relevant access; Procurement Manager has the exact LIMITED/FULL access visible in sources; Inventory Manager, Storekeeper, Analyst, and Viewer must not gain Network navigation. When Network is disabled, routes/nav are absent and direct authenticated access is 404, not Permission Denied.

Use only canonical source data: buyer Grand Ocean Hotel @grand-ocean; supplier Fresh Foods @freshfoods; Fresh Chicken Breast 5 KG Pack; partner SKU CKN-B5; order unit PACK; pack description 5 KG; local Chicken Breast MEAT-001 in KG; mapping 1 PACK = 5 KG; worked preview 10 PACK = 50 KG; Connected PO 10 PACK / 50 KG; supplier stock 200 → 190 PACK on ship; buyer stays 70 KG until receipt. Preserve source fields/columns/actions/statuses: exact handle, request/accept/reject/disable connection, publish/unpublish, catalog item, local/partner product, conversion factor/equation, create/disable mapping, submit/accept/reject/ship PO, receive, Private/Connected badge, and organization-attributed Timeline. Never expose private product cost or other private fields across tenants.

Viewport and composition: 16:9, 3200 × 1800, flat narrative grid; make conversion equation, units, status pills, organization identities, and PO quantities legible. Show exact source states including discovery not found/already connected/pending/self blocked, no active connection, missing/unpublished SKU, semantic mismatch, invalid factor, stale connection, duplicate VERIFIED mapping, illegal PO transition, and idempotent outcomes only where present in the source boards. Accessibility: preserve visible labels, text-plus-icon status, keyboard focus, unit text, error association, and explicit buyer/supplier attribution. Responsive behavior: desktop board only. Exclude marketplace browsing, fuzzy discovery, sales, storefront, checkout, POS, pricing claims, cross-tenant private reads, Analyst Network access, Release B-PLUS/C/D, AI, forecasting, dark theme, gradients, glass, photography, global search, command palette, and invented data. Save exactly to visual-designs/generated/22_showcase-boards/VISUAL-BOARD-005_connected-mapping.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-BOARD-006 — Reports + Team + Settings

**Visual:** `VISUAL-BOARD-006`  
**Exact source visuals:** `VISUAL-SCREEN-025`, `VISUAL-SCREEN-026`, `VISUAL-SCREEN-027`, `VISUAL-SCREEN-028`, `VISUAL-SCREEN-029`, `VISUAL-SCREEN-030`, `VISUAL-SCREEN-048`, `VISUAL-SCREEN-049`, `VISUAL-SCREEN-050`, `VISUAL-SCREEN-052`, `VISUAL-STATE-009`, `VISUAL-STATE-010`.

```text
Create one 3200 × 1800 PNG product showcase board titled “Stockmok — Reports + Team + Settings”. Compose only the exact approved source visuals VISUAL-SCREEN-025 through 030, VISUAL-SCREEN-048 through 050, VISUAL-SCREEN-052, VISUAL-STATE-009, and VISUAL-STATE-010 as immutable source-led crops. Do not redraw, invent, or consolidate distinct permission and route states. Give the two report tabs and Team the strongest hierarchy; include Notifications, Settings, invitation-link modal, notification menu, Permission Denied, and 404 as inspectable supporting panels.

Preserve the exact routes APP/reports?tab=stock-on-hand, APP/reports?tab=purchase-orders, APP/notifications, APP/team, and APP/settings. Invitation Link and Notification Menu remain overlay surfaces with no routes. Stock-on-Hand report is allowed for all seven roles with exact sourced filters, columns, table alternative, and authorized CSV. Purchase-Order report is allowed only for Owner, Admin, Inventory Manager, Procurement Manager, and Analyst; Storekeeper and Viewer see an inline permission state and no forbidden query or export. The PO-status bar is the only chart on Reports and remains secondary to the authoritative table. Preserve sourced report columns including product/SKU, warehouse, quantity, unit, status/value as specified for Stock on Hand and PO number, Counterparty, Private/Connected, Status, Total, Created, Expected for Purchase Orders.

Preserve exact Team/Settings content and actions already visible in sources: member identity, role, status, invitation state, Invite user, Change role, Suspend member, Remove member, Revoke invitation, one-time invitation link with Copy invitation link and irreversible-close warning, organization profile/defaults, and Release A/B feature controls only. Canonical Owner protections remain intact; Admin is LIMITED. Notifications are user-scoped; exact mutations are Mark as read, Mark as unread and Mark all as read, and inaccessible references are not links. Permission Denied names the required capability/current role without running protected queries. A Network-disabled direct path shows authenticated 404 and does not imply the feature exists.

Viewport and composition: 16:9, 3200 × 1800, flat review grid, legible tabs, columns, filters, permission messages, role badges, and invitation warning. Shell/roles must match each exact source. Sample values may only be those already in the source visuals, including explicit LKR and Private/Connected labels; invent no people, team members, report totals, or events. Accessibility: preserve tab semantics, focus, icon-plus-text status, column headers, keyboard actions, visible labels, confirmation focus, and table/text alternative. Responsive behavior: desktop showcase only. Exclude forbidden report tabs/actions, raw secrets after modal close, Release B-PLUS/C/D settings, sales/revenue/forecast charts, invented audit claims, dark theme, gradients, glass, photography, AI, global search, and command palette. Save exactly to visual-designs/generated/22_showcase-boards/VISUAL-BOARD-006_reports-team-settings.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-BOARD-007 — Mobile

**Visual:** `VISUAL-BOARD-007`  
**Exact source visuals:** `VISUAL-MOBILE-001`, `VISUAL-MOBILE-002`, `VISUAL-MOBILE-003`, `VISUAL-MOBILE-004`, `VISUAL-MOBILE-005`, `VISUAL-MOBILE-006`, `VISUAL-MOBILE-007`, `VISUAL-MOBILE-008`, `VISUAL-MOBILE-009`, `VISUAL-MOBILE-010`, `VISUAL-MOBILE-011`.

```text
Create one 3200 × 1800 PNG product showcase board titled “Stockmok — Mobile at 390 px”. Compose only the exact approved source visuals VISUAL-MOBILE-001 through VISUAL-MOBILE-011 as immutable 390 px mobile captures. Their exact screen mapping is: 001 Global Login /login; 002 Branded Login /b/:handle; 003 Workspace Selector /select-workspace; 004 Populated Dashboard APP/dashboard; 005 Product List APP/inventory/products; 006 Product Detail APP/inventory/products/:productId; 007 Stock Adjustment sheet with no route; 008 PO Detail APP/procurement/purchase-orders/:poId; 009 Receiving APP/procurement/receiving/:poId; 010 Notifications APP/notifications; 011 Mobile Application Navigation drawer with no route. Do not redraw, relabel, or invent any mobile screen.

Lay the eleven source captures in a precise device-free grid—no phone frames, hands, perspective, or decorative environment. Use a #F8FAFC canvas and label each column with its exact VISUAL-ID and screen name. Keep every capture large enough that h1s, field labels, KPI labels/values, card labels, quantities, currency, status pills, action labels, form errors, and navigation text remain readable. Preserve exact routes, role-filtered shell, fields, columns/card conversions, actions, statuses, and canonical data already rendered in each source. Unauthorized actions remain hidden; Storekeeper never gains Adjust Stock; Network navigation remains flag/role filtered.

All captures must demonstrate the frozen mobile rules already present in the source: 390 px viewport, 16 px page gutters, 64 px app header, single-column core flow, no horizontal core-flow scroll, tables converted to labelled cards where required, compact but text-labelled Stepper where present, full-height sheet for Stock Adjustment, focus-trapped navigation drawer, at least 44 × 44 px interactive targets with safe separation, visible two-layer focus, labels never replaced by placeholders, icon-plus-text status, tabular numbers, and retained table/text chart alternatives. No crop may hide the primary action or validation/error message.

Roles and sample data must remain exactly those in each source; invent no alternate organization, person, SKU, quantity, price, notification, or report result. Exclude desktop sidebar pasted into mobile, page-number pagination, infinite scroll, truncated organization identity, hidden labels, colour-only status, hover-only controls, dark theme, gradients, glass, photography, device chrome, AI, forecasting, marketplace, storefront, checkout, POS, Release B-PLUS/C/D, global search, and command palette. Save exactly to visual-designs/generated/22_showcase-boards/VISUAL-BOARD-007_mobile.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-BOARD-008 — Complete Showcase

**Visual:** `VISUAL-BOARD-008`  
**Exact source visuals:** `VISUAL-BRAND-006`, `VISUAL-SCREEN-001`, `VISUAL-SCREEN-004`, `VISUAL-SCREEN-010`, `VISUAL-SCREEN-011`, `VISUAL-SCREEN-013`, `VISUAL-SCREEN-016`, `VISUAL-SCREEN-023`, `VISUAL-SCREEN-024`, `VISUAL-SCREEN-027`, `VISUAL-SCREEN-028`, `VISUAL-SCREEN-036`, `VISUAL-SCREEN-038`, `VISUAL-SCREEN-039`, `VISUAL-SCREEN-040`, `VISUAL-SCREEN-048`, `VISUAL-SCREEN-049`, `VISUAL-MOBILE-004`, `VISUAL-MOBILE-007`, `VISUAL-COMP-009`.

```text
Create one 3200 × 1800 PNG hero contact board titled “Stockmok — Complete Release A + B-Lite UI Showcase”. Compose only the exact approved source visuals VISUAL-BRAND-006; VISUAL-SCREEN-001, 004, 010, 011, 013, 016, 023, 024, 027, 028, 036, 038, 039, 040, 048, 049; VISUAL-MOBILE-004, 007; and VISUAL-COMP-009. Treat every source as immutable: do not redraw UI, change copy, fabricate data, create new routes, or promote a board crop as a substitute for its individual image.

Build one flat, polished, legible editorial composition on #F8FAFC. Use the complete brand-system source as a compact identity anchor; make Dashboard, Product Detail, PO Detail, Mapping Wizard, Connected buyer/supplier PO, and Connected Receiving primary; use Public Home, Branded Login, Product List, Stock Adjustment, Receiving, Team, Settings, both report tabs, mobile Dashboard/sheet, and the chart/component board as supporting evidence. Preserve the visual distinction between public, authenticated private, and Connected contexts. Use exact VISUAL-ID captions, small route captions, and neutral section headings only—no marketing claims, device frames, or invented metrics.

The board must retain source truth: Grand Ocean Hotel @grand-ocean; Fresh Foods @freshfoods; Chicken Breast MEAT-001 in KG; CKN-B5 in PACK; 1 PACK = 5 KG; 10 PACK = 50 KG; supplier 200 → 190 PACK at ship; buyer remains 70 KG until receipt; full buyer chain 18 → 20 → 60 → 70 → 70 → 110 → 120 KG; final inventory value LKR 691,700.00. Never use the superseded 18 → 58 → 68 KG sequence. Only the three frozen charts may appear—stock-status donut, inventory-by-location bar, PO-status bar—and each keeps its visible table/text alternative. Report permissions, Network feature flag, seven-role visibility, legal state transitions, and Private/Connected projection boundaries remain exactly as shown in sources.

Viewport and composition: 16:9, 3200 × 1800, source crops at native proportions, no perspective, and sufficient size for key headings, fields, columns, actions, statuses, units, money, and equations to be inspected. Accessibility: preserve visible labels, focus, semantic status icon + text, 44 px mobile targets, tabular numerals, chart alternatives, and legible error/permission copy. Responsive behavior: show only the two exact mobile sources; fabricate no other breakpoint. Exclude invented clients, testimonials, awards, pricing, uptime, analytics claims, sales, revenue, storefront, checkout, POS, AI, forecasting, marketplace, Release B-PLUS/C/D, dark theme, gradients, glass, photography, global search, command palette, and copied showcase imagery. Save exactly to visual-designs/generated/22_showcase-boards/VISUAL-BOARD-008_complete-showcase.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

## 3. Review and contact-sheet prompts

### PROMPT-REVIEW-001 — All Public + Auth

**Visual:** `VISUAL-REVIEW-001`  
**Exact source visuals:** `VISUAL-SCREEN-001`, `VISUAL-SCREEN-002`, `VISUAL-SCREEN-003`, `VISUAL-SCREEN-004`, `VISUAL-SCREEN-005`, `VISUAL-SCREEN-006`, `VISUAL-SCREEN-007`, `VISUAL-SCREEN-041`, `VISUAL-MOBILE-001`, `VISUAL-MOBILE-002`, `VISUAL-MOBILE-003`, `VISUAL-STATE-001`, `VISUAL-STATE-009`.

```text
Create one 3840 × 2160 PNG contact sheet titled “Stockmok — All Public + Auth”. Place exactly these immutable approved sources once each: VISUAL-SCREEN-001 Public Home, 002 Sign Up, 003 Global Login, 004 Branded Login, 005 Invitation Accept, 006 Workspace Selector, 007 Business Onboarding, 041 Password Reset; VISUAL-MOBILE-001 Global Login, 002 Branded Login, 003 Workspace Selector; VISUAL-STATE-001 Login states; VISUAL-STATE-009 Invitation states. Do not redraw, omit, duplicate, merge, relabel, or substitute any source. Use external exact VISUAL-ID, screen/state name, role, route or “no new route”, and desktop/390 px caption.

Preserve exact public/auth routes /, /signup, /login, /b/:handle, /invite/:token, /select-workspace, /onboarding. Password Reset is a focused subordinate /login surface, not an invented route. Preserve sourced fields and actions: email, password, optional role context, organization identity, invitation role/expiry, workspace selection, business name, handle, currency, timezone, Network choice, Login, Create account, Create Workspace, Open workspace, Accept invitation, and Send reset instructions only where present. Preserve loading/resolving, ready, neutral authentication failure, non-member, role mismatch, assigned-role offer, suspended membership, expired/revoked/reused invite, email mismatch, validation, submitting, and safe recovery states. Nimal’s requested Owner role remains denied and assigned Inventory Manager is offered; no private tenant data renders before authorization.

Viewport/composition: 16:9 at 3840 × 2160 on #F8FAFC, flat grid, no perspective/device frames, source pages large enough for labels/messages/CTAs to be inspected. Shell is only the exact public/auth frame in each source; never add the application sidebar. Sample identity is Grand Ocean Hotel @grand-ocean only where sourced; invent no organization, person, price, proof, field, column, action, state, or route. Accessibility: retain visible labels, neutral errors, focus, semantic headings, safe dialog focus, 44 px mobile targets, and complete validation copy. Responsive behavior: only the three exact 390 px sources represent mobile. Exclude Release B copy when disabled, B-PLUS/C/D, account enumeration, dark theme, gradients, glass, photography, customer proof, pricing, uptime, AI, forecasting, marketplace, storefront, checkout, POS, global search, and command palette. Save exactly to visual-designs/review-boards/VISUAL-REVIEW-001_all-public-auth.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-REVIEW-002 — All Dashboard + Inventory

**Visual:** `VISUAL-REVIEW-002`  
**Exact source visuals:** `VISUAL-SCREEN-008`, `VISUAL-SCREEN-009`, `VISUAL-SCREEN-010`, `VISUAL-SCREEN-011`, `VISUAL-SCREEN-012`, `VISUAL-SCREEN-013`, `VISUAL-SCREEN-014`, `VISUAL-SCREEN-015`, `VISUAL-SCREEN-016`, `VISUAL-SCREEN-017`, `VISUAL-SCREEN-042`, `VISUAL-SCREEN-044`, `VISUAL-SCREEN-045`, `VISUAL-SCREEN-046`, `VISUAL-SCREEN-047`, `VISUAL-MOBILE-004`, `VISUAL-MOBILE-005`, `VISUAL-MOBILE-006`, `VISUAL-MOBILE-007`, `VISUAL-STATE-002`, `VISUAL-STATE-003`, `VISUAL-COMP-009`.

```text
Create one 3840 × 2160 PNG contact sheet titled “Stockmok — All Dashboard + Inventory”. Place exactly the immutable approved sources VISUAL-SCREEN-008 through 017, VISUAL-SCREEN-042, VISUAL-SCREEN-044 through 047, VISUAL-MOBILE-004 through 007, VISUAL-STATE-002, VISUAL-STATE-003, and VISUAL-COMP-009 once each. Do not redraw, omit, duplicate, merge, or substitute. Group as shell/dashboard, product master data, stock operations, role variants, 390 px adaptations, list/adjustment states, and approved chart evidence. Each tile gets its exact VISUAL-ID, screen/board name, role, route/no-route, and viewport outside the crop.

Preserve APP/dashboard; APP/inventory/products; product new/detail/edit; categories; warehouses; movements. Stock Adjustment and Opening Balance remain overlays with no routes. Preserve the sourced shell and role visibility: Owner/Admin, Inventory Manager, Procurement Manager, Storekeeper, Analyst, Viewer; unauthorized mutations hidden; Storekeeper never gets Adjust Stock. Preserve exact fields/columns/actions/statuses for products, SKU, category, base unit, thresholds, purchase cost, warehouse, quantity, reason, movement type/reference/date, local filters/sort/cursor pagination, create/edit/archive/restore, opening balance, preview, confirm, and idempotent success.

Use only canonical source data: Chicken Breast, MEAT-001, Meat, KG, minimum 20 KG, reorder target 50 KG, cost LKR 1,250.00, 18 KG opening balance in Cold Room, +2 KG Recount correction with OP-A, 18 → 20 KG. Seed dashboard: 12 active SKUs, 4 low stock, 1 out of stock, 0 open POs, 0 awaiting receipt, LKR 564,200.00. Only stock-status donut and inventory-by-location bar appear here, with visible table/text alternatives; no extra chart. Viewport/composition: 16:9 at 3840 × 2160, flat legible grid on #F8FAFC. Accessibility: preserve labels, focus, icon-plus-text statuses, field errors, explicit units/currency, tabular numerals, table/card semantics, and 44 px mobile targets. Responsive behavior: only exact VISUAL-MOBILE-004..007 show 390 px behavior. Exclude invented UI/data/routes/trends, Network when disabled, sales, revenue, forecasting, AI, B-PLUS/C/D, dark theme, gradients, glass, photography, global search, and command palette. Save exactly to visual-designs/review-boards/VISUAL-REVIEW-002_all-dashboard-inventory.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-REVIEW-003 — All Procurement

**Visual:** `VISUAL-REVIEW-003`  
**Exact source visuals:** `VISUAL-SCREEN-018`, `VISUAL-SCREEN-019`, `VISUAL-SCREEN-020`, `VISUAL-SCREEN-021`, `VISUAL-SCREEN-022`, `VISUAL-SCREEN-023`, `VISUAL-SCREEN-024`, `VISUAL-MOBILE-008`, `VISUAL-MOBILE-009`, `VISUAL-STATE-004`, `VISUAL-STATE-005`.

```text
Create one 3840 × 2160 PNG contact sheet titled “Stockmok — All Procurement”. Place exactly VISUAL-SCREEN-018 Private Suppliers, 019 Private Buyers, 020 Partner Detail, 021 PO List, 022 PO Builder, 023 PO Detail, 024 Receiving; VISUAL-MOBILE-008 PO Detail, 009 Receiving; VISUAL-STATE-004 Purchase Order and 005 Receiving once each as immutable approved sources. Do not redraw, omit, duplicate, merge, or invent sources. Organize into private partner management, PO lifecycle, receiving, 390 px evidence, and workflow-state evidence. Label every tile externally with exact VISUAL-ID, title, role, route/no-route, and viewport.

Preserve exact procurement routes and sourced shell. Private suppliers/buyers remain complete neutral records; Buyers have no sales CTA. Preserve sourced fields, filters, columns, and actions: partner identity/contact, PO number, supplier, Private/Connected kind, status, product, ordered/received/outstanding/receive-now quantity, unit, unit price, total, currency, expected date, notes, Create purchase order, Save draft, Place order, Cancel order, Receive goods, Receive selected items, and legal transitions. Owner/Admin/Procurement Manager retain exact write access; Inventory Manager/Storekeeper receive only as authorized; Analyst is read-only where allowed and cannot receive; Viewer remains denied.

Use only canonical private-PO values: Green Farm, Chicken Breast, 50 KG at LKR 1,200.00/KG, receive 40 then 10. Preserve Draft, Ordered, Partially Received, Received, Cancelled, immutable-after-order/final, over-receipt inline block, confirmation, loading/error, and identical operationId stored-success behavior only where shown. Viewport/composition: 16:9 at 3840 × 2160 on #F8FAFC, flat grid with legible form labels, table columns, quantities, money, status, and timeline rows. Accessibility: retain full labels, focus, icon-plus-text status, explicit KG/LKR, tabular numbers, associated errors, confirmation safety, and 44 px mobile targets. Responsive behavior: only exact mobile sources 008/009. Exclude Network workflows, sales, storefront, checkout, POS, spend/trend charts, invented data/routes/actions, AI, forecasting, marketplace, B-PLUS/C/D, dark theme, gradients, glass, photography, global search, and command palette. Save exactly to visual-designs/review-boards/VISUAL-REVIEW-003_all-procurement.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-REVIEW-004 — All Network

**Visual:** `VISUAL-REVIEW-004`  
**Exact source visuals:** `VISUAL-SCREEN-031`, `VISUAL-SCREEN-032`, `VISUAL-SCREEN-033`, `VISUAL-SCREEN-034`, `VISUAL-SCREEN-035`, `VISUAL-SCREEN-036`, `VISUAL-SCREEN-037`, `VISUAL-SCREEN-038`, `VISUAL-SCREEN-039`, `VISUAL-SCREEN-040`, `VISUAL-SCREEN-051`, `VISUAL-STATE-006`, `VISUAL-STATE-007`, `VISUAL-STATE-008`.

```text
Create one 3840 × 2160 PNG contact sheet titled “Stockmok — All Network”. Place exactly immutable approved sources VISUAL-SCREEN-031 through 040, VISUAL-SCREEN-051, and VISUAL-STATE-006 through 008 once each. Do not redraw, omit, duplicate, merge buyer/supplier projections, or invent UI. Group the contact sheet left to right: connections/discovery, supplier publish/catalog, buyer browse, mapping wizard/list, Connected PO buyer, Connected PO supplier, Connected receiving, then exact connection/mapping/Connected-PO state boards. Label each tile with exact VISUAL-ID, title, eligible role, route/no-route, and desktop viewport.

Preserve exact Network routes; Discovery and Product Publish remain panel/dialog surfaces with no route; Connected PO/receiving reuse procurement routes. NETWORK appears only when the flag and role allow it. Owner/Admin preserve exact access; Procurement Manager remains LIMITED/FULL as sourced; Inventory Manager, Storekeeper, Analyst, Viewer gain no Network navigation. Network disabled means hidden routes/nav and authenticated 404 on direct access. Preserve exact fields/columns/actions/statuses for handle discovery, request/accept/reject/disable, publish/unpublish, catalog identity, local/partner product, conversion equation/factor, verified/disabled mapping, submit/accept/reject/ship/receive, Private/Connected badge, and dual-organization Timeline.

Use only canonical data: Grand Ocean Hotel @grand-ocean buyer; Fresh Foods @freshfoods supplier; Fresh Chicken Breast 5 KG Pack; CKN-B5; PACK; local Chicken Breast MEAT-001 KG; 1 PACK = 5 KG; 10 PACK = 50 KG; Connected PO 10 PACK / 50 KG; supplier 200 → 190 PACK on ship; buyer stays 70 KG until receipt. Preserve exact discovery, connection, mapping, legal-transition, idempotency, and private-projection guards. Viewport/composition: 16:9 at 3840 × 2160 on #F8FAFC, flat narrative grid, legible handles/units/equations/statuses/actions. Accessibility: preserve labels, focus, icon-plus-text status, explicit actor organizations, errors, and keyboard actions. Responsive behavior: desktop review only; invent no mobile Network view. Exclude fuzzy discovery, marketplace browsing, cross-tenant private reads, Analyst Network access, sales, storefront, checkout, POS, invented routes/data, AI, forecasting, B-PLUS/C/D, dark theme, gradients, glass, photography, global search, and command palette. Save exactly to visual-designs/review-boards/VISUAL-REVIEW-004_all-network.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-REVIEW-005 — All Admin

**Visual:** `VISUAL-REVIEW-005`  
**Exact source visuals:** `VISUAL-SCREEN-025`, `VISUAL-SCREEN-026`, `VISUAL-SCREEN-027`, `VISUAL-SCREEN-028`, `VISUAL-SCREEN-029`, `VISUAL-SCREEN-030`, `VISUAL-SCREEN-048`, `VISUAL-SCREEN-049`, `VISUAL-SCREEN-050`, `VISUAL-SCREEN-052`, `VISUAL-STATE-009`, `VISUAL-STATE-010`.

```text
Create one 3840 × 2160 PNG contact sheet titled “Stockmok — All Admin”. Place exactly VISUAL-SCREEN-025 Reports shell, 026 Notifications, 027 Team, 028 Settings, 029 Permission Denied, 030 404, 048 Stock-on-Hand Report, 049 Purchase-Order Report, 050 Invitation Link modal, 052 Notification Menu, plus VISUAL-STATE-009 Invitation and VISUAL-STATE-010 Permission once each as immutable approved sources. Do not redraw, omit, duplicate, consolidate permission states, or invent controls. Group as reports, notifications, people/invitations, organization settings, and guard/recovery. Label exact VISUAL-ID, title, role, route/no-route, and viewport outside every crop.

Preserve APP/reports with distinct stock-on-hand and purchase-orders tabs, APP/notifications, APP/team, APP/settings; Invitation Link and Notification Menu have no routes. Preserve exact tab/action permission: Stock on Hand for all seven roles with authorized CSV; Purchase Orders only Owner, Admin, Inventory Manager, Procurement Manager, Analyst; Storekeeper/Viewer forbidden query/export never executes. The PO-status bar is the only report chart and remains secondary to its table/text alternative. Preserve sourced columns, filters, actions, member identity/role/status, Invite user, Change role, Suspend member, Remove member, Revoke invitation, one-time Copy invitation link warning, profile/defaults, A/B feature settings, notification Mark as read, Mark as unread and Mark all as read, and permission-safe links. Canonical Owner is protected; Admin is LIMITED where specified.

Use only sample data already in immutable sources; invent no team member, report result, event, organization, setting, or claim. Permission Denied names capability/current role without protected query. Disabled Network direct access is authenticated 404, not role denial. Viewport/composition: 16:9 at 3840 × 2160 on #F8FAFC, flat grid, legible tabs, table columns, filters, role/status badges, warning, errors, and actions. Accessibility: retain semantic tabs/tables, visible focus, icon-plus-text status, accessible menu/dialog behavior, confirmation safety, and chart alternative. Responsive behavior: desktop admin review only. Exclude forbidden report data/actions, raw invite after close, Release B-PLUS/C/D settings, sales/revenue/forecast charts, invented audit claims, AI, dark theme, gradients, glass, photography, global search, and command palette. Save exactly to visual-designs/review-boards/VISUAL-REVIEW-005_all-admin.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-REVIEW-006 — All Mobile

**Visual:** `VISUAL-REVIEW-006`  
**Exact source visuals:** `VISUAL-MOBILE-001`, `VISUAL-MOBILE-002`, `VISUAL-MOBILE-003`, `VISUAL-MOBILE-004`, `VISUAL-MOBILE-005`, `VISUAL-MOBILE-006`, `VISUAL-MOBILE-007`, `VISUAL-MOBILE-008`, `VISUAL-MOBILE-009`, `VISUAL-MOBILE-010`, `VISUAL-MOBILE-011`.

```text
Create one 3840 × 2160 PNG contact sheet titled “Stockmok — All Mobile”. Place exactly VISUAL-MOBILE-001 through VISUAL-MOBILE-011 once each as immutable 390 px approved sources, in this exact mapping order: Global Login, Branded Login, Workspace Selector, Dashboard, Product List, Product Detail, Stock Adjustment sheet, PO Detail, Receiving, Notifications, Mobile Application Navigation. Do not omit, duplicate, redraw, relabel, or invent a mobile screen. Add exact VISUAL-ID, screen name, route/no-route, role, and “390 px” outside each capture; footer states 11 required, 11 represented, 0 missing, 0 duplicate.

Preserve only what sources show: public/auth or role-filtered app shell; exact fields, labelled-card columns, actions, statuses, errors, and canonical data. The mobile system uses 16 px gutters, 64 px header, one-column core flow, no horizontal core-flow scroll, table-to-labelled-card conversion where required, a full-height Stock Adjustment sheet, focus-trapped navigation drawer, reachable primary actions, and at least 44 × 44 px targets. The shell retains Stockmok, organization monogram/full name, role badge, bell, and role/flag-filtered menu. Storekeeper never gains Adjust Stock; Analyst never gains Network navigation.

Viewport/composition: output 16:9 at 3840 × 2160, device-free flat grid on #F8FAFC; no phone frames, hands, OS chrome, perspective, or decorative scene. Captures must remain large enough to inspect h1, labels, KPI values, card labels, quantities/currency, status, actions, validation, and navigation. Use magnified insets only from identical source pixels. Accessibility: do not crop focus rings, labels, errors, target boundaries, close controls, status text, or safe action separation; preserve chart/table alternative ordering. Exclude desktop sidebar in mobile, horizontal core overflow, hover-only actions, colour-only meaning, page-number pagination, invented data/UI/routes, AI, forecasting, marketplace, B-PLUS/C/D, dark theme, gradients, glass, photography, global search, and command palette. Save exactly to visual-designs/review-boards/VISUAL-REVIEW-006_all-mobile.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-REVIEW-007 — All States

**Visual:** `VISUAL-REVIEW-007`  
**Exact source visuals:** `VISUAL-STATE-001`, `VISUAL-STATE-002`, `VISUAL-STATE-003`, `VISUAL-STATE-004`, `VISUAL-STATE-005`, `VISUAL-STATE-006`, `VISUAL-STATE-007`, `VISUAL-STATE-008`, `VISUAL-STATE-009`, `VISUAL-STATE-010`, `VISUAL-STATE-011`.

```text
Create one 3840 × 2160 PNG contact sheet titled “Stockmok — All States”. Place exactly eleven immutable approved state boards once each: VISUAL-STATE-001 Login, 002 Product List, 003 Stock Adjustment, 004 Purchase Order, 005 Receiving, 006 Connection, 007 Mapping, 008 Connected PO, 009 Invitation, 010 Permission, 011 Loading/Empty/Error. Do not redraw, omit, duplicate, change messages, create a twelfth state-board category, or use a state to invent a route. Add exact VISUAL-ID and category externally and retain enough source size to inspect labels, messages, disabled/submitting actions, object references, role text, units, and status.

Collectively preserve universal Loading, Empty, Error, Success, Validation error, Permission denied, Submitting, Confirmation and all sourced workflow-specific states. Login is neutral/non-enumerating. Product List retains filter/query and role action rules. Stock/receive preserve operationId and idempotent stored success plus quantity/over-receipt guards. PO states preserve legal transitions and immutability. Discovery remains exact-handle only. Mapping includes inactive connection, missing/unpublished SKU, semantic decline, invalid factor, stale connection, duplicate VERIFIED mapping. Connected PO keeps buyer/supplier projections separate. Invitation covers invalid/expired/revoked/reused token, email mismatch, and one-time link. Network-disabled authenticated 404 remains distinct from role denial.

Viewport/composition: 16:9 at 3840 × 2160 on #F8FAFC, flat grid, no perspective/device frames/decorative illustration. Roles, routes, shells, fields, columns, actions, statuses, responsive examples, and sample data are exactly inside immutable sources; add none. Accessibility: retain readable state copy, visible focus, field-associated errors, first-invalid-field focus, geometry-matched skeletons, safe destructive-confirm focus, retained input, status icon + text, and accessible Retry. Responsive behavior: only mobile examples already present in sources. Exclude raw codes, account enumeration, erased valid input, duplicate operations, invented recovery, AI, forecasting, marketplace, B-PLUS/C/D, dark theme, gradients, glass, photography, global search, and command palette. Save exactly to visual-designs/review-boards/VISUAL-REVIEW-007_all-states.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

### PROMPT-REVIEW-008 — Complete Product Overview

**Visual:** `VISUAL-REVIEW-008`  
**Exact source visuals:** `VISUAL-BOARD-001`, `VISUAL-BOARD-002`, `VISUAL-BOARD-003`, `VISUAL-BOARD-004`, `VISUAL-BOARD-005`, `VISUAL-BOARD-006`, `VISUAL-BOARD-007`, `VISUAL-BOARD-008`, `VISUAL-REVIEW-001`, `VISUAL-REVIEW-002`, `VISUAL-REVIEW-003`, `VISUAL-REVIEW-004`, `VISUAL-REVIEW-005`, `VISUAL-REVIEW-006`, `VISUAL-REVIEW-007`.

```text
Create one 3840 × 2160 PNG final contact sheet titled “Stockmok — Complete Product Overview”. Place exactly these fifteen immutable approved sources once each: VISUAL-BOARD-001 through VISUAL-BOARD-008 and the completed domain contact sheets VISUAL-REVIEW-001 through VISUAL-REVIEW-007. PROMPT-REVIEW-008 / VISUAL-REVIEW-008 is not an input. Do not omit, duplicate, redraw, substitute, or add a source. Build two count-reconciled zones: Product Showcase Boards 8/8 and Domain Review Boards 7/7. Order IDs ascending and label every tile with exact VISUAL-ID and title outside the crop.

The overview must visibly cover Brand + Design System, Public + Auth, Dashboard + Inventory, Procurement + Receiving, Connected + Mapping, Reports + Team + Settings, Mobile, Complete Showcase, then All Public + Auth, All Dashboard + Inventory, All Procurement, All Network, All Admin, All Mobile, and All States. Preserve Release A/B-Lite separation, public/private/Connected distinction, seven-role visibility, feature-flag behavior, route/overlay boundaries, fields, columns, actions, statuses, and canonical source data. Network disabled means hidden navigation plus authenticated 404. Reports enforce tab/action permission. Production logos remain DESIGN_AS_VECTOR. Exactly three charts appear in their immutable sources with table/text alternatives.

Include only a compact factual footer outside source crops: canonical buyer chain 18 → 20 → 60 → 70 → 70 → 110 → 120 KG; final LKR 691,700.00; superseded 18 → 58 → 68 KG not used; Release A + B-Lite only; no invented proof. Viewport/composition: 16:9 at 3840 × 2160 on #F8FAFC, flat orthographic contact sheet, no perspective/device frames. External IDs/titles/counts must be readable at 100% zoom; source panels remain recognizable and unaltered in meaning. Roles, routes, shell, fields, columns, actions, statuses, responsive behavior, and data are only those inside immutable sources. Accessibility: use high-contrast external labels and do not recolour/crop away focus, labels, errors, status text, chart alternatives, or mobile target evidence. Exclude rejected/superseded images, invented UI/data/routes/claims, B-PLUS/C/D, sales, storefront, checkout, POS, AI, forecasting, marketplace, dark theme, gradients, glass, photography, global search, and command palette. Save exactly to visual-designs/review-boards/VISUAL-REVIEW-008_complete-product-overview.png.

DO NOT INVENT NAVIGATION OR FEATURES. USE ONLY THE LISTED NAVIGATION FOR THIS SCREEN.
```

## 4. Prompt QA closure

| Check | Result |
|---|---|
| Unique prompt IDs | `16/16 PASS` |
| Unique visual IDs | `16/16 PASS` |
| Exact output paths, filenames begin with Visual ID | `16/16 PASS` |
| Required showcase groups | `8/8 PASS` |
| Required review/contact sheets | `8/8 PASS` |
| Exact source visual IDs declared | `16/16 PASS` |
| Source-led; boards do not replace individual visuals | `PASS` |
| Viewport, role/route/shell, content, fields/columns/actions/status, data, accessibility, responsive behavior, exclusions, output path | `16/16 COMPLETE` |
| Release B-PLUS/C/D leakage | `0` |
| Invented UI/data/proof | `0` |
| `PROMPT_BOARD_LIBRARY_FREEZE` | `PASS` |
