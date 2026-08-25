# G1 IDX-07 Index-Authority Repair Report

**Date:** 2026-08-25
**Scope:** narrow forward repair discovered when the `stockmok-v1.0.1` production deploy attempt
failed partway through `firebase deploy --only firestore:indexes`.

## Defect

`IDX-07` (`stockMovements`, `createdAt DESC`) was declared as a one-field composite index in
`firestore.indexes.json`, generated from `scripts/index-spec.ts`, and enumerated as a required
composite in `DB_04_FINAL_QUERY_INDEX_PAGINATION_REALTIME_CONTRACT.md` (67-index total, catalog §7,
and the `Q-022`/`Q-063` rows in §4). Firestore's production deploy validator rejects any composite
index declared over exactly one field, because it already maintains that field's ASC/DESC index
automatically — the declaration is redundant by construction. The deploy stopped at this entry
(index #6 of 67) after five prior indexes had already been submitted successfully; Firestore rules
were live; no Functions or Hosting deploy had started.

DB_04 §4 already documented the correct mental model for this exact case ("Eight subsets, one of
which (`createdAt` alone) is served by a single-field index") but §7's catalog table and the
`Q-022`/`Q-063` rows still cited `IDX-07` as a named composite — an internal inconsistency in the
authority document itself, not a generator transcription bug.

## Why this is a platform-compatibility correction, not a capability change

Firestore's automatic single-field index fully serves both consumers:

- `Q-022` — date-range-only ledger query, ordered `createdAt DESC`, no equality filter
- `Q-063` — dashboard Recent Activity, ordered `createdAt DESC`, no filter, `limit(5)`

Neither query gains or loses filter, order, or pagination capability. `scripts/verify-c2.ts`
(`QUERY_INDEX_REFERENCES=PASS`) and `scripts/verify-indexes.ts` (`DB04_MATRIX_CONTRACT_MATCH=PASS`)
confirm both queries remain fully accounted for after `IDX-07`'s removal.

## Repair

Following the existing `IDX-03`/`IDX-19` precedent in DB_04 §7 (indexes deleted inline, with
rationale, without a new `DB-00`-style amendment — no capability changed), `IDX-07` is deleted the
same way:

1. **`scripts/index-spec.ts`** — removed the `IDX-07` entry from `NON_MATRIX_INDEXES`.
2. **`firestore.indexes.json`** — regenerated via `scripts/generate-indexes.ts`; not hand-edited.
3. **`scripts/verify-indexes.ts`** — expected-id exclusion list and total count updated (67 → 66);
   added a mechanical guard rejecting any future single-field entry inside the composite `indexes`
   array, so this exact defect class cannot silently recur.
4. **`scripts/verify-architecture.ts`** — independent `index ids` exact-set assertion updated
   (67 → 66) with the same exclusion.
5. **`packages/data/scripts/verify-c2.ts`** — independent 67-count assertion and active-index-id
   exclusion set updated (67 → 66); a third, previously undiscovered place enforcing this invariant.
6. **`packages/data/src/registry.ts`** — `Q-022` (the no-filter ledger subset, previously
   `indexes[0] === 'IDX-07'`) now omits the `indexes` metadata key, matching the existing pattern
   already used by `Q-030` for auto-single-field coverage. `Q-063` likewise drops its
   `indexes: ['IDX-07']` line. This is metadata bookkeeping only — `filters`, `order`, `path`,
   `limit` are unchanged for both queries, so no query construction or runtime behavior changed.
7. **`docs/database-final/DB_04_FINAL_QUERY_INDEX_PAGINATION_REALTIME_CONTRACT.md`** — `IDX-07`
   row removed from the §7 catalog (matching how `IDX-03`/`IDX-19` are simply absent from that
   table); `Q-022`/`Q-063` rows in §4 now cite the automatic single-field index; §7's "A3 index
   changes" note extended with a "Forward correction" paragraph; total composite-index count
   updated 67 → 66 in both places it is stated (§7 and the `9. Contract result` block).

## Mechanical result

```text
BEFORE_ACTIVE_INDEX_IDS = 67
AFTER_ACTIVE_INDEX_IDS  = 66

INDEX_SET_MATCH               = PASS  (scripts/verify-indexes.ts)
ARCHITECTURE_INTEGRITY        = PASS  (scripts/verify-architecture.ts)
C2_CONTRACT_VERIFICATION      = PASS  (packages/data/scripts/verify-c2.ts)
QUERY_INDEX_REFERENCES        = PASS
DB04_MATRIX_CONTRACT_MATCH    = PASS

UNIT_TEST_FILES  = 57 (unchanged)
UNIT_TESTS       = 400 (unchanged)
DATA_PKG_TESTS   = 19 / 5 files (unchanged)

INDEX_REMOVAL_QUERY_SAFE = YES
AUTHORITY_CHANGED        = YES (DB_04 §4, §7 — inline correction, same class as IDX-03/IDX-19)
FORMAL_DB00_AMENDMENT_REQUIRED = NO — no capability, filter, order, or query surface changed
QUERY_CAPABILITY_CHANGED = NO
```

## Files changed by this repair

1. `scripts/index-spec.ts`
2. `scripts/verify-indexes.ts`
3. `scripts/verify-architecture.ts`
4. `packages/data/scripts/verify-c2.ts`
5. `packages/data/src/registry.ts`
6. `firestore.indexes.json`
7. `docs/database-final/DB_04_FINAL_QUERY_INDEX_PAGINATION_REALTIME_CONTRACT.md`
8. `docs/implementation-evidence/G1_IDX07_INDEX_REPAIR_REPORT.md` (this report)

## Known stale references left untouched

A handful of descriptive/historical documents still say "67 composite indexes" or cite `IDX-07`:
`docs/database-final/DB_02_FINAL_FIRESTORE_PHYSICAL_SCHEMA.md`, `DB_09_CODEX_FIREBASE_IMPLEMENTATION_BRIEF.md`,
`DB_10_DATABASE_IMPLEMENTATION_READINESS_GATE.md`, `DB_11_FINAL_BIDIRECTIONAL_UI_DATABASE_RECONCILIATION_GATE.md`,
`docs/database-final/reviews/STOCKMOK_FRONTEND_DB_INDEPENDENT_REVIEW.md`, the frontend execution
control pack, `STOCKMOK_DATABASE_HANDOFF_NEXT_CHAT.md`, `IMPLEMENTATION_CHECKPOINT.md`,
`OWNERSHIP_MAP.md`, and the two historical `*_Final_Control_Pack_v3/v4` snapshots. None of these are
mechanically parsed by any verify script (confirmed by search); the project's own convention (see
DB_09's "HISTORICAL... SUPERSEDED" figures) is to leave superseded counts as historical record rather
than retroactively rewrite them. Not corrected here; flagged for an optional documentation-only pass.
