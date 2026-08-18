# F4 Network and Connected Procurement Prompt

**TASK ROUTING:** Codex Sol high for privacy/command adapters/tests; Flash High catalog/mapping JSX; Pro High connected workflow composition; independent browser reviewer.
**WORKTREE/BRANCH:** frontend worktree / `feature/frontend`.

## Purpose and surfaces

Implement SCREEN-031..040/051 and connected variants of PO detail/receiving on ROUTE-031..036 and reused procurement routes.

## Required authority

Read pack 02-18 and F4 pack; DB-03 F4 rows; DB-04 Q-041..047/order detail; DB-05 privacy; DB-06 C-18..31/C-34; DB-07 connected states; shared network/procurement snapshots; current backend status; Gates 8, 9 **new**, 11,12,14 and current network visuals.

## Reads/commands

Q-001,011,014,017,018,034,036..047. C-18..31; C-34 only for its existing header/normalization payload.

## Requirements

Exact-handle discovery only; partner catalog reads through callable; never expose supplier stock/cost/warehouse/private data. Mapping implements all seven refusal states and no restore. Connected shipping is exactly one full shipment. Receiving tracks outstanding in supplier units and shows conversion. SCREEN-038 form/local behavior may be built, but line persistence and full submit flow remain gated.

## SCREEN-038 prohibitions

No raw Firestore line write, invented command/API, silent C-34 payload expansion, frontend-only persistence or fake success. Render a development gate and test that blocked wiring stays blocked.

## Tests/browser

Feature-flag 404, self/duplicate/pending discovery, both organization views, cross-tenant payload inspection, catalog callable, mapping states, disabled connection, submit/respond/ship/receive state UI where existing data permits. Browser all viewports and both tenant roles.

## Checkpoint/stop

Commit `feat(frontend): complete F4 network and connected procurement` only with SCREEN-038 gap explicitly recorded. Stop for any new persisted path/type/query/command or privacy ambiguity. Handoff at complete connection/catalog/mapping/connected-order subflow.

## Executable contract fields

- **TOOL / MODEL / EFFORT:** Codex Sol high privacy/adapters/tests; Flash High catalog/mapping; Pro High connected composition.
- **WORKTREE / BRANCH:** frontend worktree / `feature/frontend`.
- **CURRENT DEPENDENCIES:** F3; frozen C2; promoted backend; SCREEN-038 gap remains.
- **QUERY IDS / COMMAND IDS:** exact sets listed above and in manifest F4 tasks.
- **ALLOWED SCOPE:** frontend network/catalog/mapping/connected/services/tests/evidence. **FORBIDDEN SCOPE:** shared/C2/backend/Rules/new persistence/contracts.
- **IMPLEMENTATION REQUIREMENTS:** exact-handle, privacy projection, seven mapping states, one shipment, gated draft lines.
- **RESPONSIVE REQUIREMENTS:** all four viewports; dual-unit receiving and role variants remain legible.
- **ACCESSIBILITY REQUIREMENTS:** wizard step, privacy notice, timeline and dual-unit labels.
- **TESTS / BROWSER QA / EXPECTED OUTPUT:** listed above.
- **COMMIT CHECKPOINT / STOP CONDITIONS / QUOTA HANDOFF CONDITIONS:** listed above.
