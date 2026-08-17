# DB-01 — FINAL DATABASE IMPLEMENTATION BLUEPRINT

**Status:** FROZEN implementation authority for the Stockmok physical data platform.
**Governs:** tenancy, ownership, zones, identity, lifecycle, the client/backend boundary, transactions,
idempotency, audit, derived data, archival and implementation ownership.
**Derived from:** `05` domain contract · `06` security model · `11` Firebase architecture · `02` requirements ·
`03` scope · `04` acceptance · `07`/`18`–`23` UI authorities · `16` seed · `DB-00` amendment A1.
**Contains no production source.** Illustrative fragments only.

> **Purpose of this pack.** No implementation agent — Codex, Claude Code or Antigravity — may invent
> database behaviour. If a question about storage, ownership, authority, atomicity, query shape or
> failure semantics is not answered here or in DB-02 → DB-09, the correct action is to **stop and ask**,
> not to choose.

---

## 1. Platform facts and pending provisioning

Provisioned facts come from `FIREBASE_PROJECT_FACTS.md`, which is the newest control record and
outranks the *recommendations* in `11` §1 wherever a resource already exists.

| Item | Value | Status |
|---|---|---|
| Firebase project id | **`stockmok`** | PROVISIONED — supersedes the `stockmok-prod` name suggested in `11` §1 |
| Firestore database | `(default)`, Native mode, **Standard** edition | PROVISIONED |
| Firestore location | **`asia-southeast1`** (Singapore) | PROVISIONED · **immutable** · supersedes the `asia-south1` suggestion |
| Authentication | Email/Password + Google enabled; email-link disabled | PROVISIONED |
| Hosting site | `stockmokweb` → `stockmokweb.web.app`; `stockmok.com` purchased, DNS not connected | PARTIAL |
| Cloud Functions | not initialised | **PENDING_IMPLEMENTATION** |
| Functions region | **recommend `asia-southeast1`** — co-locate with Firestore to avoid a cross-region hop on every transaction | **PENDING_IMPLEMENTATION** |
| Functions generation / runtime | **2nd gen, Node 22** | **PENDING_IMPLEMENTATION.** Verified against current Firebase/Google Cloud runtime support: Node 22 is GA with deprecation 2027-04-30. **Node 20 passed deprecation on 2026-04-30 and must not be used.** |
| Billing plan | **Spark** | **PENDING_IMPLEMENTATION — the `ADM-009` Day-1 decision is still unmade.** Production Cloud Functions require Blaze. Recommend Blaze + a $5 budget with 50/90/100 % alerts + `maxInstances: 10`. |
| Cloud Storage | not required, not enabled | CORRECT — monograms replace logo upload |
| App Check | not configured | CORRECT for A/B; documented next step |
| Emulator Suite | not configured | **PENDING_IMPLEMENTATION** — Codex owns this (DB-09) |
| Authorized Auth domains | not verified | **PENDING_IMPLEMENTATION** — add `localhost`, `127.0.0.1`, `stockmokweb.web.app`, `stockmokweb.firebaseapp.com`, and `stockmok.com` once DNS is connected. A missing entry breaks Google sign-in **in production only**. |

**Nothing in this run provisioned, initialised, deployed or seeded anything.**

**If Blaze cannot be enabled**, apply the `03` §8 / `06` §8 P0 contingency unchanged: keep a fully
secure Release A by moving commands into client-side Firestore transactions behind substantially
strengthened rules, and cut Release B entirely. Do not weaken security to compensate. Under P0,
`stock.transfer` remains a single client transaction writing the identical document set with the same
guards — the transaction boundary in DB-06 does not change, only where it executes.

---

## 2. Tenancy model

One Firestore database. One tenant per **`organizationId`**, which is generated, immutable and the sole
tenant authority. A `handle` is routing and lookup context and **never** authorization (`BR-015`,
`FR-AUTH-008`).

Every private document path begins `organizations/{orgId}/`. This is load-bearing, not stylistic: it is
what allows every Security Rule to resolve membership with a single `get()` on the constant path
`organizations/{orgId}/members/{request.auth.uid}`, where `orgId` comes from the **matched path** and
never from document data.

> **The path-constancy rule.** No Stockmok Security Rule may ever `get()` or `exists()` a path derived
> from `resource.data`. Firestore allows at most 10 document access calls per single-document or query
> request (20 for multi-document reads, transactions and batched writes), and identical calls are
> cached. A constant-path read costs one cached call for a whole page; a data-derived read costs one
> call per candidate document and fails a 25-row page outright. Every cross-tenant authorization
> question in Stockmok — *"can this buyer read that supplier's catalog?"*, *"is this user a party to
> that shared order?"* — requires exactly the forbidden read, because a user may belong to several
> organizations and a rule cannot know which one they are acting for. **That is why zone 4 is closed to
> clients.** It is the reason the architecture has this shape, not a limitation worked around.

---

## 3. The four data zones

| Zone | Contents | Client read | Client write |
|---|---|---|---|
| **1 · Public projection** | `organizationDirectory/{handle}`, `storefrontCatalog/**` (C, not built) | `get` only — **`list` denied** | never |
| **2 · User-private** | `users/{uid}` and subcollections | that user only | whitelisted fields only |
| **3 · Organization-private** | `organizations/{orgId}/**` | ACTIVE members; further role-gated for invitations and audit | six narrow surfaces only (§6) |
| **4 · Cross-tenant canonical** | `connections/**`, `connectedPurchaseOrders/**`, `handleReservations/**` | **never** | **never** |

Zone 4 is surfaced to organizations through **backend-written projections inside zone 3**, or through
authorized callables. A projection is only ever written **inside the same transaction that writes its
canonical document**. There are no synchronisation jobs, no Firestore triggers and no reconciliation
scripts anywhere in this architecture: if the transaction commits the projections are correct, and if it
aborts nothing changed.

---

## 4. Canonical path registry

Authoritative and complete for Release A + B-Lite. Reproduced from `11` §5, which is the physical-path
authority, with amendment A1 applied. Field-level detail is DB-02.

```text
# ── ZONE 1 · PUBLIC ─────────────────────────────────────────────────────────
organizationDirectory/{handle}                          get: public · list: DENIED · backend write
storefrontCatalog/{handle}/items/{itemId}               [RELEASE C — NOT BUILT]

# ── ZONE 2 · USER-PRIVATE ───────────────────────────────────────────────────
users/{uid}                                             self read · self write (3 fields)
users/{uid}/memberships/{orgId}                         self read · backend write
users/{uid}/notifications/{notificationId}              self read · self update `read` only

# ── ZONE 3 · ORGANIZATION-PRIVATE ───────────────────────────────────────────
organizations/{orgId}                                   member read · backend write
organizations/{orgId}/settings/main                     member read · backend write
organizations/{orgId}/counters/{counterId}              NO CLIENT ACCESS
organizations/{orgId}/commandReceipts/{operationId}     NO CLIENT ACCESS
organizations/{orgId}/productSkuIndex/{skuNormalized}   NO CLIENT ACCESS
organizations/{orgId}/members/{uid}                     member read · backend write
organizations/{orgId}/invitations/{invitationId}        owner/admin read · backend write
organizations/{orgId}/categories/{categoryId}           member read · CLIENT WRITE (inventory writers)
organizations/{orgId}/warehouses/{warehouseId}          member read · CLIENT WRITE (not status→ARCHIVED)
organizations/{orgId}/products/{productId}              member read · backend write
organizations/{orgId}/stockBalances/{productId}__{warehouseId}   member read · backend write
organizations/{orgId}/productStockSummaries/{productId} member read · backend write
organizations/{orgId}/stockMovements/{movementId}       member read · backend write · IMMUTABLE
organizations/{orgId}/privatePartners/{partnerId}       member read · CLIENT WRITE (partner writers)
organizations/{orgId}/purchaseOrders/{poId}             member read · CLIENT WRITE only while PRIVATE+DRAFT
organizations/{orgId}/purchaseOrders/{poId}/items/{itemId}     same as parent
organizations/{orgId}/purchaseOrders/{poId}/history/{historyId} member read · backend write · IMMUTABLE
organizations/{orgId}/partnerCatalog/{catalogItemId}    member read (own org only) · backend write
organizations/{orgId}/productMappings/{mappingId}       member read (buyer org) · backend write
organizations/{orgId}/connections/{connectionId}        member read · backend write   (projection)
organizations/{orgId}/auditLogs/{auditId}               owner/admin read · backend write · IMMUTABLE

# ── ZONE 4 · CROSS-TENANT CANONICAL · NO CLIENT ACCESS AT ALL ───────────────
handleReservations/{handle}                             backend only
connections/{buyerOrgId}__{supplierOrgId}               backend only
connectedPurchaseOrders/{poId}                          backend only
connectedPurchaseOrders/{poId}/items/{itemId}           backend only
connectedPurchaseOrders/{poId}/history/{historyId}      backend only
```

**No path family may be relocated, added or removed without an owner-approved amendment.** A1 added no
path: transfer reuses `stockMovements` and `stockBalances`.

### 4.1 Deterministic identifiers

| Document | Identifier |
|---|---|
| `connections/{id}` | `{buyerOrgId}__{supplierOrgId}` — directional uniqueness enforced by Firestore's `create` precondition, not by application logic |
| `stockBalances/{id}` | `{productId}__{warehouseId}` — one balance per pair, structurally |
| `productStockSummaries/{id}` | `{productId}` |
| `productSkuIndex/{id}` | normalised SKU: uppercased, trimmed, internal whitespace collapsed |
| `handleReservations/{id}` | normalised handle: lowercase `[a-z0-9-]`, **3–30** chars (DB-CR-007) |
| `commandReceipts/{id}` | client-generated `operationId` (UUID v4) |
| `connectedPurchaseOrders/{poId}` and both org projections | the **same** `poId`, so all three reconcile by id in a test |
| `stockMovements/{id}` | generated; **`transferId`** links the two halves of a transfer |

Human-readable strings — SKU, order number, handle — are **never** primary identity.

---

## 5. Canonical ownership and projections

| Data | Canonical location | Projected copies | Written by |
|---|---|---|---|
| Organization identity | `organizations/{orgId}` | `organizationDirectory/{handle}`, `users/{uid}/memberships/{orgId}` | `org.create` |
| Handle uniqueness | `handleReservations/{handle}` | `organizationDirectory/{handle}` | `org.create` |
| Membership | `organizations/{orgId}/members/{uid}` | `users/{uid}/memberships/{orgId}` | team commands |
| Product | `organizations/{orgId}/products/{productId}` | `productSkuIndex`, `partnerCatalog` item | `product.*`, `partnerCatalog.*` |
| **Stock truth** | **`stockMovements` — the ledger** | `stockBalances` (per warehouse), `productStockSummaries` (per product) | stock commands only |
| Private PO | `organizations/{buyerOrgId}/purchaseOrders/{poId}` | — | client DRAFT + `po.*` |
| Connected PO | `connectedPurchaseOrders/{poId}` | both orgs' `purchaseOrders/{poId}` | `cpo.*` |
| Connection | `connections/{connectionId}` | both orgs' `connections/{connectionId}` | `connection.*` |
| Mapping | `organizations/{buyerOrgId}/productMappings/{mappingId}` | — | `mapping.*` |

**The ledger is the only source of stock truth.** Balances and summaries are derived caches maintained
inside the same transaction as the movement that changes them. A balance is never written without a
movement; a movement is never written without its balance. This single rule is what makes `INV-03`
(`sum(signed movements) == StockBalance`) exact rather than aspirational — and integer milli-units are
what make "exact" mean exact rather than "within floating-point tolerance".

---

## 6. Client write versus trusted command

**Six client-writable surfaces exist. Nothing else is client-writable, and the catch-all denies
everything unlisted. Deletes are denied on every collection, everywhere, without exception.**

1. `users/{uid}` — own profile: `displayName`, `photoUrl`, `lastSeenAt`
2. `users/{uid}/notifications/{id}` — the `read` boolean only
3. `organizations/{orgId}/categories/**` — create/update by inventory writers
4. `organizations/{orgId}/warehouses/**` — create/update by inventory writers; **`status` may not be set to `ARCHIVED`**
5. `organizations/{orgId}/privatePartners/**` — create/update by partner writers, including deactivation
6. `organizations/{orgId}/purchaseOrders/{poId}` (+`items`) — create/update **only** while `supplierKind == 'PRIVATE'` **and** `status == 'DRAFT'`, draft-editable fields only

Everything touching **uniqueness, stock, money, access control, cross-tenant state or audit** is a
trusted backend command. Complete classification of every mutation is DB-03 and DB-06.

> **The Admin SDK rule.** The Firebase Admin SDK **bypasses Firestore Security Rules completely.** A
> Cloud Function is not protected by `firestore.rules`. Every command therefore re-authorizes from the
> database on every call: authentication → payload schema → membership read → ACTIVE status → role →
> resource ownership → current state → transaction → idempotency → audit → minimal result. This is
> implemented **once**, in `defineCommand()`, so it cannot be forgotten in the thirty-third command
> written late on Day 11.

Never trusted: `request.data.role`, `request.data.orgId` as a claim, a client-reported balance, a
client-computed total, a client-computed unit conversion, a client "connection is active" flag, or the
client clock. **Operational test:** if removing a field from the payload would change an authorization
decision, that field is being trusted and the design is wrong.

---

## 7. Numeric representation

- **Money** — integer minor units, explicit `currency` (ISO 4217) on every monetary document.
  `lineTotalMinor = roundHalfUp(unitPriceMinor × quantityMilli / 1000)`, integers only, in one shared
  module, unit-tested at the rounding boundary. Floating-point money is forbidden.
- **Quantity** — integer **milli-units**, maximum three decimal places, `unit` always stored alongside.
  A branded TypeScript `Milli` type prevents a raw decimal reaching a `…Milli` field.
- **Conversion** — `buyerBaseMilli = roundHalfUp(supplierOrderMilli × factorMilli / 1000)`. Both the
  supplier-unit and buyer-base quantities are persisted on every connected line, so nothing is
  re-derived and drift is impossible. Outstanding quantity is tracked in **supplier order units**; a
  residual rounding difference of at most one milli-unit is absorbed on the final receipt.
- **Units** in the canonical seed and frozen design: `KG`, `L`, `EACH`, `PACK`, plus supplier order
  units. `L` is the canonical token; the pre-patch `LTR` variant is superseded.

---

## 8. Lifecycle, archival and retention

Nothing is ever hard-deleted. `BR-013` is enforced by rules, not by convention.

| Entity | Lifecycle |
|---|---|
| Organization | `ACTIVE → SUSPENDED \| ARCHIVED` |
| Membership | `ACTIVE ↔ SUSPENDED → REMOVED` (terminal) |
| Invitation | `PENDING → ACCEPTED \| EXPIRED \| REVOKED` |
| Product, Category | `ACTIVE ↔ ARCHIVED` |
| Warehouse | `ACTIVE → ARCHIVED` (backend-guarded) ; `ARCHIVED → ACTIVE` always permitted |
| Private partner | `ACTIVE → DEACTIVATED` |
| Connection | `(none) → PENDING → ACTIVE \| REJECTED` ; `ACTIVE → DISABLED` ; `REJECTED \| DISABLED → PENDING` |
| Mapping | `(created, backend-validated) → VERIFIED → DISABLED` |
| Private PO | `DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED` ; cancellation only before any receipt |
| Connected PO | `DRAFT → SUBMITTED → ACCEPTED → SHIPPED → PARTIALLY_RECEIVED → RECEIVED` |
| **StockMovement** | **none — immutable and append-only, forever** |
| AuditLog, PO history | **none — immutable** |

**Retention.** Nothing is expired or purged during the coursework. Command receipts are the one
candidate for a future TTL policy and are documented as such. Historical references remain resolvable
after archive or disable (`INV-15`): a purchase-order line always renders from its own snapshot, never
by joining to the live product.

---

## 9. Transactions

Every multi-document invariant is enforced by one Firestore transaction. Rules obeyed everywhere:

1. **All reads precede all writes** (a Firestore requirement).
2. **The command receipt is the first read and the last write.**
3. Every in-transaction query carries `.limit()`.
4. The largest transaction (`cpo.ship`, five lines) writes ~18 documents — far under the 500 limit.
5. No transaction reads or writes a document belonging to a third organization.

**Forbidden partial states**, each asserted by test:

- a purchase order changed but stock did not, or stock changed but no `StockMovement` exists;
- a balance written without its movement, or a movement without its balance;
- a `TRANSFER_OUT` without its paired `TRANSFER_IN` (`INV-22`);
- a canonical connected PO updated without both organization projections (`INV-19`);
- a membership changed without its user mirror (`INV-20`);
- an organization created without its handle reservation, directory entry, settings, Owner membership,
  membership mirror and first warehouse.

Contention is bounded by design: `productStockSummaries/{productId}` is the only hot document, written
once per movement for that product. At coursework scale this is irrelevant; the documented future path
is sharded counters or a periodic rollup. **A transfer does not write the summary at all** (`INV-23`),
which removes contention from the one stock operation that cannot change a product total.

---

## 10. Idempotency

Every command marked idempotent **requires** an `operationId` — a UUID v4 the client generates **when
the form opens**, not when submit is pressed, so a double-click, a retry after a timeout and a refresh
that resubmits all carry the same id.

```text
open transaction
  read organizations/{orgId}/commandReceipts/{operationId}        ← FIRST read
  if exists and payloadHash matches   → return stored result, apply no side effects
  if exists and payloadHash differs   → reject OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD
  … command body …
  create the receipt                                              ← LAST write
commit
```

Checking before opening the transaction is a race — two concurrent retries would both see "not
applied". `payloadHash` is SHA-256 over the canonicalised payload with `operationId` removed, and closes
the "same id, different data" hole. Receipts are **organization-scoped**, so one tenant can neither
observe nor squat on another tenant's operation ids.

---

## 11. Derived data

Full contracts in DB-07 §5. The governing rules:

- Every duplicated value names one **source of truth**, one **update owner**, and is written **atomically
  with its source**.
- **No manually editable KPI document exists anywhere, and none may be introduced** (`FR-DASH-007`).
- Dashboard KPIs are Firestore **aggregation queries** (`count()`, `sum()`) over indexed fields, so cost
  is bounded and no collection is read into the client to be counted.
- `stockValueMinor` is maintained on each product summary inside stock commands **and** whenever the
  purchase cost changes, which is what turns Inventory Value into a bounded `sum()` instead of a scan.
- Drift detection is by test, not by a repair job: the randomised property test re-asserts
  `INV-03`, `INV-04`, `INV-18`, `INV-19`, `INV-20`, `INV-22`, `INV-23` and `INV-24` after **every**
  command. Because every derived value is written in the same transaction as its source, drift can only
  arise from a code defect, and the repair is a code fix plus a one-off reconciliation script — not a
  scheduled reconciler, which would mask the defect.

---

## 12. Audit

Server-created, organization-private, immutable, readable by **Owner and Admin only**. Rules deny
`create`, `update` and `delete` to every client including the Owner. A cross-tenant action writes **one
record in each organization**, each containing only what that organization is entitled to know.

**Stated limitation, to be repeated in the report:** the audit record is written by the same trusted
process that performs the action, so this is tamper-**resistant**, not tamper-**evident**. True tamper
evidence would require append-only external storage. Saying so is stronger than implying a guarantee the
system does not make.

Ordinary product field edits rely on `updatedBy`/`updatedAt` rather than an audit row; archive/restore
and purchase-cost changes are audited. **There is no audit-log route** — ACR-001 was resolved as the
documented default, and audit surfaces only inside per-object Activity and Movement History.

---

## 13. Privacy and the connected boundary

A connected business receives a **purpose-built shared surface**, never access to a tenant space.

- The partner catalog is a separate projection document with allow-listed fields, exposed to buyers
  **only** through the `partnerCatalog.list` and `partnerCatalog.lookupBySku` callables, each of which
  verifies `connections/{buyerOrgId}__{supplierOrgId}.status == 'ACTIVE'` server-side. There is no
  direct client read path.
- A connected buyer can never obtain the supplier's Products, StockBalances, ProductStockSummaries,
  StockMovements, AuditLogs, Members, PrivatePartners, Settings, Invitations or Counters. A dedicated
  test suite asserts denial on each — for a **connected** buyer, not merely an unrelated organization,
  because a connected party is the more interesting attacker.
- Published availability is a **coarse state**, never a quantity.
- Firestore reads whole documents, so a rule cannot hide a field. That is precisely why every public and
  partner surface is a separate projection document rather than a filtered view.
- **A transfer is strictly intra-organization.** It reads and writes only documents beneath the caller's
  own `organizations/{orgId}/` path and can never name a counterparty.

---

## 14. Non-goals

Not built, and not to be introduced by any implementation agent: dedicated database per tenant · Firestore
triggers · HTTP endpoints · Cloud Storage · App Check · Realtime Database · a BI or warehouse layer ·
distributed/sharded counters · full-text search infrastructure · a scheduled reconciliation job ·
an audit-log route · a storefront (Release C) · any sales, POS, reservation, transfer-approval, in-transit,
multi-product-transfer, batch/lot/expiry, serial-number, multi-shipment, weighted-average-costing or
cross-organization-transfer capability.

---

## 15. Implementation ownership

| Layer | Owner |
|---|---|
| Firebase config, emulators, indexes, shared types/schemas/converters, seed, fixtures, reset tooling, data-layer scaffolding, query and data test infrastructure | **Codex** — brief in DB-09 |
| `firestore.rules`, `defineCommand()`, every backend command, transaction bodies, idempotency, audit, notification fan-out, cross-tenant projections, security test suites | **Claude Code** — high-risk security and backend authority |
| React application, screens, state, routing | frontend implementation phase, against the frozen design |
| Any change to RBAC, the tenant model, zones, state machines, transaction semantics, command semantics or connected privacy | **Owner amendment only** |

---

## 16. Blueprint freeze

> This architecture is frozen. Implementation may choose field names, file names and module boundaries
> freely, but may **not** move a document between zones, add a client write path outside §6, add an HTTP
> endpoint, add a Firestore trigger, perform a `get()` on a data-derived path in Security Rules, or add a
> command not listed in DB-06. Any of those requires an owner-approved amendment recorded in the same
> form as DB-00 / A1.

---

## 16. A3 · A3R · A3R-P — amendments applied

`DB_00` §8 records the remediation of the independent frontend ↔ database consistency review
(44 findings, all accepted, all resolved from authority). What changes in *this* file:

- **§4 path registry — unchanged.** No collection is added, removed or moved. A3 is a field-, query- and
  command-level amendment; the four zones and the physical path list from `11` §5 stand exactly as frozen.
- **§7 units** — `KG · L · EACH · PACK` is now the enum, not merely the observed set.
- **§8 lifecycles** — warehouse `ARCHIVED → ACTIVE` gains its command (`C-37`); `organizations.status`
  and `users.status` collapse to `'ACTIVE'` because no command wrote the other values.
- **§12** — unchanged: there is still no audit-log route, which is why `IDX-19` is deleted.
- **§13 privacy** — reinforced. The *Buyers* tab on SCREEN-013 is deleted precisely because its only
  possible data source is other tenants' `productMappings`, which this section forbids absolutely.
- **§14** — `reservedMilli` is reclassified `FUTURE_PLACEHOLDER, constant 0`; `availableMilli` is derived.

**HISTORICAL (PRE-A3R).** The line that stood here — *"44 indexes · 38 Release-A/B command callables ·
84 query ids · 13 derived contracts · 25 invariants"* — was the A3-era count and is **SUPERSEDED**. It
survived A3R because A3R edited the amendment record and not this blueprint. It is the defect `A3R-P`
was commissioned to close.

### Current counts — A3R-P, derived mechanically from the normative tables

```
ACTIVE_INDEX_IDS            = 67   DB-04 §7   IDX-01…IDX-69 less the deleted IDX-03 and IDX-19
                                              (incl. the 32-index product-list matrix, DB-CR-038,
                                              generated from a rule rather than transcribed)
ACTIVE_QUERY_IDS            = 92   DB-04 §1–§6, §8   (91 at A3R; +Q-080, the C-38 archive guard
                                              that A3R-11 created in DB-06 and cited as the
                                              undefined id Q-085g — closed at A3R-P · P-09)
ACTIVE_COMMAND_IDS          = 38   DB-06 §1   Release A/B callables: C-01…C-31, C-33, C-34,
                                              C-35a, C-35b, C-36, C-37, C-38.  C-35 no longer
                                              exists as an id; C-32 is declared-inert Release C
                                              and is excluded from the denominator
ACTIVE_DERIVED_CONTRACT_IDS = 14   DB-07 §12  DV-01 … DV-14  (DV-14 added at A3R-15)
ACTIVE_INVARIANT_IDS        = 26   DB-07 §11  INV-01…INV-24, INV-26, INV-27
                                              INV-25 is WITHDRAWN (DB-CR-027) and its number is a
                                              preserved tombstone — the set is NOT renumbered
```

The arithmetic on the invariants, stated so it cannot drift again: `INV-01…INV-24` = 24 active,
`−INV-25` (withdrawn with the `warehouseName` field it policed), `+INV-26` (in-row balance derivations,
A3 · DB-CR-025), `+INV-27` (one rounding point at the balance grain, A3R-05). **24 + 2 = 26.** The
A3-era figure of 25 predates `INV-27` and is wrong for the current state.
