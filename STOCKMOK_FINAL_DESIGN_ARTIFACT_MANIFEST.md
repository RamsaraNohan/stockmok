# STOCKMOK - FINAL DESIGN ARTIFACT MANIFEST

**Re-issued 2026-08-17 under database amendment A3 (`docs/database-final/DB_00` §8.1).**
Authority for identifying canonical final design files. **Every hash in this file was recomputed from
file bytes on 2026-08-17** with `sha256sum`. The previous issue (2026-08-15) recorded hashes that match
no file present for **eight of its ten canonical rows**, and inverted the canonical/superseded
classification for Gates 6, 7 and 9. That issue is void. No `.dc.html` file has been renamed, moved or
edited to produce this one — `DESIGNS_MODIFIED = NO`.

DESIGN_VERSION = v1.0 | DESIGN_PHASE = CLOSED | COMPONENT_COUNT = 25/25
HASHES_MEASURED_FROM_BYTES = YES | HASHES_INHERITED_FROM_PRIOR_ISSUE = NONE

## 0 - How the three contested gates were resolved

Gates 6, 7 and 9 each have two non-identical files whose names differ only by the word `new`. The prior
issue resolved them by *narrative* — "the session artifact carries the Gate-13 patch" — and got all three
backwards. They are resolved here by **content test against the Gate-14 corrections**, which are
mechanical string checks, and by the prior issue's own recorded hashes.

| Gate-14 correction (owner authority) | `... new.dc.html` | `....dc.html` (no "new") |
|---|---|---|
| No Print / PDF / document export for purchase orders | absent - CORRECT | `Print` button present - VIOLATION |
| Canonical wording "Procurement Manager" | present - CORRECT | `Purchasing Manager` - VIOLATION |
| Corrected one-shipment connected-order wording | "one shipment of 10 PACK"; "The whole order, in one shipment" - CORRECT | "shipped in two parts"; "Fresh Foods Ltd shipped 8 PACK / Part of the order" - VIOLATION of the NO MULTI-SHIPMENT invariant |
| Canonical connected flow handle | `@freshfoods` - CORRECT | `@fresh-foods` |
| Gate 6 - no "Issued to kitchen" row | 0 occurrences - CORRECT | 5 occurrences - VIOLATION |
| Gate 6 - warehouse valuation 398,900 / 292,800 | present - CORRECT | 0 occurrences - absent |

The `... new.dc.html` files carry the Gate-13 patch and the Gate-14 approved state. The files **without**
`new` are the **pre-patch** artifacts. Independently, the prior issue's own canonical hash for Gate 6,
`cb94a73c...`, measures to `Stockmok Gate 6 Dashboard Inventory new.dc.html` - so its hash column already
agreed with this conclusion while its filename column contradicted it.

**The prior issue's section 4 instruction to move `cb94a73c...` into `superseded/duplicate-downloads/` is
VOID.** Executing it would have promoted the pre-patch Gate 6 file - the one containing the "Issued to
kitchen" rows and no warehouse valuation - to canonical, and destroyed the evidentiary basis of the
entire database pack, which certifies against `cb94a73c...`.

## 1 - Canonical current set (10 logical artifacts)

| LOGICAL_ARTIFACT | CANONICAL_CURRENT_FILE | STATUS | SHA-256 (measured 2026-08-17) | REASON_CURRENT |
|---|---|---|---|---|
| Design System | `Stockmok Design System.dc.html` | CANONICAL | `8f1880d59c7b5059f3fed6d5e1e6f0b5c6bd16d654b7881e2b482ede3034e697` | Only copy; carries the 25/25 component set and frozen tokens |
| Gate 5 Public / Auth / Onboarding | `Stockmok Gate 5 Public Auth Onboarding.dc.html` | CANONICAL | `27de3d9e60df47bd0de307e765a43dfdf0be29a2db13ec3fa7afcd33089dddf7` | Only copy |
| Gate 6 Dashboard / Inventory | **`Stockmok Gate 6 Dashboard Inventory new.dc.html`** | **CANONICAL** | `cb94a73cbf272600e198a4a57aa644b2cf382d3c5bbedbe266b14307ecf8f984` | Carries the Gate-13 patch: 0 "Issued to kitchen", warehouse valuation LKR 398,900.00 / 292,800.00, "Unit cost" report column, "Store room" filter. This is the hash the prior issue itself recorded as canonical, and the hash the whole database pack certifies against. |
| Gate 7 Private Procurement | **`Stockmok Gate 7 Private Procurement new.dc.html`** | **CANONICAL** | `f8a7c504af984b8a7315e0dfe086f9c0d57330ca9f0f135f8e70bd6630d7ee38` | No Print action; "Procurement Manager". The prior issue filed this hash as superseded; the content test reverses that. |
| Gate 8 Network Foundation | `Stockmok Gate 8 Network Foundation.dc.html` | CANONICAL | `4d6246a25a097ed694590661e389badbb05dd7b880c203937d30df974a1247d7` | Only copy |
| Gate 9 Connected Workflows | **`Stockmok Gate 9 Connected Workflows new.dc.html`** | **CANONICAL** | `e10039879e1a63f16cdd9261e650516b5a1d221f98102af7ad2361472871044c` | "one shipment of 10 PACK"; no Print; "Procurement Manager"; `@freshfoods`. The prior issue filed this hash as superseded; the non-`new` rival draws a **two-part shipment**, which the NO MULTI-SHIPMENT invariant forbids outright. |
| Gate 10 Supporting Operations | `Stockmok Gate 10 Supporting Operations.dc.html` | CANONICAL | `5b1bcf46c52990cf5b74606bf520b8784ce150d3e2d048a09f6f0bc85488e3f7` | Only copy |
| Gate 11 Responsive Reconciliation | `Stockmok Gate 11 Responsive Reconciliation.dc.html` | CANONICAL | `e51514ddd0c10e442108ffc73e8491bb1183d9bc4a49b4793fcf89cb148206ca` | Only copy |
| Gate 12 States + Accessibility | `Stockmok Gate 12 States Accessibility.dc.html` | CANONICAL | `1ab770af37deb4a406c55165d6cf1fd977ffaf24ddc605efe8dea9d23e6c8aca` | Only copy; hash unchanged from the prior issue |
| Gate 14 Owner Approval | `Stockmok Gate 14 Owner Approval.dc.html` | CANONICAL - APPROVED | `a1bbc21b143cfac0ba92ccef7372ef2f82a5270c4399f75fd92be1b3fa702892` | The approved package; hash unchanged from the prior issue; the artifact the freeze attaches to |

Gate 13 produced no standalone visual artifact. GATE_13_VISUAL = NONE_EXISTED.

## 2 - Supporting canonical artifacts

| LOGICAL_ARTIFACT | FILE | STATUS | SHA-256 (measured) |
|---|---|---|---|
| Brand refinement, inlined single file | `Stockmok Brand Refinement.html` | DERIVED_EXPORT | `8f76c236c40abb9eccf9f4154ee836213b715ec2bc14a2fa6cecf6ce2f8c0172` |

`Stockmok Brand Refinement.dc.html` and `Stockmok Brand Refinement Standalone.dc.html` are recorded in the
prior issue but are **not present** in `visual-designs/completed Stockmok Design programme/`. Only the
inlined `.html` export is on disk. Recorded as a fact, not repaired by invention.

## 3 - Historical exploration - NOT implementation authority

| FILE | STATUS | SHA-256 (measured) |
|---|---|---|
| `Stockmok Gate 2 Territories.dc.html` | EXPLORATION | `a870476a3be47f65487d266cda483502b4a445ef96138d4e2c69a0b1e34f757c` |
| `Stockmok Gate 2 Territories 2nd.dc.html` | EXPLORATION | `a255c64e65bbd148d7183a9f979bd10527298a4969b69d4ba53631e8f9f49771` |
| `Stockmok Territory A.dc.html` | EXPLORATION | `14068dca935624bf69cdbb5d776be8d11625d9296ffc7d9b3aaa0a978068db01` |
| `Stockmok Territory B.dc.html` | EXPLORATION | `e02df31a6f74795df458f56fbeb102861d5f283fc5d1df7b76622652da0342ad` |
| `Stockmok Territory C.dc.html` | EXPLORATION | `8fe2b53aaa489b0ee80f0668d4b7c8cd62f1d71d354d32b20422f996dc2a85bd` |

The prior issue called the two Gate 2 files "byte-identical duplicates". **They are not** - the hashes
differ and the sizes differ by 13,027 bytes. Both are exploration and neither is an authority, so the
error is recorded rather than adjudicated.

## 4 - Superseded / duplicate classification (contents unmodified)

| FILE | SHA-256 (measured) | CLASSIFICATION | RECOMMENDED DESTINATION |
|---|---|---|---|
| `Stockmok Gate 6 Dashboard Inventory.dc.html` | `ea760d2b8e6682f038df74d6e5f10072d225a6d55f608886f323d67a3b891a47` | **SUPERSEDED, pre-Gate-13-patch** (5x "Issued to kitchen"; no warehouse valuation) | `generated/25_superseded/replaced-gates/` |
| `Stockmok Gate 7 Private Procurement.dc.html` | `d09c75fe4b5a8e51d32642a4addea9c63032560a2306a65297d00b8744ff4f05` | **SUPERSEDED, pre-Gate-13-patch** ("Purchasing Manager"; Print action) | `generated/25_superseded/replaced-gates/` |
| `Stockmok Gate 9 Connected Workflows.dc.html` | `0f53b4d3781dcbb6736348c8bb73bc855692f0abe5f9c3eec2a4c740f97578ae` | **SUPERSEDED, pre-Gate-13-patch** (two-part shipment; "Purchasing Manager"; Print action) | `generated/25_superseded/replaced-gates/` |
| `Stockmok Gate 9 Connected Workflows new.dc (1).html` | `e10039879e1a63f16cdd9261e650516b5a1d221f98102af7ad2361472871044c` | DUPLICATE_DOWNLOAD - genuinely byte-identical to the canonical Gate 9 | `generated/25_superseded/duplicate-downloads/` |
| Gate 2 files, Territory A/B/C | see section 3 | EXPLORATORY | `generated/25_superseded/exploratory/` |

**No file has been moved.** The destinations above are the owner action recorded in `DB_00` §8.9 item 1.
Until it is performed, each superseded file still sits beside its canonical counterpart under a name that
differs only by the word `new`, and the canonical one is the one that *has* the word.

## 5 - Physical custody warning

The naming is counter-intuitive and it has already caused one documented failure. Anyone consuming these
artifacts must select by **SHA-256**, not by filename or modification time. Recommended remediation, for
the owner: rename each `... new.dc.html` to the canonical name **after** moving the pre-patch file to
`25_superseded/replaced-gates/`, then re-issue this manifest with the new filenames and unchanged hashes.

FINAL_FRONTEND_AUTHORITY_SET = UNAMBIGUOUS_BY_HASH
UNRESOLVED_CLASSIFICATIONS = 0
PHYSICAL_CUSTODY_ACTION_OUTSTANDING = YES (owner; DB_00 §8.9 item 1)
