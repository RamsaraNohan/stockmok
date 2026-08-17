# DB-04 — FINAL QUERY / INDEX / PAGINATION / REALTIME CONTRACT

**Status:** FROZEN. The authority for `firestore.indexes.json`.
**Global rules:** every list query carries `.limit()`; page size **25**; hard maximum **100**; cursor
pagination with `startAfter`, **never offset**; sorting is offered only on indexed fields — the UI
disables sorting elsewhere rather than sorting a partial page and lying; business lookup is a document
`get`, never a query; **no `collectionGroup` query exists anywhere in Release A or B.**

> **A2 · DB-CR-019.** The hard maximum of 100 is no longer only a client convention. `firestore.rules`
> enforces `request.query.limit <= 100` on the eleven client-listed collections that carry no client
> aggregation (DB-05 §4.0.1). The six aggregation-bearing collections are exempt, because Firestore applies
> the identical rule to `count()`/`sum()` and an unbounded aggregation carries no limit. The exemption and
> its compensating controls are stated in DB-05 §4.0.1 rather than left implicit.

> **Security Rules are not filters.** A query is rejected unless the ruleset can permit its entire
> potential result set. Every query below is therefore scoped to a single tenant path, or is a public
> `get`, or executes server-side inside a callable with the Admin SDK. **No cross-tenant client list
> query exists.** Each row's *Permission assumption* states the rule that must admit it.

## 0. Cost model

`READS` is the billed document reads for one execution at the stated page size.

**Aggregation cost — stated exactly (A2 · DB-CR-020).** Verified against current official Firestore
pricing: an aggregation query is billed *"one read operation for each batch of up to 1000 index entries
read by the query"*, with *"a minimum charge of one document read"* for an aggregation that reads zero
index entries. So an aggregation is **not** unconditionally one read; it is `ceil(matched index entries /
1000)`, minimum 1. The tables below therefore print **`1 per 1000 index entries, min 1`** rather than a
flat `1`. At the canonical seed's scale — twelve products, two store rooms, zero open purchase orders —
every KPI matches double-digit index entries, three orders of magnitude below the first billing boundary,
so each costs exactly 1. That is a **measured expectation at current and demo scale, not an unbounded
architectural guarantee**, and the distinction is what keeps `NFR-017` an honest claim.

Denied reads are still billed, which is why the rules `get()` discipline matters.

Frozen budgets (`NFR-017`, `02` line 269): **dashboard first render ≤ 12 reads**; **product list page ≤ 27
reads**. Both are an **obligation to measure at Stage 17**, not a proven claim (DB-10 §7 item 7).

---

## 1. Public and user-scoped

| Q | Caller | Path / collection | Tenant boundary | Filters | Order | Cursor | Page | Max | Index | Reads | RT | Empty | Permission assumption |
|---|---|---|---|---|---|---|---|---|---|---|:-:|---|---|
| Q-001 | 004, 007, 032, 005 | `organizationDirectory/{handle}` | public | doc `get` | – | – | 1 | 1 | none | 1 | – | not-found → `STATE-010`/`024` | `allow get: if true` · **`list` denied** |
| Q-002 | shell | `users/{uid}` | self | doc `get` | – | – | 1 | 1 | none | 1 | – | create on first render | `isSelf(uid)` |
| Q-003 | 003, 006, 008 | `users/{uid}/memberships` | self | `status == 'ACTIVE'` | `joinedAt ASC` | – | 25 | 25 | auto single-field | ≤ 25 | – | 0 → onboarding | `isSelf(uid)` |
| Q-004 | 026, 052 | `users/{uid}/notifications` | self | `read == false` \| none | `createdAt DESC` | ✔ | 25 (5 on 052) | 100 | `IDX-17` | ≤ 25 | – | "You're all caught up." | `isSelf(uid)` |
| Q-005 | 008, 026, 052 | `users/{uid}/notifications` | self | `read == false` | – | – | `count()` | – | `IDX-17` | 1 | **✔ RT-2** | 0 badge hidden | `isSelf(uid)` |

---

## 2. Organization, membership, settings

| Q | Caller | Collection | Filters | Order | Page | Index | Reads | RT | Permission assumption |
|---|---|---|---|---|---|---|---|:-:|---|
| Q-006 | 008, 028 | `organizations/{orgId}` doc `get` | – | – | 1 | none | 1 | – | `isActiveMember(orgId)` |
| Q-007 | 008, 028 | `…/settings/main` doc `get` | – | – | 1 | none | 1 | – | `isActiveMember(orgId)` |
| Q-008 | 008 | `…/members/{uid}` doc `get` | – | – | 1 | none | 1 | **✔ RT-1** | `isActiveMember(orgId)` |
| Q-009 | 027 | `members` | `status in ['ACTIVE','SUSPENDED']` | `joinedAt ASC` | 25 / 100 | **IDX-31** | ≤ 25 | **A3R-10 — the `role ==` filter and the `displayName ASC` sort are REMOVED.** The canonical Gate 10 board draws the Team header then the table head directly, with **no filter bar**, where Gate 6's product list and Gate 7's supplier list both draw theirs explicitly. `19` `TABLE-016`'s search / role filter / name sort are registry-only (rank 8) and unserved by any index; the first A3 pass narrowed the requirement in prose and left this row unchanged. One bounded page, `IDX-31`, **no new index**. |
| Q-010 | 027 | `…/invitations` | `status == 'PENDING'` | `expiresAt ASC` | 25 / 100 | `status, expiresAt` | ≤ 25 | – | **`hasRole(orgId, ['OWNER','ADMIN'])`** |

---

## 3. Inventory

| Q | Caller | Collection | Filters | Order | Page | Index | Reads | Empty |
|---|---|---|---|---|---|---|---|---|
| **Q-011** | 011 | **`productStockSummaries`** | `productStatus == 'ACTIVE'` | `productName ASC` | 25 / 100 | **IDX-33** | **25** | "Add your first product to start tracking inventory." |
| **Q-012** | 011 | `productStockSummaries` | `productStatus ==`, `categoryId ==` | `productName ASC` | 25 / 100 | **IDX-34** | 25 | "No products match these filters." |
| **Q-013** | 011 | `productStockSummaries` | `productStatus ==` | `productUpdatedAt DESC` | 25 / 100 | **IDX-35** | 25 | – |
| **Q-013b** | 011 | `productStockSummaries` | `productStatus ==`, `stockStatus ==` | `onHandMilli DESC` | 25 / 100 | **IDX-36** | 25 | **A3R-P2 · C1-AUTH-006** — the frozen product-list *on hand* sort is `onHandMilli DESC` (DB-CR-038, §7). The A3-era `ASC` here was pre-matrix text and is SUPERSEDED. |
| Q-014 | 012, 013, 016, 042, **053** | `products/{id}` doc `get` | – | – | 1 | none | 1 | – |
| Q-015 | 011 | `productStockSummaries` | `productStatus ==` and (`internalSkuNormalized >= q, < q+` **or** `productName >= q, < q+`) | **the searched field ASC** | 25 | **IDX-37** / **IDX-33** | 25 | – |
| Q-016 | 012, 014, **011**, **048** | `categories` | `status ==` | `name ASC` | 25 / 100 | `IDX-28` `status, name` | ≤ 25 | – |
| Q-017 | 015, 016, 024, 042, **053**, **013**, **011**, **048** | `warehouses` | `status ==` | `name ASC` | 25 / 100 | `IDX-29` `status, name` | ≤ 25 | – |
| Q-018 | 013, 016, 042, **053** | `stockBalances` | `productId ==` | `onHandMilli DESC` | 25 | **IDX-09** | ≤ 25 | "No stock recorded yet." |
| Q-019 | *(retained, no longer a list source — A2)* | `stockBalances` | `warehouseId ==` | `onHandMilli DESC` | 25 / 100 | **IDX-08** | 25 | superseded by `Q-074`…`Q-076`, which carry the display fields the surface needs. Kept as the named shape behind `Q-056`'s guard and `Q-060`'s per-warehouse `sum()`. |

**A2 · VR-05 — the filter dropdowns now have declared queries.** `Q-016` and `Q-017` previously listed only
the management screens as callers, yet the `TABLE-001` **Category** and **Store room** filters
(`22` `FIELD-050`, `FIELD-051`) and the `SCREEN-048` category and warehouse filters are offered to **all
seven roles** and need the option set. `011` and `048` are added as callers. These are small, rarely-changing
reference reads, cached by TanStack Query across navigations — the same mechanism DB-04 §6 already relies on
for the shell. After DB-CR-016 deleted `ProductStockSummary.categoryName`, `Q-016` is also the **only**
source of the Category label, which is why it is now a first-class page read rather than an implied one.

**A2 · VR-04 — `TABLE-004` lists every ACTIVE store room, including zeros.** The canonical Gate 6 artifact
requires it in its own words: *"A store room with none of this product is listed at zero rather than hidden,
so nobody wonders whether it was checked"* — the board shows MEAT-001 as `Cold Room 120.000 · Main Store
0.000` although no Main Store balance document exists for it. `Q-018` alone returns one row. `TABLE-004` is
therefore **`Q-017` left-joined onto `Q-018` client-side**, absent balances rendering `0.000`. Both queries
are bounded at ≤ 25 and `SCREEN-013` carries no `NFR-017` budget. `Q-017` is added to `013`'s callers.

**A2 · DB-CR-022 (VR-03) — `onHandMilli > 0` is removed from `Q-019` and `Q-061`.** The canonical artifact
states the opposite twice: *"Cooking Oil is listed at zero rather than omitted"* and the sentence quoted
above. A `> 0` predicate would hide exactly the rows the frozen design insists on showing. `IDX-08` serves
the query unchanged. **`Q-056` keeps the predicate** — it is the `warehouse.archive` guard, not a list, and
there *"holds any stock at all"* is precisely the question.

### 3.1 A2 · DB-CR-017 — the warehouse-filtered product list

When the frozen **Store room** filter is active, `TABLE-001` is served from `stockBalances` — **not** from
`productStockSummaries` and **never** by joining the two. See §6 for the read-budget arithmetic this
replaces. Rows are per store room, and the *On hand*, *Stock value* and *Status* columns are that store
room's figures, labelled as such.

| Q | Caller | Collection | Filters | Order | Page | Index | Reads |
|---|---|---|---|---|---|---|---|
| **Q-074** | 011, 048 | `stockBalances` | `productStatus ==`, `warehouseId ==` | `productName ASC` | 25 / 100 | **IDX-39** | **25** |
| **Q-075** | 011, 048 | `stockBalances` | `productStatus ==`, `warehouseId ==`, `categoryId ==` | `productName ASC` | 25 / 100 | **IDX-40** | 25 |
| **Q-076** | 011, 048 | `stockBalances` | `productStatus ==`, `warehouseId ==` | `onHandMilli DESC` | 25 / 100 | **IDX-41** | 25 |
| **Q-077** | 011 | `stockBalances` | `productStatus ==`, `warehouseId ==` | `productUpdatedAt DESC` | 25 / 100 | **IDX-42** | 25 |
| **Q-078** | 011 | `stockBalances` | `productStatus ==`, `warehouseId ==`, `internalSkuNormalized >= q, < q+` | `internalSkuNormalized ASC` | 25 | **IDX-43** | 25 |

A **name** prefix search inside a store room is served by `IDX-39` (`productName` is already its trailing
ordered field) and needs no additional index. The same forced-sort rule as `Q-015` applies: while a search
term is active the sort is the searched field.

**A3 · DB-CR-025 — `stockStatus` IS persisted on the balance row, and `Store room × Status` is an
ordinary query.** DB-CR-018 is reversed; its cost argument was wrong (DB-00 §8.2, DB-02 §4.4). The frozen
filter bar draws `Category: All ▾ · Store room: All ▾ · Status: All ▾ · Archived: Excluded ▾` — all four
simultaneously — so the combination must be expressible, and owner brief §J forbids resolving it by
deleting the control or by filtering a fetched page client-side.

| Q | Caller | Collection | Filters | Order | Page | Index | Reads |
|---|---|---|---|---|---|---|---|
| **Q-074s** | 011, 048 | `stockBalances` | `productStatus ==`, `warehouseId ==`, **`stockStatus ==`** | `productName ASC` | 25 / 100 | **IDX-44** | **25** |

`Q-074`…`Q-078` each gain the optional `stockStatus ==` predicate; `IDX-44`
(`productStatus, warehouseId, stockStatus, productName`) serves the combination at the **same 25 reads**.
`UI-OD-002`'s ruling — that with a store room selected the Status filter means *that store room's* stock
status — is now literally what the field holds.

**The *Archived* filter is `Excluded | Only`, never *Included* (A3 · DB-CR-029).** The canonical Gate 6
board states *"Anything you archive appears here, behind the Archived filter and **never mixed into the
active list**"* — the design has no mixed option. `Excluded → productStatus == 'ACTIVE'`,
`Only → productStatus == 'ARCHIVED'`. Both are single-equality predicates on the existing leading field,
so **`IDX-33`, `IDX-34`, `IDX-39`, `IDX-40` serve both unchanged and no index is added.**
| Q-020 | 011, 013 | `productStockSummaries/{productId}` doc `get` | – | – | 1 | none | 1 | – |
| ~~Q-021~~ | — | — | — | — | — | — | — | **A3 · DB-CR-028 — REPLACED.** It filtered `LOW_STOCK` only, so `Cooking Oil`, the OUT_OF_STOCK row the canonical board places **first**, could never appear. |
| **Q-021a** | 010 | `productStockSummaries` | `productStatus == 'ACTIVE'` and `stockStatus == 'OUT_OF_STOCK'` | **`shortfallMilli DESC`** | 5 | **IDX-46** | 5 | — |
| **Q-021b** | 010 | `productStockSummaries` | `productStatus == 'ACTIVE'` and `stockStatus == 'LOW_STOCK'` | **`shortfallMilli DESC`** | **`5 − k`**, where `k` = rows returned by `Q-021a` | **IDX-46** | ≤ 5 − k | "Nothing needs attention — every tracked product is above its minimum and none is out of stock." |

**Search (`Q-015`) is a bounded prefix range on an indexed field, not full-text.** `FIELD-049` is scoped
to the list it sits in. Enterprise full-text search is explicitly excluded from scope; the UI must not
imply substring or fuzzy matching.

**Constraint that must reach the UI:** Firestore requires the first `orderBy` to be the field carrying
the range filter. **While a search term is active, the sort is forced to the searched field** (SKU or
name) and the other sort options are disabled — the same rule the frozen design already applies to
non-indexed columns. Sorting a partial result set and calling it "by on hand" would be a lie.

**A3 · DB-CR-030 — where the forced-sort rule must NOT be applied.** Two frozen surfaces fix their sort
and cannot accept it: `TABLE-006` (*"Sort time only"*, and the canonical board draws `Date ↓`) and
`TABLE-010`. Both search boxes are therefore specified as **entity resolvers, not text scans**: the term
runs against an already-indexed prefix field on a *different* collection, and the resulting ids are
applied to the list query as an `in` predicate, leaving `createdAt DESC` intact. This adds **no index to
`stockMovements` or `purchaseOrders`**, keeps both lists bounded, and implements the frozen control rather
than deleting it (owner brief §C.4). Firestore's 30-value `in` ceiling bounds the resolver at `limit 10`;
beyond that the UI asks the user to narrow — the same bounded-search honesty `Q-015` already applies.

---

## 4. The stock ledger — the `TABLE-006` filter cube

`TABLE-006` permits any combination of `{ product?, warehouse?, Kind? }` plus a `createdAt` range, always
ordered `createdAt DESC`. A Firestore composite index is required per equality-set. Eight subsets, one of
which (`createdAt` alone) is served by a single-field index.

| Q | Filters | Index | Reads | Note |
|---|---|---|---|---|
| Q-022 | date range only | `IDX-07` `createdAt DESC` | 25 | also serves Recent Activity |
| Q-023 | `productId` | **IDX-05** | 25 | product detail recent movements uses `limit(5)` |
| Q-024 | `warehouseId` | **IDX-06** | 25 | |
| Q-025 | Kind | **IDX-20** `movementType, createdAt DESC` | 25 | *Correction* uses `in ['ADJUSTMENT_IN','ADJUSTMENT_OUT']` |
| Q-026 | `productId` + `warehouseId` | **IDX-21** | 25 | **closes a pre-existing gap** — `TABLE-006` always permitted this pair and `11` §8 declared no index for it |
| Q-027 | `productId` + Kind | **IDX-22** | 25 | |
| Q-028 | `warehouseId` + Kind | **IDX-23** | 25 | |
| Q-029 | `productId` + `warehouseId` + Kind | **IDX-24** | 25 | |
| Q-030 | `transferId ==` | auto single-field | **2** | fetches both halves of a transfer; `limit(2)`; used by tests and by the ledger's paired-row rendering |
| Q-063 | none | `IDX-07` | 5 | dashboard Recent Activity |

A `Kind` filter combined with an `in` of two values still uses the same composite index as an equality on
`movementType`; Firestore expands `in` into parallel index scans. `in` is capped at 30 values — we use 2.

---

## 5. Partners, procurement, reports

| Q | Caller | Collection | Filters | Order | Page | Index | Reads |
|---|---|---|---|---|---|---|---|
| Q-031 | 018, 019, 022 | `privatePartners` | `partnerTypes array-contains 'SUPPLIER'\|'BUYER'`, `status ==` | `name ASC` | 25 / 100 | **IDX-10** | 25 |
| Q-032 | 020 | `privatePartners/{id}` doc `get` | – | – | 1 | none | 1 |
| Q-033 | 010, 021 | `purchaseOrders` | `status in [...]` | `createdAt DESC` | 25 / 100 (5 on dashboard) | **IDX-11** | ≤ 25 |
| Q-034 | 021, 033 | `purchaseOrders` | `supplierKind ==`, `status in [...]` | `createdAt DESC` | 25 / 100 | **IDX-12** | 25 |
| Q-035 | 024 | `purchaseOrders` | `status in ['ORDERED','PARTIALLY_RECEIVED','SHIPPED']` | `expectedDate ASC` | 25 | **IDX-13** | ≤ 25 |
| Q-036 | 023, 024, 038, 039, 040 | `purchaseOrders/{poId}` doc `get` | – | – | 1 | none | 1 (**RT-3**) |
| Q-037 | as above | `…/{poId}/items` | – | `itemId ASC` | 50 | auto | ≤ 50 |
| Q-038 | as above | `…/{poId}/history` | – | `createdAt DESC` | 25 | auto | ≤ 25 |
| Q-039 | 020 | `purchaseOrders` | `privateSupplierId ==`, `status in [open]` | `createdAt DESC` | 10 | `privateSupplierId, status, createdAt DESC` | ≤ 10 |
| Q-040 | 020 | `purchaseOrders` | `privateSupplierId ==`, `status in [final]` | `createdAt DESC` | 10 | same | ≤ 10 |
| **Q-061** | 048 | **`productStockSummaries`** — the **unfiltered** Stock-on-Hand report | `productStatus == 'ACTIVE'` | `productName ASC` | 25 / 100 | **IDX-33** | **25** |
| **Q-061b** | 048 | `productStockSummaries` — the report **grouped by category** | `productStatus == 'ACTIVE'` | `categoryId ASC, productName ASC` | 25 / 100 | **IDX-34** | **25** |
| **Q-083** | 017 | ledger search — **A3 · DB-CR-030, corrected by A3R-08.** The term resolves through **`Q-015r`**, then the ids are applied to `Q-022`/`Q-023` as `productId in [...]` | `createdAt DESC` **preserved** | 25 / 100 | **IDX-05** | ≤ 11 + 25 |
| **Q-015r** | 017, 021 | the **resolver** variant of `Q-015` — `productStockSummaries`, `productStatus in ['ACTIVE','ARCHIVED']` and (`internalSkuNormalized` or `productName` prefix range) | the searched field ASC | **`limit(11)`** | **IDX-37** / **IDX-33** | ≤ 11 |
| **Q-084a** | 021 | PO-list search **by order number** — `purchaseOrders`, `orderNumber >= q, < q+` | **`orderNumber ASC`** (forced-sort rule applies) | 25 | automatic single-field | 25 |
| **Q-084b** | 021 | PO-list search **by supplier** — the term resolves through `Q-015r`-style prefix on `privatePartners` (`Q-031`, `limit(11)`), then `privateSupplierId in [...]` | `createdAt DESC` **preserved** | 25 / 100 | **IDX-26** | ≤ 11 + 25 |

**A3R-07 — the previous `Q-084` was unimplementable.** It filtered `counterpartyId ==`, a field that does
not exist on `purchaseOrders` (DB-02 §5.2 declares `supplierKind`, `counterpartyName` as a display string,
and `privateSupplierId?`), and cited `IDX-11/12`, neither of which contains a counterparty field. It was
also singular where the resolver is plural. The canonical Gate 7 board draws **`Search by order number or
supplier`** — two dimensions — so it is two queries: `Q-084a` accepts the forced-sort rule (an order-number
search sorts by order number), `Q-084b` uses the resolver technique and keeps `createdAt DESC`.
| Q-062 | 049 | `purchaseOrders` | `status in`, `supplierKind ==?`, `createdAt` range | `createdAt DESC` | 25 / 100 | **IDX-11/12** | 25 |
| **Q-085 … Q-089** | 049 | `CHART-003` status distribution — **one `count()` per displayed PO status family** over the **same** filter set as `Q-062`, so the chart is a distribution and not a sample of page 1 | – | – | **IDX-11/12** | **5** (1 per aggregation at demo scale) |

**A3R-09 — SCREEN-049 is REINSTATED. A3 §8.5 was wrong to delete it.** The first A3 pass struck it on the
canonical Gate 6 board's copy (*"The Reports page lists exactly two entries and says so"*). That is
authority **rank 7**. `02_FINAL_REQUIREMENTS_SPECIFICATION` **`FR-DASH-005` is `A-MUST`: "Purchase-Order
report."** — authority **rank 1**, and `23_FINAL_UI_STATE_AND_PERMISSION_MATRIX` carries a per-role row
for the screen. Rank 1 outranks rank 7, so the report is in Release A scope and `CHART-003` is served by
five declared aggregations rather than being computed from a 25-row page. The Gate 6 board's *"exactly
two"* copy is recorded as a **design-side** inconsistency for the owner (`DB_00` §8.9 item 4); it does not
remove a requirement.

**This is the one place the first A3 pass applied precedence in the wrong direction** — it used rank 7 to
strike something rank 1 requires. Every other §8.5 deletion is a rank-7-over-rank-8 ruling against `19`
or `22` only, and each was re-checked against `02`, `03`, `05`, `06` and `23` in this pass.
| **Q-044** | 013 (tab is **O/A/PM** + `networkEnabled`) | `…/productMappings` | `status == 'VERIFIED'`, `buyerProductId ==` | `createdAt DESC` | 25 | **IDX-15** | ≤ 25 |
| **Q-048** | 013 (tab is **Owner/Admin only**) | `…/auditLogs` | `entityType == 'PRODUCT'`, `entityId ==` | `createdAt DESC` | 25 | **IDX-18** | ≤ 25 |

**A2 · DB-CR-021 (VR-01) — three undefined query ids.** `Q-044` and `Q-048` were referenced by DB-03
(SCREEN-013) and **defined nowhere**; `Q-011a` was referenced by `Q-061`'s own row and defined nowhere;
§9 claimed *"74 query ids"* against **71** defined rows. `QUERY_COVERAGE = 100%` was therefore false. The
two real queries are defined above against **existing** indexes, `Q-011a` is deleted along with the join it
named, and §9's count is now asserted by test rather than stated.

**`Q-048`'s tab is Owner/Admin only.** It reads `auditLogs`, which `06` §5 and `23` §3 restrict to
Owner/Admin and which `firestore.rules` already enforces via `hasRole(orgId, ADMINS)`. DB-03 previously
listed the Activity tab under an all-roles surface — a documentation defect, not a live leak, now corrected
in both files.

**A2 · DB-CR-017 / VR-02 — `Q-061` carried the DB-CR-011 defect verbatim.** It previously read
*"`stockBalances` (+ `Q-011a` join)"* — 25 balances plus 25 summaries, the identical undeclared 50-read
join that DB-CR-011 rejected for the product list and that IR-03 caught on the warehouse filter. The
Stock-on-Hand report now has exactly two modes, neither of which joins:

| Mode | Served from | Rows | Reads | Frozen evidence |
|---|---|---|---|---|
| **Store room: All** — product-level | `productStockSummaries` (`Q-061`) | one per ACTIVE product | **25** | Canonical Gate 6: *"12 rows · the same twelve products, the same figure the dashboard shows"* and *"Cooking Oil is listed at zero rather than omitted"* — Cooking Oil has a zeroed summary from `product.create`, so it is present. |
| **Store room: W** — per store room | `stockBalances` (`Q-074` … `Q-076`) | one per balance in W | **25** | Same collection and columns as the warehouse-filtered `TABLE-001`, so the two surfaces share one contract. |

**CSV export exports the already-fetched, authorized page set only.** There is no unbounded export
query, and there is no mobile export at all (`CHG-044` / `MOBILE_REPORT_EXPORT = 0`).

---

## 6. Network (Release B-Lite) and aggregations

| Q | Caller | Collection | Filters | Order | Page | Index | Reads |
|---|---|---|---|---|---|---|---|
| Q-041 | 031, 036 | `…/connections` (projection) | `status in [...]` | `updatedAt DESC` | 25 / 100 | **IDX-14** | 25 |
| Q-042 | 020, 033 | `…/connections/{id}` doc `get` | – | – | 1 | none | 1 (**RT-4**) |
| Q-043 | 013, 033, 037, 038 | `…/productMappings` | `status ==`, `buyerProductId ==?` | `createdAt DESC` | 25 / 100 | **IDX-15** | ≤ 25 |
| Q-045 | 034, 051 | `…/partnerCatalog` (own org) | `published ==?` | `partnerSkuNormalized ASC` | 25 / 100 | **IDX-16** | 25 |
| **Q-046** | 035 | **callable `partnerCatalog.list`** | server: connection ACTIVE, then `published == true` | `partnerSkuNormalized ASC` | 25 / **100 hard** | **IDX-16** | server-side | 
| **Q-047** | 036 | **callable `partnerCatalog.lookupBySku`** | server: connection ACTIVE, `partnerSkuNormalized ==`, `published == true`, `limit(1)` | – | 1 | **IDX-16** | server-side |

`Q-046`/`Q-047` have **no client read path**. A rule on `organizations/{supplierOrgId}/partnerCatalog/**`
could not determine which of the caller's organizations is the buyer without a `get()` per candidate
organization — unbounded, and forbidden. Making the catalog callable-only costs one function and removes
an entire vulnerability class.

**Aggregation-backed KPIs** — `FR-DASH-008`. No dedicated aggregation index is needed; each reuses an
existing composite or single-field index.

`Reads` below is `ceil(matched index entries / 1000)`, minimum 1 (§0). The seed-scale column is what the
canonical dataset actually costs and is the figure `NFR-017` is measured against at Stage 17.

| Q | KPI | Query | Index | Reads (general) | Seed scale | Roles |
|---|---|---|---|---|:-:|---|
| Q-050 | Active SKUs | **`count()` `productStockSummaries where productStatus == 'ACTIVE'`** | **IDX-33** | 1 per 1000 entries, min 1 | **1** (12 entries) | all 7 |
| Q-051 | Low stock | `count()` `productStockSummaries where stockStatus == 'LOW_STOCK'` | IDX-04 | as above | **1** (4 at t₀) | all 7 |
| Q-052 | Out of stock | `count()` … `== 'OUT_OF_STOCK'` | IDX-04 | as above | **1** (1) | all 7 |
| Q-053 | Inventory value | `sum('stockValueMinor')` over `productStockSummaries` | single-field `stockValueMinor` | as above | **1** (12 entries) | all 7 |
| Q-054 | Open POs | `count()` `purchaseOrders where status in [ORDERED, SUBMITTED, ACCEPTED, SHIPPED, PARTIALLY_RECEIVED]` | IDX-11 | as above | **1** (0) | **`NOT_VIEWER`** |
| Q-055 | Awaiting receipt | `count()` `purchaseOrders where status in [SHIPPED, PARTIALLY_RECEIVED]` | IDX-11 | as above | **1** (0) | **`NOT_VIEWER`** |
| Q-060 | Inventory by location | **`sum('stockValueMinor')`** per warehouse — one aggregation per ACTIVE warehouse, bounded by the warehouse count | **IDX-68** | as above, **× warehouses** | **2** (2 store rooms) | all 7 |
| Q-064 | Pending connections | `count()` `connections where status == 'PENDING'` | IDX-14 | as above | **1** (0) | **`PARTNER_WRITERS`** |
| Q-065 | Connected POs awaiting response | `count()` `purchaseOrders where supplierKind == 'CONNECTED' and status == 'SUBMITTED'` | IDX-12 | as above | **1** (0) | **`NOT_VIEWER`** ∩ `PARTNER_WRITERS` |

**A2 · DB-CR-015 — the Roles column is new and it changes the Viewer dashboard.** `06` §5 denies Viewer
*View purchase orders*, and `23` §11 limits Viewer to *"dashboard, product/stock read, Stock-on-Hand report
and notifications"*. `Q-054`, `Q-055` and `Q-065` are purchase-order reads, so the **Viewer dashboard omits
the Open POs and Awaiting receipt KPIs and the recent-POs panel**, and `Q-063` *Recent stock movements* is
omitted too. This was always the frozen intent; it was simply never written into a role column. After
DB-CR-015 the rules layer enforces it, so a Viewer dashboard that still issued those queries would fail
rather than leak.

**Dashboard first-render budget — stated precisely rather than optimistically.**

| Component | Reads |
|---|---|
| Shell — `Q-006`, `Q-007`, `Q-008` | 3, **cached by TanStack Query across navigations**, so 0 on a warm shell |
| KPI row — `Q-050`, `Q-051`, `Q-052`, `Q-053`, `Q-054`, `Q-055` | **6 at seed scale** — 6 aggregations, each matching double-digit index entries, so 1 read each (§0) |
| Needs Attention — `Q-021a` **then** `Q-021b` (above the fold, so not deferrable) | **≤ 6** |
| **First meaningful render, warm shell** | **12** ✔ at the ≤ 12 budget, **at seed scale** (A3R-17: Needs Attention 5 → ≤ 6) |
| Cold shell | 14 — over budget on the very first navigation of a session only |
| Deferred below the fold — `Q-063`, `Q-033`, `Q-060` | 5 + 5 + 1-per-warehouse |
| **Viewer variant** — `Q-054`, `Q-055`, `Q-063`, `Q-033`, `Q-065` absent (DB-CR-015) | **9** warm / 12 cold |

**A2 · DB-CR-020 — what "6 aggregations = 6 reads" does and does not claim.** It is a measured expectation
at the canonical seed's scale, where every KPI matches far fewer than the 1000 index entries that constitute
one billed read. It is **not** an unbounded architectural guarantee: at 12,000 active products `Q-050` alone
would bill 12 reads and the ≤ 12 budget would be gone. The honest statement of `NFR-017` is therefore *"≤ 12
reads at the dataset the coursework demonstrates, measured at Stage 17"*, and the scale at which it holds is
now written down instead of assumed.

This remains an **obligation to measure at Stage 17**, not a claim already proven. `Q-060` is the one figure
that scales with warehouse count; beyond roughly ten warehouses it must move behind an interaction.
**No distributed counter is introduced.** At twelve products and two store rooms a counter would be
premature complexity, and DB-07 §12 forbids a manually editable KPI document outright.

**Product-list budget — DB-CR-011, a correction found in the second adversarial pass.** The original
plan read 25 `products` and then joined 25 `productStockSummaries` by `documentId() in [...]`. That is
wrong: an `in` query still bills **one read per returned document**, so the page would cost **50 reads**
and breach the frozen `NFR-017` budget of 27. Batching does not reduce billing; it reduces round trips.

**Resolution: `TABLE-001` is served entirely from `productStockSummaries`.** The summary is already 1:1
with the product, is already written transactionally by the stock commands, and now carries the
denormalised display fields (DB-02 §4.5): `productName`, `internalSku`, `internalSkuNormalized`,
`categoryId`, `productStatus`, `baseUnitPriceMinor`, `minimumStockMilli`, `productUpdatedAt`.
The product list therefore costs exactly **25 reads**, from one collection, with one index per sort —
inside budget with room to spare.

`products` remains canonical. `product.create` and `product.update` write the summary's denormalised
fields **in the same transaction** (they already write it for `stockValueMinor`), so `DV-10` holds by
construction and no new drift class is introduced.

**A2 · DB-CR-016 — two of those fields are gone.** `categoryName` and `preferredSupplierName` are deleted
from the summary. Unlike the rest of the DV-10 set they were sourced from a *different* document —
`categories/**` and `privatePartners/**`, both `SAFE_DIRECT_CLIENT_WRITE` — and DV-10 named the rename
fanout as happening *"inside `category.update`"*, **a command that does not exist**. `preferredSupplierName`
was additionally a leak: after DB-CR-015 `privatePartners` is `PARTNER_WRITERS`-only, so copying a partner
name into an all-roles-readable document would hand four denied roles exactly that data. The **Category**
column now renders from `Q-016` (the reference set the filter already loads) and the **Preferred Supplier**
column renders only for `PARTNER_WRITERS` from `Q-031`. Product-list cost: **25 warm**;
**25 + |ACTIVE categories| cold**, four in the canonical seed. Recorded the same way the cold-shell
dashboard figure is recorded, rather than rounded away.

### 6.1 A2 · IR-03 / DB-CR-017 — the warehouse filter, resolved physically

**The defect, in this file's own previous words:** *"Warehouse filter on the product list is the one filter
that cannot be served from the summary… It is a two-step read: `Q-019` (25 rows) then the matching summaries
by id. It is bounded to one page and is the only two-step list in the system."*

**25 + 25 = 50 reads against a frozen `NFR-017` budget of 27.** That is the identical arithmetic DB-CR-011
had just rejected two paragraphs earlier, and calling it *"the only two-step list"* described the breach
without noticing it was one. The external reviewer caught it. The filter is frozen and drawn (`19`
`TABLE-001` *warehouse* filter; `22` `FIELD-051`; canonical Gate 6 board `Store room: All ▾`), so it is
**not** exempted and **not** removed.

**Resolution.** The filtered list is served entirely from `stockBalances`, which now carries the same
denormalised product display fields (DB-02 §4.4): `Q-074` … `Q-078`, indexes `IDX-39` … `IDX-43`.

| | Unfiltered | Warehouse-filtered |
|---|---|---|
| Collection | `productStockSummaries` | `stockBalances` |
| Grain | one row per product | one row per product **per store room** |
| Queries | `Q-011` … `Q-015` | `Q-074` … `Q-078` |
| Reads | **25** | **25** ✔ |
| Joins | 0 | **0** |
| *On hand* / *Stock value* / *Status* | organization-wide | that store room's |

**Why not the alternatives.** A `warehouseIds` array on the summary is forbidden by DB-02 §0 (*"No field
anywhere is an unbounded array"*) and would have to be maintained by `stock.transfer`, breaking `INV-23`.
Cutting the page size to 13 to fit 26 reads would break the frozen *"25 per page"* contract drawn on the
board. Exempting the filter from `NFR-017` requires an authority that does not exist.

**Why this is cheap.** `stockBalances` is already written in the same transaction by every stock command,
exactly like the summary, so the fields inherit DB-CR-011's consistency argument unchanged. The only new
work is that `product.update` and `product.setStatus` fan out to that product's balances — **one product,
at most one document per ACTIVE warehouse**, via existing `IDX-09` with `limit(100)`, inside the transaction
they already open. That is bounded by the *warehouse* count, which is what distinguishes it from the
category fanout A2 deleted, which was bounded only by how many products share a category and refused above
500. Governed by **DV-11**.

---

## 7. Complete index set — the authority for `firestore.indexes.json`

Single-field indexes Firestore creates automatically are not listed. All indexes are deployed **before**
the application (`11` §28).

| # | Collection | Fields | Serves |
|---|---|---|---|
| IDX-01 | `products` | `status ASC, name ASC` | active-SKU `count()`; PO-builder product picker |
| IDX-02 | `products` | `status ASC, categoryId ASC, name ASC` | PO-builder picker, category-scoped |
| IDX-04 | `productStockSummaries` | `stockStatus ASC, onHandMilli ASC` | low-stock list and `count()` |
| IDX-05 | `stockMovements` | `productId ASC, createdAt DESC` | product movement history |
| IDX-06 | `stockMovements` | `warehouseId ASC, createdAt DESC` | warehouse movement history |
| IDX-07 | `stockMovements` | `createdAt DESC` | org-wide ledger and Recent Activity |
| IDX-08 | `stockBalances` | `warehouseId ASC, onHandMilli DESC` | warehouse archive guard; inventory by location |
| IDX-09 | `stockBalances` | `productId ASC, onHandMilli DESC` | product-detail per-warehouse table |
| IDX-10 | `privatePartners` | `partnerTypes ARRAY, status ASC, name ASC` | supplier / buyer tabs |
| IDX-11 | `purchaseOrders` | `status ASC, createdAt DESC` | PO list; open-PO `count()` |
| IDX-12 | `purchaseOrders` | `supplierKind ASC, status ASC, createdAt DESC` | private vs connected tabs |
| IDX-13 | `purchaseOrders` | `status ASC, expectedDate ASC` | awaiting-receipt panel |
| IDX-14 | `connections` (projection) | `status ASC, updatedAt DESC` | connections list |
| IDX-15 | `productMappings` | `status ASC, buyerProductId ASC` | mappings list; product-detail mappings |
| IDX-16 | `partnerCatalog` | `published ASC, partnerSkuNormalized ASC` | supplier catalog; buyer SKU lookup |
| IDX-17 | `notifications` | `read ASC, createdAt DESC` | notification list and unread `count()` |
| IDX-18 | `auditLogs` | `entityType ASC, entityId ASC, createdAt DESC` | per-object Activity tab |
| **IDX-20** | `stockMovements` | `movementType ASC, createdAt DESC` | **A1** — Kind filter |
| **IDX-21** | `stockMovements` | `productId ASC, warehouseId ASC, createdAt DESC` | **gap closure** — product + warehouse filter |
| **IDX-22** | `stockMovements` | `productId ASC, movementType ASC, createdAt DESC` | **A1** |
| **IDX-23** | `stockMovements` | `warehouseId ASC, movementType ASC, createdAt DESC` | **A1** |
| **IDX-24** | `stockMovements` | `productId ASC, warehouseId ASC, movementType ASC, createdAt DESC` | **A1** |
| IDX-25 | `members` | `status ASC, role ASC` | notification recipient resolution `limit(50)` |
| IDX-26 | `purchaseOrders` | `privateSupplierId ASC, status ASC, createdAt DESC` | partner open POs / order history |
| IDX-27 | `invitations` | `status ASC, expiresAt ASC` | pending invitations |
| IDX-28 | `categories` | `status ASC, name ASC` | category list |
| IDX-29 | `warehouses` | `status ASC, name ASC` | warehouse list |
| IDX-30 | `products` | `status ASC, internalSkuNormalized ASC` | PO-builder SKU picker |
| IDX-31 | `members` | `status ASC, joinedAt ASC` | team list |
| **IDX-33** | `productStockSummaries` | `productStatus ASC, productName ASC` | **DB-CR-011** — default product list; SKU/name prefix search |
| **IDX-34** | `productStockSummaries` | `productStatus ASC, categoryId ASC, productName ASC` | **DB-CR-011** — category filter |
| **IDX-35** | `productStockSummaries` | `productStatus ASC, productUpdatedAt DESC` | **DB-CR-011** — "recently updated" sort |
| **IDX-36** | `productStockSummaries` | `productStatus ASC, stockStatus ASC, onHandMilli DESC` | **DB-CR-011** — stock-status filter on the list. **A3R-P2 · C1-AUTH-006:** `onHandMilli` is **`DESC`**. The later **DB-CR-038** matrix rule controls, and this row is the matrix's *mode A · status · on-hand* slot; the pre-matrix `ASC` is SUPERSEDED. Every product-list matrix variant that sorts on `onHandMilli` is `DESC`. No index is added, deleted or renumbered — the set is still **67**, the matrix still **32**. |
| **IDX-37** | `productStockSummaries` | `productStatus ASC, internalSkuNormalized ASC` | **DB-CR-011** — SKU prefix search |
| **IDX-38** | `products` | `categoryId ASC, status ASC` | **DB-CR-012** — `category.archive` guard (`Q-072`). **This is the guard index; DB-02 §4.1 previously misnamed it `IDX-33` — corrected by DB-CR-023 (VR-06). This file is the sole authority for index numbering.** |
| **IDX-39** | `stockBalances` | `productStatus ASC, warehouseId ASC, productName ASC` | **A2 · DB-CR-017** — warehouse-filtered `TABLE-001` default sort; also serves the name-prefix search |
| **IDX-40** | `stockBalances` | `productStatus ASC, warehouseId ASC, categoryId ASC, productName ASC` | **DB-CR-017** — category **and** store-room filter combined |
| **IDX-41** | `stockBalances` | `productStatus ASC, warehouseId ASC, onHandMilli DESC` | **DB-CR-017** — *on hand* sort inside a store room; also the per-store-room Stock-on-Hand report |
| **IDX-42** | `stockBalances` | `productStatus ASC, warehouseId ASC, productUpdatedAt DESC` | **DB-CR-017** — *updated* sort inside a store room |
| **IDX-43** | `stockBalances` | `productStatus ASC, warehouseId ASC, internalSkuNormalized ASC` | **DB-CR-017** — SKU prefix search inside a store room |

`IDX-32` (`productMappings` `buyerProductId ASC, supplierCatalogItemId ASC, status ASC`) is declared in §8
for `Q-070`. There is no `IDX-33` on `products`; see the `IDX-38` note above.

`INDEX_COVERAGE`: every query in §1–§6 and §8 resolves to a row above or to an automatic single-field index.
`Q-044` reuses `IDX-15` and `Q-048` reuses `IDX-18`, so DB-CR-021 added two queries and **zero** indexes.
**No collection-group index is required** — the `users/{uid}/memberships` mirror removed the only need
for one.

| **IDX-44** | `stockBalances` | `productStatus ASC, warehouseId ASC, stockStatus ASC, productName ASC` | **A3 · DB-CR-025** — the frozen `Store room × Status` combination on `TABLE-001` |
| **IDX-45** | `users/{uid}/notifications` | `category ASC, createdAt DESC` | **A3 · F-M-09** — the canonical `Stock / Orders / Network` tabs |
| **IDX-46** | `productStockSummaries` | `productStatus ASC, stockStatus ASC, shortfallMilli DESC` | **A3 · DB-CR-028** — Needs Attention, out-first then shortfall |

**A3 index changes.** `IDX-03` (`products status, updatedAt DESC`) and `IDX-19` (`auditLogs createdAt DESC`)
are **deleted** — neither has a query consumer, and DB-01 §12 states there is no audit-log route (F-M-03).
`IDX-02` keeps its place: its consumer is the category-scoped PO-builder picker declared in DB-03 §3
(SCREEN-022). `IDX-37` gains its consumer, `Q-015`, which previously cited `IDX-30` on the wrong
collection (F-M-02).

| **IDX-47** | `productStockSummaries` | `productStatus ASC, onHandMilli DESC` | **A3 · DB-CR-038** — product-list matrix, All store rooms |
| **IDX-48** | `productStockSummaries` | `productStatus ASC, categoryId ASC, internalSkuNormalized ASC` | **A3 · DB-CR-038** — product-list matrix, All store rooms |
| **IDX-49** | `productStockSummaries` | `productStatus ASC, categoryId ASC, onHandMilli DESC` | **A3 · DB-CR-038** — product-list matrix, All store rooms |
| **IDX-50** | `productStockSummaries` | `productStatus ASC, categoryId ASC, productUpdatedAt DESC` | **A3 · DB-CR-038** — product-list matrix, All store rooms |
| **IDX-51** | `productStockSummaries` | `productStatus ASC, stockStatus ASC, productName ASC` | **A3 · DB-CR-038** — product-list matrix, All store rooms |
| **IDX-52** | `productStockSummaries` | `productStatus ASC, stockStatus ASC, internalSkuNormalized ASC` | **A3 · DB-CR-038** — product-list matrix, All store rooms |
| **IDX-53** | `productStockSummaries` | `productStatus ASC, stockStatus ASC, productUpdatedAt DESC` | **A3 · DB-CR-038** — product-list matrix, All store rooms |
| **IDX-54** | `productStockSummaries` | `productStatus ASC, categoryId ASC, stockStatus ASC, productName ASC` | **A3 · DB-CR-038** — product-list matrix, All store rooms |
| **IDX-55** | `productStockSummaries` | `productStatus ASC, categoryId ASC, stockStatus ASC, internalSkuNormalized ASC` | **A3 · DB-CR-038** — product-list matrix, All store rooms |
| **IDX-56** | `productStockSummaries` | `productStatus ASC, categoryId ASC, stockStatus ASC, onHandMilli DESC` | **A3 · DB-CR-038** — product-list matrix, All store rooms |
| **IDX-57** | `productStockSummaries` | `productStatus ASC, categoryId ASC, stockStatus ASC, productUpdatedAt DESC` | **A3 · DB-CR-038** — product-list matrix, All store rooms |
| **IDX-58** | `stockBalances` | `productStatus ASC, warehouseId ASC, categoryId ASC, internalSkuNormalized ASC` | **A3 · DB-CR-038** — product-list matrix, store-room mode |
| **IDX-59** | `stockBalances` | `productStatus ASC, warehouseId ASC, categoryId ASC, onHandMilli DESC` | **A3 · DB-CR-038** — product-list matrix, store-room mode |
| **IDX-60** | `stockBalances` | `productStatus ASC, warehouseId ASC, categoryId ASC, productUpdatedAt DESC` | **A3 · DB-CR-038** — product-list matrix, store-room mode |
| **IDX-61** | `stockBalances` | `productStatus ASC, warehouseId ASC, stockStatus ASC, internalSkuNormalized ASC` | **A3 · DB-CR-038** — product-list matrix, store-room mode |
| **IDX-62** | `stockBalances` | `productStatus ASC, warehouseId ASC, stockStatus ASC, onHandMilli DESC` | **A3 · DB-CR-038** — product-list matrix, store-room mode |
| **IDX-63** | `stockBalances` | `productStatus ASC, warehouseId ASC, stockStatus ASC, productUpdatedAt DESC` | **A3 · DB-CR-038** — product-list matrix, store-room mode |
| **IDX-64** | `stockBalances` | `productStatus ASC, warehouseId ASC, categoryId ASC, stockStatus ASC, productName ASC` | **A3 · DB-CR-038** — product-list matrix, store-room mode |
| **IDX-65** | `stockBalances` | `productStatus ASC, warehouseId ASC, categoryId ASC, stockStatus ASC, internalSkuNormalized ASC` | **A3 · DB-CR-038** — product-list matrix, store-room mode |
| **IDX-66** | `stockBalances` | `productStatus ASC, warehouseId ASC, categoryId ASC, stockStatus ASC, onHandMilli DESC` | **A3 · DB-CR-038** — product-list matrix, store-room mode |
| **IDX-67** | `stockBalances` | `productStatus ASC, warehouseId ASC, categoryId ASC, stockStatus ASC, productUpdatedAt DESC` | **A3 · DB-CR-038** — product-list matrix, store-room mode |
| **IDX-68** | `stockBalances` | `warehouseId ASC, stockValueMinor ASC` | **A3R-02 · DB-CR-039** — serves the `sum('stockValueMinor')` **and** `count()` in `Q-060` and `Q-058`. A filtered aggregation needs a composite index containing the filter field **and** the aggregated field; a single-field index on `stockValueMinor` cannot serve `where warehouseId == W`. |
| **IDX-69** | `productStockSummaries` | `productStatus ASC, stockValueMinor ASC` | **A3R-02 · DB-CR-039** — same rule for `Q-053` (Inventory Value KPI). |

### A3R-01 · DB-CR-038 — the product-list index matrix, completed

The first adversarial pass on A3 found that `IDX-44` alone serves **one** of the five status-filtered
shapes. Firestore matches an index only when the query's equality set is the index's leading prefix and
the `orderBy` field follows it immediately — an index field *between* the equalities and the sort breaks
the match. So `IDX-44` (`productStatus, warehouseId, stockStatus, productName`) serves `Q-074s` and
nothing else, and the frozen four-filter combination (`Category ∧ Store room ∧ Status ∧ Archived`, which
the canonical board draws as four simultaneous dropdowns) had **no index at all**.

The list is a **matrix**, and it is now declared as one rather than patched query by query:

```
mode A · All store rooms  → productStockSummaries   equalities: productStatus [+categoryId] [+stockStatus]
mode B · one store room   → stockBalances           equalities: productStatus, warehouseId [+categoryId] [+stockStatus]
sorts (frozen, four)      : productName ASC · internalSkuNormalized ASC · onHandMilli DESC · productUpdatedAt DESC
```

`(2 modes × 4 filter combinations × 4 sorts) = 32` indexes. Eleven already existed
(`IDX-33`…`IDX-37`, `IDX-39`…`IDX-44`); **21 are added** as `IDX-47 … IDX-67`. The *Archived* filter adds
no dimension — DB-CR-029 makes it a value of the leading `productStatus` equality, which is why
`Excluded | Only` costs nothing here and a mixed *Included* list would have doubled the matrix.

**Codex generates `firestore.indexes.json` from this rule, not by transcription.** A hand-written matrix
of 32 rows is a transcription-error surface; the generator plus an exact-set assertion is not.

**Total: 67 composite indexes** — `IDX-01 … IDX-69` less the deleted `IDX-03` and `IDX-19`. DB-09 §2 and §8 assert the exact set accordingly, and DB-09's index test asserts the set exactly — no extra, no missing.

---

## 8. Command-internal queries

These execute with the Admin SDK **inside** a transaction. Every one is bounded, and none reads a
document belonging to a third organization.

| Q | Command | Query | Bound |
|---|---|---|---|
| Q-056 | `warehouse.archive` | `stockBalances where warehouseId == W and onHandMilli > 0` | **`limit(1)`** — a guard, not a report |
| Q-057 | `warehouse.archive` | `purchaseOrders where status in [ORDERED, PARTIALLY_RECEIVED, ACCEPTED, SHIPPED] and receivingWarehouseId == W` | **`limit(1)`** |
| Q-058 | `015` UI (the `TABLE-027` *Products held* + *Stock value* columns **and** the archive-dialog detail), **outside** the transaction | **`count()` + `sum('stockValueMinor')`** on `stockBalances where warehouseId == W` — **A3R-16: the `onHandMilli > 0` predicate is removed.** The canonical board states *"Products held counts presence, not ownership"* and draws `Cold Room … 6`; with the predicate Main Store would report **5**, because Cooking Oil sits at `0.000 L`. Index **IDX-68** | for the *message detail* only — *"Cold Room holds 6 products worth LKR 398,900.00"*. Aggregations are unavailable inside a transaction, so the **guard** is `Q-056`/`Q-057` and this is display-only |
| **Q-079** | `product.update` · `product.setStatus` | `stockBalances where productId == P` | **`limit(100)`**, index `IDX-09` — **A3 · F-H-01.** Created by DB-CR-017 inside DB-06 and never back-ported to DB-04, which is why `QUERY_COVERAGE = 100%` was false. The bounded fanout that maintains the DB-CR-017 display fields and the DB-CR-025 derived fields. |
| Q-059 | `notify()` | `members where status == 'ACTIVE' and role in [...]` | **`limit(50)`**; resolved **before any write**; exceeding 50 skips the notification and logs a warning rather than blowing the transaction budget |
| Q-066 | `product.create/update` | `productSkuIndex/{skuNorm}` `txn.create` | precondition, not a query |
| Q-067 | `org.create` | `handleReservations/{handle}` `txn.create` | precondition |
| Q-068 | `po.order`, `cpo.submit` | `counters/purchaseOrder` doc read | 1 |
| Q-069 | every idempotent command | `commandReceipts/{operationId}` doc read | 1 — **the first read** |
| Q-070 | `mapping.create` | `productMappings where buyerProductId == P and supplierCatalogItemId == C and status == 'VERIFIED'` | **`limit(1)`**; index `buyerProductId, supplierCatalogItemId, status` (**IDX-32**) |
| **Q-071** | **`stock.transfer`** | `stockBalances/{P}__{FROM}` and `stockBalances/{P}__{TO}` doc reads | **2, by deterministic id — no query, no scan** |
| **Q-072** | **`category.archive`** *(DB-CR-012)* | `products where categoryId == C and status == 'ACTIVE'` | **`limit(1)`** — index **IDX-38**; a guard, not a report |
| **Q-073** | **`warehouse.setDefault`** *(DB-CR-013)* | `settings/main` doc read | 1 |
| **Q-080** | **`C-38 partner.setStatus`** *(A3R-11)* | `purchaseOrders where privateSupplierId == P and status in [ORDERED, PARTIALLY_RECEIVED, ACCEPTED, SHIPPED]` | **`limit(1)`** — index **IDX-26**; a guard, not a report. Runs **inside** the transaction; a returned row means `failed-precondition`. **A3R-P · P-09.** Created by `A3R-11` inside DB-06 and never back-ported here, where it was cited as the undefined id `Q-085g` — the identical defect class as `Q-079` at A3 · F-H-01, one pass later. `Q-085 … Q-089` are the `CHART-003` aggregations (§5) and were never this guard. |

`IDX-32` `productMappings` `buyerProductId ASC, supplierCatalogItemId ASC, status ASC` is added for
`Q-070`; `11` §8 declared no index for the duplicate-mapping guard.

---

## 9. Contract result

```
QUERY_COVERAGE   = 100%   (92 defined query ids — counted mechanically from the rows of this file
                           at A3R-P, not asserted by hand.
                           A3 pass:  +Q-021a, +Q-021b, +Q-061b, +Q-074s, +Q-079, +Q-083, +Q-084;
                                     -Q-021 (replaced), -Q-062 (SCREEN-049 then out of A/B scope).
                           A3R pass: +Q-015r, +Q-084a/b (replacing Q-084), +Q-085...Q-089 (CHART-003),
                                     Q-062 REINSTATED (FR-DASH-005 is A-MUST).
                           A3R-P:    +Q-080, the C-38 archive guard, previously cited as the
                                     undefined id Q-085g in DB-06 §6.2 and DB-07 §12.  91 -> 92.
                           Base set: Q-001...Q-078 incl. Q-013b, less the deleted Q-011a,
                                     less unused Q-049, less Q-021 and Q-084 (both replaced).
                           Gaps preserved as TOMBSTONES, never renumbered or reused:
                                     Q-011a (deleted, DB-CR-021) · Q-021 (replaced by Q-021a/b) ·
                                     Q-049, Q-081, Q-082 (never assigned) · Q-084 (replaced by
                                     Q-084a/b, A3R-07) · Q-085g (never a valid id — the A3R-11
                                     placeholder for the C-38 guard, which collided with the
                                     CHART-003 aggregations and is now Q-080; A3R-P · P-09).
                           Every UI read and every command-internal read has one, and every id
                           referenced by DB-02, DB-03, DB-05, DB-06, DB-08 or DB-11 resolves to a row
                           in this file — the widened scope that A3 · F-H-01 required, because Q-079
                           was referenced by DB-06 and defined nowhere while the old test passed)
QUERY_ID_INTEGRITY = asserted by test, not by assertion — see below
INDEX_COVERAGE   = 100%   (67 composite: IDX-01…IDX-69 less the deleted IDX-03 and IDX-19,
                           + automatic single-field. The product-list matrix (32) is generated from
                           the DB-CR-038 rule and asserted as an exact set, not transcribed)
PAGINATION       = cursor only, 25 / 100, on every list without exception
QUERY_LIMIT_RULE = enforced at <= 100 on 9 marked collections; 6 exempt, reason recorded
                           (DB-05 §4.0.1). A3 · F-H-10: the count was 11 and the table marked 8;
                           users/{uid}/memberships is now assigned to the bounded set -> 9.
REALTIME         = 4 listeners, all bounded, all justified (DB-03 §5)
COLLECTION_GROUP = 0
CROSS_TENANT_CLIENT_QUERIES = 0
RULES_QUERY_COMPATIBILITY   = every client query is single-tenant-path scoped
TWO_STEP_LISTS   = 0      (was 1 — the warehouse filter, removed by DB-CR-017)
JOINED_LISTS     = 0      (was 2 — the warehouse filter and Q-061, both removed by DB-CR-017;
                           A3 · DB-CR-031 removes the third the reviewer found, the TABLE-005/006
                           Reference column, via sourceReferenceSnapshot on the movement)
```

**`QUERY_COVERAGE` is now asserted mechanically.** The historical *"74 query ids"* was a hand count against
**71** defined rows, and `Q-044`, `Q-048` and `Q-011a` were referenced without definition — which is how a
100 % claim survived an incomplete file. DB-09 §8 gains a test that parses this document and DB-03/DB-11,
and fails if any referenced `Q-id` has no row here or any row here has no consumer. A coverage figure that
can drift silently is not a coverage figure.
