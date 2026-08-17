# StockFlow — Final Domain & Data Contract v2.0

**Status:** Authoritative conceptual data/state contract  
**Database target:** Cloud Firestore, single multi-tenant database for coursework  
**Important:** Field names may be adapted consistently during final schema implementation, but ownership/state/invariants may not be silently changed.

---

# 1. Core architectural rule

StockFlow V1 uses one Firestore database with three explicit zones:

1. **Public projections**
2. **Organization-private tenant data**
3. **Shared cross-business transaction data**

No business directly reads or edits another business's private inventory.

---

# 2. Canonical path model

```text
organizationDirectory/{handle}

users/{uid}

organizations/{orgId}
  settings/main
  members/{uid}
  invitations/{inviteId}

  categories/{categoryId}
  products/{productId}
  warehouses/{warehouseId}
  stockBalances/{balanceId}
  productStockSummaries/{productId}
  stockMovements/{movementId}

  privatePartners/{partnerId}
  partnerCatalog/{catalogItemId}
  auditLogs/{auditId}

connections/{connectionId}
productMappings/{mappingId}

purchaseOrders/{purchaseOrderId}
purchaseOrders/{purchaseOrderId}/items/{itemId}
purchaseOrders/{purchaseOrderId}/history/{historyId}

users/{uid}/notifications/{notificationId}

storefrontCatalog/{handle}/items/{catalogItemId}  # C only

commandReceipts/{operationId}                    # or org-scoped equivalent
```

---

# 3. Identifier rules

## organizationId
- generated;
- immutable;
- tenant authority.

## handle
- normalized lowercase;
- globally unique;
- public;
- immutable in A/B;
- used for routes/discovery only;
- never authorization.

## internal IDs
Generated stable IDs for Product/Warehouse/Partner/Mapping/PO/Movement.

Human SKU/order number is not primary identity.

## operationId
- UUID/ULID or equivalent;
- unique in command scope;
- required for stock/cross-business commands;
- retry-safe.

---

# 4. Numeric representation

## Money
```text
currency: "LKR"
unitPriceMinor: integer
lineTotalMinor: integer
```

Server/backend validates commercial totals on privileged transitions.

## Quantity
- explicit unit;
- decimals allowed;
- one shared precision policy, recommended max 3 decimals;
- normalized by shared validation utility.

## Conversion

```text
supplierOrderUnit = PACK
buyerBaseUnit = KG
supplierToBuyerBaseFactor = 5

buyerBaseQuantity =
supplierOrderQuantity * supplierToBuyerBaseFactor
```

No ambiguous factor without direction/units.

---

# 5. Entity contracts

## 5.1 User

Fields:
- uid;
- displayName;
- email;
- photoUrl optional;
- status;
- createdAt;
- lastSeenAt optional.

No password/hash.

---

## 5.2 OrganizationDirectoryEntry

**Purpose:** public safe lookup.

Document key:
normalized handle.

Fields:
- organizationId;
- handle;
- name;
- logoUrl optional;
- monogram;
- industry;
- country;
- directoryStatus.

Must exclude:
- members;
- private settings;
- inventory;
- suppliers;
- analytics;
- internal costs.

Created atomically with Organization/handle reservation.

---

## 5.3 Organization

Fields:
- organizationId;
- name;
- handle;
- industry;
- country;
- currency;
- timezone;
- logoUrl optional;
- status;
- ownerUid;
- createdAt/by.

Lifecycle:
ACTIVE → SUSPENDED/ARCHIVED.

---

## 5.4 OrganizationSettings

Possible fields:
- defaultWarehouseId;
- currency;
- timezone;
- lowStockNotificationsEnabled;
- publicStockVisibility;
- PO prefix;
- partnerCatalogEnabled;
- storefrontEnabled C.

Security-relevant changes audited.

---

## 5.5 Membership

Path:
`organizations/{orgId}/members/{uid}`

Fields:
- uid;
- role;
- status;
- invitedBy;
- joinedAt;
- updatedAt.

Roles:
OWNER, ADMIN, INVENTORY_MANAGER, PROCUREMENT_MANAGER, STOREKEEPER, ANALYST, VIEWER.

Lifecycle:
ACTIVE ↔ SUSPENDED → REMOVED.

Invitation is separate.

One canonical Owner.

---

## 5.6 Invitation

Fields:
- invitationId;
- orgId;
- emailNormalized;
- role;
- tokenHash/reference;
- status;
- expiresAt;
- createdBy/At;
- acceptedBy/At optional.

Lifecycle:
PENDING → ACCEPTED | EXPIRED | REVOKED.

Matching authenticated email required.

---

## 5.7 Category

Fields:
- categoryId;
- name;
- description optional;
- status;
- timestamps.

Lifecycle:
ACTIVE ↔ ARCHIVED.

---

## 5.8 Product

Fields:
- productId;
- internalSku;
- name;
- description optional;
- categoryId;
- baseUnit;
- purchaseCostMinor;
- sellingPriceMinor optional;
- currency;
- minimumStock;
- reorderTarget;
- status;
- preferredPrivateSupplierId optional;
- partnerPublished;
- storefrontPublished C;
- createdAt/By;
- updatedAt/By.

Constraints:
- internalSku unique per org;
- archived unavailable for new PO/mapping.

---

## 5.9 Warehouse

Fields:
- warehouseId;
- name;
- code optional;
- type;
- status;
- address optional;
- timestamps.

Archive only when:
- every onHand = 0;
- no open receiving dependency.

---

## 5.10 StockBalance

Unique per Product+Warehouse in an org.

Fields:
- productId;
- warehouseId;
- onHand;
- updatedAt;
- version optional.

System/backend stock command only in recommended profile.

---

## 5.11 ProductStockSummary

One per Product.

Fields:
- productId;
- onHandTotal;
- reservedTotal = 0 in A/B/C;
- availableTotal;
- stockStatus;
- updatedAt.

Statuses:
IN_STOCK, LOW_STOCK, OUT_OF_STOCK.

Release A/B:
`availableTotal = onHandTotal`.

---

## 5.12 StockMovement

Immutable.

Fields:
- movementId;
- productId;
- warehouseId;
- movementType;
- signedQuantity;
- unit;
- sourceType;
- sourceId optional;
- operationId;
- reason optional;
- actorUid;
- createdAt server timestamp.

A/B movement types:
- OPENING_BALANCE;
- ADJUSTMENT_IN;
- ADJUSTMENT_OUT;
- PURCHASE_RECEIPT;
- CONNECTED_DISPATCH_OUT.

Future:
SALE, TRANSFER, RETURN, DAMAGE, EXPIRED, RESERVATION.

---

## 5.13 CommandReceipt

Fields:
- operationId;
- commandType;
- orgId;
- actorUid;
- entityId;
- resultStatus;
- resultReference;
- createdAt.

Transaction flow:
1. check operationId;
2. if exists return prior result/no-op;
3. otherwise apply command;
4. create receipt.

---

## 5.14 PrivatePartner

Fields:
- partnerId;
- partnerTypes SUPPLIER/BUYER/BOTH;
- name;
- contactPerson;
- email;
- phone;
- address;
- notes;
- status;
- timestamps.

Lifecycle:
ACTIVE → DEACTIVATED.

---

## 5.15 BusinessConnection

Directional.

Fields:
- connectionId;
- buyerOrgId;
- supplierOrgId;
- status;
- requestedByUid;
- requestedAt;
- respondedByUid/At;
- disabledAt optional.

Recommended deterministic uniqueness:
`buyerOrgId + "__" + supplierOrgId`.

Lifecycle:
PENDING → ACTIVE | REJECTED;
ACTIVE → DISABLED.

Historical objects survive disable.

---

## 5.16 PartnerCatalogItem

Owned by supplier organization.

Fields:
- catalogItemId;
- sourceProductId;
- partnerSku;
- partnerSkuNormalized;
- displayName;
- orderUnit;
- packDescription optional;
- availabilityState;
- wholesalePriceMinor optional;
- currency optional;
- published;
- updatedAt.

Visible only to supplier and ACTIVE connected buyers.

Does not expose exact stock/internal cost/margin/private warehouse.

Partner SKU unique in supplier published catalog.

---

## 5.17 ProductMapping

Fields:
- mappingId;
- connectionId;
- buyerOrgId;
- buyerProductId;
- supplierOrgId;
- supplierCatalogItemId;
- supplierProductId optional server reference;
- supplierPartnerSkuSnapshot;
- buyerBaseUnit;
- supplierOrderUnit;
- supplierToBuyerBaseFactor;
- semanticConfirmedByUid;
- status;
- createdAt;
- disabledAt optional.

Default coursework:
backend-validated creation → VERIFIED.

Bonus:
PENDING → VERIFIED/REJECTED.

---

## 5.18 PurchaseOrder

Shared top-level transaction object.

Fields:
- purchaseOrderId;
- orderNumber;
- buyerOrgId;
- supplierKind PRIVATE/CONNECTED;
- privateSupplierId optional;
- supplierOrgId optional;
- connectionId optional;
- status;
- currency;
- expectedDate optional;
- createdBy/At;
- submittedAt/orderedAt;
- acceptedAt;
- shippedAt;
- receivedAt;
- cancelledAt;
- totalMinor;
- lastOperationId optional.

Privacy:
- private PO → buyer only;
- connected PO → buyer + named supplier.

No unrelated private tenant fields in shared connected PO.

---

## 5.19 PurchaseOrderItem

Fields:
- itemId;
- buyerProductId;
- buyerProductNameSnapshot;
- buyerSkuSnapshot;
- buyerBaseUnitSnapshot;
- orderedBuyerBaseQuantity;
- unitPriceMinor;
- lineTotalMinor;
- currency;
- receivedBuyerBaseQuantity.

Connected additionally:
- mappingId;
- supplierCatalogItemId;
- supplierProductNameSnapshot;
- supplierSkuSnapshot;
- supplierOrderUnitSnapshot;
- supplierOrderQuantity;
- supplierToBuyerBaseFactorSnapshot.

Snapshots immutable after order/submission.

---

## 5.20 PurchaseOrderHistory

Fields:
- historyId;
- poId;
- fromStatus;
- toStatus;
- actorUid;
- actorOrgId;
- operationId;
- note optional;
- createdAt.

Immutable.

---

## 5.21 Notification

Path:
`users/{uid}/notifications/{id}`

Fields:
- organizationId;
- type;
- title;
- message;
- referenceType;
- referenceId;
- read;
- createdAt.

Backend/system created for sensitive B2B events.
Recipient may mark read.

---

## 5.22 AuditLog

Fields:
- auditId;
- actorUid;
- organizationId;
- action;
- entityType;
- entityId;
- operationId/referenceId;
- summary;
- createdAt;
- safe metadata.

Server-created.
Never update/delete.

---

## 5.23 StorefrontCatalogItem — C only

Fields:
- sourceProductId;
- publicSku;
- displayName;
- description;
- sellingPriceMinor;
- currency;
- imageUrl/placeholder;
- categoryName;
- availabilityState;
- publishedAt.

No private fields.

---

# 6. Stock command contract

Every stock-changing backend command:

1. authenticate caller;
2. resolve trusted org/resource;
3. verify ACTIVE membership;
4. verify role;
5. validate product/warehouse;
6. validate quantity/unit;
7. check operationId;
8. open Firestore transaction;
9. read current Balance/Summary;
10. validate resulting stock;
11. create movement;
12. update Balance;
13. update Summary;
14. update PO line/status if receipt/dispatch;
15. create CommandReceipt;
16. create required audit/history;
17. commit;
18. return committed result.

Admin SDK bypasses Firestore Rules, so backend authorization is mandatory.

---

# 7. State machines

## Membership
```text
INVITED invitation → ACTIVE membership
ACTIVE ↔ SUSPENDED
ACTIVE/SUSPENDED → REMOVED
```

## Connection
```text
PENDING → ACTIVE
PENDING → REJECTED
ACTIVE → DISABLED
```

## Mapping
Default:
```text
VERIFIED → DISABLED
```

Bonus:
```text
PENDING → VERIFIED | REJECTED
VERIFIED → DISABLED
```

## Private PO
```text
DRAFT → ORDERED
DRAFT → CANCELLED
ORDERED → CANCELLED
ORDERED → PARTIALLY_RECEIVED
ORDERED → RECEIVED
PARTIALLY_RECEIVED → PARTIALLY_RECEIVED
PARTIALLY_RECEIVED → RECEIVED
```

No cancellation after any receipt.

## Connected PO
```text
DRAFT → SUBMITTED
DRAFT → CANCELLED
SUBMITTED → ACCEPTED
SUBMITTED → REJECTED
SUBMITTED → CANCELLED
ACCEPTED → SHIPPED
SHIPPED → PARTIALLY_RECEIVED
SHIPPED → RECEIVED
PARTIALLY_RECEIVED → PARTIALLY_RECEIVED
PARTIALLY_RECEIVED → RECEIVED
```

Excluded:
- PARTIALLY_SHIPPED;
- cancellation after ACCEPTED;
- amendment negotiation.

## Product
```text
ACTIVE ↔ ARCHIVED
```

---

# 8. Data invariants

**INV-01** StockMovement belongs to one org/product/warehouse.  
**INV-02** StockMovement immutable.  
**INV-03** StockBalance.onHand = signed movement sum for that product+warehouse.  
**INV-04** ProductStockSummary.onHandTotal = sum of product StockBalances.  
**INV-05** Every stock mutation has operationId + CommandReceipt.  
**INV-06** Retry same operationId creates no duplicate.  
**INV-07** VERIFIED mapping resolves stable buyer Product + supplier PartnerCatalogItem.  
**INV-08** Connected PO requires ACTIVE connection when created/submitted.  
**INV-09** Connected PO line snapshots immutable after SUBMITTED.  
**INV-10** Supplier SHIP changes supplier inventory only.  
**INV-11** Buyer RECEIVE changes buyer inventory only.  
**INV-12** Received quantity never exceeds outstanding.  
**INV-13** Public/partner projections contain only explicitly copied fields.  
**INV-14** Connection does not grant private tenant access.  
**INV-15** Historical references remain resolvable after archive/disable.  
**INV-16** Public handle resolves to one organization only.

---

# 9. Query design notes

Likely indexes:

- Products by status/category/updatedAt;
- ProductStockSummaries by stockStatus;
- StockMovements by productId+createdAt;
- StockMovements by warehouseId+createdAt;
- PrivatePartners by type+status;
- POs by buyerOrgId+status+createdAt;
- POs by supplierOrgId+status+createdAt;
- Connections by buyer/supplier+status;
- Mappings by buyerOrgId+status;
- Notifications by read+createdAt.

Business lookup:
direct get `organizationDirectory/{handle}`.

Partner SKU:
exact normalized SKU inside supplier Partner Catalog.

---

# 10. Dashboard data strategy

Use:
- ProductStockSummary for stock status/counts;
- bounded PO queries;
- Firestore aggregation (`count`/`sum`) where useful;
- no manually editable KPI table.

Avoid premature distributed counters.

---

# 11. Future compatibility

Designed to later support:
- dedicated tenant provider;
- Storefront order service;
- SalesOrder;
- reservation;
- transfers;
- batch/lot;
- multiple shipments;
- custom roles.

None is required for current correctness.
