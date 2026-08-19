# Loading, Empty, Error, and Workflow State Map

## Frozen state ledger

- `STATE-001..008`: loading, empty, error, success, validation, permission denied, submitting, confirmation.
- `STATE-009..016`: branded-login resolution, not-found, ready, neutral auth failure, non-member, role mismatch, assigned-role offer, suspended.
- `STATE-017..020`: onboarding handle and atomic-retry states.
- `STATE-021..027`: exact-handle discovery states.
- `STATE-028..034`: mapping refusal states.
- `STATE-035`: warehouse archive blocked.
- `STATE-036`: Network-disabled authenticated 404.
- `STATE-037`: idempotent replay success.
- `STATE-038`: over-receipt.
- `STATE-039`: immutable PO state.
- `STATE-040..041`: invitation token/email failures.
- `STATE-042`: invitation link shown once.
- `STATE-043`: empty-dashboard checklist.
- `STATE-044`: stock transfer same-room refusal.

## Async-surface contract

| Condition                 | Presentation                                                      | Retry/data behavior                          |
| ------------------------- | ----------------------------------------------------------------- | -------------------------------------------- |
| initial loading           | geometry-matched skeleton                                         | do not render unresolved tenant children     |
| refetch                   | retain usable data with localized progress                        | avoid full-page reset                        |
| empty                     | explain absence and one allowed next action                       | action hidden if role cannot perform it      |
| filtered empty            | state that current filters produced no rows; expose Clear filters | do not replace with entity-level empty CTA   |
| permission denied         | SCREEN-029/frozen inline copy; current role/capability            | no query/command retry                       |
| not found                 | neutral contextual recovery                                       | do not reveal cross-tenant existence         |
| validation                | field-associated, announced, first invalid focused                | retain values; block submit                  |
| stale/failed precondition | explain changed state                                             | refetch and re-render; no blind retry        |
| transaction contention    | visible bounded retry state                                       | same operationId and bounded backoff         |
| network/server error      | plain language, retry if safe                                     | never leave an infinite spinner              |
| success                   | updated data plus toast/inline reference                          | invalidate/refetch or accept realtime update |

## Domain-specific errors

- Insufficient stock: show current/source-after values; no optimistic stock mutation.
- Over receipt: inline per line with outstanding quantity in the correct unit.
- Duplicate SKU/handle/mapping/request: focus the conflicting field/action and preserve safe input.
- Archived/deactivated/disabled entity: remove from new-work selectors; historical records remain readable.
- Illegal PO/connection/mapping transition: refetch canonical state, remove invalid action, retain history.
- Q-005 badge: suppress cache-only initial snapshots; capped results display `50+`, never exact 50 above the cap.
- SCREEN-038 authority gap: disabled save/submit wiring with a development-only gate note; never simulate persisted success.
