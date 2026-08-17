# OWNERSHIP_MAP

Who writes what. Derived from `DB_09` and the owner brief §N. **Frozen at A3R-P; propagated at A3R-P2,
2026-08-17.**

## 1. The three implementers

| Agent | Owns | Must never |
|---|---|---|
| **Antigravity** | Frontend UI, pages, components, routes, responsive implementation, browser/visual QA, Playwright | Write Firestore Rules · write a command body · invent a path, type or query id · compute a stored derived value |
| **Codex** | Deterministic Firebase/data-platform scaffolding: config, emulators, `firestore.indexes.json`, shared types, Zod schemas, converters, typed path builders, domain utilities, transition tables **as data**, seed scripts, test factories, reset/reconciliation tooling, repository scaffolding | Write Firestore Rules · write a command body · **enforce** a transition · change a canonical seed figure |
| **Claude Code** | `firestore.rules`, trusted Cloud Functions, RBAC enforcement, tenant isolation, cross-tenant commands, stock transactions, state-machine enforcement, idempotency, high-risk security tests | Redesign the product · alter a frozen UI contract · introduce a second type system or path registry |

## 2. File-level ownership

| Path | Owner | Notes |
|---|---|---|
| `src/app/**`, `src/components/**`, `src/routes/**`, styles | Antigravity | |
| `src/lib/firebase/config*`, `firebase.json`, emulator config | Codex | |
| `firestore.indexes.json` | **Codex** | Exactly the 67-index set. The 32-index product-list matrix is **generated from the DB-CR-038 rule**, not transcribed — a hand-written 32-row matrix is a transcription-error surface. Claude Code reviews; it does not author. |
| `src/types/**`, `src/schemas/**` (Zod), converters | Codex | The single type system |
| `src/lib/paths.ts` (client) / `src/server/paths.ts` (zone 4) | Codex | Zone-4 builders in a server-only module the client build cannot resolve |
| `src/lib/domain/**` (`deriveStockStatus`, `deriveShortfall`, `deriveStockValueMinor`) | Codex | Pure, unit-tested at **both** grains |
| `scripts/seed/**`, `scripts/reset/**`, test factories | Codex | Canonical figures are read-only inputs |
| **`firestore.rules`** | **Claude Code** | Sole author. No exceptions. |
| `functions/src/commands/**` | **Claude Code** | Sole author |
| `functions/src/guards/**` (auth, membership, role, tenant, idempotency) | **Claude Code** | |
| Security tests `T-SEC-**`, invariant property tests, attack matrix | **Claude Code** | |
| Emulator harness, `T-SEED-01a/01b`, reconciliation tests | Codex | Claude Code owns the security subset |
| `docs/database-final/**`, `docs/implementation/**` | Architecture | Changed only by owner-approved amendment |

## 3. The boundary that matters most

Codex scaffolds transition tables **as data**. Claude Code **enforces** them inside a transaction.

The distinction is not stylistic. A transition table in a shared module is a convenience for rendering and
for tests; it is not a control. The control is that a command re-reads current state **inside** its
transaction and rejects an illegal move — which is what makes `ATTACK-11` (illegal PO transition) and
`ATTACK-08` (concurrent receiving against the same outstanding quantity) unreachable rather than unlikely.

Likewise: Codex generates the client write helper for `privatePartners`. That helper must **not** expose
`ordersPlacedCount` or `status` — archive and restore are `C-38 partner.setStatus`, because a guard the
client evaluates is not a guard. Claude Code's rule denies both fields independently. Two layers, and
neither is permitted to rely on the other.

## 4. Sequencing

```
1  CODEX      config · emulators · firestore.indexes.json (67, generated) · types · Zod · converters
              · typed path builders · domain utilities · transition tables as data
2  CODEX      seed (12 movements at t₀) · reset · factories · T-SEED-01a green
3  CLAUDE     firestore.rules · guards · T-SEC-01…T-SEC-41  (34…41 added by A3 / A3R)
4  CLAUDE     commands C-01…C-38 · transactions · idempotency · state machines
5  CLAUDE     invariant property tests (INV-01…INV-24, INV-26, INV-27 — 26 active,
              INV-25 withdrawn) · attack matrix ATTACK-01…ATTACK-16
6  CODEX      04 chain replay · T-SEED-01b green
7  ANTIGRAVITY frontend against the frozen read/write contract
8  ALL        integration, measurement of the NFR-017 read budgets at Stage 17
```

Antigravity may begin against emulator seed data as soon as step 2 is green; it does not wait for step 4.

**Current position — A3R-P2.** **Step 1 is COMPLETE** (Codex C1 Firebase Foundation: config, emulators,
generated 67-index `firestore.indexes.json` with the 32-index matrix, shared types / Zod / converters /
typed paths with zone 4 server-only, domain utilities at both grains, transition tables as data, factories
and foundation tests). **Step 2 is COMPLETE in its owner-approved bootstrap form only** — the emulator-only
Admin SDK `seed:bootstrap` / `replay:bootstrap` at 12 movements at t₀, which proves fixture construction,
schema, arithmetic and reproducibility; the canonical `seed` / `replay` names and a green **command-driven**
`T-SEED-01a` / `T-SEED-01b` remain outstanding and are re-run once step 4 exists (`DB_08` §6.5).
Steps 3–8 are NOT STARTED. `NEXT_ACTION = PREPARE_PARALLEL_IMPLEMENTATION_LANES`:

```text
LANE_A = CODEX_C2_READ_QUERY_LAYER
LANE_B = CLAUDE_CODE_SECURITY_RULES_AND_BACKEND_SEQUENCE
LANE_C = ANTIGRAVITY_FRONTEND_IMPLEMENTATION
```

Lane ownership is unchanged from §1 and §2 — the lanes are a sequencing decision, not a reassignment.

## 5. Escalation

Any agent that finds a contradiction between a frozen contract and what it must build **stops and reports
it**. It does not resolve it by redesign, by adding a path, by widening a type, or by filtering client-side.
Resolution is an owner-approved amendment in `DB_00`, propagated to every affected file in one change.

The independent review that produced A3 exists because this rule was not previously enforceable — there
was no reviewer positioned to notice. It is now step 8 of every phase, run by someone who authored nothing
in it.
