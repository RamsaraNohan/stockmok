# DB-11 — FINAL BIDIRECTIONAL UI ↔ DATABASE RECONCILIATION GATE

**Status:** adversarial, and **mandatory before `DATABASE_IMPLEMENTATION_READY` may be `YES`.**
**Purpose:** prove that the final frozen Stockmok frontend and the final database architecture describe
**one coherent system** — in **both** directions.
**Run order:** this gate ran **after** every accepted finding of the external independent review was fixed
(DB-00 §7, amendment A2). Running it before would have reconciled the UI against a database the review had
already invalidated.

```
DIRECTION_A  UI  → DATABASE / BACKEND      (no unsupported UI behaviour may remain)
DIRECTION_B  DATABASE / BACKEND → UI       (no unexplained database structure may remain)
```

**Surface authorities:** `18` (`SCREEN`/`STATE`), `19` (`FORM`/`TABLE`, routes), `20` (navigation/routes),
`22` (`ACTION`/`FIELD`), `23` (access/state matrix), `24` (visualisations), plus A1 (`SCREEN-053`,
`FORM-024`, `ACTION-062`, `STATE-044`). **Canonical visual authority:** the patched Gate artifacts, Gate 6
being `cb94a73c…` (DB-00 §5, re-verified byte-level in §G).

**Inventory under test.**

| Registry | Count | Source |
|---|---|---|
| `SCREEN` | **53** | `18` 001–052 + A1 `SCREEN-053` |
| `STATE` | **44** | `18` 001–043 + A1 `STATE-044` |
| `TABLE` | **27** | `19` 001–027 |
| `FORM` | **24** | `19` 001–023 + A1 `FORM-024` |
| `FIELD` | **60** (59 live) | `22` 001–060; `FIELD-024` is a declared **RETIRED tombstone** |
| `ACTION` | **62** | `22` 001–061 + A1 `ACTION-062` |
| `Q` (query ids) | **78** | DB-04 |
| `IDX` | **43** | DB-04 §7 |
| `C` (commands) | **36** | DB-06 §1 |
| `INV` | **25** | DB-07 §11 |
| `DV` | **11** | DB-07 §12 |

---

# A — UI → DATABASE TRACEABILITY

## A.1 Screens — all 53

Full per-screen read/write/command/state/index mapping is DB-03 §1–§4 and is not duplicated here. This
section records the **gate result** plus every screen whose chain was found broken or under-specified.

| Result | Count |
|---|---|
| Screens with every displayed value traced to a document + field (or an explicit "static / no read") | **53 / 53** |
| Screens with every interactive action traced to a command or a named client write | **53 / 53** |
| Screens with loading, empty, error, denied, submitting, validation and confirmation states resolved to `18`'s ledger | **53 / 53** (`23` §6 is the per-screen matrix) |
| Screens whose **role** column disagreed with `06` §5 / `23` §4 before A2 | **4** — `010`, `013`, `017`, `038`; all corrected (DB-03 §7.1) |
| Screens requiring data the schema did not provide | **0** after A2 (**3** before: the warehouse-filtered `011`, the per-store-room `013` Stock tab, the zero-row `048`) |
| Responsive variants changing data behaviour | **0** — R2 changes layout only; `CHG-044` removes mobile export and bottom-tab nav |

### Chains repaired by A2

| Screen | Broken chain | Repair |
|---|---|---|
| `011` Product List | **Store room** filter (`FIELD-051`) cost 50 reads against `NFR-017`'s 27 | `Q-074`…`Q-078` from `stockBalances`, 25 reads, no join (DB-CR-017) |
| `011`, `048` | **Category** and **Store room** filter dropdowns had no declared query | `Q-016`, `Q-017` gain `011` and `048` as callers (VR-05) |
| `013` Stock tab | `TABLE-004` must list every ACTIVE store room including zeros; `Q-018` returns only existing balances | `Q-017` ⟕ `Q-018` client-side (VR-04) |
| `013` Activity tab | `Q-048` referenced, **defined nowhere**; listed as all-roles though it reads `auditLogs` | `Q-048` defined on `IDX-18`; tab is Owner/Admin (DB-CR-021) |
| `013` Suppliers/Buyers tabs | `Q-044` referenced, **defined nowhere** | `Q-044` defined on `IDX-15`; tabs are O/A/PM + `networkEnabled` (DB-CR-021) |
| `048` Stock-on-Hand | `Q-061` joined an undefined `Q-011a`; `onHandMilli > 0` hid the zero rows the board requires | two non-joining modes; predicate removed (VR-02, DB-CR-022) |
| `010` Viewer dashboard | issued `Q-054`/`Q-055`/`Q-063`/`Q-033`/`Q-065`, which `06` §5 denies Viewer | those panels are `NOT_VIEWER`; rules now enforce it (DB-CR-015) |
| `017` Movement History | Viewer denial was router-only | `stockMovements` read is `NOT_VIEWER` in rules (DB-CR-015) |
| `038` Connected PO | read `Q-043` (`productMappings`), which IM/SK/AN must not read | `Q-043` dropped; line snapshots carry the conversion (DB-02 §5.3) |

## A.2 Tables — all 27, enumerated

`Grain` is what one row is. `Reads` is one page at the frozen page size.

| TABLE | Screen | Source collection | Grain | Query | Index | Reads | Pagination | Empty state |
|---|---|---|---|---|---|---|:-:|---|
| 001 | 011 | `productStockSummaries` / **`stockBalances` when store-room-filtered** | product / product×room | `Q-011`…`Q-015`, `Q-013b` / **`Q-074`…`Q-078`, `Q-074s`** | **the 32-index DB-CR-038 matrix**: mode A `IDX-33`…`IDX-37`, `IDX-47`…`IDX-57` / mode B `IDX-39`…`IDX-44`, `IDX-58`…`IDX-67` | 25 | cursor 25/100 | "Add your first product to start tracking inventory." |
| 002 | 014 | `categories` | category | `Q-016` | IDX-28 | ≤25 | cursor | required |
| 003 | 015 | `warehouses` | warehouse | `Q-017` | IDX-29 | ≤25 | cursor | required |
| 004 | 013 Stock | `warehouses` ⟕ `stockBalances` | **every ACTIVE room, zeros included** | `Q-017`+`Q-018` | IDX-29, IDX-09 | ≤50 | embedded | "No stock recorded yet." |
| 005 | 013 | `stockMovements` | movement | `Q-023` `limit(5)` | IDX-05 | 5 | embedded | required |
| 006 | 017 | `stockMovements` | movement | `Q-022`…`Q-029`; search **`Q-083`** via the **`Q-015r`** resolver (A3R-08) | IDX-05/06/07/20…24 | 25 | cursor | "No movements in this range." |
| 007 | 018, 019 | `privatePartners` | partner | `Q-031` | IDX-10 | 25 | cursor | required |
| 008, 009 | 020 | `purchaseOrders` | order | `Q-039`, `Q-040` | IDX-26 | ≤10 | none (bounded) | required |
| 010 | 021 | `purchaseOrders` | order | `Q-033`, `Q-034`; search **`Q-084a`** (order number) / **`Q-084b`** (supplier, via resolver) — A3R-07 | IDX-11/12, **IDX-26** | 25 | cursor | required |
| 011 | 023 | `…/{poId}/items` | line | `Q-037` | auto | ≤50 | none (bounded) | n/a — an order always has lines |
| 012 | 024 | `…/{poId}/items` + balances | line | `Q-037`, `Q-018` | auto, IDX-09 | ≤50 | none | required |
| 013 | 048 | `productStockSummaries` / **`stockBalances` when room-filtered** | product / product×room | **`Q-061`**, **`Q-061b`** (category-grouped) / **`Q-074`…`Q-076`** | IDX-33, IDX-34 / 39/40/41 | 25 | cursor | required |
| 014 | 049 | `purchaseOrders` | order | **`Q-062`** + **`Q-085`…`Q-089`** (`CHART-003` status distribution, five `count()` over the same filter set) — **SCREEN-049 INCLUDED, A3R-09** | IDX-11/12 | 25 + 5 | cursor | required |
| 015 | 026 | `users/{uid}/notifications` | notification | `Q-004` | IDX-17 | 25 | cursor | "You're all caught up." |
| 016, 017 | 027 | `members`, `invitations` | member / invitation | `Q-009`, `Q-010` | IDX-31/25, IDX-27 | ≤25 | cursor | required |
| 018 | 031 | `connections` (projection) | connection | `Q-041` | IDX-14 | 25 | cursor | "Connect a Stockmok supplier…" |
| 019, 020 | 033 | `connections`, `purchaseOrders` | connection / order | `Q-042`, `Q-034` | IDX-14, IDX-12 | ≤25 | cursor | required |
| 021 | 034 | `partnerCatalog` (own org) | catalog item | `Q-045` | IDX-16 | 25 | cursor | required |
| 022 | 035 | **callable** `partnerCatalog.list` | catalog item | `Q-046` | IDX-16 (server) | server | bounded 100 hard | required |
| 023 | 037 | `productMappings` | mapping | `Q-043` | IDX-15 | 25 | cursor | required |
| 024–027 | 010 | dashboard panels | mixed | `Q-021a`/`Q-021b`, `Q-033`, `Q-060`, `Q-063`, `Q-058` | **IDX-46** (Needs Attention, out-first then shortfall), IDX-11, **IDX-68** (`sum('stockValueMinor')`), IDX-07 | ≤5 each (Needs Attention ≤ 6) | none — bounded panels | "Nothing needs attention — every tracked product is above its minimum and none is out of stock." |

**`TABLE_TRACEABILITY = 27 / 27.`** Every table has a named collection, grain, query id, index, page
contract and empty state. Before A2, three (`001` filtered, `004`, `013`) had no implementable query.

## A.3 Forms — all 24, enumerated

| FORM | Screen | Fields | Target | Class | Validation source | Failure states |
|---|---|---|---|---|---|---|
| 001 | 002 Sign Up | 001, 002 | Firebase Auth + `users/{uid}` `setDoc(merge)` | client | Zod + Auth | neutral duplicate/auth failure |
| 002 | 003 Login | 001, 002 | Auth | – | Auth | `STATE-012` neutral |
| 003 | 004 Branded Login | 001, 002, 003 | Auth (role is **untrusted** preference) | – | Auth | `STATE-009…016` |
| 004 | 041 Password Reset | 001 | Auth `sendPasswordResetEmail` | – | Auth | neutral acknowledgement |
| 005 | 007 Onboarding | 004…010 | **`C-01 org.create`** | command | Zod; handle 3–30 (DB-CR-007) | `STATE-017…020` |
| 006 | 012 Product | 011…018 | **`C-09`/`C-10`** | command | Zod; SKU unique via `productSkuIndex` | `SKU_TAKEN`, money/quantity |
| 007 | 014 Category | name, description | `categories` direct | **client write** | Zod shape; **`status` denied** | duplicate name |
| 008 | 015 Warehouse | name, code, type, address | `warehouses` direct | **client write** | Zod; **`status` denied**; no `isDefault` | – |
| 009 | 016 Adjustment | 020, 021, 022, **023 as an enum + `note`** | **`C-14 stock.adjust`** | command | Zod; `AdjustmentReason`; `note` required on `OTHER` | `INSUFFICIENT_STOCK`, `STATE-037` |
| 010 | 024 Receiving | 033 | **`C-17 po.receive`** | command | `0 < recv ≤ outstanding` | `OVER_RECEIPT` `STATE-038` |
| 011 | 022 PO Builder | 028…032 | draft direct; **`C-15 po.order`** | mixed | Zod; total recomputed server-side | `STATE-039` |
| 012 | 027 Invitation | 034, 035 | **`C-04`** | command | role ≠ `OWNER` | – |
| 013 | 027 Role change | 058 | **`C-07`** | command | Owner protected | `OWNER_PROTECTED` |
| 014 | 020 Partner | 025…027 | `privatePartners` direct | **client write** | Zod | – |
| 015 | 028 Settings | 036, 037 | **`C-02`** | command | allowed values only | – |
| 016 | 032 Discovery | 038 | **`Q-001`** `get` (read-only form) | – | exact normalised handle | `STATE-021…027` |
| 017 | 031 Connect request | – | **`C-18`** | command | no self-connection | `SELF_CONNECTION`, `CONNECTION_EXISTS` |
| 018 | 039 CPO respond | 048 | **`C-28`** | command | reason required on reject | `INVALID_TRANSITION` |
| 019 | 051 Publish item | 039…044 | **`C-21`** | command | **`INV-17` `orderUnit == baseUnit`** | – |
| 020 | 036 Mapping wizard | 040, 045, 046, 047 | **`C-25`** | command | seven server re-validations (DB-07 §7) | `STATE-028…034` |
| 021 | 038 CPO builder | 030, 031 | **`C-34 cpo.draftSave`** (DB-CR-010) | command | connection ACTIVE, mappings VERIFIED | `CONNECTION_NOT_ACTIVE` |
| 022 | 040 CPO receiving | 033 (supplier unit) | **`C-30 cpo.receive`** | command | outstanding tracked in **supplier** units | `OVER_RECEIPT` |
| 023 | 042 Opening balance | 020, 022, `effectiveAt` | **`C-13`** | command | balance absent or zero; `effectiveAt ≤ now` | `OPENING_BALANCE_ALREADY_RECORDED` |
| **024** | **053 Transfer (A1)** | from, to, product, quantity | **`C-33 stock.transfer`** | command | `from ≠ to`; `q > 0`; source ≥ q; both ACTIVE | `SAME_WAREHOUSE` `STATE-044`, `INSUFFICIENT_STOCK` |

**`FORM_TRACEABILITY = 24 / 24.`** Every form has a target, a validation source and enumerated failures.
Every command target re-validates the **same Zod object** the browser used (DB-06 §0).

## A.4 Actions, states, notifications, badges, empty and error states

- **`ACTION-001 … ACTION-062` → 62 / 62**, enumerated one by one in DB-10 §3. Two had no backend behaviour
  when the pack was first drafted (`013` category archive, `022` connected draft); both are closed by
  `C-35` and `C-34`.
- **`STATE-001 … STATE-044` → 44 / 44.** Every state resolves either to a persisted enum (DB-02 §0.1), a
  typed error code (DB-06 §7), or a client render state with no data dependency. `STATE-037` (replay) is the
  `commandReceipt` short-circuit; `STATE-044` (same store room) is `SAME_WAREHOUSE`.
- **Notifications:** ten `type` values in DB-02 §2.3, each written by a named command, fan-out bounded to 50
  recipients resolved **before** any write (`Q-059`). No client can create one.
- **Badges / status pills:** every pill is a persisted enum or a derived value with a named contract —
  `stockStatus` (DV-03 / **DV-11** at balance grain), `PoStatus`, `ConnectionStatus`, `MappingStatus`
  (`VERIFIED`/`DISABLED` only), `LifecycleStatus`, `PartnerStatus`, `MemberStatus`, `InviteStatus`,
  `movementKind` (derived, DB-02 §0.2).
- **Empty states:** every list surface has one; the five copy strings `23` §9 mandates are reproduced in
  DB-03 and DB-04.
- **Error states:** every failure the UI can show maps to an `HttpsError` code + reason code (DB-06 §7).
  *"A raw Firebase error code never reaches the user interface."*
- **Stale / conflict:** every command re-reads state inside the transaction; `STATE-033` (stale connection),
  `STATE-039` (immutable after transition) and `STATE-037` (replay) are the three user-visible forms.

```
UI_TO_DATABASE_TRACEABILITY = 100%
```

---

# B — DATABASE → UI / DOMAIN JUSTIFICATION

Every current-release database object, and why it exists. Justification classes per the gate instruction.
**No object exists because an implementation agent found it convenient**, and §I lists the objects that
*would* have failed this test before A2.

## B.1 Collections and documents — all 23 families

| Object | Justification | Writer | Reader | Lifecycle |
|---|---|---|---|---|
| `organizationDirectory/{handle}` | `UI_REQUIRED` (004 branded login, 032 discovery) · `PROJECTION_PRIVACY_REQUIRED` (9 allow-listed fields) | `C-01` | public `get`; `list` **denied** | permanent |
| `storefrontCatalog/**` | `CANONICAL_SEED_REQUIRED` — **declared inert, not built**, present solely so no agent reintroduces Release C | none | none | n/a |
| `users/{uid}` | `UI_REQUIRED` (profile, shell) · `SECURITY_REQUIRED` (identity) | self + `BE` | self | permanent |
| `users/{uid}/memberships/{orgId}` | `QUERY_REQUIRED` — answers *"which orgs am I in?"* **without a collection-group index**; `FIRESTORE_PHYSICAL_REQUIREMENT` | team commands | self | mirrors membership |
| `users/{uid}/notifications/{id}` | `UI_REQUIRED` (008, 026, 052) · `AUDIT_REQUIRED` (event trail to a person) | `BE` | self | permanent |
| `organizations/{orgId}` | `DOMAIN_INVARIANT` — the tenant root; `SECURITY_REQUIRED` — every rule path derives from it | `C-01`, `C-02` | all 7 | permanent |
| `…/settings/main` | `UI_REQUIRED` (028) · `DOMAIN_INVARIANT` (`defaultWarehouseId` is the **sole** source of that truth, DB-CR-013) | `C-02`, `C-36` | all 7 | permanent |
| `…/counters/{id}` | `TRANSACTION_REQUIRED` — unique order numbers under concurrency | `C-15`, `C-27` | **none** | permanent |
| `…/commandReceipts/{operationId}` | `IDEMPOTENCY_REQUIRED` — `INV-05`/`INV-06`; read first, written last | every idempotent command | **none** | permanent (TTL is the documented future path) |
| `…/productSkuIndex/{skuNorm}` | `IDEMPOTENCY_REQUIRED` + `FIRESTORE_PHYSICAL_REQUIREMENT` — a rule cannot query, so SKU uniqueness is enforced by `txn.create`'s precondition | `C-09`, `C-10` | **none** | follows product |
| `…/members/{uid}` | `SECURITY_REQUIRED` — **the** document every rule reads, on the constant path · `UI_REQUIRED` (027) | team commands | **self or `ADMINS`** | permanent |
| `…/invitations/{id}` | `UI_REQUIRED` (005, 027) · `SECURITY_REQUIRED` (hash-only, single-use, expiring) | `C-04`…`C-06` | `ADMINS` | terminal states |
| `…/categories/{id}` | `UI_REQUIRED` (014, and the `TABLE-001`/`048` filters **and now the Category label** — DB-CR-016) | client + `C-35` | all 7 | archive only |
| `…/warehouses/{id}` | `UI_REQUIRED` (015, `TABLE-004`, filters) · `DOMAIN_INVARIANT` (stock location) | client + `C-12`, `C-36` | all 7 | archive only |
| `…/products/{id}` | `UI_REQUIRED` · `DOMAIN_INVARIANT` — canonical product truth | `C-09`…`C-11` | all 7 | archive only |
| `…/stockBalances/{p}__{w}` | `DOMAIN_INVARIANT` (`INV-03`, per-warehouse negative guard) · `PERFORMANCE_REQUIRED`/`DENORMALIZATION_REQUIRED` (**DB-CR-017**: the frozen store-room filter inside a 27-read budget) | stock commands | all 7 | permanent |
| `…/productStockSummaries/{p}` | `PERFORMANCE_REQUIRED` — makes Inventory Value a bounded `sum()` instead of an unbounded scan · `DENORMALIZATION_REQUIRED` (DB-CR-011) | stock + product commands | all 7 | permanent |
| `…/stockMovements/{id}` | `DOMAIN_INVARIANT` — **the single source of stock truth** · `AUDIT_REQUIRED` · immutable | stock commands | **`NOT_VIEWER`** | permanent, never deleted |
| `…/privatePartners/{id}` | `UI_REQUIRED` (018, 019, 020, 022) — private procurement is first-class | client | **`PARTNER_WRITERS`** | deactivate only |
| `…/purchaseOrders/{id}` (+ `items`, `history`) | `UI_REQUIRED` · `STATE_MACHINE_REQUIRED` (DB-07 §8/§9) · `PROJECTION_PRIVACY_REQUIRED` for connected orders | PO/CPO commands + client draft | **`NOT_VIEWER`** | terminal states |
| `…/partnerCatalog/{id}` | `PROJECTION_PRIVACY_REQUIRED` — the *only* thing a connected buyer may see; never stock, cost, margin or warehouse | `C-21`, `C-22` | own-org `PARTNER_WRITERS`; buyers **via callable only** | permanent |
| `…/productMappings/{id}` | `DOMAIN_INVARIANT` (`INV-07`) · `UI_REQUIRED` (036, 037, 013) — stored under the **buyer** because the factor is buyer commercial data | `C-25`, `C-26` | **`PARTNER_WRITERS`** | disable only |
| `…/connections/{id}` (projection) | `PROJECTION_PRIVACY_REQUIRED` + `FIRESTORE_PHYSICAL_REQUIREMENT` — lets each party read with the ordinary constant-path rule instead of a forbidden data-derived read | `C-18`…`C-20` | **`PARTNER_WRITERS`** | state machine |
| `…/auditLogs/{id}` | `AUDIT_REQUIRED` · `SECURITY_REQUIRED` — immutable, `ADMINS` read, client create/update/delete denied **including Owner** | every command | `ADMINS` | permanent |
| `handleReservations/{handle}` | `TRANSACTION_REQUIRED` — `txn.create` makes handle uniqueness race-free, independent of what the directory exposes | `C-01` | **none** | permanent |
| `connections/{b}__{s}` | `DOMAIN_INVARIANT` — one canonical cross-tenant truth; deterministic id gives directional uniqueness | `C-18`…`C-20` | **none** | state machine |
| `connectedPurchaseOrders/{id}` (+ `items`, `history`) | `DOMAIN_INVARIANT` (`INV-19`) · `PROJECTION_PRIVACY_REQUIRED` — only fields **both** parties may see | `C-27`…`C-31` | **none** | terminal states |

## B.2 Backend-only objects — explicitly justified, per the gate instruction

The gate states a database object need not be visible in the UI. Five families are invisible to every
client at the rules layer, and each has a written non-UI justification: `counters` (`TRANSACTION_REQUIRED`),
`commandReceipts` (`IDEMPOTENCY_REQUIRED`), `productSkuIndex` (`FIRESTORE_PHYSICAL_REQUIREMENT`),
`handleReservations` (`TRANSACTION_REQUIRED`), and all of zone 4 (`PROJECTION_PRIVACY_REQUIRED`). Their
`CLIENT_READ` is `✘` in DB-02 §8 and `T-SEC-11`/`T-SEC-18` assert the denial.

## B.3 Fields with no UI consumer — each justified

| Field | Class | Why |
|---|---|---|
| `balanceAfterMilli` | `UI_REQUIRED` + `PERFORMANCE_REQUIRED` | The frozen **Balance After** column cannot be computed from a filtered, paginated page (DB-CR-006, `INV-24`) |
| `effectiveAt` | `UI_REQUIRED` | The opening-balance form back-dates; `createdAt` stays the **only** ordering key |
| `transferId`, `counterpartWarehouseId` | `DOMAIN_INVARIANT` (`INV-22`) + `PERFORMANCE_REQUIRED` | Pairs the two halves; renders *"to Cold Room"* without a second read |
| `isProjection` | `SECURITY_REQUIRED` | Keeps the client draft-write rule un-forgeable |
| `payloadHash` | `IDEMPOTENCY_REQUIRED` | Distinguishes replay from a different payload |
| `schemaVersion` | `TEST_REQUIRED` / future migration | Read by nothing in A/B; present so a migration can select |
| `reservedMilli` | `FUTURE_PLACEHOLDER, constant 0` | Constant `0`; no command writes it. Keeps `availableMilli` meaningful without a Release D reservation subsystem |
| `storefrontPublished`, `partnerPublished` | `CANONICAL_SEED_REQUIRED` | `partnerPublished` is live in B; `storefrontPublished` is inert Release C, declared so it is not reinvented |
| `…Snapshot` fields on movements and PO lines | `AUDIT_REQUIRED` (DV-09) | **Deliberately allowed to drift** — a snapshot records what was true, which is why renaming a product leaves history unchanged (`SC-08`) |
| ~~`warehouseName`~~ **DELETED at A3 · DB-CR-027** on `StockBalance` | `PERFORMANCE_REQUIRED` (A2 · DV-11) | The report's **Warehouse** column without a join |

```
DATABASE_OBJECT_JUSTIFICATION = 100%
```

---

# C — FIELD-LEVEL UI ↔ DATABASE MATCH

All 59 live `FIELD` ids resolve. The checks the gate names explicitly:

| Concern | UI | Database | Verdict |
|---|---|---|---|
| **Money minor units** | `FIELD-015`, `016`, `032`; *LKR 691,700.00* | `…Minor` **integer**, explicit `currency`, half-up rounding, **no floats ever** | ✔ |
| **Quantity milli units** | `FIELD-017`, `018`, `022`, `031`, `033`; *120.000 KG* | `…Milli` **integer**, 3 dp, `quantityPrecision` fixed at 3 and read-only in the UI | ✔ — `INV-03`'s equality is **exact**, not approximate |
| **Units** | `FIELD-014`, `042` | `Unit` enum: `KG L EACH PACK` (A3 · F-L-01 — `BOX`/`CAN`/`BOTTLE` deleted; they appear in no seed value and no frozen screen); stored **beside** every quantity; `baseUnit` immutable once any movement exists | ✔ |
| **SKU** | `FIELD-012`, `040` | `internalSku` as typed + `internalSkuNormalized` unique per org via `productSkuIndex`; a typed partner SKU is **a lookup key, never a stored link** (`BR-008`) | ✔ |
| **Status enums** | every pill | `LifecycleStatus`, `StockStatus`, `PoStatus`, `ConnectionStatus`, `MappingStatus`, `PartnerStatus`, `MemberStatus`, `InviteStatus`, `Availability`, `DirectoryStatus` | ✔ — `PENDING`/`REJECTED` mapping statuses are B-PLUS and **cannot** be produced |
| **Dates / timestamps** | `FIELD-029`, `054`; *"As at 1 Aug 2026"* | `ts` server timestamps; `effectiveAt` for business date; `createdAt` the sole ordering key | ✔ |
| **Organization handle** | `FIELD-005`, `038`; `@freshfoods` | `[a-z0-9-]`, **3–30** (DB-CR-007 resolved `19`'s 3–40 against `05`/`11`), normalised, reserved list, unique via `handleReservations` | ✔ |
| **Role labels** | role badge, `FIELD-003`, `035`, `058` | `Role` — **seven** values; `FIELD-003` is an untrusted preference; invited role is **never** `OWNER` | ✔ |
| **Product / category names** | `TABLE-001` | `products.name` ≤ 120; `categories.name` ≤ 80. **A2: the Category label comes from `Q-016`, not from a denormalised copy** | ✔ |
| **Warehouse names** | `TABLE-003`, `004`, `013` | `warehouses.name` ≤ 80; denormalised as ~~`warehouseName`~~ **DELETED at A3 · DB-CR-027** onto balances (DV-11) | ✔ |
| **Supplier / buyer names** | `TABLE-007` | `privatePartners.name`; PO carries `counterpartyName` as a snapshot. **A2: `preferredSupplierName` removed from the summary — it would have leaked partner data to four denied roles** | ✔ |
| **Stock quantities** | *On hand*, *Available* | `onHandMilli`, `availableMilli` (= on hand while `reservedMilli` is 0) | ✔ |
| **Minimum quantities** | *Minimum* column, `FIELD-017` | `minimumStockMilli`; `0` means *not tracked* and can never produce `LOW_STOCK`; **exactly at the minimum is NOT low** (strict `<`) | ✔ |
| **PO / received / outstanding** | `FIELD-031`, `033` | `orderedBuyerBaseMilli`, `receivedBuyerBaseMilli`, and for connected orders `orderedSupplierMilli` / `receivedSupplierMilli` — **outstanding is tracked in supplier order units** to prevent conversion drift across partial receipts | ✔ |
| **Conversion factor** | `FIELD-047`; *1 PACK = 5 KG* | `supplierToBuyerBaseFactorMilli > 0`, snapshotted per line; `INV-17` locks `orderUnit == baseUnit` | ✔ |
| **Mapping state** | `TABLE-023` | `MappingStatus` = `VERIFIED` \| `DISABLED` | ✔ |
| **Connection state** | `TABLE-018` | `ConnectionStatus`; **no re-enable path exists** and the disabled record says so with no action | ✔ |
| **Notification state** | `FIELD-056` | `read: boolean` — the **only** client-writable field; `create`/`delete` denied to the recipient | ✔ |

**Two documented UI-side divergences, neither a database defect.**

| # | Divergence | Resolution |
|---|---|---|
| 1 | `FIELD-023` *"Adjustment reason / text, required, descriptive"* vs the canonical Gate 6 form's **enumerated** Reason | **DB-CR-009 already adopted the enum** (`RECOUNT_CORRECTION · DAMAGED_IN_STORAGE · EXPIRED · WASTAGE · THEFT_OR_LOSS · OTHER`) plus a bounded `note`, required when `OTHER`. The canonical artifact is the stronger authority; `22`'s free-text description is superseded. This is also the evidence that resolves IR-06 (§G / DB-00 §7.6). |
| 2 | `19` `TABLE-001` columns *Preferred Supplier* + *Updated* vs the canonical board's *Minimum* + *Stock value* | **VR-09 — non-database.** `productStockSummaries` and `stockBalances` both carry `minimumStockMilli`, `stockValueMinor`/`baseUnitPriceMinor` **and** `productUpdatedAt`, so the database serves either reading at 25 reads. Raised to the owner in DB-10 §7 as a UI-authority reconciliation item. |

`FIELD-024` is a **declared RETIRED tombstone** in `22` itself — *"the canonical stock/opening-balance
contracts generate operation and movement references and do not accept a user-editable reference"* — which
is exactly what `operationId` and the generated `movementId` do. It is not an orphan.

```
FIELD_MODEL_ALIGNMENT = 100%   (59 live FIELD ids; 1 declared tombstone)
```

---

# D — STATE ALIGNMENT

Every backend state, its legal actors and transitions, its UI representation and its refusal state.
Transition tables are DB-07 §1–§10; this is the alignment check.

| Machine | Backend states | UI representation | Forbidden, and absent (not disabled) | Refusal state |
|---|---|---|---|---|
| **Membership** | `ACTIVE` `SUSPENDED` `REMOVED` | 027 rows; `STATE-016` suspended; shell collapses via **RT-1** | any transition on the canonical Owner; a second `OWNER` | `OWNER_PROTECTED` |
| **Invitation** | `PENDING` `ACCEPTED` `EXPIRED` `REVOKED` | 005, 027, `STATE-040/041/042` | reuse; role `OWNER` | 4 distinct codes, **never collapsed** |
| **Product** | `ACTIVE` `ARCHIVED` | 011 archived filter, 013 header | hard delete, by anyone, at any layer | confirmation `STATE-008` |
| **Category** | `ACTIVE` `ARCHIVED` | 014 | client `status` write (DB-CR-012); archive while ACTIVE products reference it | archive-blocked inline |
| **Warehouse** | `ACTIVE` `ARCHIVED` | 015 | client `status` write; archive with stock, an open receipt, or while default | **`STATE-035`** + *"Transfer this stock"* → now a **real** action (`SCREEN-053`) |
| **Private partner** | `ACTIVE` `DEACTIVATED` | 018/019/020 | hard delete | – |
| **Connection** | `PENDING` `ACTIVE` `REJECTED` `DISABLED` | 031/033 `TABLE-018` | duplicate request; self-connection; **re-enable — no button, flow or command exists** | `STATE-033` stale, **RT-4** makes it visible |
| **Mapping** | `VERIFIED` `DISABLED` | 037 `TABLE-023` | `PENDING`/`REJECTED` pills (B-PLUS) | **`STATE-028…034`, all seven drawn** |
| **Private PO** | `DRAFT` `ORDERED` `PARTIALLY_RECEIVED` `RECEIVED` `CANCELLED` | 021/023/024 | `SUBMITTED` `ACCEPTED` `REJECTED` `SHIPPED` — an external supplier is not a Stockmok user; cancel after any receipt | `INVALID_TRANSITION`, `STATE-039` |
| **Connected PO** | + `SUBMITTED` `ACCEPTED` `REJECTED` `SHIPPED` | 038/039/040, dual representation, **RT-3** | `PARTIALLY_SHIPPED` (`BR-020`); cancel after `ACCEPTED`; a buyer doing a supplier transition | `INVALID_TRANSITION` |
| **Receiving** | quantity progression, not a status | 024/040 current→after→outstanding | over-receipt | **`STATE-038`** |
| **Transfer (A1)** | **no state — applied immediately** | 053 previews + *total unchanged* | in-transit, approval, multi-product, cross-org | **`STATE-044`** same store room |
| **Notification** | `read` boolean | 026/052 | recipient `create`; any field but `read` | denied by rules (`T-SEC-23`) |
| **Stock ledger** | exactly one state: **written** | 017 `TABLE-006` | edit, void, reversal flag, archive — **not even a disabled control** | *"a wrong entry is answered with a new entry carrying a reason"* |

**Checks the gate names.** No UI-only state: every `STATE-###` maps to a persisted enum, a typed error, or
a pure render state. No backend-only user-visible state: the only states with no UI are inside
backend-only documents the user never encounters. No illegal UI transition: terminal states render **no
control**, absent rather than disabled. No missing refusal state: every `HttpsError` reason code in
DB-06 §7 has a named UI state.

```
UI_STATE_MACHINE_ALIGNMENT = 100%   (13 machines, 44 STATE ids, 0 orphans in either direction)
```

---

# E — ROLE / PERMISSION ALIGNMENT

For all seven roles: UI visibility, route access, query permission, document-read permission,
direct-write permission and command permission must agree. **This is the section the external reviewer's
IR-01 broke, and it is the reason A2 exists.**

## E.1 Read permission — the corrected matrix

| Collection | O | A | IM | PM | SK | AN | V | Enforced in |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| `organizations`, `settings/main` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | rules |
| `categories`, `warehouses` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | rules |
| `products`, `stockBalances`, `productStockSummaries` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | rules |
| **`stockMovements`** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | **✘** | **rules** (A2) |
| **`purchaseOrders` + `items` + `history`** | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | **✘** | **rules** (A2) |
| **`privatePartners`** | ✔ | ✔ | **✘** | ✔ | **✘** | **✘** | **✘** | **rules** (A2) |
| **`connections`, `productMappings`, `partnerCatalog`** | ✔ | ✔ | **✘** | ✔ | **✘** | **✘** | **✘** | **rules** (A2) |
| `members` — `get` self | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | rules |
| **`members` — `list` / other-member `get`** | ✔ | ✔ | **✘** | **✘** | **✘** | **✘** | **✘** | **rules** (A2) |
| `invitations`, `auditLogs` | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | rules (pre-A2) |
| zone 4 (`handleReservations`, `connections/**`, `connectedPurchaseOrders/**`) | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | rules — **including the Owner of a participating org** |

Each row is asserted for **all seven roles in both seeded organizations**: `T-SEC-26` … `T-SEC-31`.

## E.2 Write and command permission

Unchanged by A2 and already aligned: six client-write surfaces (DB-05 §6 / `06` §6.1), **38 Release-A/B command callables at A3R-P** (*the "36" that stood here was the A2-era catalog row count and is SUPERSEDED — `C-35` split into `C-35a`/`C-35b`, and `C-37`/`C-38` were added*), each
gated by the role read **from the membership document** (DB-05 §7.1). `T-SEC-05`/`T-SEC-06` assert a forged
role and a direct-URL-plus-command attempt are both denied.

## E.3 The one enforcement layer that is correctly the router — declared, not hidden

| Surface | Role | Why the router is the right layer |
|---|---|---|
| `SCREEN-049` Purchase-Order Report tab | SK, V | `06` §5 grants Storekeeper *View purchase orders* — they must see the order they receive against — and denies only the **report surface**. A tab-level product decision over data the role may lawfully read has no data-boundary expression, and none is needed because **no field is being withheld**. `23` §5 specifies *"inline `STATE-006`, no query"*. Viewer's `purchaseOrders` denial is enforced in rules regardless. |

Every other role-level denial in `06` §5 and `23` §4 is now enforced at the data boundary.

```
UI_RBAC_DATABASE_ALIGNMENT = 100%
MISMATCHED_RBAC            = 0     (was 7 collection paths before A2)
ROUTER_ONLY_DENIALS        = 1, declared, over data the role may lawfully read
```

---

# F — QUERY / UI ALIGNMENT

Every filter, sort, search, pagination control, table, report, dashboard card, KPI, timeline and history
list, against the eight required proofs.

| Proof | Result |
|---|---|
| 1. The exact query exists | **YES** — **92 defined `Q-id`s at A3R-P**, counted mechanically from DB-04's rows; every id referenced by DB-02/03/04/05/06/08/11 resolves to a row in DB-04, **asserted by test** over the widened scope (DB-CR-021, widened at A3 · F-H-01). *(HISTORICAL: 78 before A3; 91 at A3R; the "78" that stood here is SUPERSEDED.)* Dangling ids found and closed, in order: `Q-044`, `Q-048`, `Q-011a` (A2) · `Q-079` (A3) · **`Q-085g` → defined as `Q-080` (A3R-P)**. |
| 2. The database contains the required fields | **YES** — including `balanceAfterMilli` (frozen *Balance After*), the `StockBalance` display set (frozen store-room filter) and `minimumStockMilli` (derived per-row status) |
| 3. The required index exists or is planned | **YES** — **67 composite at A3R-P** (`IDX-01…IDX-69` less the deleted `IDX-03`, `IDX-19`) + automatic single-field; the 32-index product-list matrix is **generated** from the DB-CR-038 rule and `firestore.indexes.json` is asserted to contain **exactly** that set. *(HISTORICAL: 43 after A2, 44 after A3 — both SUPERSEDED.)* |
| 4. The query satisfies Firestore rules | **YES** — every client query is single-tenant-path scoped; **no rule reads a data-derived path**; the eleven bounded collections additionally satisfy `request.query.limit <= 100` |
| 5. Pagination semantics match the UI | **YES** — cursor `startAfter`, 25/100, never offset, on every list without exception |
| 6. Read cost respects the frozen budget | **YES** — product list **25** in both modes (was 50 when store-room-filtered); dashboard **12 warm** ✔ at the ≤ 12 budget / 14 cold **at seed scale**, with the scale stated (DB-CR-020) and Needs Attention repriced at **≤ 6** (A3R-17). *(The "11 warm" figure predates A3R-17 and is SUPERSEDED.)* Both remain an **obligation to measure at Stage 17**, not a proven claim. |
| 7. Empty state is supported | **YES** — every list surface, with `23` §9's mandated copy |
| 8. Stale behaviour is defined | **YES** — one-shot reads by default, exactly four justified listeners, every command re-reads state inside its transaction |

**No decorative controls.** Sorting is offered only on indexed fields and the UI **disables** the rest
rather than sorting a partial page. Search is a bounded prefix range on an indexed field, not full-text, and
while a search term is active the sort is forced to the searched field because Firestore requires the first
`orderBy` to carry the range filter. **No client-side scan of an unbounded collection exists**, and
`TWO_STEP_LISTS` and `JOINED_LISTS` are both now **0**.

```
UI_QUERY_ALIGNMENT = 100%
UNSUPPORTED_FILTERS = 0    (was 1 — the store-room filter had no in-budget query)
```

---

# G — CANONICAL DATA ↔ UI ALIGNMENT

Reconciled against DB-08 §1–§4 **and** re-verified byte-level against the canonical Gate 6 artifact
`cb94a73c…` on 2026-08-17. Arithmetic recomputed independently rather than restated.

## G.1 The twelve products, at the post-chain state the board shows

| SKU | Product | Category | Unit | On hand | Min | Cost | Value | Store room | Status |
|---|---|---|---|---:|---:|---:|---:|---|---|
| MEAT-001 | Chicken Breast | Meat | KG | **120.000** | 20 | 1,250.00 | 150,000.00 | Cold Room | IN_STOCK |
| MEAT-002 | Beef Mince | Meat | KG | 40.000 | 15 | 2,100.00 | 84,000.00 | Cold Room | IN_STOCK |
| MEAT-003 | Fish Fillet | Meat | KG | 10.000 | 12 | 1,850.00 | 18,500.00 | Cold Room | **LOW** |
| DAIR-001 | Fresh Milk | Dairy | L | 120.000 | 50 | 380.00 | 45,600.00 | Cold Room | IN_STOCK |
| DAIR-002 | Butter Block | Dairy | KG | 8.000 | 10 | 2,600.00 | 20,800.00 | Cold Room | **LOW** |
| DAIR-003 | Cheddar Cheese | Dairy | KG | 25.000 | 8 | 3,200.00 | 80,000.00 | Cold Room | IN_STOCK |
| DRY-001 | Basmati Rice | Dry Goods | KG | 250.000 | 100 | 420.00 | 105,000.00 | Main Store | IN_STOCK |
| DRY-002 | Wheat Flour | Dry Goods | KG | 60.000 | 80 | 210.00 | 12,600.00 | Main Store | **LOW** |
| DRY-003 | Sugar | Dry Goods | KG | 300.000 | 60 | 260.00 | 78,000.00 | Main Store | IN_STOCK |
| DRY-004 | Cooking Oil | Dry Goods | L | **0.000** | 40 | 690.00 | 0.00 | Main Store | **OUT** |
| BEV-001 | Bottled Water 1L | Beverages | EACH | 600.000 | 200 | 90.00 | 54,000.00 | Main Store | IN_STOCK |
| BEV-002 | Orange Juice 1L | Beverages | EACH | 90.000 | 60 | 480.00 | 43,200.00 | Main Store | IN_STOCK |

## G.2 Independent arithmetic — every figure recomputed

| Check | Computation | Result | Artifact |
|---|---|---|---|
| Seed value at t₀ | `18·1250 + 40·2100 + 10·1850 + 120·380 + 8·2600 + 25·3200 + 250·420 + 60·210 + 300·260 + 0 + 600·90 + 90·480` | **564,200.00** | DB-08 §2 ✔ |
| Post-chain value | `564,200 + (120−18)·1,250 = 564,200 + 127,500` | **691,700.00** | board *"LKR 691,700.00"* ×17 ✔ |
| Sum of the twelve rows above | – | **691,700.00** | ✔ |
| Cold Room | `150,000 + 84,000 + 18,500 + 45,600 + 20,800 + 80,000` | **398,900.00** | board *"Cold Room LKR 398,900.00"* ✔ |
| Main Store | `105,000 + 12,600 + 78,000 + 0 + 54,000 + 43,200` | **292,800.00** | board *"Main Store LKR 292,800.00"* ✔ |
| Two rooms sum | `398,900 + 292,800` | **691,700.00** | board *"Total LKR 691,700.00"* ✔ |
| Status split, post-chain | 8 IN / 3 LOW / 1 OUT | **12** | board *"In stock 8 · Low stock 3 · Out of stock 1 · Total 12 · 100%"* ✔ |
| Status split, t₀ | 7 IN / **4 LOW** / 1 OUT | **12** | DB-08 §2; step 1 moves MEAT-001 LOW→IN, so the KPI goes **4 → 3** ✔ |
| MEAT-001 ledger | `18 + 2 + 40 + 10 + 40 + 10` | **120.000 KG**, **6 movements** | board *"18 + 2 + 40 + 10 + 40 + 10 = 120.000 KG"*, *"six entries"* ✔ |
| Seeded ledger | 12 openings + 5 later on MEAT-001 | **17** | board *"Showing 1–17 of 17"*, *"17 recorded movements"* ✔ |
| MEAT-001 value | `120 × 1,250` | **150,000.00** | board ✔ |
| Connected conversion | `10 PACK × 5 KG` | **50.000 KG** | board *"verified mapping 1 PACK = 5 KG, so 50.000 KG reached your stock"* ✔ |
| Supplier ship | `200 − 10 PACK` | **190 PACK**, buyer unchanged at SHIPPED | `INV-10` ✔ |

**The `t₀` versus post-chain distinction is the one that catches readers.** DB-08 states low = **4** at
`t₀`; the canonical board draws the **post-chain** workspace, where low = **3**. Both are correct, `T-SEED-01`
asserts `Q-051 == 4` immediately after seeding, and DB-09 §9's hand-check is now labelled *"at t₀"* so an
implementer does not read a mismatch that is not there.

## G.3 The remaining named seed values

`@freshfoods` — one canonical spelling (`CHG-033`); the not-found lesson uses `@fresh-foods-lk`, which
belongs to nobody · **two** Grand Ocean store rooms, `Main Store` (default) and `Cold Room`; `Bar Store`
appears **only** as the example value inside the *New warehouse* dialog and is **not seeded** · four
categories · seven users, one per role, so RBAC is demonstrable · Fresh Foods `200 PACK` + `300 KG`,
`CKN-B5` published with `orderUnit == baseUnit` (`INV-17`) · `PO-2026-001` Green Farm 50 KG in two receipts ·
`CPO-2026-003` 10 PACK in two receipts · **zero** open POs and **zero** pending connections at `t₀`.

**Cooking Oil is seeded with an `OPENING_BALANCE` movement of 0**, because *"a product with no movement and
a product at zero are different states, and the out-of-stock KPI must be provable from the ledger"* — which
is also why VR-03 removed the `onHandMilli > 0` predicate that would have hidden it from the report the
board says lists it.

## G.4 IR-06 — the movement-kind claim, settled against the artifact

Recorded in full in DB-00 §7.6. In summary: the reviewer's `Issued to kitchen −15.000 KG` row occurs **5
times in the superseded pre-patch file `ea760d2b…`** and **0 times in the canonical `cb94a73c…`**. The
canonical MEAT-001 ledger's only adjustment is `Correction · recount correction · +2.000`, and the canonical
report table states the seeded **Issued** total as **`0.000`** in its own words. `DB-CR-005` stands
unchanged; `Issued = CONNECTED_DISPATCH_OUT` is confirmed, not inferred.

**The frontend requires no invented demo value, and the seed contradicts no frozen screen content.**

```
CANONICAL_UI_DATA_RECONCILIATION = PASS
MISMATCHED_CANONICAL_VALUES      = 0
```

---

# H — END-TO-END WORKFLOW PROOF

Each chain: **UI → query/form → command → authorization → transaction → write → derived data → audit →
notification → UI result.**

| # | Workflow | Chain |
|---|---|---|
| 1 | **Auth / onboarding** | 002/003/004 → `FORM-001`/`Q-001` → `C-01 org.create` → any authenticated user, no membership → `txn.create(handleReservations)` → reservation + org + directory + settings + Owner member + membership mirror + **first warehouse** + audit → DV-05, DV-08 → audit → – → 006/009 · fail `HANDLE_TAKEN` `STATE-017`, **no half-created org** |
| 2 | **Team / invitation** | 027 → `FORM-012` → `C-04` (`ADMINS`) → invitation `PENDING`, `tokenHash` only → audit → – → `STATE-042` link **once**. Then 005 → `C-06` (email-matched invitee) → invitation `ACCEPTED` + member + **mirror in the same transaction** (`INV-20`) → notification → workspace · fails: 4 distinct codes |
| 3 | **Product create / edit / archive** | 012 → `FORM-006` → `C-09`/`C-10`/`C-11` (`INVENTORY_WRITERS`) → `txn.create(productSkuIndex)` → product + sku index + zeroed summary **+ every balance's DV-11 fields (A2)** + audit + receipt → DV-10, **DV-11** → audit → – → 011 row refreshed · fail `SKU_TAKEN` |
| 4 | **Opening balance** | 042 → `FORM-023`/`Q-018` (must be absent or zero) → `C-13` → `OPENING_BALANCE` movement (`effectiveAt ≤ now`) + balance + summary + audit + receipt → DV-01, DV-02, DV-03, DV-04, DV-07 → audit → low-stock **on transition** → `STATE-004` · fail `OPENING_BALANCE_ALREADY_RECORDED`, and the UI offers an adjustment instead |
| 5 | **Stock adjustment** | 016 → `FORM-009` (enum reason + `note` on `OTHER`) → `C-14` (`INVENTORY_WRITERS`; **Storekeeper excluded**) → per-warehouse negative guard → movement + balance + summary + audit + receipt → DV-01…04, DV-07 → audit → notification on transition → `STATE-004`; `STATE-008` above 50 % · fail `INSUFFICIENT_STOCK`, `STATE-037` replay |
| 6 | **Inter-warehouse transfer (A1)** | 053 → `FORM-024`, `Q-014`+`Q-017`+`Q-018`×2 → `C-33` (`TRANSFER_WRITERS`) → `from ≠ to`, both ACTIVE, source ≥ q, `CROSS_TENANT_REFERENCE` on a foreign warehouse → **6 documents**: paired movements sharing `transferId`, 2 balances, audit, receipt → DV-01, DV-07, **DV-11 on a created destination**; **summary deliberately untouched** (`INV-23`) → audit → **none possible** → *total unchanged* · fail `SAME_WAREHOUSE` `STATE-044`, `INSUFFICIENT_STOCK` |
| 7 | **Private PO** | 022 → `FORM-011` → draft **client write** (`PRIVATE`+`DRAFT` only, draft fields only) → `C-15 po.order` → counter increment **inside** the transaction → PO `ORDERED` + `orderNumber` + frozen snapshots + items + history + audit + receipt → – → audit → – → `STATE-039` immutable |
| 8 | **Private receiving** | 024 → `FORM-010`/`Q-035` → `C-17` (`RECEIVERS`) → `0 < recv ≤ outstanding` per line → one `PURCHASE_RECEIPT` per line + balances + summaries + item quantities + PO status + history + audit + receipt; `receivingWarehouseId` on the **first** receipt → DV-01…04, DV-07 → audit → notification → partial or final `STATE-004` · fail `OVER_RECEIPT` `STATE-038` |
| 9 | **Connection request / accept / reject** | 032 `Q-001` exact `get` → `C-18` (buyer `PARTNER_WRITERS`) → `txn.create({b}__{s})`, self-connection rejected → canonical + **both** projections + audit ×2 + notification + receipt → DV-06 → audit ×2 → supplier `ADMINS` → `STATE-026`. Then 031 → `C-19` (supplier `PARTNER_WRITERS`) → `ACTIVE`\|`REJECTED` · **`C-20 disable` is `ADMINS` only, and there is no re-enable** |
| 10 | **Partner catalog** | 051 → `FORM-019` → `C-21` (`PARTNER_WRITERS`) → **`INV-17` `orderUnit == baseUnit`** → allow-listed projection item → DV-08 → audit → – → 034. Buyer side: 035 → **`Q-046` callable only**, connection ACTIVE verified server-side; **no client read path exists** |
| 11 | **Product mapping** | 036 → `FORM-020`, `Q-047` callable → `C-25` (buyer `PARTNER_WRITERS`) → **seven** server re-validations incl. explicit `semanticConfirmed` and a `limit(1)` duplicate guard → mapping `VERIFIED` + audit + receipt → – → audit → – → `STATE-028…034`, all seven drawn |
| 12 | **Connected PO submit** | 038 → `FORM-021` → **`C-34 cpo.draftSave`** (buyer draft, **no receipt** — DB-CR-014) → then `C-27 cpo.submit` → connection **re-read inside** the transaction, every mapping re-validated → canonical + items with frozen snapshots + **both** projections + history ×3 + audit ×2 + notification + receipt + counter → DV-06 (`INV-19`) → audit ×2 → supplier → `STATE-004` |
| 13 | **Connected PO accept / reject** | 039 → `FORM-018` → `C-28` (**supplier** `PO_WRITERS`) → correct side of the canonical record → status + history on all three + audit ×2 + notification + receipt · fail `INVALID_TRANSITION` |
| 14 | **Connected PO ship** | 039 → `C-29` (supplier `PO_WRITERS`) → `CONNECTED_DISPATCH_OUT` in the **supplier** ledger + supplier balances + summaries + canonical `SHIPPED` + both projections + history + audit ×2 + notification + receipt → **buyer stock untouched** (`INV-10`) → *"Issued"* in the supplier's Kind filter · **no `PARTIALLY_SHIPPED` exists** |
| 15 | **Partial receive** | 040 → `FORM-022` in **supplier order units** → `C-30` (buyer `RECEIVERS`) → `buyerBaseMilli = roundHalfUp(recv × factor / 1000)`; **outstanding tracked in supplier units** → `PURCHASE_RECEIPT` in the **buyer** ledger only (`INV-11`) + balances + summaries + canonical + both projections + history + audit + notification + receipt → `PARTIALLY_RECEIVED` |
| 16 | **Final receive** | as 15 → `RECEIVED`; residual rounding of at most one milli-unit absorbed into the final line; MEAT-001 reaches **120.000 KG** |
| 17 | **Notifications** | every command's `notify()` resolves recipients **before any write** via `Q-059` `limit(50)`; over 50 logs a warning and the command **still succeeds** (`NOTIFICATION_FANOUT_EXCEEDED`) → 008 badge **RT-2** → 026/052 → `read` flag client write, that field only |
| 18 | **Reports** | 048 → `Q-061` (All) or `Q-074`…`Q-076` (one store room) → no command → CSV of the **already-fetched authorized page only**, no unbounded export, **no mobile export** (`CHG-044`) · 049 → `Q-062`, tab denied to SK and V **before** any query |

**Every chain closes.** No chain reaches a command that does not exist, a document that is not written, a
derived value with no owner, or a UI result with no server outcome.

```
END_TO_END_WORKFLOW_COVERAGE = 100%   (18 workflows)
```

---

# I — ORPHAN / GAP DETECTION

**Scope of this table: HISTORICAL, A2-era.** It records what each figure was **before** and **after A2**,
so the A2 zeros are auditable rather than asserted. It is **not** the current inventory — A3 and A3R
reopened and re-closed several of these counters at much larger magnitudes. **The current, A3R-P-verified
state is §M.** Read §M for truth; read this table for the audit trail.

| Metric | Before A2 | After A2 | What the non-zero items were |
|---|:-:|:-:|---|
| `ORPHAN_UI_ELEMENTS` | **3** | **0** | the store-room filter on `TABLE-001` (no in-budget query); `TABLE-004`'s zero rows (no query returned them); `TABLE-013`'s zero rows (`onHandMilli > 0` excluded them) |
| `ORPHAN_DATABASE_OBJECTS` | **2** | **0** | `ProductStockSummary.categoryName` and `.preferredSupplierName` — declared strongly consistent, maintained by a command that does not exist, and in the second case a privacy leak. **Both deleted.** |
| `UNSUPPORTED_FILTERS` | **1** | **0** | the store-room filter — 50 reads against a 27-read budget |
| `UNSUPPORTED_ACTIONS` | **0** | **0** | closed earlier by `C-34` and `C-35`; `ACTION-062` closed by `C-33` |
| `UNREPRESENTED_BACKEND_STATES` | **0** | **0** | backend-only documents are never user-encountered; every user-reachable state has a UI form (§D) |
| `MISMATCHED_RBAC` | **7 paths, 4 screens** | **0** | `stockMovements`, `purchaseOrders`(+2 sub), `privatePartners`, `connections`, `productMappings`, `partnerCatalog`, `members`; and DB-03's role columns for `010`, `013`, `017`, `038` |
| `MISMATCHED_CANONICAL_VALUES` | **0** | **0** | verified byte-level against `cb94a73c…`; the `t₀`-vs-post-chain low-stock figure is a labelling clarification, not a mismatch |
| `UNDEFINED_QUERY_IDS` | **3** | **0** | `Q-044`, `Q-048` (referenced by DB-03), `Q-011a` (referenced by DB-04 itself) |
| `JOINED_OR_TWO_STEP_LISTS` | **2** | **0** | the store-room filter and `Q-061` |
| `UNBOUNDED_FANOUTS` | **1** | **0** | the category-rename fanout DV-10 described against a non-existent command, capped at 500 with a documented refusal above it |
| `INDEX_ID_COLLISIONS` | **1** | **0** | `IDX-33` claimed by both `products` (DB-02 §4.1) and `productStockSummaries` (DB-04 §7) |

**`ORPHAN_DATABASE_OBJECTS = 0` is the figure this gate exists to earn.** Two fields did exist only because
they were convenient for a column, and the reviewer's IR-02 is what surfaced them.

---

# J — INDEPENDENT RECONCILIATION

**HISTORICAL — this block records the state at the time this gate was first run.** It is superseded by
§M: two independent frontend ↔ database reviews have since been performed and both returned `FAIL`.

```
[PRE-A3 STATE, SUPERSEDED]
DB_PACK_INDEPENDENT_REVIEW        = COMPLETE   (external reviewer, 2026-08-17 — DB-00 §7)
CLAUDE_SUBAGENT_REVIEW            = FAILED     (org monthly spend limit; recorded, not hidden)
FRONTEND_DB_INDEPENDENT_REVIEWER  = NOT AVAILABLE IN THIS RUN
```

**Stated plainly rather than implied.** The gate asks for a reviewer focused **only** on final frontend ↔
database consistency, who does not author fixes. **No such independent reviewer ran.** The three subagents
commissioned for the DB pack terminated on the organization spend limit and returned nothing, and no
separate budget existed for a frontend-consistency reviewer. This gate was performed by the agent that
authored the A2 fixes, which is precisely the conflict of interest §J is designed to remove.

**What was done instead, and what it is worth.** The reconciliation was run in the reverse direction the
gate prescribes — §B and §I start from the *database* and demand a consumer, rather than starting from the
UI and looking for support. That is what found the two orphan fields, the three undefined query ids and the
index collision, none of which a UI-first pass would surface. Every arithmetic claim in §G was recomputed
from the canonical artifact rather than copied from DB-08, and every reviewer finding was tested against
the artifact rather than against the pack's own summary of it — which is what refuted IR-06.

**What that does not substitute for.** A single author verifying their own work catches contradiction and
arithmetic well and blind spots poorly. The specific residual risks:

1. **A2's own correctness has had no adversarial reader.** `NOT_VIEWER` and the six `PARTNER_WRITERS`
   tightenings are new rule logic written and reviewed by the same agent. `T-SEC-26` … `T-SEC-33` are the
   mitigation and **must fail against the pre-A2 ruleset** to be evidence at all.
2. **Per-cell RBAC agreement across all seven roles × 23 collection families × 53 screens** was reconciled
   by reading, not by exhaustive enumeration of all 8,000-odd cells.
3. **The warehouse-filtered list's per-store-room column semantics** are a reasoned reading of a frozen
   board that draws only `Store room: All`. The reading is defensible and stated, but it is a reading.
4. **`19`-vs-artifact column divergence (VR-09)** is unresolved on the UI side, by design — it needs an
   owner, not an agent.

**Recommendation, unchanged in substance from DB-10 §1 and now more specific:** re-run an independent
reviewer scoped to *final frontend ↔ database/backend consistency*, with A2 and this gate as the input,
before Codex begins. `INDEPENDENT_RECONCILIATION` is the one metric in §K this gate **cannot** self-certify,
and it is reported as such rather than rounded up.

---

# K — REQUIRED FINAL METRICS

```
UI_TO_DATABASE_TRACEABILITY      = 100%
DATABASE_OBJECT_JUSTIFICATION    = 100%
FIELD_MODEL_ALIGNMENT            = 100%
UI_STATE_MACHINE_ALIGNMENT       = 100%
UI_RBAC_DATABASE_ALIGNMENT       = 100%
UI_QUERY_ALIGNMENT               = 100%
CANONICAL_UI_DATA_RECONCILIATION = PASS
END_TO_END_WORKFLOW_COVERAGE     = 100%   (18 workflows)

ORPHAN_UI_ELEMENTS               = 0      (was 3)
ORPHAN_DATABASE_OBJECTS          = 0      (was 2)
UNSUPPORTED_FILTERS              = 0      (was 1)
UNSUPPORTED_ACTIONS              = 0
UNREPRESENTED_BACKEND_STATES     = 0
MISMATCHED_RBAC                  = 0      (was 7 paths + 4 screen role columns)
MISMATCHED_CANONICAL_VALUES      = 0
```

**Supporting metrics, so the eight 100 %s are checkable rather than declarative.**

**HISTORICAL — A2-era counts, SUPERSEDED. Do not implement against this block.** It is retained as the
audit trail of what this gate certified when it ran. **The current figures are §M.**

```
[A2-ERA, SUPERSEDED]
SCREENS      53/53      TABLES 27/27     FORMS 24/24      ACTIONS 62/62
STATES       44/44      FIELDS 59/59 live (1 declared tombstone)
QUERIES      78 defined, 0 referenced-but-undefined (was 3)
INDEXES      43, asserted exactly by test
COMMANDS     36, 0 added by A2
INVARIANTS   25 (INV-25 added)          DERIVED CONTRACTS 11 (DV-11 added)
SECURITY TESTS  33 T-SEC + 12 T-XFER + 8 T-CONC + T-INT-03 + T-SEED-01
```

**The metric this gate could not certify, and what happened to it:**

```
[AT THE TIME THIS GATE RAN — SUPERSEDED]
FRONTEND_DB_INDEPENDENT_REVIEW   = NOT PERFORMED   (§J — no independent reviewer was available;
                                                    this gate was run by the author of the fixes)

[CURRENT — A3R-P]
FRONTEND_DB_INDEPENDENT_REVIEW   = COMPLETE        (2026-08-17, 44 findings, FAIL -> amendment A3)
A3_ADVERSARIAL_INDEPENDENT_REVIEW = COMPLETE       (2026-08-17, 18 findings, FAIL -> amendment A3R)
INDEPENDENT_REVIEWS_COMPLETED    = 2               (a third failed on the org spend limit; recorded)
```

DB-10 §1 and §8 carry the completed state. The limitation this gate reported honestly was real, it was
acted on, and **both reviews it invited returned `FAIL`** — which is the strongest available evidence
that reporting it rather than rounding it up was the right call.

---

## L. A3 — this gate was superseded by an independent reviewer, and it was right to be

Section J of this file recorded the conflict of interest openly: DB-11 was authored by the same agent that
wrote the A2 fixes, and was run **database-first** to compensate. The independent frontend ↔ database
review commissioned afterwards (`reviews/STOCKMOK_FRONTEND_DB_INDEPENDENT_REVIEW.md`, 2026-08-17) returned
**44 findings** and the verdict `FAIL`. Its diagnosis is recorded here without softening, because this
file is where the method failed:

> *"the gate was run database-first by the author of the fixes, so it verified that every database object
> has a consumer and did not verify that every frozen UI element has a producer."*

Eleven of the reviewer's twenty-one CRITICAL/HIGH findings were frozen UI elements with no producer. This
gate's `UI_DATA_COVERAGE = 100%` was measured in the direction that could not detect them.

**What §G must stop claiming.** §G.2 cited the canonical board's post-chain *"Showing 1–17 of 17"* as
evidence for a **t₀** figure, and §G recorded `CANONICAL_UI_DATA_RECONCILIATION = PASS` over warehouse
valuations it had recomputed from product costs rather than from any declared query — the two defects that
became **F-C-03** and **F-C-02**. Both are corrected in `DB_00` §8.2–§8.3 and `DB_08` §6.5/§9. §G's
reconciliation now reads against the **two labelled states** (t₀ = 12 movements / LKR 564,200.00;
post-chain = 17 / LKR 691,700.00) and against `sum('stockValueMinor')` as the declared producer of the
`398,900.00 / 292,800.00` split.

**What §B must stop claiming.** `warehouseName`'s justification (*"the report's Warehouse column without
a join"*) is void — the field is deleted (DB-CR-027). `reservedMilli` is reclassified from
`DOMAIN_INVARIANT` to `FUTURE_PLACEHOLDER`; `storefrontCatalog/**` from `CANONICAL_SEED_REQUIRED` to
`DECLARED_INERT_SCOPE_GUARD`. Both were honest-sounding labels for things the register had no honest
class for, and inventing a class is cheaper than misfiling one.

**Counts, restated after A3.**

```
ORPHAN_UI_ELEMENTS            = 0   (22 → 0: 9 registry-only elements deleted by precedence,
                                     13 given producers)
ORPHAN_DATABASE_OBJECTS       = 0   (7 → 0)
UNSUPPORTED_FILTERS           = 0   (11 → 0)
UNSUPPORTED_ACTIONS           = 0   (1 → 0: C-37 warehouse.restore)
UNREPRESENTED_BACKEND_STATES  = 0   (5 → 0)
MISMATCHED_RBAC               = 0   (4 → 0)
MISMATCHED_CANONICAL_VALUES   = 0   (5 → 0; 2 reclassified as design-side, DB-00 §8.9)
UNDEFINED_QUERY_IDS           = 0   (1 → 0: Q-079 defined; the test's scope widened)
UNJUSTIFIED_INDEXES           = 0   (4 → 0: 2 deleted, 2 given consumers)
BROKEN_END_TO_END_WORKFLOWS   = 0   (10 → 0)
```

**The rule this gate should have carried from the start**, and now does: *a reconciliation gate must be
run in the direction the author is least able to see, by someone who did not author what it checks.*

---

## M. A3R-P — the current inventory, mechanically derived

**This section supersedes every count in §F, §I, §J, §K and §L for current-state purposes.** Those
sections are retained as the audit trail; this one is the truth an implementer builds against. Every
figure below was **counted from the normative tables** at A3R-P — DB-04 §1–§8 for queries and indexes,
DB-06 §1 for commands, DB-07 §11 for invariants, DB-07 §12 for derived contracts — not copied from a
prior summary. That distinction is the entire reason this pass exists.

```
ACTIVE_QUERY_IDS             = 92    DB-04 §1-§6 (client + aggregation) and §8 (command-internal)
ACTIVE_INDEX_IDS             = 67    DB-04 §7   IDX-01…IDX-69 less deleted IDX-03, IDX-19
ACTIVE_COMMAND_IDS           = 38    DB-06 §1   Release A/B callables (C-32 = Release C, excluded)
ACTIVE_INVARIANT_IDS         = 26    DB-07 §11  INV-01…INV-24, INV-26, INV-27
ACTIVE_DERIVED_CONTRACT_IDS  = 14    DB-07 §12  DV-01 … DV-14

UNDEFINED_QUERY_IDS          = 0     (the Q-085g tombstone is closed as Q-080)
UNDEFINED_INDEX_IDS          = 0
UNDEFINED_COMMAND_IDS        = 0
UNDEFINED_INVARIANT_IDS      = 0
UNDEFINED_DV_IDS             = 0
STALE_CURRENT_ASSERTIONS     = 0

SCREENS      53/53      TABLES 27/27     FORMS 24/24      ACTIONS 62/62
STATES       44/44      FIELDS 59/59 live (1 declared tombstone)
SECURITY TESTS  T-SEC-01 … T-SEC-41 (~71 assertions) + 12 T-XFER + 8 T-CONC
                + T-INT-03 (now asserting INV-26 and INV-27) + T-SEED-01a/01b

FRONTEND_DB_INDEPENDENT_REVIEW    = COMPLETE   (A3  — 44 findings, FAIL)
A3_ADVERSARIAL_INDEPENDENT_REVIEW = COMPLETE   (A3R — 18 findings, FAIL)
A3R_P_PROPAGATION_CLOSURE         = COMPLETE
```

**Preserved tombstones — never renumbered to make a count tidy.** `INV-25` (withdrawn, DB-CR-027) ·
`Q-011a` (deleted, DB-CR-021) · `Q-021` (replaced by `Q-021a`/`Q-021b`, DB-CR-028) · `Q-084` (replaced by
`Q-084a`/`Q-084b`, A3R-07) · `Q-049`, `Q-081`, `Q-082` (never assigned) · `Q-085g` (never a valid id —
the A3R-11 placeholder for the `C-38` guard; now `Q-080`) · `IDX-03`, `IDX-19` (deleted at A3, no
consumer) · `C-35` (split into `C-35a`/`C-35b`). A gap in a sequence is evidence; a renumbering destroys
it.

**Two counters that changed after §I recorded its zeros**, stated so §I cannot be misread as current:
`UNDEFINED_QUERY_IDS` went `3 → 0` at A2, `1 → 0` at A3 (`Q-079`) and `1 → 0` again at A3R-P (the
`Q-085g` tombstone);
`ORPHAN_UI_ELEMENTS` went `3 → 0` at A2 and then `22 → 0` at A3, because the A2 run measured in the one
direction that could not see them. Both are `0` now, and both were `0` before — which is precisely why a
zero is only as good as the direction it was measured in.
