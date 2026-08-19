# Authority Precedence and Conflict Map

## Precedence

1. Owner-approved scope/product authority in `Stockmok_Final_Control_Pack_v4`.
2. Current requirements and use cases.
3. `docs/database-final` amendments and normative tables.
4. Security/RBAC and trusted-command contracts.
5. `docs/implementation` executable contracts.
6. Owner-approved `STOCKMOK_DESIGN_FREEZE_v1.0`, Gate 14, and canonical artifact hashes for final visual decisions.
7. Non-conflicting `docs/ui-final` route/screen/component/interaction/state/microcopy specifications.
8. Generated visual references and QA evidence.
9. `docs/audit-final`, historical packs, rejected/superseded assets.

Design never overrides tenant isolation, RBAC, accounting, state machines, privacy, query/index limits, or trusted-command behavior.

## Actual conflicts and controlling decisions

| SOURCE_A                                                    | SOURCE_B                            | CONFLICT                                                             | CONTROLLING_AUTHORITY                        | IMPLEMENTATION_DECISION                                                                               |
| ----------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `docs/ui-final/19` TABLE-001                                | DB-03 / `FRONTEND_BACKEND_CONTRACT` | UI-final lists Preferred Supplier and Updated columns                | DB-03 A3 row + implementation contract       | Build Product, SKU, Category, On hand, Minimum, Stock value, status/action; omit the stale columns    |
| `docs/ui-final/19` FORM-017                                 | DB-06 A3R-P2 C-13                   | UI-final says opening quantity `> 0`; command allows `>= 0`          | DB-06 and implementation contract            | Zero is valid and submittable; reject negative or >3dp                                                |
| `docs/ui-final/19` TABLE-013                                | DB-03 SCREEN-048                    | UI-final includes Warehouse/status filter and different sorting      | DB-03 and implementation contract            | Columns Product, SKU, Category, On hand, Unit cost, Stock value; filters Store room and Category only |
| `docs/ui-final/19` TABLE-016                                | DB-04 Q-009 / DB-03                 | UI-final adds search, role filter, name sort                         | DB-04 A3R-10                                 | One bounded joinedAt-ascending page; no search or role filter                                         |
| `docs/ui-final/19` TABLE-018                                | DB-03                               | UI-final shows mapped/open-PO columns                                | DB-03 / implementation contract              | Show Business, Handle, Relationship, State, Action and order-count subline only                       |
| `docs/ui-final/19` TABLE-023                                | DB-03                               | UI-final permits verified-time sort                                  | DB-03 A3                                     | No verified-time sort; only declared supplier/status behavior                                         |
| UI-final registry ends at SCREEN-052 / FORM-023 / STATE-043 | DB-00 A1, DB-03, DB-11              | Stock transfer additions absent from older UI-final files            | DB-00 A1 amendment                           | Add SCREEN-053, FORM-024, ACTION-062, STATE-044 without inventing a route                             |
| Gate 6 board copy                                           | Rank-1 FR-DASH-005 and DB-03        | “exactly two reports” omits PO report                                | requirements + DB-03                         | Build SCREEN-049 and CHART-003                                                                        |
| Gate 6 stale mobile frames                                  | canonical data contracts            | 116 KG / split warehouse values                                      | DB-02/DB-08 and current database decisions   | Use canonical data; flag visual-value mismatch rather than copying it                                 |
| non-`new` Gate 6/7/9 files                                  | manifest + Gate 14 corrections      | print, role name, shipment and data errors                           | canonical SHA manifest                       | Use the `new` canonical artifacts selected by hash                                                    |
| `docs/ui-final` readiness statements                        | Gate 14 owner approval              | `READY_FOR_PRODUCTION_CODING = NO` from pre-approval package process | owner-approved freeze/checkpoint             | Keep specifications; treat readiness line as pre-approval lifecycle evidence                          |
| `docs/audit-final` redesign recommendations                 | Gate 14 freeze                      | recommends redesign after the frozen owner decision                  | current owner-approved freeze unless amended | Treat as audit/history; do not redesign during implementation                                         |

Any new contradiction is logged in this five-column form. If the winner is not mechanically determined by the hierarchy, stop and request an owner amendment.
