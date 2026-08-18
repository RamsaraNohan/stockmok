# Command and Mutation Map

## Trusted commands — exact 38

| ID    | Callable                     | UI surfaces/actions                  | Role group                      | UI completion/error behavior                                      |
| ----- | ---------------------------- | ------------------------------------ | ------------------------------- | ----------------------------------------------------------------- |
| C-01  | `org.create`                 | SCREEN-007 onboarding                | authenticated                   | atomic success to dashboard; validation/retry with no partial org |
| C-02  | `org.updateSettings`         | SCREEN-028                           | ADMINS                          | refetch org/settings; preserve input on error                     |
| C-03  | `user.bootstrapProfile`      | first authenticated render, optional | self                            | idempotent; no duplicate profile                                  |
| C-04  | `team.createInvitation`      | SCREEN-027/050                       | ADMINS                          | show token once with expiry                                       |
| C-05  | `team.revokeInvitation`      | SCREEN-027                           | ADMINS                          | confirmed row update                                              |
| C-06  | `team.acceptInvitation`      | SCREEN-005                           | invitee                         | distinct mismatch/expired/reused UI                               |
| C-07  | `team.changeMemberRole`      | SCREEN-027                           | ADMINS                          | protect canonical Owner; refresh mirrors                          |
| C-08  | `team.setMemberStatus`       | SCREEN-027                           | ADMINS                          | named confirmation; protect Owner                                 |
| C-09  | `product.create`             | SCREEN-012                           | INVENTORY_WRITERS               | operation reference; duplicate SKU inline                         |
| C-10  | `product.update`             | SCREEN-012                           | INVENTORY_WRITERS               | refresh detail/list; immutable constraints                        |
| C-11  | `product.setStatus`          | SCREEN-011/013                       | INVENTORY_WRITERS               | archive/restore confirmation and refetch                          |
| C-12  | `warehouse.archive`          | SCREEN-015                           | INVENTORY_WRITERS               | show authoritative stock/open-receipt refusal                     |
| C-13  | `stock.recordOpeningBalance` | SCREEN-042                           | INVENTORY_WRITERS               | quantity zero valid; replay success; reference toast              |
| C-14  | `stock.adjust`               | SCREEN-016                           | INVENTORY_WRITERS               | current/change/result; insufficient stock; replay                 |
| C-15  | `po.order`                   | SCREEN-022/023                       | PO_WRITERS                      | freeze lines; allocate number; refresh timeline                   |
| C-16  | `po.cancel`                  | SCREEN-023                           | PO_WRITERS                      | legal-state confirmation; stale state refetch                     |
| C-17  | `po.receive`                 | SCREEN-024                           | RECEIVERS                       | partial/final state; over-receipt inline; replay                  |
| C-18  | `connection.request`         | SCREEN-032                           | PARTNER_WRITERS                 | pending state; duplicate/self refusal                             |
| C-19  | `connection.respond`         | SCREEN-031/033                       | PARTNER_WRITERS                 | accept/reject across projections                                  |
| C-20  | `connection.disable`         | SCREEN-031/033                       | ADMINS                          | no reconnect action                                               |
| C-21  | `partnerCatalog.publish`     | SCREEN-034/051                       | PARTNER_WRITERS                 | allow-listed projection; refetch catalog                          |
| C-22  | `partnerCatalog.unpublish`   | SCREEN-034                           | PARTNER_WRITERS                 | history retained                                                  |
| C-23  | `partnerCatalog.list`        | SCREEN-035                           | connected buyer PARTNER_WRITERS | read callable; bounded safe projection                            |
| C-24  | `partnerCatalog.lookupBySku` | SCREEN-036                           | same                            | exact read; safe not-found                                        |
| C-25  | `mapping.create`             | SCREEN-036                           | PARTNER_WRITERS                 | seven named refusal states; VERIFIED success                      |
| C-26  | `mapping.disable`            | SCREEN-037                           | PARTNER_WRITERS                 | no restore; history retained                                      |
| C-27  | `cpo.submit`                 | SCREEN-038                           | buyer PO_WRITERS                | requires authorized complete draft; projections/timeline refresh  |
| C-28  | `cpo.respond`                | SCREEN-039                           | supplier PO_WRITERS             | accept/reject legal state only                                    |
| C-29  | `cpo.ship`                   | SCREEN-039                           | supplier PO_WRITERS             | one full shipment; supplier stock only; replay                    |
| C-30  | `cpo.receive`                | SCREEN-040                           | buyer RECEIVERS                 | supplier-unit input, converted buyer stock, replay                |
| C-31  | `cpo.cancel`                 | SCREEN-038                           | buyer PO_WRITERS                | DRAFT/SUBMITTED only                                              |
| C-33  | `stock.transfer`             | SCREEN-053                           | TRANSFER_WRITERS                | paired movements; same-room/negative refusal; total unchanged     |
| C-34  | `cpo.draftSave`              | SCREEN-038 header                    | buyer PO_WRITERS                | header/normalization only; **does not authorize line intent**     |
| C-35a | `category.archive`           | SCREEN-014                           | INVENTORY_WRITERS               | authoritative active-product refusal                              |
| C-35b | `category.restore`           | SCREEN-014                           | INVENTORY_WRITERS               | refresh list                                                      |
| C-36  | `warehouse.setDefault`       | SCREEN-015/028                       | INVENTORY_WRITERS               | one settings source of truth                                      |
| C-37  | `warehouse.restore`          | SCREEN-015                           | INVENTORY_WRITERS               | ARCHIVED to ACTIVE only                                           |
| C-38  | `partner.setStatus`          | SCREEN-018..020                      | PARTNER_WRITERS                 | server checks open POs; no client guard                           |

`C-32` is inert Release C and must not be imported, exported, routed or displayed.

## Six direct-write surfaces

1. `users/{uid}` self profile fields.
2. `users/{uid}/notifications/{id}` read flag only.
3. categories create/update (archive/restore remain commands).
4. warehouses create/update with immutable status (archive/default/restore remain commands).
5. privatePartners create/update excluding status and ordersPlacedCount (status is C-38).
6. PRIVATE DRAFT purchase-order header/items within the strict Rules/schema contract.

There is no seventh class. Connected drafts are command-only and SCREEN-038 has no authorized line-intent path.

## Common adapter rules

- Parse payloads with the existing shared schema; never widen it locally.
- Idempotent forms generate `crypto.randomUUID()` once and retain it through `aborted` retries.
- Map `permission-denied` to no-retry denial, `failed-precondition` to refetch, idempotent `already-exists` to success, `aborted` to bounded same-operation retry and `resource-exhausted` to backoff with visible error.
