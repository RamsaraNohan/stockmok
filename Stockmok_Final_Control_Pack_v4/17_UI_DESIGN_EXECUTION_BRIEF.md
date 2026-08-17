# Stockmok — UI Design Execution Brief v3.0

**Status:** the brief for the visual-design phase. **This is not the design.**
**Audience:** whoever produces the visual design (Claude Design, a design tool, or the student directly).
**Authority:** `07_FINAL_UI_INFORMATION_ARCHITECTURE.md` owns routes, screens and states. This document tells the designer what to produce, in what order, to what constraints, and — critically — **what not to design**.
**Hard constraint:** design must be complete and frozen by the **end of Day 2 (11 August 2026)**. Everything after that is implementation.

---

# 1. Design objectives, in priority order

1. **A marker must recognise a complete Inventory & Procurement Management System within thirty seconds of the dashboard.** Clarity of purpose beats visual ambition.
2. **Every screen must be implementable by one developer in under half a day.** A design that cannot be built in the schedule is a defect in the design, not in the developer.
3. **Business identity and active role must be unmissable**, because multi-tenancy is the architectural claim the whole project rests on.
4. **Consequences must be visible before confirmation** — stock adjustments, receipts and cancellations all show current → change → result.
5. **Private and Connected must be visually distinct** without making Private look like a broken fallback.
6. **Accessible by construction** — labels, focus, contrast and non-colour-only status are design decisions, not a later fix.
7. **Nothing may imply a feature that does not exist.** No AI panels, no checkout, no marketplace, no POS.

---

# 2. Visual personality

**Target:** a calm, credible operational SaaS product. The reference point is a tool an operations manager uses for six hours a day, not a marketing landing page.

| Attribute | Direction |
|---|---|
| Overall | Light, spacious, low-chrome. Content first. |
| Primary colour | A single confident blue used for primary actions and active navigation. Not a gradient-heavy brand. |
| Surfaces | White cards on a very light neutral background; soft 1 px borders; shadows only for elevation that means something (dialogs, dropdowns). |
| Density | Comfortable on forms, compact on tables. Operations users scan tables; they do not admire them. |
| Type | One sans-serif family, 4–5 sizes, 2–3 weights. Tabular numerals for every quantity and money column. |
| Corners | Consistent radius: 8 px for cards and inputs, 6 px for buttons, 12 px for dialogs. |
| Motion | Almost none. 150 ms fades on dialogs and toasts. No page transitions, no parallax, no animated counters. |
| Illustration | None, except a simple line illustration in empty states. No stock photography. |
| Data viz | Restrained. Three charts total, all secondary to their tables. |

**Explicitly avoid:** dark-mode-first design (light only, tokens ready for dark later), glassmorphism, heavy gradients, animated dashboards, oversized hero numbers, sidebar icon-only navigation without labels, and anything that would take longer to build than to look at.

**The public marketing page is allowed more personality than the application** — a hero, a product visual, feature cards — but must stay honest about what exists.

---

# 3. Non-negotiable design constraints

These come from the frozen architecture. A design that breaks one of them will be rejected at implementation.

1. **Handle in the URL.** Every authenticated screen lives under `/app/:handle/…`. The handle appears in the app shell.
2. **Seven roles, one per member.** No multi-role UI, no custom role builder.
3. **No logo upload.** Organization identity is a **monogram** (two initials on a colour derived from the organization id), with an optional logo URL. Design the monogram as a first-class element, not a placeholder.
4. **No global search** in Release A/B. Do not design a command palette.
5. **Tables are server-paginated at 25 rows** with cursor paging (Previous / Next), not infinite scroll and not page numbers.
6. **Sorting is only offered on indexed columns.** Do not design a sort affordance on every column header.
7. **Quantities show up to 3 decimals with an explicit unit.** Money shows an explicit currency. Design column widths accordingly.
8. **Status is never colour-only.** Every status pill carries text, and ideally an icon.
9. **Notifications** are a persisted entity with their own screen and a header bell — separate from transient toasts.
10. **Charts are the first thing cut.** Design the dashboard so it still looks complete with the charts removed.
11. **Storefront is not built.** Do not design it.

---

# 4. Screen priorities

## P0 — Release A. Design all of these. Nothing ships without them.

| # | Screen | Route | Roles | Notes |
|---|---|---|---|---|
| 1 | Public home | `/` | anyone | one page, sections per `07` §7 |
| 2 | Sign up | `/signup` | anyone | email/password + Google |
| 3 | Global login | `/login` | anyone | + password reset link |
| 4 | Branded business login | `/b/:handle` | anyone | **8 states — see §6** |
| 5 | Invitation accept | `/invite/:token` | invitee | shows org + offered role before sign-in |
| 6 | Workspace selector | `/select-workspace` | multi-org user | **new in v3** — was missing from `07` v2 |
| 7 | Onboarding wizard | `/onboarding` | new owner | 4 steps |
| 8 | App shell | wraps `/app/:handle/*` | all | header + sidebar + content |
| 9 | Dashboard — empty | `/app/:handle/dashboard` | all | setup checklist |
| 10 | Dashboard — populated | same | all | KPIs, Needs Attention, panels |
| 11 | Product list | `…/inventory/products` | all read | filters, pagination |
| 12 | Product create / edit | `…/products/new`, `…/:id/edit` | inventory writers | |
| 13 | Product detail | `…/products/:id` | all read | 4 tabs |
| 14 | Categories | `…/inventory/categories` | inventory writers | inline table CRUD |
| 15 | Warehouses | `…/inventory/warehouses` | inventory writers | incl. archive-blocked state |
| 16 | Stock adjustment | **modal**, not a route | inventory writers | the signature Release-A interaction |
| 17 | Movement history | `…/inventory/movements` | all read | filters |
| 18 | Suppliers | `…/procurement/suppliers` | procurement | Private / Connected / Pending tabs |
| 19 | Buyers | `…/procurement/buyers` | procurement | same component, filtered |
| 20 | Partner detail | `…/suppliers/:id` | procurement | |
| 21 | PO list | `…/procurement/purchase-orders` | procurement | Private / Connected tabs |
| 22 | PO builder | `…/purchase-orders/new` | procurement | 4 steps |
| 23 | PO detail | `…/purchase-orders/:id` | procurement | timeline with actor attribution |
| 24 | Receiving | `…/procurement/receiving` | receivers | **mobile-first** |
| 25 | Reports | `…/reports` | analysts + | two report tabs |
| 26 | Notifications | `…/notifications` | all | **P0, not P1 — corrected in v3** |
| 27 | Team | `…/team` | owner/admin | invite, roles, suspend |
| 28 | Settings | `…/settings` | owner/admin | org profile, defaults, flags |
| 29 | Permission denied | any | any | shown by route guards |
| 30 | 404 | `*` | anyone | |

## P1 — Release B-Lite. Design after every P0 screen is complete.

| # | Screen | Route | Notes |
|---|---|---|---|
| 31 | Connected businesses | `…/network/connections` | list + incoming requests |
| 32 | Business discovery | modal or panel on 31 | exact-handle lookup + result card |
| 33 | Connection detail | `…/network/connections/:id` | status, mapped items, connected POs |
| 34 | Partner catalog — supplier | `…/network/partner-catalog` | publish table + dialog |
| 35 | Partner catalog — buyer browse | tab on 34 | read-only, callable-backed |
| 36 | Product mapping wizard | `…/network/mappings/new` | **the signature workflow — 5 steps, 7 error states** |
| 37 | Mappings list | `…/network/mappings` | |
| 38 | Connected PO — buyer | `…/purchase-orders/:id` | dual representation |
| 39 | Connected PO — supplier | same route, supplier view | inbox + accept/ship |
| 40 | Connected receiving | `…/receiving` | supplier units → base units |

## P2 — DO NOT DESIGN

Storefront catalog and any Release C screen · any Release D concept (checkout, POS, sales orders, forecasting, marketplace, custom roles, multi-currency, batch/lot, barcode) · a settings page for anything not in `05` §5.4 · an admin/superuser console · onboarding tours · a command palette · a dark theme.

Designing these wastes design time, and worse, tempts implementation into building them.

---

# 5. Design system to produce

## 5.1 Tokens — deliver as a single table

| Group | Tokens |
|---|---|
| Colour — brand | `primary`, `primary-hover`, `primary-subtle`, `primary-contrast` |
| Colour — neutral | `bg`, `surface`, `surface-subtle`, `border`, `border-strong`, `text`, `text-muted`, `text-subtle` |
| Colour — status | `success`, `warning`, `danger`, `info`, each with a `-subtle` background pair |
| Colour — stock status | `in-stock`, `low-stock`, `out-of-stock` (must be distinguishable in greyscale) |
| Colour — PO status | `draft`, `pending`, `active`, `complete`, `cancelled` |
| Spacing | 4-point scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 |
| Radius | `sm` 6, `md` 8, `lg` 12, `full` |
| Shadow | `sm` (cards), `md` (dropdowns), `lg` (dialogs) |
| Type | `display`, `h1`, `h2`, `h3`, `body`, `body-sm`, `caption`, `mono-num` |
| Breakpoints | 390, 768, 1024, 1280, 1536 |

Every token must pass WCAG AA against its intended background. State the contrast ratio for text and status tokens in the deliverable.

## 5.2 Components to design — this list is exhaustive

| # | Component | States to show |
|---|---|---|
| 1 | Button | primary / secondary / ghost / danger × default, hover, focus, disabled, loading |
| 2 | IconButton | same, always with a visible focus ring |
| 3 | Input | default, focus, error, disabled, with prefix/suffix (unit, currency) |
| 4 | Select | default, open, error, disabled |
| 5 | Textarea | default, error |
| 6 | Checkbox / Switch | on, off, focus, disabled |
| 7 | Field wrapper | label, hint, error, required marker |
| 8 | Card | plain, with header, with footer action |
| 9 | KPI card | value, label, delta or context line, loading skeleton, clickable variant |
| 10 | StatusPill | all stock statuses and all PO statuses, each text + icon |
| 11 | Badge | neutral, count, "Private", "Connected" |
| 12 | DataTable | header, row, hover, selected, sortable header, sticky header, empty, loading skeleton, mobile card fallback |
| 13 | Pagination | Previous/Next with a range label, first/last page disabled states |
| 14 | Tabs | default, active, disabled, with count badges |
| 15 | Modal | small, medium, large; header, body, footer |
| 16 | ConfirmDialog | neutral and destructive variants |
| 17 | Toast | success, error, info |
| 18 | EmptyState | icon, headline, body, primary action |
| 19 | ErrorState | with retry |
| 20 | Skeleton | text line, card, table row |
| 21 | Monogram | 24 / 32 / 48 px, with and without an image |
| 22 | Timeline | event with actor, role badge, timestamp, note |
| 23 | Stepper | wizard progress, 4–5 steps, completed/current/upcoming |
| 24 | FilterBar | search input, dropdown filters, active-filter chips, clear-all |
| 25 | PageHeader | title, subtitle, breadcrumb, primary action, secondary actions |

**Do not design a 26th component.** If a screen seems to need one, compose it from these.

## 5.3 App shell

- **Header:** Stockmok mark · organization monogram + name (prominent, not a footnote) · role badge · workspace switcher (only when the user has more than one membership) · notification bell with unread count · user menu.
- **Sidebar:** collapsible, section labels (`INVENTORY`, `PROCUREMENT`, `NETWORK`), text labels always visible when expanded, clear active state, role-filtered items. The `NETWORK` section appears only when Release B is enabled.
- **Content:** max width ~1440 px, consistent page padding, `PageHeader` on every screen.
- **Mobile:** sidebar becomes a slide-over drawer; the header keeps the monogram, name and bell.

**Wrong-workspace prevention:** when a user belongs to more than one organization, the header must make the current one unmistakable — monogram plus full name, not a truncated label.

---

# 6. Required states for every screen

`07` §27 says a screen is design-complete only when it specifies its states. Make that concrete: **every P0 and P1 screen must be delivered with all applicable states below.** A screen delivered in the "happy" state only is not delivered.

| State | Applies to | Requirement |
|---|---|---|
| Loading | every data screen | skeleton matching the final layout, never a centred spinner on a blank page |
| Empty | every list | icon, one-sentence explanation, primary action |
| Error | every data screen | plain-language message + retry, no error codes shown raw |
| Success | every mutation | toast + the updated data visible, plus a reference (e.g. movement id) where one exists |
| Validation error | every form | inline, next to the field, announced to assistive tech |
| Permission denied | every role-gated screen | explains what is needed, offers a route the user *can* take |
| Submitting | every form | button disabled with a spinner; **double submit must be impossible** |
| Confirmation | every destructive action | dialog naming the specific object |

### The eight branded-login states (screen 4) — all required

1. resolving the organization identity
2. handle not found
3. ready to sign in (branded)
4. authentication failed (neutral, non-enumerating copy)
5. authenticated but not a member of this organization
6. authenticated but the requested role does not match the assigned role
7. offering the correct assigned role as a next step
8. account suspended

State 6 is the screen that demonstrates the project's central security claim. Design it well: it must feel like a considered product behaviour, not an error page.

### Role selector on branded login

Default the control to **"Detect automatically"**. Explicit role selection is optional and clearly labelled as a preference, not a credential. The design must not imply that choosing a role grants it.

---

# 7. Responsive priority

Desktop-first for layout, but these six flows are designed at 390 px **first** and must be genuinely usable one-handed:

1. Branded and global login
2. Dashboard (KPI cards stack; Needs Attention stays above the fold)
3. Product list (table becomes stacked cards) and product detail
4. Stock adjustment modal (becomes a full-height sheet)
5. PO detail
6. **Receiving** — the highest-priority mobile screen; a storekeeper uses it standing in a cold room

Receiving at 390 px requires: large number inputs, the conversion and result visible without scrolling, warehouse selection above the fold, a sticky confirm button, and no horizontal scrolling for the core action.

Everything else must be *usable* at 768 px and may be desktop-optimised above that.

---

# 8. Role-aware behaviour to design

Design the navigation and page actions for these four representative roles; the other three follow the same rules.

| Role | Sidebar | Notable |
|---|---|---|
| **Owner / Admin** | everything | Team and Settings visible; Owner row protected in Team |
| **Inventory Manager** | Dashboard, Products, Categories, Warehouses, Movements, Receiving, Reports, Notifications | no Team, no Settings, no Network |
| **Procurement Manager** | Dashboard, Purchase Orders, Receiving, Suppliers, Buyers, Network, Reports, Notifications | no Team, no Settings, cannot adjust stock |
| **Storekeeper** | Dashboard, Products (read), Receiving, Movements, Notifications | **cannot adjust stock**; Receiving is their home screen |

Design rule: an action the current role cannot perform is **hidden**, not shown disabled — except where hiding it would make the screen confusing, in which case it is disabled with a tooltip explaining the required role. The permission-denied screen exists for direct-URL access.

---

# 9. Data to show on each key screen

Only the fields listed. Adding a field to a design creates work in the schema, the service, the tests and the report.

**Dashboard** — KPI row: Inventory Value (currency), Active SKUs, Low Stock count, Open POs, Awaiting Receipt. Needs Attention: low-stock items, POs awaiting receipt, pending connection requests (B), connected POs awaiting response (B). Panels: Recent Activity (actor, action, object, time), Low Stock list (product, on hand, minimum, action), Recent POs (number, supplier, status, total), Inventory by Location.

**Product list** — Product (name + monogram-less thumbnail slot), SKU, Category, On Hand (with unit), Stock Status pill, Preferred Supplier, Updated, row actions (View, Edit, Adjust Stock, Archive).

**Product detail** — Overview: name, SKU, category, base unit, purchase cost, selling price, minimum stock, reorder target, status. Stock: total on hand, available, status, per-warehouse table, recent movements. Suppliers: preferred private supplier, connected mappings (B). Activity: audit entries.

**Stock adjustment modal** — product name + SKU, warehouse selector, current balance, direction, quantity + unit, reason (required), **computed result**, confirm.

**PO detail** — number, supplier (with a Private/Connected badge), status, created/expected dates, line table (product, SKU, unit, ordered, received, unit price, line total), totals, timeline, actions permitted by status and role.

**Receiving** — PO number, supplier, per line: product, ordered, already received, receive-now input, converted quantity (connected only), warehouse, current stock, stock after, outstanding after; sticky confirm.

**Mapping wizard** — step 1 supplier; step 2 partner SKU input + search state; step 3 matched supplier item card (name, SKU, order unit, pack description) beside the buyer's product card (name, SKU, base unit) + semantic confirmation; step 4 conversion `1 <supplierUnit> = [n] <buyerUnit>` with a worked preview; step 5 review and create.

---

# 10. Private vs Connected — the distinction to design

| Aspect | Private supplier | Connected supplier |
|---|---|---|
| Badge | neutral grey "Private" | brand-tinted "Connected" with a link icon |
| Identity | name typed by the user | organization monogram, name, `@handle` |
| PO statuses shown | Draft, Ordered, Partially Received, Received, Cancelled | Draft, Submitted, Accepted, Shipped, Partially Received, Received, Rejected, Cancelled |
| Timeline | buyer-only events | events attributed to buyer *or* supplier, with the organization named |
| Line display | one product representation | **two** — "Your item" and "Supplier item" with the conversion between them |
| Receiving input | base unit | supplier order unit, with a live conversion to base units |
| Empty state | "Add a supplier you order from" | "Connect a Stockmok business to exchange purchase orders" |

**Design principle:** Private must look like a complete, first-class way to work — most real suppliers will never be Stockmok users. Connected is an upgrade, not a correction.

---

# 11. The Product Mapping signature workflow — design in the most detail

This is the screen that distinguishes Stockmok from a generic CRUD project. It deserves the most design attention after the dashboard.

**Narrative the design must tell:** *"You are about to say that your product and their product are the same real-world thing, and here is exactly how much of theirs equals how much of yours."*

**Step 2 — SKU lookup states**

- idle: input with the supplier's name in the hint
- searching: "Checking Fresh Foods Partner Catalog…"
- **found**: a green-accented card showing the supplier item beside the buyer's product
- **not found**: "No published item with SKU `CKN-X9` in Fresh Foods' partner catalog" + Save disabled
- **unpublished**: "That item exists but is not currently published to you"
- **stale connection**: "Your connection to Fresh Foods is no longer active"

**Step 3 — semantic confirmation.** A deliberate checkbox, never pre-ticked: *"I confirm Fresh Chicken Breast 5 KG Pack and Chicken Breast (MEAT-001) are the same real-world item."* This is the step that prevents a valid-but-wrong SKU from creating a wrong mapping, and it should feel like a decision.

**Step 4 — conversion.** `1 PACK = [ 5 ] KG` with a live worked example directly beneath: `10 PACK = 50 KG`. Reject zero, negative and empty with inline messages.

**Step 5 — review.** Both items, the factor, the worked example, and a single Create Verified Mapping action.

**Save is disabled until every condition is satisfied.** Design the disabled state with a reason line so the user is never guessing what is missing.

**Also design:** duplicate-mapping and invalid-factor error states. Seven error states total — all seven are screenshotted for the report.

---

# 12. Implementation-complexity constraints

The design will be built by one developer with an AI assistant in roughly ten days. Respect these limits.

| Constraint | Limit |
|---|---|
| New components beyond §5.2 | **zero** |
| Distinct page layouts | at most 5 (list, detail-with-tabs, form, wizard, dashboard) |
| Custom scroll behaviour | only the sticky table header and the sticky receiving confirm |
| Drag and drop | none |
| Inline-editable table cells | none — edit in a form or a modal |
| Simultaneous open dialogs | one |
| Charts | three, all lazy-loaded, all with a table beside or beneath them |
| Custom icons | none — lucide-react only |
| Bespoke animation | none |
| Fonts | one family, self-hosted or system stack |
| Images | none required; monograms and placeholders only |

**Test to apply to every screen before delivering it:** *can this be built from the components in §5.2 in under four hours?* If not, simplify the screen.

---

# 13. Accessibility requirements for the design

- Contrast: 4.5:1 for body text, 3:1 for large text and meaningful UI boundaries. State the measured ratios.
- Focus: a visible focus ring on every interactive element, never removed, with enough contrast against both surface colours.
- Status: text or icon in addition to colour, everywhere. Verify each status set in greyscale.
- Touch targets: minimum 44 × 44 px on mobile.
- Forms: visible label above every field (no placeholder-as-label), error text below and associated.
- Tables: real header cells; on mobile, stacked cards with the label repeated per value.
- Dialogs: title, described body, obvious close, and a designated initial focus target.
- Charts: a text summary of the same data adjacent to each chart.
- Motion: nothing that would need a `prefers-reduced-motion` alternative.

---

# 14. Deliverables

| # | Deliverable | Format |
|---|---|---|
| 1 | Token table with contrast ratios | table or JSON |
| 2 | Component sheet — all 25 components with every state | frames or an HTML gallery |
| 3 | P0 screens 1–30, each with its applicable states from §6 | frames at 1280 px |
| 4 | The six mobile-priority flows at 390 px | frames |
| 5 | P1 screens 31–40 | frames at 1280 px |
| 6 | App shell in three role variants | frames |
| 7 | Mapping wizard — all five steps and all seven error states | frames |
| 8 | Empty-state copy for every list | text list |
| 9 | Error-message copy for every named error reason in `10` TECH-033 | text list |
| 10 | Notes on anything the designer deliberately simplified | markdown |

**Copy matters more than pixels here.** Deliverables 8 and 9 are frequently skipped and are exactly what makes an application feel finished to a marker. Write the words.

---

# 15. What `07` was missing, now supplied

Recorded so the reconciliation report can trace it:

1. **Workspace selector screen** — FR-ORG-009/010 require multi-organization membership, but no screen existed for choosing between them. Added as P0 screen 6.
2. **Notifications priority** — `02` marks FR-NOTIFY-001 as A-MUST while `07` v2 listed the screen as P1/Release B. Corrected: **P0, Release A**.
3. **Stock adjustment is a modal, not a route** — `07` v2 specified the screen with no route and no placement.
4. **Component inventory** — `07` v2 described screens but never enumerated the components, leaving the design system unbounded.
5. **Design tokens** — referenced as "visual direction" but never specified as deliverables.
6. **Per-screen role mapping** — `07` v2 gave role-aware navigation but not per-screen access.
7. **Permission-denied and 404 screens** — required by the guards but absent from the screen inventory.
8. **Error-message copy** — no document owned the words shown when a command fails.
9. **Global search** — left as "only if implemented meaningfully", which is not a decision. **Cut.**
10. **Categories navigation** — "may be managed from Products or a secondary submenu" was ambiguous. **Decided: its own sidebar item under INVENTORY.**

These corrections are folded into `07` v3.

---

# 16. Sequencing for the design phase

Design happens on Days 1–2 in parallel with repository and Firebase setup. It must not extend into Day 3.

| Order | Work | When |
|---|---|---|
| 1 | Tokens + component sheet | Day 1 morning |
| 2 | App shell + dashboard (empty and populated) | Day 1 afternoon |
| 3 | Auth screens incl. all 8 branded-login states | Day 1 evening |
| 4 | Inventory: list, detail, form, adjustment modal | Day 2 morning |
| 5 | Procurement: PO list, builder, detail, receiving (desktop + 390 px) | Day 2 afternoon |
| 6 | Team, Settings, Reports, Notifications, denied, 404 | Day 2 afternoon |
| 7 | P1 network screens + the mapping wizard in full | Day 2 evening |
| 8 | Empty-state and error copy | Day 2 evening |
| — | **FREEZE** | end of Day 2 |

If the schedule slips, cut in this order: P1 network screens → charts → Settings detail → mobile variants beyond the six priority flows. **Never cut the component sheet or the state coverage** — those are what make implementation fast.

---

# 17. Verdict

Everything a designer needs is now specified: objectives, personality, constraints, an exhaustive screen list with priorities, an exhaustive component list, required states, responsive priorities, role behaviour, per-screen data, the two signature workflows, complexity limits, accessibility rules, deliverables, and a two-day sequence with a defined cut order.

**READY_FOR_UI_DESIGN: YES**
