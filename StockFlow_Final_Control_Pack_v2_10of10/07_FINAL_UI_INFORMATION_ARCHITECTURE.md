# StockFlow — Final UI Information Architecture v2.0

**Status:** UI-design authority  
**Design goal:** premium operational SaaS, easy to grade, realistic to implement inside the deadline  
**Reference board:** existing StockFlow homepage/login/dashboard/inventory/analytics/PO collage is directional inspiration only.

---

# 1. Design principles

1. Business context is always visible.
2. Active role is always visible.
3. Dashboard metrics lead to actions.
4. Critical stock consequences are previewed before confirmation.
5. Private vs Connected partner state is obvious.
6. Errors are prevented inline where possible.
7. Tables are readable, filterable and not overloaded.
8. Role-aware UI does not pretend to be security.
9. Release D features do not clutter Release A/B navigation.
10. Desktop first, but login/receiving/product/PO flows are mobile-safe.

---

# 2. Final route strategy

## Public

```text
/
 /login
 /signup
 /b/:handle
 /invite/:token
```

## Authenticated

```text
/app/:handle/dashboard

/app/:handle/inventory/products
/app/:handle/inventory/products/new
/app/:handle/inventory/products/:productId
/app/:handle/inventory/products/:productId/edit
/app/:handle/inventory/categories
/app/:handle/inventory/warehouses
/app/:handle/inventory/movements

/app/:handle/procurement/suppliers
/app/:handle/procurement/buyers
/app/:handle/procurement/purchase-orders
/app/:handle/procurement/purchase-orders/new
/app/:handle/procurement/purchase-orders/:poId
/app/:handle/procurement/receiving

/app/:handle/network/connections
/app/:handle/network/connections/:connectionId
/app/:handle/network/mappings
/app/:handle/network/partner-catalog

/app/:handle/reports
/app/:handle/notifications
/app/:handle/team
/app/:handle/settings

/store/:handle  # C only
```

Handle is context/lookup only. Authorization resolves immutable organizationId.

---

# 3. Main navigation

Recommended sidebar:

```text
Dashboard

INVENTORY
  Products
  Warehouses
  Stock Movements

PROCUREMENT
  Purchase Orders
  Receiving
  Suppliers
  Buyers

NETWORK
  Connected Businesses
  Product Mappings
  Partner Catalog

Reports

Notifications
Team
Settings
```

Categories may be managed from Products or a secondary Inventory submenu.

**Do not promote `Sales & Storefronts` to primary A/B navigation.**
Storefront is C optional.

---

# 4. Role-aware navigation

## Owner/Admin
Dashboard, Inventory, Procurement, Network, Reports, Notifications, Team, Settings.

## Inventory Manager
Dashboard, Products, Warehouses, Stock Movements, Receiving, Reports, Notifications.

## Procurement Manager
Dashboard, Purchase Orders, Receiving, Suppliers, Buyers, Connected Businesses, Product Mappings, Partner Catalog, Reports, Notifications.

## Storekeeper
Dashboard, Inventory lookup, Receiving, Stock Movements, Notifications.

## Analyst
Dashboard, Reports, read-only inventory/PO history if permitted.

## Viewer
Dashboard, read-only Products/Stock, selected Reports.

---

# 5. Screen inventory

| Priority | Screen | Release | Must design | Must implement | Demo |
|---|---|---|:---:|:---:|:---:|
| P0 | Public Home | A | ✓ | ✓ | ✓ |
| P0 | Signup / Global Login | A | ✓ | ✓ | ✓ |
| P0 | Branded Business Login | A | ✓ | ✓ | ✓ |
| P0 | Invitation Accept | A | ✓ | ✓ | maybe |
| P0 | Business Onboarding | A | ✓ | ✓ | ✓ |
| P0 | Empty Dashboard | A | ✓ | ✓ | no |
| P0 | Populated Dashboard | A | ✓ | ✓ | ✓ |
| P0 | Product List | A | ✓ | ✓ | ✓ |
| P0 | Product Create/Edit | A | ✓ | ✓ | ✓ |
| P0 | Product Detail | A | ✓ | ✓ | ✓ |
| P0 | Category Management | A | ✓ | ✓ | no |
| P0 | Warehouse Management | A | ✓ | ✓ | ✓ |
| P0 | Stock Adjustment | A | ✓ | ✓ | ✓ |
| P0 | Stock Movement History | A | ✓ | ✓ | ✓ |
| P0 | Private Suppliers | A | ✓ | ✓ | ✓ |
| P0 | Private Buyers | A | ✓ | ✓ | optional |
| P0 | PO List | A | ✓ | ✓ | ✓ |
| P0 | Private PO Create | A | ✓ | ✓ | ✓ |
| P0 | PO Detail | A | ✓ | ✓ | ✓ |
| P0 | Receiving | A | ✓ | ✓ | ✓ |
| P0 | Reports | A | ✓ | ✓ | ✓ |
| P0 | Team | A | ✓ | ✓ | ✓ |
| P0 | Settings | A | ✓ | ✓ | no |
| P1 | Connected Businesses | B | ✓ | ✓ | ✓ |
| P1 | Connection Detail | B | ✓ | ✓ | maybe |
| P1 | Partner Catalog | B | ✓ | ✓ | ✓ |
| P1 | Product Mapping | B | ✓ | ✓ | ✓ |
| P1 | Connected PO buyer view | B | ✓ | ✓ | ✓ |
| P1 | Connected PO supplier view | B | ✓ | ✓ | ✓ |
| P1 | Notifications | B | ✓ | ✓ | maybe |
| P2 | Public Storefront Catalog | C | optional | optional | optional |

---

# 6. Application shell

Header:
- StockFlow mark;
- business logo/monogram;
- business name;
- active role;
- workspace switcher if relevant;
- notifications;
- user menu;
- global search only if implemented meaningfully.

Sidebar:
- collapsible;
- section labels;
- active route;
- role-aware items.

Wrong-workspace prevention:
- business identity must be prominent, not a tiny footer-only label.

---

# 7. Public homepage

Recommended sections:

1. Header / brand / Login / Create Workspace.
2. Hero:
   - one inventory;
   - better procurement;
   - connected suppliers.
3. KPI/dashboard visual.
4. Problem → Solution.
5. Core feature cards:
   - Inventory Control;
   - Procurement;
   - Connected Business Collaboration;
   - Analytics.
6. How Connected Supplier mapping works.
7. Industries:
   - Hospitality;
   - Retail;
   - Food & Beverage;
   - Warehouse;
   - Pharmacy;
   - Hardware.
8. Security / tenant isolation.
9. CTA.

Do not advertise unbuilt AI/marketplace/checkout as current features.

---

# 8. Branded login

Route:
`/b/grand-ocean`

```text
[Grand Ocean logo/monogram]

Grand Ocean Inventory

Email
Role
Password

[Sign In]

or
[Continue with Google]

Forgot password?
```

Required states:

1. loading org identity;
2. handle not found;
3. normal login;
4. auth failure;
5. no membership after auth;
6. selected role denied after auth;
7. valid-role fallback;
8. suspended account.

Role dropdown never reveals assigned roles before auth unless user already authenticated.

---

# 9. Onboarding

Suggested compact steps:

### Step 1 — Business
- name;
- handle;
- industry;
- logo optional.

### Step 2 — Locale
- country;
- currency;
- timezone.

### Step 3 — First location
- warehouse/location name;
- type.

### Step 4 — Finish
Open setup dashboard.

Handle field:
- normalization preview;
- availability;
- immutable warning.

---

# 10. Dashboard

## KPI row
- Inventory Value
- SKU Count
- Low Stock
- Open Purchase Orders
- Awaiting Receipt

## Needs Attention
Examples:
- 7 low-stock items;
- 2 POs awaiting receipt;
- 1 supplier connection request;
- 1 connected PO awaiting supplier response.

## Operational panels
- Recent Activity
- Low Stock list
- Recent Purchase Orders
- Inventory by Location
- one useful trend chart if time

Every card with operational meaning should link to action.

---

# 11. Product List

Columns:
- Product
- SKU
- Category
- On Hand
- Unit
- Stock Status
- Preferred Supplier
- Updated
- Actions

Filters:
- search;
- category;
- stock status;
- warehouse if useful;
- archived toggle.

Actions:
- View
- Edit
- Adjust Stock
- Archive

---

# 12. Product Detail

Tabs:

### Overview
Identity, category, unit, pricing, threshold, status.

### Stock
ProductStockSummary, per-warehouse balances, recent movements.

### Suppliers
Private supplier references + connected mappings if B.

### Buyers
Relevant connected buyer mappings.

### Activity
Required audit/history.

### Storefront
Only if C built.

---

# 13. Stock Adjustment

```text
Chicken Breast / MEAT-001
Cold Room

Current: 18 KG

Direction: Increase
Quantity: 2 KG
Reason: Recount correction

Result: 20 KG

[Confirm Adjustment]
```

Required:
- zero invalid;
- negative-result invalid;
- submitting state;
- success with movement reference;
- duplicate safe response.

---

# 14. Suppliers / Buyers

Supplier tabs:
- Private
- Connected
- Pending

Private supplier detail:
- contacts;
- status;
- open POs;
- history.

Connected:
- business identity;
- handle;
- status;
- mapped item count;
- connected POs.

Do not make Private look like a broken fallback.

---

# 15. Connected business discovery

Release B search:

```text
Find a StockFlow business

@ [ freshfoods ]

[Find business]
```

Result:
- logo/monogram;
- Fresh Foods Ltd;
- @freshfoods;
- industry/country;
- `Connect as Supplier`.

No marketplace/fuzzy search is required.

---

# 16. Partner Catalog

Supplier publish table:

- Internal Product
- Internal SKU
- Partner SKU
- Order Unit
- Availability
- Published
- Action

Publishing dialog clearly states:
> Connected buyers can see the partner fields below, not your private inventory data.

---

# 17. Product Mapping — signature UX

### Step 1 — Supplier
Choose ACTIVE connected supplier.

### Step 2 — Supplier SKU
Enter exact partner SKU.

Searching:
`Checking Fresh Foods Partner Catalog…`

### Valid result

```text
✓ Partner item found

Fresh Chicken Breast 5 KG Pack
SKU: CKN-B5
Order unit: PACK

Your product
Chicken Breast
MEAT-001
KG
```

### Step 3 — Semantic confirmation
> Confirm these are the same real-world item.

### Step 4 — Unit conversion

```text
1 PACK = [5] KG

Preview:
10 PACK = 50 KG
```

### Step 5
Create Verified Mapping.

Error states:
- no active connection;
- SKU not found;
- unpublished item;
- wrong semantic match;
- invalid factor;
- stale connection on submit;
- duplicate mapping.

Save disabled until all conditions pass.

---

# 18. Purchase Orders

## Private supplier

Flow:
1. Supplier
2. Items
3. Delivery/Notes
4. Review
5. Mark Ordered

Statuses:
Draft, Ordered, Partially Received, Received, Cancelled.

Do not show in-platform Supplier Accepted.

## Connected supplier

Flow:
1. Connected Supplier
2. Mapped Items
3. Review
4. Submit
5. Supplier Response
6. Shipped
7. Receiving

Show both product representations:

```text
Your item:
Chicken Breast / MEAT-001 / KG

Supplier item:
Fresh Chicken Breast / CKN-B5 / PACK

10 PACK = 50 KG
```

Timeline clearly attributes actors:
- submitted by buyer;
- accepted by supplier;
- shipped by supplier;
- received by buyer.

---

# 19. Receiving

Storekeeper optimized:

```text
PO SF-1024
Fresh Foods

Chicken Breast
Ordered: 10 PACK / 50 KG
Already received: 0
Receive now: [8] PACK
Converted: 40 KG

Warehouse: Cold Room

Current stock: 18 KG
After receipt: 58 KG

Outstanding after:
2 PACK / 10 KG

[Confirm Receipt]
```

Do not silently assume full receipt.

---

# 20. Reports

### Stock on Hand
- Product
- Warehouse
- On Hand
- Unit
- Status
- Value where available

### Purchase Orders
- PO
- Supplier
- Private/Connected
- Status
- Total
- Created
- Expected

Possible charts:
- inventory trend;
- supplier spend;
- top-moving items;
- PO status.

Charts never override accurate tables.

---

# 21. Team

Columns:
- name/email;
- role;
- status;
- joined/invited;
- actions.

Actions:
- Invite
- Change Role
- Suspend
- Remove

Owner row protected.

Invitation:
- generate/copy invite link;
- optional send-email only if infrastructure exists.

---

# 22. Empty/loading/error/success states

Every P0/P1 screen defines:

- loading;
- empty;
- error;
- success;
- permission denied.

Examples:

No products:
> Add your first product to start tracking inventory.

No connections:
> Connect a StockFlow supplier to validate product codes and exchange purchase orders.

No low stock:
> All tracked products are above their minimum level.

---

# 23. Destructive confirmations

Use for:
- Archive Product;
- Archive Warehouse;
- Cancel PO;
- Disable Connection;
- Remove/Suspend Member;
- large stock reduction.

Avoid confirmation fatigue for normal saves.

---

# 24. Mobile priorities

Must be intentionally responsive:
1. login;
2. dashboard;
3. Product list/detail;
4. Stock Adjustment;
5. PO detail;
6. Receiving.

Receiving:
- large inputs;
- conversion/result visible;
- sticky confirm;
- no forced horizontal scrolling for core action.

---

# 25. Accessibility

- explicit labels;
- keyboard focus;
- semantic headings;
- text/icon in addition to color;
- associated validation errors;
- sufficient contrast;
- action-specific buttons;
- table headers;
- touch target sizing;
- chart text summary.

---

# 26. Visual direction

Keep strengths of existing UI board:
- light SaaS;
- modern blue;
- restrained status colors;
- soft cards;
- clean tables;
- KPI hierarchy.

Improve:
1. remove Sales & Storefronts from A/B primary nav;
2. make Network only when B enabled;
3. separate private vs connected PO;
4. show mapping states precisely;
5. strengthen business/role context;
6. prioritize actions over decorative charts.

---

# 27. UI handoff acceptance

A screen is design-complete only when it specifies:
- route;
- role access;
- purpose;
- primary action;
- data;
- loading;
- empty;
- error;
- success;
- denied behavior;
- confirmation;
- mobile;
- acceptance scenario.

---

# 28. UI freeze statement

> Release A must visually feel complete; Release B must feel like one strong differentiating workflow. The UI must not imply that Release D functionality has already been built.
