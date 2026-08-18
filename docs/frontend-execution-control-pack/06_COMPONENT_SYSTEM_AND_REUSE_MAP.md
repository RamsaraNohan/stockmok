# Component System and Reuse Map

The frozen component namespace is exactly `COMP-001..025`; implementation names may be idiomatic React names but must preserve these behaviors.

| IDs     | Reusable system                                                     | Screens                                          | Required variants                                                     | Responsive/a11y/data contract                                                                   | Phase    |
| ------- | ------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------- |
| 001-007 | Button, IconButton, Input, Select, Textarea, Checkbox/Switch, Field | all forms/actions                                | default/focus/error/disabled/loading; danger where declared           | 40 px desktop/44 px mobile; labels/descriptions/errors programmatic; payload schema at boundary | F0-F1    |
| 008-011 | Card, KPI Card, StatusPill, Badge                                   | dashboards/details/lists                         | interactive/loading/error; every frozen status/role/private/connected | icon+text, never color alone; KPI links exact filtered route                                    | F1-F2    |
| 012-014 | DataTable, Pagination, Tabs                                         | all TABLE-001..027 and tab sets                  | loading/empty/mobile-card; cursor; active/disabled/count              | semantic table; labelled mobile fields; arrow-key tabs; indexed sorting only                    | F1-F2    |
| 015-017 | Modal, ConfirmDialog, Toast                                         | forms/destructive actions/feedback               | sizes, mobile sheet, destructive/submitting/error                     | focus trap, Escape, focus return; live region; toast never sole evidence                        | F1       |
| 018-020 | EmptyState, ErrorState, Skeleton                                    | every async surface                              | no-action/action; retry/no-retry; geometry variants                   | plain language, focusable retry, skeleton hidden from accessibility tree                        | F1       |
| 021     | Monogram                                                            | auth, workspace, shell, partners                 | 24/32/48; image fallback                                              | deterministic initials/colour; no upload UI                                                     | F1       |
| 022     | Timeline                                                            | PO and connected history                         | actor/org/role/time/transition/note                                   | chronological semantic list; immutable history explicit                                         | F3-F4    |
| 023     | Stepper                                                             | onboarding, PO builder, mapping                  | 4/5-step, complete/current/upcoming/error                             | current announced; mobile compact vertical, never dots-only                                     | F1/F3/F4 |
| 024     | FilterBar                                                           | product, movement, partner, PO, network, reports | desktop/full, mobile/collapsed, chips/clear                           | no global-search implication; filters map to approved query shapes                              | F2-F5    |
| 025     | PageHeader                                                          | every routed app page                            | actions/no-action, breadcrumb, subtitle                               | one per screen; real route hierarchy; RBAC action visibility                                    | F1       |

## Composition-only patterns

AppShell, desktop Sidebar, mobile Drawer, TopBar, Breadcrumbs, form sections, quantity/currency displays, receiving rows, connection cards, catalog rows, mapping rows, notification rows and report controls are compositions of the 25 primitives. They do not extend the frozen component registry.

## Implementation boundaries

- Components accept typed display/action props; they do not create Firestore queries or callable clients.
- Quantity display consumes milli-units and explicit unit. Money display consumes minor units and currency. Never accept floating persisted values.
- Table sort/filter controls expose only declared C2 shapes; pagination uses cursors and default 25/max 100.
- StatusPill accepts frozen enum/display mappings exhaustively; unknown values fail at the parsed service boundary.
- Modal forms generate or receive one stable operation ID per form opening for idempotent commands.
