# G0 C1 Index-Generator Repair Report

**Date:** 2026-08-17  
**Scope:** narrow C1 implementation repair discovered by G0 independent validation.

## Defect

DB-04 is authoritative and requires the product-list matrix sorts to use `productName ASC`,
`internalSkuNormalized ASC`, `onHandMilli DESC`, and `productUpdatedAt DESC`. The C1 generator used a
loose rule that made every non-`onHand` sort ascending. As a result, these eight generated indexes used
`productUpdatedAt ASC` instead of the frozen `DESC` direction:

`IDX-35`, `IDX-42`, `IDX-50`, `IDX-53`, `IDX-57`, `IDX-60`, `IDX-63`, `IDX-67`.

The historical `C1_COMPLETION_REPORT.md` is unchanged. This report supersedes only its exact-index PASS
claim for this specific defect.

## Repair

- `scripts/index-spec.ts` now uses an explicit four-sort direction map: name ASC, SKU ASC, on-hand DESC,
  updated DESC.
- `firestore.indexes.json` was regenerated from the repaired generator; it was not hand-edited.
- `scripts/verify-indexes.ts` now parses the matrix rows from current DB-04 authority and compares every
  generated matrix collection and field direction to that authority. It also asserts the exact eight-ID
  updated and on-hand descending families.
- This report records the repair. No frozen authority or `packages/shared/**` file changed.

## Mechanical result

```text
BEFORE_ACTIVE_INDEX_IDS = 67
AFTER_ACTIVE_INDEX_IDS = 67
BEFORE_PRODUCT_LIST_MATRIX_INDEXES = 32
AFTER_PRODUCT_LIST_MATRIX_INDEXES = 32

GENERATED_INDEXES = 67
MISSING_INDEXES = 0
EXTRA_INDEXES = 0
INDEX_SET_MATCH = PASS
DB04_MATRIX_CONTRACT_MATCH = PASS

UPDATED_MATRIX_INDEXES = 8
UPDATED_DESC_COUNT = 8
UPDATED_ASC_COUNT = 0

ON_HAND_MATRIX_INDEXES = 8
ON_HAND_DESC_COUNT = 8

C1_INDEX_DIRECTION_DEFECT = REPAIRED
AUTHORITY_CHANGED = NO
INDEX_COUNT_CHANGED = NO
ARCHITECTURE_SEMANTICS_CHANGED = NO
```

## Files changed by the index repair

1. `scripts/index-spec.ts`
2. `scripts/verify-indexes.ts`
3. `firestore.indexes.json`
4. `docs/implementation-evidence/G0_C1_INDEX_REPAIR_REPORT.md`
