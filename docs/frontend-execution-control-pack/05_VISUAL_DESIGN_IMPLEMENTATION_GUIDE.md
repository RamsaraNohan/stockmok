# Visual Design Implementation Guide

## Controlling visual sources

1. `STOCKMOK_DESIGN_FREEZE_v1.0.md` and `STOCKMOK_DESIGN_CHECKPOINT.md`.
2. The ten hash-selected canonical artifacts in `STOCKMOK_FINAL_DESIGN_ARTIFACT_MANIFEST.md`.
3. Non-conflicting `docs/ui-final/21`, `22`, `23`, `28` implementation specifications.
4. The 105 current PNGs recorded in `docs/ui-final/31_FINAL_VISUAL_ASSET_REGISTER.md`.

PNG assets are references, not permission to reproduce engineering copy or stale data. When exact tokens/pixels are absent, inspect the canonical design artifact; do not fabricate a replacement design language.

## Frozen composition

- One application shell: desktop sidebar, top bar, organization identity, role badge and notification/user utilities.
- Under 1024 px the sidebar becomes a left drawer; there is no mobile bottom-tab navigation.
- One PageHeader per screen; tables/lists are dense desktop surfaces and labelled mobile cards.
- Actions retain a single visual priority. Destructive actions use explicit ConfirmDialog language.
- Five layout families and exactly 25 component primitives; compose new screen structures from them rather than creating a 26th design-system component.
- Minimum customer text is 12 px; mobile controls are at least 44x44; visible focus and WCAG-AA contrast are mandatory.

## Phase visual references

| Phase | Frozen artifacts                                          | Current visual families                                                               |
| ----- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| F1    | Design System, Gate 5, Gate 10, Gate 11, Gate 12, Gate 14 | public, auth, onboarding, shell, permission/404, mobile navigation, notification menu |
| F2    | Design System, Gate 6 **new**, Gate 11, Gate 12, Gate 14  | dashboard, inventory, product/category/warehouse, role dashboards                     |
| F3    | Gate 6 **new**, Gate 7 **new**, Gate 10, Gate 11, Gate 12 | stock, movements, partners, private PO, receiving, transfer                           |
| F4    | Gate 8, Gate 9 **new**, Gate 11, Gate 12                  | connections, catalog, mapping, connected PO and receiving                             |
| F5    | Gate 10, Gate 6 **new**, Gate 11, Gate 12                 | team, settings, notifications, reports                                                |
| F6    | all ten canonical artifacts                               | mobile, state boards, component boards and every phase output                         |

## Required visual states

Every async surface has layout-matched initial loading, non-destructive refetch, empty, filtered-empty, permission denied, not found and retryable/non-retryable error behavior. Forms additionally retain input on safe failures, focus the first invalid field, disable duplicate submission and surface success in both updated data and feedback.

## Visual-ledger coverage

`docs/ui-final/31_FINAL_VISUAL_ASSET_REGISTER.md` contains 106 stable rows: one retired `VISUAL-BRAND-001` historical exploration and 105 current references. The current set is 52 screen, 11 mobile, 11 state, 10 component, 8 board, 8 review and 5 brand assets. All are assigned through the phase-family table above. SCREEN-053 is an A1 addition represented by the canonical Gate 12 transfer frame plus FORM-024/STATE-044 authority; no new visual ID is invented.

## Anti-patterns

- No raw route pills, SCREEN/FORM/TABLE identifiers, specification prose, fake disabled functionality or backend reason codes as customer copy.
- No unsupported print, reconnect, mapping restore, multi-shipment, fuzzy search, “show all,” infinite scroll or mobile report export.
- No copying values from known stale mobile frames. Domain/data authority controls displayed examples.
