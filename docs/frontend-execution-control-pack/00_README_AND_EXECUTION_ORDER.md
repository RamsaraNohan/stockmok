# Stockmok Frontend Execution Control Pack

**Status:** `FRONTEND_EXECUTION_CONTROL_PACK = COMPLETE`
**Planning only:** YES
**Production frontend changed:** NO
**Owner review required before F0:** YES

## Worktree contract

- F0-F6 worktree: `C:\Users\ramsa\stockflow-worktrees\frontend`
- F0-F6 branch: `feature/frontend`
- F7 branch: `integration/parallel-implementation`
- Planned F7 worktree: `C:\Users\ramsa\stockflow-worktrees\integration` (create only after lane-promotion authorization)
- Read-only frozen data worktree: `C:\Users\ramsa\stockflow-worktrees\data-c2`
- Read-only backend candidate worktree: `C:\Users\ramsa\stockflow-worktrees\backend-security`

The parent `C:\Users\ramsa\stockflow-worktrees` is a container, not a Git checkout. Never copy source manually between worktrees.

## Dependency lock

| Lane                     | State                                      | SHA                                        | Frontend consequence                                              |
| ------------------------ | ------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------- |
| C1 baseline              | FROZEN                                     | `a0d500ac5953dc6a6a12bdb6ce3a4592a4c23ec1` | Base of `feature/frontend`                                        |
| C2 data/read layer       | INDEPENDENTLY REVIEWED, PROMOTABLE, FROZEN | `694a6979b5516017b61a46f8a61d97214ab74dd5` | Read-only until integration; no new promotion step                |
| Backend                  | PROMOTION PENDING                          | `c4e2c2d1eb5577b051056317b39557b4f475cb45` | Author repaired prior P1; fresh independent review still required |
| Connected PO draft lines | AUTHORITY GAP                              | n/a                                        | SCREEN-038 UI may proceed; production line persistence is gated   |

## Execution order

1. Read `02_AUTHORITY_PRECEDENCE_AND_CONFLICT_MAP.md` and `03_FRONTEND_SCOPE_AND_NON_GOALS.md`.
2. Read `12_FRONTEND_PHASE_EXECUTION_PLAN.md`, then the relevant entry in `14_REQUIRED_FILES_BY_PHASE.md`.
3. Run exactly one prompt from `prompts/`; each prompt stops at its phase checkpoint.
4. Use `13_AI_MODEL_TASK_ROUTER.md` and `15_ANTIGRAVITY_QUOTA_AND_HANDOFF_PLAN.md` for task-level routing and handoff.
5. Apply `19_CHECKPOINT_COMMIT_POLICY.md`; never use `git add .`.
6. F0-F6 end in a reviewed frontend freeze. F7 begins only on the authorized integration worktree.

## Frozen counts

| Registry                          |                                       Count |
| --------------------------------- | ------------------------------------------: |
| Screens                           | 53 (`SCREEN-001..052` plus A1 `SCREEN-053`) |
| Routes                            |                                          36 |
| Forms                             |                        24 (`FORM-001..024`) |
| Tables                            |                                          27 |
| Components                        |                                          25 |
| UI states                         |                       44 (`STATE-001..044`) |
| Active query IDs                  |                          92, non-contiguous |
| Composite indexes                 |                                          67 |
| Active command IDs                |                          38, non-contiguous |
| Realtime listeners                |                                           4 |
| Safe direct-client write surfaces |                                           6 |
| Current generated visual assets   |                                         105 |
| Canonical frozen design artifacts |                                          10 |

## Completion gate

The pack is internally complete, but implementation is not self-authorized. The owner must review phase routing and blockers before Antigravity starts F0.

```text
FRONTEND_EXECUTION_CONTROL_PACK = COMPLETE
PLANNING_ONLY = YES
PRODUCTION_FRONTEND_CHANGED = NO
BACKEND_CHANGED = NO
C2_CHANGED = NO
FROZEN_AUTHORITY_CHANGED = NO

SOURCE_FILES_INVENTORIED = 453
NORMATIVE_FRONTEND_SOURCES = 69
VISUAL_REFERENCES_MAPPED = 115
ROUTES_MAPPED = 36
SCREENS_MAPPED = 53
FORMS_MAPPED = 24
TABLES_MAPPED = 27
QUERY_IDS_REFERENCED = 92
COMMAND_IDS_REFERENCED = 38
COMPONENT_PATTERNS_DEFINED = 25
IMPLEMENTATION_PHASES = 8
PHASE_PROMPTS_CREATED = 9

AI_MODEL_ROUTER = COMPLETE
ANTIGRAVITY_QUOTA_HANDOFF_PLAN = COMPLETE
RESPONSIVE_PLAN = COMPLETE
QA_PLAN = COMPLETE
INTEGRATION_DEPENDENCY_PLAN = COMPLETE
CPO_DRAFT_LINE_FRONTEND_PATH = AUTHORITY_GAP

OPEN_FRONTEND_BLOCKERS = [BACKEND_PROMOTION_PENDING, SCREEN_038_AUTHORITY_GAP]
OUTPUT_DIRECTORY = C:\Users\ramsa\stockflow-worktrees\frontend\docs\frontend-execution-control-pack
```

`NEXT_ACTION = OWNER_REVIEW_FRONTEND_EXECUTION_CONTROL_PACK_THEN_START_F0`
