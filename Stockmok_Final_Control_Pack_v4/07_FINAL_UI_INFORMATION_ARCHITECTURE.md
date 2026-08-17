# Stockmok — Final UI Information Architecture v3.0

**Status:** the UI-design authority. Routes, screens, navigation and states.
**Companion:** `17_UI_DESIGN_EXECUTION_BRIEF.md` tells the designer *how* to produce the design and what to deliver. This document defines *what* exists.

**Material changes from v2** (recorded in `01` §6):

1. Added the **workspace selector** screen — FR-ORG-009/010 required multi-organization membership but no screen existed for it.
2. **Notifications corrected from P1/Release B to P0/Release A**, matching FR-NOTIFY-001.
3. Stock Adjustment defined as a **modal**, not a route.
4. Added **permission-denied** and **404** screens, which the route guards require.
5. Categories given their own navigation item; "manage from Products or a submenu" was not a decision.
6. **Global search cut** — "only if implemented meaningfully" was not a decision either.
7. Per-screen role access added.
8. Empty-state and error-message copy made an explicit deliverable.
9. Charts explicitly marked as the first UI cut.
10. Route added for the buyer's partner-catalog browse view.

---

# 1. Design principles

1. Business context is always visible.
2. The active role is always visible.
3. Dashboard metrics lead to actions, never to dead ends.
4. Consequences are previewed before confirmation.
5. Private and Connected are obviously different, without Private looking broken.
6. Errors are prevented inline where possible, explained plainly where not.
7. Tables are readable, filterable and not overloaded.
8. Role-aware UI never pretends to be security.
9. Release D features do not appear anywhere in Release A/B navigation.
10. Desktop-first layout, but login, receiving, product and purchase-order flows are genuinely mobile-usable.
11. **Nothing in the interface implies a capability that does not exist.**

---

# 2. Route strategy

## Public

```text
/                       public home
/login                  global login
/signup                 registration
/b/:handle              branded business login
/invite/:token          invitation acceptance
/store/:handle          public storefront            [C only — not built by default]
*                       404
```

## Authenticated, pre-organization

```text
/select-workspace       workspace selector           [NEW in v3]
/onboarding             create-business wizard
```

## Authenticated, organization-scoped

```text
/app/:handle/dashboard

/app/:handle/inventory/products
/app/:handle/inventory/products/new
/app/:handle/inventory/products/:productId
/app/:handle/inventory/products/:productId/edit
/app/:handle/inventory/categories
/app/:handle/inventory/warehouses
/app/:handle/inventory/movements

/app/:handle/procurement/purchase-orders
/app/:handle/procurement/purchase-orders/new
/app/:handle/procurement/purchase-orders/:poId
/app/:handle/procurement/receiving
/app/:handle/procurement/receiving/:poId
/app/:handle/procurement/suppliers
/app/:handle/procurement/suppliers/:partnerId
/app/:handle/procurement/buyers
/app/:handle/procurement/buyers/:partnerId

/app/:handle/network/connections
/app/:handle/network/connections/:connectionId
/app/:handle/network/partner-catalog                 supplier's own published items
/app/:handle/network/partner-catalog/:supplierOrgId  buyer's browse view          [NEW in v3]
/app/:handle/network/mappings
/app/:handle/network/mappings/new

/app/:handle/reports
/app/:handle/notifications
/app/:handle/team
/app/:handle/settings
```

**Not routes:** stock adjustment (modal), publish-to-catalog (dialog), invite member (dialog), all confirmations (dialogs).

The handle is context and lookup only. Authorization always resolves to the immutable `organizationId` and the Membership document.

## Route guard layers

```text
PublicLayout   → no requirement
AuthLayout     → requires a Firebase user            (/select-workspace, /onboarding)
OrgLayout      → requires a user AND a resolved ACTIVE membership for :handle
RequireRole    → wraps individual routes needing a specific role
```

Each layer renders a skeleton while its state is unknown and **never** renders children in an unresolved state. Direct-URL access to a forbidden route renders the permission-denied screen; it is not silently redirected, because silent redirects hide bugs.

---

# 3. Main navigation

```text
Dashboard

INVENTORY
  Products
  Categories            ← explicit item (v2 left this ambiguous)
  Warehouses
  Stock Movements

PROCUREMENT
  Purchase Orders
  Receiving
  Suppliers
  Buyers

NETWORK                 ← shown only when settings.networkEnabled
  Connected Businesses
  Partner Catalog
  Product Mappings

Reports
Notifications
Team
Settings
```

**Do not add a `Sales & Storefronts` section.** Storefront is Release C and is not built by default.
**There is no global search and no command palette** in Release A or B.

---

# 4. Role-aware navigation

| Role | Sidebar items |
|---|---|
| **Owner / Admin** | everything |
| **Inventory Manager** | Dashboard · Products · Categories · Warehouses · Stock Movements · Receiving · Reports · Notifications |
| **Procurement Manager** | Dashboard · Purchase Orders · Receiving · Suppliers · Buyers · Connected Businesses · Partner Catalog · Product Mappings · Reports · Notifications |
| **Storekeeper** | Dashboard · Products (read) · Receiving · Stock Movements · Notifications |
| **Analyst** | Dashboard · Products (read) · Stock Movements (read) · Purchase Orders (read) · Reports · Notifications |
| **Viewer** | Dashboard · Products (read) · Reports (Stock on Hand only) · Notifications |

An action the current role cannot perform is **hidden**, except where hiding it would make a screen confusing, in which case it is disabled with a tooltip naming the required role. Hiding is convenience; the server is the boundary.

---

# 5. Screen inventory

| Pri | # | Screen | Route | Release | Roles | Demo |
|---|---|---|---|---|---|---|
| P0 | 1 | Public Home | `/` | A | anyone | ✔ |
| P0 | 2 | Sign Up | `/signup` | A | anyone | ✔ |
| P0 | 3 | Global Login | `/login` | A | anyone | ✔ |
| P0 | 4 | Branded Business Login | `/b/:handle` | A | anyone | ✔ |
| P0 | 5 | Invitation Accept | `/invite/:token` | A | invitee | maybe |
| P0 | 6 | **Workspace Selector** | `/select-workspace` | A | multi-org user | maybe |
| P0 | 7 | Business Onboarding | `/onboarding` | A | new owner | ✔ |
| P0 | 8 | App Shell | wrapper | A | all members | ✔ |
| P0 | 9 | Empty Dashboard | `…/dashboard` | A | all | ✘ |
| P0 | 10 | Populated Dashboard | `…/dashboard` | A | all | ✔ |
| P0 | 11 | Product List | `…/inventory/products` | A | all | ✔ |
| P0 | 12 | Product Create / Edit | `…/products/new`, `…/edit` | A | inventory writers | ✔ |
| P0 | 13 | Product Detail | `…/products/:id` | A | all | ✔ |
| P0 | 14 | Category Management | `…/inventory/categories` | A | inventory writers | ✘ |
| P0 | 15 | Warehouse Management | `…/inventory/warehouses` | A | inventory writers | ✔ |
| P0 | 16 | **Stock Adjustment (modal)** | — | A | inventory writers | ✔ |
| P0 | 17 | Stock Movement History | `…/inventory/movements` | A | all except Viewer | ✔ |
| P0 | 18 | Private Suppliers | `…/procurement/suppliers` | A | procurement | ✔ |
| P0 | 19 | Private Buyers | `…/procurement/buyers` | A | procurement | optional |
| P0 | 20 | Partner Detail | `…/suppliers/:id` | A | procurement | ✘ |
| P0 | 21 | PO List | `…/purchase-orders` | A | procurement, read for others | ✔ |
| P0 | 22 | PO Builder | `…/purchase-orders/new` | A | PO writers | ✔ |
| P0 | 23 | PO Detail | `…/purchase-orders/:poId` | A | procurement | ✔ |
| P0 | 24 | Receiving | `…/procurement/receiving` | A | receivers | ✔ |
| P0 | 25 | Reports | `…/reports` | A | per matrix | ✔ |
| P0 | 26 | **Notifications** | `…/notifications` | **A** | all | maybe |
| P0 | 27 | Team | `…/team` | A | owner/admin | ✔ |
| P0 | 28 | Settings | `…/settings` | A | owner/admin | ✘ |
| P0 | 29 | **Permission Denied** | any | A | any | ✔ |
| P0 | 30 | **404** | `*` | A | anyone | ✘ |
| P1 | 31 | Connected Businesses | `…/network/connections` | B | owner/admin/procurement | ✔ |
| P1 | 32 | Business Discovery (panel) | on 31 | B | same | ✔ |
| P1 | 33 | Connection Detail | `…/connections/:id` | B | same | maybe |
| P1 | 34 | Partner Catalog — supplier | `…/network/partner-catalog` | B | same | ✔ |
| P1 | 35 | Partner Catalog — buyer browse | `…/partner-catalog/:supplierOrgId` | B | same | ✔ |
| P1 | 36 | Product Mapping Wizard | `…/network/mappings/new` | B | same | ✔ |
| P1 | 37 | Mappings List | `…/network/mappings` | B | same | maybe |
| P1 | 38 | Connected PO — buyer view | `…/purchase-orders/:poId` | B | procurement | ✔ |
| P1 | 39 | Connected PO — supplier view | `…/purchase-orders/:poId` | B | procurement | ✔ |
| P1 | 40 | Connected Receiving | `…/receiving/:poId` | B | receivers | ✔ |
| P2 | 41 | Public Storefront Catalog | `/store/:handle` | C | anyone | not built |

---

# 6. Application shell

**Header:** Stockmok mark · organization monogram and name (prominent) · active role badge · workspace switcher (only when the user has more than one membership) · notification bell with unread count · user menu (profile, sign out) · amber `EMULATOR` ribbon when running against emulators.

**Sidebar:** collapsible; section labels; visible text labels when expanded; clear active state; role-filtered; the NETWORK section appears only when the feature flag is on.

**Content:** `PageHeader` on every screen (title, optional breadcrumb, primary action); max width around 1440 px; consistent padding.

**Mobile:** the sidebar becomes a slide-over drawer; the header retains monogram, name and bell.

**Wrong-workspace prevention:** for multi-organization users the current organization must be unmistakable — monogram plus full name, never a truncated footer label.

---

# 7. Public home page

Sections, in order: header with brand, Login and Create Workspace · hero (one inventory, better procurement, connected suppliers) · a dashboard visual · problem → solution · four feature cards (Inventory Control, Procurement, Connected Business Collaboration, Analytics) · how connected supplier mapping works · industries served · security and tenant isolation · closing call to action · footer.

**Do not advertise** AI, forecasting, a marketplace, checkout, POS or a mobile app. The page must describe only what is built. A marker who clicks a feature described on the home page and finds nothing has been told the system is incomplete.

---

# 8. Branded login — `/b/:handle`

```text
[ Grand Ocean monogram or logo ]

Grand Ocean Hotel
@grand-ocean

Email        [                    ]
Role         [ Detect automatically ▾ ]     ← optional, defaults to auto
Password     [                    ]

[ Sign In ]

or  [ Continue with Google ]

Forgot password?     Not your business? Go to Stockmok login
```

**Eight required states**

1. resolving the organization identity (skeleton)
2. handle not found — safe, non-revealing
3. ready to sign in, branded
4. authentication failed — one neutral message, no account enumeration
5. authenticated but not a member of this organization
6. authenticated but the requested role does not match the assigned role
7. offering the correct assigned role as the next step
8. account suspended

The role selector never reveals which roles exist for a given email before authentication. It defaults to "Detect automatically", and the copy must make clear it is a preference, not a credential. State 6 is where the project's central security claim becomes visible to a marker, so it must look like considered product behaviour, not an error page.

---

# 9. Onboarding

Four steps, with a progress stepper.

**Step 1 — Business:** name · handle (live normalisation preview, availability check, immutability warning) · industry.
**Step 2 — Locale:** country · currency · timezone.
**Step 3 — First location:** warehouse name · type.
**Step 4 — Finish:** summary, then create.

The handle field must show the normalised value as the user types (`Grand Ocean` → `grand-ocean`), flag reserved words, and state plainly that the handle cannot be changed later.

Failure states: handle taken · invalid handle · reserved handle · network error with retry. A failure must never leave a half-created organization, and the UI should say so.

---

# 10. Dashboard

**KPI row:** Inventory Value · Active SKUs · Low Stock · Open Purchase Orders · Awaiting Receipt. Each card has a loading skeleton and an error state, and each is clickable to the filtered screen behind it.

**Needs Attention:** low-stock items · out-of-stock items · purchase orders awaiting receipt · pending connection requests (B) · connected purchase orders awaiting a response (B). Every row links to the exact filtered screen that resolves it.

**Operational panels:** Recent Activity (actor, action, object, time) · Low Stock list (product, on hand, minimum, action) · Recent Purchase Orders · Inventory by Location.

**Charts (P2, first to be cut):** stock-status donut · inventory-by-location bar · purchase-order-status bar. All lazy-loaded, each accompanied by a text summary. **The dashboard must still look complete with the charts removed.**

**Empty dashboard:** a setup checklist — add a category, add a product, record opening stock, add a supplier, invite your team — with each item linking to its screen. A new organization must never see a wall of zeros.

Every figure must be explainable: the student should be able to point at any number and name the query behind it.

---

# 11. Product list

Columns: Product · SKU · Category · On Hand (with unit) · Stock Status pill · Preferred Supplier · Updated · Actions.

Filters: text search · category · stock status · warehouse · archived toggle.
Sorting: name, SKU, updated, on hand — **indexed columns only**; other headers are not sortable rather than sorted incorrectly.
Pagination: 25 rows, cursor-based Previous/Next with a range label.

Row actions: View · Edit · Adjust Stock (opens the modal) · Archive. Actions are filtered by role.

Mobile: rows become stacked cards with the label repeated beside each value.

---

# 12. Product detail

Tabs:

- **Overview** — identity, category, base unit, purchase cost, selling price, minimum stock, reorder target, status, preferred supplier.
- **Stock** — total on hand, available, status, per-warehouse balance table, recent movements, Adjust Stock and Record Opening Balance actions.
- **Suppliers** — preferred private supplier; connected mappings with their conversion factors (B).
- **Buyers** — connected buyer mappings (B). Hidden entirely if Release B is not enabled.
- **Activity** — audit and movement history for this product.
- **Storefront** — only if Release C is built. Otherwise the tab does not exist.

---

# 13. Stock adjustment — modal

```text
Adjust Stock

Chicken Breast · MEAT-001
Warehouse:  [ Cold Room ▾ ]

Current:    18.000 KG

Direction:  ( • ) Increase   (   ) Decrease
Quantity:   [ 2.000 ] KG
Reason:     [ Recount correction            ]   (required)

Result:     20.000 KG          ← recomputed live

[ Cancel ]  [ Confirm Adjustment ]
```

Requirements: zero quantity invalid · a negative result invalid, with the reason shown · reason mandatory · Confirm disabled while submitting · success shows a toast with the movement reference · a duplicate submission returns the same result safely, never an error.

The `operationId` is generated **when the modal opens**, so a double-click and a retry after a dropped connection both reuse it.

---

# 14. Suppliers and buyers

Tabs: **Private** · **Connected** · **Pending**. Before Release B is enabled, Connected and Pending show a clear "available with connected businesses" empty state rather than being hidden — but they must not look broken.

Private partner detail: contacts · status · open purchase orders · order history · deactivate.
Connected partner detail: organization monogram, name, `@handle` · connection status · mapped item count · connected purchase orders.

**Private must look like a complete, first-class way to work.** Most real suppliers will never be Stockmok users.

**Buyers in Release A** are a directory only — there is no outbound sales workflow. The screen must not imply one: no "create sales order" affordance, no outbound quantities.

---

# 15. Connected business discovery — Release B

```text
Find a Stockmok business

@ [ freshfoods                    ]   [ Find business ]
```

Result card: monogram · Fresh Foods Ltd · `@freshfoods` · industry · country · `Connect as Supplier`.

States: idle · searching · found · not found ("No Stockmok business uses that handle") · already connected · request already pending · cannot connect to your own business.

No marketplace, no browsing, no fuzzy matching. Exact handle only.

---

# 16. Partner catalog

**Supplier view** — a table of the organization's own products with publishing controls: Internal Product · Internal SKU · Partner SKU · Order Unit · Availability · Published · Action.

The publish dialog states plainly:

> Connected buyers will see the partner fields below. They cannot see your stock quantities, your costs, your warehouses or any other private data.

It also enforces that the order unit equals the product's base unit (INV-17), explaining why.

**Buyer browse view** — a read-only list of one connected supplier's published items, loaded through the authorized callable. It shows the fields the supplier published and nothing else, with a visible note that this is a partner projection, not the supplier's inventory.

---

# 17. Product mapping — the signature workflow

Five steps, with a stepper.

**Step 1 — Supplier.** Choose an ACTIVE connected supplier.

**Step 2 — Supplier SKU.** Enter the exact partner SKU.
States: idle · searching ("Checking Fresh Foods' partner catalog…") · found · not found · not published · connection no longer active.

Found:

```text
✓ Partner item found

  Fresh Foods                        Your product
  Fresh Chicken Breast 5 KG Pack     Chicken Breast
  SKU: CKN-B5                        SKU: MEAT-001
  Order unit: PACK                   Base unit: KG
  Pack: 5 KG
```

**Step 3 — Semantic confirmation.** A deliberate, never pre-ticked checkbox:

> ☐ I confirm that *Fresh Chicken Breast 5 KG Pack* and *Chicken Breast (MEAT-001)* are the same real-world item.

**Step 4 — Unit conversion.**

```text
1 PACK  =  [ 5 ]  KG

Preview:  10 PACK = 50 KG
```

**Step 5 — Review and create.** Both items, the factor, the worked example, one action.

**Seven error states, all designed and all screenshotted for the report:** no active connection · SKU not found · item not published · semantic match declined · invalid factor (zero, negative, empty) · connection went stale before submit · duplicate mapping already exists.

**Save stays disabled until every condition passes**, and the disabled state shows a reason line so the user never has to guess what is missing.

---

# 18. Purchase orders

## Private supplier

Builder: Supplier → Items → Delivery and notes → Review → Mark Ordered.
Statuses shown: Draft · Ordered · Partially Received · Received · Cancelled.
**Never display an in-platform "Supplier Accepted" state for a private supplier** — that supplier is not a Stockmok user and cannot have accepted anything in the system.

## Connected supplier

Buyer flow: Connected Supplier → Mapped Items → Review → Submit → await response → Shipped → Receiving.
Supplier flow: inbox → open → Accept or Reject → Ship.

Every line shows both representations:

```text
Your item:      Chicken Breast · MEAT-001 · KG
Supplier item:  Fresh Chicken Breast 5 KG Pack · CKN-B5 · PACK
                10 PACK = 50 KG
```

The timeline attributes each event to an actor and an organization: submitted by the buyer, accepted by the supplier, shipped by the supplier, received by the buyer. Both parties see the same timeline.

---

# 19. Receiving

Optimised for a storekeeper on a phone.

```text
PO SF-1024 · Fresh Foods

Chicken Breast
  Ordered:          10 PACK / 50 KG
  Already received: 0
  Receive now:      [  8  ] PACK
  Converted:        40 KG

Warehouse: [ Cold Room ▾ ]

Current stock:  70 KG
After receipt:  110 KG
Outstanding after: 2 PACK / 10 KG

              [ Confirm Receipt ]     ← sticky
```

Requirements: never assume a full receipt · quantities entered in the supplier order unit for connected orders and in the base unit for private ones · live conversion and result · over-receipt blocked inline before submission · sticky confirm on mobile · no horizontal scrolling for the core action · large touch targets.

---

# 20. Reports

**Stock on Hand** — Product · Warehouse · On Hand · Unit · Status · Value. Filters: warehouse, category, stock status. CSV export.

**Purchase Orders** — PO number · Counterparty · Private/Connected · Status · Total · Created · Expected. Filters: status, date range, kind.

Optional charts sit beside their tables, never instead of them. **A chart never overrides an accurate table**, and every chart has a text summary.

---

# 21. Team

Columns: name and email · role · status · joined or invited · actions.
Actions: Invite · Change Role · Suspend · Remove. The Owner row is visibly protected and its destructive actions are absent, not merely disabled.

Invitation dialog: email · role · Create. On success it shows the invite link **once**, with a copy button and a plain warning that the link will not be shown again.

Pending invitations are listed with their expiry and a Revoke action.

---

# 22. Screen states

Every P0 and P1 screen defines: loading · empty · error · success · permission denied · submitting · validation error · confirmation (where destructive).

Copy examples that must be written as part of the design deliverable:

- No products — *"Add your first product to start tracking inventory."*
- No connections — *"Connect a Stockmok supplier to validate product codes and exchange purchase orders."*
- No low stock — *"All tracked products are above their minimum level."*
- No notifications — *"You're all caught up."*
- Permission denied — *"You need the Procurement Manager role to open this page. You're signed in as Storekeeper."*
- Warehouse archive blocked — *"Cold Room still holds stock. Move or reduce it to zero before archiving."*

Skeletons must match the final layout. A centred spinner on a blank page is not an acceptable loading state.

---

# 23. Destructive confirmations

Required for: Archive Product · Archive Warehouse · Cancel Purchase Order · Disable Connection · Disable Mapping · Suspend or Remove Member · Revoke Invitation · any stock reduction greater than 50 % of the current balance.

Each confirmation names the specific object. Ordinary saves are never confirmed — confirmation fatigue makes real confirmations invisible.

---

# 24. Mobile priorities

Designed at 390 px first: login · dashboard · product list and detail · stock adjustment · purchase-order detail · **receiving**.

Receiving is the highest mobile priority: large inputs, conversion and result visible without scrolling, warehouse selection above the fold, sticky confirm, no horizontal scroll.

Everything else must be usable at 768 px.

---

# 25. Accessibility

Explicit visible labels (never placeholder-as-label) · visible keyboard focus everywhere · semantic heading hierarchy · status conveyed by text or icon in addition to colour · validation errors associated with their field and announced · WCAG AA contrast · action-specific button text ("Archive product", not "OK") · real table headers with `scope` · 44 px touch targets · a text summary beside every chart · a skip-to-content link · one dialog at a time with focus trapped and restored.

`eslint-plugin-jsx-a11y` runs as an **error**, not a warning, so these hold across thirty screens built at speed.

---

# 26. Visual direction

Keep: light SaaS aesthetic · a single confident blue · restrained status colours · soft cards · clean tables · clear KPI hierarchy.

Change from the original board:

1. Remove `Sales & Storefronts` from Release A/B navigation.
2. Show NETWORK only when the feature flag is on.
3. Separate private and connected purchase orders visually.
4. Show mapping states precisely, including all seven error states.
5. Strengthen business and role context in the header.
6. Prioritise actions over decorative charts.
7. Replace logo upload with a generated monogram everywhere.

---

# 27. UI handoff acceptance

A screen is design-complete only when it specifies: route · role access · purpose · primary action · data shown · loading · empty · error · success · permission-denied · submitting · confirmation · mobile behaviour · the acceptance scenario it serves.

A screen delivered in the happy state only is **not** delivered. The states are where the marks are, because they are what makes a system feel error-free.

---

# 28. UI freeze statement

> Release A must feel visually complete on its own. Release B must feel like one strong, well-designed differentiating workflow rather than a scattering of half-features. The interface must never imply that Release C or D functionality already exists.
>
> **Design is frozen at the end of Day 2.** After that: defect fixes, and the responsive and accessibility pass in Stage 17. Nothing else.
