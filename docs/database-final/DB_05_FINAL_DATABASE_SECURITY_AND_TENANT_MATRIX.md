# DB-05 — FINAL DATABASE SECURITY AND TENANT MATRIX

**Status:** FROZEN. The architectural authority for `firestore.rules` and for the authorization block of
every backend command.
**Role registry:** the seven roles of `06` §5, verbatim. No role may be added, removed or merged.

```
Role = OWNER | ADMIN | INVENTORY_MANAGER | PROCUREMENT_MANAGER | STOREKEEPER | ANALYST | VIEWER
```

## 0. Operation vocabulary

`READ` · `CREATE` · `UPDATE` · `ARCHIVE` (a guarded status transition, never a delete) ·
`COMMAND_ONLY` (mutation exists but only through a trusted backend command) · `DENY`.

**`DELETE` is absent from this vocabulary for clients.** Client deletes are denied on every collection,
everywhere, without exception (`INV-21`, `SEC-019`, `T-SEC-19`).

## 0.1 Principals

`PUB` unauthenticated visitor · `AUTH` authenticated non-member · `O` `A` `IM` `PM` `SK` `AN` `V` ACTIVE
members · `SUSP` suspended or removed member · `CONN` a member of a **connected counterparty**
organization · `BE` trusted backend (Admin SDK).

> **`SUSP` is denied everywhere, at both layers.** `isActiveMember()` requires `status == 'ACTIVE'`, and
> every command re-reads the membership at request time. A cached tab or a live ID token grants nothing.
> The shell additionally holds an `onSnapshot` on the member document (RT-1) so the UI collapses without
> a refresh — but that is convenience; the denial is structural.

> **`CONN` has no rule-level privilege anywhere.** A connected counterparty is, to Firestore Security
> Rules, an ordinary non-member. Every legitimate cross-tenant read happens inside a callable that
> verifies `connections/{buyerOrgId}__{supplierOrgId}.status == 'ACTIVE'` server-side. This is why the
> matrix below shows `CONN = DENY` on every tenant path including `partnerCatalog`.

## 0.2 Role constants (mirrored into `firestore.rules` by necessity)

```text
INVENTORY_WRITERS = ['OWNER','ADMIN','INVENTORY_MANAGER']
PARTNER_WRITERS   = ['OWNER','ADMIN','PROCUREMENT_MANAGER']
PO_WRITERS        = ['OWNER','ADMIN','PROCUREMENT_MANAGER']
RECEIVERS         = ['OWNER','ADMIN','INVENTORY_MANAGER','PROCUREMENT_MANAGER','STOREKEEPER']
TRANSFER_WRITERS  = INVENTORY_WRITERS                                            # A1
ADMINS            = ['OWNER','ADMIN']
NOT_VIEWER        = ['OWNER','ADMIN','INVENTORY_MANAGER','PROCUREMENT_MANAGER',
                     'STOREKEEPER','ANALYST']                                    # A2 · DB-CR-015
```

Rules cannot import TypeScript, so these lists are duplicated from `packages/shared/permissions.ts`.
**`T-SEC-17` asserts the two agree for every role.** That test is the mitigation, and it is not optional.

---

## 1. The path-constancy rule

> A Security Rule may only `get()` or `exists()` a path that is **constant for the entire request** —
> in practice `organizations/{orgId}/members/{request.auth.uid}`, where `orgId` comes from the matched
> path. **A rule must never read a path derived from `resource.data`.**

Firestore permits at most **10** document access calls per single-document or query request (**20** for
multi-document reads, transactions and batched writes), and identical calls are cached. A constant-path
read costs one cached call regardless of page size; a data-derived read costs one call per candidate
document and fails a 25-row page outright.

Every cross-tenant authorization question in Stockmok requires exactly the forbidden read, because a
user may belong to several organizations and a rule cannot know which one they are acting for. **That is
why zone 4 is closed to clients and the partner catalog is callable-only.** It is the reason the
architecture has this shape.

---

## 2. Zone 1 — public

| Path | PUB | AUTH | O A IM PM SK AN V | CONN | SUSP | BE |
|---|---|---|---|---|---|---|
| `organizationDirectory/{handle}` | **READ (`get` only)** | READ `get` | READ `get` | READ `get` | READ `get` | CREATE/UPDATE |
| `organizationDirectory` **`list`** | **DENY** | **DENY** | **DENY** | **DENY** | **DENY** | n/a |
| `storefrontCatalog/**` | *(Release C — not built; rule present and inert)* | | | | | |

`get` public / `list` denied is the whole anti-enumeration control. Exact-handle lookup needs only
`get`; permitting `list` would let any visitor dump every business on the platform (`T-SEC-20`).
Exposing `organizationId` publicly is a deliberate accepted decision — the id is not a secret,
membership is the gate, and branded login needs it.

---

## 3. Zone 2 — user-private

| Path | Self | Any other principal | BE |
|---|---|---|---|
| `users/{uid}` | READ · CREATE · UPDATE **(`displayName`, `photoUrl`, `lastSeenAt` only)** | **DENY** | UPDATE (`email`, `status`) |
| `users/{uid}/memberships/{orgId}` | READ · **`limit ≤ 100`** *(A3 · F-H-10 — the ninth bounded path)* | **DENY** | CREATE/UPDATE |
| `users/{uid}/notifications/{id}` | READ · UPDATE **(`read` only)** | **DENY** | CREATE |

A notification update touching any field other than `read` is denied (`T-SEC-23`). `create` and `delete`
on notifications are denied to the recipient — a user cannot fabricate their own notification.

---

## 4. Zone 3 — organization-private

`READ` below means `isActiveMember(orgId)` unless a narrower role list is given. Every cell for a
principal outside the organization — `PUB`, `AUTH`, `CONN`, `SUSP` — is **`DENY`**, at every path,
without exception. That row is not repeated per path; it is the catch-all plus `isActiveMember()`.

| Path | READ | CREATE | UPDATE | ARCHIVE | Mutation class |
|---|---|---|---|---|---|
| `organizations/{orgId}` | all 7 | DENY | DENY | – | COMMAND_ONLY |
| `…/settings/main` | all 7 | DENY | DENY | – | COMMAND_ONLY (`ADMINS`) |
| `…/counters/**` | **DENY** | DENY | DENY | – | **BACKEND_ONLY** |
| `…/commandReceipts/**` | **DENY** | DENY | DENY | – | **BACKEND_ONLY** |
| `…/productSkuIndex/**` | **DENY** | DENY | DENY | – | **BACKEND_ONLY** |
| `…/members/{uid}` | **`get`: `isSelf(uid)` OR `ADMINS` · `list`: `ADMINS`** | DENY | DENY | – | COMMAND_ONLY (`ADMINS`) |
| `…/invitations/**` | **`ADMINS` only** | DENY | DENY | – | COMMAND_ONLY (`ADMINS`) |
| `…/categories/**` | all 7 · **`limit ≤ 100`** | **`INVENTORY_WRITERS`** | **`INVENTORY_WRITERS`**, **`status` may not change** | **COMMAND_ONLY** (DB-CR-012) | mixed |
| `…/warehouses/**` | all 7 · **`limit ≤ 100`** | **`INVENTORY_WRITERS`** | **`INVENTORY_WRITERS`**, **`status` may not change**; no `isDefault` field exists | **COMMAND_ONLY** | mixed |
| `…/products/**` | all 7 | DENY | DENY | COMMAND_ONLY | COMMAND_ONLY (`INVENTORY_WRITERS`) |
| `…/stockBalances/**` | all 7 | **DENY** | **DENY** | – | COMMAND_ONLY |
| `…/productStockSummaries/**` | all 7 | **DENY** | **DENY** | – | COMMAND_ONLY |
| `…/stockMovements/**` | **`NOT_VIEWER`** · **`limit ≤ 100`** | **DENY** | **DENY (immutable)** | **DENY** | COMMAND_ONLY |
| `…/privatePartners/**` | **`PARTNER_WRITERS`** · **`limit ≤ 100`** | **`PARTNER_WRITERS`** | **`PARTNER_WRITERS`**, **`status` and `ordersPlacedCount` may not change** *(A3R-11)* | **COMMAND_ONLY — `C-38 partner.setStatus`** | **SAFE_DIRECT_CLIENT_WRITE** (field-restricted) |
| `…/purchaseOrders/{poId}` | **`NOT_VIEWER`** | **`PO_WRITERS`** and `isNewPrivateDraft()` | **`PO_WRITERS`** and `isEditableDraft()` and `draftFieldsOnly()` | – | mixed |
| `…/purchaseOrders/{poId}/items/**` | **`NOT_VIEWER`** · **`limit ≤ 100`** | `PO_WRITERS` + `parentIsEditableDraft()` | same | – | mixed |
| `…/purchaseOrders/{poId}/history/**` | **`NOT_VIEWER`** · **`limit ≤ 100`** | **DENY** | **DENY (immutable)** | – | COMMAND_ONLY |
| `…/partnerCatalog/**` | **own-org `PARTNER_WRITERS`** · **`limit ≤ 100`** | DENY | DENY | – | COMMAND_ONLY (`PARTNER_WRITERS`) |
| `…/productMappings/**` | **`PARTNER_WRITERS`** · **`limit ≤ 100`** | DENY | DENY | – | COMMAND_ONLY (`PARTNER_WRITERS`) |
| `…/connections/**` (projection) | **`PARTNER_WRITERS`** | DENY | DENY | – | COMMAND_ONLY |
| `…/auditLogs/**` | **`ADMINS` only** | **DENY** | **DENY** | **DENY** | COMMAND_ONLY |

### 4.0 A2 · DB-CR-015 — role-level read denial is enforced in Rules, not in the router

This section **replaces** the paragraph that previously argued rules-level reads must stay coarser than
the UI. That argument was a category error and the external reviewer was right to challenge it.

> The old text: *"expressing a per-role read denial on a list would require the rule to be a filter, which
> it is not."*

That is true of a **per-document** condition. It is false of a **per-role** condition. A per-role denial is
uniform across the entire potential result set, so *"rules are not filters"* is satisfied trivially — which
is exactly why this same ruleset already enforced `hasRole(orgId, ADMINS)` on `invitations` and
`auditLogs`. The technique was correct in two places and declared impossible in six others.

**A route guard is not authorization.** `23` §1 defines `DENIED` as *"execute no page query or command"*,
and `06` §1 states that *"UI visibility is convenience."* A user driving the client SDK directly never
touches the router. Every cell above now matches the hard-boolean matrix of `06` §5 and the screen matrix
of `23` §4.

**Cost is zero.** `hasRole(orgId, roles)` reads `organizations/{orgId}/members/{request.auth.uid}` — the
*same* constant path `isActiveMember(orgId)` already reads. Firestore caches identical document access
calls within a request, so no tightening above adds an access call at any page size.
`DATA_DERIVED_RULE_READS` remains `0` and the 10-call limit is untouched.

| Path | Binding authority for the restriction |
|---|---|
| `stockMovements` → `NOT_VIEWER` | `06` §5 *View stock movement history: Viewer ✘* · `23` §3 `V = HIDDEN` · `23` §4 SCREEN-017 `V = DENIED` |
| `purchaseOrders` (+ `items`, `history`) → `NOT_VIEWER` | `06` §5 *View purchase orders: Viewer ✘* · `23` §4 SCREEN-021/023/038/039 `V = DENIED` |
| `privatePartners` → `PARTNER_WRITERS` | `06` §5 *Manage private suppliers and buyers: O/A/PM* · `23` §4 SCREEN-018/019/020 `IM/SK/AN/V = DENIED` |
| `connections` → `PARTNER_WRITERS` | `06` §5 *View Connections: IM ✘ SK ✘ AN ✘ V ✘* · `23` §3 |
| `productMappings` → `PARTNER_WRITERS` | `23` §11 *"Inventory Manager has no Network access. Analyst has no Network access"* · `23` §4 SCREEN-037 `IM/SK/AN/V = DENIED` |
| `partnerCatalog` (own org) → `PARTNER_WRITERS` | `23` §4 SCREEN-034/051 `IM/SK/AN/V = DENIED` |
| `members` → `get` self-or-`ADMINS`, `list` `ADMINS` | `23` §4 SCREEN-027 `IM/PM/SK/AN/V = DENIED` |

`06` §6.1's sentence *"Reads are broader: any ACTIVE member may read their own organization's data"* is
resolved **against** the §5 matrix wherever the two disagree, on the authority of `23`'s own header:
*"the hard boolean matrix in `06` overrides broader prose."*

**Reads that stay broad, and why — checked for field leakage as the reviewer required.**

| Path | Read | Justification | Leak check |
|---|---|---|---|
| `organizations/{orgId}`, `…/settings/main` | all 7 | The shell renders for every role and needs org identity, `currency`, `timezone`, `quantityPrecision`, `networkEnabled`. | No money, stock, partner or member data. |
| `…/products/**`, `…/stockBalances/**`, `…/productStockSummaries/**` | all 7 | `06` §5 *View products and stock* = all seven; `23` §4 SCREEN-048 = all seven. | Purchase cost and stock value are granted to all seven **explicitly** by `06` §5. |
| `…/categories/**` | all 7 | The `TABLE-001` **Category** filter and the `SCREEN-048` category filter are offered to every role; the dropdown needs the option set. DB-CR-016 makes this the *only* source of the Category label. | `name`, `description`, `status`. |
| `…/warehouses/**` | all 7 | The `TABLE-001` **Store room** filter (`FIELD-051`), the `SCREEN-048` warehouse filter, and `TABLE-004`'s requirement to list **one row per ACTIVE warehouse including zeros**. | `name`, `code`, `type`, `status`, `address`. No quantity, no value. |

**One denial that correctly stays UI-only, stated rather than buried.** `SCREEN-049` Purchase-Order Report
is `DENIED` to Storekeeper while `purchaseOrders` stays readable by Storekeeper. That is **not** a
mismatch: `06` §5 grants Storekeeper *View purchase orders* — they must see the order they receive
against — and denies only the **report surface**. A tab-level product decision over data the role may
lawfully read is enforceable only in the router, and `23` §5 already specifies it as *"inline STATE-006, no
query"*. No projection is needed because no field is being withheld.

### 4.0.1 A2 · DB-CR-019 — bounded `request.query.limit`

`allow list: if request.query.limit <= 100;` is added to the **nine** client-listed collections marked
**`limit ≤ 100`** above. Verified against current Firestore documentation: the rule *"denies any query
without a limit or with a limit greater than N."* This makes the declared hard maximum a **data-boundary
invariant** rather than UI behaviour.

**It is deliberately absent from six collections, and the reason is recorded rather than omitted.** The
same documentation states *"the same rules apply to both normal queries that return documents and
aggregation queries."* An unbounded `count()` or `sum()` carries no limit and would therefore be denied,
and an aggregation cannot be given a limit without changing its answer — a capped `sum('stockValueMinor')`
is not the inventory value. The six exempt paths and their aggregations:

`products` (`Q-050`) · `productStockSummaries` (`Q-051`, `Q-052`, `Q-053`) · `stockBalances` (`Q-058`,
`Q-060`) · `purchaseOrders` (`Q-054`, `Q-055`, `Q-065`) · `connections` (`Q-064`) ·
`users/{uid}/notifications` (`Q-005`).

**What the exemption exposes.** An unbounded `list` on those paths returns only the caller's **own
tenant's** data, which their role is already entitled to read under DB-CR-015. This is a **cost** exposure,
not a privacy or tenancy one. Compensating controls are the existing ones: membership-gated tenant paths,
`maxInstances: 10`, and the Blaze budget alert (DB-10 §7). Recorded here rather than discovered on a bill.

### 4.1 `isEditableDraft()` — the exact predicate

```text
isNewPrivateDraft()   request.resource.data.supplierKind == 'PRIVATE'
                   && request.resource.data.status == 'DRAFT'
                   && request.resource.data.isProjection == false

isEditableDraft()     resource.data.supplierKind == 'PRIVATE'
                   && resource.data.status == 'DRAFT'
                   && request.resource.data.supplierKind == 'PRIVATE'     // cannot be flipped
                   && request.resource.data.status == 'DRAFT'             // cannot self-transition

draftFieldsOnly()     onlyChanged(['counterpartyName','privateSupplierId','expectedDate',
                                   'notes','totalMinor','updatedAt'])
```

`supplierKind` and `status` are pinned on **both** `resource` and `request.resource`, so a client cannot
flip a private draft to `CONNECTED`, cannot self-transition `DRAFT → ORDERED`, and cannot edit a
connected draft (which is `COMMAND_ONLY` via `cpo.draftSave` — DB-CR-010).

---

## 4.9 A3 — corrections to this matrix

**The bounded-`limit` set is now marked explicitly (A3 · F-H-10).** The pack asserted `limit ≤ 100` on
**eleven** collections; the §4 table marked **eight**. The nine bounded paths are, definitively:
`categories`, `warehouses`, `stockMovements`, `privatePartners`, `purchaseOrders/{poId}/items`,
`purchaseOrders/{poId}/history`, `partnerCatalog`, `productMappings`, and — newly assigned, having
previously been in neither the bounded nor the exempt set — **`users/{uid}/memberships`** (`Q-003`,
page 25). `members`, `invitations` and `auditLogs` remain in the six-path exempt set with the recorded
reason: Firestore applies `request.query.limit` to aggregations identically, so binding them would break
the `count()` calls those surfaces depend on. `T-SEC-32` is restated **per path** — nine assertions, each
naming its collection — so it is testable rather than a single unfalsifiable claim.

**Warehouse `status` is immutable to clients in both directions (A3 · DB-CR-033).** DB-02 §4.2 said a
client *"may not set `ARCHIVED`"*, implying setting `ACTIVE` was allowed; this file said *"`status` may
not change"*. This file was right and is now the only reading: `…/warehouses/**` UPDATE denies any
`status` diff. Archive is `C-12`; restore is `C-37`.

**`privatePartners` — `ordersPlacedCount` AND `status` are backend-write-only (A3 · DB-CR-035, corrected
by A3R-11).** Both are excluded from the client-write allowlist on an otherwise
`SAFE_DIRECT_CLIENT_WRITE` document. A client able to write its own counter could forge the supplier
archive guard — `ATTACK-15` (forged balance without movement) in a new location — and a client able to
write `status` could archive a supplier holding open orders outright, because **a guard the client
evaluates is not a guard**. Archive and restore are `C-38 partner.setStatus`, which runs
`purchaseOrders where privateSupplierId == P and status in [open] limit(1)` inside its own transaction.
This is a new attack, recorded as **`ATTACK-16` — client archives a partner with open orders by writing
`status` directly.**

**New security tests.**

| ID | Assertion |
|---|---|
| `T-SEC-34` | Storekeeper calls `C-37 warehouse.restore` → `permission-denied`. |
| `T-SEC-35` | Client `update` on `…/warehouses/{id}` changing `status` `ARCHIVED → ACTIVE` → **denied**. |
| `T-SEC-36` | Client `update` on `…/privatePartners/{id}` writing `ordersPlacedCount` → **denied**. |
| `T-SEC-40` | Client `update` on `…/privatePartners/{id}` writing `status` → **denied** (`ATTACK-16`). |
| `T-SEC-41` | `C-38 partner.setStatus` → `DEACTIVATED` while one `ORDERED` purchase order exists → `failed-precondition`. *(A3R-P2 · C1-AUTH-004 — the persisted enum is `PartnerStatus = ACTIVE` \| `DEACTIVATED`; `ARCHIVED` is the UI word, never the stored private-partner value. `C-38`'s authorization and guard semantics are unchanged.)* |
| `T-SEC-37` | Client `update` on `…/stockBalances/**` writing `stockValueMinor`, `stockStatus` or `shortfallMilli` → **denied** (the whole collection is already command-only; asserted explicitly because A3 added the fields). |
| `T-SEC-38` | Connected buyer reads supplier `partnerCatalog` → the response contains **no** `internalProductNameSnapshot` / `internalSkuSnapshot` (A3 · DB-CR-036 privacy check). |
| `T-SEC-39` | `users/{uid}/memberships` list with `limit(101)` → **denied** (F-H-10 assignment). |

---

## 5. Zone 4 — cross-tenant canonical

| Path | PUB | AUTH | any member of either party | CONN | BE |
|---|---|---|---|---|---|
| `handleReservations/{handle}` | DENY | DENY | **DENY** | DENY | full |
| `connections/{connectionId}` | DENY | DENY | **DENY** | DENY | full |
| `connectedPurchaseOrders/{poId}` and all subcollections | DENY | DENY | **DENY** | DENY | full |

`allow read, write: if false;` — for **every** principal including the Owner of a participating
organization. Each party reads its own zone-3 projection with the ordinary `isActiveMember(orgId)` rule:
no special case, no data-derived read. A third organization has no projection and cannot read the
canonical record, so it sees nothing (`T-SEC-12`).

---

## 6. Catch-all

```text
match /{document=**} { allow read, write: if false; }
```

An invented path is denied (`T-SEC-18`). This is the last line of the ruleset and is asserted by test.

---

## 7. Backend command authorization

**The Admin SDK bypasses Firestore Security Rules completely. A Cloud Function is not protected by
`firestore.rules`.** Steps 1–7 below are therefore the *only* authorization that exists for a command,
and they are implemented **once**, in `defineCommand()`.

| # | Check | Failure |
|---|---|---|
| 1 | `AUTH` — `context.auth.uid` present | `unauthenticated` |
| 2 | `INPUT` — Zod schema, the same object the browser form used | `invalid-argument` + field path |
| 3 | `MEMBERSHIP` — read `organizations/{orgId}/members/{uid}` **from the database** | `permission-denied / NOT_A_MEMBER` |
| 4 | `STATE` of membership — must be `ACTIVE` | `permission-denied / MEMBERSHIP_NOT_ACTIVE` |
| 5 | `ROLE` — the role **on that document**, never `request.data.role` | `permission-denied / ROLE_NOT_PERMITTED` |
| 6 | `ORGANIZATION` — every referenced resource re-read and its `organizationId` compared to the verified membership | `permission-denied / CROSS_TENANT_REFERENCE` |
| 7 | `STATE` of resource — the transition table in DB-07 | `failed-precondition / INVALID_TRANSITION` |
| 8 | `IDEMPOTENCY` — receipt read as the **first** read inside the transaction | replay → stored result; hash mismatch → `failed-precondition / OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD` |
| 9 | `PRIVACY` — the result and any projection carry allow-listed fields only | – |

**`request.data.orgId` is a routing hint, never a claim.** Step 3 turns it into a fact or a denial. If
removing a field from the payload would change an authorization decision, that field is being trusted
and the design is wrong.

### 7.1 Command → role gate (complete)

| Roles | Commands |
|---|---|
| any authenticated user, no membership | `org.create` |
| self | `user.bootstrapProfile` *(optional)* |
| `ADMINS` | `org.updateSettings`, `team.createInvitation`, `team.revokeInvitation`, `team.changeMemberRole`, `team.setMemberStatus`, `connection.disable`, `storefront.*` (C) |
| authenticated invitee (email-matched) | `team.acceptInvitation` |
| `INVENTORY_WRITERS` | `product.create`, `product.update`, `product.setStatus`, `warehouse.archive`, **`warehouse.setDefault`**, **`category.archive` / `category.restore`**, `stock.recordOpeningBalance`, `stock.adjust`, **`stock.transfer`** |
| `RECEIVERS` | `po.receive`, `cpo.receive` |
| `PO_WRITERS` | `po.order`, `po.cancel`, `cpo.draftSave`, `cpo.submit`, `cpo.respond`, `cpo.ship`, `cpo.cancel` |
| `PARTNER_WRITERS` | `connection.request`, `connection.respond`, `partnerCatalog.publish`, `partnerCatalog.unpublish`, `partnerCatalog.list`, `partnerCatalog.lookupBySku`, `mapping.create`, `mapping.disable` |

**Storekeeper receives goods but cannot adjust or transfer stock.** Receiving is a documented, referenced
event against a purchase order; a free-form adjustment or relocation is not. Separating them is the
standard segregation-of-duties control (`06` §5) and A1 extends it to transfer, which sits in the same
family on frozen board 6i.

**Inventory Manager has no Network access.** Connections are commercial relationships; procurement owns
them. **Analyst** is read-only everywhere except audit logs and team, and has no Network access.
**Viewer** sees the dashboard, products, stock and the Stock-on-Hand report only.

### 7.2 Cross-organization commands

`connection.*` and `cpo.*` legitimately touch two tenants. Each verifies:

1. the caller's ACTIVE membership and role **in the organization they claim to act for**;
2. that the canonical `connections/{buyerOrgId}__{supplierOrgId}` document names that organization in the
   correct role — **buyer transitions require `buyerOrgId`, supplier transitions require `supplierOrgId`**;
3. connection `status == 'ACTIVE'` **re-read inside the transaction**, so a connection disabled between
   page load and submit is rejected (`ATTACK-09`);
4. that every write targets only the two participating organizations, each receiving only fields it is
   entitled to see.

**`stock.transfer` is not a cross-organization command and must never become one.** Both warehouses are
re-read from `organizations/{orgId}/warehouses/**` under the verified membership, so a warehouse id
belonging to another organization resolves to a missing document, not to another tenant's data
(`T-SEC-25`).

---

## 8. Privacy boundaries

| Boundary | Rule |
|---|---|
| **Public directory** | Exactly nine fields (DB-02 §1.1). `list` denied. Key set asserted by `T-SEC-16`. |
| **Partner catalog** | Allow-listed projection document. Buyer access **only** via `partnerCatalog.list` / `lookupBySku`, each verifying an ACTIVE connection server-side. No direct client read path exists. |
| **Never crosses to a connected buyer** | supplier Products · StockBalances · ProductStockSummaries · StockMovements · AuditLogs · Members · PrivatePartners · Settings · Invitations · Counters · exact stock quantity · internal cost · margin · warehouse identity. `T-SEC-10` asserts denial on each **for a connected buyer**, not merely for an unrelated organization — a connected party is the more interesting attacker. |
| **Shared purchase order** | The canonical record carries only fields both parties are entitled to see. Buyer-private context — internal notes, private cost, unrelated tenant data — is never copied into it. A buyer's connected **draft** exists only in the buyer's tenant until submission. |
| **Audit** | Owner/Admin read only; create/update/delete denied to every client including the Owner. A cross-tenant action writes one record per organization, each scoped to what that organization may know. |
| **Whole-document reads** | Firestore reads whole documents, so a rule cannot hide a field. That is precisely why every public and partner surface is a separate projection document rather than a filtered view. |
| **Transfer** | Strictly intra-organization. Reads and writes only under the caller's own `organizations/{orgId}/`. Carries no counterparty field and can never appear in any projection. |

---

## 9. Rules-testing contract

`tests/rules/` uses `@firebase/rules-unit-testing` with `initializeTestEnvironment`, seeding fixtures
with `withSecurityRulesDisabled`. Fixtures: two organizations (`org-grand-ocean`, `org-fresh-foods`), one
ACTIVE connection, **seven** users covering every role, one suspended member, one authenticated
non-member and one unauthenticated context.

Assertion groups — approximately **63** after A2, **plus the eight added by A3 / A3R (`T-SEC-34 … T-SEC-41`, §4.9) ⇒ ≈ 71 at A3R-P**, all P0. The `T-SEC` id range is `T-SEC-01 … T-SEC-41`:

1. Unauthenticated read of every private collection → denied.
2. Authenticated non-member read of every tenant collection → denied.
3. Cross-tenant read **and** write for products, balances, summaries, movements, members, audit, POs,
   mappings, catalog → denied.
4. Direct writes to `stockBalances`, `stockMovements`, `productStockSummaries`, `products`, `members`,
   `auditLogs`, `commandReceipts`, `counters`, `productSkuIndex` → denied **for every role including
   Owner**.
5. `auditLogs` `update` and `delete` by Owner → denied.
6. Suspended member → denied on every path.
7. For each of the six client-writable surfaces: every permitted role succeeds, every other role fails.
8. Warehouse update setting `status` → denied; **category update setting `status` → denied** (DB-CR-012); a client attempting to set a default warehouse on the warehouse document → denied (no such field).
9. PO update when `status != 'DRAFT'` → denied; when `supplierKind == 'CONNECTED'` → denied; flipping
   `supplierKind` → denied; self-transitioning `status` → denied.
10. `organizationDirectory` `get` allowed unauthenticated; **`list` denied**.
11. Every zone-4 collection → denied for all seven roles in **both** organizations.
12. An invented path → denied by the catch-all.
13. Notification update touching any field other than `read` → denied; `create` by self → denied.
14. **A `CONN` member reading the counterparty's `partnerCatalog` directly → denied** (the callable is
    the only path).
15. Client `delete` on every collection → denied.
16. `T-SEC-17`: the role lists in `firestore.rules` equal the shared permission table, per role.
17. **`T-SEC-24`** *(A1)*: `SK`, `PM`, `AN`, `V` calling `stock.transfer` → denied.
18. **`T-SEC-25`** *(A1)*: a transfer naming a warehouse in another organization → denied at step 6.
19. **`T-SEC-26`** *(A2)*: a **Viewer** `list` **and** `get` on `…/stockMovements/**` → denied by rules.
20. **`T-SEC-27`** *(A2)*: a **Viewer** `list` **and** `get` on `…/purchaseOrders/**`, `…/items/**` and `…/history/**` → denied by rules; `IM`, `SK`, `AN` succeed.
21. **`T-SEC-28`** *(A2)*: `IM`, `SK`, `AN`, `V` reading `…/privatePartners/**` → denied; `O`, `A`, `PM` succeed.
22. **`T-SEC-29`** *(A2)*: `IM`, `SK`, `AN`, `V` reading `…/connections/**` and `…/productMappings/**` → denied; `O`, `A`, `PM` succeed.
23. **`T-SEC-30`** *(A2)*: `IM`, `SK`, `AN`, `V` reading their **own** organization's `…/partnerCatalog/**` → denied; `O`, `A`, `PM` succeed. (This is distinct from group 14, which asserts a *connected counterparty* is denied.)
24. **`T-SEC-31`** *(A2)*: a non-Admin `list` on `…/members/**` → denied; a non-Admin `get` of **their own** member document → allowed; a non-Admin `get` of **another** member's document → denied.
25. **`T-SEC-32`** *(A2, restated per path at A3 · F-H-10)*: on each of the **nine** `limit ≤ 100` collections — a `list` with **no** limit → denied; `limit(101)` → denied; `limit(100)` → allowed; `limit(25)` → allowed.
26. **`T-SEC-33`** *(A2)*: each of the nine dashboard aggregations (`Q-050…Q-055`, `Q-060`, `Q-064`, `Q-065`) still succeeds for a role permitted to read that collection — the guard against a careless later addition of a limit rule to an aggregation-bearing path.

---

## 10. Matrix result

```
RBAC_COVERAGE            = 100%   (7 roles × every path × every screen × every command — DB-11 §E)
RBAC_ENFORCED_IN_RULES   = every role-level read and write denial in 06 §5 / 23 §4
RBAC_ENFORCED_IN_ROUTER  = exactly one, declared: SCREEN-049 tab denial for SK / V over data
                           those roles may lawfully read (06 §5 grants "View purchase orders")
TENANT_ISOLATION         = enforced structurally by path prefix + constant-path membership read
CONNECTED_PRIVACY        = enforced by projection documents + connection-verified callables
CLIENT_WRITE_SURFACES    = 6      (and no more — unchanged by A2)
CLIENT_DELETE_PATHS      = 0
ZONE_4_CLIENT_ACCESS     = 0
DATA_DERIVED_RULE_READS  = 0      (unchanged: hasRole reuses isActiveMember's cached constant path)
QUERY_LIMIT_ENFORCED     = 9 collections at <= 100; 6 exempt with the aggregation reason recorded
                           (A3 · F-H-10 — the pack asserted 11 and the §4 table marked 8; the
                           definitive nine are listed in §4.9. "11" is SUPERSEDED.)
SECURITY_TEST_IDS        = T-SEC-01 … T-SEC-41   (A2: …33; A3/A3R: 34…41)
MISMATCHED_RBAC          = 0
```

**`RBAC_COVERAGE = 100%` is claimed only now.** The external reviewer was explicitly right to withhold it
before DB-CR-015: seven collection paths granted reads that `06` §5 denies, and the pack's justification
for that gap did not survive examination.
