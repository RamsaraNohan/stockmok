# Stockmok — Final AI Development Workflow v3.0

**Status:** operating manual for the five tools available to this project.
**Premise:** the university has confirmed that any tools and technologies may be used. That permission is about *tooling*, not authorship — the submitted work must still be the student's own, understood and explainable. This document is written to satisfy both.
**Governing principle:** **one writer at a time, one reviewer after, one human who decides.**

---

# 1. Why this document exists

Five capable agents pointed at one repository with a 13-day deadline will, without rules, produce: duplicated abstractions, conflicting edits to the same uncommitted files, silently expanded scope, undocumented dependencies, and a codebase the student cannot defend in a viva. Every rule below exists to prevent one of those specific failures.

The student is not a bystander in this workflow. The rubric awards marks for *individual contribution* and *reflection*, and a viva can ask "why did you do it this way?" about any line. The workflow is therefore designed so that the student makes every decision and reviews every diff, while the agents do the typing.

---

# 2. Role allocation at a glance

| Tool | One-line role | Writes code? | Writes docs? | Decides? |
|---|---|---|---|---|
| **Claude Cowork** | Architecture and control documents | No | **Yes** | Proposes |
| **Claude Code** | Primary implementation writer | **Yes** | Only READMEs and code comments | No |
| **ChatGPT Codex** | Independent reviewer, debugger, security auditor | Fixes only, after review | Review notes | No |
| **Google Antigravity** | Browser QA, regression, responsive, evidence capture | No | QA logs | No |
| **ChatGPT (chat)** | Planning, prompt authoring, adversarial challenge, report critique | No | Drafts for the student to rewrite | No |
| **The student** | Owner, approver, committer, author of the report | Reviews everything | **Writes the report** | **Yes — always** |

---

# 3. CLAUDE COWORK

### When to use

- Producing or revising the numbered control documents (`01`–`17`).
- Deep cross-document reconciliation when two authorities disagree.
- A genuine architecture fork that changes more than one document — for example the Blaze P0/P1 decision.
- A mid-project scope-change assessment where the impact spans requirements, data, security, UI and tests.

### When NOT to use

- Writing application code. It is not the implementation surface.
- Small doc edits — those are cheaper in Claude Code with the file open.
- Re-litigating decisions already frozen in `10` and `11`. The pack is frozen; reopening it costs days.
- "What else could Stockmok become?" That question is closed until after submission.

### Model effort

Opus-class, high effort. These sessions are rare, long and consequential.

### Files to provide

The complete control pack plus the coursework brief. Cowork sessions must never work from a summary; the whole point is cross-document consistency.

### Expected output

Complete replacement documents, plus a conflict register and an issue register with severities. Never a partial patch to a control document — partial edits are how the pack drifts out of sync.

### Token / usage strategy

Expect **at most three Cowork sessions for the whole project**: this one; one mid-project reconciliation only if a real defect forces it; one post-submission retrospective if desired. Budget accordingly and do not spend Cowork capacity on tasks Claude Code can do.

### Handoff rule

Cowork output goes into `docs/final/`, is committed on its own, and only then does implementation resume. Code and control documents never change in the same commit.

### Stop conditions

- A required source document is missing or unreadable.
- Two authorities conflict with no safe resolution.
- A decision would need a service or payment the student cannot access.

In all three cases: report the blocker, do not invent an answer.

---

# 4. CLAUDE CODE — primary implementation writer

### When to use

Every implementation task in `13`. This is the default tool for the whole build.

### When NOT to use

- Reviewing its own security-critical work. Self-review by the same model on the same context is close to worthless for finding authorization holes.
- Making product or scope decisions.
- Adding a dependency not listed in `10`.
- Writing the coursework report.

### Model effort

Per the `EFF` column in `13`. `HIGH` for anything touching authorization, money, quantity, transactions or cross-tenant boundaries — that is roughly one task in three.

### Files to provide

At session start, always: `AGENTS.md`, the specific stage entry from `12`, the specific task row from `13`, and the documents that stage names. **Never** the whole pack — an over-stuffed context produces vaguer code. If a task touches security, add `06` §5 and `11` §9.

### Expected output

One task, completed: implementation plus its tests plus any index or rules change it requires. A task is not complete without its tests.

### Token / usage strategy

- One task per session; clear context between tasks. Long-running sessions accumulate stale assumptions and start editing files the current task does not own.
- Prefer targeted file reads over repository-wide searches.
- Do not paste the whole control pack; reference file paths and let the agent read what it needs.

### Handoff rule

Claude Code stops when the task's definition of done is met and `npm run verify` is green. It then **stops writing** and reports. The student reviews the diff. Only the student commits.

### Stop conditions

Claude Code must stop and ask rather than proceed if it encounters:

- a requirement that appears to be missing from the control pack;
- two documents that contradict each other;
- a need to add a dependency;
- a need to change a Firestore path, a security rule beyond the task's scope, or a state machine;
- a test that cannot be made to pass without weakening an assertion;
- anything that looks like scope expansion.

**Weakening a test to make it pass is the single most damaging thing an agent can do in this project**, because it converts a real defect into invisible technical debt three days before submission. `AGENTS.md` forbids it explicitly.

---

# 5. CHATGPT CODEX — independent reviewer

### When to use

Mandatory review gates, all named in `12`:

| Gate | What Codex reviews |
|---|---|
| After S3 | `defineCommand` and `org.create` — the pattern every later command copies |
| After S4 | the entire `firestore.rules` file and the team commands |
| After S6 | stock commands, idempotency, quantity/money utilities |
| After S15 | all `cpo.*` commands and cross-tenant boundaries |
| S11 | full Release A security review |
| S16 | full Release B security review |

Also use Codex for: a bug that has survived two Claude Code attempts; a Firestore rules behaviour that is not doing what it appears to say; a race condition; and identifying missing test cases.

### Why a *different* model matters

Independent review is only meaningful when the reviewer does not share the author's blind spots. Two sessions of the same model on the same context tend to agree with each other. Using a different vendor's model for review is a cheap, real improvement in defect detection — and it is an honest, interesting point to make in the reflection section.

### When NOT to use

- As a second implementation writer working in parallel. That breaks the one-writer rule.
- For UI work or styling.
- For product decisions.

### Model effort

Highest available reasoning setting. Review is exactly the task where reasoning depth pays.

### Files to provide

The code under review, the relevant control-document section, and an explicit adversarial prompt. A good review prompt names the threat model rather than asking "is this good?":

> "You are a security engineer reviewing a multi-tenant Firestore application. Here is `firestore.rules` and the membership model from `06` §5. Find every way a member of organization A could read or write data belonging to organization B, every way a Storekeeper could perform an Owner action, and every rule whose `get()` path varies per document. List findings by severity with a concrete exploit path for each."

### Expected output

A numbered findings list with severity and a reproduction or exploit path — not a rewrite. Codex proposes; Claude Code implements the fix unless the fix is a two-line change Codex can make directly.

### Token / usage strategy

Six scheduled reviews plus ad-hoc debugging. Review one subsystem at a time; a review of "the whole app" produces generic advice.

### Handoff rule

Every finding is logged in `docs/qa/review-<stage>.md` with a resolution: **Fixed**, **Accepted risk with reasoning**, or **Deferred to future scope with reasoning**. A finding that is silently ignored is worse than one that was never found, because the review record then misleads.

### Stop conditions

If Codex finds a Critical issue in a foundation (rules, idempotency, transactions), **all forward work stops** until it is resolved. Building on a broken foundation is how a project loses a whole day on Day 12.

---

# 6. GOOGLE ANTIGRAVITY — browser QA and evidence

### When to use

- Role-based walkthroughs: 7 roles × the key screens, checking that unauthorised actions are actually denied and not merely hidden.
- Responsive regression at 390 / 768 / 1280 / 1920.
- Repetitive click-through regression after each gate.
- Capturing the screenshot set for the report.
- Exploratory testing: deliberately doing the wrong thing to find unhandled states.

### When NOT to use

- Writing application code.
- Replacing Playwright. Playwright's 8 specs are the deterministic, CI-runnable core; Antigravity covers the long tail those specs deliberately skip.
- Anything requiring a judgement about business correctness — it can see that a screen rendered, not that the number on it is right.

### Model effort

Medium. These are mechanical, high-volume passes.

### Files to provide

The screen inventory from `07` §5, the RBAC matrix from `06` §5, and the demo script from `16` §9. Antigravity needs to know what *should* happen, not just what to click.

### Expected output

A structured QA log per pass — screen, role, breakpoint, expected, actual, screenshot path — written into `docs/qa/`. Screenshots named consistently so the report can reference them.

### Token / usage strategy

Three scheduled passes (S11, S16, S17) plus one final evidence sweep at S19.

### Handoff rule

Findings become defect entries with a severity from `08` §18. Critical and High block the gate; Medium and Low go to `known-issues.md` if not fixed.

### Stop conditions

If a pass finds a cross-tenant data leak or an authorization bypass in the browser, stop everything and escalate to a Codex review — a leak visible in the UI means the rules tests missed a case, which means the test suite itself needs work.

---

# 7. CHATGPT (chat) — planning and challenge

### When to use

- Turning a stage entry into a precise prompt for Claude Code.
- Adversarially challenging a design decision before it is implemented ("argue that this approach is wrong").
- Reviewing the coursework report for structure, clarity and rubric coverage.
- Helping the student decide between two options when both are defensible.
- Explaining an unfamiliar concept so the student can genuinely understand — and therefore defend — the code.

### When NOT to use

- Writing report prose that the student then submits unchanged. That is an academic-integrity problem regardless of tool permissions, and it produces text the student cannot defend in a viva.
- As a source of technical facts about Firebase. Facts come from official documentation; `10` §1 lists the verified ones and where they came from.
- Editing repository files.

### Model effort

Medium to high depending on the question.

### Expected output

Prompts, critiques, comparisons, explanations. Never final deliverable text.

### Handoff rule

Anything ChatGPT drafts for the report is treated as an **outline the student rewrites in their own words**. The student must be able to explain every sentence they submit.

### Stop conditions

If a suggestion contradicts a frozen decision in `10` or `11`, it is discarded unless it identifies an actual defect — in which case it goes through the scope-change protocol, not straight into the code.

---

# 8. THE ONE-WRITER RULE

> **At any moment, exactly one agent may hold write access to uncommitted files in the repository.**

Practical form:

1. Before starting an agent session, the working tree must be clean (`git status` empty).
2. That agent owns the tree until its task is complete and committed.
3. No second agent is started against the same tree until the commit lands.
4. Read-only work — Codex reviewing a pushed commit, Antigravity testing a running app, ChatGPT planning — may happen in parallel, because none of it touches files.
5. If two things genuinely must proceed at once, use a git worktree or a branch, and merge deliberately. In a 13-day solo project this should almost never be necessary.

**Why this is non-negotiable:** two agents editing the same uncommitted file produce a merge conflict neither one can reason about, and the recovery cost is measured in hours. The rule costs a little parallelism and saves the project.

---

# 9. The checkpoint loop

Every task in `13` passes through this loop. No step is optional and the order is fixed.

```text
   ┌─────────────────────────────────────────────────────────────┐
   │  1. IMPLEMENT   Claude Code, one task, clean tree            │
   │  2. TEST        npm run verify  (typecheck, lint, all tests) │
   │  3. REVIEW-SELF Student reads the whole diff                 │
   │  4. COMMIT      One conventional commit, task id referenced  │
   │  5. CODE REVIEW Codex — mandatory for HIGH-effort tasks      │
   │  6. FIX         Claude Code applies findings; back to 2      │
   │  7. BROWSER QA  Antigravity — at stage gates                 │
   │  8. ACCEPT      Student marks the task done in 13            │
   │  9. EVIDENCE    Capture the artifact 16 asks for, now        │
   └─────────────────────────────────────────────────────────────┘
```

**Step 3 is the one most likely to be skipped and the one that matters most for the coursework.** The student must read every diff. Not to catch every bug — the tests do that — but because the rubric awards marks for individual contribution and a viva can ask about any line. If a diff is too large to read, the task was too large.

**Step 9 is the second most likely to be skipped.** Evidence captured while building takes two minutes; evidence reconstructed on Day 14 takes hours and is often impossible because the state has changed.

---

# 10. Commit discipline

| Rule | Detail |
|---|---|
| One task, one commit | Squash agent noise before committing. |
| Conventional messages | `feat(stock): add adjust command with idempotency [SF-0137]` |
| Task id in every message | Makes the commit history a traceability artifact for the report. |
| Never commit red | `npm run verify` green before every commit; the pre-commit hook enforces format, lint and typecheck. |
| Tag at every stage | `git tag s6-ledger` etc. Tags become the project timeline in the report. |
| Push at end of day | CI must be green overnight. A red CI discovered on Day 13 is a bad day. |
| Never commit a secret | `gitleaks` runs in CI; `.gitignore` blocks credential filenames. |

The commit history is not just version control here — it is the primary evidence of individual contribution, and it is the source material for the development-timeline section of the report. Treat it as a deliverable.

---

# 11. Prompt patterns that work for this project

**Implementation task**

> Read `AGENTS.md`, `docs/final/12_FINAL_IMPLEMENTATION_PLAN.md` Stage 6, and `docs/final/11_FINAL_FIREBASE_IMPLEMENTATION_ARCHITECTURE.md` §15 and §21.
> Implement task **SF-0137 — `stock.adjust`**.
> Do not modify any file outside `functions/src/commands/stock.ts`, `packages/shared/src/stock.ts` and their tests.
> Do not add dependencies.
> Write the integration tests listed in the task row before you consider it done.
> If anything in the specification is ambiguous, stop and ask instead of choosing.

**Review task**

> You are an independent reviewer. Do not rewrite the code.
> Here is `functions/src/commands/stock.ts` and the invariants from `docs/final/05` §8.
> For each invariant, state whether the code enforces it and cite the line. Then list every way the invariant could be violated by a malicious or retrying client. Severity-rank the findings.

**Debug task**

> This test fails intermittently: <paste>. The system uses Firestore transactions with client-supplied operation ids.
> Explain the failure mechanism first. Do not propose a fix until you can state exactly why it fails.

**The pattern in all three:** name the documents, name the boundary, forbid scope expansion, and require a stop instead of a guess.

---

# 12. What the agents are explicitly forbidden to decide

These are the student's decisions alone. An agent that makes one has broken the workflow, and `AGENTS.md` repeats this list for the repository.

1. Adding, removing or renaming a requirement.
2. Changing a release boundary (A / B / C / D).
3. Adding a dependency.
4. Changing a Firestore collection path or moving data between zones.
5. Relaxing a Security Rule.
6. Changing a state machine.
7. Weakening, skipping or deleting a test to make a suite pass.
8. Deciding that a Critical or High defect is acceptable.
9. Choosing to build Release C.
10. Deploying to production.
11. Writing the report's reflection, problems-and-solutions, or individual-contribution sections.
12. Declaring a stage gate passed.

---

# 13. Academic integrity in an AI-assisted build

The university has permitted the use of any tools. The brief's own-work and referencing requirements still apply in full. The workflow satisfies both as follows.

| Obligation | How this workflow meets it |
|---|---|
| The work is the student's own | The student specifies every task, reviews every diff, decides every trade-off, and commits every change. No code enters the repository unread. |
| The student can explain the system | The mandatory diff review plus a rule that any code the student cannot explain is rewritten or removed before submission. |
| Sources are referenced | `10` §1 records every official documentation source used for a technical decision, with URLs. The report reproduces them. |
| AI assistance is disclosed | The report contains a short, factual statement of which tools were used for what — implementation drafting, review, browser QA — and confirms the permission granted. Being explicit is stronger than being vague. |
| Turnitin | The report is checked with Draft Coach before submission. Report prose is written by the student, not pasted from a model. |

**A practical test before submission:** pick five random files and explain, aloud, what each does and why it is designed that way. Anything that fails this test is a liability in a viva and should be simplified, rewritten with understanding, or removed.

---

# 14. Failure modes this workflow is built to prevent

| Failure | Prevention |
|---|---|
| Two agents editing the same file | One-writer rule (§8) |
| Scope creep from an enthusiastic agent | Forbidden-decisions list (§12) + `AGENTS.md` + `03` freeze |
| Security hole reviewed by the model that wrote it | Mandatory cross-vendor review gates (§5) |
| A test quietly weakened to go green | Explicit prohibition; CI history makes the change visible |
| A dependency appearing with no justification | `10` is the allow-list; lockfile diffs are reviewed |
| Evidence reconstructed from memory on Day 14 | Step 9 of the checkpoint loop (§9) |
| A student who cannot defend their own code | Mandatory diff review + the five-file test (§13) |
| Discovering on Day 12 that deployment does not work | Throwaway production deploy on Day 1 (SF-0027) |
| Losing a day to a merge conflict | One-writer rule + one task per commit |
| Report written in a panic on the last night | S20 is scheduled work with its own tasks, not an afterthought |

---

# 15. Daily operating checklist

**Morning**

- [ ] `git status` clean; `git pull`; CI green.
- [ ] Read today's stage entry in `12`.
- [ ] Pick the next task from `13`; confirm its dependencies are done.

**Per task**

- [ ] Fresh Claude Code session; provide only the named documents.
- [ ] Implement; run `npm run verify`.
- [ ] Read the entire diff.
- [ ] Commit with the task id.
- [ ] Codex review if the task is HIGH effort.
- [ ] Capture the evidence artifact `16` names for this stage.

**Evening**

- [ ] Update task statuses in `13`.
- [ ] Write the `docs/PROGRESS.md` entry: shipped, slipped, one problem and its solution.
- [ ] Push; confirm CI green.
- [ ] Check the calendar in `12` §0; if behind, apply the slippage protocol in `12` §22 **today**, not tomorrow.

---

# 16. Workflow freeze statement

> Claude Cowork writes the plan. Claude Code writes the code. Codex breaks it. Antigravity clicks it. ChatGPT sharpens the thinking. The student decides everything, reviews everything, commits everything, and writes the report. One writer at a time, always.
