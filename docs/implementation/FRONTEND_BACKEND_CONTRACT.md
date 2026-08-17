# FRONTEND_BACKEND_CONTRACT

**Derived from `DB_03` (UI ↔ data traceability), `DB_04` (query / index / pagination / realtime) and
`DB_05` (security), with amendment **A3** applied.**

Status: **FROZEN** at **A3R-P**; propagated at **A3R-P2** (C1 implementation-discovery), 2026-08-17.
Between: **Antigravity** (frontend) and the data platform (**Codex** types/queries, **Claude Code**
commands/rules).

## 1. The two ways data moves

| Direction | Mechanism | Rule |
|---|---|---|
| **Read** | Firestore SDK, directly, through Codex's typed query builders | Every read is one of the **92 declared query ids** in `DB_04` — the count verified mechanically at A3R-P, not asserted. `DB_04` §1–§6 are the client-facing and aggregation reads; §8's are **command-internal** and execute server-side with the Admin SDK, so the frontend never issues them. An undeclared read is a defect. |

**The A3R query families, named so none is missed** (the *"84 declared query ids"* that stood here was the
A3-era figure and is **SUPERSEDED**):

```
Q-015r            resolver — productStockSummaries prefix, productStatus in ['ACTIVE','ARCHIVED'],
                  limit(11).  Feeds Q-083 and the resolver technique generally.
Q-083             ledger search  (TABLE-006) — via Q-015r, createdAt DESC preserved
Q-084a            PO-list search by ORDER NUMBER — prefix range, forced-sort applies
Q-084b            PO-list search by SUPPLIER    — via privatePartners prefix, IDX-26,
                                                  createdAt DESC preserved
Q-085 … Q-089     CHART-003 purchase-order status distribution — five count() aggregations
                  over the SAME filter set as Q-062.  Never computed from page 1.
Q-074s            TABLE-001 Store room x Status, IDX-44
Q-021a / Q-021b   Needs Attention — out-of-stock first, then shortfall.  Sequential, <= 6 reads.
Q-061b            Stock-on-Hand grouped by category, IDX-34
Q-079             product.update / product.setStatus balance fanout  (command-internal)
Q-080             C-38 partner.setStatus archive guard, limit(1), IDX-26  (command-internal;
                  defined at A3R-P — it was cited as the undefined id Q-085g)
```

Tombstones the frontend must not resurrect: `Q-021` (replaced), `Q-084` singular (replaced by
`Q-084a`/`Q-084b`), `Q-011a` (deleted). A build that references any of them is referencing a query that
does not exist.
| **Write** | One of two classes, never a third | `SAFE_DIRECT_CLIENT_WRITE` (6 surfaces) or `TRUSTED_COMMAND_ONLY` (everything else). |

### The six `SAFE_DIRECT_CLIENT_WRITE` surfaces — exhaustive

```
users/{uid}                                  self, 3 fields
users/{uid}/notifications/{id}               `read` flag only
organizations/{orgId}/categories/{id}        INVENTORY_WRITERS
organizations/{orgId}/warehouses/{id}        INVENTORY_WRITERS — `status` IMMUTABLE in BOTH directions
organizations/{orgId}/privatePartners/{id}   PARTNER_WRITERS — EXCEPT ordersPlacedCount AND status
                                             (archive/restore is C-38 partner.setStatus)
organizations/{orgId}/purchaseOrders/{id}    only while kind == PRIVATE and status == DRAFT
```

**Everything else is a command.** All stock, all receiving, all connected workflow, all membership, all
invitations, all products, all mappings, all catalog publication.

## 2. Pagination, sorting and search — the frozen UX constraints

| Constraint | Value |
|---|---|
| Page size | **25** default, **100** maximum |
| Paging | **cursor only**. No offset, no infinite scroll, no "show all" |
| Sorting | **indexed fields only.** A column with no index is not sortable, and the UI must say so rather than sort a page |
| Search | tenant-scoped prefix range on an indexed field. **Not** substring, **not** fuzzy, **not** full-text |
| Business discovery | **exact handle only**. `list` on `organizationDirectory` is denied |
| Realtime | exactly **four** listeners (`DB_03` §5). Every other surface is a one-shot read |
| Export | **CSV of already-fetched rows only.** No server-side export job |
| Mobile reports | **read-only.** No mobile export (Gate 14) |

### The forced-sort rule, and the two surfaces exempt from it

Firestore requires the first `orderBy` to carry the range filter. So **while a prefix search is active on
a list, the sort is forced to the searched field** and the other sort options are disabled. Sorting a
partial result and labelling it "by on hand" would be a lie.

**Two frozen surfaces fix their sort and cannot accept that rule** — `TABLE-006` (movement history, *Date ↓*
only) and `TABLE-010` (PO list). Their search boxes are therefore **entity resolvers, not text scans**:

```
Q-083   ledger search   : term → Q-015r on productStockSummaries, limit(11),
                                 productStatus in ['ACTIVE','ARCHIVED']  ← the ledger is permanent,
                                 so an archived product must still be searchable
                          → productId in [...] on stockMovements, createdAt DESC preserved
Q-084b  PO-list search  : term → Q-031 prefix on privatePartners, limit(11)
                          → privateSupplierId in [...], createdAt DESC preserved
```

Neither adds an index. The resolver is `limit(11)`, not `limit(10)`, **because an overflow you cannot
detect is not a bound**: ten returned rows are indistinguishable from ten-of-forty. The eleventh row is
the signal to ask the user to narrow — the same bounded-search honesty `Q-015` already applies.

## 3. Surfaces where A3 changed what the frontend builds

| Surface | Build this |
|---|---|
| `TABLE-001` product list | Columns **Product · SKU · Category · On hand · Minimum · Stock value**. Four combinable filters: Category · Store room · Status · Archived. **Archived is `Excluded \| Only`** — there is no *Included* option; the canonical board forbids mixing archived rows into the active list. |
| `TABLE-001` store-room mode | Reads `stockBalances` (`Q-074`…`Q-078`, `Q-074s`). *On hand*, *Stock value* and *Status* are **that store room's** figures and must be labelled as such. |
| Needs Attention | `Q-021a` `limit(5)` → `k` rows, **then** `Q-021b` `limit(5 − k)` (skipped when `k = 5`), concatenated. **Out of stock first, then largest shortfall** — the query produces the order; do not re-sort. ≤ 6 reads; the dashboard budget depends on the sequential form. |
| Dashboard *Where your stock sits* | `Q-060` = `sum('stockValueMinor')` per warehouse. **Currency.** Must reconcile to the Inventory Value KPI. |
| `TABLE-027` warehouses | **Name · Type · Products held · Share · Stock value.** *Share* = row ÷ total, computed client-side, no read. |
| Stock-on-Hand report | **Product · SKU · Category · On hand · Unit cost · Stock value**, category subtotal rows, final total. Filters **Store room · Category** only — no status filter, no *Warehouse* column. |
| Product detail | Tabs **Overview · Stock by store room · Movement history · Purchase orders**. Four. No *Suppliers* tab, no *Buyers* tab, no *preferred supplier* field. |
| `TABLE-004` stock by store room | One row per **ACTIVE warehouse including zeros** (`Q-017` left-joined onto `Q-018`). *Available* is derived = `onHandMilli`. |
| `TABLE-005/006` *Reference* | Read `sourceReferenceSnapshot` off the movement. **No join.** |
| Notifications | Tabs **All · Unread · Stock · Orders · Network** with counts. **No *Read* tab** — read/unread is a state on the row. |
| Team | No search, no role filter, no name sort. One bounded page, `joinedAt ASC`. |
| Connected businesses | **Business · Handle · Relationship · State · Action**, the *"N order placed"* sub-line, and tab counts. No *Mapped Items*, no *Open Connected POs*. |
| Supplier list | *Orders placed* reads `privatePartners.ordersPlacedCount` (non-cancelled orders placed). Buyers list *Orders* renders **`—`** in Release A/B. Archive is `C-38`, which refuses while any order is open — do **not** gate the button on a client-side count. |
| Empty-dashboard checklist | Five items, five queries, each role-gated. **An item the role may not check issues no query** and renders from the role filter alone. |
| **Opening balance** (`SCREEN-042` / `FORM-023`) | **A3R-P2 · C1-AUTH-007.** `C-13 stock.recordOpeningBalance` accepts `quantityMilli >= 0`, so a quantity of **`0` is valid and must be submittable** — it records an explicit zero opening balance (the canonical Cooking Oil row), which is a different fact from a product that was never initialized. Client validation rejects a **negative** quantity and more than 3 dp only, never zero; `effectiveAt` still cannot be later than today. Every **other** stock action keeps its strictly-positive rule, and a second opening balance for the same product **and** warehouse still fails `OPENING_BALANCE_ALREADY_RECORDED`. |
| **SCREEN-049 / `CHART-003`** | **Build it.** `02` `FR-DASH-005` is an `A-MUST` (*"Purchase-Order report"*), which outranks the Gate 6 board's *"exactly two entries"* copy. The table is `Q-062`; the status bars are five declared `count()` aggregations (`Q-085…Q-089`) over the **same** filters as the table — never counted from page 1. |

## 4. States every surface must implement

`loading` · `empty (first-run)` · `empty (filter matched nothing)` · `error` · `permission-denied` ·
`partial`. **First-run empty and filtered-empty are different copy** and the design says so
(*"Nothing unread / You're all caught up"* vs *"No notification matches Unread"*).

## 5. Error handling

| Code | Frontend behaviour |
|---|---|
| `permission-denied` | Show the frozen denial copy. Do **not** retry. |
| `failed-precondition` | The state changed underneath — refetch and re-render. Do **not** retry blindly. |
| `already-exists` (idempotency) | The command already succeeded. Treat as **success**. |
| `aborted` | Transaction contention. Retry with the **same** `operationId`, bounded backoff. |
| `resource-exhausted` | Back off; surface a real message, never a spinner that never ends. |

## 6. What the frontend must never do

- Compute a **stored** value. Derived data is written by the command that writes its host.
- Filter or sort a fetched page client-side to satisfy a control that has no query. If a control has no
  query, that is an architecture defect — raise it; do not paper over it.
- Read zone 4. Those builders are not importable from the frontend bundle.
- Rely on hidden UI as a permission control. Hiding is courtesy; the rule and the command check are control.
- Show any capability Release A/B does not have — no Print/PDF for purchase orders, no reconnect, no
  mobile bottom-tab navigation, no mobile report export.
