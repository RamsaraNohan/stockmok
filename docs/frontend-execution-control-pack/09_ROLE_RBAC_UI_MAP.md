# Role and RBAC UI Map

Roles: Owner (O), Admin (A), Inventory Manager (IM), Procurement Manager (PM), Storekeeper (SK), Analyst (AN), Viewer (V).

| Capability/surface                              | O      | A                            | IM     | PM      | SK           | AN     | V            |
| ----------------------------------------------- | ------ | ---------------------------- | ------ | ------- | ------------ | ------ | ------------ |
| shell/dashboard/product read                    | full   | full                         | full   | full    | full         | full   | reduced read |
| product/category/warehouse/stock/transfer write | full   | full                         | full   | hidden  | hidden       | hidden | hidden       |
| movement history                                | full   | full                         | full   | read    | read         | read   | denied       |
| private partners                                | full   | full                         | denied | full    | denied       | denied | denied       |
| PO list/detail read                             | full   | full                         | read   | full    | limited read | read   | denied       |
| create/order/cancel PO                          | full   | full                         | hidden | full    | hidden       | hidden | hidden       |
| receive private/connected                       | full   | full                         | full   | full    | full         | hidden | hidden       |
| Network                                         | full   | full                         | hidden | limited | hidden       | hidden | hidden       |
| disable connection                              | full   | full                         | hidden | hidden  | hidden       | hidden | hidden       |
| team                                            | full   | limited; cannot target Owner | hidden | hidden  | hidden       | hidden | hidden       |
| settings                                        | full   | limited                      | hidden | hidden  | hidden       | hidden | hidden       |
| stock report/CSV desktop                        | full   | full                         | full   | full    | full         | full   | full         |
| PO report/CSV desktop                           | full   | full                         | full   | full    | denied       | full   | denied       |
| mobile report CSV                               | hidden | hidden                       | hidden | hidden  | hidden       | hidden | hidden       |

## Enforcement behavior

- Navigation and actions are filtered from the current ACTIVE membership and feature flags; hidden UI is usability, not authorization.
- A valid direct URL with the wrong role renders SCREEN-029 and executes no protected query/command.
- A disabled Network flag hides navigation and direct URLs render authenticated SCREEN-030.
- Cross-tenant or missing-resource denial never confirms whether the target exists.
- Viewer never queries movement history or purchase orders. Storekeeper is router-denied from SCREEN-049 even though underlying PO data permissions are broader.
- Role changes, workspace switching and suspension invalidate affected queries immediately; unresolved tenant data never flashes.
