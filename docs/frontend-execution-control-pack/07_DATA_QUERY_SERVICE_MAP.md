# Data Query and Service Map

## Frozen registry

C2 is independently reviewed and frozen at `694a6979b5516017b61a46f8a61d97214ab74dd5`. Frontend code consumes it after authorized integration; it never copies or reimplements it.

The exact 92 active IDs are:

```text
Q-001,Q-002,Q-003,Q-004,Q-005,Q-006,Q-007,Q-008,Q-009,Q-010,
Q-011,Q-012,Q-013,Q-013b,Q-014,Q-015,Q-015r,Q-016,Q-017,Q-018,Q-019,Q-020,
Q-021a,Q-021b,Q-022,Q-023,Q-024,Q-025,Q-026,Q-027,Q-028,Q-029,Q-030,
Q-031,Q-032,Q-033,Q-034,Q-035,Q-036,Q-037,Q-038,Q-039,Q-040,
Q-041,Q-042,Q-043,Q-044,Q-045,Q-046,Q-047,Q-048,
Q-050,Q-051,Q-052,Q-053,Q-054,Q-055,Q-056,Q-057,Q-058,Q-059,Q-060,Q-061,Q-061b,Q-062,Q-063,Q-064,Q-065,
Q-066,Q-067,Q-068,Q-069,Q-070,Q-071,Q-072,Q-073,Q-074,Q-074s,Q-075,Q-076,Q-077,Q-078,Q-079,Q-080,
Q-083,Q-084a,Q-084b,Q-085,Q-086,Q-087,Q-088,Q-089
```

Never reference tombstones `Q-011a`, `Q-021`, or singular `Q-084`. Q-056,057,059,066..073,079,080 are server/command-internal shapes; the browser does not issue them.

## Frontend read families

| UI family                   | Query IDs                                  | Repository behavior                                                       | Pagination/realtime/state                                    |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| public/auth/workspace/shell | Q-001..008                                 | public exact handle; self user/memberships; org/settings/member           | bounded memberships; RT-1 Q-008; Q-005 exact + bounded badge |
| team                        | Q-009,010                                  | members and pending invitations                                           | one bounded page; joinedAt/expiresAt order                   |
| products                    | Q-011..020, Q-074..078, Q-074s             | 32 approved product-list shapes, detail, categories, warehouses, balances | cursor 25; summary/store-room modes; forced sort             |
| attention/movements         | Q-021a/b, Q-022..030, Q-063, Q-015r, Q-083 | sequential out-then-low; ledger filters/search; transfer pair             | cursor 25; immutable; createdAt order                        |
| partners/private PO         | Q-031..040, Q-084a/b                       | partner lists/details; PO lists/details/receiving/search                  | cursor 25; RT-3 Q-036                                        |
| network/catalog/mapping     | Q-041..048                                 | projections, mappings, own catalog; buyer catalog/SKU via callable        | RT-4 Q-042; Q-046/047 server callable only                   |
| dashboard                   | Q-050..055, Q-060, Q-063..065              | count/sum aggregations and bounded panels                                 | role-gated; no cache fiction; measure read budget            |
| reports                     | Q-061,061b,062,074..076,085..089           | stock rows/grouping; PO table; five status counts                         | cursor 25/max100; chart uses same filters, never page 1      |

## Realtime set — exact

- RT-1 `Q-008`: current membership/role.
- RT-2 `Q-005`: unread notifications. Exact initial `getCountFromServer()` and separate bounded `limit(50)` listener; `{capped:true}` renders `50+`. Ignore cache-only snapshots.
- RT-3 `Q-036`: current purchase order detail.
- RT-4 `Q-042`: current connection projection.

All other reads are one-shot and cached/invalidation-managed through the approved service layer.

## Service boundary

`features/* -> services/* -> @stockmok/data -> Firebase SDK`. Components never import Firebase. C2 binds org/user context at construction, parses all returned documents, protects cursor/filter scope, and exposes browser-safe repositories. Server-only builders and Zone 4 paths must not enter the client bundle.
