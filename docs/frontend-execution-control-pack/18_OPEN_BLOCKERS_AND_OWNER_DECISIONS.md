# Open Blockers and Owner Decisions

## Blocking full integration, not planning/F0

| ID                 | State                     | Evidence                                                                                          | Required closure                                                            |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| FRONTEND-BLOCK-001 | BACKEND_PROMOTION_PENDING | candidate `c4e2c2d...`; current independent report reviewed `b673ef3...` and failed before repair | fresh independent pass and frozen backend SHA                               |
| FRONTEND-BLOCK-002 | AUTHORITY_GAP             | SCREEN-038 requires connected line intent; C-34 payload has only purchaseOrderId/connectionId     | owner-approved amendment, owning-lane implementation and independent review |

## Non-blocking governed cautions

- C2 is frozen; do not request or perform another promotion step.
- Four design-side canonical-data/custody notes remain documented, but precedence resolves implementation values.
- Production billing/domain/region/deployment decisions do not block emulator development and are not authorized here.
- NFR read budgets are measurement obligations, not pre-proven facts.

## Stop-and-escalate conditions

- A frozen source conflict with no deterministic winner.
- A required frontend behavior needs a new query, command, path, enum, persisted field or shared-schema widening.
- Any need to edit another protected worktree or terminate its emulator/service.
- Production credentials, deploy, merge/rebase/push, destructive cleanup, or secret exposure.
