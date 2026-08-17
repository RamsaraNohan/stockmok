# COMMAND_CONTRACTS

**Derived from `DB_06` (command / transaction contract) and `DB_07` (state machines and invariants), with
amendment A3 applied. `DB_06` wins on any disagreement.**

Status: **FROZEN** at A3; propagated at **A3R-P2** (C1 implementation-discovery), 2026-08-17.
Implemented by: **Claude Code only.** Codex generates the request/response **types** and the client
**call wrappers**; it does not write a command body. Antigravity calls the wrappers.

## 0. The rule that this whole file exists to enforce

**The Admin SDK bypasses Firestore Rules.** A trusted command therefore protects nothing by existing
inside a Cloud Function. Every command re-checks, in its own body, in this order, **before any write**:

1. `auth` — a verified Firebase ID token is present
2. `organization` — the `orgId` in the payload exists
3. `membership` — the caller has a membership document in **that** organization
4. `membership status` — it is `ACTIVE`, not `SUSPENDED` or `REMOVED`
5. `role` — the caller's role is in the command's allowed set
6. `object ownership` — every referenced document belongs to that same `orgId`
7. `command inputs` — Zod-validated, including milli/minor integrality
8. `state transition` — the current state permits it, read **inside** the transaction
9. `cross-tenant relationship` — for connected commands, an `ACTIVE` connection exists **now**
10. `idempotency` — `commandReceipts/{operationId}` claimed with `txn.create`

**A command that skips step 5 because "the rules already check it" is a security defect.** The rules do
not run.

## 1. Envelope

```ts
interface CommandRequest<P> {
  orgId: string;
  operationId: string;   // UUID v4, client-generated, stable across retries of the SAME intent
  payload: P;
}

interface CommandResult<R> { ok: true;  data: R }
interface CommandError     { ok: false; code: ErrorCode; message: string; details?: unknown }

type ErrorCode =
  | 'unauthenticated' | 'permission-denied' | 'not-found' | 'failed-precondition'
  | 'invalid-argument' | 'already-exists' | 'aborted' | 'resource-exhausted' | 'internal';
```

### Idempotency — the exact shape

```
txn.create(organizations/{orgId}/commandReceipts/{operationId})
```

`create`, never `set`. A second call with the same `operationId` fails with `already-exists`, and the
handler returns the **stored result** rather than re-executing. The receipt is written **inside** the same
transaction as the effect, so a receipt without its effect is impossible.

**A new `operationId` per user intent, not per retry.** A retry of an interrupted "Receive 8 PACK" reuses
its id; a second, deliberate "Receive 8 PACK" is a different intent and gets a new one. `ATTACK-07` is the
first case; `ATTACK-08` is defended by the in-transaction state read, not by the receipt.

## 2. Roles

```ts
const ADMINS            = ['OWNER','ADMIN'];
const INVENTORY_WRITERS = ['OWNER','ADMIN','INVENTORY_MANAGER'];
const STOCK_WRITERS     = ['OWNER','ADMIN','INVENTORY_MANAGER','STOREKEEPER'];
const PARTNER_WRITERS   = ['OWNER','ADMIN','PROCUREMENT_MANAGER'];
const NOT_VIEWER        = ['OWNER','ADMIN','INVENTORY_MANAGER','PROCUREMENT_MANAGER','STOREKEEPER','ANALYST'];
```

`TRANSFER_WRITERS = INVENTORY_WRITERS` — **Storekeeper is excluded from transfer** and included in
adjust/receive. That asymmetry is deliberate and is tested (`T-XFER-12`, `T-SEC-24`).

## 3. The catalog — 38 Release A/B callables

`C-01…C-31`, `C-33`, `C-34`, **`C-35a`**, **`C-35b`**, `C-36`, **`C-37`**, **`C-38`**.
Plus **2 declared-inert Release C** callables (`C-32 storefront.publish` / `unpublish`) which are **not**
in the coverage denominator (A3 · F-M-16). **17** commands are idempotent (A3 · F-M-01).

`DB_06` §1 is the full table. The A3 deltas:

| Command | A3 change |
|---|---|
| **`C-38 partner.setStatus`** | **NEW (A3R-11).** `PARTNER_WRITERS`, transactional, audited. Archive/restore a private partner. Runs the guard **`Q-080`** (`purchaseOrders where privateSupplierId == P and status in [ORDERED, PARTIALLY_RECEIVED, ACCEPTED, SHIPPED] limit(1)`, index `IDX-26`, DB-04 §8) **inside the transaction** and refuses with `failed-precondition` if it returns a row. `status` is removed from the client-write allowlist on `privatePartners` — a guard the client evaluates is not a guard. |
| **`C-37 warehouse.restore`** | **NEW.** `INVENTORY_WRITERS`, transactional, audited, idempotent. Precondition `status == 'ARCHIVED'` → `'ACTIVE'`. Closes the legal-but-unexecutable transition. |
| `C-35a category.archive` / `C-35b category.restore` | **SPLIT** from one catalog row that was two callables. |
| `C-01 org.create` | Write set **gains `counters/purchaseOrder` `{ value: 0 }`**, matching frozen `FORM-005`. |
| `C-02 org.updateSettings` | **Now transactional.** Write set: `organizations/{orgId}` + `settings/main` + **`organizationDirectory/{handle}`** + audit. `currency`/`timezone` live only on `settings/main`. |
| `po.order` | `+1` to `privatePartners.ordersPlacedCount`. Upserts `counters/purchaseOrder` when absent. |
| `po.receive` | Writes `sourceReferenceSnapshot` and `warehouseNameSnapshot` onto the movement. |
| `po.cancel` | `−1 ordersPlacedCount`, so the counter tracks **non-cancelled** orders placed. |
| `cpo.submit` | `+1` to the connection projection's `ordersPlacedCount`, in the transaction that already writes both projections. |
| `cpo.ship` / `cpo.receive` | Write `sourceReferenceSnapshot` onto the movement. |
| every stock command | Also writes that balance row's `stockValueMinor`, `stockStatus`, `shortfallMilli`, and the summary's `stockStatus`, `shortfallMilli` and `stockValueMinor` (the latter as the **sum** of the product's balances, `INV-27`). Zero extra reads — same documents, same transaction. |
| `product.update` / `product.setStatus` | The existing `Q-079` fanout (`IDX-09`, `limit(100)`) now also recomputes the three derived balance fields **and** the summary's `stockStatus`/`shortfallMilli` when `minimumStockMilli` changes. `warehouse.create` refuses beyond **100 ACTIVE warehouses per organization**, so `limit(100)` can never truncate the fanout (A3R-18). |

## 4. Stock commands — the shape all of them share

Every material stock change is `TRUSTED_COMMAND_ONLY`. One transaction writes, atomically:

```
stockMovements/{movementId}          create   — immutable, never updated, never deleted
stockBalances/{p}__{w}               update   — onHandMilli + the three derived fields
productStockSummaries/{p}            update   — onHandMilli, stockStatus, stockValueMinor, shortfallMilli
commandReceipts/{operationId}        create   — idempotency
auditLogs/{auditId}                  create   — immutable
```

**A balance is never written without its movement.** A correction is a **new movement**, never an edit;
`adjustmentReason` is required on `ADJUSTMENT_IN` and `ADJUSTMENT_OUT` (**A3R-P2 · C1-AUTH-001** — the
persisted `MovementType` has no generic `ADJUSTMENT` value), and `note` is required when the reason is
`OTHER`.

**`C-13 stock.recordOpeningBalance` accepts `quantityMilli >= 0` — A3R-P2 · C1-AUTH-007, OWNER-APPROVED.**
Zero is accepted and creates the deliberate immutable zero opening-ledger entry: an `OPENING_BALANCE`
movement with signed quantity `0` and `balanceAfterMilli = 0`, its balance and summary rows, audit and
receipt. It is a *recorded* zero, not an uninitialized product, which is what makes the out-of-stock KPI
provable from the ledger (`DB_08` §2 — Cooking Oil). Unchanged: one opening balance per product **and**
warehouse pair, the immutable movement, the correct `balanceAfterMilli`, and the same auth / RBAC /
transaction / idempotency semantics and domain errors. `INVALID_QUANTITY` applies to `C-13` for a
**negative** quantity or precision > 3 dp — **never** for zero.
**Every other material stock command keeps its existing positive / non-zero requirement**, so the shared
`nonZeroQuantity` validator must not be wired into `C-13` (`DB_06` §3, §3.1).

**Value is rounded once, at the balance grain (`INV-27`).** The summary's `stockValueMinor` is the **sum**
of that product's balance values, never an independent `roundHalfUp(total × price)`. Two rounding points
make the dashboard's per-location bars disagree with the Inventory Value KPI on the same screen, by ±1
minor unit, after an operation (`stock.transfer`) that `INV-23` guarantees changes no total.

### `stock.transfer` — the exception that proves the model

**Seven** documents: **two** movements (`TRANSFER_OUT` + `TRANSFER_IN`, one `transferId`, equal absolute
quantity, `from != to`, same product, same unit), **two** balances, **the summary — `stockValueMinor`
only**, receipt, audit. The summary's `onHandMilli`, `availableMilli` and `stockStatus` are **not**
touched, so `INV-04` and the quantity half of `INV-23` still hold by construction. `stockValueMinor` is
written because re-splitting a quantity across two rounded balance values can move their sum by ±1
(`INV-27`) — the six-document version reported a changed org total after an operation that changes no
stock.
Same organization only. No cross-org path exists.

## 5. Connected commands — the ownership rule

| Transition | Who calls it | Whose stock moves |
|---|---|---|
| `SUBMITTED` | buyer | nobody |
| `ACCEPTED` / `REJECTED` | supplier | nobody |
| `SHIPPED` | supplier | **supplier's only** — the whole order, once |
| `PARTIALLY_RECEIVED` / `RECEIVED` | buyer | **buyer's only** |

**No multi-shipment.** The supplier ships the entire order in one action. Partial **receiving** exists;
partial **shipment** does not. A command that would write into the counterparty's inventory is not a bug
to be fixed at review time — it is architecturally unreachable, because each command writes only its own
tenant's `stockBalances` and the shared zone-4 record.

Every connected command re-reads `connections/{buyerOrgId}__{supplierOrgId}` **inside** the transaction
and aborts unless `status == 'ACTIVE'` — this is `ATTACK-09` (connection disabled between lookup and use),
and checking it before the transaction is not sufficient.

## 6. What each agent may and may not do

| | Codex | Claude Code | Antigravity |
|---|---|---|---|
| Request/response types, Zod schemas | **owns** | consumes | consumes |
| Client call wrapper | **owns** | – | consumes |
| Command body, validation, transaction | ✘ | **owns** | ✘ |
| Role checks | ✘ | **owns** | may hide UI, never rely on it |
| Firestore Rules | ✘ | **owns** | ✘ |
| Transition tables | scaffolds as data | **enforces** | may render |

**Antigravity hiding an action for a role is a courtesy, not a control.** The control is step 5 of §0 and
the corresponding rule. Both must exist for every gated action.
