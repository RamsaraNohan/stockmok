# Source Inventory

## Intake result

`SOURCE_FILES_INVENTORIED = 453` across `docs`, `Stockmok_Final_Control_Pack_v4`, `visual-designs`, `packages`, `functions`, `scripts`, `tests`, and root governance/configuration anchors. The count is a recursive filesystem inventory, not a claim that every source is normative.

`NORMATIVE_FRONTEND_SOURCES = 69`: 17 current product-control documents, 11 database-final documents, 7 implementation contracts, 5 root design-governance documents, 19 `docs/ui-final` specifications, and 10 canonical frozen design artifacts.

## Source groups

| Path/group                                                                 | Type and purpose                                                                               | Authority/state                                                | Frontend areas                     | Must-read phases           |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------- | -------------------------- |
| `AGENTS.md`                                                                | lane and implementation safety                                                                 | current operational control                                    | all                                | F0-F7                      |
| `Stockmok_Final_Control_Pack_v4/01..17`                                    | product, requirements, scope, use cases, domain, security, IA, QA, stack, architecture, plan   | current product authority                                      | all                                | F0; phase-local thereafter |
| `docs/database-final/DB_00..DB_11`                                         | amended physical schema, query, command, security, state, seed, reconciliation                 | frozen normative authority                                     | reads, writes, RBAC, states        | F0-F7                      |
| `docs/implementation/*.md`                                                 | executable frontend/backend/path/type/checkpoint contracts                                     | frozen normative authority                                     | service boundary and lane controls | F0-F7                      |
| `STOCKMOK_DESIGN_FREEZE_v1.0.md`                                           | owner approval                                                                                 | controlling frozen visual outcome                              | all composition                    | F0-F6                      |
| `STOCKMOK_DESIGN_CHECKPOINT.md`                                            | Gate 14 approval and frozen decisions                                                          | controlling visual checkpoint                                  | all composition                    | F0-F6                      |
| `STOCKMOK_FINAL_DESIGN_ARTIFACT_MANIFEST.md`                               | canonical hashes and superseded classification                                                 | controlling artifact identity                                  | visual selection                   | F0-F6                      |
| `STOCKMOK_DESIGN_DECISION_LEDGER.md`, `STOCKMOK_DESIGN_CHANGE_REGISTER.md` | accepted decisions and changes                                                                 | current governance                                             | conflict resolution                | F0, F6                     |
| `docs/ui-final/00,18..35`                                                  | route, screen, component, interaction, state, microcopy and visual traceability specifications | current implementation specification below higher authority    | all UI                             | F0-F6, phase-local         |
| `docs/audit-final/36..54`                                                  | later audit and recommendations                                                                | supporting/audit/history unless promoted                       | risks and warnings                 | F0, F6                     |
| `visual-designs/completed Stockmok Design programme/*.dc.html`             | 10 canonical design artifacts plus rivals/exploration                                          | select canonical by manifest SHA, never filename alone         | visual implementation              | F1-F6                      |
| `visual-designs/generated/01..22`                                          | 105 current approved PNG references                                                            | implementation references, not authority over frozen contracts | screen/component/state comparison  | F1-F6                      |
| `visual-designs/generated/24_rejected`, `25_superseded`                    | rejected/historical output                                                                     | must not control implementation                                | none                               | F0 only                    |
| `packages/shared/**`                                                       | types, schemas, converters, paths, commands, transitions                                       | frozen shared foundation; read-only in frontend lane           | adapters/forms/display             | F0-F7                      |
| frozen C2 `packages/data/**`                                               | 92-query registry, repositories, pagination, realtime and aggregates                           | frozen at `694a697...`; read-only until integration            | read adapters                      | F0, F2-F7                  |
| backend `functions/src/**`, `firestore.rules`                              | callable behavior and rules candidate                                                          | read-only evidence; promotion pending                          | mutations/errors/RBAC              | F0, F1-F5, F7              |
| `scripts/**`, `tests/**`, root configs                                     | current verification/bootstrap infrastructure                                                  | executable evidence, not product authority                     | gates                              | F0, F6, F7                 |

## Canonical design artifacts

Use the exact hashes in `STOCKMOK_FINAL_DESIGN_ARTIFACT_MANIFEST.md`. The controlling set is Design System; Gates 5, 6 **new**, 7 **new**, 8, 9 **new**, 10, 11, 12, and 14. The non-`new` Gate 6/7/9 rivals are superseded. Gate 2 territories are historical exploration.

## Do not reread by default

- `StockFlow_Final_Control_Pack_v2_10of10/**` and `StockFlow_Final_Control_Pack_v3/**`.
- ZIP archives when their extracted authoritative contents are present.
- `docs/audit-final/**` during ordinary phase work; use the conflict map instead.
- rejected/superseded visuals, renderer implementation, contact sheets, and showcase boards unless F6 is investigating a traceability defect.
