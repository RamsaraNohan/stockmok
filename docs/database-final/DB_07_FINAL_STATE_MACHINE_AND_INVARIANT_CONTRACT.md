# DB-07 — FINAL STATE MACHINE AND INVARIANT CONTRACT

**Status:** FROZEN. Every persistent state machine, every legal and forbidden transition, and every
non-negotiable system invariant.
**Implementation rule:** each machine is a **transition table in shared code**, unit-tested, and consulted
by `defineCommand()` step 7 — so an illegal transition is rejected in **one** place rather than in each
command.

```ts
type Transition<S, A> = { from: S; action: A; to: S; actor: ActorRule; guard?: Guard }
canTransition(machine, from, action, ctx) -> Result<to, 'INVALID_TRANSITION'>
```

## 0. Universal rules

- A transition not present in a table is **forbidden**. There is no default-allow branch.
- A correctly authorized user performing a forbidden transition is still rejected (`06` §4, last clause).
- Every transition writes its audit row and, where the entity has one, its history row, **inside the same
  transaction as the state change**.
- Terminal states have no outbound transition and no UI action; the control is **absent**, not disabled.
- Stale submissions re-read current state inside the transaction and are rejected, never merged.

---

## 1. Membership

| From | Action | To | Actor | Guard |
|---|---|---|---|---|
| *(invitation ACCEPTED)* | accept | `ACTIVE` | matching authenticated invitee | email matches `emailNormalized` |
| `ACTIVE` | suspend | `SUSPENDED` | `ADMINS` | target is **not** the canonical Owner |
| `SUSPENDED` | reactivate | `ACTIVE` | `ADMINS` | target is not the canonical Owner |
| `ACTIVE` \| `SUSPENDED` | remove | `REMOVED` | `ADMINS` | target is not the canonical Owner |

**Terminal:** `REMOVED` — no restore action exists.
**Forbidden:** any transition targeting the canonical Owner (`organizations/{orgId}.ownerUid`); a
self-suspension that would leave the organization ownerless; creating a second `OWNER`.
**Side effects:** `users/{uid}/memberships/{orgId}` is written in the same transaction (`INV-20`), plus a
notification to the affected member and an audit row.

## 2. Invitation

| From | Action | To | Actor |
|---|---|---|---|
| *(none)* | create | `PENDING` | `ADMINS` |
| `PENDING` | accept | `ACCEPTED` | matching authenticated invitee |
| `PENDING` | expire | `EXPIRED` | system — **evaluated on read**, never by a scheduled job |
| `PENDING` | revoke | `REVOKED` | `ADMINS` |

**Terminal:** `ACCEPTED`, `EXPIRED`, `REVOKED`.
**Guards:** single-use; 7-day expiry; bound to one organization and one normalised email; only the
SHA-256 `tokenHash` is stored and the raw token is returned exactly once and never logged; the invited
role may never be `OWNER`.
**Idempotency:** accepting twice returns the same result; accepting when already an ACTIVE member
succeeds without creating a duplicate membership (`FR-TEAM-011`).
**Distinct failures, all tested:** `INVITE_EMAIL_MISMATCH` · `INVITE_EXPIRED` · `INVITE_NOT_PENDING` ·
`not-found`. They are never collapsed into one message.

## 3. Product and Category

| Entity | From | Action | To | Actor | Guard |
|---|---|---|---|---|---|
| Product | `ACTIVE` | archive | `ARCHIVED` | `INVENTORY_WRITERS` | – |
| Product | `ARCHIVED` | restore | `ACTIVE` | `INVENTORY_WRITERS` | – |
| **Category** | `ACTIVE` | archive | `ARCHIVED` | `INVENTORY_WRITERS` | **backend command only (DB-CR-012)** — no ACTIVE product may reference it. The frozen design blocks category archive *"by physical truth rather than by permission"*, and that check is an unbounded query a rule cannot express. |
| **Category** | `ARCHIVED` | restore | `ACTIVE` | `INVENTORY_WRITERS` | always permitted |

**Consequences:** an archived product is excluded from new purchase orders and new mappings, hidden from
active lists by default and visible under the archived filter. **Historical movements and purchase-order
snapshots remain intact and visible** — a line always renders from its own snapshot.
**Forbidden:** hard delete, by anyone, at any layer.
**Immutability:** `baseUnit` may not change once any movement exists for the product.

## 4. Warehouse

| From | Action | To | Actor | Guard |
|---|---|---|---|---|
| `ACTIVE` | archive | `ARCHIVED` | `INVENTORY_WRITERS` | **backend command only** — every balance for that warehouse is zero **and** no open receiving workflow targets it |
| `ARCHIVED` | restore | `ACTIVE` | `INVENTORY_WRITERS` | always permitted |

Both guards are unbounded queries that Security Rules cannot express, which is why rules explicitly deny
a client setting `status: 'ARCHIVED'` and why the checks run as `.limit(1)` queries **inside** the
archiving transaction — stock added concurrently cannot slip past them.
The **default warehouse** may not be archived while it holds that status.
**A1 consequence:** the frozen archive refusal offers *"Transfer this stock"*, which is now a real action
(`SCREEN-053`) rather than a dead end.

## 5. Private partner

`PartnerStatus = ACTIVE | DEACTIVATED`. `ACTIVE ↔ DEACTIVATED` is performed **only** by
**`C-38 partner.setStatus`** (`PARTNER_WRITERS`), which runs the open-order guard `Q-080` **inside its own
transaction**; `status` is **not** in the client-write allowlist on `privatePartners` (A3R-11 — §12 below
records the three defects that ruled out the client-write form). The UI words map onto the stored enum:
**archive → `DEACTIVATED`**, **restore → `ACTIVE`**. `ARCHIVED` is **never** persisted as a private-partner
status (A3R-P2 · C1-AUTH-004); it belongs to `LifecycleStatus`, which governs products, categories and
warehouses. A private partner also carries the bounded array `partnerTypes: ('SUPPLIER'|'BUYER')[]`
(≥ 1, ≤ 2 — DB-02 §5.1), never a singular `kind`, so one record can be both supplier and buyer.
A deactivated supplier is unavailable to new purchase orders; history is retained.
**Forbidden:** hard delete. *(The A1-era line "No side effects, so it needs no command and is a client
write" is **SUPERSEDED** by A3R-11; `C-38`'s authorization and guard semantics are unchanged here.)*

## 6. Connection

```text
(none) ──request──▶ PENDING ──accept──▶ ACTIVE ──disable──▶ DISABLED
                       └────reject────▶ REJECTED
REJECTED | DISABLED ──request──▶ PENDING        (a fresh request may be raised)
```

| From | Action | To | Actor |
|---|---|---|---|
| *(none)* \| `REJECTED` \| `DISABLED` | request | `PENDING` | `PARTNER_WRITERS` of the **buyer** |
| `PENDING` | accept | `ACTIVE` | `PARTNER_WRITERS` of the **supplier** |
| `PENDING` | reject | `REJECTED` | `PARTNER_WRITERS` of the **supplier** |
| `ACTIVE` | disable | `DISABLED` | **`ADMINS` only** — Procurement Manager cannot disable |

**Forbidden:** a duplicate request while `PENDING` or `ACTIVE` (prevented structurally by
`txn.create` on the deterministic id `{buyerOrgId}__{supplierOrgId}`); self-connection; **re-enable** —
there is no reconnect button, flow, command or reactivation feature, and the disabled record says so
plainly with no action.
**Direction matters:** a reverse relationship is a separate document, so two businesses can be each
other's supplier without ambiguity.
**`DISABLED` blocks new mappings and new connected POs but leaves every historical mapping, purchase
order and stock movement intact and readable by the legitimate parties** (`SC-17`).

## 7. Mapping

| From | Action | To | Actor |
|---|---|---|---|
| *(created, backend-validated)* | create | `VERIFIED` | `PARTNER_WRITERS` of the **buyer** |
| `VERIFIED` | disable | `DISABLED` | `PARTNER_WRITERS` of the buyer |

**Terminal:** `DISABLED`. **`PENDING` and `REJECTED` are B-PLUS and must never appear as a mapping
status pill.**

Server re-validates, in this order, refusing to trust any of it from the client:

1. caller is an ACTIVE member of `buyerOrgId` with a `PARTNER_WRITERS` role;
2. `connections/{connectionId}` exists, `status == 'ACTIVE'`, and its `buyerOrgId` is the caller's org;
3. the buyer product exists, belongs to the buyer org, and is `ACTIVE`;
4. the supplier catalog item exists under that connection's `supplierOrgId`, is `published`, and its
   `partnerSkuNormalized` equals the normalised typed SKU — **the typed SKU is only ever a lookup key,
   never the stored link** (`BR-008`, `FR-NET-014`);
5. `semanticConfirmed === true` — **a valid SKU alone is not sufficient** (`BR-009`);
6. `supplierToBuyerBaseFactorMilli > 0`;
7. no existing `VERIFIED` mapping already links this buyer product to this supplier item.

Seven refusal states, all drawn: no active connection · SKU not found · item not published · semantic
match declined · invalid factor · connection went stale before submit · duplicate mapping.

## 8. Private purchase order

```text
DRAFT ──order──▶ ORDERED ──receive──▶ PARTIALLY_RECEIVED ──receive──▶ RECEIVED
  │                 │                        └──receive──▶ PARTIALLY_RECEIVED
  └──cancel──▶ CANCELLED ◀──cancel── (only while receivedTotal == 0)
```

| From | Action | To | Guard |
|---|---|---|---|
| `DRAFT` | order | `ORDERED` | ≥ 1 valid line; supplier ACTIVE; every product ACTIVE; `orderNumber` allocated from the counter; **snapshots frozen** |
| `DRAFT` | cancel | `CANCELLED` | – |
| `ORDERED` | cancel | `CANCELLED` | **only while `receivedTotal == 0`** |
| `ORDERED` | receive | `PARTIALLY_RECEIVED` \| `RECEIVED` | `0 < receive ≤ outstanding`, per line |
| `PARTIALLY_RECEIVED` | receive | `PARTIALLY_RECEIVED` \| `RECEIVED` | same |

**Terminal:** `RECEIVED`, `CANCELLED`.
**Forbidden and never displayed:** `SUBMITTED`, `ACCEPTED`, `REJECTED`, `SHIPPED` — an external private
supplier is not a Stockmok user and cannot perform an in-platform action. The UI must never show an
in-platform "Supplier Accepted" state for a private supplier.
**Forbidden:** cancellation after any receipt (`INVALID_TRANSITION`); editing after `ORDERED`;
over-receipt (`OVER_RECEIPT`).

## 9. Connected purchase order

```text
DRAFT ──submit──▶ SUBMITTED ──accept──▶ ACCEPTED ──ship──▶ SHIPPED
  │                  │ └──reject──▶ REJECTED                  │
  └─cancel─▶ CANCELLED ◀──cancel──┘                           ▼
                                        PARTIALLY_RECEIVED ⇄ (more receipts)
                                                    └──▶ RECEIVED
```

| From | Action | To | Actor |
|---|---|---|---|
| `DRAFT` | submit | `SUBMITTED` | buyer `PO_WRITERS` |
| `DRAFT` | cancel | `CANCELLED` | buyer `PO_WRITERS` |
| `SUBMITTED` | accept | `ACCEPTED` | **supplier** `PO_WRITERS` |
| `SUBMITTED` | reject | `REJECTED` | supplier `PO_WRITERS` |
| `SUBMITTED` | cancel | `CANCELLED` | buyer `PO_WRITERS` |
| `ACCEPTED` | ship | `SHIPPED` | supplier `PO_WRITERS` |
| `SHIPPED` | receive | `PARTIALLY_RECEIVED` \| `RECEIVED` | buyer `RECEIVERS` |
| `PARTIALLY_RECEIVED` | receive | `PARTIALLY_RECEIVED` \| `RECEIVED` | buyer `RECEIVERS` |

**Terminal:** `RECEIVED`, `REJECTED`, `CANCELLED`.
**Forbidden and non-existent:** `PARTIALLY_SHIPPED` (`BR-020`); cancellation after `ACCEPTED`
(`FR-CPO-004`); a buyer performing a supplier transition or vice-versa; a third organization reading the
order at any path.
**Guards on every transition:** an ACTIVE connection re-read **inside** the transaction; the actor's
organization matching the correct side of the canonical record; snapshots immutable after `SUBMITTED`.
**Buyer stock is unchanged at `SHIPPED`.** Outstanding is tracked in supplier order units.

## 10. Stock — the ledger has no state machine, and that is the point

`StockMovement` has exactly one state: **written**. It is immutable and append-only forever. There is no
edit, no void, no reversal flag and no archive — not even a disabled control. **A wrong entry is answered
with a new entry carrying a reason**, which is why every correction is itself a movement.

`stock.transfer` is the only stock operation that writes **two** movements. They are created together,
share one `transferId`, and neither can exist without the other.

---

## 11. Invariants

Non-negotiable. `INV-01 … INV-21` are inherited verbatim from `05` §8; `INV-22 … INV-24` are added by
amendment A1; **`INV-26` is added by A3 · DB-CR-025 and `INV-27` by A3R-05**; **`INV-25` is WITHDRAWN**
by A3 · DB-CR-027 with the `warehouseName` field it policed. The number `INV-25` is a **tombstone** and is
never reused — the set is not renumbered to make the count tidy.

```
ACTIVE_INVARIANT_IDS = 26   INV-01…INV-24 (24 active) − INV-25 (withdrawn) + INV-26 + INV-27
                            Mechanically enumerated at A3R-P from the rows below.
```

| ID | Invariant |
|---|---|
| INV-01 | A `StockMovement` belongs to exactly one organization, product and warehouse. |
| INV-02 | A `StockMovement` is immutable once written. |
| INV-03 | `StockBalance.onHandMilli` equals the signed sum of movements for that product **and** warehouse — **exactly**, because quantities are integers. |
| INV-04 | `ProductStockSummary.onHandMilli` equals the sum of that product's balances. |
| INV-05 | Every stock mutation has an `operationId` and a `CommandReceipt`. |
| INV-06 | Replaying an `operationId` with an identical payload creates no duplicate effect; replaying with a different payload is rejected. |
| INV-07 | A `VERIFIED` mapping resolves to a stable buyer Product and a stable supplier `PartnerCatalogItem`. |
| INV-08 | A connected purchase order requires an ACTIVE connection at creation **and** at submission. |
| INV-09 | Connected purchase-order line snapshots are immutable after `SUBMITTED`. |
| INV-10 | Supplier SHIP changes supplier inventory only. |
| INV-11 | Buyer RECEIVE changes buyer inventory only. |
| INV-12 | Received quantity never exceeds outstanding quantity. |
| INV-13 | Public and partner projections contain only explicitly copied, allow-listed fields. |
| INV-14 | A connection grants no access to private tenant data. |
| INV-15 | Historical references remain resolvable after archive or disable. |
| INV-16 | A public handle resolves to exactly one organization. |
| INV-17 | A `PartnerCatalogItem.orderUnit` equals its source product's `baseUnit`. |
| INV-18 | `stockValueMinor == roundHalfUp(onHandMilli × purchaseCostMinor / 1000)` at all times, including after a cost change. |
| INV-19 | A connected purchase order's canonical record and both projections always agree on status and quantities, because all three are written in one transaction. |
| INV-20 | `users/{uid}/memberships/{orgId}` always agrees with `organizations/{orgId}/members/{uid}`. |
| INV-21 | No client can delete any document in any collection. |
| **INV-22** | **A `TRANSFER_OUT` exists if and only if exactly one `TRANSFER_IN` shares its `transferId`, with equal absolute quantity, the same product, the same unit, and different warehouses.** |
| **INV-23** | **A transfer leaves `ProductStockSummary.onHandMilli`, `availableMilli` and `stockStatus` unchanged.** *(A3R-05: `stockValueMinor` is removed from this list — see `INV-27`. The summary **is** written by `stock.transfer`, for that one field only; write set 6 → 7 documents. `onHandMilli` is still structurally unchanged, so `INV-04` still holds by construction — which was the invariant's purpose.)* |
| **INV-27** | **A3R-05 — one rounding point.** For every product, `ProductStockSummary.stockValueMinor == Σ` of that product's `stockBalances.stockValueMinor`. Value is rounded **once, at the balance grain**, and every higher total is an exact integer sum of those roundings. Consequently `Q-053` (Inventory Value KPI) `== Σ Q-060` over all ACTIVE warehouses, **exactly**, which is what `24` `CHART-002` requires. |
| **INV-24** | **`StockMovement.balanceAfterMilli` equals the `StockBalance.onHandMilli` of that movement's own product-and-warehouse immediately after the movement was applied.** |

`INV-03`, `INV-04`, `INV-06`, `INV-10`, `INV-11`, `INV-18`, `INV-19`, `INV-20`, `INV-22`, `INV-23`,
`INV-24`, **`INV-26`** and **`INV-27`** are asserted after **every** command in the randomised property
test `T-INT-03` (DB-08 §6.1). They are not documentation; they are executable. **`INV-26` and `INV-27` are
executable obligations, not prose** — `INV-26` because three same-document derivations are exactly the
class a careless fanout silently breaks, and `INV-27` because a single-minor-unit rounding divergence
between `Q-053` and `Σ Q-060` is invisible to every test that does not assert it.

**A3 · DB-CR-027 — `INV-25` is withdrawn** with the `warehouseName` field it policed (§12). The property
test drops that assertion and gains **`INV-26`**: *for every `stockBalances` document,
`stockValueMinor == roundHalfUp(onHandMilli × baseUnitPriceMinor / 1000)`,
`stockStatus == deriveStockStatus(onHandMilli, minimumStockMilli)` and
`shortfallMilli == max(0, minimumStockMilli − onHandMilli)`* — three same-document derivations that
cannot drift, asserted after every command exactly as the others are.

**Invariant count — recounted mechanically at A3R-P: 26.** The figure that stood here was **25**, which
was correct at A3 and became wrong the moment `A3R-05` added **`INV-27`**. `INV-01 … INV-24` are active
(24), `INV-25` is withdrawn, `INV-26` and `INV-27` are active: **24 + 2 = 26**
(`INV-01…INV-24`, `INV-26`, `INV-27`; `INV-25` a preserved tombstone).

---

## 11.1 A3 — new derived-data contracts

| DV | Field | Source of truth | Owner / trigger | Atomicity | Rebuild |
|---|---|---|---|---|---|
| **DV-12** | `connections/{id}.ordersPlacedCount` (tenant projection) | `connectedPurchaseOrders` | `cpo.submit`, in the transaction that already writes both projections (`INV-19`) | same transaction | recount by `connectedPurchaseOrders where buyerOrgId == B and supplierOrgId == S` |
| **DV-13** | `privatePartners/{id}.ordersPlacedCount` | `purchaseOrders` | `po.order` **+1**; `po.cancel` **−1** | same transaction | `count()` `purchaseOrders where privateSupplierId == P and status != 'CANCELLED'` |

Both satisfy the §12 audit rule: host and source are written by the **same** transactional writer. Both
counter fields are **backend-write-only** even though the rest of `privatePartners` is
`SAFE_DIRECT_CLIENT_WRITE` — a client that could write its own counters could forge the archive guard.

**DV-11 is amended (A3 · DB-CR-025).** `stockValueMinor`, `stockStatus` and `shortfallMilli` on
`stockBalances`, and `shortfallMilli` on `productStockSummaries`, are derived **within the host document
from fields already on it**, by the writer already writing it. They are the strongest class in the
register: they cannot drift, because there is no second document to drift from. `warehouseName` — the one
DV-11 field that had a second document — is deleted (DB-CR-027).

---

## 11.2 A3 — warehouse restore now has an execution path

`ARCHIVED → ACTIVE` was declared legal and *"always permitted"* in §4 and DB-01 §8 with no command behind
it. **`C-37 warehouse.restore`** (DB-06 §8.9) closes it: `INVENTORY_WRITERS`, transactional, audited,
idempotent, precondition `status == 'ARCHIVED'`. DB-02 §4.2 and DB-05 §4 are aligned — a client may not
change `warehouses/{id}.status` in either direction. `UNSUPPORTED_ACTIONS = 0`.

**`InviteStatus.EXPIRED` is derived on read, and now says so** (A3 · F-M-05). §2 states expiry is
*"evaluated on read, never by a scheduled job"*, so the stored value stayed `PENDING` forever while
`Q-010` (`status == 'PENDING'`) kept returning expired rows into `TABLE-017` (*"Pending only"*) and the UI
drew an *Expired* pill for them. `Q-010` additionally filters **`expiresAt > now`**; the pill is derived;
and `team.acceptInvitation` / `team.revokeInvitation` write the terminal value lazily when they encounter
an expired document. The enum value is reachable. `UNREPRESENTED_BACKEND_STATES = 0`.

---

## 12. Derived-value register — DV-01 … DV-14

```
ACTIVE_DERIVED_CONTRACT_IDS = 14   DV-01 … DV-14, all active, none withdrawn.
                                   Mechanically enumerated at A3R-P.  SUPERSEDED HEADING: this
                                   section was headed "DV-01 ... DV-13" until A3R-P.  DV-14 was
                                   added at A3R-15 and the heading was never propagated — the
                                   defect class this pass closes.
```

**The audit rule this register exists to enforce:** *a derived field may only be denormalised from a
document written by the **same transactional writer** as its host.* Every entry below passes it. The two
that did not — `categoryName` and `preferredSupplierName` (DB-CR-016), and `warehouseName` (A3 ·
DB-CR-027) — are deleted, not documented.

### DV-11 — `stockBalances` derived and denormalised fields · **REWRITTEN AT A3**

| | |
|---|---|
| **Host** | `organizations/{orgId}/stockBalances/{productId}__{warehouseId}` |
| **Denormalised from `products/{productId}`** | `productName`, `internalSku`, `internalSkuNormalized`, `categoryId`, `productStatus`, `baseUnitPriceMinor`, `minimumStockMilli`, `productUpdatedAt` |
| **Derived within this row** | `stockValueMinor`, `stockStatus`, `shortfallMilli` |
| **Source of truth** | `products/{productId}` for the denormalised eight; **this document itself** for the derived three |
| **Writers** | `product.create` (no balances yet) · `product.update` · `product.setStatus` (both fan out via `Q-079`) · every stock command that creates or updates a balance |
| **Atomicity** | same transaction as the host write, always |
| **Rebuild** | re-read `products/{productId}`, rewrite the eight, recompute the three |
| **Audit rule** | **PASSES.** `products` is command-written; `stockBalances` is command-written; same writer. |

**`stockStatus`, `stockValueMinor` and `shortfallMilli` ARE persisted here.** DB-CR-018's contrary ruling
— *"persisting it would force a fanout across every warehouse of a product on every movement"* — is
**reversed** by DB-CR-025 and is void wherever it still appears in a superseded reading. A movement
changes `onHandMilli` on exactly one balance row (two for a transfer, which writes both regardless); all
three values derive from fields already on the row being written, inside the transaction already writing
it. Zero extra reads, zero extra writes.

**`warehouseName` is DELETED** (DB-CR-027). It was denormalised from `warehouses/{warehouseId}.name`, a
`SAFE_DIRECT_CLIENT_WRITE` document, into a command-written host — the exact violation this section's
audit rule forbids, and it rotted on any warehouse rename with no fanout to repair it. The
`TABLE-001`/`TABLE-013` *Warehouse* column renders from `Q-017`, already loaded by SCREEN-011 and
SCREEN-048 for their own **Store room** dropdown. The **movement ledger's** *Store room* column is served
instead by `warehouseNameSnapshot` on the movement (DV-14 below), which the canonical board independently
requires.

### DV-14 — `stockMovements` display snapshots · **NEW AT A3R-15**

| | |
|---|---|
| **Host** | `organizations/{orgId}/stockMovements/{movementId}` — **IMMUTABLE** |
| **Fields** | `productNameSnapshot`, `skuSnapshot`, `actorName`, `sourceReferenceSnapshot?`, **`warehouseNameSnapshot`**, **`counterpartWarehouseNameSnapshot?`** |
| **Written** | once, at create, from values already inside the transaction |
| **Drift** | **structurally impossible** — the host is immutable and is never rewritten |
| **Audit rule** | **PASSES**, and more strongly than any other entry: a snapshot on an immutable document has no maintenance obligation at all. |

The canonical Gate 6 board states the requirement in its own words, in the warehouse-archive copy:
*"An empty store room archives with a plain confirmation. **Its past movements keep the name, so old lines
still read correctly.**"* A ledger row must render the store-room name **as it was when the movement
happened** — which a join to the live `warehouses` document would get *wrong*, not merely expensively.
`counterpartWarehouseNameSnapshot` serves the transfer row's *"Transferred out · to Cold Room"*, which
`counterpartWarehouseId` alone cannot render.

### DV-12 · DV-13 — partner and connection counts

| DV | Field | Source of truth | Writer | Rebuild |
|---|---|---|---|---|
| **DV-12** | `connections/{id}.ordersPlacedCount` (tenant projection) | `connectedPurchaseOrders` | `cpo.submit`, in the transaction that already writes both projections (`INV-19`) | `count()` `connectedPurchaseOrders where buyerOrgId == B and supplierOrgId == S and status != 'CANCELLED'` |
| **DV-13** | `privatePartners/{id}.ordersPlacedCount` | `purchaseOrders` | `po.order` **+1**; `po.cancel` **−1** | `count()` `purchaseOrders where privateSupplierId == P and status != 'CANCELLED'` |

**A3R-11 — `openOrdersCount` is DELETED, and the archive guard is a command, not a field read.**
The first A3 pass made *"a supplier with an order still open cannot be archived"* depend on a maintained
`openOrdersCount` read by the client. Three defects, all fatal:

1. `privatePartners` is `SAFE_DIRECT_CLIENT_WRITE` and **no `partner.archive` command existed**. A field
   read performed by the client is not a guard; anything bypassing the UI archived freely.
2. The counter had an **unreachable zero**. Its decrements were `po.receive` on terminal receipt and
   `po.cancel`, and DB-06 §3.3 makes cancellation after any receipt an `INVALID_TRANSITION` — so a stalled
   `PARTIALLY_RECEIVED` order left the counter permanently ≥ 1 and the supplier permanently unarchivable.
3. `ordersPlacedCount` never decremented, so the dialog's *"N completed order"* counted cancelled orders.

Resolution: **`C-38 partner.setStatus`** (DB-06) performs archive/restore as a trusted command and runs
the guard **`Q-080`** (DB-04 §8) — `purchaseOrders where privateSupplierId == P and status in [ORDERED,
PARTIALLY_RECEIVED, ACCEPTED, SHIPPED] limit(1)`, index `IDX-26` — **inside its own transaction**. One read, on one
action, always correct, no drift and no stuck state. This was never an N+1 problem: the N+1 concern was
the *list column*, which `ordersPlacedCount` serves. `status` is removed from the client-write allowlist
on `privatePartners`, and `ordersPlacedCount` decrements on `po.cancel` so it counts **non-cancelled**
orders placed — which is what the board's *"Green Farm Poultry has 1 completed order"* means at the moment
the guard has just proven zero are open.

### DV-01 … DV-10 — unchanged by A3

Their entries stand as written in A2. Each was re-checked against the audit rule in this pass.

---

## 13. Known limits, stated honestly

1. **Per-product summary hotspot.** `productStockSummaries/{productId}` is written by every movement for
   that product. Irrelevant at coursework scale; the future path is sharded counters or a periodic
   rollup. `stock.transfer` avoids it entirely.
2. **Cross-tenant reads cost a function call.** Partner-catalog browsing is not realtime. Accepted trade
   for a provably safe boundary.
3. **Role lists are duplicated between `firestore.rules` and TypeScript.** Rules cannot import code.
   Mitigated by `T-SEC-17`.
4. **No App Check.** A stolen ID token could call callables directly; every callable still enforces
   membership and role, so the blast radius is what that user could already do.
5. **Audit is tamper-resistant, not tamper-evident.**
6. **Single region**, no failover.
7. **Cold starts** of 1–3 s after idle.
8. **`effectiveAt` back-dating** applies to opening balances only and never affects ordering or balance
   arithmetic; the ledger is ordered by `createdAt` alone.
