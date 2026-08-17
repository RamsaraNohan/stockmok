# 54 — AUDIT_ISSUE → CLAUDE_DESIGN_PROMPT_COVERAGE

File 45 re-read in full (103 lines). Every BLOCKER, HIGH and owner-approved decision mapped.
`SUFFICIENT` means the prompt states the requirement precisely enough that a designer who reads
only file 45 will get it right.

## BLOCKERS

| ISSUE-ID | COVERED_IN_FILE_45 | PROMPT_SECTION | SUFFICIENT | Action |
|---|---|---|---|---|
| DI-001 Mapping wizard undesigned | YES | Gate 2 §7, Gate 5 signature, Gate 7 | **NO** — says *"all **seven** error states"*; file 11 §24 requires **eight**. No "created directly as VERIFIED / no pending-confirmation state" rule. Lookup is a callable with a 1–3 s cold start, not per-keystroke. | **PATCHED** |
| DI-002a Brand burn-in (specification defect) | NO | — | **NO** — file 45 bans engineering copy but the burn-in is *ordered by file 26*; unless file 26 is amended the defect regenerates. | **PATCHED + ACR-003** |
| DI-002b Engineering copy on 69 screens | YES | Non-negotiable constraints §3 | **NO** — ban list omits the three panel patterns actually observed (*"Canonical data"*, *"Exact source data"*, *"Fields"*), spec-sentences-as-**button-labels**, role-token leakage (`anyone`, `Inventory Manager \| Viewer`) and a11y-implementation copy (*"table alternative"*, *"Focus trapped · Esc closes"*). | **PATCHED** |
| DI-003 Desktop receiving scaffold | YES | Gate 2 §6, Gate 5 signature | **YES** | none |
| **DI-B04** Unauthorised generation method | NO | — | **NO** — process-level; belongs in ACR, not the design prompt. | **ACR-004** |
| **DI-B05** File 26 specifies the burn-in | NO | — | **NO** — see DI-002a. | **ACR-003** |

## HIGH

| ISSUE-ID | COVERED | SECTION | SUFFICIENT | Action |
|---|---|---|---|---|
| DI-004 Inventory CRUD forms scaffold | YES | Gate 5 | YES (scope narrowed — 042 removed) | none |
| DI-006 Network lane scaffold | YES | Gate 5 | **NO** — "incoming-request prominence" would need a **fifth realtime surface**, which is forbidden; discovery must be exact-handle only; privacy strings COPY-415/416 unnamed. | **PATCHED** |
| DI-008 Private vs Connected too subtle | YES | Gate 5 bullet 2 | YES | none |
| DI-009 App shell shows spec anatomy | YES | Gate 4/5 | **NO** — no requirement to reserve the amber `EMULATOR` ribbon; no rule that org monogram + name + role stay visible on **every** org-scoped screen. | **PATCHED** |
| DI-010 Reports shell scaffold | YES | Gate 5 | **NO** — CSV export has **no backing command** (none of C-01…C-32); every query is `.limit()`-bounded. | **PATCHED** |
| DI-011 Table truncation (escalated) | YES | Gate 4 (*"no truncated headers"*) | **NO** — values truncate too; sorting is indexed-only and non-indexed sort controls must render **disabled**; pagination is fixed at 25. | **PATCHED** |
| **DI-021** 6 of 12 SKUs rendered | NO | — | NO | **PATCHED** |
| **DI-022** No timestamps / no date-time standard | NO | — | NO | **PATCHED** |
| **DI-023** Tenant-context errors | NO | — | NO | **PATCHED** |
| **DI-025** Report warehouse misattribution | NO | — | NO | **PATCHED** |
| **DI-028** STATE-008 arithmetic error | PARTIAL | Gate 8 reconciliation check | NO — the specific error is not named | **PATCHED** |
| **DI-033** COMP-001 draws no buttons | PARTIAL | Gate 4 | NO — no "every component sheet must draw specimens, never name states in text" rule | **PATCHED** |
| File 32/33 blanket APPROVED violates file 30 §5 | NO | — | NO — process finding | **ACR-004** |

## MEDIUM / LOW with design impact

| ISSUE-ID | COVERED | SUFFICIENT | Action |
|---|---|---|---|
| DI-012 multiple co-equal primaries | YES (Gate 4 *"one primary rule"*) | YES | none |
| DI-013 five dashboards → one adaptive | YES (Gate 5) | **NO** — dashboard is capped at **≤12 Firestore reads**; a sixth KPI or second eager chart breaks the budget | **PATCHED** |
| DI-014 state boards are text | YES (Gate 7) | **NO** — the skeleton/icon/action rules are not stated | **PATCHED** |
| DI-016 placeholder-as-label | YES (a11y baseline) | YES | none |
| DI-017 public hero uses the glyph | YES (Gate 2 §1) | YES | none |
| DI-018 timelines are stubs | YES (Gate 2 §8, Gate 4) | **NO** — must render **server-committed** times only; never an optimistic timestamp | **PATCHED** |
| DI-019 showcase boards | YES (Gate 7) | YES | none |
| DI-020 board captions | YES | **NO** — must record that captions are *legitimate* on BOARD/REVIEW artefacts | **PATCHED** |
| DI-024 `—` timestamps / "Seed snapshot" | NO | NO | **PATCHED** (with DI-022) |
| DI-026 SKU/category drift | NO | NO | **PATCHED** (with DI-021) |
| DI-027 SCREEN-010 wrong demo state | NO | NO | **PATCHED** |
| DI-029 role-token leakage | NO | NO | **PATCHED** (with DI-002b) |
| DI-030 a11y-implementation copy | NO | NO | **PATCHED** (with DI-002b) |
| DI-031 MOBILE-011 vs SCREEN-043 duplicate | NO | NO | **PATCHED** |
| DI-032 token contradictions | NO | NO | **PATCHED** |
| DI-034 missing-glyph icons | NO | NO | **PATCHED** (with DI-014) |
| DI-036 shell inconsistency | PARTIAL (Gate 8) | NO | **PATCHED** (with DI-009) |
| DI-037 non-encoding bars | NO | NO | **PATCHED** |
| DI-040 numeric overflow | NO | NO | **PATCHED** |

## OWNER-APPROVED DECISIONS

| ISSUE-ID | COVERED_IN_FILE_45 | PROMPT_SECTION | SUFFICIENT |
|---|---|---|---|
| DI-O1 / ACR-002 brand glyph | YES | Gate 0 (*"do not resolve these; note them"*) | **YES** — and file 52 §4 now supplies an independent letterform read for the owner |
| DI-O2 / ACR-001 audit-log screen | YES | Gate 0, notes §101 | **YES** — cost basis corrected in file 49 (no new collection/command/rule/index) |
| **ACR-003** amend file 26 (burn-in) | NO → **added to file 49** | — | owner action, not design action |
| **ACR-004** `DETERMINISTIC_UI_RENDER` | NO → **added to file 49** | — | owner action, not design action |

## Coverage summary

| | Count |
|---|---|
| BLOCKERS mapped | **5/5** |
| HIGH mapped | **14/14** |
| Owner decisions mapped | **4/4** |
| Genuine omissions found in file 45 | **23** |
| Omissions patched into file 45 | **23** |
| Omissions requiring ACR instead of prompt text | **2** (ACR-003, ACR-004) |

`ALL_BLOCKERS_MAPPED_TO_CLAUDE_DESIGN = YES`
`ALL_HIGH_ISSUES_MAPPED_TO_CLAUDE_DESIGN = YES`
