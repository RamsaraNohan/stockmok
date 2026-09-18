# Route, Screen, and Feature Matrix

`APP` means `/app/:handle`. Visual IDs default to the same three-digit screen number in `docs/ui-final/31_FINAL_VISUAL_ASSET_REGISTER.md`; role/mobile/state variants are additional references.

| Screen | Route/host                 | Name                        | Phase | Roles                            | Reads                              | Writes                         | Risk/blocker                       |
| ------ | -------------------------- | --------------------------- | ----- | -------------------------------- | ---------------------------------- | ------------------------------ | ---------------------------------- |
| 001    | `/`                        | Public Home                 | F1    | public                           | none                               | none                           | built-features-only copy           |
| 002    | `/signup`                  | Sign Up                     | F1    | public                           | none                               | Auth + safe user profile       | neutral errors                     |
| 003    | `/login`                   | Global Login                | F1    | public                           | Q-003 after auth                   | Auth + lastSeenAt              | no enumeration                     |
| 004    | `/b/:handle`               | Branded Login               | F1    | public                           | Q-001                              | Auth                           | role preference untrusted          |
| 005    | `/invite/:token`           | Invitation Accept           | F1    | invitee                          | Q-001; token server-only           | C-06                           | email-bound                        |
| 006    | `/select-workspace`        | Workspace Selector          | F1    | authenticated                    | Q-003                              | none                           | revalidate selection               |
| 007    | `/onboarding`              | Business Onboarding         | F1    | zero-membership user             | Q-001 advisory                     | C-01                           | atomic only                        |
| 008    | wraps `APP/*`              | Application Shell           | F1    | active members                   | Q-003,005,006,007,008              | none                           | tenant/role context                |
| 009    | `APP/dashboard`            | Empty Dashboard             | F2    | all                              | Q-050 + role-gated checklist       | none                           | no forbidden queries               |
| 010    | `APP/dashboard`            | Populated Dashboard         | F2    | all, reduced Viewer              | Q-021a/b,033,050..055,060,063..065 | none                           | read budgets                       |
| 011    | `APP/inventory/products`   | Product List                | F2    | all; O/A/IM act                  | Q-011..013b,015..017,074..078,074s | C-11                           | 32-shape matrix                    |
| 012    | product new/edit routes    | Product Create/Edit         | F2    | O/A/IM                           | Q-014,016                          | C-09,10                        | no shared-schema edits             |
| 013    | product detail             | Product Detail              | F2    | all; tab/action gated            | Q-014,017,018,020,023,044,048      | C-11; opens 016/042/053        | four tabs only                     |
| 014    | `APP/inventory/categories` | Categories                  | F2    | O/A/IM                           | Q-016                              | safe create/update; C-35a/b    | stale UI-final filters             |
| 015    | `APP/inventory/warehouses` | Warehouses                  | F2    | O/A/IM                           | Q-017,058                          | safe create/update; C-12,36,37 | archive guard server-owned         |
| 016    | modal/sheet                | Stock Adjustment            | F3    | O/A/IM                           | Q-014,017,018                      | C-14                           | idempotent; >50% confirm           |
| 017    | `APP/inventory/movements`  | Movement History            | F3    | not Viewer                       | Q-015r,022..030,083                | none                           | immutable; time sort only          |
| 018    | suppliers                  | Suppliers                   | F3    | O/A/PM                           | Q-031                              | safe partner write; C-38       | no client archive guard            |
| 019    | buyers                     | Buyers                      | F3    | O/A/PM                           | Q-031                              | safe partner write; C-38       | no sales affordance                |
| 020    | partner detail             | Partner Detail              | F3    | O/A/PM                           | Q-032,039,040,042                  | safe update; C-38              | tenant privacy                     |
| 021    | PO list                    | Purchase Orders             | F3    | not Viewer                       | Q-033,034,084a/b                   | opens builders                 | bounded search                     |
| 022    | PO new                     | Private PO Builder          | F3    | O/A/PM                           | Q-011,014,031                      | safe PRIVATE DRAFT; C-15       | positive lines                     |
| 023    | PO detail                  | Private PO Detail           | F3/F4 | not Viewer                       | Q-036,037,038                      | C-15,16 or connected commands  | projection role variant            |
| 024    | receiving routes           | Private Receiving           | F3    | O/A/IM/PM/SK                     | Q-017,018,035..037                 | C-17                           | over-receipt denial                |
| 025    | `APP/reports`              | Reports Shell               | F5    | tab-gated                        | none                               | none                           | shell issues no query              |
| 026    | `APP/notifications`        | Notifications               | F5    | all                              | Q-004,005                          | safe read flag                 | Q-005 bounded badge                |
| 027    | `APP/team`                 | Team                        | F5    | O/A                              | Q-009,010                          | C-04,05,07,08                  | Owner protection                   |
| 028    | `APP/settings`             | Settings                    | F5    | O/A                              | Q-006,007,017                      | C-02                           | handle immutable                   |
| 029    | guarded path               | Permission Denied           | F1    | authenticated                    | none                               | none                           | execute no protected operation     |
| 030    | `*`/disabled Network       | 404                         | F1    | contextual                       | none                               | none                           | no existence leak                  |
| 031    | Network connections        | Connected Businesses        | F4    | O/A/PM                           | Q-041                              | C-19,20                        | feature flag                       |
| 032    | panel on 031               | Business Discovery          | F4    | O/A/PM                           | Q-001 exact get                    | C-18                           | no list/fuzzy search               |
| 033    | connection detail          | Connection Detail           | F4    | O/A/PM                           | Q-034,042,043                      | C-19,20                        | PM cannot disable                  |
| 034    | own partner catalog        | Supplier Catalog            | F4    | O/A/PM                           | Q-045                              | C-21,22                        | no stock/cost projection           |
| 035    | supplier catalog browse    | Buyer Catalog               | F4    | O/A/PM                           | Q-046 callable                     | none                           | callable only                      |
| 036    | mapping new                | Mapping Wizard              | F4    | O/A/PM                           | Q-011,041,047 callable             | C-25                           | seven refusal states               |
| 037    | mappings                   | Mappings List               | F4    | O/A/PM                           | Q-043                              | C-26                           | no restore                         |
| 038    | PO detail route            | Connected PO Buyer          | F4    | read matrix; buyer O/A/PM mutate | Q-036..038                         | C-27,31; C-34 header only      | **line persistence AUTHORITY_GAP** |
| 039    | same route supplier org    | Connected PO Supplier       | F4    | read matrix; supplier O/A/PM     | Q-036..038                         | C-28,29                        | one shipment only                  |
| 040    | connected receiving        | Connected Receiving         | F4    | O/A/IM/PM/SK                     | Q-017,018,036,037                  | C-30                           | supplier-unit outstanding          |
| 041    | login state                | Password Reset              | F1    | public                           | none                               | Auth reset                     | neutral completion                 |
| 042    | product Stock dialog       | Opening Balance             | F3    | O/A/IM                           | Q-014,017,018                      | C-13                           | zero valid                         |
| 043    | org-route drawer           | Mobile Navigation           | F1/F6 | all                              | shell reads                        | none                           | drawer, not bottom tabs            |
| 044    | dashboard variant          | Owner/Admin Dashboard       | F2    | O/A                              | dashboard queries                  | none                           | role composition                   |
| 045    | dashboard variant          | Inventory Manager Dashboard | F2    | IM                               | allowed dashboard queries          | none                           | omit unauthorized panels           |
| 046    | dashboard variant          | Procurement Dashboard       | F2    | PM                               | allowed dashboard queries          | none                           | network flag aware                 |
| 047    | dashboard variant          | Storekeeper Dashboard       | F2    | SK                               | allowed dashboard queries          | none                           | no management CTA                  |
| 048    | reports stock tab          | Stock-on-Hand Report        | F5    | all                              | Q-016,017,061,061b,074..076        | bounded CSV                    | no mobile export                   |
| 049    | reports PO tab             | Purchase-Order Report       | F5    | O/A/IM/PM/AN                     | Q-062,085..089                     | bounded CSV                    | chart not page sample              |
| 050    | post-invite modal          | Invitation Link             | F5    | O/A                              | command result only                | none                           | token displayed once               |
| 051    | catalog dialog             | Publish Partner Item        | F4    | O/A/PM                           | Q-014,045                          | C-21                           | order unit locked                  |
| 052    | header popover             | Notification Menu           | F1/F5 | all                              | Q-004(limit 5),005                 | safe read flag                 | `50+` cap semantics                |
| 053    | warehouse/product modal    | Stock Transfer              | F3    | O/A/IM                           | Q-014,017,018x2                    | C-33                           | FORM-024/STATE-044; no route       |

## Route audit

- Canonical routes: `ROUTE-001..ROUTE-036`; no duplicates.
- SCREEN-016, 032, 041, 042, 043, 050, 051, 052 and 053 are subordinate surfaces and receive no invented URL.
- Connected orders reuse purchase-order and receiving routes.
- Missing required screens: none. Extra Release-C screens: none. Stale current screens: none after adding A1 SCREEN-053.

## Form and table coverage

| Phase | Forms                             | Tables                         |
| ----- | --------------------------------- | ------------------------------ |
| F1    | FORM-001..005, FORM-016           | none                           |
| F2    | FORM-006..008                     | TABLE-001..005, TABLE-024..027 |
| F3    | FORM-009..012, FORM-017, FORM-024 | TABLE-006..012                 |
| F4    | FORM-018..023                     | TABLE-018..023                 |
| F5    | FORM-013..015                     | TABLE-013..017                 |

This accounts for all 24 forms and all 27 tables without inventing IDs or assigning connected variants duplicate routes.
