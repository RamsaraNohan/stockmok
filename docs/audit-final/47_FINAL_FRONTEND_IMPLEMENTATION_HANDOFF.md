# 47 — Frontend Implementation Handoff (definition only — no code)

**Precondition:** OWNER GATE 2 (file 46) is APPROVED. This document defines *what Claude Code receives* after design approval. It contains **no implementation code**.

---

## 1. Design authorities handed to Claude Code
- Approved final design (chosen territory), all screens + state galleries + mobile variants.
- File 21 tokens (as the single source of styling truth) + the built component system from Design Gate 4.
- Files 02, 04, 05, 06, 07, 08, 19 as the behavioural/content/route/permission contract.
- Files 10/11 as stack/architecture constraints.
- This audit's files 38 (per-screen contract), 40 (a11y), 41 (feasibility), 43 (direction).

## 2. Screens & routes
- The 41 canonical + derived surfaces (SCREEN-001…052) mapped to routes in file 07 §2 / 19 §2.
- Route guards: PublicLayout / AuthLayout / OrgLayout / RequireRole; skeleton while unresolved; forbidden direct access → designed permission-denied; feature-flag NETWORK on/off → 404 when off.

## 3. Components
- Implement the approved component library first (buttons, inputs, field wrapper, cards, KPI, tables w/ pagination + mobile fallback, badges, tabs, stepper, modal, drawer, toast, alert, timeline, charts+text-alt, state specimens).
- Enforce `eslint-plugin-jsx-a11y` as **error**; component/data-service separation enforced by lint (NFR-011).

## 4. States (per screen)
- loading (skeleton matching final layout), empty, error, success, permission-denied, submitting, validation-error, confirmation (destructive, object-named). No centred spinner on blank page.

## 5. Mock / fixture data
- Typed fixtures using the exact §Mock dataset (Grand Ocean / Fresh Foods / Chicken Breast / CKN-B5; seed 12/4/1, 564,200; chain 18→…→120 KG). Build the entire frontend against typed fixtures **before** any real data wiring (Stage 1 below).

## 6. Tokens & responsive rules
- Tokens from file 21; breakpoints incl. `bp-390`; mobile-priority flows one-handed; no horizontal scroll on core actions; 44px targets.

## 7. Acceptance tests the frontend must satisfy
- Every P0/P1 screen renders all its states from fixtures.
- Role-filtered nav matches the RBAC matrix; permission-denied on forbidden direct routes.
- Mapping wizard: all 7 error states reachable from fixtures; Save disabled-with-reason logic correct.
- Receiving: over-receipt blocked; conversion correct; sticky confirm on mobile.
- Dashboard KPIs render the seed and deep-link to the correct filtered screens.
- No engineering copy in any rendered screen (lint/snapshot check for `FORM-`, `SCREEN-`, `/app/` in visible text).

## 8. Visual-comparison requirement
- Screenshot every implemented screen (desktop + 390px) and diff against the approved Claude Design output. Frontend visual implementation must pass this comparison **before** real data wiring begins (Stage 2 below).

## 9. Handoff gate
- [ ] Design approved (Gate 2). [ ] Tokens + components handed over. [ ] Route/permission/state contract handed over. [ ] Fixture pack ready. [ ] Acceptance tests + screenshot-comparison harness defined. → Frontend Stage 1 may begin.

---

# AMENDMENT — post complete-read pass

- **Product Mapping has EIGHT error states, not seven.** Add *buyer product archived or inactive*
  (file 11 §24: *"3. The buyer product exists, belongs to the buyer org and is `ACTIVE`."*). The mapping
  is created directly as `VERIFIED`; there is no pending-supplier-confirmation state in Release A/B.
- **Nine frozen platform constraints now bind the front end** — closed four-surface realtime list;
  25-row server pagination; sort only on indexed fields (disable non-indexed sort controls); the
  25-component cap in file 17 §5.2; the 17-package dependency freeze; never render an optimistic
  timestamp; no Delete anywhere; prefix-only single-tenant search; no offline capability. Full list and
  quotes in file 51 F-06 and in the patched file 45.
- **Component names must be checked against file 17 §5.2 before use** — that list is exhaustive
  (*"Do not design a 26th component"*).
- **CSV export has no backing command.** Any export must operate on already-fetched, `.limit()`-bounded
  rows and be labelled accordingly.
- **Define a date/time format** — file 28 supplies none. Persisted times display in the organisation
  timezone (file 18 §10).
