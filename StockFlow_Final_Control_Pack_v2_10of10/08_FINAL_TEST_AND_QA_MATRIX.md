# StockFlow — Final Test & QA Matrix v2.0

**Status:** Submission-quality verification authority  
**Primary goal:** protect the coursework's emphasis on an error-free, high-quality system.

---

# 1. Test levels

**L1 Unit/business-rule**
- quantity;
- conversion;
- transitions;
- totals;
- stock state.

**L2 Firestore Rules**
- own-tenant access;
- cross-tenant denial;
- RBAC;
- Partner Catalog;
- audit immutability.

**L3 Backend command integration**
- adjustment;
- receipt;
- ship;
- idempotency;
- connection.

**L4 Browser E2E/manual**
- canonical user flows.

**L5 Production smoke**
- minimal post-deploy checks.

---

# 2. Priority

### P0 — submission blocker
Auth, CRUD, tenant isolation, stock integrity, private receiving, RBAC, deployment, GitHub access.

### P1 — B blocker
Connection, catalog, mapping, connected PO, idempotent ship/receive.

### P2 — polish
Optional charts/Storefront/cosmetics.

No P2 work while P0 is open.

---

# 3. Traceability

| Requirement group | Tests |
|---|---|
| FR-AUTH | AUTH-01..10 |
| FR-ORG/TEAM | ORG-01..08, RBAC/SEC |
| FR-INV | CRUD-01..12 |
| FR-STOCK | STOCK-01..12, INT-01..08 |
| FR-PART | PART-01..03 |
| FR-PO | PPO-01..12 |
| FR-NET | NET-01..14 |
| FR-CPO | CPO-01..14 |
| FR-DASH | REPORT-01..08 |
| FR-AUD | AUD-01..06 |
| SEC | SEC-01..16 |
| NFR | NFR-01..12 |
| C | SF-01..05 |

---

# 4. Authentication

| ID | Pri | Test | Expected |
|---|---|---|---|
| AUTH-01 | P0 | Email signup | user + onboarding |
| AUTH-02 | P0 | Google login | auth succeeds |
| AUTH-03 | P0 | Logout | private workspace unavailable |
| AUTH-04 | P0 | Password reset | Firebase flow; no app password |
| AUTH-05 | P0 | Invalid credential | safe error |
| AUTH-06 | P0 | Valid branded handle | correct public business identity |
| AUTH-07 | P0 | Invalid handle | safe not-found |
| AUTH-08 | P0 | Wrong requested role | denied |
| AUTH-09 | P0 | identity valid, no membership | denied |
| AUTH-10 | P0 | suspended membership | denied |

---

# 5. Organization/team

| ID | Pri | Test | Expected |
|---|---|---|---|
| ORG-01 | P0 | Create org/unused handle | org+directory+owner+settings consistent |
| ORG-02 | P0 | duplicate/concurrent handle | one succeeds |
| ORG-03 | P0 | case normalization | no FreshFoods/freshfoods ambiguity |
| ORG-04 | P0 | workspace switch | membership rechecked |
| ORG-05 | P0 | Admin removes Owner | denied |
| ORG-06 | P0 | invite matching email | membership ACTIVE |
| ORG-07 | P0 | wrong invite email | rejected |
| ORG-08 | P0 | expired/reused invite | rejected |

---

# 6. CRUD

| ID | Pri | Test | Expected |
|---|---|---|---|
| CRUD-01 | P0 | Product create | correct org |
| CRUD-02 | P0 | list/detail | correct data only |
| CRUD-03 | P0 | Product update | persists |
| CRUD-04 | P0 | Product archive | hidden active, history stays |
| CRUD-05 | P0 | duplicate SKU | rejected |
| CRUD-06 | P0 | Category CRUD | correct |
| CRUD-07 | P0 | Warehouse CRUD | correct |
| CRUD-08 | P0 | archive warehouse with stock | blocked |
| CRUD-09 | P0 | archive warehouse with open receipt dependency | blocked |
| CRUD-10 | P0 | search/filter/sort | correct bounded results |
| CRUD-11 | P0 | pagination | no obvious duplicate/missing rows |
| CRUD-12 | P0 | archived product in new PO | blocked |

---

# 7. Stock

| ID | Pri | Test | Expected |
|---|---|---|---|
| STOCK-01 | P0 | opening 18 KG | one movement + balance + summary 18 |
| STOCK-02 | P0 | +2 adjustment | 18→20 |
| STOCK-03 | P0 | valid -5 | correct outbound adjustment |
| STOCK-04 | P0 | negative-result | rejected |
| STOCK-05 | P0 | missing reason | rejected |
| STOCK-06 | P0 | direct Balance write | denied |
| STOCK-07 | P0 | Movement edit | denied |
| STOCK-08 | P0 | Movement delete | denied |
| STOCK-09 | P0 | repeat operationId | no duplicate |
| STOCK-10 | P0 | concurrent adjustments | no lost update |
| STOCK-11 | P0 | Summary vs balances | exact |
| STOCK-12 | P0 | exactly minimum | not low under `< minimum` |

---

# 8. Integrity/property tests

## INT-01 Ledger reconciliation
`sum(signed movements) == StockBalance.onHand`

## INT-02 Product total
`sum(product warehouse balances) == ProductStockSummary.onHandTotal`

## INT-03 Random valid command sequence
Reconcile after every command.

## INT-04 Replay
Same operationId for adjustment/receipt/ship → no duplicate.

## INT-05 Transaction failure rollback
No movement without balance; no balance without movement.

## INT-06 Conversion
10 PACK × 5 = 50 KG; include fractional case if supported.

## INT-07 Precision
Reject/normalize outside precision contract.

## INT-08 Time
Critical history uses server timestamp.

---

# 9. Private partners/private PO

| ID | Pri | Test | Expected |
|---|---|---|---|
| PART-01 | P0 | private supplier CRUD | pass |
| PART-02 | P0 | private buyer CRUD | pass |
| PART-03 | P0 | deactivate with history | history remains |
| PPO-01 | P0 | DRAFT private PO | pass |
| PPO-02 | P0 | zero-line → ORDERED | blocked |
| PPO-03 | P0 | bad qty | blocked |
| PPO-04 | P0 | ORDERED | no fake supplier acceptance |
| PPO-05 | P0 | receive 40/50 | PARTIALLY_RECEIVED, +40 |
| PPO-06 | P0 | final 10 | RECEIVED, +10 |
| PPO-07 | P0 | receive > outstanding | blocked |
| PPO-08 | P0 | replay receipt | no duplicate |
| PPO-09 | P0 | cancel Draft | pass |
| PPO-10 | P0 | cancel Ordered before receipt | pass |
| PPO-11 | P0 | cancel after partial receipt | blocked |
| PPO-12 | P0 | Product renamed later | PO snapshot unchanged |

---

# 10. Security

| ID | Pri | Attack | Expected |
|---|---|---|---|
| SEC-01 | P0 | unauth private read | denied |
| SEC-02 | P0 | Org A reads Org B Product | denied |
| SEC-03 | P0 | Org A writes Org B Product | denied |
| SEC-04 | P0 | Org A writes Org B Balance | denied |
| SEC-05 | P0 | forged Owner role | denied |
| SEC-06 | P0 | Storekeeper Team URL | denied |
| SEC-07 | P0 | suspended user cached UI | denied server/rules |
| SEC-08 | P0 | client creates/edits Audit | denied |
| SEC-09 | P0 | Owner deletes Audit | denied |
| SEC-10 | P1 | connected buyer reads supplier Product | denied |
| SEC-11 | P1 | connected buyer reads Partner Catalog | allowed only ACTIVE |
| SEC-12 | P1 | non-party reads shared PO | denied |
| SEC-13 | P1 | disabled connection mapping | denied |
| SEC-14 | P1 | backend called forged orgId | backend denies |
| SEC-15 | P1 | replay B command | no duplicate |
| SEC-16 | P2 | public payload | no private fields |

---

# 11. Network

| ID | Pri | Test | Expected |
|---|---|---|---|
| NET-01 | P1 | exact handle Fresh Foods | correct public result |
| NET-02 | P1 | unknown handle | safe no-result |
| NET-03 | P1 | send connection | PENDING |
| NET-04 | P1 | duplicate directional request | no duplicate |
| NET-05 | P1 | accept | ACTIVE |
| NET-06 | P1 | reject | REJECTED |
| NET-07 | P1 | buyer reads Partner Catalog | allowed |
| NET-08 | P1 | invalid SKU | no result, Save disabled |
| NET-09 | P1 | valid SKU no semantic confirm | no mapping |
| NET-10 | P1 | factor <=0 | reject |
| NET-11 | P1 | valid mapping | VERIFIED |
| NET-12 | P1 | disable connection | new mapping/PO blocked |
| NET-13 | P1 | historical mapping after disable | still readable appropriately |
| NET-14 | P1 | catalog unpublished before submit | backend rejects stale request |

---

# 12. Connected PO

| ID | Pri | Test | Expected |
|---|---|---|---|
| CPO-01 | P1 | create active mapping | DRAFT |
| CPO-02 | P1 | disabled mapping/connection | blocked |
| CPO-03 | P1 | submit | SUBMITTED, supplier sees |
| CPO-04 | P1 | accept | ACCEPTED |
| CPO-05 | P1 | reject | REJECTED |
| CPO-06 | P1 | cancel SUBMITTED | CANCELLED |
| CPO-07 | P1 | cancel ACCEPTED | blocked |
| CPO-08 | P1 | ship | supplier movement only |
| CPO-09 | P1 | buyer stock at SHIPPED | unchanged |
| CPO-10 | P1 | partial receive | buyer + converted qty |
| CPO-11 | P1 | final receive | RECEIVED |
| CPO-12 | P1 | > outstanding | blocked |
| CPO-13 | P1 | replay ship/receive | no duplicate |
| CPO-14 | P1 | later mapping/product edit | snapshot unchanged |

---

# 13. Dashboard/reports

| ID | Pri | Test | Expected |
|---|---|---|---|
| REPORT-01 | P0 | known SKU count | exact |
| REPORT-02 | P0 | known low-stock count | exact |
| REPORT-03 | P0 | open PO count | exact |
| REPORT-04 | P0 | awaiting receipt | exact |
| REPORT-05 | P0 | inventory value | reproducible |
| REPORT-06 | P0 | Stock on Hand | matches balances |
| REPORT-07 | P0 | PO report | matches POs |
| REPORT-08 | P0 | Needs Attention | links correct action |

---

# 14. Audit

| ID | Pri | Test | Expected |
|---|---|---|---|
| AUD-01 | P0 | adjustment | audit |
| AUD-02 | P0 | receipt | audit |
| AUD-03 | P0 | role change | audit |
| AUD-04 | P0 | product archive | audit |
| AUD-05 | P1 | connected PO transition | history/audit |
| AUD-06 | P1 | connection response | history/audit |

---

# 15. UI/browser

| ID | Pri | Test |
|---|---|---|
| UI-01 | P0 | full A desktop demo |
| UI-02 | P0 | login mobile |
| UI-03 | P0 | Product mobile |
| UI-04 | P0 | Receiving mobile |
| UI-05 | P0 | loading/empty/error/success P0 |
| UI-06 | P0 | direct URL permission denied |
| UI-07 | P0 | keyboard/accessibility baseline |
| UI-08 | P0 | no unhandled console errors |
| UI-09 | P1 | B-Lite browser buyer/supplier flow |
| UI-10 | P1 | role/business context visible |

---

# 16. Non-functional

| ID | Test |
|---|---|
| NFR-01 | bounded Product list |
| NFR-02 | indexes committed |
| NFR-03 | no secrets |
| NFR-04 | clean install/run |
| NFR-05 | emulator starts |
| NFR-06 | production URL loads |
| NFR-07 | production Auth works |
| NFR-08 | production tenant rules pass smoke |
| NFR-09 | seed/reset reproducible |
| NFR-10 | timezone/timestamps correct |
| NFR-11 | money/quantity display consistent |
| NFR-12 | primary responsive flows |

---

# 17. Release gates

**GATE-AUTH:** AUTH + core RBAC/security.  
**GATE-CRUD:** CRUD.  
**GATE-STOCK:** STOCK/INT with zero mismatch.  
**GATE-PRIVATE-PO:** PPO.  
**GATE-A:** all P0 green or only documented cosmetic exceptions.  
**GATE-B-LITE:** implemented NET/CPO P1 green.  

### Final security gate — no exception
- SEC-01..09;
- SEC-10 if B visible;
- direct Balance write denied;
- replay safe.

---

# 18. Defect severity

**Critical**
- data corruption;
- cross-tenant leak;
- auth bypass;
- stock mismatch;
- duplicate receipt/ship;
- production cannot load/login.

Submission blocked.

**High**
- core CRUD/PO broken;
- role restriction broken;
- materially wrong report.

Release blocked.

**Medium**
Non-critical flow defect/workaround.

**Low**
Cosmetic.

Do not destabilize code late for Low defects.

---

# 19. QA evidence

```text
docs/qa/
  test-run-release-a.md
  test-run-release-b.md
  security-rules-results.md
  production-smoke.md
  known-issues.md

docs/evidence/
  screenshots/
  demo-script.md
  architecture/
```

Record:
- date;
- commit;
- environment;
- pass/fail;
- evidence;
- unresolved defect.

---

# 20. Final regression

From clean seed:

1. signup/login;
2. business context;
3. Product CRUD;
4. opening balance;
5. adjustment;
6. private supplier;
7. private PO + partial/full receipt;
8. dashboard/report;
9. role denial;
10. tenant isolation;
11. B-Lite if visible;
12. logout/relogin;
13. production smoke;
14. GitHub access;
15. report link.

No manual Firestore console correction is allowed to make the sequence pass.
