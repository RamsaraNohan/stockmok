# F3 Stock, Movements, Private PO, and Receiving Prompt

**TASK ROUTING:** Codex Sol high for adapters/domain tests; Flash High for forms/tables; Pro High for receiving composition; Antigravity Flash High browser QA.
**WORKTREE/BRANCH:** frontend worktree / `feature/frontend`.

## Purpose and surfaces

Implement SCREEN-016..024,042,053 and ROUTE-016..025, including FORM-024/ACTION-062/STATE-044 from DB-00 A1.

## Required authority

Read pack 02-14 and F3 pack; DB-00 A1; DB-03 F3 rows; DB-04 movement/private-PO families; DB-06 C-13..17/C-33/C-38; DB-07 states; shared inventory/procurement schemas and domain functions; canonical Gate 6 `new`, Gate 7 `new`, Gates 10-12/14 and receiving/mobile assets.

## Reads/commands

Q-014..018,Q-015r,Q-022..040,Q-083,Q-084a/b. C-13..17,C-33,C-38 plus strict sanctioned PRIVATE DRAFT writes.

## Requirements

Opening quantity zero is valid. Persist integers only. Adjustment/transfer/receive are non-optimistic and idempotent. Movement history is immutable/time-sorted. Transfer creates no route and shows unchanged total. Private PO draft is the only client-writable PO kind; order freezes lines; receiving exposes current/after/outstanding and blocks over-receipt.

## Responsive/accessibility

Adjustment/opening/transfer become 390 sheets with full focus semantics; PO wizard retains step labels; receiving follows the strong mobile reference and repeats units/labels.

## Tests/browser

Zero opening, negative/precision refusal, >50% confirm, replay, same-room transfer, insufficient stock, ledger filters/search, draft/order/cancel, partial/final/over receipt, role denial. Browser all viewports with special 390 receiving evidence.

## Scope/checkpoint/stop

No direct balance/movement write, floating persistence, client archive guard or command widening. Commit `feat(frontend): complete F3 stock and private procurement`; stop. Quota handoff at one complete workflow plus tests/evidence.

## Executable contract fields

- **TOOL / MODEL / EFFORT:** Codex Sol high domain/adapters/tests; Flash High repeated UI; Pro High receiving.
- **WORKTREE / BRANCH:** frontend worktree / `feature/frontend`.
- **CURRENT DEPENDENCIES:** F2; frozen C2; promoted backend for live commands.
- **QUERY IDS:** Q-014..018, Q-015r, Q-022..040, Q-083, Q-084a/b. **COMMAND IDS:** C-13..17, C-33, C-38.
- **ALLOWED SCOPE:** frontend stock/movement/partner/procurement/services/tests/evidence. **FORBIDDEN SCOPE:** shared/C2/backend/Rules/balance writes/frozen assets.
- **IMPLEMENTATION REQUIREMENTS / RESPONSIVE REQUIREMENTS / ACCESSIBILITY REQUIREMENTS:** listed above.
- **TESTS / BROWSER QA / EXPECTED OUTPUT:** listed above.
- **COMMIT CHECKPOINT / STOP CONDITIONS / QUOTA HANDOFF CONDITIONS:** listed above.
