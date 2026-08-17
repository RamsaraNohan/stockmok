# DB-06 — FINAL COMMAND AND TRANSACTION CONTRACT

**Status:** FROZEN. The complete command catalog, its authorization, its atomic write sets and its
failure guarantees.
**Total commands: 36.** Every one is a `onCall` callable produced by `defineCommand()`. **Zero HTTP
endpoints. Zero Firestore triggers.**

## 0. `defineCommand()` — the shared frame

Every command runs through the identical frame, so no step can be forgotten in the thirty-fourth command
written late on Day 11.

**Why `cpo.draftSave` is deliberately NOT idempotent.** A draft save is an upsert with last-write-wins
semantics and no side effect, so it is idempotent *by nature*. Giving it an `operationId` would create one
permanent `commandReceipt` document per save — receipts are never deleted in A/B — turning ordinary
editing into unbounded storage growth. It takes a transaction only because it must re-validate the
connection, the mappings and the products server-side before persisting.

```text
AUTH          context.auth.uid present                     → unauthenticated
INPUT         Zod schema (the same object the form used)   → invalid-argument
MEMBERSHIP    read organizations/{orgId}/members/{uid}     → permission-denied / NOT_A_MEMBER
STATUS        must be ACTIVE                               → permission-denied / MEMBERSHIP_NOT_ACTIVE
ROLE          role ON THAT DOCUMENT ∈ allowed              → permission-denied / ROLE_NOT_PERMITTED
─── open transaction ───────────────────────────────────────────────────────────
IDEMPOTENCY   read commandReceipts/{operationId}   ← FIRST READ
              exists + hash match  → return stored result, no side effects
              exists + hash differ → failed-precondition / OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD
READ_SET      all reads, all bounded, all within the verified organization
OWNERSHIP     every referenced doc's organizationId == verified orgId → CROSS_TENANT_REFERENCE
VALIDATION    domain rules
STATE         transition table (DB-07) → failed-precondition / INVALID_TRANSITION
WRITE_SET     all writes
AUDIT         writeAudit(txn, …)
NOTIFY        notify(txn, …) — recipients resolved BEFORE any write, limit(50)
RECEIPT       txn.create(commandReceipts/{operationId})    ← LAST WRITE
─── commit ─────────────────────────────────────────────────────────────────────
RETURN        minimal result
```

**All reads precede all writes** — a Firestore requirement. The receipt is read **first** and written
**last**. Every in-transaction query carries `.limit()`.

**Failure guarantee, universal:** a command either commits its entire write set or writes nothing. There
is no partial state, no compensating write and no cleanup job anywhere in this architecture.

**Retry policy.** Callables are **not** automatically retried by the platform, so every retry is user- or
client-initiated and always carries the same `operationId`. Firestore retries the transaction body
internally on contention; the body is therefore pure and side-effect-free outside the transaction.

---

## 1. Catalog

`I` = requires `operationId` and is idempotent · `T` = transaction · `A` = writes audit.

| # | Command | Roles | Rel | I | T | A |
|---|---|---|:-:|:-:|:-:|:-:|
| C-01 | `org.create` | any authenticated user | A | ✔ | ✔ | ✔ |
| C-02 | `org.updateSettings` | `ADMINS` | A | – | **✔** | ✔ |
| C-03 | `user.bootstrapProfile` *(optional; client `setDoc` covers it)* | self | A | ✔ | – | – |
| C-04 | `team.createInvitation` | `ADMINS` | A | ✔ | ✔ | ✔ |
| C-05 | `team.revokeInvitation` | `ADMINS` | A | – | – | ✔ |
| C-06 | `team.acceptInvitation` | authenticated invitee | A | ✔ | ✔ | ✔ |
| C-07 | `team.changeMemberRole` | `ADMINS` | A | – | ✔ | ✔ |
| C-08 | `team.setMemberStatus` | `ADMINS` | A | – | ✔ | ✔ |
| C-09 | `product.create` | `INVENTORY_WRITERS` | A | ✔ | ✔ | ✔ |
| C-10 | `product.update` | `INVENTORY_WRITERS` | A | – | ✔ | ✔ |
| C-11 | `product.setStatus` | `INVENTORY_WRITERS` | A | – | ✔ | ✔ |
| C-12 | `warehouse.archive` | `INVENTORY_WRITERS` | A | – | ✔ | ✔ |
| C-13 | `stock.recordOpeningBalance` | `INVENTORY_WRITERS` | A | **✔** | ✔ | ✔ |
| C-14 | `stock.adjust` | `INVENTORY_WRITERS` | A | **✔** | ✔ | ✔ |
| **C-33** | **`stock.transfer`** | **`TRANSFER_WRITERS`** | **A** | **✔** | **✔** | **✔** |
| C-15 | `po.order` | `PO_WRITERS` | A | ✔ | ✔ | ✔ |
| C-16 | `po.cancel` | `PO_WRITERS` | A | – | ✔ | ✔ |
| C-17 | `po.receive` | `RECEIVERS` | A | **✔** | ✔ | ✔ |
| C-18 | `connection.request` | `PARTNER_WRITERS` | B | ✔ | ✔ | ✔ |
| C-19 | `connection.respond` | `PARTNER_WRITERS` | B | ✔ | ✔ | ✔ |
| C-20 | `connection.disable` | `ADMINS` | B | – | ✔ | ✔ |
| C-21 | `partnerCatalog.publish` | `PARTNER_WRITERS` | B | – | ✔ | ✔ |
| C-22 | `partnerCatalog.unpublish` | `PARTNER_WRITERS` | B | – | ✔ | ✔ |
| C-23 | `partnerCatalog.list` *(read)* | `PARTNER_WRITERS` of a connected buyer | B | – | – | – |
| C-24 | `partnerCatalog.lookupBySku` *(read)* | as above | B | – | – | – |
| C-25 | `mapping.create` | `PARTNER_WRITERS` | B | ✔ | ✔ | ✔ |
| C-26 | `mapping.disable` | `PARTNER_WRITERS` | B | – | ✔ | ✔ |
| **C-34** | **`cpo.draftSave`** *(DB-CR-010)* | `PO_WRITERS` (buyer) | B | – | ✔ | – |
| **C-35a** | **`category.archive`** *(DB-CR-012)* | `INVENTORY_WRITERS` | A | – | ✔ | ✔ |
| **C-35b** | **`category.restore`** *(DB-CR-012)* | `INVENTORY_WRITERS` | A | – | ✔ | ✔ |
| **C-36** | **`warehouse.setDefault`** *(DB-CR-013)* | `INVENTORY_WRITERS` | A | – | ✔ | ✔ |
| **C-37** | **`warehouse.restore`** *(A3 · DB-CR-033)* | `INVENTORY_WRITERS` | A | – | ✔ | ✔ |
| **C-38** | **`partner.setStatus`** — archive / restore a private partner *(A3R-11)* | `PARTNER_WRITERS` | A | – | ✔ | ✔ |
| C-27 | `cpo.submit` | `PO_WRITERS` (buyer) | B | **✔** | ✔ | ✔ |
| C-28 | `cpo.respond` | `PO_WRITERS` (supplier) | B | **✔** | ✔ | ✔ |
| C-29 | `cpo.ship` | `PO_WRITERS` (supplier) | B | **✔** | ✔ | ✔ |
| C-30 | `cpo.receive` | `RECEIVERS` (buyer) | B | **✔** | ✔ | ✔ |
| C-31 | `cpo.cancel` | `PO_WRITERS` (buyer) | B | – | ✔ | ✔ |
| C-32 | `storefront.publish` / `unpublish` | `ADMINS` | **C — NOT BUILT, excluded from COMMAND_COVERAGE (A3 · F-M-16)** | – | ✔ | ✔ |

Deployment names map dot-case → camelCase (`stock.transfer` → `stockTransfer`), exported individually
from `index.ts` so Firebase deploys each as a separate function with its own logs, metrics and redeploy.

---

## 2. C-33 `stock.transfer` — the A1 command, in full

**PURPOSE** Move a quantity of one product from one ACTIVE warehouse to another ACTIVE warehouse within
the same organization, writing both halves of the ledger at once.

**INPUT**
```ts
{ operationId: string,        // UUID v4, generated when the modal opens
  orgId: string,              // routing hint only — never a claim
  productId: string,
  fromWarehouseId: string,
  toWarehouseId: string,
  quantityMilli: integer }    // > 0
```

**AUTH / MEMBERSHIP / ROLE** authenticated · ACTIVE membership in `orgId` ·
role ∈ `TRANSFER_WRITERS = ['OWNER','ADMIN','INVENTORY_MANAGER']`.

**PRECONDITIONS**
1. `fromWarehouseId != toWarehouseId`
2. `quantityMilli > 0` and is an integer
3. product exists, belongs to `orgId`, `status == 'ACTIVE'`
4. both warehouses exist, belong to `orgId`, `status == 'ACTIVE'`
5. source balance exists and `onHandMilli >= quantityMilli`

**READ_SET** *(all inside the transaction, all by deterministic id — no scan)*
```
commandReceipts/{operationId}                              ← FIRST
products/{productId}
warehouses/{fromWarehouseId}
warehouses/{toWarehouseId}
stockBalances/{productId}__{fromWarehouseId}
stockBalances/{productId}__{toWarehouseId}                 ← may not exist
```

**VALIDATION** Zod schema; the five preconditions; `quantityMilli` precision ≤ 3 dp;
`unit` taken from the product, never from the payload.

**LEGAL_SOURCE_STATE** product `ACTIVE`; both warehouses `ACTIVE`; source `onHandMilli >= quantityMilli`.

**ATOMIC_WRITE_SET** — six documents, exactly

| # | Document | Write |
|---|---|---|
| 1 | `stockMovements/{outId}` | `create` · `TRANSFER_OUT` · `signedQuantityMilli = -q` · `warehouseId = from` · `counterpartWarehouseId = to` · `transferId` · `sourceType = 'TRANSFER'` · `balanceAfterMilli = fromAfter` |
| 2 | `stockMovements/{inId}` | `create` · `TRANSFER_IN` · `signedQuantityMilli = +q` · `warehouseId = to` · `counterpartWarehouseId = from` · **same `transferId`** · `balanceAfterMilli = toAfter` |
| 3 | `stockBalances/{productId}__{from}` | `update` `onHandMilli = fromBefore − q` |
| 4 | `stockBalances/{productId}__{to}` | `set` (create if absent) `onHandMilli = toBefore + q` |
| 5 | `auditLogs/{auto}` | `create` · action `stock.transfer` · summary *"Transferred 50.000 KG of Basmati Rice from Main Store to Cold Room"* |
| 6 | `commandReceipts/{operationId}` | `create` ← **LAST** |

**`productStockSummaries/{productId}` is deliberately NOT written** (`INV-23`). A transfer cannot change
a product total, so leaving the summary untouched makes the invariant structural rather than arithmetic,
and removes the only write-contention point from the operation. `stockStatus` and `stockValueMinor`
therefore cannot change, so **no low-stock notification is possible** and none is emitted.

`transferId` is generated server-side (`db.collection(...).doc().id`), never supplied by the client.

**IDEMPOTENCY** `operationId` + `payloadHash`. A replay with the identical payload returns the stored
result and writes nothing. A replay with a different payload is rejected. **Retrying a transfer can
never move stock twice.**

**AUDIT** one record. **NOTIFICATIONS** none. **PRIVACY** intra-tenant only; no field of this command or
its result can reference another organization.

**RETURN** `{ transferId, outMovementId, inMovementId, fromOnHandMilli, toOnHandMilli }`

**DOMAIN_ERRORS**

| Code | Condition | HttpsError |
|---|---|---|
| `SAME_WAREHOUSE` | `from == to` | `invalid-argument` |
| `INVALID_QUANTITY` | `q <= 0` or precision > 3 dp | `invalid-argument` |
| `PRODUCT_NOT_ACTIVE` | product archived or missing | `failed-precondition` |
| `WAREHOUSE_NOT_ACTIVE` | either warehouse archived or missing | `failed-precondition` |
| `INSUFFICIENT_STOCK` | `fromBefore − q < 0` | `failed-precondition` |
| `CROSS_TENANT_REFERENCE` | any id resolves outside `orgId` | `permission-denied` |
| `ROLE_NOT_PERMITTED` | role ∉ `TRANSFER_WRITERS` | `permission-denied` |
| `OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD` | hash mismatch | `failed-precondition` |

**FAILURE_GUARANTEE** All six writes commit or none does. A `TRANSFER_OUT` without its paired
`TRANSFER_IN` is impossible by construction (`INV-22`). Concurrent transfers out of the same balance
serialise on the `stockBalances` document: Firestore aborts and retries the loser, which re-reads the
new balance, so two concurrent transfers of 30 from a balance of 50 produce one success and one
`INSUFFICIENT_STOCK` — never a negative balance.

---

## 3. Stock commands C-13, C-14, C-17, C-29, C-30 — the shared shape

Every material stock change follows exactly this order (`05` §6):

```text
1  reject if unauthenticated
2  validate payload (Zod)
3  read members/{uid}; reject unless ACTIVE
4  reject unless role permitted
5  open transaction
6  READ the command receipt FIRST; short-circuit on replay, reject on hash mismatch
7  read product (must be ACTIVE) and warehouse (must be ACTIVE)
8  read the current balance and summary
9  validate quantity, unit and precision
10 compute newBalanceMilli = currentMilli + signedQuantityMilli
11 reject if negative FOR THAT WAREHOUSE          → INSUFFICIENT_STOCK
12 create the immutable StockMovement (+ balanceAfterMilli)
13 update the StockBalance
14 update the ProductStockSummary — onHand, available, stockStatus, stockValueMinor
   (A2: `stock.transfer` alone skips this step — INV-23; and a newly created
    StockBalance carries its DV-11 denormalised fields from the product already read)
15 update the PO line and status if this is a receipt or a dispatch
16 write the audit record
17 write notifications IF AND ONLY IF the derived stock status changed
18 create the CommandReceipt
19 commit; return a minimal result
```

**Steps 1–4 and 7 are the only authorization that exists**, because the Admin SDK bypasses rules.

**Low-stock notification** compares the status computed *before* the command with the status *after*,
inside the same transaction, and emits only on a **transition** — so receiving ten partial shipments of
a low product produces one notification, not ten (`FR-STOCK-017`).

**The negative-stock rule applies per `StockBalance`** — product × warehouse — so stock can never be
driven negative in one location and masked by a surplus in another.

**A3R-P2 · C1-AUTH-007 — step 9's quantity rule is not uniform.** `C-13 stock.recordOpeningBalance` accepts
`quantityMilli >= 0`; every other material stock command keeps its existing strictly-positive requirement
(`C-14`, `C-17`, `C-29`, `C-30`, `C-33` — `q <= 0` stays `INVALID_QUANTITY` for all of them). A shared
`nonZeroQuantity` validator must therefore **not** be applied to `C-13`. Zero is legal for the
`OPENING_BALANCE` movement type alone (DB-02 §4.6, OWNER-APPROVED).

### 3.1 C-13 `stock.recordOpeningBalance`
Reads: receipt, product, warehouse, balance (**must not exist or be zero**), summary.
Writes: `OPENING_BALANCE` movement (`effectiveAt` from the form, validated ≤ now), balance, summary,
audit, receipt. One opening balance per product-and-warehouse pair; a second attempt is
`failed-precondition / OPENING_BALANCE_ALREADY_RECORDED` and the UI offers an adjustment instead.

**`quantityMilli >= 0` — A3R-P2 · C1-AUTH-007, OWNER-APPROVED.** `quantityMilli == 0` is **accepted** and
creates the deliberate immutable zero opening-ledger entry: one `OPENING_BALANCE` movement with
`signedQuantityMilli = 0` and `balanceAfterMilli = 0`, its balance and summary rows, the audit record and
the receipt. A recorded zero is a different fact from a product that was never initialized, which is what
makes the out-of-stock KPI provable from the ledger (DB-08 §2 — Cooking Oil).
Everything else about `C-13` is unchanged: **one** opening balance per product **and** warehouse pair, an
**immutable** `StockMovement`, a correct `balanceAfterMilli`, and the same auth / RBAC / transaction /
idempotency semantics and domain errors. `INVALID_QUANTITY` still applies to `C-13` for a **negative**
value or precision > 3 dp — **never** for zero.

### 3.2 C-14 `stock.adjust`
Reads: receipt, product, warehouse, balance, summary.
Writes: `ADJUSTMENT_IN` or `ADJUSTMENT_OUT` (with `adjustmentReason`; `note` required when reason is
`OTHER`), balance, summary, audit, receipt, low-stock notifications **on transition only**.
A decrease exceeding 50 % of the current warehouse balance requires the confirmation state client-side;
the server does not reject it, because the minimum is a signal to buy, not a rule about reality.

### 3.3 C-17 `po.receive` (private)
Receipt quantities are in the product's **base unit** — a private supplier is not a Stockmok tenant and
there is no supplier order unit. Per line `0 < receiveMilli <= orderedMilli − receivedMilli`, else
`OVER_RECEIPT`. One `PURCHASE_RECEIPT` movement per line per receipt event, `sourceType: 'PRIVATE_PO'`,
`sourceId: poId`. PO becomes `RECEIVED` if every line is complete, otherwise `PARTIALLY_RECEIVED`.
`receivingWarehouseId` is recorded on the PO at the **first** receipt so `warehouse.archive` can detect
the open dependency. Cancellation after any receipt is `INVALID_TRANSITION`.

### 3.4 C-29 `cpo.ship` — supplier ledger only
Writes `CONNECTED_DISPATCH_OUT` movements in the **supplier** organization, supplier balances, supplier
summaries, the canonical PO → `SHIPPED`, **both** projections, history rows on all three, audit in both
organizations, a notification to the buyer, and the receipt. **The buyer's stock is untouched**
(`INV-10`, `FR-CPO-009`). There is no `PARTIALLY_SHIPPED` — the frozen single-shipment supplier model is
preserved.

### 3.5 C-30 `cpo.receive` — buyer ledger only
Receipt quantities are entered in the **supplier order unit** and converted:
`buyerBaseMilli = roundHalfUp(receiveSupplierMilli × factorMilli / 1000)`.
**Outstanding is tracked in supplier order units** to prevent conversion drift across partial receipts;
a residual rounding difference of at most one milli-unit is absorbed into the final line.
Writes `PURCHASE_RECEIPT` movements in the **buyer** organization only (`INV-11`), buyer balances, buyer
summaries, the canonical PO quantities and status, both projections, history, audit, notification,
receipt. **A buyer receipt never modifies the supplier's outbound movement.**

---

## 4. Cross-tenant commands — the two-organization write set

`connection.*` and `cpo.*` write into two tenants in one transaction. Each writes the canonical zone-4
document **and both zone-3 projections together**, which is what makes `INV-19` hold by construction.

| Command | Canonical | Buyer org | Supplier org | Both |
|---|---|---|---|---|
| `connection.request` | `connections/{id}` `txn.create` — **fails if a PENDING/ACTIVE document exists** | projection | projection | audit ×2, notification to supplier `ADMINS`, receipt |
| `connection.respond` | status → `ACTIVE`\|`REJECTED` | projection | projection | audit ×2, notification to requester, receipt |
| `connection.disable` | status → `DISABLED` | projection | projection | audit ×2, receipt |
| `cpo.draftSave` | – | buyer draft only | – | receipt |
| `cpo.submit` | canonical + items (snapshots frozen), history | projection + items + history | projection + items + history | audit ×2, notification, receipt, counter increment |
| `cpo.respond` | status, history | projection, history | projection, history | audit ×2, notification, receipt |
| `cpo.ship` | status, history | projection, history | projection, history, **movements + balances + summaries** | audit ×2, notification, receipt |
| `cpo.receive` | received quantities, status, history | projection, history, **movements + balances + summaries** | projection, history | audit ×2, notification, receipt |

Largest transaction — `cpo.ship` with five lines — writes ≈ 18 documents, far under the 500 limit.
**A2:** `product.update` now writes `1 + 1 + 1 + |ACTIVE warehouses holding the product|` documents —
five at the canonical seed's two store rooms, and capped by `Q-079`'s `limit(100)`, so still far under 500.

### 4.1 A2 · DB-CR-017 — `Q-079`, the one new command-internal query

| Q | Command | Query | Bound |
|---|---|---|---|
| **Q-079** | `product.update`, `product.setStatus` | `stockBalances where productId == P` | **`limit(100)`** — index `IDX-09`; one product × at most one document per ACTIVE warehouse |

`stockBalances` now carries the same denormalised product display fields as `productStockSummaries`
(DB-02 §4.4), because the frozen **Store room** filter on `TABLE-001` could not otherwise be served inside
the `NFR-017` 27-read budget — it cost 50 (DB-04 §6.1). Those fields must therefore be maintained when the
product changes.

**This fanout is bounded by the warehouse count, not the product count.** That is the whole difference
between it and the category-name fanout that A2 deleted (DB-07 §12, DV-10 note), which was bounded only by
how many products share a category and whose documented failure mode was refusing the rename. A workspace
exceeding 100 store rooms would need `Q-079` revisited; the limit is written down rather than discovered.

**`stock.transfer` is unchanged in shape.** It already reads `products/{productId}` and both warehouse
documents, and already writes both balances including creating the destination when absent. It populates the
DV-11 fields on that create. The write set stays at **exactly six documents** and the summary stays
untouched, so `INV-23` and `T-XFER-01` are unaffected.

**Connection status is re-read inside every `cpo.*` and `mapping.*` transaction**, so a connection
disabled between page load and submit is rejected rather than acted on.

---

## 5. Uniqueness and counter commands

| Command | Mechanism | Why |
|---|---|---|
| `org.create` | `txn.create(handleReservations/{handle})` | Firestore's create precondition fails if the document exists, so two concurrent requests for one handle produce exactly one winner and one `already-exists` — with no partially-created organization, because the reservation, organization, directory entry, settings, Owner membership, membership mirror, first warehouse and audit are one transaction. |
| `product.create` / `update` | `txn.create(productSkuIndex/{skuNorm})`; on a SKU change, delete the old index document and create the new one in the same transaction | A Security Rule cannot query a collection, so uniqueness cannot be enforced client-side. This makes it **race-free by database enforcement** rather than by a read-then-write check. |
| `connection.request` | deterministic id `{buyerOrgId}__{supplierOrgId}` + `txn.create` | Directional uniqueness by construction (`FR-NET-006`). A new request is permitted only when no document exists or the existing one is `REJECTED`/`DISABLED`. Self-connection is rejected. |
| `po.order`, `cpo.submit` | read + increment `counters/purchaseOrder` **inside** the transaction | Order numbers are unique under concurrency. |
| `warehouse.archive` | two `.limit(1)` queries **inside** the transaction | The Admin SDK supports query reads inside a transaction, so the "no stock, no open receipt" guard is race-free — stock added concurrently cannot slip past it. |
| `mapping.create` | `.limit(1)` duplicate check inside the transaction | No second `VERIFIED` mapping for the same buyer-product/supplier-item pair. |

---

## 6. Transaction boundary table

Each row is one atomic unit. If any write fails, none is applied.

| Command | Reads inside the transaction | Writes inside the transaction |
|---|---|---|
| `org.create` | `handleReservations/{handle}` (must not exist) | reservation, organization, directory entry, `settings/main`, Owner `members/{uid}`, `users/{uid}/memberships/{orgId}`, first warehouse, audit |
| `team.acceptInvitation` | invitation, existing membership | invitation → ACCEPTED, membership, user mirror, audit, receipt |
| `team.changeMemberRole` / `setMemberStatus` | target membership, organization (to protect the canonical Owner) | membership, user mirror, audit, notification |
| `product.create` | `productSkuIndex/{skuNorm}` (must not exist) | product, sku index, zeroed summary, audit, receipt |
| `product.update` | product, old + new sku index, summary, **`Q-079` that product's balances (`IDX-09`, `limit(100)`)** | product, sku index delete+create if the SKU changed, summary `stockValueMinor` recomputed if the cost changed, **summary DV-10 fields**, **each balance's DV-11 fields**, audit |
| `product.setStatus` | product, summary, **`Q-079` that product's balances** | product, summary `stockStatus` + `productStatus`, **each balance's `productStatus`**, audit |
| `warehouse.archive` | `Q-056` `limit(1)`, `Q-057` `limit(1)` | warehouse → ARCHIVED, audit |
| `stock.recordOpeningBalance` | receipt, product, warehouse, balance, summary | movement, balance, summary, audit, receipt |
| `stock.adjust` | receipt, product, warehouse, balance, summary | movement, balance, summary, audit, receipt, notifications on transition |
| **`stock.transfer`** | **receipt, product, 2 warehouses, 2 balances** | **2 movements (paired), 2 balances, audit, receipt — 6 documents; summary deliberately untouched** |
| `po.order` | receipt, PO, all items, supplier, every referenced product, counter | counter, PO (ORDERED + `orderNumber` + snapshots frozen), items, history, audit, receipt |
| `po.receive` | receipt, PO, affected items, warehouse, balances, summaries | one movement per line, balances, summaries, item quantities, PO status, history, audit, receipt, notifications |
| `connection.request` | canonical connection (must not exist or be REJECTED/DISABLED), both directory entries | canonical, both projections, audit ×2, notification, receipt |
| `connection.respond` / `disable` | canonical connection | canonical, both projections, audit ×2, notification, receipt |
| `mapping.create` | receipt, connection (ACTIVE), buyer product (ACTIVE), supplier catalog item (published), duplicate check | mapping VERIFIED, audit, receipt |
| `cpo.draftSave` | connection (ACTIVE), every mapping (VERIFIED), every product (ACTIVE) | buyer draft PO + items — **upsert, last write wins** |
| `category.archive` | **`Q-072` `limit(1)`** — ACTIVE products referencing the category | category → ARCHIVED, audit |
| `warehouse.setDefault` | `settings/main`, target warehouse (must be ACTIVE) | `settings.defaultWarehouseId`, audit |
| `cpo.submit` | receipt, buyer draft + items, connection, every mapping, every supplier catalog item, counter | canonical + items (snapshots frozen), **both** projections, history ×3, audit ×2, notification, receipt |
| `cpo.respond` | receipt, canonical PO, connection | canonical, both projections, history, audit ×2, notification, receipt |
| `cpo.ship` | receipt, canonical PO, supplier balances and summaries for every line | supplier movements, supplier balances, supplier summaries, canonical → SHIPPED, both projections, history, audit, notification, receipt |
| `cpo.receive` | receipt, canonical PO, buyer balances and summaries, warehouse | buyer movements, buyer balances, buyer summaries, canonical quantities + status, both projections, history, audit, notification, receipt |

---

## 7. Typed error model

Callables surface `HttpsError.code` and `details` to the client SDK, which is what makes the typed error
model work end to end. **A raw Firebase error code never reaches the user interface.**

| `HttpsError` code | Reason codes |
|---|---|
| `unauthenticated` | `NOT_SIGNED_IN` |
| `invalid-argument` | `SCHEMA_INVALID`, `SAME_WAREHOUSE`, `INVALID_QUANTITY`, `INVALID_FACTOR`, `SELF_CONNECTION` |
| `permission-denied` | `NOT_A_MEMBER`, `MEMBERSHIP_NOT_ACTIVE`, `ROLE_NOT_PERMITTED`, `CROSS_TENANT_REFERENCE`, `OWNER_PROTECTED`, `INVITE_EMAIL_MISMATCH` |
| `failed-precondition` | `INVALID_TRANSITION`, `INSUFFICIENT_STOCK`, `OVER_RECEIPT`, `PRODUCT_NOT_ACTIVE`, `WAREHOUSE_NOT_ACTIVE`, `WAREHOUSE_HAS_STOCK`, `WAREHOUSE_HAS_OPEN_RECEIPT`, `OPENING_BALANCE_ALREADY_RECORDED`, `CONNECTION_NOT_ACTIVE`, `CATALOG_ITEM_NOT_PUBLISHED`, `MAPPING_EXISTS`, `SEMANTIC_NOT_CONFIRMED`, `INVITE_EXPIRED`, `INVITE_NOT_PENDING`, `OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD` |
| `already-exists` | `HANDLE_TAKEN`, `SKU_TAKEN`, `CONNECTION_EXISTS` |
| `not-found` | `RESOURCE_NOT_FOUND`, `INVITE_UNKNOWN`, `SKU_NOT_FOUND` |
| `resource-exhausted` | `NOTIFICATION_FANOUT_EXCEEDED` (logged, command still succeeds) |

---

## 8. Cost and abuse guardrails

`maxInstances: 10` on every function · 256 MiB / 60 s · authenticated-only, no unauthenticated write path
anywhere · every in-transaction query bounded · notification fan-out capped at 50 · no App Check in A/B
(documented next step; every callable still enforces membership and role, so the blast radius of a stolen
ID token is limited to what that user could already do in the UI).

**Cold starts** of 1–3 s are expected on the first call after idle. Submitting controls stay disabled for
the duration; the demo is preceded by a warm-up script rather than paid `minInstances`.

---

## 6.2 A3R-12 — transaction-boundary rows added to §6

The adversarial pass on A3 found that **five** commands A3 created or made transactional had **no row**
in §6, whose stated contract is *"each row is one atomic unit"*. All five are added below, and
`stock.transfer`'s existing row is amended for `A3R-05`. `TRANSACTION_COVERAGE = 100%`.

Added (five) and amended (one):

| Command | Transaction boundary — the complete write set |
|---|---|
| **`C-02 org.updateSettings`** | `organizations/{orgId}` · `organizations/{orgId}/settings/main` · **`organizationDirectory/{handle}`** · `auditLogs/{auditId}` · `commandReceipts/{operationId}` — **5 documents, one transaction.** The catalog's `T` column is corrected from `–` to `✔`. |
| **`C-35b category.restore`** | `categories/{categoryId}` · `auditLogs` · `commandReceipts` — 3 documents. |
| **`C-37 warehouse.restore`** | `warehouses/{warehouseId}` · `auditLogs` · `commandReceipts` — 3 documents. Precondition `status == 'ARCHIVED'`. |
| **`C-38 partner.setStatus`** | reads **`Q-080`** (`purchaseOrders where privateSupplierId == P and status in [ORDERED, PARTIALLY_RECEIVED, ACCEPTED, SHIPPED] limit(1)`, index `IDX-26`, DB-04 §8) **inside** the transaction; writes `privatePartners/{partnerId}` · `auditLogs` · `commandReceipts` — 3 documents. Refuses with `failed-precondition` if the guard returns a row. |
| **`po.cancel`** | gains `privatePartners/{partnerId}` (`ordersPlacedCount` −1, DV-13) to its existing set. |
| **`stock.transfer`** | **6 → 7 documents**: two movements, two balances, **`productStockSummaries/{productId}` (`stockValueMinor` only, per `INV-27`)**, audit, receipt. `onHandMilli` on the summary is still untouched, so `INV-04` and the quantity half of `INV-23` remain structural. |

**`product.update` — the derived-field rule, stated completely (A3R-18).** A change to
`purchaseCostMinor` recomputes `stockValueMinor` at **both** grains. A change to `minimumStockMilli`
recomputes **`stockStatus` and `shortfallMilli` at both grains** — the summary's, not only the balances',
because `Q-021a`/`Q-021b` and `IDX-46` read them from the summary. Both changes fan out to that product's
balances through `Q-079`.

**`Q-079`'s `limit(100)` is made provably complete (A3R-18).** Truncation used to cost a stale display
label; after DB-CR-025 it would leave stale `stockValueMinor` and `stockStatus` on the untouched rows,
breaking `INV-26` and `INV-27` permanently with no repair path, because DB-07 §12 forbids a scheduled
reconciler. **`warehouse.create` therefore refuses beyond 100 ACTIVE warehouses per organization**
(`failed-precondition`, `T-CMD-40`). The fanout is then bounded by a quantity the system itself bounds,
and `limit(100)` can never truncate. The canonical workspace has two.

---

## 8.9 A3 — command-catalog corrections

**`C-37 warehouse.restore` is added** (A3 · DB-CR-033). `ARCHIVED → ACTIVE` was declared legal and
*"always permitted"* by DB-07 §4 and DB-01 §8 with **no execution path**, and DB-02 §4.2 and DB-05 §4
contradicted each other about whether a client may set `status`. `C-37` mirrors `C-35b category.restore`
exactly: caller `INVENTORY_WRITERS` (Owner, Admin, Inventory Manager), transactional, audited,
idempotent on `operationId`, precondition `status == 'ARCHIVED'`, result `status = 'ACTIVE'`.
A client may **not** change `warehouses/{id}.status` in either direction.

**`C-02 org.updateSettings` becomes transactional** (A3 · DB-CR-032). It had no write set in §6 at all
while needing to write two or three documents, and `organizationDirectory/{handle}` — a projection
carrying `name`, `industry`, `country` — was documented as written *only* by `org.create`, so renaming
the organization silently staled the public directory. Write set:
`organizations/{orgId}` + `organizations/{orgId}/settings/main` + `organizationDirectory/{handle}` +
`auditLogs`. Added to **DV-08**'s owner list. `currency` and `timezone` now live only on `settings/main`.

**`C-01 org.create` creates `counters/purchaseOrder`** (A3 · DB-CR-034). Frozen `FORM-005`'s submit
outcome names *"…settings, **counter**, and first warehouse creation"*; `Q-068` reads the counter and
`po.order` increments it — and the write set never created it. Added, `{ value: 0 }`. `po.order` and
`cpo.submit` additionally upsert with `value: 0` when absent, as defence in depth.

**Counter maintenance on `privatePartners`** (A3 · DB-CR-035, corrected by A3R-11). `po.order` increments
`ordersPlacedCount`; `po.cancel` decrements it, so it counts **non-cancelled** orders placed.
**`openOrdersCount` does not exist** — the archive guard is `C-38 partner.setStatus`'s in-transaction
`limit(1)` query, which cannot drift and cannot strand a supplier behind a counter that never reaches
zero. `cpo.submit` increments the
connection projection's `ordersPlacedCount` in the transaction that already writes both projections
(`INV-19`).

**Snapshot writes** (A3 · DB-CR-031, DB-CR-036). `po.receive`, `cpo.receive` and `cpo.ship` write
`sourceReferenceSnapshot` onto the movement from the order number already in the transaction.
`partnerCatalog.publish` writes `internalProductNameSnapshot` / `internalSkuSnapshot`;
`mapping.create` / `mapping.verify` write `buyerProductNameSnapshot`, `buyerSkuSnapshot` and
`semanticConfirmedByName`. All are DV-09-class snapshots on create: no fanout, no drift obligation.

**Derived-field maintenance** (A3 · DB-CR-025, DB-CR-028). Every command that writes a `stockBalances`
document also writes that row's `stockValueMinor`, `stockStatus` and `shortfallMilli`; every command that
writes a `productStockSummaries` document also writes its `shortfallMilli`. Computed from fields already
on the row inside the transaction already writing it — **zero additional reads, zero additional writes,
no new fanout.** `product.update` / `product.setStatus` already fan out to that product's balances
(`Q-079`, `IDX-09`, `limit(100)`); they now recompute these three values in the same pass.

---

## 9. Contract result

```
COMMAND_COVERAGE      = 100%   over the Release A/B surface (A3 · F-M-16, A3R-13)
                               38 A/B callables: C-01…C-31, C-33, C-34, C-35a, C-35b,
                               C-36, C-37, C-38.  C-35 no longer exists as an id.
                               +2 declared-inert Release C (C-32), excluded from the
                               denominator: they map to no UI mutation in Release A/B.
ACTIVE_COMMAND_IDS    = 38     mechanically counted at A3R-P from the §1 catalog:
                               C-01…C-31 (31) + C-33, C-34, C-35a, C-35b, C-36, C-37, C-38 (7).
                               C-32 is declared-inert Release C and is not in the denominator.
COMMANDS_ADDED_BY_A2  = 0      (the external review is resolved by removing fields and
                                tightening rules, not by adding backend surface)
COMMANDS_ADDED_BY_A3R_P = 0    (A3R-P is a propagation pass; it defines no new command. Q-080,
                                the C-38 guard, was always this command's query — only its id
                                was undefined.)
TRANSACTION_COVERAGE  = 100%   (every command with a multi-document effect has a §6 row;
                                A3R-12 added the five that were missing)
IDEMPOTENT_COMMANDS = 17   (A3 · F-M-01 — corrected from 13; the catalog marks 17)     (all stock-, receipt- and cross-tenant-affecting commands)
HTTP_ENDPOINTS        = 0
FIRESTORE_TRIGGERS    = 0
PARTIAL_STATE_PATHS   = 0
UNBOUNDED_FANOUTS     = 0      (was 1 — the category-rename fanout DV-10 described against a
                                command that did not exist; deleted by DB-CR-016)
```
