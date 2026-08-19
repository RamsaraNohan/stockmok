# AI Model Task Router

Model routing is task-level. A phase is never assigned one blanket model when its work classes differ.

| Task class                               | Primary                           | Effort     | Fallback 1                 | Fallback 2                 | Reviewer                      | Escalate when                         |
| ---------------------------------------- | --------------------------------- | ---------- | -------------------------- | -------------------------- | ----------------------------- | ------------------------------------- |
| authority/cross-contract reconciliation  | Codex GPT-5.6 Sol                 | extra/high | Gemini 3.1 Pro High        | Claude Opus 4.6 Thinking   | different strong model        | authority winner cannot be derived    |
| TypeScript scaffold/service adapters     | Codex GPT-5.6 Sol                 | high       | Gemini 3.6 Flash High      | Claude Sonnet 4.6 Thinking | Codex/Pro cross-review        | shared/API change seems required      |
| repetitive JSX/list/form composition     | Gemini 3.6 Flash High             | high       | Gemini 3.5 Flash High      | Codex GPT-5.6 Sol          | visual agent                  | repeated visual/test defects          |
| visually sensitive screen composition    | Gemini 3.1 Pro High               | high       | Claude Sonnet 4.6 Thinking | Gemini 3.6 Flash High      | Codex contract review         | frozen intent ambiguous               |
| component/unit/service tests             | Codex GPT-5.6 Sol                 | high       | Gemini 3.6 Flash High      | GPT-OSS 120B Medium        | independent model             | oracle would duplicate implementation |
| browser visual repair                    | Antigravity Gemini 3.6 Flash High | high       | Gemini 3.1 Pro High        | Codex GPT-5.6 Sol          | cross-model screenshot review | change would redesign frozen outcome  |
| accessibility/keyboard QA                | Antigravity Gemini 3.6 Flash High | high       | Claude Sonnet 4.6 Thinking | Codex GPT-5.6 Sol          | independent browser reviewer  | semantics require component redesign  |
| difficult integration/concurrency defect | Codex GPT-5.6 Sol                 | extra/high | Claude Opus 4.6 Thinking   | Gemini 3.1 Pro High        | independent strong model      | lane contract or security conflict    |
| mechanical lint/copy/format repair       | Gemini 3.6 Flash Low/Medium       | low        | Codex low                  | Gemini 3.5 Flash Low       | phase owner                   | behavior changes                      |

## Phase task split

| Phase | Task records and preferred routing                                                                                          |
| ----- | --------------------------------------------------------------------------------------------------------------------------- |
| F0    | authority/scaffold: Codex; token/component skeleton review: Flash High; gates: Codex                                        |
| F1    | router/auth/adapters/tests: Codex; shell/auth composition: Flash High; browser repair: Antigravity Flash High               |
| F2    | dashboard composition: Pro High; inventory tables/forms: Flash High; C2 adapters/tests: Codex; browser repair: Flash/Pro    |
| F3    | stock/PO adapters and tests: Codex; repeated forms/tables: Flash High; receiving visual: Pro High                           |
| F4    | privacy/command adapters/integration tests: Codex; catalog/mapping UI: Flash High; connected workflow composition: Pro High |
| F5    | reports/query adapters/tests: Codex; team/settings/notification JSX: Flash High; chart/browser QA: Pro/Flash High           |
| F6    | visual/browser and a11y: Antigravity Flash High; hard discrepancies: Pro High; automated regression: Codex                  |
| F7    | integration/E2E: Codex; browser flows: Antigravity Flash High; severe cross-contract defect: Opus/Pro independent review    |

## Quota discipline

- Pro/Thinking models do not perform routine JSX, lint, formatting or mechanical test updates.
- A task hands off at a clean testable boundary with files/status/evidence recorded; it is never restarted from the whole phase.
- Cross-model review is required for phase freeze, security-sensitive UI boundaries, and SCREEN-038 gating.
