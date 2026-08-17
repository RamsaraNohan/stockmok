# StockFlow — Final Implementation Readiness Gate v3.0

**Review date:** 09–10 August 2026
**Authority:** the final go/no-go before UI design and implementation execution.
**Deadline:** 24 August 2026 (student-confirmed). Build window Day 1 = 10 August → Day 13 = 22 August.

---

# 1. Readiness verdict

## READY_TO_DESIGN_UI: **YES**

No unresolved conceptual blocker remains. Design must follow `03` (scope), `07` (information architecture) and `17` (execution brief), and must be **frozen at the end of Day 2**.

## READY_TO_IMPLEMENT_AFTER_UI: **YES — conditional on one Day-1 prerequisite**

The project is implementation-ready. The single remaining technical fork is the Blaze billing decision, which must be closed on Day 1 before Stage 2 begins.

---

# 2. BLOCKER-00 — coursework brief verification

## Status: **CLOSED**

The actual brief has been read in full, including the assessment criteria table and the rubric.

**Technology compatibility: PASS.** The brief lists "Java, Python, PHP, MySQL, etc." as *examples* of relevant technologies, not as a mandated stack. React + TypeScript + Firebase Authentication + Cloud Firestore satisfies every stated requirement, including the explicit "with the connection of Database".

**One point worth noting in the report:** the brief requires Create, Read, Update and **Delete**. StockFlow implements Delete as archive/deactivate and denies hard deletion at the Security Rules layer, in order to protect referential and historical integrity. This is a deliberate, defensible engineering decision and should be presented as one — with the rules that enforce it shown as evidence — rather than left for a marker to interpret as a missing feature.

---

# 3. Administrative prerequisites

| ID | Item | v2 status | v3 status |
|---|---|---|---|
| PREREQ-01 | Official deadline | OPEN — brief says TBA | **RESOLVED AS ASSUMPTION.** The student has confirmed 24 August 2026 and cannot access the DLE to re-verify. The whole plan targets completion on 22 August, leaving two days of buffer. Re-verify if DLE access is regained. |
| PREREQ-02 | Presentation | OPEN | **CLOSED.** The student has confirmed no presentation is required. The brief's reference to "submission and presentation" appears only in the feedback-timing paragraph. A demo recording is still produced as evidence. |
| PREREQ-03 | Firebase Blaze | MUST RESOLVE DAY 1 | **STILL THE ONLY TECHNICAL FORK — see §4.** |
| PREREQ-04 | AI / academic policy | OPEN | **CLOSED.** The university and module have granted permission for any tools and technologies. The brief's own-work, referencing and plagiarism requirements still apply, so the report includes a factual AI-assistance statement and a complete reference list. |

**Net position: zero conceptual blockers, zero open administrative blockers, one Day-1 technical decision.**

---

# 4. PREREQ-03 — the Blaze decision

Production Cloud Functions require the Firebase Blaze plan. Cloud Storage also requires Blaze, which is one reason Storage is not used at all.

**Preferred:** enable Blaze, set a $5 GCP budget with alerts, cap every function at `maxInstances: 10`. Expected spend is effectively zero — the Blaze no-cost tier covers two million invocations a month, orders of magnitude beyond coursework usage.

**If Blaze cannot be enabled:** do **not** compensate by opening client write access. Switch to Profile P0 in `03` §8 and `10` §16 — keep a fully secure Release A using rules-constrained client transactions with the same shared domain functions, and **cut Release B entirely**, because cross-tenant state transitions cannot meet the security contract without a trusted server.

**This must be decided on Day 1**, because it changes the shape of Stages 4 through 16. Discovering it on Day 10 would cost the project several days.

Task SF-0027 exists specifically to prove the whole deployment path works on Day 1: a throwaway callable function and the hosting site are deployed to production and called from the live URL. This twenty-minute task removes the most common catastrophic end-of-project failure.

---

# 5. Architecture readiness

| Area | Status | Note |
|---|---|---|
| Product concept | PASS | |
| Coursework fit | PASS | CRUD, database, management system, individual work all satisfied |
| Scope | **FROZEN** | Release C now default not built |
| Actors and roles | PASS | ambiguous RBAC cells resolved in `06` v3 |
| CRUD | PASS | archive-not-delete decision documented |
| Tenant model | PASS | four zones; cross-tenant zone closed to clients |
| Authentication | PASS | |
| RBAC | PASS | one shared permission table, binary matrix |
| Stock ledger | PASS | integer milli-units make reconciliation exact |
| Atomicity | PASS | transaction boundaries defined per command |
| Idempotency | PASS | receipt read inside the transaction, payload hashed |
| Private purchase orders | PASS | order-number allocation now defined |
| Connected purchase orders | PASS | canonical plus dual projections |
| Product mapping | PASS | seven-step server re-validation |
| Partner catalog | PASS | callable-only for buyers |
| Storefront boundary | PASS | not built by default |
| Audit | PASS | immutable, role-restricted, limitation stated |
| Notifications | PASS | bounded fan-out, transition-only |
| UI information architecture | PASS | missing screens added |
| Test architecture | PASS | ID collision fixed, coverage gaps closed |
| Technology stack | **FROZEN** | `10` |
| Firebase architecture | **FROZEN** | `11` |
| Implementation plan | READY | `12` |
| Task register | READY | `13`, 236 tasks |
| 13-day feasibility | **CONDITIONAL PASS** | controlled by the gates in `03` §10 and the cut ladder in `03` §9 |

---

# 6. AGENTS.md non-negotiables

The repository's `AGENTS.md` — specified in full in `15` — must contain at least these. They are reproduced here because this document is the gate that checks for them.

1. Read the final documents before coding; never work from memory or inference.
2. `03_FINAL_SCOPE_FREEZE.md` controls scope.
3. Stock quantity is never edited directly.
4. A stock change is a backend command inside a Firestore transaction, in the P1 profile.
5. Movement, Balance and ProductStockSummary are atomic.
6. Every stock and cross-tenant command carries an `operationId`; the receipt is read **inside** the transaction and the payload is hashed.
7. A buyer never writes supplier-private stock.
8. A supplier never writes buyer-private stock.
9. A client-supplied role is never authorization.
10. Admin SDK code explicitly re-checks authentication, membership, role, ownership and state.
11. Mapping resolves through the Partner Catalog projection, never the supplier's private Product.
12. Purchase-order lines snapshot identity, units, conversion and price, and are immutable afterwards.
13. Public, partner and private projections remain separate documents.
14. Audit records are immutable; client deletes are denied on every collection.
15. **A Security Rule never reads a path derived from document data.**
16. No Release D feature before submission.
17. Never weaken, skip or delete a test to make a suite pass.
18. Stop and report if a required reference is missing, conflicting or ambiguous.

Items 15 and 17 are new in v3 and are the two most likely to be violated by a well-meaning agent.

---

# 7. Backend command catalog

Thirty-two commands, enumerated with roles, release, idempotency, transaction and audit requirements in `11` §11.

v2's catalog was incomplete: it omitted `warehouse.archive`, `po.order`, `po.cancel`, `product.create`, `product.update`, `connection.disable`, `mapping.disable`, all four `partnerCatalog.*` commands, `cpo.cancel` and `org.updateSettings`. Implementing from that list would have left roughly a third of the system's write paths undefined, and each gap would have been closed ad hoc under time pressure — exactly when authorization checks get forgotten.

All commands are produced by one `defineCommand()` factory so that authentication, validation, membership, role, idempotency and audit are implemented once rather than thirty-two times.

---

# 8. UI-to-code sequence

## UI design — Days 1–2, then frozen

1. Design tokens
2. Component sheet
3. App shell
4. Dashboard, empty and populated
5. Authentication screens including all eight branded-login states
6. Inventory: list, detail, form, adjustment modal
7. Procurement: PO list, builder, detail, receiving (desktop and 390 px)
8. Team, Settings, Reports, Notifications, permission-denied, 404
9. Release B: connections, catalog, mapping wizard, connected purchase orders
10. Empty-state and error-message copy

## Implementation dependency chain

```text
Repository baseline
→ Firebase + emulators + a proven production deploy
→ Design system + public site + authentication
→ Command framework + Organization + handle reservation
→ Membership + RBAC + Security Rules
→ Product / Category / Warehouse
→ Stock ledger
→ Private partners
→ Private purchase orders
→ Receiving
→ Dashboard + reports + notifications
→ ★ RELEASE A GATE ★
→ Connections
→ Partner catalog
→ Product mapping
→ Connected purchase orders
→ ★ RELEASE B GATE ★
→ Polish + responsive + accessibility
→ Production deployment
→ Final QA + evidence
→ Report + submission
```

**Explicit prohibitions:** stock adjustment cannot begin before Product, Warehouse, Membership and the command framework exist. Receiving cannot begin before the ledger and private purchase orders exist. Connected purchase orders cannot begin before Connection, Partner Catalog, Mapping and the private purchase-order and receiving foundations exist. **No Release B work may begin before GATE-A passes** — not "mostly passes".

---

# 9. Release decision tree

```text
GATE-A green by end of Day 9?
  ├─ YES → build Release B-Lite (Days 10–12)
  │         └─ GATE-B-LITE green by end of Day 12?
  │              ├─ YES → polish, deploy, evidence, report
  │              └─ NO  → freeze the largest green subset, disable the rest in the UI,
  │                       document it as future scope, proceed to polish
  └─ NO  → CANCEL Release B. Spend Days 10–12 hardening Release A and writing the report.

Any Critical defect open in Release A → no Release B, no Release C, no exceptions.
Release C → only if every gate is green by end of Day 11 and the student explicitly
            chooses it over further hardening. Default: not built.
```

A polished, fully tested Release A scores better than a broken A + B. Cutting is a decision, not a failure, and the reasoning belongs in the reflection section.

---

# 10. UI design gate

Design may start immediately, provided the designer:

- receives `02`, `03`, `05`, `06`, `07` and `17`;
- treats `03` as the scope authority;
- does not promote Storefront or any Release D concept into Release A/B navigation;
- separates private and connected purchase orders;
- designs every mapping validation and error state;
- designs the role and membership denial states;
- keeps organization context explicit on every authenticated screen;
- delivers the states in `07` §22, not only the happy path;
- delivers the empty-state and error-message copy;
- stops at the end of Day 2.

**UI_GATE = PASS**

---

# 11. Implementation start gate

Before the first feature branch:

- [ ] Deadline position recorded (24 August 2026, student-confirmed)
- [ ] Repository initialised, public, CI green
- [ ] v3 control pack copied to `docs/final/`
- [ ] `AGENTS.md` created from `15`
- [ ] Firebase project created; **region chosen and recorded**
- [ ] **Blaze decision made and recorded**
- [ ] GCP budget alert configured and screenshotted
- [ ] Auth providers enabled (Email/Password, Google)
- [ ] Emulator Suite running on the fixed ports
- [ ] Client emulator switch and EMULATOR ribbon working
- [ ] `firestore.rules` deny-all baseline committed
- [ ] `.env.example` committed; `.env*` and credential filenames git-ignored
- [ ] `npm run verify` works end to end
- [ ] **A throwaway callable and the hosting site deployed to production and verified**
- [ ] Clean baseline commit tagged

If Blaze is unavailable, the secure P0 fallback must be documented **before** any stock or network implementation begins.

---

# 12. Submission gate

- [ ] Release A: every P0 test green
- [ ] Release B: every implemented P1 test green, or the feature removed from the UI and documented
- [ ] Zero Critical and zero High defects open
- [ ] Tenant isolation proven by automated tests
- [ ] Idempotency proven by automated tests
- [ ] Ledger reconciliation property test green
- [ ] Production URL loads and both sign-in methods work
- [ ] A full purchase-order cycle completes in production
- [ ] **The GitHub repository loads in a signed-out private window**
- [ ] The repository link appears in the report
- [ ] The live URL appears in the report
- [ ] The report is submitted to the DLE
- [ ] The source code is submitted to the DLE
- [ ] **The PDF is renamed with the index number**
- [ ] The report describes the actual technologies, problems and solutions
- [ ] References complete and checked
- [ ] AI-assistance statement included
- [ ] Turnitin / Draft Coach check completed
- [ ] The submitted artifact has been reopened and verified

---

# 13. Final control summary

```text
ACTUAL_COURSEWORK_BRIEF_READ:      YES
CONTROL_DOCUMENTS_READ:            10 / 10

CONCEPTUAL_BLOCKERS:               0
TECHNICAL_BLOCKERS:                0
ADMINISTRATIVE_BLOCKERS:           0
OPEN_ASSUMPTIONS:                  1  (deadline 24 Aug, student-confirmed, DLE unverifiable)
DAY_1_DECISIONS:                   1  (Blaze billing)

COURSEWORK_FIT:                    PASS
TECHNOLOGY_COMPATIBILITY:          PASS
DATABASE_MODEL:                    PASS
SECURITY_MODEL:                    PASS
UI_INFORMATION_ARCHITECTURE:       PASS
TEST_ARCHITECTURE:                 PASS

TECH_STACK:                        FROZEN
FIREBASE_ARCHITECTURE:             FROZEN
IMPLEMENTATION_PLAN:               READY
TASK_REGISTER:                     READY  (236 tasks)

READY_FOR_UI_DESIGN:               YES
READY_FOR_IMPLEMENTATION_AFTER_UI: YES

RECOMMENDED_SCOPE:                 A + B-LITE
                                   full B opportunistically
                                   C not built
                                   D excluded
```

---

# 14. Final verdict

StockFlow is ready to move from conceptual planning into **UI design now**, and into implementation as soon as the design is frozen at the end of Day 2.

From this point, every new question should be of the form:

> *"How do we implement and prove the frozen requirements safely before 22 August?"*

and never:

> *"What else could StockFlow become?"*

The second question is answered, in writing, in `03` §6. It is answered as **Release D**, and Release D is not built.
