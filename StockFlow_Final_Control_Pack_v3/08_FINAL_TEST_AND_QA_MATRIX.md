# StockFlow — Final Test & QA Matrix v3.0

**Status:** the verification authority. A release gate passes when the tests named here pass — not when the code looks finished.
**Primary purpose:** protect the coursework's explicit emphasis on an **error-free system**, which the rubric ties to half the available implementation marks.

**Material changes from v2** (recorded in `01` §6):

1. **All test IDs are now prefixed `T-`.** v2 used `SEC-01` for both a security *requirement* and a security *test*, and `NFR-01` for both a non-functional requirement and a test. That collision made the traceability matrix unusable. A migration table is in §2.
2. Coverage gaps closed: notifications, audit fields, the public site, product detail, partner selection, workspace switching, performance, and the storefront table that v2 referenced but never included.
3. Tests added for every v3 requirement.
4. Every test now names the requirement it verifies, so "tests with no requirement" and "requirements with no test" are both checkable.

---

# 1. Test levels

| Level | Scope | Tool | Runs in CI |
|---|---|---|---|
| **L1 Unit** | pure domain logic: quantity and money maths, rounding, conversion, state-machine transitions, stock-status derivation, handle normalisation, permission lookups, schema validation | Vitest | yes |
| **L2 Component** | the five components where a defect is likely and expensive | Vitest + React Testing Library | yes |
| **L3 Security Rules** | tenant isolation, RBAC, immutability, deny-by-default, projections | `@firebase/rules-unit-testing` + Firestore emulator | yes |
| **L4 Backend integration** | every command × eight cases, plus ledger property tests | Vitest + Auth/Firestore/Functions emulators | yes |
| **L5 End-to-end** | eight canonical browser flows | Playwright (Chromium) against emulators | yes |
| **L6 Exploratory / regression** | role walkthroughs, responsive, evidence capture | Antigravity + manual | no |
| **L7 Production smoke** | post-deployment verification against the live system | manual checklist | no |

**Coverage targets:** 100 % statements in `packages/shared` · every command covered at L4 · every threat-model row covered at L3 · every P0 acceptance scenario covered at L4 or L5.

---

# 2. Test-ID migration from v2

| v2 id | v3 id | Why |
|---|---|---|
| `AUTH-nn` | `T-AUTH-nn` | consistency |
| `ORG-nn` | `T-ORG-nn` | consistency |
| `CRUD-nn` | `T-CRUD-nn` | consistency |
| `STOCK-nn` | `T-STOCK-nn` | consistency |
| `INT-nn` | `T-INT-nn` | consistency |
| `PART-nn` | `T-PART-nn` | consistency |
| `PPO-nn` | `T-PPO-nn` | consistency |
| `NET-nn` | `T-NET-nn` | consistency |
| `CPO-nn` | `T-CPO-nn` | consistency |
| `REPORT-nn` | `T-REPORT-nn` | consistency |
| `AUD-nn` | `T-AUD-nn` | consistency |
| `UI-nn` | `T-UI-nn` | consistency |
| **`SEC-nn`** | **`T-SEC-nn`** | **collided with security requirements `SEC-001..020` in `02` §7 and `06`** |
| **`NFR-nn`** | **`T-NFR-nn`** | **collided with non-functional requirements `NFR-001..020` in `02` §5** |
| `SF-nn` | `T-SF-nn` | also disambiguates from task ids `SF-0001…` in `13` |
| — | `T-NOTIFY-nn` | new group; v2 had no notification tests |
| — | `T-PERF-nn` | new group; v2 had no performance tests despite the rubric naming performance |

Requirement IDs are unchanged. Task IDs use `SF-nnnn`; test IDs use `T-GROUP-nn`. The three namespaces no longer overlap.

---

# 3. Priority

**P0 — submission blocker.** Authentication, CRUD, tenant isolation, stock integrity, private receiving, RBAC, dashboard reconciliation, deployment, GitHub access.

**P1 — Release B blocker.** Connections, partner catalog, mapping, connected purchase orders, cross-tenant denial, idempotent ship and receive.

**P2 — polish.** Charts, storefront, cosmetics.

**No P2 work may start while a P0 test is failing.**

---

# 4. Requirement → test traceability

| Requirement group | Tests |
|---|---|
| FR-AUTH-001..012 | T-AUTH-01..14 |
| FR-ORG-001..013 | T-ORG-01..12 |
| FR-TEAM-001..011 | T-ORG-05..12, T-SEC-05..07 |
| FR-INV-001..014 | T-CRUD-01..16 |
| FR-STOCK-001..017 | T-STOCK-01..15, T-INT-01..08 |
| FR-PART-001..007 | T-PART-01..05 |
| FR-PO-001..013 | T-PPO-01..14 |
| FR-NET-001..020 | T-NET-01..16 |
| FR-CPO-001..017 | T-CPO-01..17 |
| FR-DASH-001..009 | T-REPORT-01..10 |
| FR-NOTIFY-001..004 | T-NOTIFY-01..05 |
| FR-AUD-001..006 | T-AUD-01..07 |
| FR-SF-001..005 | T-SF-01..05 |
| SEC-001..020 | T-SEC-01..23 |
| NFR-001..020 | T-NFR-01..14, T-UI-01..12, T-PERF-01..04 |
| BR-001..025 | T-INT-01..08, T-STOCK-*, T-CPO-*, T-SEC-* |
| INV-01..21 | T-INT-01..08, T-CPO-08..13, T-ORG-11, T-SEC-19 |

---

# 5. Authentication — T-AUTH

| ID | Pri | Test | Expected | Req |
|---|---|---|---|---|
| T-AUTH-01 | P0 | email sign-up | user created, routed to onboarding | FR-AUTH-002 |
| T-AUTH-02 | P0 | Google sign-in | authenticates via popup | FR-AUTH-003 |
| T-AUTH-03 | P0 | sign-out | private workspace unreachable; query cache cleared | FR-AUTH-004 |
| T-AUTH-04 | P0 | password reset | Firebase flow completes; no application password stored | FR-AUTH-005 |
| T-AUTH-05 | P0 | invalid credential | one neutral message | FR-AUTH-011 |
| T-AUTH-06 | P0 | valid branded handle | correct public identity rendered pre-auth | FR-AUTH-007 |
| T-AUTH-07 | P0 | unknown handle | safe not-found | FR-AUTH-007 |
| T-AUTH-08 | P0 | wrong requested role | denied; correct role offered | FR-AUTH-008, FR-AUTH-010 |
| T-AUTH-09 | P0 | valid identity, no membership | denied with an explanation | FR-AUTH-009 |
| T-AUTH-10 | P0 | suspended membership | denied | FR-TEAM-004 |
| T-AUTH-11 | P0 | **(new)** unregistered email at login | same neutral message as a wrong password | FR-AUTH-011 |
| T-AUTH-12 | P0 | **(new)** zero memberships after login | routed to onboarding | FR-AUTH-006 |
| T-AUTH-13 | P0 | **(new)** exactly one membership | routed straight to that workspace | FR-AUTH-006 |
| T-AUTH-14 | P0 | **(new)** first authenticated render | `users/{uid}` created idempotently; a second render creates nothing new | FR-AUTH-012 |

---

# 6. Organization and team — T-ORG

| ID | Pri | Test | Expected | Req |
|---|---|---|---|---|
| T-ORG-01 | P0 | create with an unused handle | organization, directory, reservation, owner, settings, mirror and warehouse all consistent | FR-ORG-001..006 |
| T-ORG-02 | P0 | **concurrent** duplicate handle | exactly one succeeds; the other gets `HANDLE_TAKEN`; no orphan document | BR-017 |
| T-ORG-03 | P0 | case normalisation | `FreshFoods` and `freshfoods` cannot coexist | FR-ORG-005 |
| T-ORG-04 | P0 | workspace switch | membership re-validated; no data from the previous organization visible | FR-ORG-010 |
| T-ORG-05 | P0 | Admin attempts to modify the Owner | denied | FR-TEAM-007 |
| T-ORG-06 | P0 | invite accepted with a matching email | membership ACTIVE; mirror written | FR-TEAM-003 |
| T-ORG-07 | P0 | invite accepted with the wrong email | rejected, `INVITE_EMAIL_MISMATCH` | FR-TEAM-003 |
| T-ORG-08 | P0 | expired or reused invite | rejected with distinct reasons | FR-TEAM-010 |
| T-ORG-09 | P0 | **(new)** reserved handle (`app`, `store`, `b`) | rejected at validation | FR-ORG-012 |
| T-ORG-10 | P0 | **(new)** invalid handle (2 chars, trailing hyphen, symbols) | rejected | FR-ORG-005 |
| T-ORG-11 | P0 | **(new)** membership mirror agrees with the membership after every team command | exact match | INV-20 |
| T-ORG-12 | P0 | **(new)** accepting an invite while already ACTIVE | idempotent success, no duplicate | FR-TEAM-011 |

---

# 7. CRUD — T-CRUD

| ID | Pri | Test | Expected | Req |
|---|---|---|---|---|
| T-CRUD-01 | P0 | product create | stored under the correct organization | FR-INV-001 |
| T-CRUD-02 | P0 | list and detail | only that organization's data | FR-INV-007, FR-INV-012 |
| T-CRUD-03 | P0 | product update | persists; audit written for cost changes | FR-INV-001 |
| T-CRUD-04 | P0 | product archive | hidden from active lists; history intact | FR-INV-008 |
| T-CRUD-05 | P0 | duplicate SKU | rejected | FR-INV-004 |
| T-CRUD-06 | P0 | category CRUD | correct, role-gated | FR-INV-002 |
| T-CRUD-07 | P0 | warehouse create/update | correct, role-gated | FR-INV-003 |
| T-CRUD-08 | P0 | archive a warehouse holding stock | blocked | FR-INV-010 |
| T-CRUD-09 | P0 | archive a warehouse with an open receipt | blocked | FR-INV-011 |
| T-CRUD-10 | P0 | search, filter, sort | correct bounded results | FR-INV-007 |
| T-CRUD-11 | P0 | pagination across pages | no duplicate or missing rows | NFR-003 |
| T-CRUD-12 | P0 | archived product in a new PO or mapping | blocked | FR-INV-009 |
| T-CRUD-13 | P0 | **concurrent** duplicate SKU creation | exactly one succeeds | FR-INV-004 |
| T-CRUD-14 | P0 | **(new)** SKU changed on update | old index removed, new created, uniqueness still holds | FR-INV-004 |
| T-CRUD-15 | P0 | **(new)** purchase cost changed | `stockValueMinor` recomputed in the same transaction | FR-INV-013, INV-18 |
| T-CRUD-16 | P0 | **(new)** archive a warehouse while stock is added concurrently | the in-transaction check still blocks it | FR-INV-014 |

---

# 8. Stock — T-STOCK

| ID | Pri | Test | Expected | Req |
|---|---|---|---|---|
| T-STOCK-01 | P0 | opening balance 18 KG | one movement, balance 18, summary 18, value 22,500 | FR-STOCK-014 |
| T-STOCK-02 | P0 | +2 adjustment | 18 → 20; status LOW → IN_STOCK | FR-STOCK-006 |
| T-STOCK-03 | P0 | valid −5 | correct outbound movement | FR-STOCK-006 |
| T-STOCK-04 | P0 | adjustment producing a negative result | rejected | FR-STOCK-008 |
| T-STOCK-05 | P0 | adjustment with no reason | rejected | FR-STOCK-006 |
| T-STOCK-06 | P0 | direct client write to a balance | denied by rules | BR-002 |
| T-STOCK-07 | P0 | movement edit | denied | BR-003 |
| T-STOCK-08 | P0 | movement delete | denied | BR-003, INV-21 |
| T-STOCK-09 | P0 | repeat the same `operationId`, same payload | stored result returned, no duplicate | FR-STOCK-012 |
| T-STOCK-10 | P0 | concurrent adjustments | no lost update; N × +1 gives exactly +N | BR-004 |
| T-STOCK-11 | P0 | summary versus balances | exact agreement | INV-04 |
| T-STOCK-12 | P0 | exactly at the minimum | **not** low (strict `<`) | FR-STOCK-009 |
| T-STOCK-13 | P0 | **(new)** repeat `operationId` with a different payload | rejected, `OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD` | FR-STOCK-012 |
| T-STOCK-14 | P0 | **(new)** `minimumStock = 0` | never LOW_STOCK | FR-STOCK-009 |
| T-STOCK-15 | P0 | **(new)** negative result in one warehouse while another has surplus | rejected — the rule is per warehouse | FR-STOCK-008 |

---

# 9. Integrity and property tests — T-INT

| ID | Pri | Test | Expected |
|---|---|---|---|
| T-INT-01 | P0 | ledger reconciliation | `sum(signed movements) == StockBalance.onHandMilli` **exactly**, for every product-warehouse pair |
| T-INT-02 | P0 | product total | `sum(product balances) == ProductStockSummary.onHandMilli` |
| T-INT-03 | P0 | **randomised command sequence** | several hundred random valid commands across products and warehouses, with random replays; T-INT-01 and T-INT-02 asserted after **every** command |
| T-INT-04 | P0 | replay | the same `operationId` on adjust, receive or ship produces no duplicate |
| T-INT-05 | P0 | transaction rollback | an induced failure leaves no movement without a balance update, and no balance update without a movement |
| T-INT-06 | P1 | conversion | 10 PACK × 5 = 50 KG; fractional and rounding-boundary cases; total received never drifts from the ordered quantity |
| T-INT-07 | P0 | precision | quantities beyond 3 decimals are rejected or normalised consistently; no floating-point drift after 1,000 movements of 0.001 |
| T-INT-08 | P0 | server time | every critical history record uses a server timestamp; a manipulated client clock changes nothing |

**T-INT-03 is the single most valuable test in the project.** If it is green, the central claim of the system is proven.

---

# 10. Private partners and purchase orders — T-PART, T-PPO

| ID | Pri | Test | Expected | Req |
|---|---|---|---|---|
| T-PART-01 | P0 | private supplier CRUD | passes, role-gated | FR-PART-001 |
| T-PART-02 | P0 | private buyer CRUD | passes | FR-PART-002 |
| T-PART-03 | P0 | deactivate with history | history remains | FR-PART-005 |
| T-PART-04 | P0 | **(new)** deactivated supplier in a new PO | not selectable | FR-PART-004 |
| T-PART-05 | P0 | **(new)** Private and Connected are visually distinct | badge and identity block differ | FR-PART-006 |
| T-PPO-01 | P0 | create a private draft | passes | FR-PO-001 |
| T-PPO-02 | P0 | order a zero-line PO | blocked | FR-PO-002 |
| T-PPO-03 | P0 | zero or negative quantity | blocked | FR-PO-002 |
| T-PPO-04 | P0 | mark ordered | no in-platform supplier acceptance shown | BR-019 |
| T-PPO-05 | P0 | receive 40 of 50 | PARTIALLY_RECEIVED, +40 | FR-PO-006 |
| T-PPO-06 | P0 | receive the final 10 | RECEIVED, +10 | FR-PO-006 |
| T-PPO-07 | P0 | receive more than outstanding | blocked | FR-PO-007 |
| T-PPO-08 | P0 | replay a receipt | no duplicate stock | FR-PO-009 |
| T-PPO-09 | P0 | cancel a draft | passes | FR-PO-004 |
| T-PPO-10 | P0 | cancel an ordered PO before any receipt | passes | FR-PO-004 |
| T-PPO-11 | P0 | cancel after a partial receipt | blocked | FR-PO-004 |
| T-PPO-12 | P0 | product renamed after ordering | PO snapshot unchanged | BR-012 |
| T-PPO-13 | P0 | **(new)** concurrent ordering | order numbers unique | FR-PO-012 |
| T-PPO-14 | P0 | **(new)** archived product added to a draft then ordered | blocked at ordering | FR-INV-009 |

---

# 11. Security — T-SEC

The complete list is in `06` §17 and is reproduced there with expected outcomes. Summary: **T-SEC-01 … T-SEC-23**, all P0 except T-SEC-10..15 which are P1 (Release B). Approximately 45 individual assertions across the rules and integration suites.

**No exception is permitted at the final security gate.**

---

# 12. Network — T-NET

| ID | Pri | Test | Expected | Req |
|---|---|---|---|---|
| T-NET-01 | P1 | exact handle lookup | correct public result | FR-NET-002 |
| T-NET-02 | P1 | unknown handle | safe no-result | FR-NET-002 |
| T-NET-03 | P1 | send a connection request | PENDING; supplier notified | FR-NET-004 |
| T-NET-04 | P1 | duplicate directional request | no duplicate document | FR-NET-006 |
| T-NET-05 | P1 | accept | ACTIVE in both projections | FR-NET-005 |
| T-NET-06 | P1 | reject | REJECTED | FR-NET-005 |
| T-NET-07 | P1 | buyer reads the partner catalog | allowed through the callable only | FR-NET-009 |
| T-NET-08 | P1 | invalid SKU | no result; Save disabled | FR-NET-010 |
| T-NET-09 | P1 | valid SKU without semantic confirmation | no mapping created | FR-NET-012 |
| T-NET-10 | P1 | factor ≤ 0 | rejected | FR-NET-013 |
| T-NET-11 | P1 | valid mapping | VERIFIED, storing stable ids | FR-NET-014..016 |
| T-NET-12 | P1 | disable a connection | new mapping and new PO blocked | FR-NET-018 |
| T-NET-13 | P1 | historical mapping after disable | still readable | INV-15 |
| T-NET-14 | P1 | catalog item unpublished before submit | backend rejects the stale request | FR-NET-015 |
| T-NET-15 | P1 | **(new)** self-connection | rejected | FR-NET-020 |
| T-NET-16 | P1 | **(new)** publishing with an order unit ≠ supplier base unit | rejected | FR-NET-019, INV-17 |

---

# 13. Connected purchase orders — T-CPO

| ID | Pri | Test | Expected | Req |
|---|---|---|---|---|
| T-CPO-01 | P1 | create with an active mapping | DRAFT in the buyer tenant only | FR-CPO-001 |
| T-CPO-02 | P1 | disabled mapping or connection | blocked | FR-CPO-001 |
| T-CPO-03 | P1 | submit | SUBMITTED; canonical + both projections written | FR-CPO-005, INV-19 |
| T-CPO-04 | P1 | accept | ACCEPTED | FR-CPO-003 |
| T-CPO-05 | P1 | reject | REJECTED | FR-CPO-003 |
| T-CPO-06 | P1 | cancel while SUBMITTED | CANCELLED | FR-CPO-004 |
| T-CPO-07 | P1 | cancel after ACCEPTED | blocked | FR-CPO-004 |
| T-CPO-08 | P1 | ship | supplier movement only | INV-10 |
| T-CPO-09 | P1 | buyer stock at SHIPPED | unchanged | FR-CPO-009 |
| T-CPO-10 | P1 | partial receive | buyer movement with the converted quantity | FR-CPO-011 |
| T-CPO-11 | P1 | final receive | RECEIVED | FR-CPO-011 |
| T-CPO-12 | P1 | receive more than outstanding | blocked | INV-12 |
| T-CPO-13 | P1 | replay ship or receive | no duplicate | FR-CPO-012 |
| T-CPO-14 | P1 | later mapping or product edit | snapshot unchanged | INV-09 |
| T-CPO-15 | P1 | **(new)** buyer draft visibility | invisible to the supplier before submission | FR-CPO-015 |
| T-CPO-16 | P1 | **(new)** projection agreement | canonical and both projections identical on status and quantities after every transition | INV-19 |
| T-CPO-17 | P1 | **(new)** conversion drift | supplier-unit outstanding tracking prevents drift across partial receipts | FR-CPO-017 |

---

# 14. Dashboard and reports — T-REPORT

| ID | Pri | Test | Expected | Req |
|---|---|---|---|---|
| T-REPORT-01 | P0 | SKU count | exactly 12 against the canonical seed | FR-DASH-001 |
| T-REPORT-02 | P0 | low-stock count | exactly 4 at t₀, 3 after the +2 adjustment | FR-DASH-001 |
| T-REPORT-03 | P0 | open PO count | exact | FR-DASH-001 |
| T-REPORT-04 | P0 | awaiting receipt | exact | FR-DASH-001 |
| T-REPORT-05 | P0 | inventory value | LKR 564,200.00 at t₀; moves correctly after each demo step | FR-DASH-009 |
| T-REPORT-06 | P0 | Stock-on-Hand report | matches the balances exactly | FR-DASH-004 |
| T-REPORT-07 | P0 | Purchase-Order report | matches the purchase orders | FR-DASH-005 |
| T-REPORT-08 | P0 | Needs Attention links | each lands on the correct filtered screen | FR-DASH-002 |
| T-REPORT-09 | P0 | **(new)** no editable KPI document exists | asserted by rules and by inspection | FR-DASH-007 |
| T-REPORT-10 | P0 | **(new)** out-of-stock count | exactly 1 at t₀ | FR-STOCK-010 |

---

# 15. Notifications — T-NOTIFY *(entirely new; v2 had none)*

| ID | Pri | Test | Expected | Req |
|---|---|---|---|---|
| T-NOTIFY-01 | P0 | product crosses into LOW_STOCK | exactly one notification to Owner, Admin and Inventory Manager | FR-NOTIFY-001 |
| T-NOTIFY-02 | P0 | further writes while still low | **no** additional notification | FR-STOCK-017 |
| T-NOTIFY-03 | P1 | connection and connected-PO transitions | counterparty roles notified | FR-NOTIFY-002 |
| T-NOTIFY-04 | P0 | mark as read | only the `read` field may change; any other change denied | SEC-006 |
| T-NOTIFY-05 | P0 | cross-user access | a user cannot read another user's notifications | SEC-002 |

---

# 16. Audit — T-AUD

| ID | Pri | Test | Expected | Req |
|---|---|---|---|---|
| T-AUD-01 | P0 | adjustment | audit written | FR-AUD-002 |
| T-AUD-02 | P0 | receipt | audit written | FR-AUD-002 |
| T-AUD-03 | P0 | role change | audit written | FR-AUD-002 |
| T-AUD-04 | P0 | product archive | audit written | FR-AUD-002 |
| T-AUD-05 | P1 | connected PO transition | history and audit in both organizations | FR-AUD-003, FR-AUD-006 |
| T-AUD-06 | P1 | connection response | history and audit in both organizations | FR-AUD-003 |
| T-AUD-07 | P0 | **(new)** audit field completeness | actor, role, organization, action, entity type and id, operation reference, summary, server timestamp all present | FR-AUD-004 |

---

# 17. UI and browser — T-UI

| ID | Pri | Test | Req |
|---|---|---|---|
| T-UI-01 | P0 | full Release A desktop demo, end to end | NFR-005 |
| T-UI-02 | P0 | login at 390 px | NFR-001 |
| T-UI-03 | P0 | product list and detail at 390 px | NFR-001 |
| T-UI-04 | P0 | receiving at 390 px | NFR-001 |
| T-UI-05 | P0 | loading, empty, error, success and denied on every P0 screen | NFR-002 |
| T-UI-06 | P0 | direct-URL access to a forbidden route | NFR-002, BR-015 |
| T-UI-07 | P0 | keyboard and accessibility baseline: full task completion without a mouse; focus visible and restored after dialogs | NFR-016 |
| T-UI-08 | P0 | no unhandled console error on the canonical flow | NFR-015 |
| T-UI-09 | P1 | Release B-Lite buyer and supplier browser flow | — |
| T-UI-10 | P0 | business and role context visible on every authenticated screen | FR-ORG-008 |
| T-UI-11 | P0 | **(new)** public home page renders and describes only built features | FR-AUTH-001 |
| T-UI-12 | P0 | **(new)** workspace switching between two organizations | FR-ORG-009, FR-ORG-010 |

---

# 18. Non-functional — T-NFR

| ID | Pri | Test | Req |
|---|---|---|---|
| T-NFR-01 | P0 | product list is bounded and paginated | NFR-003 |
| T-NFR-02 | P0 | every required index is committed and deployed; no runtime missing-index error | NFR-004 |
| T-NFR-03 | P0 | no secret in the repository (`gitleaks` clean) | NFR-012 |
| T-NFR-04 | P0 | clean clone installs, builds and runs from the README | NFR-013 |
| T-NFR-05 | P0 | emulator suite starts and all tests run against it | — |
| T-NFR-06 | P0 | production URL loads with no console error | NFR-005 |
| T-NFR-07 | P0 | production authentication works for both providers | NFR-005 |
| T-NFR-08 | P0 | production rules smoke: a signed-out client is denied private reads | SEC-012 |
| T-NFR-09 | P0 | seed and reset reproduce the canonical dataset exactly | NFR-014 |
| T-NFR-10 | P0 | timestamps and timezone display are correct | NFR-006 |
| T-NFR-11 | P0 | money and quantity display are consistent everywhere | NFR-007, NFR-008 |
| T-NFR-12 | P0 | the six priority flows are responsive | NFR-001 |
| T-NFR-13 | P0 | **(new)** CI runs typecheck, lint, all test levels, build and secret scan on every push | NFR-018 |
| T-NFR-14 | P0 | **(new)** no dependency outside the allow-list; no upgrade after Day 9 | NFR-020 |

---

# 19. Performance — T-PERF *(entirely new; the rubric names performance explicitly)*

| ID | Pri | Test | Target | Req |
|---|---|---|---|---|
| T-PERF-01 | P0 | Lighthouse on the public home page and the dashboard | Performance ≥ 90, Accessibility ≥ 90 | NFR-017 |
| T-PERF-02 | P0 | production bundle analysis | initial JS < 350 kB gzipped; charts lazy-loaded | NFR-017 |
| T-PERF-03 | P0 | Firestore read count per screen | dashboard ≤ 12; product list ≤ 27 | NFR-003, NFR-017 |
| T-PERF-04 | P2 | command latency on the warmed production deployment | typical stock command < 1.5 s round trip | — |

Each result is recorded with its method and date in `docs/evidence/performance/`. Numbers with a method are evidence; adjectives are not.

---

# 20. Storefront — T-SF *(Release C only; v2 referenced these tests but never defined them)*

| ID | Pri | Test | Expected |
|---|---|---|---|
| T-SF-01 | P2 | public read of the storefront catalog | allowed, unauthenticated |
| T-SF-02 | P2 | publish | copies only allow-listed fields |
| T-SF-03 | P2 | any client write | denied |
| T-SF-04 | P2 | payload inspection | contains exactly the permitted key set |
| T-SF-05 | P2 | availability | coarse state only, never a quantity |

---

# 21. Release gates

| Gate | Condition |
|---|---|
| **GATE-AUTH** | T-AUTH-01..14 and T-SEC-01..09 green |
| **GATE-CRUD** | T-CRUD-01..16 green |
| **GATE-STOCK** | T-STOCK-01..15 and T-INT-01..08 green with **zero** reconciliation mismatch |
| **GATE-PRIVATE-PO** | T-PPO-01..14 green |
| **GATE-A** | **every P0 test green**, or only documented cosmetic exceptions; zero Critical, zero High |
| **GATE-B-LITE** | every implemented P1 test green; anything not green removed from the UI and documented |
| **FINAL SECURITY GATE** | T-SEC-01..23, direct balance write denied, replay safe, catch-all denial verified — **no exceptions** |
| **DEPLOYMENT GATE** | T-NFR-06..09 green against production |
| **SUBMISSION GATE** | the checklist in `09` §11 fully ticked |

---

# 22. Defect severity

**Critical — submission blocked.** Data corruption · cross-tenant leak · authentication or authorization bypass · stock mismatch · duplicate receipt or shipment · production will not load or authenticate · repository inaccessible to evaluators.

**High — release blocked.** A core CRUD or purchase-order flow broken · a role restriction not enforced · a materially wrong report or KPI · a command that is not idempotent.

**Medium.** A non-critical flow defect with a workaround.

**Low.** Cosmetic.

**Do not destabilise the codebase after Day 12 for a Low defect.** Record it in `known-issues.md` and say so honestly in the report — a stated known limitation reads as engineering maturity; an unstated one reads as an undetected bug.

---

# 23. QA evidence structure

```text
docs/qa/
  test-run-release-a.md      date, commit, environment, results, open issues
  test-run-release-b.md
  security-rules-results.md
  review-s3.md  review-s4.md  review-s6.md  review-s15.md
  review-release-a.md  review-release-b.md
  role-walkthrough.md
  responsive.md
  state-audit.md
  production-smoke.md
  final-regression.md
  known-issues.md
  gate-a.md  freeze.md

docs/evidence/
  screenshots/stage-NN/
  performance/
  architecture/
  tests/
  demo/
```

Every record carries date, commit hash, environment, pass/fail, evidence path and any unresolved defect. A test result without a commit hash is not evidence.

---

# 24. Final regression

Run from a clean seed against **production**, immediately before submission.

1. Sign up and sign in.
2. Business context and role visible.
3. Product CRUD — create, read, update, archive.
4. Opening balance.
5. Adjustment with movement history.
6. Private supplier.
7. Private PO with partial then full receipt.
8. Dashboard and both reports reconcile against the seed table.
9. Role denial by direct URL.
10. Tenant isolation evidence.
11. Release B-Lite round trip, if built.
12. Logout and re-login.
13. Production smoke checklist.
14. GitHub repository loads while signed out.
15. Repository link and live URL present in the report.

**No manual Firestore console correction is permitted at any point.** If one is needed, the run has failed.

---

# 25. Testing philosophy

The tests are not a formality attached to the end of the build; they are the evidence that the system is error-free, and the rubric pays for exactly that. Three tests carry more weight than all the others combined:

- **T-INT-03** — the randomised ledger property test, which proves the data model is sound.
- **T-SEC-02/03/04/10** — cross-tenant denial, which proves the multi-tenancy claim.
- **T-STOCK-09/13** — replay safety, which proves the system is correct under real-world network conditions.

If those are green and demonstrable, the central engineering claims of the project are proven rather than asserted.
