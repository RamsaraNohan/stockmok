# Stockmok — Final Implementation Task Register v3.0

**Status:** the work queue. Every task below is `NOT_STARTED`.
**Rule:** one task = one focused agent session = one commit. If a task cannot be finished in one session, it was written too large — split it and record the split here.
**Owner of every task:** the student (Nohan). The `TOOL` column says who executes; the student always reviews and commits.

---

## Legend

| Column | Meaning |
|---|---|
| **PRI** | `P0` submission blocker · `P1` Release-B blocker · `P2` polish |
| **REL** | `A` · `B` · `C` · `X` (infrastructure, no release) |
| **TOOL** | `CC` Claude Code · `CX` Codex · `AG` Antigravity · `ST` Student · `CW` Claude Cowork |
| **EFF** | `LOW` Sonnet-class mechanical · `MED` Sonnet-class reviewed · `HIGH` Opus-class, security/correctness critical |
| **SIZE** | XS ≤ 30 min · S ≤ 1 h · M ≤ 2 h · L ≤ 4 h · XL ≤ 1 day |
| **STATUS** | all tasks start `NOT_STARTED`; update in place as work proceeds |

**Global definition of done** — every task additionally requires: `npm run verify` green, no new ESLint suppressions, no new `any`, no secret added, one conventional commit referencing the task id.

---

# STAGE 0 — Repository baseline (Day 1)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0001 | Scaffold Vite + React + TypeScript project | P0 | X | CC | LOW | — | NFR-013 | — | `package.json`, `vite.config.ts`, `index.html`, `src/main.tsx` | `npm run dev` serves a page | S |
| SF-0002 | Configure TypeScript strictness profile | P0 | X | CC | MED | SF-0001 | NFR-011 | — | `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | `tsc --noEmit` passes with every flag from TECH-061 | S |
| SF-0003 | ESLint flat config incl. a11y + architecture rules | P0 | X | CC | MED | SF-0002 | NFR-011, NFR-016 | — | `eslint.config.js` | `eslint .` clean; importing `firebase/firestore` from `src/features` fails lint | M |
| SF-0004 | Prettier + git hooks + lint-staged | P0 | X | CC | LOW | SF-0003 | — | — | `.prettierrc`, `.lintstagedrc`, hooks | a badly formatted staged file is auto-fixed on commit | S |
| SF-0005 | Create `packages/shared` and wire path aliases | P0 | X | CC | MED | SF-0002 | NFR-011 | — | `packages/shared/**`, tsconfig paths | app imports `@stockmok/shared` and typechecks | S |
| SF-0006 | Folder skeleton `app/ui/features/services/lib/styles` | P0 | X | CC | LOW | SF-0001 | NFR-011 | — | `src/**` | folders exist with index barrels | XS |
| SF-0007 | Copy control pack into `docs/final/` | P0 | X | ST | LOW | SF-0001 | — | — | `docs/final/01..17` | all 17 documents present in the repo | XS |
| SF-0008 | Author `AGENTS.md` from spec `15` | P0 | X | CC | MED | SF-0007 | — | — | `AGENTS.md` | contains every section of `15` verbatim in intent | M |
| SF-0009 | `.gitignore`, `.env.example`, `.nvmrc` | P0 | X | CC | LOW | SF-0001 | NFR-012 | T-NFR-03 | those files | `.env*` and `*serviceAccount*.json` ignored | XS |
| SF-0010 | GitHub Actions CI: typecheck, lint, build | P0 | X | CC | MED | SF-0004 | — | T-NFR-04 | `.github/workflows/ci.yml` | CI green on the first push | M |
| SF-0011 | Create public GitHub repo, first push, verify signed-out access | P0 | X | ST | LOW | SF-0010 | ADM-003 | — | — | repo URL opens in a signed-out private window | XS |
| SF-0012 | README skeleton: setup, scripts, architecture placeholder | P0 | X | CC | LOW | SF-0011 | NFR-013 | — | `README.md` | a stranger can clone and build from it | S |

---

# STAGE 1 — Firebase bootstrap (Day 1)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0020 | Create Firebase project; **record the permanent Firestore region** | P0 | X | ST | MED | SF-0011 | — | — | README note | project exists, region written down | XS |
| SF-0021 | **Blaze decision** — enable billing or declare Profile P0 | P0 | X | ST | HIGH | SF-0020 | — | — | `01` entry | decision recorded in writing; if P0, Stages 4–16 re-planned before S2 | S |
| SF-0022 | GCP budget $5 with 50/90/100 % alerts + screenshot | P0 | X | ST | LOW | SF-0021 | — | — | `docs/evidence/budget.png` | alert email confirmed | XS |
| SF-0023 | Enable Email/Password and Google auth providers | P0 | X | ST | LOW | SF-0020 | FR-AUTH-002/003 | — | — | both visible as enabled | XS |
| SF-0024 | `firebase init` firestore + functions + hosting + emulators | P0 | X | CC | MED | SF-0020 | — | T-NFR-05 | `firebase.json`, `.firebaserc`, `functions/**` | `npm run emu` starts all four emulators | M |
| SF-0025 | Deny-all `firestore.rules` baseline + empty indexes file | P0 | X | CC | LOW | SF-0024 | SEC-012 | — | `firestore.rules`, `firestore.indexes.json` | every read and write is denied | XS |
| SF-0026 | Client Firebase init + emulator switch + amber EMULATOR ribbon | P0 | X | CC | MED | SF-0024 | — | — | `src/lib/firebase/app.ts`, `src/ui/EmulatorRibbon.tsx` | ribbon shows only when `VITE_USE_EMULATORS=true` | S |
| SF-0027 | **Throwaway `ping` callable deployed to production and called from the deployed site** | P0 | X | CC+ST | HIGH | SF-0021 | — | T-NFR-06 | `functions/src/index.ts` | a live `.web.app` page displays the server time from a real Cloud Function | M |
| SF-0028 | Add `verify`, `emu`, `seed`, `test:*`, `deploy` npm scripts | P0 | X | CC | LOW | SF-0024 | — | — | `package.json` | every script in `11` §3 runs | S |
| SF-0029 | Remove `ping`; keep the deploy pipeline | P0 | X | CC | LOW | SF-0027 | — | — | — | no unused function deployed | XS |

---

# STAGE 2 — Design system, public site, auth (Day 2)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0040 | Tailwind v4 + `@theme` design tokens | P0 | A | CC | MED | SF-0006 | NFR-016 | — | `src/styles/theme.css`, `src/styles/index.css` | every token from `17` §5 defined; contrast checked | M |
| SF-0041 | Primitives: Button, IconButton, Input, Textarea, Select, Checkbox, Switch | P0 | A | CC | MED | SF-0040 | NFR-002 | — | `src/ui/*` | all states incl. disabled/loading; `IconButton` requires `aria-label` at type level | L |
| SF-0042 | Layout primitives: Card, PageHeader, Section, Tabs, Badge, StatusPill | P0 | A | CC | LOW | SF-0040 | — | — | `src/ui/*` | six status colours render from tokens | M |
| SF-0043 | Feedback: Skeleton, EmptyState, ErrorState, InlineError, Spinner | P0 | A | CC | MED | SF-0040 | NFR-002 | T-UI-05 | `src/ui/*` | one component per required screen state | M |
| SF-0044 | Modal + ConfirmDialog on Radix Dialog | P0 | A | CC | MED | SF-0041 | NFR-009 | T-UI-07 | `src/ui/Modal.tsx`, `ConfirmDialog.tsx` | focus trapped, Esc closes, focus restored | M |
| SF-0045 | Toaster wrapper on sonner | P0 | A | CC | LOW | SF-0040 | NFR-002 | — | `src/ui/toast.ts` | success and error toasts announced to screen readers | XS |
| SF-0046 | DataTable + Pagination + TableEmptyState | P0 | A | CC | MED | SF-0042 | NFR-003 | T-UI-07 | `src/ui/DataTable.tsx` | semantic table, `<th scope>`, sortable header buttons | L |
| SF-0047 | Form wrappers: Field, FieldError, FormRow, FormActions | P0 | A | CC | MED | SF-0041 | NFR-016 | — | `src/ui/form/*` | label/error/input associated by id; error announced | M |
| SF-0048 | `AuthProvider` with tri-state status | P0 | A | CC | HIGH | SF-0026 | FR-AUTH-002 | T-AUTH-01 | `src/lib/auth/AuthProvider.tsx` | one auth subscription; `loading` never renders children | M |
| SF-0049 | Router skeleton + PublicLayout + RequireAuth + 404 | P0 | A | CC | HIGH | SF-0048 | FR-AUTH-006 | T-UI-06 | `src/app/router.tsx`, `src/app/guards/*` | unknown route shows 404; protected route redirects | M |
| SF-0050 | Public home page, all sections | P0 | A | CC | MED | SF-0042 | FR-AUTH-001 | T-UI-01 | `src/features/marketing/**` | claims match what is actually built; no Release-D promises | L |
| SF-0051 | Sign-up screen (email/password + Google) | P0 | A | CC | MED | SF-0048 | FR-AUTH-002/003 | T-AUTH-01/02 | `src/features/auth/SignUp.tsx` | account created in the Auth emulator | M |
| SF-0052 | Global login + logout + password reset | P0 | A | CC | MED | SF-0051 | FR-AUTH-004/005 | T-AUTH-03/04/05 | `src/features/auth/*` | neutral, non-enumerating error copy | M |
| SF-0053 | Branded login `/b/:handle` with all 8 states | P0 | A | CC | HIGH | SF-0052 | FR-AUTH-007/008/010 | T-AUTH-06..10 | `src/features/auth/BrandedLogin.tsx` | role selector defaults to "Detect automatically" and is optional | L |
| SF-0054 | `users/{uid}` profile bootstrap on first authenticated render | P0 | A | CC | MED | SF-0048 | — | — | `src/services/users.ts` | idempotent merge write; whitelisted fields only | S |
| SF-0055 | Stage-2 evidence screenshots | P0 | A | ST | LOW | SF-0053 | — | — | `docs/evidence/screenshots/stage-02/` | home, login, signup, all branded states captured | XS |

---

# STAGE 3 — Organization onboarding (Day 3)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0060 | `defineCommand()` framework | P0 | A | CC | HIGH | SF-0024 | SEC-002..004, SEC-008 | T-SEC-14 | `functions/src/core/defineCommand.ts` | fixed order: auth → Zod → membership → role → txn → idempotency → audit → typed error | L |
| SF-0061 | Typed error model + reason codes, client mapper | P0 | A | CC | MED | SF-0060 | — | — | `packages/shared/src/errors.ts`, `src/lib/commands/mapError.ts` | every thrown error carries a `reason`; no stack traces leak | M |
| SF-0062 | `callCommand()` typed client wrapper + `useCommand` hook | P0 | A | CC | MED | SF-0061 | — | — | `src/lib/commands/*` | operationId generated when the form opens, not on submit | M |
| SF-0063 | Handle normalisation + reserved words + unit tests | P0 | A | CC | HIGH | SF-0005 | BR-017 | T-ORG-03 | `packages/shared/src/handle.ts` + tests | `FreshFoods`→`freshfoods`; `app` rejected; 100 % branch coverage | M |
| SF-0064 | Organization Zod schemas | P0 | A | CC | MED | SF-0063 | FR-ORG-002 | — | `packages/shared/src/schemas/org.ts` | one schema used by form and command | S |
| SF-0065 | `org.create` command (atomic, 8 documents) | P0 | A | CC | HIGH | SF-0060, SF-0064 | FR-ORG-001..006 | T-ORG-01 | `functions/src/commands/org.ts` | matches the transaction table in `11` §14 exactly | L |
| SF-0066 | Handle-reservation concurrency test | P0 | A | CC | HIGH | SF-0065 | BR-017 | T-ORG-02 | `tests/integration/handle.test.ts` | two simultaneous creates → one org, one clean error, no orphan | M |
| SF-0067 | `OrgProvider` resolving handle → org → membership | P0 | A | CC | HIGH | SF-0065 | FR-ORG-007/008/010 | T-SEC-07 | `src/lib/org/OrgProvider.tsx` | membership via `onSnapshot`; suspension reflected within a second | L |
| SF-0068 | `OrgLayout` + AppShell (business name, monogram, role, nav) | P0 | A | CC | MED | SF-0067 | FR-ORG-008 | T-UI-10 | `src/app/layouts/OrgLayout.tsx`, `src/app/shell/**` | business identity prominent, never footer-only | L |
| SF-0069 | Onboarding wizard, 4 steps | P0 | A | CC | MED | SF-0065 | FR-ORG-001..003 | T-ORG-01 | `src/features/onboarding/**` | live handle normalisation, availability, immutability warning | L |
| SF-0070 | `/select-workspace` from the memberships mirror | P0 | A | CC | MED | SF-0067 | FR-ORG-009/010 | T-ORG-04 | `src/features/workspace/**` | 0 → onboarding, 1 → direct, many → selector | M |
| SF-0071 | Monogram generator (initials + token-derived colour) | P0 | A | CC | LOW | SF-0040 | FR-ORG-003 | — | `src/ui/Monogram.tsx` | deterministic for a given org id | XS |
| SF-0072 | **Codex review of `defineCommand` + `org.create`** | P0 | A | CX | HIGH | SF-0065 | — | — | `docs/qa/review-s3.md` | findings resolved or logged with a reason | M |

---

# STAGE 4 — Membership and RBAC (Day 4)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0080 | `ROLE_PERMISSIONS` table — no ambiguous cells | P0 | A | CC | HIGH | SF-0005 | BR-015 | T-SEC-17 | `packages/shared/src/permissions.ts` | every capability × role is a hard boolean | M |
| SF-0081 | `firestore.rules` v1: helpers + user zone + org core | P0 | A | CC | HIGH | SF-0080 | SEC-002..004 | T-SEC-01..07 | `firestore.rules` | every `get()` uses a path-derived orgId only | L |
| SF-0082 | Rules test harness + fixtures (2 orgs, 6 users) | P0 | A | CC | HIGH | SF-0081 | — | — | `tests/rules/helpers.ts` | one command runs the whole rules suite | M |
| SF-0083 | Rules assertions: cross-tenant denial | P0 | A | CC | HIGH | SF-0082 | SEC-003 | T-SEC-02/03/04 | `tests/rules/tenant.rules.test.ts` | ~12 assertions green | M |
| SF-0084 | Rules assertions: RBAC per role | P0 | A | CC | HIGH | SF-0082 | BR-015 | T-SEC-05/06 | `tests/rules/rbac.rules.test.ts` | allowed roles pass, all others fail | M |
| SF-0085 | Rules assertions: immutability + deny-by-default + directory list | P0 | A | CC | HIGH | SF-0082 | SEC-011, SEC-005 | T-SEC-08/09/16 | `tests/rules/immutable.rules.test.ts` | audit update/delete denied; directory `list` denied; unknown path denied | M |
| SF-0086 | Invitation schema + token hashing utility | P0 | A | CC | HIGH | SF-0005 | FR-TEAM-002 | — | `packages/shared/src/schemas/invite.ts` | only the hash is ever persisted | S |
| SF-0087 | `team.createInvitation` (returns the raw token once) | P0 | A | CC | HIGH | SF-0086 | FR-TEAM-001/002 | T-ORG-06 | `functions/src/commands/team.ts` | token never logged, never re-readable | M |
| SF-0088 | `team.acceptInvitation` (email-bound, expiring, single-use) | P0 | A | CC | HIGH | SF-0087 | FR-TEAM-003 | T-ORG-06/07/08 | same | wrong email, expired and reused all rejected with distinct reasons | L |
| SF-0089 | `team.changeMemberRole` + Owner protection | P0 | A | CC | HIGH | SF-0080 | FR-TEAM-006/007 | T-ORG-05 | same | Admin cannot touch the canonical Owner | M |
| SF-0090 | `team.setMemberStatus` (suspend / remove) | P0 | A | CC | HIGH | SF-0089 | FR-TEAM-004/005 | T-SEC-07 | same | suspended user denied by rules and by every command | M |
| SF-0091 | `users/{uid}/memberships` mirror maintained by all team commands | P0 | A | CC | HIGH | SF-0090 | FR-ORG-009 | — | same | mirror written in the same transaction; drift test green | S |
| SF-0092 | `team.revokeInvitation` | P1 | A | CC | LOW | SF-0087 | FR-TEAM-001 | T-ORG-08 | same | revoked token cannot be accepted | XS |
| SF-0093 | Team screen: list, invite, copy link, change role, suspend, remove | P0 | A | CC | MED | SF-0090 | FR-TEAM-001..009 | T-ORG-05..08 | `src/features/team/**` | Owner row visibly protected | L |
| SF-0094 | `/invite/:token` acceptance screen | P0 | A | CC | MED | SF-0088 | FR-TEAM-003 | T-ORG-06 | `src/features/invite/**` | shows org name and role before sign-in | M |
| SF-0095 | Role-aware sidebar + `RequireRole` guard | P0 | A | CC | HIGH | SF-0080 | FR-TEAM-009 | T-UI-06 | `src/app/shell/Sidebar.tsx`, `src/app/guards/RequireRole.tsx` | hidden nav is convenience; direct URL still denied server-side | M |
| SF-0096 | **Codex security review of `firestore.rules`** | P0 | A | CX | HIGH | SF-0085 | — | — | `docs/qa/review-s4.md` | every finding resolved | M |

---

# STAGE 5 — Inventory master data (Day 5)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0110 | Product / Category / Warehouse Zod schemas + types | P0 | A | CC | MED | SF-0005 | FR-INV-001..006 | — | `packages/shared/src/schemas/inventory.ts` | shared by forms, rules validation and commands | M |
| SF-0111 | Category client CRUD + rules + service | P0 | A | CC | LOW | SF-0110 | FR-INV-002 | T-CRUD-06 | `src/services/categories.ts`, rules block | inventory writers only; others denied | S |
| SF-0112 | Warehouse client create/update + rules (archive blocked) | P0 | A | CC | MED | SF-0110 | FR-INV-003 | T-CRUD-07 | `src/services/warehouses.ts`, rules block | a client attempt to set `ARCHIVED` is denied | M |
| SF-0113 | `product.create` with `productSkuIndex` uniqueness transaction | P0 | A | CC | HIGH | SF-0110 | FR-INV-004 | T-CRUD-01/05 | `functions/src/commands/product.ts` | concurrent duplicate SKUs → exactly one succeeds | L |
| SF-0114 | `product.update` incl. SKU change and cost revaluation | P0 | A | CC | HIGH | SF-0113 | FR-INV-001 | T-CRUD-03 | same | old index removed, new created, `stockValueMinor` recomputed | L |
| SF-0115 | `product.setStatus` archive/restore + audit | P0 | A | CC | MED | SF-0113 | FR-INV-008/009 | T-CRUD-04/12 | same | archived product hidden by default, blocked in new POs, history intact | M |
| SF-0116 | `warehouse.archive` with in-transaction bounded queries | P0 | A | CC | HIGH | SF-0112 | FR-INV-010/011, BR-014 | T-CRUD-08/09 | `functions/src/commands/warehouse.ts` | non-zero stock or open receiving both block; race-free | L |
| SF-0117 | Product list: search, filters, sort, cursor pagination | P0 | A | CC | MED | SF-0113 | FR-INV-007, NFR-003 | T-CRUD-02/10/11 | `src/features/inventory/products/List.tsx` | 25 rows/page, no duplicates or gaps across pages | L |
| SF-0118 | Product create/edit form | P0 | A | CC | MED | SF-0113 | FR-INV-001 | T-CRUD-01/03 | `.../ProductForm.tsx` | inline validation from the shared schema | L |
| SF-0119 | Product detail with tabs | P0 | A | CC | MED | SF-0117 | FR-INV-012 | T-CRUD-02 | `.../ProductDetail.tsx` | Overview / Stock / Suppliers / Activity | L |
| SF-0120 | Category and Warehouse management screens | P0 | A | CC | LOW | SF-0111 | FR-INV-002/003 | T-CRUD-06/07 | `src/features/inventory/**` | inline create/edit, archive with confirmation | M |
| SF-0121 | Indexes IDX-01..03, IDX-08..10 | P0 | A | CC | LOW | SF-0117 | NFR-004 | T-NFR-02 | `firestore.indexes.json` | every list query runs with no missing-index error | S |
| SF-0122 | CRUD evidence screenshots (CW-04..07) | P0 | A | ST | LOW | SF-0120 | — | — | `docs/evidence/screenshots/stage-05/` | create, read, update, archive each captured | XS |

---

# STAGE 6 — Stock ledger (Day 6)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0130 | Branded `Milli` quantity utilities + 100 % unit tests | P0 | A | CC | HIGH | SF-0005 | FR-STOCK-013, NFR-008 | T-INT-07 | `packages/shared/src/quantity.ts` + tests | a raw decimal cannot be assigned to a `…Milli` field (compile error) | M |
| SF-0131 | Money utilities + rounding + unit tests | P0 | A | CC | HIGH | SF-0005 | NFR-007 | — | `packages/shared/src/money.ts` + tests | integer-only arithmetic; boundary rounding covered | M |
| SF-0132 | `deriveStockStatus` with explicit precedence + tests | P0 | A | CC | HIGH | SF-0130 | FR-STOCK-009/010 | T-STOCK-12 | `packages/shared/src/stock.ts` | out-of-stock beats low; `minimum = 0` never low; exactly-minimum not low | S |
| SF-0133 | `idempotency.ts` — receipt read first, payload hash | P0 | A | CC | HIGH | SF-0060 | FR-STOCK-012, BR-005 | T-INT-04 | `functions/src/core/idempotency.ts` | replay with a different payload is rejected, not silently accepted | M |
| SF-0134 | `audit.ts` writer | P0 | A | CC | MED | SF-0060 | FR-AUD-001/004 | T-AUD-01..04 | `functions/src/core/audit.ts` | server timestamp; safe metadata only | S |
| SF-0135 | `notify.ts` bounded recipient fan-out | P0 | A | CC | MED | SF-0060 | FR-NOTIFY-001 | T-NOTIFY-01 | `functions/src/core/notify.ts` | recipient query limited to 50; resolved before any write | M |
| SF-0136 | `stock.recordOpeningBalance` | P0 | A | CC | HIGH | SF-0133 | FR-STOCK-014 | T-STOCK-01 | `functions/src/commands/stock.ts` | movement + balance + summary + audit + receipt, atomic | L |
| SF-0137 | `stock.adjust` incl. reason and negative-result rejection | P0 | A | CC | HIGH | SF-0136 | FR-STOCK-006/008 | T-STOCK-02..05 | same | per-warehouse negative result rejected; reason mandatory | L |
| SF-0138 | Low-stock notification on status transition only | P0 | A | CC | MED | SF-0137 | FR-NOTIFY-001 | T-NOTIFY-01 | same | ten partial receipts produce one notification | S |
| SF-0139 | `stockValueMinor` maintenance inside stock commands | P0 | A | CC | HIGH | SF-0137 | FR-DASH-001 | T-REPORT-05 | same | inventory value tracks both quantity and cost changes | M |
| SF-0140 | Stock adjustment modal with Current → Change → Result | P0 | A | CC | MED | SF-0137 | FR-STOCK-007 | T-STOCK-04 | `src/features/stock/AdjustStockDialog.tsx` | submit disabled while pending; duplicate click is safe | L |
| SF-0141 | Opening-balance flow on product detail | P0 | A | CC | MED | SF-0136 | FR-STOCK-014 | T-STOCK-01 | `src/features/stock/**` | offered only when no movement exists yet | M |
| SF-0142 | Movement history screen + product-scoped view | P0 | A | CC | MED | SF-0136 | FR-STOCK-011 | T-CRUD-02 | `src/features/stock/Movements.tsx` | filters by product, warehouse, type, date; paginated | L |
| SF-0143 | Ledger property test T-INT-01/02/03 | P0 | A | CC | HIGH | SF-0137 | INV-03/04 | T-INT-01..03 | `tests/integration/ledger.test.ts` | hundreds of random commands with replays reconcile exactly every step | L |
| SF-0144 | Transaction-rollback test | P0 | A | CC | HIGH | SF-0137 | INV-05 | T-INT-05 | `tests/integration/rollback.test.ts` | no movement without a balance update, and vice versa | M |
| SF-0145 | Concurrency test: parallel adjustments, no lost update | P0 | A | CC | HIGH | SF-0137 | BR-004 | T-STOCK-10 | `tests/integration/concurrency.test.ts` | N parallel +1s produce exactly +N | M |
| SF-0146 | Indexes IDX-05..07 | P0 | A | CC | LOW | SF-0142 | NFR-004 | — | `firestore.indexes.json` | history queries run cleanly | XS |
| SF-0147 | **Codex review of stock commands + idempotency** | P0 | A | CX | HIGH | SF-0143 | — | — | `docs/qa/review-s6.md` | every finding resolved before Stage 7 | M |

---

# STAGE 7 — Private partners (Day 7 am)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0160 | PrivatePartner schema + rules | P0 | A | CC | MED | SF-0110 | FR-PART-001..003 | T-PART-01/02 | `packages/shared/src/schemas/partner.ts` | partner writers only | S |
| SF-0161 | Partner service + list with type/status filters | P0 | A | CC | LOW | SF-0160 | FR-PART-001/002 | T-PART-01/02 | `src/services/partners.ts` | supplier and buyer tabs share one entity | M |
| SF-0162 | Partner create/edit form | P0 | A | CC | LOW | SF-0161 | FR-PART-003 | T-PART-01 | `src/features/partners/**` | contacts and notes captured | M |
| SF-0163 | Partner detail: contacts, status, related POs | P0 | A | CC | LOW | SF-0162 | FR-PART-005 | T-PART-03 | same | history survives deactivation | M |
| SF-0164 | Private vs Connected tab structure with a B-pending empty state | P0 | A | CC | LOW | SF-0161 | FR-PART-006 | T-PART-04 | same | Private is not presented as a fallback | S |
| SF-0165 | Deactivated partner blocked in new POs | P0 | A | CC | LOW | SF-0163 | FR-PART-005 | T-PART-05 | same | selector excludes deactivated partners | XS |
| SF-0166 | Index IDX-10 | P0 | A | CC | LOW | SF-0161 | NFR-004 | — | `firestore.indexes.json` | tabs query cleanly | XS |

---

# STAGE 8 — Private purchase orders (Day 7 pm)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0170 | PO + PO-item schemas; state machine as a transition table | P0 | A | CC | HIGH | SF-0130 | FR-PO-003 | T-PPO-01 | `packages/shared/src/{schemas/po.ts,stateMachines.ts}` | illegal transitions unrepresentable; table unit-tested | M |
| SF-0171 | Draft PO rules (private + DRAFT only, field-restricted) | P0 | A | CC | HIGH | SF-0170 | FR-PO-001 | T-SEC-06 | `firestore.rules` | non-draft or connected updates denied | M |
| SF-0172 | Draft PO create/edit service and builder UI | P0 | A | CC | MED | SF-0171 | FR-PO-001/002 | T-PPO-01/02 | `src/features/procurement/**` | supplier → items → delivery → review | L |
| SF-0173 | PO number counter allocation inside the transaction | P0 | A | CC | HIGH | SF-0060 | — | T-PPO-01 | `functions/src/commands/po.ts` | unique under concurrency | M |
| SF-0174 | `po.order` with snapshot freezing and validation | P0 | A | CC | HIGH | SF-0173 | FR-PO-002/005 | T-PPO-02/03/04/12 | same | zero-line, bad quantity, archived product, inactive supplier all rejected | L |
| SF-0175 | `po.cancel` with the no-cancel-after-receipt rule | P0 | A | CC | MED | SF-0174 | FR-PO-004 | T-PPO-09/10/11 | same | cancel after partial receipt rejected | M |
| SF-0176 | PO list with private/connected tabs and status filter | P0 | A | CC | MED | SF-0174 | FR-PO-001 | T-PPO-01 | `src/features/procurement/POList.tsx` | paginated, indexed | M |
| SF-0177 | PO detail with actor-attributed timeline | P0 | A | CC | MED | SF-0176 | FR-PO-011 | T-PPO-04 | `.../PODetail.tsx` | **no fake in-platform supplier acceptance** for private POs | L |
| SF-0178 | Snapshot-immutability test | P0 | A | CC | HIGH | SF-0174 | BR-012 | T-PPO-12 | `tests/integration/po-snapshot.test.ts` | renaming the product later leaves the PO unchanged | S |
| SF-0179 | Indexes IDX-11..13 | P0 | A | CC | LOW | SF-0176 | NFR-004 | — | `firestore.indexes.json` | list and KPI queries run | XS |

---

# STAGE 9 — Receiving (Day 8 am)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0190 | `po.receive` full transaction | P0 | A | CC | HIGH | SF-0174, SF-0137 | FR-PO-006..010 | T-PPO-05/06 | `functions/src/commands/po.ts` | movements, balances, summaries, line quantities, status, history, audit, receipt — all atomic | XL |
| SF-0191 | Over-receipt rejection | P0 | A | CC | HIGH | SF-0190 | FR-PO-007, INV-12 | T-PPO-07 | same | 11 against 10 outstanding rejected with `OVER_RECEIPT` | S |
| SF-0192 | Receipt idempotency test | P0 | A | CC | HIGH | SF-0190 | FR-PO-009 | T-PPO-08, T-INT-04 | `tests/integration/receive.test.ts` | replay adds no stock | M |
| SF-0193 | Receiving screen, mobile-first | P0 | A | CC | MED | SF-0190 | FR-PO-006 | T-UI-04 | `src/features/receiving/**` | current → after, outstanding-after, sticky confirm, no forced horizontal scroll | XL |
| SF-0194 | Persist `receivingWarehouseId` for the archive dependency | P0 | A | CC | MED | SF-0190 | FR-INV-011 | T-CRUD-09 | same | warehouse archive detects the open receipt | S |
| SF-0195 | Receipt history on PO detail | P0 | A | CC | LOW | SF-0190 | FR-PO-006 | T-PPO-05 | `.../PODetail.tsx` | each receipt event listed with actor and time | S |

---

# STAGE 10 — Dashboard, reports, notifications (Day 8 pm)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0200 | Analytics service using `count()` and `sum()` aggregations | P0 | A | CC | HIGH | SF-0139 | FR-DASH-003/007 | T-REPORT-01..05 | `src/services/analytics.ts` | no KPI stored as an editable document | L |
| SF-0201 | Dashboard KPI row | P0 | A | CC | MED | SF-0200 | FR-DASH-001 | T-REPORT-01..05 | `src/features/dashboard/**` | five KPIs, each with a loading and an error state | M |
| SF-0202 | Needs Attention panel with deep links | P0 | A | CC | MED | SF-0201 | FR-DASH-002 | T-REPORT-08 | same | every item lands on the correct filtered screen | M |
| SF-0203 | Recent Activity panel | P0 | A | CC | LOW | SF-0134 | FR-DASH-001 | — | same | reads audit/movements, paginated | S |
| SF-0204 | Empty dashboard with a setup checklist | P0 | A | CC | LOW | SF-0201 | NFR-002 | T-UI-05 | same | new organization sees guidance, not zeros | S |
| SF-0205 | Three lazy-loaded charts with text summaries | P2 | A | CC | LOW | SF-0201 | FR-DASH-001 | T-UI-07 | `src/features/dashboard/charts/**` | **first thing cut under time pressure** | M |
| SF-0206 | Stock-on-Hand report + CSV export | P0 | A | CC | MED | SF-0200 | FR-DASH-004 | T-REPORT-06 | `src/features/reports/**` | matches balances exactly | L |
| SF-0207 | Purchase-Order report | P0 | A | CC | MED | SF-0200 | FR-DASH-005/006 | T-REPORT-07 | same | status and date filters | M |
| SF-0208 | Notifications screen + unread badge + mark read | P0 | A | CC | MED | SF-0135 | FR-NOTIFY-001 | T-NOTIFY-01/02 | `src/features/notifications/**` | client may write only the `read` flag | M |
| SF-0209 | Activity tab on product and PO detail | P0 | A | CC | LOW | SF-0134 | FR-AUD-002 | T-AUD-01..04 | existing detail screens | audit rows rendered as readable sentences | S |
| SF-0210 | Index IDX-17..19 | P0 | A | CC | LOW | SF-0208 | NFR-004 | — | `firestore.indexes.json` | notification and audit queries run | XS |

---

# STAGE 11 — Release A QA gate (Day 9)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0220 | Complete the rules suite to all ~45 assertions | P0 | A | CC | HIGH | SF-0085 | SEC-* | T-SEC-01..17 | `tests/rules/**` | every threat-model row covered | L |
| SF-0221 | Complete command integration tests: 8 cases × every A command | P0 | A | CC | HIGH | SF-0190 | SEC-008 | T-INT-*, per-command | `tests/integration/**` | unauth, wrong role, wrong tenant, bad payload, bad state, replay, hash mismatch, happy path | XL |
| SF-0222 | Component tests for the 5 risky components | P0 | A | CC | MED | SF-0193 | NFR-002 | T-UI-05 | `src/**/*.test.tsx` | adjustment, receiving, nav, list states, form errors | L |
| SF-0223 | `scripts/seed.ts` producing the canonical dataset | P0 | A | CC | MED | SF-0190 | NFR-014 | T-NFR-09 | `scripts/seed.ts` | reproduces the exact numbers in `16` §7 from empty | L |
| SF-0224 | Playwright config + E2E specs 1–3 | P0 | A | CC | MED | SF-0223 | — | T-UI-01 | `e2e/*.spec.ts`, `playwright.config.ts` | traces, video and screenshots retained on failure | L |
| SF-0225 | E2E specs 4–6 (PO cycle, role denial, invitation) | P0 | A | CC | MED | SF-0224 | — | T-UI-06 | `e2e/**` | run headless in CI against emulators | L |
| SF-0226 | Antigravity role walkthrough: 7 roles × key screens | P0 | A | AG | MED | SF-0095 | FR-TEAM-009 | T-UI-06/10 | `docs/qa/role-walkthrough.md` | every unauthorised action denied, not merely hidden | L |
| SF-0227 | Antigravity responsive pass 390/768/1280 | P0 | A | AG | LOW | SF-0193 | NFR-001 | T-UI-02/03/04 | `docs/qa/responsive.md` | screenshots per breakpoint | M |
| SF-0228 | **Codex full security review of Release A** | P0 | A | CX | HIGH | SF-0221 | — | — | `docs/qa/review-release-a.md` | zero Critical, zero High remaining | XL |
| SF-0229 | Fix every Critical and High from reviews and tests | P0 | A | CC | HIGH | SF-0228 | — | — | various | defect log closed | XL |
| SF-0230 | Write `docs/qa/test-run-release-a.md` | P0 | A | ST | LOW | SF-0229 | — | — | that file | date, commit, environment, results, open issues | S |
| SF-0231 | **GATE-A go/no-go decision on Release B, in writing** | P0 | A | ST | HIGH | SF-0230 | — | — | `docs/qa/gate-a.md` | explicit decision recorded before any B task starts | XS |

---

# STAGE 12 — Business connections (Day 10 am)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0240 | Connection schema + deterministic id + state machine | P1 | B | CC | HIGH | SF-0231 | FR-NET-006 | T-NET-04 | `packages/shared/src/schemas/connection.ts` | `buyer__supplier` id; self-connection rejected | M |
| SF-0241 | `connection.request` with canonical + dual projections | P1 | B | CC | HIGH | SF-0240 | FR-NET-004 | T-NET-03/04 | `functions/src/commands/connection.ts` | duplicate active request impossible by construction | L |
| SF-0242 | `connection.respond` accept/reject | P1 | B | CC | HIGH | SF-0241 | FR-NET-005 | T-NET-05/06 | same | both projections updated atomically | M |
| SF-0243 | `connection.disable` preserving history | P1 | B | CC | MED | SF-0242 | FR-NET-018 | T-NET-12/13 | same | new work blocked, history readable | M |
| SF-0244 | Rules: closed canonical zone + readable projections | P1 | B | CC | HIGH | SF-0241 | SEC-010 | T-SEC-12 | `firestore.rules` | a third org cannot read either projection | M |
| SF-0245 | Discovery by exact handle | P1 | B | CC | MED | SF-0240 | FR-NET-002 | T-NET-01/02 | `src/features/network/Discover.tsx` | unknown handle → safe no-result | M |
| SF-0246 | Connections list + detail + incoming requests | P1 | B | CC | MED | SF-0242 | FR-NET-004/005 | T-NET-03/05 | `src/features/network/connections/**` | accept/reject inline | L |
| SF-0247 | Connection notifications both directions | P1 | B | CC | MED | SF-0135 | FR-NOTIFY-002 | T-NOTIFY-03 | `functions/src/commands/connection.ts` | supplier owners/admins notified on request | S |
| SF-0248 | Index IDX-14 | P1 | B | CC | LOW | SF-0246 | NFR-004 | — | `firestore.indexes.json` | list query runs | XS |

---

# STAGE 13 — Partner catalog (Day 10 pm)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0260 | PartnerCatalogItem schema + partner-SKU normalisation | P1 | B | CC | HIGH | SF-0240 | FR-NET-008 | T-NET-07 | `packages/shared/src/schemas/catalog.ts` | uniqueness within the published catalog | M |
| SF-0261 | `partnerCatalog.publish` with a strict field allow-list | P1 | B | CC | HIGH | SF-0260 | BR-021 | T-SEC-16 | `functions/src/commands/partnerCatalog.ts` | copies only allow-listed fields; test asserts the exact key set | L |
| SF-0262 | `partnerCatalog.unpublish` | P1 | B | CC | LOW | SF-0261 | FR-NET-008 | T-NET-14 | same | unpublished item disappears from buyer lookups | XS |
| SF-0263 | `partnerCatalog.list` callable (connection-authorized) | P1 | B | CC | HIGH | SF-0261 | FR-NET-009, SEC-009 | T-SEC-11 | same | unconnected caller → `permission-denied` | M |
| SF-0264 | `partnerCatalog.lookupBySku` callable | P1 | B | CC | HIGH | SF-0263 | FR-NET-010 | T-NET-08 | same | exact normalised match only | M |
| SF-0265 | Supplier publishing table + dialog with the disclosure statement | P1 | B | CC | MED | SF-0261 | FR-NET-008 | T-NET-07 | `src/features/network/catalog/**` | states plainly what buyers can and cannot see | L |
| SF-0266 | Buyer catalog browse view | P1 | B | CC | MED | SF-0263 | FR-NET-009 | T-NET-07 | same | backed by the callable, paginated | M |
| SF-0267 | Cross-tenant leak test suite | P1 | B | CC | HIGH | SF-0263 | SEC-009 | T-SEC-10 | `tests/rules/partner.rules.test.ts` | buyer denied on supplier products, balances, movements, members, partners, settings, audit | L |
| SF-0268 | Index IDX-16 | P1 | B | CC | LOW | SF-0265 | NFR-004 | — | `firestore.indexes.json` | catalog queries run | XS |

---

# STAGE 14 — Product mapping (Day 11 am)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0280 | Mapping schema + conversion validation | P1 | B | CC | HIGH | SF-0130 | FR-NET-013, BR-010 | T-NET-10 | `packages/shared/src/schemas/mapping.ts` | factor ≤ 0 rejected; integer milli-factor | M |
| SF-0281 | `mapping.create` with the 7-step server re-validation | P1 | B | CC | HIGH | SF-0264 | FR-NET-014/015/016 | T-NET-09/11/14 | `functions/src/commands/mapping.ts` | stable IDs stored, typed SKU only used as a lookup key | L |
| SF-0282 | `mapping.disable` | P1 | B | CC | LOW | SF-0281 | FR-NET-018 | T-NET-12 | same | historical mappings remain readable | XS |
| SF-0283 | Mapping wizard steps 1–2 (supplier + SKU lookup) | P1 | B | CC | MED | SF-0264 | FR-NET-010/011 | T-NET-08 | `src/features/network/mappings/**` | searching, found and not-found states | L |
| SF-0284 | Wizard steps 3–5 (semantic confirm, conversion, save) | P1 | B | CC | HIGH | SF-0283 | FR-NET-012/013 | T-NET-09/10/11 | same | Save disabled until every condition passes | L |
| SF-0285 | All 7 mapping error states | P1 | B | CC | MED | SF-0284 | — | T-NET-08..14 | same | each state screenshotted for the report | M |
| SF-0286 | Mappings list + product-detail mapping section | P1 | B | CC | LOW | SF-0281 | FR-NET-016 | T-NET-11 | same | status visible per mapping | M |
| SF-0287 | Index IDX-15 | P1 | B | CC | LOW | SF-0286 | NFR-004 | — | `firestore.indexes.json` | list runs | XS |

---

# STAGE 15 — Connected purchase orders (Days 11 pm – 12)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0300 | Connected PO schema + state machine + dual-identity line snapshot | P1 | B | CC | HIGH | SF-0280 | FR-CPO-002/005 | T-CPO-01 | `packages/shared/src/schemas/cpo.ts` | supplier and buyer representations both required | M |
| SF-0301 | Connected draft in the buyer tenant only | P1 | B | CC | HIGH | SF-0300 | FR-CPO-001 | T-CPO-01/02 | `src/features/procurement/connected/**` | draft never visible to the supplier | L |
| SF-0302 | `cpo.submit` — canonical + both projections + snapshot freeze | P1 | B | CC | HIGH | SF-0301 | FR-CPO-005, INV-09 | T-CPO-03/14 | `functions/src/commands/cpo.ts` | later product/mapping edits do not alter the snapshot | XL |
| SF-0303 | `cpo.respond` accept/reject | P1 | B | CC | HIGH | SF-0302 | FR-CPO-003 | T-CPO-04/05 | same | supplier-side authorization only | M |
| SF-0304 | `cpo.cancel` for DRAFT/SUBMITTED only | P1 | B | CC | MED | SF-0302 | FR-CPO-004 | T-CPO-06/07 | same | cancel after ACCEPTED blocked | S |
| SF-0305 | `cpo.ship` — supplier outbound movements only | P1 | B | CC | HIGH | SF-0303 | FR-CPO-008, INV-10 | T-CPO-08/09/13 | same | buyer stock provably unchanged | L |
| SF-0306 | `cpo.receive` — buyer inbound, unit conversion, partial | P1 | B | CC | HIGH | SF-0305 | FR-CPO-010/011, INV-11 | T-CPO-10/11/12/13 | same | outstanding tracked in supplier units; over-receipt blocked | XL |
| SF-0307 | Buyer connected-PO views (list, builder, detail) | P1 | B | CC | MED | SF-0302 | FR-CPO-001 | T-CPO-01/03 | `src/features/procurement/connected/**` | dual representation on every line | L |
| SF-0308 | Supplier connected-PO views (inbox, detail, accept/ship) | P1 | B | CC | MED | SF-0303 | FR-CPO-006 | T-CPO-04/08 | same | supplier sees only legitimate shared fields | L |
| SF-0309 | Shared, actor-attributed timeline on both sides | P1 | B | CC | MED | SF-0302 | FR-CPO-014 | T-CPO-03 | same | identical history, correct attribution | M |
| SF-0310 | Connected receiving screen (supplier units → base units) | P1 | B | CC | HIGH | SF-0306 | FR-CPO-011 | T-CPO-10 | `src/features/receiving/**` | conversion preview visible before confirming | L |
| SF-0311 | Connected PO notifications on every transition | P1 | B | CC | MED | SF-0135 | FR-NOTIFY-002 | T-NOTIFY-03 | `functions/src/commands/cpo.ts` | counterparty roles notified | M |
| SF-0312 | Ledger-separation test (INV-10, INV-11) | P1 | B | CC | HIGH | SF-0306 | INV-10/11 | T-CPO-08/09 | `tests/integration/cpo-ledger.test.ts` | neither party's ledger moves from the other's action | M |
| SF-0313 | **Codex review of all `cpo.*` commands** | P1 | B | CX | HIGH | SF-0312 | — | — | `docs/qa/review-s15.md` | findings resolved | L |

---

# STAGE 16 — Release B QA gate (Day 12)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0330 | Complete P1 rules assertions | P1 | B | CC | HIGH | SF-0313 | SEC-009..015 | T-SEC-10..15 | `tests/rules/**` | all green | L |
| SF-0331 | Complete P1 command integration tests | P1 | B | CC | HIGH | SF-0313 | — | T-NET-*, T-CPO-* | `tests/integration/**` | 8 cases × every B command | XL |
| SF-0332 | E2E spec 7: two-organization round trip | P1 | B | CC | HIGH | SF-0331 | — | T-UI-09 | `e2e/connected.spec.ts` | connect → publish → map → order → accept → ship → receive | L |
| SF-0333 | Antigravity buyer/supplier walkthroughs | P1 | B | AG | MED | SF-0332 | — | T-UI-09 | `docs/qa/b-walkthrough.md` | both perspectives captured | M |
| SF-0334 | Fix every Critical and High | P1 | B | CC | HIGH | SF-0333 | — | — | various | zero remaining | L |
| SF-0335 | Disable in the UI anything that cannot be made green | P1 | B | CC | HIGH | SF-0334 | — | — | various | nothing broken is shipped visible | M |
| SF-0336 | Write `docs/qa/test-run-release-b.md` | P1 | B | ST | LOW | SF-0335 | — | — | that file | dated, commit-stamped | S |
| SF-0337 | **FEATURE FREEZE declaration** | P0 | X | ST | HIGH | SF-0336 | — | — | `docs/qa/freeze.md` | no new feature after this point | XS |

---

# STAGE 17 — Polish, responsive, accessibility (Day 13 am)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0350 | Screen-state audit across every P0/P1 screen | P0 | X | AG | MED | SF-0337 | NFR-002 | T-UI-05 | `docs/qa/state-audit.md` | loading, empty, error, success, denied all present | L |
| SF-0351 | Responsive sweep at four breakpoints | P0 | X | CC+AG | MED | SF-0350 | NFR-001 | T-UI-02/03/04 | various | six priority flows usable at 390 px | L |
| SF-0352 | Keyboard and focus pass incl. skip link | P0 | X | CC | MED | SF-0350 | NFR-016 | T-UI-07 | various | full task completion without a mouse | M |
| SF-0353 | Contrast audit against tokens | P0 | X | ST | LOW | SF-0040 | NFR-016 | T-UI-07 | `docs/evidence/contrast.md` | WCAG AA on text and status colours | S |
| SF-0354 | Global error boundary with recovery | P0 | X | CC | MED | SF-0049 | NFR-015 | T-UI-08 | `src/app/ErrorBoundary.tsx` | a thrown render error shows a recoverable screen | S |
| SF-0355 | Remove dead routes, TODOs, console statements | P0 | X | CC | LOW | SF-0337 | NFR-015 | T-UI-08 | various | zero console output on the canonical flow | M |
| SF-0356 | Lighthouse runs on home + dashboard | P0 | X | ST | LOW | SF-0355 | — | T-PERF-01 | `docs/evidence/performance/` | Performance ≥ 90, Accessibility ≥ 90 | S |
| SF-0357 | Bundle analysis + lazy-load charts | P0 | X | CC | MED | SF-0356 | — | T-PERF-02 | `docs/evidence/performance/` | initial JS < 350 kB gzipped | M |
| SF-0358 | Firestore read-count measurement per screen | P0 | X | ST | LOW | SF-0356 | NFR-003 | T-PERF-03 | `docs/evidence/performance/reads.md` | dashboard ≤ 12 reads, product list ≤ 27 | S |

---

# STAGE 18 — Production deployment (Day 13 pm)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0370 | Deploy indexes, wait for build | P0 | X | ST | MED | SF-0357 | NFR-004 | T-NFR-02 | — | all indexes `Enabled` in the console | S |
| SF-0371 | Deploy rules | P0 | X | ST | HIGH | SF-0370 | SEC-* | T-NFR-08 | — | production rules identical to the tested file | XS |
| SF-0372 | Deploy functions | P0 | X | ST | HIGH | SF-0371 | — | T-NFR-07 | — | every command deployed, no build error | M |
| SF-0373 | Build and deploy hosting | P0 | X | ST | MED | SF-0372 | NFR-013 | T-NFR-06 | — | live URL loads | S |
| SF-0374 | Add Hosting domains to Auth Authorized Domains | P0 | X | ST | HIGH | SF-0373 | FR-AUTH-003 | T-NFR-07 | — | **Google sign-in works in production** | XS |
| SF-0375 | Seed production with the canonical demo dataset | P0 | X | ST | MED | SF-0223 | NFR-014 | T-NFR-09 | — | dashboard matches the seed table | M |
| SF-0376 | Production smoke checklist | P0 | X | ST | HIGH | SF-0375 | NFR-005 | T-NFR-06..08 | `docs/qa/production-smoke.md` | full private-PO cycle completed live | M |
| SF-0377 | Signed-out client denial check against production | P0 | X | ST | HIGH | SF-0376 | SEC-012 | T-SEC-01 | same file | scripted proof that private reads are denied | S |
| SF-0378 | Rehearse `firebase hosting:rollback` | P0 | X | ST | LOW | SF-0373 | — | — | — | rollback and re-deploy both proven | XS |
| SF-0379 | Finalise README with architecture and live URL | P0 | X | CC | MED | SF-0376 | NFR-013 | T-NFR-04 | `README.md` | a stranger can reproduce the whole setup | M |

---

# STAGE 19 — Final QA and evidence (Day 14 am)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0390 | 15-step final regression against production | P0 | X | ST | HIGH | SF-0379 | — | full list | `docs/qa/final-regression.md` | passes with **no manual database correction** | L |
| SF-0391 | Capture every screenshot listed in `16` §4 | P0 | X | ST+AG | MED | SF-0390 | — | — | `docs/evidence/screenshots/**` | complete set, named consistently | L |
| SF-0392 | Export test outputs, coverage and CI history | P0 | X | ST | LOW | SF-0390 | — | — | `docs/evidence/tests/**` | dated artifacts | S |
| SF-0393 | Architecture, data-model and security diagrams | P0 | X | CC+ST | MED | SF-0390 | — | — | `docs/evidence/architecture/**` | three diagrams matching the built system | L |
| SF-0394 | Honest `known-issues.md` | P0 | X | ST | MED | SF-0390 | — | — | `docs/qa/known-issues.md` | every known limitation stated | S |
| SF-0395 | Record the demo per the script in `16` §9 | P0 | X | ST | MED | SF-0391 | — | — | `docs/evidence/demo/**` | warm functions first; one clean take | L |
| SF-0396 | **Verify GitHub repository loads signed out** | P0 | X | ST | HIGH | SF-0390 | ADM-003 | — | screenshot | zero-mark risk closed | XS |

---

# STAGE 20 — Report and submission (Day 14 pm)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Expected files | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SF-0400 | Draft the report to the `16` §2 structure | P0 | X | ST | HIGH | SF-0395 | CW-19/20 | — | `report/Stockmok_Report.docx` | student's own words throughout | XL |
| SF-0401 | Technologies section explaining *why*, from `10` | P0 | X | ST | HIGH | SF-0400 | CW-19 | — | same | trade-offs and rejected alternatives included | L |
| SF-0402 | Problems-and-solutions section from the running log | P0 | X | ST | HIGH | SF-0400 | CW-19 | — | same | ≥ 8 real problems with real resolutions | L |
| SF-0403 | Testing, security, performance, adaptability evidence sections | P0 | X | ST | HIGH | SF-0392 | CW-17/18 | — | same | numbers and artifacts, not adjectives | L |
| SF-0404 | Reflection section | P0 | X | ST | HIGH | SF-0402 | CW-19 | — | same | what was learned, what would change | M |
| SF-0405 | Individual-contribution evidence | P0 | X | ST | MED | SF-0392 | CW-10 | — | same | commit history, CI runs, decision log, AI-assistance statement | M |
| SF-0406 | Insert GitHub URL and live URL | P0 | X | ST | LOW | SF-0396 | CW-15, ADM-004 | — | same | both links tested from the document | XS |
| SF-0407 | References and citation check | P0 | X | ST | MED | SF-0403 | CW-21, ADM-007 | — | same | Plymouth referencing style, all sources listed | M |
| SF-0408 | Turnitin / Draft Coach originality check | P0 | X | ST | MED | SF-0407 | CW-21 | — | report | reviewed and addressed | M |
| SF-0409 | **Export to PDF and rename to the index number** | P0 | X | ST | HIGH | SF-0408 | CW-16, ADM-005 | — | `<INDEX_NUMBER>.pdf` | exact naming per the brief | XS |
| SF-0410 | Package source code for DLE submission | P0 | X | ST | MED | SF-0396 | CW-12, ADM-006 | — | `Stockmok_Source.zip` | excludes `node_modules`, includes docs and tests | S |
| SF-0411 | Submit report + source to the DLE | P0 | X | ST | HIGH | SF-0410 | CW-11/12 | — | — | submission receipt saved | S |
| SF-0412 | Reopen the submitted PDF to confirm integrity | P0 | X | ST | LOW | SF-0411 | — | — | — | file opens, links work, pages complete | XS |

---

# Release C (only if every gate passed by end of Day 11 — default: NOT BUILT)

| ID | Title | PRI | REL | TOOL | EFF | Deps | Req | Tests | Definition of done | Size |
|---|---|---|---|---|---|---|---|---|---|---|
| SF-0420 | StorefrontCatalogItem schema + public rules | P2 | C | CC | HIGH | SF-0337 | FR-SF-002, SEC-013 | T-SF-01 | public read only, no write path | M |
| SF-0421 | `storefront.publish` / `unpublish` with the allow-list | P2 | C | CC | HIGH | SF-0420 | FR-SF-001 | T-SF-02 | coarse availability, never a quantity | M |
| SF-0422 | Public `/store/:handle` page | P2 | C | CC | MED | SF-0421 | FR-SF-003 | T-SF-03 | no private field in any payload | L |
| SF-0423 | Public-payload leak test | P2 | C | CC | HIGH | SF-0422 | BR-021 | T-SF-04/05 | asserts the exact permitted key set | S |

---

# Summary

| Stage | Tasks | Release | Day |
|---|---|---|---|
| S0 Repository | 12 | X | 1 |
| S1 Firebase | 10 | X | 1 |
| S2 Design + Auth | 16 | A | 2 |
| S3 Organization | 13 | A | 3 |
| S4 RBAC | 17 | A | 4 |
| S5 Inventory | 13 | A | 5 |
| S6 Ledger | 18 | A | 6 |
| S7 Partners | 7 | A | 7 |
| S8 Private PO | 10 | A | 7 |
| S9 Receiving | 6 | A | 8 |
| S10 Dashboard | 11 | A | 8 |
| S11 Release A QA | 12 | A | 9 |
| S12 Connections | 9 | B | 10 |
| S13 Catalog | 9 | B | 10 |
| S14 Mapping | 8 | B | 11 |
| S15 Connected PO | 14 | B | 11–12 |
| S16 Release B QA | 8 | B | 12 |
| S17 Polish | 9 | X | 13 |
| S18 Deployment | 10 | X | 13 |
| S19 Evidence | 7 | X | 14 |
| S20 Report | 13 | X | 14 |
| C (optional) | 4 | C | — |
| **Total** | **236** | | |

**Release A path: 145 tasks (123 Release-A tasks plus the 22 Stage 0–1 infrastructure tasks). Release B adds 47. The remaining 44 are polish, deployment, evidence and submission.**

If the Release A count looks large, note that 40 of those tasks are tests and evidence — which is precisely where the marks are.
