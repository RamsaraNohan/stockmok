# DB-03 — FINAL UI → DATA TRACEABILITY MATRIX

## 0.A3 — A3 corrections to this matrix, as amended by A3R and A3R-P

Applied from `DB_00` §8 (A3), §8.10 (A3R) and §8.11 (A3R-P). Every change below is the canonical visual
artifact (authority rank 7) overriding the UI registry (rank 8), a requirement (rank 1) overriding the
canonical artifact, or a genuinely-unserved surface being served.

| Surface | A3 change |
|---|---|
| `TABLE-001` columns | **Product · SKU · Category · On hand · Minimum · Stock value** — the canonical Gate 6 board and `UI-OD-001`. *Preferred Supplier* and *Updated* are removed; `Q-031` is removed from SCREEN-011's reads. Closes the open `DB-10 §7` item 8. |
| `TABLE-001` filters | Four, all combinable: Category · **Store room** · **Status** · Archived. Store room × Status is `Q-074s` on `IDX-44` (DB-CR-025). Archived is **`Excluded \| Only`**, never *Included* — the board forbids mixing. |
| `TABLE-013` (Stock-on-Hand report) | Columns **Product · SKU · Category · On hand · Unit cost · Stock value**, category subtotal rows, final total. Filters **Store room · Category** only. **No** *Warehouse* column, **no** status filter, **no** warehouse sort. Reads `Q-061` / `Q-061b`, or `Q-074`…`Q-076` in store-room mode. |
| `TABLE-004` | *Available* is **derived at balance grain** as `onHandMilli` while `reservedMilli` is constant `0`. Rendered as `Q-017` left-joined onto `Q-018` so a store room holding none of the product shows `0.000` rather than being hidden. |
| `TABLE-005` / `TABLE-006` *Reference* | Served by `sourceReferenceSnapshot` on the movement (DB-CR-031). No join. |
| `TABLE-006` search | **`Q-083`** — the term resolves to product ids through the **`Q-015r`** resolver (`productStockSummaries`, `productStatus in ['ACTIVE','ARCHIVED']`, `limit(11)`), then `productId in [...]` is applied to `Q-022`/`Q-023`, **keeping `createdAt DESC`**. *(A3R-08 — the A3 text cited `Q-013b`/`Q-015`: `Q-013b` is the stock-status filter, not a resolver, and `Q-015` excludes ARCHIVED products the permanent ledger must still surface. Corrected here at A3R-P.)* |
| `TABLE-010` search | **`Q-084a` and `Q-084b`, two queries, not one.** The canonical Gate 7 board draws *"Search by order number or supplier"* — two dimensions. `Q-084a` = `orderNumber` prefix range on `purchaseOrders` (forced-sort rule applies, sorts by order number, automatic single-field index). `Q-084b` = supplier term resolved through a `Q-031`-style prefix on `privatePartners` (`limit(11)`), then `privateSupplierId in [...]` on **`IDX-26`**, `createdAt DESC` preserved. *(A3R-07 — the singular `Q-084` filtered `counterpartyId`, a field `purchaseOrders` does not have. Corrected here at A3R-P.)* |
| Supplier list *Orders placed* | `privatePartners.ordersPlacedCount` (DV-13) — non-cancelled orders placed. Buyers list *Orders* renders `—` in Release A/B. `19` `TABLE-007`'s *Open POs* column is **deleted**: the canonical Gate 7 board draws *Supplier · Contact · Phone · Orders placed*, with no open-order column. The open-order **rule** survives as `C-38`'s in-transaction archive guard, which is where it belongs. |
| `TABLE-015` | Tabs **All · Unread · Stock · Orders · Network** (`Q-004` + `category ==`, `IDX-45`), four `count()` aggregations for the tab numbers. **No *Read* tab** — read/unread is a state. |
| `TABLE-016` (Team) | No search, no role filter, no name sort — the canonical board draws no filter bar. `Q-009`, single bounded page, `joinedAt ASC`, `IDX-31`. |
| `TABLE-018` | Columns **Business · Handle · Relationship · State · Action** + the *"N order placed"* sub-line (`DV-12`, lifetime successfully submitted connected orders; later cancellation does not decrement) + tab counts `All / Connected / Waiting / Past`. *Mapped Items* and *Open Connected POs* deleted. |
| `TABLE-021` / `TABLE-023` | Display snapshots added (DB-CR-036); *sort by internal product* and *no verified-time sort (A3 §8.5)* dropped. |
| `TABLE-027` (Warehouses) | **Name · Type · Products held · Share · Stock value.** Value from `Q-058`'s `sum('stockValueMinor')`; Share = row ÷ `Q-053`, client-side. |
| SCREEN-013 tabs | **Overview · Stock by store room · Movement history · Purchase orders.** *Suppliers* and *Buyers* tabs deleted — a *Buyers* tab could only be sourced from other tenants' `productMappings`, which DB-01 §13 forbids absolutely. |
| SCREEN-013 / SCREEN-012 *preferred supplier* | Deleted — 0 occurrences in the canonical artifact; owner brief §C.8. |
| SCREEN-009 checklist | Five declared queries with role gates: `Q-050`, `Q-016`, `Q-022 limit(1)`, `Q-031` (PARTNER_WRITERS), `Q-009` (ADMINS). Items the role may not check **issue no query** and render from the role filter alone. |
| SCREEN-018 / SCREEN-019 | `Q-041` added for the Connected and Pending tabs. |
| SCREEN-020 | `Q-043` added for mappings; *related products* deleted (not drawn); *activity* scoped to Owner/Admin, matching `Q-048` on SCREEN-013. |
| **SCREEN-049 + `CHART-003`** | **INCLUDED in Release A/B — the A3 omission is SUPERSEDED by A3R-09.** A3 struck the surface on the Gate 6 board's *"The Reports page lists exactly two entries and says so"* — authority **rank 7**. `02_FINAL_REQUIREMENTS_SPECIFICATION` **`FR-DASH-005` is `A-MUST`: "Purchase-Order report"** — authority **rank 1** — and `23` carries a per-role row for the screen. **Rank 1 outranks rank 7.** The table is `Q-062`; `CHART-003` is the **complete status distribution** served by the five declared `count()` aggregations **`Q-085 … Q-089`** over the *same* filter set as `Q-062`, never counted from a 25-row page. The board's *"exactly two"* copy is a **design-side** item for the owner (`DB_00` §8.9 item 4); it does not remove a requirement. |
| `CHART-001` | `Q-050` moved to `productStockSummaries` so all four donut figures share one collection and one query boundary, as `24` requires. |
| `CHART-002` / `TABLE-027` / archive refusal | `sum('stockValueMinor')`, in currency, reconciling to `LKR 691,700.00` = `398,900.00 + 292,800.00`. |
| SCREEN-010 Needs Attention | `Q-021a` + `Q-021b` on `IDX-46` — out-of-stock first, then shortfall descending, exactly as the board's own copy specifies. |
| SCREEN-011 filter range | `FIELD-049, 050, 051, 052, 055` explicitly, not the range `049..055` which swept in the PO-status and date-range fields. |

`UI_DATA_COVERAGE = 100%` over the **Release A/B canonical surface set** as corrected above.

**Status:** FROZEN. Every approved Release A + B-Lite surface mapped to its reads, queries, writes,
mutation class, commands, states, permissions and indexes.
**Surface authority:** the immutable registries `18` (`SCREEN/STATE`), `19` (`FORM`/`TABLE`, routes),
`22` (`ACTION`/`FIELD`), `23` (access matrix), plus amendment A1 (`SCREEN-053`, `FORM-024`,
`ACTION-062`, `STATE-044`).
**Query IDs** are defined in DB-04. **Commands** are defined in DB-06.

```
SURFACES          = 53   (52 frozen + SCREEN-053 Stock Transfer, per A1)
UI_DATA_COVERAGE  = 100%
```

## 0. Reading this matrix

- **Mutation class** is either `SAFE_DIRECT_CLIENT_WRITE` (one of the six rules-guarded surfaces) or
  `TRUSTED_COMMAND_ONLY`. There is no third class. The classification here, in DB-05 and in DB-06 is
  identical by construction.
- **Realtime.** Firestore `onSnapshot` is used on exactly four surfaces (§4). Everything else is a
  one-shot request through TanStack Query. This is a cost and correctness decision, not an oversight:
  a listener on a paginated list re-bills the whole page on every unrelated write.
- **Roles** use `06` §5 / `23` §3 verbatim: `O` Owner · `A` Admin · `IM` Inventory Manager ·
  `PM` Procurement Manager · `SK` Storekeeper · `AN` Analyst · `V` Viewer.
- **Base states** per `19` §1: `Base-D` = loading + error + permission-denied; `Base-L` = `Base-D` +
  empty; `Base-F` = validation + submitting; `Base-M` = success; `Base-X` = confirmation.
- Every organization-scoped surface additionally inherits `SCREEN-008` shell reads `Q-006`, `Q-008`,
  `Q-005`.
- Every list is bounded: page size **25**, hard maximum **100**, cursor `startAfter`, never offset.

---

## 1. Public, authentication and organization entry

| Surface | Roles | Reads (Q) | Displayed data | Filters / sort / page | RT | Writes · class · command | States | Indexes |
|---|---|---|---|---|:-:|---|---|---|
| **001** Public Home | anyone | none | static marketing only | – | – | none | `STATE-001/003` | – |
| **002** Sign Up | anyone | none | – | – | – | Firebase Auth `createUser`; then `users/{uid}` `setDoc(merge)` · **SAFE_DIRECT_CLIENT_WRITE** | Base-F + `004` | – |
| **003** Global Login | anyone | `Q-003` after auth | membership count only | – | – | Auth only; `lastSeenAt` · **SAFE_DIRECT_CLIENT_WRITE** | Base-F + `004`, `STATE-012` | – |
| **004** Branded Login | anyone | **`Q-001`** (public `get` by handle, pre-auth) | monogram, name, `@handle`, industry, country | – | – | Auth only | **`STATE-009…016` all required** | – |
| **005** Invitation Accept | invitee | `Q-001`; invitation resolved **server-side by token** — never a client read | org identity, offered role, expiry | – | – | `team.acceptInvitation` · **TRUSTED_COMMAND_ONLY** | Base-D/F/M + `040/041` | – |
| **006** Workspace Selector | auth | `Q-003` | monogram, full name, `@handle`, role — **ACTIVE mirrors only** | none; small set | – | none | Base-L/D | – |
| **007** Onboarding | auth, 0 memberships | `Q-001` advisory availability `get` | – | – | – | `org.create` · **TRUSTED_COMMAND_ONLY** | Base-F/M + `017…020` | – |
| **008** App Shell | all | `Q-006`, `Q-007`, `Q-008`, `Q-005`, `Q-003` | org identity, role badge, unread count | – | **✔** `Q-008`, `Q-005` | none | Base-D + `016` | `IDX-17` |
| **029** Permission Denied | all | none — **executes no page query** | requested area, current role, required role | – | – | none | `STATE-006` | – |
| **030** 404 | all | none | neutral copy | – | – | none | `STATE-036` | – |
| **041** Password Reset | anyone | none | – | – | – | Auth `sendPasswordResetEmail` | Base-F/M | – |
| **043** Mobile Navigation | all | inherits shell | role/flag-filtered nav | – | – | none | Base-D | – |
| **052** Notification Menu | all | `Q-004` `limit(5)`, `Q-005` | 5 latest + unread count | unread/all | **✔** `Q-005` | `notification.markRead` · **SAFE_DIRECT_CLIENT_WRITE** (`read` only) | Base-L/M | `IDX-17` |

`Q-001` is a document **`get`**, never a query. `list` on `organizationDirectory` is denied, which is
what stops a visitor enumerating every business on the platform. Resolving a handle grants nothing.

---

## 2. Dashboard and inventory

| Surface | Roles | Reads (Q) | Displayed data | Filters / sort / page | RT | Writes · class · command | States | Indexes |
|---|---|---|---|---|:-:|---|---|---|
| **009** Empty Dashboard | all | `Q-050` | zero-state checklist, role-filtered | – | – | none | `STATE-043`, Base-D | `IDX-01` |
| **010** Populated Dashboard | all; **V sees a reduced set — A2** | `Q-053` value · `Q-050` SKUs · `Q-051` low · `Q-052` out · `Q-021a` + `Q-021b` low list · `Q-060` by location · **`NOT_VIEWER` only:** `Q-054` open POs · `Q-055` awaiting · `Q-063` activity · `Q-033` recent POs · B `PARTNER_WRITERS`: `Q-064`; B `NOT_VIEWER`: `Q-065` | 5 KPIs, Needs Attention, `TABLE-024…027`, `CHART-001/002` | per-panel; no pagination | – | none — **no manually editable KPI document exists** | Base-D, per-panel loading/error | `IDX-01/04/11/13`, `stockValueMinor` |
| **044–047** Dashboard role variants | O/A, IM, PM, SK | subset of the above by capability | role-appropriate panels only | – | – | none | Base-D | as above |
| **011** Product List | all read; O/A/IM act | **no store-room filter: `Q-011`/`Q-012`/`Q-013`/`Q-013b`/`Q-015` from `productStockSummaries` (DB-CR-011), 25 reads, no join. Store-room filter active: `Q-074`…`Q-078` from `stockBalances` (A2 · DB-CR-017), 25 reads, no join.** Filter option sets: `Q-016`, `Q-017` | `TABLE-001`: **Product · SKU · Category · On hand (+unit) · Minimum · Stock value**, with the status pill. **No *Preferred Supplier* column, no *Updated* column** (A3 · F-H-04 · F-M-04) | search; **four combinable filters** — Category · Store room · Status · **Archived (`Excluded \| Only`, never *Included*)**. Sort **name, SKU, updated, on hand only** | – | `product.setStatus` · **TRUSTED_COMMAND_ONLY** | Base-L/D/M/X | **the DB-CR-038 32-index matrix**: mode A `IDX-33`…`IDX-37`, `IDX-47`…`IDX-57`; mode B `IDX-39`…`IDX-44`, `IDX-58`…`IDX-67` |
| **012** Product Create / Edit | O/A/IM (others DENIED) | `Q-014`, `Q-016` | `FORM-006` | – | – | `product.create`, `product.update` · **TRUSTED_COMMAND_ONLY** | Base-D/F/M/X | – |
| **013** Product Detail | all read; **tabs role-gated — A2** | `Q-014`, `Q-020`, **`Q-017` + `Q-018`** (Stock tab, left-joined so every ACTIVE store room shows, zeros included — VR-04), `Q-023` `limit(5)` **`NOT_VIEWER` only**, `Q-048` (Activity) **Owner/Admin only**, B: `Q-044` (Mappings) **O/A/PM only** | overview fields, per-warehouse `TABLE-004`, recent `TABLE-005`, mappings | tab-scoped | – | `product.setStatus`; opens `016`, `042`, **`053`** | Base-D + per-tab | `IDX-09/05/18/15` |
| **014** Categories | O/A/IM | `Q-016` | `TABLE-002` | search, status; sort name/updated | – | create/update · **SAFE_DIRECT_CLIENT_WRITE**; **`category.archive` / `restore` · TRUSTED_COMMAND_ONLY** | Base-L/D/F/M/X + archive-blocked | `IDX-28`, `IDX-38` |
| **015** Warehouses | O/A/IM | `Q-017`; on archive click `Q-058` for the blocking detail | `TABLE-003` | search, type/status | – | create/update · **SAFE_DIRECT_CLIENT_WRITE**; `warehouse.archive`, **`warehouse.setDefault`** · **TRUSTED_COMMAND_ONLY**; opens **`053`** | Base-L/D/F/M/X + `STATE-035` | `IDX-08` |
| **016** Stock Adjustment *(modal)* | O/A/IM | `Q-014`, `Q-017`, `Q-018` | current → change → result, live | – | – | `stock.adjust` · **TRUSTED_COMMAND_ONLY** | Base-D/F/M + X (>50 %) + `STATE-037` | – |
| **042** Opening Balance *(dialog)* | O/A/IM | `Q-014`, `Q-017`, `Q-018` (must be absent/zero) | product, store room, quantity, `effectiveAt` | – | – | `stock.recordOpeningBalance` · **TRUSTED_COMMAND_ONLY** | Base-D/F/M + `STATE-037` | – |
| **053** **Stock Transfer** *(modal — A1)* | **O/A/IM** | `Q-014`, `Q-017`, `Q-018` **×2** (source and destination balances) | From ▾, To ▾, Product ▾, Quantity; source-after, destination-after, **total unchanged** | – | – | **`stock.transfer` · TRUSTED_COMMAND_ONLY** | Base-D/F/M + **`STATE-044`** (same store room) + `STATE-037` (replay) + X (>50 % source reduction) | `IDX-09` |
| **017** Movement History | **`NOT_VIEWER`** — V DENIED **in rules, not only in the router (A2 · DB-CR-015)** | `Q-022` … `Q-029` by filter combination; **search is `Q-083` via the `Q-015r` resolver (A3R-08)** | `TABLE-006`: time, product, SKU, **store room (`warehouseNameSnapshot`, DV-14)**, kind, signed qty + unit, **balance after**, actor, **reference (`sourceReferenceSnapshot`, DB-CR-031 — no join)** | search; date range, product, warehouse, **Kind**. Sort **time only** — the forced-sort rule is **not** applied here | – | **none — immutable, no row actions** | Base-L/D | `IDX-05/06/07`, **`IDX-20…24`** |

**`TABLE-006` Kind filter** is implemented per DB-02 §0.2: five equality predicates and one `in` of two
values. No discriminator column exists. **Balance After** is `stockMovements.balanceAfterMilli`
(DB-CR-006) — it cannot be computed from a filtered, paginated page and is therefore persisted.

---

## 3. Private partners, procurement, reports, administration

| Surface | Roles | Reads (Q) | Displayed data | Filters / sort / page | RT | Writes · class · command | States | Indexes |
|---|---|---|---|---|:-:|---|---|---|
| **018** Suppliers | **O/A/PM — enforced in rules (A2)** | `Q-031` | `TABLE-007`, tabs Private/Connected/Pending | tabs, search, status | – | create/update/deactivate · **SAFE_DIRECT_CLIENT_WRITE** | Base-L/D/F/M/X | `IDX-10` |
| **019** Buyers | **O/A/PM — enforced in rules (A2)** | `Q-031` (BUYER) | `TABLE-007` — **directory only, no sales affordance** | as above | – | as above | as above | `IDX-10` |
| **020** Partner Detail | **O/A/PM — enforced in rules (A2)** | `Q-032`, `Q-039`, `Q-040`; connected: `Q-042` | contact, status, `TABLE-008/009` | partner-scoped | – | update/deactivate · **SAFE_DIRECT_CLIENT_WRITE** | Base-D/L/M/X | `IDX-11` |
| **021** PO List | O/A/PM full; IM/SK/AN read; **V DENIED in rules (A2 · `NOT_VIEWER`)** | `Q-033`, `Q-034`; **search is `Q-084a` (order number) or `Q-084b` (supplier, via resolver) — A3R-07** | `TABLE-010` | tabs Private/Connected; **search by order number or supplier**, status, date, kind. Sort created, expected, number, total | – | opens `022`/`038` | Base-L/D/M | `IDX-11/12`, **`IDX-26`** (`Q-084b`) |
| **022** PO Builder | O/A/PM | `Q-031`, `Q-011`, `Q-014` | `FORM-011`, 4-step | – | – | DRAFT create/update · **SAFE_DIRECT_CLIENT_WRITE**; `po.order` · **TRUSTED_COMMAND_ONLY** | Base-D/F/M + `039` | `IDX-01/10` |
| **023** PO Detail | O/A/PM full; IM/AN read; SK limited; **V DENIED in rules (A2 · `NOT_VIEWER`)** | `Q-036`, `Q-037`, `Q-038` | header, `TABLE-011`, totals, timeline | – | – | `po.order`, `po.cancel` · **TRUSTED_COMMAND_ONLY** | Base-D/M/X + `039` | – |
| **024** Private Receiving | O/A/IM/PM/SK | `Q-035`, `Q-036`, `Q-037`, `Q-017`, `Q-018` | `TABLE-012`, current/after/outstanding | eligible POs only | – | `po.receive` · **TRUSTED_COMMAND_ONLY** | Base-D/F/M + `037/038` | `IDX-13` |
| **025** Reports Shell | tab-gated | none at shell | tabs only | – | – | none | Base-D | – |
| **048** Stock-on-Hand Report | **all seven** | **store room All: `Q-061` from `productStockSummaries`. Store room W: `Q-074`/`Q-075`/`Q-076` from `stockBalances`. Neither joins (A2 · VR-02).** Filter option sets `Q-016`, `Q-017` | `TABLE-013`: **Product · SKU · Category · On hand · Unit cost · Stock value** (+ category subtotals, final total). **No *Warehouse* column** (A3 · F-H-12) | **Store room · Category only — no status filter, no warehouse sort**; sort product name only (category-grouped variant `Q-061b`); CSV | – | CSV export of **already-fetched authorized rows only** | Base-L/D/M | `IDX-33` (`Q-061`), `IDX-34` (`Q-061b`), `IDX-39/40/41` (store-room mode) |
| **049** Purchase-Order Report — **INCLUDED in Release A/B (A3R-09; `FR-DASH-005` is `A-MUST`)** | O/A/IM/PM/AN; **SK, V DENIED** — SK at the router only, over data `06` §5 lets Storekeeper read; V denied in rules on `purchaseOrders` | **`Q-062`** (table) **+ `Q-085` … `Q-089`** (`CHART-003` status distribution — one `count()` per displayed PO status family over the **same** filter set as `Q-062`, so the chart is a distribution and **never a sample of page 1**) | `TABLE-014` + **`CHART-003`** | status, date range, kind — **the chart obeys the same filters as the table**; CSV | – | CSV export of already-fetched authorized rows only | Base-L/D/M | `IDX-11/12` |
| **026** Notifications | all | `Q-004`, `Q-005` | `TABLE-015` | all/unread; type; newest first; cursor | **✔** `Q-005` | `read` flag · **SAFE_DIRECT_CLIENT_WRITE** | Base-L/D/M | `IDX-17` |
| **027** Team | O full; A limited; others DENIED — **`members` `list` and cross-member `get` are `ADMINS` in rules (A2)** | `Q-009`, `Q-010` | `TABLE-016/017`, protected Owner row | status only (no search, no role filter — A3 · F-H-14) | – | `team.createInvitation`, `revokeInvitation`, `changeMemberRole`, `setMemberStatus` · **TRUSTED_COMMAND_ONLY** | Base-L/D/F/M/X + `042` | `role, status` |
| **050** Invitation Link *(modal)* | O; A limited | none — **the raw token is in the command result only, never re-read** | link once, expiry, email, role | – | – | none | `STATE-042` | – |
| **028** Settings | O full; A limited; others DENIED | `Q-006`, `Q-007`, `Q-017` | `FORM-015` | – | – | `org.updateSettings` · **TRUSTED_COMMAND_ONLY** | Base-D/F/M/X | – |

---

## 4. Release B-Lite — network and connected procurement

All of `031…040` require `settings.networkEnabled`. When false the navigation is absent and a direct
route renders authenticated `SCREEN-030` (`STATE-036`) — **not** a permission denial, because it is not
a role decision.

| Surface | Roles | Reads (Q) | Displayed data | Filters / sort / page | RT | Writes · class · command | States | Indexes |
|---|---|---|---|---|:-:|---|---|---|
| **031** Connected Businesses | O/A full; PM limited — **`PARTNER_WRITERS` in rules (A2)** | `Q-041` | `TABLE-018` | incoming/outgoing/status; newest first | – | `connection.respond` (O/A/PM); **`connection.disable` O/A only** · **TRUSTED_COMMAND_ONLY** | Base-L/D/M/X | `IDX-14` |
| **032** Business Discovery *(panel)* | O/A/PM | **`Q-001`** exact `get` | monogram, name, `@handle`, industry, country — **nothing else** | exact handle only; **no list, no prefix, no fuzzy** | – | `connection.request` · **TRUSTED_COMMAND_ONLY** | `STATE-021…027` | – |
| **033** Connection Detail | O/A full; PM limited — **`PARTNER_WRITERS` in rules (A2)** | `Q-042`, `Q-043`, `Q-034` | identity, status, `TABLE-019/020` | connection-scoped | – | `connection.respond`, `connection.disable` | Base-D/L/M/X | `IDX-15/12` |
| **034** Partner Catalog — supplier | **O/A/PM — enforced in rules (A2)** | `Q-045` | `TABLE-021` — **no stock, no cost** | search, published/availability | – | `partnerCatalog.publish` / `unpublish` · **TRUSTED_COMMAND_ONLY** | Base-L/D/M/X | `IDX-16` |
| **035** Partner Catalog — buyer browse | O/A/PM read | **`Q-046` callable only** | `TABLE-022`, labelled *"partner projection, not supplier inventory"* | bounded set returned by the callable | – | none | Base-L/D | supplier-side `IDX-16` |
| **036** Mapping Wizard | O/A/PM | `Q-041`, `Q-011`, **`Q-047` callable** | side-by-side cards, worked preview `10 PACK = 50 KG` | – | – | `mapping.create` · **TRUSTED_COMMAND_ONLY** | Base-D/F/M + **`STATE-028…034` all seven** | `IDX-16/01` |
| **037** Mappings List | **O/A/PM — enforced in rules (A2)** | `Q-043` | `TABLE-023` | supplier/status; no verified-time sort (A3 §8.5) | – | `mapping.disable` · **TRUSTED_COMMAND_ONLY** | Base-L/D/M/X | `IDX-15` |
| **038** Connected PO — buyer | O/A/PM full; IM/SK/AN read; **V DENIED in rules (A2)** | `Q-036`, `Q-037`, `Q-038` — **`Q-043` removed (A2): the dual representation renders from the immutable line snapshots (`mappingId`, `supplierToBuyerBaseFactorMilliSnapshot`, DB-02 §5.3), never from the live mapping, so IM/SK/AN need no `productMappings` read** | dual representation, timeline | – | – | DRAFT edit · **SAFE_DIRECT_CLIENT_WRITE**? **NO — see note** ; `cpo.submit`, `cpo.cancel` · **TRUSTED_COMMAND_ONLY** | Base-D/F/M/X + `039` | `IDX-12` |
| **039** Connected PO — supplier | same matrix | `Q-036`, `Q-037`, `Q-038` | supplier projection, **no buyer-private data** | – | – | `cpo.respond`, `cpo.ship` · **TRUSTED_COMMAND_ONLY** | Base-D/F/M/X + `037/039` | `IDX-12` |
| **040** Connected Receiving | O/A/IM/PM/SK | `Q-036`, `Q-037`, `Q-017`, `Q-018` | supplier-unit input, live base conversion, outstanding | – | – | `cpo.receive` · **TRUSTED_COMMAND_ONLY** | Base-D/F/M + `037/038` | – |
| **051** Publish Partner Item *(dialog)* | O/A/PM | `Q-014`, `Q-045` | `FORM-019`; `orderUnit` **locked** to base unit | – | – | `partnerCatalog.publish` · **TRUSTED_COMMAND_ONLY** | Base-D/F/M/X | – |

> **Note on the connected DRAFT (SCREEN-038).** The rules-guarded client write path is permitted **only
> while `supplierKind == 'PRIVATE'`**. A connected draft therefore has `supplierKind == 'CONNECTED'` from
> creation and is **`TRUSTED_COMMAND_ONLY`** throughout — `cpo.draftSave` (C-34) covers create and edit.
> This closes a gap that a naive reading of `11` §9.3 leaves open: without it, a buyer could create a
> connected draft client-side with a forged `counterpartyOrgId`. The draft still lives only in the
> buyer's tenant and remains invisible to the supplier until `cpo.submit` (`FR-CPO-015`).

---

## 5. Realtime listeners — the complete list

Exactly four `onSnapshot` subscriptions exist. Everything else is a one-shot request.

| # | Path | Surface | Why realtime is required |
|---|---|---|---|
| RT-1 | `organizations/{orgId}/members/{uid}` | `008` shell | A suspended member must lose the workspace without a refresh (`06` §16, `SC-20`). One document. |
| RT-2 | `users/{uid}/notifications` where `read == false` — **count only** | `008`, `026`, `052` | The unread badge must move on its own. Bounded by `IDX-17` and `limit(50)`. |
| RT-3 | `organizations/{orgId}/purchaseOrders/{poId}` | `023`, `038`, `039` | Both parties watch one shared order transition. One document, open only while the detail page is mounted. |
| RT-4 | `organizations/{orgId}/connections/{connectionId}` | `033` | A connection may be accepted or disabled by the counterparty while the page is open — this is what makes `ATTACK-09` visible to the user rather than only rejected at submit. |

**No list surface is a listener.** A listener over a 25-row page re-bills the page on every unrelated
write in the collection, and none of the frozen list surfaces claims live behaviour.

---

## 6. Mutation classification — complete

Every mutation discoverable from the frozen UI and use cases, classified once. DB-05 and DB-06 restate
this identically.

**`SAFE_DIRECT_CLIENT_WRITE` — six surfaces, nothing else**

| Mutation | Path | Guard |
|---|---|---|
| Update own profile | `users/{uid}` | self; `displayName`, `photoUrl`, `lastSeenAt` only |
| Mark notification read | `users/{uid}/notifications/{id}` | self; `onlyChanged(['read'])` |
| Create / update Category (**not `status`**) | `…/categories/**` | `INVENTORY_WRITERS`; validated shape. Archive/restore is `C-35` (DB-CR-012) |
| Create / update Warehouse (**not `status`**) | `…/warehouses/**` | `INVENTORY_WRITERS`. Archive is `C-12`; setting the default is `C-36` (DB-CR-013) |
| Create / update / deactivate Private Partner | `…/privatePartners/**` | `PARTNER_WRITERS` |
| Create / update **private DRAFT** PO and items | `…/purchaseOrders/{poId}` | `PO_WRITERS`; `supplierKind == 'PRIVATE'` **and** `status == 'DRAFT'`; draft fields only |

**`TRUSTED_COMMAND_ONLY` — everything else**, without exception: organization creation and handle
reservation · every membership and invitation change · product create/update/archive/restore ·
**warehouse archive** · opening balance · stock adjustment · **stock transfer** · every purchase-order
transition and receipt · connection request/response/disable · partner-catalog publish/unpublish/list/
lookup · mapping create/disable · every connected-PO transition including the connected draft · all
audit creation · all notification creation.

**No client delete exists anywhere.** `INV-21`.

---

## 7. Coverage reconciliation

| Check | Result |
|---|---|
| Frozen surfaces `SCREEN-001…052` mapped | 52 / 52 |
| Amendment surface `SCREEN-053` mapped | 1 / 1 |
| Surfaces with at least one read or an explicit "no read" | 53 / 53 |
| Surfaces with every write classified | 53 / 53 |
| `FORM-001…024` with a target command or client path | 24 / 24 — **enumerated one by one in DB-11 §A.3** |
| `TABLE-001…027` with a query id, filter set, sort set and page contract | 27 / 27 — **enumerated one by one in DB-11 §A.2** |
| `ACTION-001…062` with an outcome and a data path | **62 / 62 — enumerated one by one in DB-10 §3** |
| `FIELD-001…0nn` with a database field, type, precision and permission | **enumerated in DB-11 §C** |
| Every `Q-id` cited above resolves to a defined row in DB-04 | **YES — asserted by test (A2 · DB-CR-021), re-verified mechanically at A3R-P over all 92 active ids. Historical: `Q-044`/`Q-048` were cited here and defined nowhere (A2); `Q-011a` was cited by DB-04 itself (A2); `Q-079` was cited by DB-06 only (A3); `Q-085g` was cited by DB-06 §6.2 and DB-07 §12 and is now defined as `Q-080` (A3R-P).** `UNDEFINED_QUERY_IDS = 0`. |
| Every role-level surface denial is enforced at the data boundary | **YES — DB-05 §4.0, except the one declared router-only case (SCREEN-049 tab, over data the role may lawfully read)** |
| Responsive variants where data behaviour changes | none — R2 changes layout only, never the query |
| Release B-PLUS / C / D surfaces mapped | 0 — correctly absent |
| **`UI_DATA_COVERAGE`** | **100 %** |

### 7.1 A2 — what changed in this file, and why it was wrong before

The external reviewer's IR-01 was that this matrix recorded role-denied surfaces while DB-05 let every
ACTIVE member read the collections behind them. Correcting DB-05 exposed four places where **this** file's
role columns were also wrong — not a leak in either case, because rules were the looser layer, but a
documentation defect that would have led an implementer to build a Viewer dashboard the new rules deny.

| Surface | Was recorded as | Is | Authority |
|---|---|---|---|
| `010` Populated Dashboard | *all* | `Q-054`, `Q-055`, `Q-063`, `Q-033`, `Q-065` are **`NOT_VIEWER`**; `Q-064` is `PARTNER_WRITERS` | `06` §5 *View purchase orders / movement history: V ✘* · `23` §11 |
| `013` Product Detail | *all read* | `Q-023` `NOT_VIEWER` · `Q-048` Owner/Admin · `Q-044` O/A/PM | `06` §5 · `23` §3 *View audit log* · `23` §11 *no Network for IM/AN* |
| `038` Connected PO buyer | read `Q-043` | **`Q-043` removed** — snapshots carry the conversion (DB-02 §5.3) | keeps `productMappings` at `PARTNER_WRITERS` without breaking IM/SK/AN read access to the order |
| `013` Stock tab | `Q-018` only | **`Q-017` + `Q-018`** left-joined | canonical Gate 6: *"A store room with none of this product is listed at zero rather than hidden"* |
