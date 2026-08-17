# StockFlow — Final Use Cases & Acceptance v2.0

**Purpose:** Canonical story-level acceptance contract.  
**Rule:** If a workflow is not represented here or in the requirements, it is not an implementation assumption.

---

# 1. Actor glossary

| Actor | Core responsibility |
|---|---|
| Visitor | Explore StockFlow and authenticate |
| Owner | Create business, manage organization/team, broad access |
| Admin | Operate organization and staff, excluding canonical Owner control |
| Inventory Manager | Product, warehouse and stock accuracy |
| Procurement Manager | Suppliers, buyers, POs, connections and mappings |
| Storekeeper | Goods receiving and stock handling |
| Analyst | Reporting/analytics only |
| Viewer | Limited read-only |
| Private Supplier | External supplier without StockFlow account |
| Connected Supplier | Another StockFlow Organization connected as supplier |
| Connected Buyer | Another StockFlow Organization connected as buyer |

---

# 2. Use-case catalog

| ID | Use case | Actor | Release |
|---|---|---|---|
| UC-01 | Explore public site | Visitor | A |
| UC-02 | Register/login globally | Visitor/User | A |
| UC-03 | Create business | Owner | A |
| UC-04 | Use branded role-context login | User | A |
| UC-05 | Invite staff | Owner/Admin | A |
| UC-06 | Accept staff invitation | User | A |
| UC-07 | Manage product/category/warehouse | Inventory Manager | A |
| UC-08 | Record opening balance | Inventory Manager | A |
| UC-09 | Adjust stock | Inventory Manager | A |
| UC-10 | Manage private supplier/buyer | Procurement Manager | A |
| UC-11 | Create/order private PO | Procurement Manager | A |
| UC-12 | Receive private PO | Storekeeper | A |
| UC-13 | View dashboard/reports | Authorized roles | A |
| UC-14 | Deny wrong-role action | Any | A |
| UC-15 | Deny cross-tenant access | Authenticated user | A |
| UC-16 | Connect to supplier by handle | Procurement Manager | B |
| UC-17 | Publish partner item | Supplier Proc. Manager/Admin | B |
| UC-18 | Validate/map supplier item | Buyer Proc. Manager | B |
| UC-19 | Create connected PO | Buyer Proc. Manager | B |
| UC-20 | Accept/reject/ship connected PO | Supplier | B |
| UC-21 | Partially/fully receive connected PO | Buyer Storekeeper | B |
| UC-22 | View Storefront Catalog | Public visitor | C |

---

# 3. Acceptance scenarios

## SC-01 — New user creates Grand Ocean Hotel

**Preconditions**
- no StockFlow identity;
- `grand-ocean` available.

**Actor**
Visitor → Owner.

**Steps**
1. Open public site.
2. Create Workspace.
3. Sign up with Google or email/password.
4. Enter Grand Ocean Hotel.
5. Enter handle `grand-ocean`.
6. Select Hospitality, country, LKR, timezone.
7. Create first warehouse `Main Store`.
8. Finish.

**Expected UI**
- setup checklist dashboard;
- business name visible;
- Owner visible;
- `/app/grand-ocean/dashboard`.

**Expected data**
- Firebase User;
- Organization;
- OrganizationDirectoryEntry;
- Owner Membership;
- OrganizationSettings;
- Warehouse.

**Failure**
- duplicate handle rejected atomically;
- invalid handle blocked;
- failure does not leave ambiguous duplicate handle.

**Pass**
Logout/re-login returns Owner to the same workspace.

---

## SC-02 — Branded login validates role

**Preconditions**
Nimal is Inventory Manager at Grand Ocean, not Owner.

**Steps**
1. Open `/b/grand-ocean`.
2. Select Owner.
3. Enter correct credentials.
4. Authenticate.

**Expected**
- identity succeeds;
- Membership loaded;
- Owner context rejected;
- valid role may be offered;
- no Owner-only action/data becomes available.

**Pass**
Changing role form/URL/local state never changes authorization.

---

## SC-03 — Owner invites Storekeeper without email-provider dependency

**Steps**
1. Owner opens Team.
2. Enter `storekeeper@example.com`.
3. Select STOREKEEPER.
4. Create invitation.
5. Copy/open secure invite link.
6. Invitee authenticates with matching email.
7. Accept.

**Expected**
Invitation PENDING→ACCEPTED and Membership ACTIVE.

**Failure**
Authenticated email does not match → reject.

**Pass**
Storekeeper can use Receiving and cannot manage Team/Owner settings.

---

## SC-04 — Inventory setup with opening balance

Create:
- Category Meat;
- Warehouse Cold Room;
- Product Chicken Breast;
- SKU `MEAT-001`;
- Unit KG;
- Minimum 20;
- Reorder 50;
- Opening stock 18 KG.

**Expected backend**
- role/product/warehouse validated;
- OPENING_BALANCE +18;
- StockBalance 18;
- ProductStockSummary 18;
- audit.

**Expected UI**
LOW STOCK because 18 < 20.

**Pass**
Movement history explains all 18 KG.

---

## SC-05 — Product CRUD remains historically safe

**Steps**
Create → view → update → archive.

**Expected**
- archived hidden from active lists by default;
- historical movements/PO snapshots remain visible;
- archived product blocked in new PO/mapping.

**Failure**
Hard delete of referenced product denied.

---

## SC-06 — Stock adjustment is atomic/idempotent

**Precondition**
Chicken Breast 18 KG.

**Steps**
- +2 KG;
- reason `Recount correction`;
- operationId `OP-A`.

**Expected atomic result**
- ADJUSTMENT_IN +2;
- StockBalance 20;
- ProductStockSummary 20;
- audit;
- CommandReceipt OP-A.

**Retry OP-A**
No second movement.

**Pass**
Stock remains 20, not 22.

---

## SC-07 — Warehouse archive protection

Cold Room has >0 stock.

Archive attempt:
- blocked;
- directs user to reduce/move stock to zero.

Also blocked if open receiving workflow targets the warehouse.

After both preconditions clear:
- archive succeeds.

---

## SC-08 — Private supplier procurement

**Actor**
Procurement Manager.

**Steps**
1. Add Private Supplier `Green Farm`.
2. Create DRAFT PO.
3. Add Chicken Breast 50 KG.
4. Mark ORDERED after external order is actually sent.

**Expected**
No fake in-platform supplier acceptance.

**Failures**
- no lines;
- zero/negative quantity;
- archived product;
- deactivated supplier.

---

## SC-09 — Partial then full private receiving

Private PO ordered 50 KG.

First receipt:
- 40 KG into Cold Room.

Expected:
- PURCHASE_RECEIPT +40;
- receivedQty 40;
- PARTIALLY_RECEIVED;
- stock summary +40.

Second:
- 10 KG;
- second movement;
- RECEIVED.

Receive 11 KG when 10 outstanding:
- rejected.

---

## SC-10 — Tenant isolation attack

Grand Ocean user attempts direct read/write against Fresh Foods private:
- Product;
- StockBalance;
- StockMovement;
- AuditLog;
- Membership.

Expected:
- denied;
- no private payload.

---

## SC-11 — Connect Grand Ocean to Fresh Foods

**Steps**
1. Enter `freshfoods`.
2. Read public directory result.
3. Verify business card.
4. Send `Connect as Supplier`.
5. Fresh Foods accepts.

**Expected**
Directional Connection:
- buyerOrgId Grand Ocean;
- supplierOrgId Fresh Foods;
- ACTIVE.

Duplicate directional active request:
- rejected/no duplicate.

---

## SC-12 — Supplier publishes Partner Catalog item

Fresh Foods publishes:

- Fresh Chicken Breast 5 KG Pack;
- Partner SKU `CKN-B5`;
- order unit PACK;
- pack description 5 KG;
- availability.

Grand Ocean with ACTIVE connection may read this projection.

Grand Ocean may not read:
- exact supplier stock;
- private cost;
- warehouse;
- employees;
- unrelated private data.

---

## SC-13 — Product mapping validates exact supplier code

Grand Ocean:
- Chicken Breast;
- MEAT-001;
- KG.

**Steps**
1. Select Fresh Foods.
2. Enter `CKN-B5`.
3. Query Partner Catalog.
4. Show matched product.
5. Ask user to confirm same real-world item.
6. Enter `1 PACK = 5 KG`.
7. Backend re-checks connection/catalog.
8. Create VERIFIED mapping.

Invalid `CKN-X9`:
- no result;
- Save disabled.

Wrong-but-valid item:
- user rejects semantic match;
- mapping not created.

---

## SC-14 — Connected PO snapshots mapping

**Precondition**
Mapping VERIFIED; Chicken Breast low.

**Steps**
1. Suggested order 50 KG.
2. Convert:
   `10 PACK × 5 KG/PACK = 50 KG`.
3. Create connected DRAFT.
4. Submit.

**Snapshot**
- buyer product ID/name/SKU/unit;
- supplier catalog ID/name/SKU/unit;
- conversion factor;
- supplier order qty;
- buyer-equivalent qty;
- agreed price/currency.

**Pass**
Later Product/Mapping changes do not rewrite PO history.

---

## SC-15 — Supplier accepts and ships

Fresh Foods:
1. opens shared PO;
2. ACCEPT;
3. SHIP with operationId.

**Expected**
- SHIPPED;
- Fresh Foods outbound movement;
- Grand Ocean stock unchanged;
- history;
- buyer notification.

Replay same operationId:
- no duplicate outbound movement.

---

## SC-16 — Grand Ocean partial/full connected receipt

Shipment:
10 PACK / 50 KG.

First receipt:
8 PACK → 40 KG.

Expected:
- buyer PURCHASE_RECEIPT +40;
- stock 18→58;
- PARTIALLY_RECEIVED;
- outstanding 2 PACK.

Second:
2 PACK → +10 KG → 68 KG → RECEIVED.

Supplier outbound is not changed by buyer receipt.

---

## SC-17 — Connection disabled after history exists

Disable connection after completed connected PO.

Expected:
- new mapping blocked;
- new connected PO blocked;
- historical PO/mapping readable by legitimate parties;
- old stock movements unchanged.

---

## SC-18 — Dashboard is explainable

Every KPI must trace to operational data.

No number exists only because someone typed it into a KPI document.

Known-seed values must reconcile against Product/StockSummary/PO data.

---

## SC-19 — Optional public Storefront Catalog

Release C only.

Public fields:
- name;
- public SKU;
- description;
- image/placeholder;
- selling price;
- category;
- availability.

Payload must exclude:
- purchase cost;
- margin;
- supplier;
- exact warehouse;
- private stock history;
- internal threshold.

No write path.

---

# 4. Canonical demonstration flow

1. Public homepage.
2. Branded Grand Ocean login.
3. Role-context validation.
4. Dashboard.
5. Product CRUD.
6. Low-stock Chicken Breast.
7. +2 KG adjustment + movement history.
8. Private supplier + PO + receipt.
9. Role denial.
10. Tenant-isolation evidence.
11. Connect Fresh Foods.
12. Validate `CKN-B5`.
13. Map 1 PACK = 5 KG.
14. Create connected PO.
15. Switch to Fresh Foods.
16. Accept + ship.
17. Switch to Grand Ocean Storekeeper.
18. Partial/full receive.
19. Show final stock/history.
20. Reports.
21. Optional Storefront only if built.

---

# 5. Acceptance philosophy

A scenario passes only when:

- UI state is correct;
- persisted data is correct;
- unauthorized paths are denied;
- duplicate retry is safe;
- audit/history is correct where required;
- refresh/re-login preserves result;
- no manual database edit is needed.
