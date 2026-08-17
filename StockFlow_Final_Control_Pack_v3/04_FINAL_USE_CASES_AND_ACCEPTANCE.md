# StockFlow — Final Use Cases & Acceptance v3.0

**Purpose:** the canonical story-level acceptance contract.
**Rule:** if a workflow is not represented here or in `02`, it is not an implementation assumption.
**Change from v2:** all scenarios now chain from **one canonical seed** with arithmetic that reconciles end to end (see `16` §7). v2's SC-16 assumed a starting balance that earlier scenarios had already changed — that inconsistency would have made the demo and the dashboard disagree.

---

# 1. Actor glossary

| Actor | Core responsibility |
|---|---|
| Visitor | Explore StockFlow and authenticate |
| Owner | Create the business, manage the organization and team, broad access |
| Admin | Operate the organization and staff, excluding control of the canonical Owner |
| Inventory Manager | Product, warehouse and stock accuracy |
| Procurement Manager | Suppliers, buyers, purchase orders, connections and mappings |
| Storekeeper | Goods receiving and stock handling. **Cannot adjust stock.** |
| Analyst | Reporting and analytics, read-only |
| Viewer | Limited read-only: dashboard, products, stock, Stock-on-Hand report |
| Private Supplier | An external supplier with no StockFlow account |
| Private Buyer | An external customer with no StockFlow account; a directory entry only in Release A |
| Connected Supplier | Another StockFlow organization connected as a supplier |
| Connected Buyer | Another StockFlow organization connected as a buyer |

---

# 2. Use-case catalog

| ID | Use case | Actor | Release |
|---|---|---|---|
| UC-01 | Explore the public site | Visitor | A |
| UC-02 | Register or sign in globally | Visitor / User | A |
| UC-03 | Create a business | Owner | A |
| UC-04 | Use branded role-context login | User | A |
| UC-05 | Invite staff | Owner / Admin | A |
| UC-06 | Accept a staff invitation | User | A |
| UC-07 | Manage products, categories and warehouses | Inventory Manager | A |
| UC-08 | Record an opening balance | Inventory Manager | A |
| UC-09 | Adjust stock | Inventory Manager | A |
| UC-10 | Manage private suppliers and buyers | Procurement Manager | A |
| UC-11 | Create and order a private purchase order | Procurement Manager | A |
| UC-12 | Receive a private purchase order | Storekeeper | A |
| UC-13 | View the dashboard and reports | Authorised roles | A |
| UC-14 | Be denied a wrong-role action | Any | A |
| UC-15 | Be denied cross-tenant access | Authenticated user | A |
| UC-16 | Connect to a supplier by handle | Procurement Manager | B |
| UC-17 | Publish a partner catalog item | Supplier Procurement Manager / Admin | B |
| UC-18 | Validate and map a supplier item | Buyer Procurement Manager | B |
| UC-19 | Create and submit a connected purchase order | Buyer Procurement Manager | B |
| UC-20 | Accept, reject or ship a connected purchase order | Supplier | B |
| UC-21 | Partially or fully receive a connected purchase order | Buyer Storekeeper | B |
| UC-22 | View the public storefront catalog | Public visitor | C |
| UC-23 | **(new)** Switch between multiple workspaces | Multi-organization user | A |
| UC-24 | **(new)** Review notifications and mark them read | Any member | A |
| UC-25 | **(new)** Retry a failed command safely | Any actor | A |

---

# 3. Acceptance scenarios

> **Chaining rule.** SC-04, SC-06, SC-08/09 and SC-14/16 run in sequence against the canonical seed and must produce the balances in `16` §7.4. Every other scenario is independent and states its own preconditions.

---

## SC-01 — A new user creates Grand Ocean Hotel

**Preconditions:** no StockFlow identity; the handle `grand-ocean` is available.
**Actor:** Visitor → Owner.

**Steps**
1. Open the public site.
2. Choose Create Workspace.
3. Sign up with Google or email/password.
4. Enter "Grand Ocean Hotel".
5. Enter the handle `grand-ocean` and observe live normalisation and availability.
6. Select Hospitality, Sri Lanka, LKR, Asia/Colombo.
7. Create the first warehouse "Main Store".
8. Finish.

**Expected UI:** a setup-checklist dashboard; the business name and monogram in the header; the Owner role badge; the URL `/app/grand-ocean/dashboard`.

**Expected data, all written in one transaction:** Firebase user · `handleReservations/grand-ocean` · `organizations/{orgId}` · `organizationDirectory/grand-ocean` · `settings/main` · Owner `members/{uid}` · `users/{uid}/memberships/{orgId}` · warehouse "Main Store" · audit record.

**Failure behaviour**
- A duplicate handle is rejected atomically with `already-exists / HANDLE_TAKEN`; no partial organization is left behind.
- An invalid or reserved handle (`app`, `store`, `b`, two characters, trailing hyphen) is blocked before submission.
- `FreshFoods` and `freshfoods` cannot both exist.

**Pass:** logging out and back in returns the Owner to the same workspace. Two simultaneous creations of the same handle produce exactly one organization and one clean error.

---

## SC-02 — Branded login validates the requested role

**Preconditions:** Nimal is an Inventory Manager at Grand Ocean, not the Owner.

**Steps**
1. Open `/b/grand-ocean` — the branded identity loads from the public directory before authentication.
2. Change the role selector from "Detect automatically" to Owner.
3. Enter correct credentials and authenticate.

**Expected**
- Identity succeeds.
- Membership is loaded from Firestore.
- The Owner context is rejected with a clear explanation.
- The user's actual role is offered as a next step.
- No Owner-only action, route or data becomes available at any point.

**Pass:** changing the role in the form, the URL or local storage never changes authorization. Repeating the attempt with a modified client produces the same denial.

---

## SC-03 — Owner invites a Storekeeper without any email provider

**Steps**
1. The Owner opens Team.
2. Enters `storekeeper@example.com`.
3. Selects STOREKEEPER.
4. Creates the invitation.
5. Copies the secure invite link shown once in the dialog.
6. The invitee opens the link and authenticates with the matching email.
7. Accepts.

**Expected:** the invitation moves PENDING → ACCEPTED; a membership is created ACTIVE; the user's membership mirror is written; an audit record is created.

**Failure behaviour**
- Authenticated email does not match → rejected with `INVITE_EMAIL_MISMATCH`.
- Token older than 7 days → `INVITE_EXPIRED`.
- Token already used or revoked → `INVITE_NOT_PENDING`.
- Unknown token → `not-found`.
- Accepting twice as an already-active member → succeeds idempotently, no duplicate membership.

**Pass:** the Storekeeper can use Receiving, cannot manage the Team, and **cannot adjust stock**.

---

## SC-04 — Inventory setup with an opening balance

**Preconditions:** Grand Ocean exists with warehouses Main Store and Cold Room.

**Create:** category Meat · product Chicken Breast · SKU `MEAT-001` · unit KG · minimum 20 · reorder target 50 · purchase cost LKR 1,250.00 · opening stock **18 KG** into Cold Room.

**Expected backend, in one transaction:** role and membership verified · product and warehouse validated · `OPENING_BALANCE` movement of +18 · `StockBalance` 18 · `ProductStockSummary` 18 with `stockValueMinor` = 22,500.00 · audit record · command receipt.

**Expected UI:** the product shows **LOW STOCK**, because 18 < 20.

**Pass:** the movement history explains all 18 KG with a single, server-timestamped, actor-attributed entry.

---

## SC-05 — Product CRUD remains historically safe

**Steps:** create → view → update → archive.

**Expected**
- The archived product is hidden from active lists by default and visible under the archived filter.
- Historical movements and purchase-order snapshots remain intact and visible.
- The archived product cannot be selected for a new PO or a new mapping.
- Archiving writes an audit record.

**Failure behaviour:** a client attempt to hard-delete any product is denied by Security Rules. A duplicate `internalSku` is rejected, including when two creates are issued simultaneously.

---

## SC-06 — Stock adjustment is atomic and idempotent

**Precondition:** Chicken Breast is at 18 KG (from SC-04).

**Steps:** increase by 2 KG · reason "Recount correction" · `operationId` `OP-A`.

**Expected atomic result:** `ADJUSTMENT_IN` +2 · `StockBalance` 20 · `ProductStockSummary` 20 with status changing LOW_STOCK → IN_STOCK · inventory value 566,700.00 · audit record · command receipt `OP-A`.

**Retry with `OP-A` and the identical payload:** the stored result is returned; no second movement; stock stays 20.
**Retry with `OP-A` and a *different* quantity:** rejected with `OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD`.

**Concurrency:** N simultaneous +1 KG adjustments with distinct operation ids produce exactly +N, with no lost update.

**Pass:** stock is 20, not 22, and the dashboard low-stock count has fallen from 4 to 3.

---

## SC-07 — Warehouse archive protection

**Precondition:** Cold Room holds more than zero stock.

**Attempt to archive:** blocked, with a message directing the user to move or reduce the stock to zero.
**Also blocked** while an open receiving workflow targets that warehouse.
**Race safety:** the check runs as a bounded query inside the archive transaction, so stock added concurrently cannot slip past it.
**After both preconditions clear:** archive succeeds and writes an audit record.

**Also:** a client attempting to set `status: 'ARCHIVED'` directly through Security Rules is denied — archive is a backend command only.

---

## SC-08 — Private supplier procurement

**Actor:** Procurement Manager.

**Steps**
1. Add the private supplier "Green Farm".
2. Create a DRAFT purchase order.
3. Add Chicken Breast, 50 KG, at LKR 1,200.00/KG.
4. Mark it ORDERED once the order has actually been placed with the supplier externally.

**Expected:** an order number is allocated from the organization counter inside the transaction; every line snapshots name, SKU, unit, quantity and price; history and audit records are written. **No in-platform supplier acceptance is shown or implied.**

**Failure behaviour:** no lines · zero or negative quantity · archived product · deactivated supplier — each rejected with a distinct reason.

**Pass:** renaming the product afterwards leaves the purchase order display unchanged.

---

## SC-09 — Partial then full private receiving

**Precondition:** the SC-08 order for 50 KG is ORDERED. Chicken Breast is at 20 KG.

**First receipt:** 40 KG into Cold Room.
Expected — `PURCHASE_RECEIPT` +40 · line received 40 · PO status PARTIALLY_RECEIVED · balance **60 KG** · inventory value 616,700.00 · `receivingWarehouseId` recorded.

**Second receipt:** 10 KG.
Expected — a second movement · PO status RECEIVED · balance **70 KG** · inventory value 629,200.00.

**Rejections:** receiving 11 KG when 10 are outstanding → `OVER_RECEIPT`. Cancelling the PO after any receipt → `INVALID_TRANSITION`. Replaying a receipt with the same `operationId` → no additional stock.

---

## SC-10 — Tenant isolation attack

A Grand Ocean user attempts direct client reads and writes against Fresh Foods' private Product, StockBalance, StockMovement, ProductStockSummary, AuditLog, Membership, PrivatePartner and Settings — by document id, by query, and through a forged `orgId` in a callable payload.

**Expected:** every attempt is denied. No private payload is returned. The callable denies the forged organization id after reading the authoritative membership. Attempting to read any cross-tenant canonical collection (`connections`, `connectedPurchaseOrders`, `handleReservations`) is denied for every role in every organization. Reading an invented collection path is denied by the catch-all rule.

---

## SC-11 — Connect Grand Ocean to Fresh Foods

**Steps**
1. Enter the handle `freshfoods` in business discovery.
2. Read the public directory result — name, monogram, industry, country only.
3. Verify the business card.
4. Send "Connect as Supplier".
5. Fresh Foods accepts.

**Expected:** a directional connection `grand-ocean-org__fresh-foods-org` with buyer Grand Ocean, supplier Fresh Foods, status ACTIVE; a projection inside each organization; an audit record in each; a notification to the supplier's Owner and Admins on request and to the requester on response.

**Failure behaviour:** a duplicate directional request while one is PENDING or ACTIVE cannot create a second document. Connecting an organization to itself is rejected. Listing the whole public directory is denied.

---

## SC-12 — Supplier publishes a partner catalog item

Fresh Foods publishes: "Fresh Chicken Breast 5 KG Pack" · partner SKU `CKN-B5` · order unit PACK (equal to the supplier product's base unit) · pack description "5 KG" · availability state.

Grand Ocean, with an ACTIVE connection, can read this projection **through the authorized callable**.

Grand Ocean **cannot** read, by any route: Fresh Foods' exact stock quantities · internal cost or margin · warehouses · members · private partners · settings · audit logs · any private product document.

**Pass:** the buyer's view and the supplier's private product screen, placed side by side, show visibly different data sets.

---

## SC-13 — Product mapping validates an exact supplier code

**Buyer context:** Chicken Breast · `MEAT-001` · base unit KG.

**Steps**
1. Select Fresh Foods as the connected supplier.
2. Enter `CKN-B5`.
3. The system queries the partner catalog server-side.
4. The matched supplier item is displayed beside the buyer's product.
5. The user explicitly confirms they are the same real-world item.
6. The user enters `1 PACK = 5 KG` and sees the worked preview `10 PACK = 50 KG`.
7. The backend re-validates connection, catalog publication and product status.
8. A VERIFIED mapping is created, storing stable ids plus a SKU snapshot.

**Failure behaviour**
- `CKN-X9` → no result, Save disabled, clear message.
- An existing but unpublished item → "not currently published to you".
- A valid but semantically wrong item → the user declines confirmation and no mapping is created.
- Factor of zero or negative → rejected inline.
- The connection is disabled between page load and submit → the backend rejects the stale request.
- A duplicate VERIFIED mapping for the same pair → rejected.

---

## SC-14 — A connected purchase order snapshots the mapping

**Precondition:** the mapping is VERIFIED. Chicken Breast is at 70 KG (from SC-09) and the reorder target is 50.

**Steps**
1. Create a connected DRAFT purchase order — visible only inside Grand Ocean.
2. Order 10 PACK, converted and displayed as 50 KG.
3. Submit.

**Expected snapshot on each line:** buyer product id, name, SKU and base unit · supplier catalog item id, name, partner SKU and order unit · conversion factor · supplier order quantity · buyer-base-equivalent quantity · agreed unit price and currency.

**Expected data:** the canonical shared record plus a projection in each organization, all written in one transaction; history rows on all three; audit records in both organizations; a notification to Fresh Foods.

**Pass:** later edits to the product, the mapping or the catalog item do not alter the submitted purchase order.

---

## SC-15 — Supplier accepts and ships

Fresh Foods opens the shared order, ACCEPTS, then SHIPS with an `operationId`.

**Expected:** status SHIPPED · a `CONNECTED_DISPATCH_OUT` movement in Fresh Foods for 10 PACK, reducing 200 → **190 PACK** · **Grand Ocean stock unchanged at 70 KG** · history and audit in both organizations · a notification to the buyer.

**Replay with the same `operationId`:** no second outbound movement.

**Denials:** a Grand Ocean user attempting to accept or ship on Fresh Foods' behalf is denied. A third organization cannot read the order at all.

---

## SC-16 — Buyer receives partially then fully

**Precondition:** the shipment is 10 PACK = 50 KG. Grand Ocean's Chicken Breast is at **70 KG** (from SC-09).

**First receipt:** 8 PACK.
Expected — converted to 40 KG · buyer `PURCHASE_RECEIPT` +40 · balance **70 → 110 KG** · inventory value 679,200.00 · status PARTIALLY_RECEIVED · outstanding 2 PACK.

**Second receipt:** 2 PACK.
Expected — +10 KG · balance **120 KG** · inventory value 691,700.00 · status RECEIVED.

**Invariants:** the supplier's outbound movement is never modified by a buyer receipt. Receiving 3 PACK when 2 are outstanding is rejected. Replay creates no additional stock.

**Pass:** Chicken Breast's movement history contains exactly six entries summing to 120 KG.

---

## SC-17 — Connection disabled after history exists

Disable the connection after a completed connected purchase order.

**Expected:** new mappings blocked · new connected purchase orders blocked · historical purchase orders and mappings still readable by the legitimate parties · all past stock movements unchanged · both organization projections updated to DISABLED · audit records written in both.

---

## SC-18 — The dashboard is explainable

Every KPI must trace to operational data. No number exists because someone typed it into a KPI document.

Against the canonical seed, before any demo action, the dashboard must read exactly: **12 active SKUs · 4 low stock · 1 out of stock · 0 open POs · 0 awaiting receipt · inventory value LKR 564,200.00** (`16` §7.2).

After the full demo chain it must read: **inventory value LKR 691,700.00** with Chicken Breast at 120 KG.

Changing a product's purchase cost must move the inventory value in the same transaction.

**Pass:** the student can point at any figure and name the query that produced it.

---

## SC-19 — Optional public storefront catalog

**Release C only; default not built.**

Public fields: display name · public SKU · description · image or placeholder · selling price · category name · coarse availability.

The payload must exclude purchase cost, margin, supplier identity, exact warehouse, private stock history, internal thresholds and exact quantities. There is no write path of any kind.

---

## SC-20 — **(new)** Multi-workspace switching

**Precondition:** one identity is an ACTIVE member of Grand Ocean and Fresh Foods.

**Steps:** sign in → the workspace selector lists both, with monograms and roles → choose Fresh Foods → the app shell shows Fresh Foods and the correct role → switch back.

**Expected:** membership is re-validated on every switch; no cached data from the previous organization is visible; the URL handle changes; the sidebar reflects the role in the *new* organization.

**Failure behaviour:** if membership in the target organization has been suspended since the list was rendered, the switch is denied and the list refreshes.

---

## SC-21 — **(new)** Notifications

**Steps:** a stock adjustment pushes Butter Block below its minimum → the Inventory Manager sees the unread count increase → opens Notifications → reads the item → marks it read.

**Expected:** exactly **one** notification for the transition into LOW_STOCK, not one per subsequent write. The recipient can update only the `read` flag; any other field change is denied by rules. Notifications are per-user and never visible to another user.

---

## SC-22 — **(new)** Safe retry after a network failure

**Steps:** open the Receive Goods form (an `operationId` is generated now) → submit → the network drops after the server commits but before the response arrives → the user presses Confirm again.

**Expected:** the second call carries the same `operationId`, the receipt is found inside the transaction, the stored result is returned, and no additional stock is created. The UI shows success, not an error.

**Pass:** stock, the purchase order's received quantity and the audit trail are all correct exactly once.

---

# 4. Canonical demonstration flow

The order used for the recorded demo and for the final regression. Numbers match `16` §7.4.

1. Public home page.
2. Branded Grand Ocean login.
3. Role-context validation as Nimal (Inventory Manager who requested Owner).
4. Dashboard — 12 SKUs, 4 low, LKR 564,200.
5. Product CRUD: create, read, update, archive.
6. Chicken Breast at 18 KG, flagged low.
7. Adjustment +2 KG → 20 KG; movement history.
8. Private supplier → purchase order 50 KG → receive 40 → receive 10 → 70 KG.
9. Role denial as Storekeeper via a direct URL.
10. Tenant-isolation evidence.
11. Connect to Fresh Foods by handle.
12. Fresh Foods publishes `CKN-B5`.
13. Validate `CKN-B5`; show the invalid case first.
14. Map 1 PACK = 5 KG.
15. Create and submit a connected purchase order for 10 PACK.
16. Switch to Fresh Foods; accept; ship — Fresh Foods 200 → 190 PACK, Grand Ocean unchanged.
17. Switch to Grand Ocean as Storekeeper.
18. Receive 8 PACK → 110 KG, then 2 PACK → 120 KG.
19. Final stock and full movement history — six movements, summing to 120.
20. Reports and the final dashboard — LKR 691,700.
21. Test suite run.
22. Public GitHub repository, signed out.

---

# 5. Acceptance philosophy

A scenario passes only when **all** of the following hold:

- the UI state is correct;
- the persisted data is correct;
- unauthorised paths are denied at the server, not merely hidden in the UI;
- a duplicate retry is safe;
- audit and history are correct where required;
- a refresh or re-login preserves the result;
- **no manual database edit was needed to make it pass.**

A scenario that requires a Firestore console correction to demonstrate has failed, regardless of what the screen shows.
