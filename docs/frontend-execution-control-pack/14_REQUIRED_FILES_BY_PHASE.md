# Required Files by Phase

## Common to every phase

- `AGENTS.md`
- `docs/frontend-execution-control-pack/00_README_AND_EXECUTION_ORDER.md`
- relevant phase section in `12_FRONTEND_PHASE_EXECUTION_PLAN.md`
- relevant prompt and manifest task records
- `docs/implementation/FRONTEND_BACKEND_CONTRACT.md`
- `docs/implementation/OWNERSHIP_MAP.md`

## F0

- **Required:** `IMPLEMENTATION_CHECKPOINT.md`, `INTEGRATION_STATUS.md`, `OWNERSHIP_MAP.md`, control-pack files 03, 06, 08, 10, 11, 14, 15; DB-00 §8/A1, DB-02, DB-03, DB-04, DB-06, DB-09; design freeze/checkpoint/manifest; UI files 19-23, 28, 31.
- **Shared:** `packages/shared/src/index.ts`, schemas, commands, paths and server-path boundary.
- **Evidence:** C2 independent review; backend final review plus current candidate commit; G0/C1 reports.
- **Do not need:** every PNG, audit-final body, old v2/v3 packs.

## F1

- **Required:** control-pack 02,04,06,07,10; DB-03 rows 001-008/029/030/041/043/052; DB-04 Q-001..010; DB-05 auth/tenant reads; DB-06 C-01/03/06; UI files 19,20,22,23,28.
- **Visual:** Design System; Gate 5; Gates 10-12; Gate 14; corresponding VISUAL-SCREEN/MOBILE/STATE rows in file 31.
- **Shared:** user/org/membership/notification schemas and paths.
- **Do not need:** network/connected PO audit/history.

## F2

- **Required:** control-pack 02,04,05,07,10; DB-03 rows 009-015/044-047; DB-04 product matrix and dashboard aggregations; DB-06 C-09..12/C-35a/b/C-36/37; UI files 19-24,28.
- **Visual:** Design System; Gate 6 `new`; Gates 11/12/14; dashboard/inventory/mobile assets.
- **C2:** registry, repositories, product-matrix and pagination interfaces at frozen SHA.
- **Do not need:** backend connected-command bodies.

## F3

- **Required:** control-pack 04-06,08; DB-00 A1 transfer; DB-03 rows 016-024/042/053; DB-04 movement/private-PO families; DB-06 C-13..17/C-33/C-38; DB-07 stock/PO states; UI files 19,22,23,28.
- **Visual:** Gate 6 `new`, Gate 7 `new`, Gates 10-12/14; stock/procurement/receiving/mobile assets.
- **Shared:** inventory/procurement schemas, command map, roundHalfUp/domain helpers.
- **Do not need:** Gate 8/9 connected visuals except shared timeline patterns.

## F4

- **Required:** control-pack 03-07; DB-03 rows 031-040/051; DB-04 Q-041..047 and order detail; DB-05 cross-tenant/privacy; DB-06 C-18..31/C-34; DB-07 connected state machines; current backend review and candidate evidence.
- **Visual:** Gates 8, 9 `new`, 11,12,14; network/catalog/mapping/connected assets.
- **Shared:** network/procurement schemas and immutable line snapshot fields.
- **Do not need:** raw canonical Zone-4 paths or supplier-private data.

## F5

- **Required:** control-pack 02,04,06,08; DB-03 rows 025-028/048-050/052; DB-04 Q-004/005/009/010/report families; DB-06 C-02/04/05/07/08; UI files 19-24,28.
- **Visual:** Gate 10, Gate 6 `new`, Gates 11/12/14; report/team/settings/notification assets.
- **Do not need:** connection mapping command internals.

## F6

- **Required:** design freeze/checkpoint/manifest; UI files 21-23,28-33; control-pack QA file 08; DB-03 full surface gate; every preceding phase evidence.
- **Visual:** all ten canonical design artifacts and all 105 current visual references; use rejected/superseded only to diagnose accidental reuse.
- **Do not need:** audit-final recommendations except conflicts already logged or a newly discovered discrepancy.

## F7

- **Required:** frozen C2 commit/evidence, promoted backend commit/new independent review, frontend freeze/evidence, DB-08 canonical seed/chain, control-pack QA and implementation architecture, all F0-F6 handoffs.
- **Worktree:** authorized integration checkout only.
- **Do not need:** superseded implementation candidates or old failure reports except provenance.
