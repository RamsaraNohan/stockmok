# QA, Browser, Playwright, and Accessibility Plan

## Progressive gates

| Gate                | When             | Required checks                                                                                            |
| ------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| task-local          | every task       | focused typecheck/lint/unit/component/service test; affected viewport smoke                                |
| phase-local         | F1-F5 checkpoint | full frontend typecheck/lint/unit/component; route smoke; phase browser matrix; no console error           |
| frontend regression | F6               | all frontend tests, build, all canonical viewports, keyboard/a11y, visual comparison, bundle/read evidence |
| integration         | F7               | root/data/backend/rules/seed/frontend gates; emulator E2E                                                  |
| release candidate   | F7 end           | eight Chromium specs, Lighthouse, bundle, read counts, independent review                                  |

## Browser matrix

- Chromium at 390x844, 768x1024, 1280x900 and 1920x1080.
- F1: public/auth/onboarding/shell/drawer/denial.
- F2: every role dashboard, product list/detail, category/warehouse forms.
- F3: movement table/cards, adjustment/opening/transfer sheets, PO builder/detail, mobile receiving.
- F4: both organizations' network/catalog/mapping/connected PO/receiving states.
- F5: team/invite modal, notification menu/page, both reports, settings.

## Capped Playwright release set

1. Public signup/login/onboarding and zero/one/many membership dispatch.
2. Branded login/invite and wrong-role/suspended/expired behavior.
3. Product create/list/filter/detail/archive plus stock opening/adjust/transfer.
4. Private PO draft/order/partial/final receive.
5. Network request/accept/catalog/mapping.
6. Connected submit/respond/ship/partial/final receive (gated until draft-line authority exists).
7. Team/invite/notification/settings with role denial.
8. Dashboard/reports/CSV and responsive/keyboard smoke.

## Accessibility

- Complete primary tasks keyboard-only; visible focus; logical order; no keyboard trap.
- Dialog/sheet/popover labels, focus trap, Escape and focus return.
- Table semantics and repeated mobile-card labels; tabs use correct roles/arrow keys.
- All fields visibly labelled with associated error/hint; first invalid field focused.
- Status is icon+text, not color-only; charts have text/table alternatives.
- Mobile targets >=44x44, text >=12 px, WCAG-AA contrast.

## Performance and read evidence

- Lighthouse public home/dashboard: performance and accessibility >=90.
- Initial JS <350 kB gzipped; charts lazy-loaded.
- Measure, do not assume: dashboard <=12 reads and product list <=27 for the specified canonical scenarios.
