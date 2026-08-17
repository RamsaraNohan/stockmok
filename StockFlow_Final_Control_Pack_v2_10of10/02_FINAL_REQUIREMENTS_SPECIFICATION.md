# StockFlow — Final Requirements Specification v2.0

**Status:** Frozen baseline for UI design and implementation  
**Scope:** Release A + Release B, with Release C optional  
**Coursework authority:** actual PUSL2021 Referral Coursework 2025/26 brief verified  
**Companion authorities:** Scope=`03`, Data=`05`, Security=`06`, Tests=`08`

---

## 1. Product objective

StockFlow shall be implemented as a secure, multi-tenant **Inventory & Procurement Management System** that allows a business to create a workspace, manage products/categories/warehouses/stock, manage private suppliers and buyers, create and receive purchase orders, control staff access, view actionable analytics, and optionally collaborate with another StockFlow organization through validated product mappings and connected purchase orders.

The coursework release prioritizes **complete, correct, demonstrable management-system functionality** over startup-scale feature count.

---

## 2. Requirement classes

| Mark | Meaning |
|---|---|
| A-MUST | Release A; coursework core; cannot be dropped without scope reset |
| B-MUST | Release B-Lite differentiator after Release A gate |
| B-PLUS | Full Release B enhancement; first to cut if schedule slips |
| C-OPTIONAL | Only after A+B stable |
| D-FUTURE | Excluded from coursework implementation |

---

## 3. Actors

Visitor, User, Owner, Admin, Inventory Manager, Procurement Manager, Storekeeper, Analyst, Viewer, Private Supplier, Private Buyer, Connected Buyer Organization, Connected Supplier Organization, and optional Storefront Visitor.

---

# 4. Functional requirements

## 4.1 Public site and authentication

| ID | Priority | Requirement |
|---|---|---|
| FR-AUTH-001 | A-MUST | Provide a one-page public StockFlow website explaining Inventory, Procurement, Connected Businesses and analytics without making Release D features appear mandatory. |
| FR-AUTH-002 | A-MUST | Support email/password registration/sign-in through Firebase Authentication. |
| FR-AUTH-003 | A-MUST | Support Google registration/sign-in through Firebase Authentication. |
| FR-AUTH-004 | A-MUST | Support logout. |
| FR-AUTH-005 | A-MUST | Support Firebase password reset; never store application passwords/hashes. |
| FR-AUTH-006 | A-MUST | Global login routes one-membership users directly and multi-membership users through workspace choice. |
| FR-AUTH-007 | A-MUST | `/b/:handle` resolves only a public OrganizationDirectoryEntry before authentication. |
| FR-AUTH-008 | A-MUST | Role selector is requested context only; actual authorization is verified after auth. |
| FR-AUTH-009 | A-MUST | Authenticated non-member is denied business access. |
| FR-AUTH-010 | A-MUST | Invalid requested role is denied and assigned role may be offered after identity is proven. |

## 4.2 Organization onboarding

| ID | Priority | Requirement |
|---|---|---|
| FR-ORG-001 | A-MUST | User with no organization can create a business. |
| FR-ORG-002 | A-MUST | Required organization fields: name, handle, industry, country, currency, timezone. |
| FR-ORG-003 | A-MUST | Logo optional; monogram/default identity supported. |
| FR-ORG-004 | A-MUST | Generate immutable organizationId. |
| FR-ORG-005 | A-MUST | Handle is normalized, globally unique, atomically reserved and immutable in A/B. |
| FR-ORG-006 | A-MUST | Create canonical Owner membership and OrganizationSettings. |
| FR-ORG-007 | A-MUST | Authenticated routes are `/app/:handle/...`. |
| FR-ORG-008 | A-MUST | Current business and active role remain visible in app shell. |
| FR-ORG-009 | A-MUST | One Firebase identity may belong to multiple organizations. |
| FR-ORG-010 | A-MUST | Workspace switch re-validates membership. |

## 4.3 Team and roles

| ID | Priority | Requirement |
|---|---|---|
| FR-TEAM-001 | A-MUST | Owner/Admin can create invitation for email + one built-in role. |
| FR-TEAM-002 | A-MUST | Invitation produces secure acceptance link/token; email delivery optional. |
| FR-TEAM-003 | A-MUST | Invite acceptance requires authenticated matching email or equivalent verified binding. |
| FR-TEAM-004 | A-MUST | Membership supports ACTIVE, SUSPENDED and REMOVED semantics; invitation state remains separate. |
| FR-TEAM-005 | A-MUST | Owner/Admin can suspend/remove ordinary members. |
| FR-TEAM-006 | A-MUST | Owner/Admin can change ordinary member role. |
| FR-TEAM-007 | A-MUST | Admin cannot change/remove canonical Owner. |
| FR-TEAM-008 | A-MUST | Coursework UI uses one role per membership; schema may remain future-compatible. |
| FR-TEAM-009 | A-MUST | Role-aware navigation hides unavailable actions but is never the security boundary. |

## 4.4 Products/categories/warehouses

| ID | Priority | Requirement |
|---|---|---|
| FR-INV-001 | A-MUST | Create/Read/Update/Archive Products. |
| FR-INV-002 | A-MUST | Create/Read/Update/Archive Categories. |
| FR-INV-003 | A-MUST | Create/Read/Update/Archive Warehouses. |
| FR-INV-004 | A-MUST | internalSku unique within organization. |
| FR-INV-005 | A-MUST | Product has explicit base unit. |
| FR-INV-006 | A-MUST | Product supports purchase cost, optional selling price, minimum stock, reorder target. |
| FR-INV-007 | A-MUST | Product list supports search/filter/sort/bounded pagination. |
| FR-INV-008 | A-MUST | Historical references are not destroyed by hard deletion. |
| FR-INV-009 | A-MUST | Archived Product cannot be selected for new PO/mapping. |
| FR-INV-010 | A-MUST | Warehouse archive blocked while on-hand stock exists. |
| FR-INV-011 | A-MUST | Warehouse archive blocked while required by open receiving workflow. |
| FR-INV-012 | A-MUST | Product detail includes Overview, Stock, Suppliers/Buyers where relevant, Activity; Storefront only if C. |

## 4.5 Stock ledger

| ID | Priority | Requirement |
|---|---|---|
| FR-STOCK-001 | A-MUST | Every material stock change creates immutable StockMovement. |
| FR-STOCK-002 | A-MUST | StockBalance exists per Organization+Product+Warehouse. |
| FR-STOCK-003 | A-MUST | ProductStockSummary maintains Product totals for query-friendly UI. |
| FR-STOCK-004 | A-MUST | Material stock commands execute through trusted backend command in recommended profile. |
| FR-STOCK-005 | A-MUST | Movement + Balance + Summary update occur atomically. |
| FR-STOCK-006 | A-MUST | Manual adjustment requires reason. |
| FR-STOCK-007 | A-MUST | Adjustment UI previews Current → Change → Result. |
| FR-STOCK-008 | A-MUST | Reject adjustment resulting in negative on-hand. |
| FR-STOCK-009 | A-MUST | Low stock = onHandTotal < minimumStock in A/B. |
| FR-STOCK-010 | A-MUST | Out of stock = onHandTotal <= 0. |
| FR-STOCK-011 | A-MUST | Authorized users can view immutable movement history. |
| FR-STOCK-012 | A-MUST | Every stock command has unique operationId and is idempotent. |
| FR-STOCK-013 | A-MUST | Quantity always has unit and consistent decimal precision validation. |
| FR-STOCK-014 | A-MUST | Opening balance is OPENING_BALANCE movement, never direct overwrite. |
| FR-STOCK-015 | D-FUTURE | Reservation is excluded because Storefront checkout is excluded. |

## 4.6 Private suppliers and buyers

| ID | Priority | Requirement |
|---|---|---|
| FR-PART-001 | A-MUST | Create/Read/Update/Deactivate private suppliers. |
| FR-PART-002 | A-MUST | Create/Read/Update/Deactivate private B2B buyers. |
| FR-PART-003 | A-MUST | Private partner supports contact details/notes. |
| FR-PART-004 | A-MUST | Private supplier selectable on private PO. |
| FR-PART-005 | A-MUST | Partner with history deactivated, not hard-deleted. |
| FR-PART-006 | A-MUST | UI clearly distinguishes Private and Connected. |

## 4.7 Private procurement

| ID | Priority | Requirement |
|---|---|---|
| FR-PO-001 | A-MUST | Procurement Manager creates private DRAFT PO. |
| FR-PO-002 | A-MUST | DRAFT needs at least one valid line before ORDERED. |
| FR-PO-003 | A-MUST | Private flow: DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED. |
| FR-PO-004 | A-MUST | DRAFT/ORDERED may CANCEL before any receipt; received history never erased. |
| FR-PO-005 | A-MUST | PO item snapshots product name/SKU/unit/qty/price. |
| FR-PO-006 | A-MUST | Full or partial receipt supported. |
| FR-PO-007 | A-MUST | Reject receive > outstanding. |
| FR-PO-008 | A-MUST | Receipt creates buyer PURCHASE_RECEIPT movement. |
| FR-PO-009 | A-MUST | Receipt command idempotent by operationId. |
| FR-PO-010 | A-MUST | PO receivedQty/status update atomically with inventory. |
| FR-PO-011 | A-MUST | Final/cancelled PO no longer editable as Draft. |

## 4.8 Connected-business network

| ID | Priority | Requirement |
|---|---|---|
| FR-NET-001 | B-MUST | Organization has public OrganizationDirectoryEntry with safe fields only. |
| FR-NET-002 | B-MUST | Support exact-handle lookup such as `@freshfoods`. |
| FR-NET-003 | B-PLUS | Name-prefix discovery only if no external search infrastructure is required. |
| FR-NET-004 | B-MUST | Buyer sends directional supplier connection request. |
| FR-NET-005 | B-MUST | Supplier accepts/rejects. |
| FR-NET-006 | B-MUST | Directional connection unique for buyerOrgId+supplierOrgId. |
| FR-NET-007 | B-MUST | ACTIVE connection required for new mapping/connected PO. |
| FR-NET-008 | B-MUST | Supplier publishes selected Products into PartnerCatalogItem. |
| FR-NET-009 | B-MUST | Connected buyer reads only approved Partner Catalog. |
| FR-NET-010 | B-MUST | Buyer enters/selects exact supplier partner SKU. |
| FR-NET-011 | B-MUST | Show matched supplier item visibly. |
| FR-NET-012 | B-MUST | Require semantic-match confirmation. |
| FR-NET-013 | B-MUST | Require explicit supplier→buyer base-unit conversion. |
| FR-NET-014 | B-MUST | Mapping stores stable IDs, not typed SKU as sole link. |
| FR-NET-015 | B-MUST | Backend re-validates connection/catalog/product on mapping create. |
| FR-NET-016 | B-MUST | Default coursework mapping becomes VERIFIED after buyer validated confirmation. |
| FR-NET-017 | B-PLUS | Bilateral supplier mapping confirmation optional. |
| FR-NET-018 | B-MUST | Disabled connection blocks new work but preserves history. |

## 4.9 Connected PO

| ID | Priority | Requirement |
|---|---|---|
| FR-CPO-001 | B-MUST | Connected DRAFT PO requires ACTIVE connection + VERIFIED mapping. |
| FR-CPO-002 | B-MUST | Flow: DRAFT → SUBMITTED → ACCEPTED → SHIPPED → PARTIALLY_RECEIVED → RECEIVED. |
| FR-CPO-003 | B-MUST | Supplier may REJECT from SUBMITTED. |
| FR-CPO-004 | B-MUST | Buyer may CANCEL DRAFT/SUBMITTED; cancellation after ACCEPTED excluded. |
| FR-CPO-005 | B-MUST | Submission snapshots buyer/supplier item identity, units, conversion and price. |
| FR-CPO-006 | B-MUST | Supplier sees only legitimate shared transaction fields. |
| FR-CPO-007 | B-MUST | Supplier ACCEPT/SHIP transitions use trusted backend. |
| FR-CPO-008 | B-MUST | SHIP creates supplier outbound movement only. |
| FR-CPO-009 | B-MUST | Buyer stock unchanged at SHIPPED. |
| FR-CPO-010 | B-MUST | Buyer receipt creates buyer inbound movement only. |
| FR-CPO-011 | B-MUST | Partial receipt supported. |
| FR-CPO-012 | B-MUST | Connected transitions idempotent by operationId. |
| FR-CPO-013 | B-MUST | PARTIALLY_SHIPPED not implemented. |
| FR-CPO-014 | B-MUST | Both parties see shared status history. |

## 4.10 Dashboard/reporting/notifications

| ID | Priority | Requirement |
|---|---|---|
| FR-DASH-001 | A-MUST | Dashboard: Inventory Value, SKU count, Low Stock, Open POs, Awaiting Receipt, Recent Activity. |
| FR-DASH-002 | A-MUST | Needs Attention links to affected actions. |
| FR-DASH-003 | A-MUST | Dashboard derives from authoritative operational data. |
| FR-DASH-004 | A-MUST | Stock-on-Hand report. |
| FR-DASH-005 | A-MUST | Purchase-Order report. |
| FR-DASH-006 | A-MUST | Basic date/status filtering where applicable. |
| FR-DASH-007 | A-MUST | No manually editable KPI records. |
| FR-NOTIFY-001 | A-MUST | In-app low-stock/staff-relevant notifications needed by A. |
| FR-NOTIFY-002 | B-MUST | B notifications for connection and connected PO transitions. |
| FR-NOTIFY-003 | B-PLUS | Mapping confirmation notification only if bilateral flow built. |

## 4.11 Audit/history

| ID | Priority | Requirement |
|---|---|---|
| FR-AUD-001 | A-MUST | Immutable server-created audit events for sensitive stock/access actions. |
| FR-AUD-002 | A-MUST | Audit opening balance, adjustment, receipt, role/status change, product archive. |
| FR-AUD-003 | B-MUST | Audit connection response, mapping verification and connected PO transitions. |
| FR-AUD-004 | A-MUST | Audit fields include actor, org, action, entity, operation/reference, server timestamp. |

## 4.12 Storefront projection

| ID | Priority | Requirement |
|---|---|---|
| FR-SF-001 | C-OPTIONAL | Owner/Admin may publish safe StorefrontCatalogItem. |
| FR-SF-002 | C-OPTIONAL | Public fields only: name, public SKU, description, image/placeholder, selling price, category, availability. |
| FR-SF-003 | C-OPTIONAL | Release C read-only; no checkout/reservation/write path. |
| FR-SF-004 | D-FUTURE | Full Storefront order integration excluded. |

---

# 5. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-001 | Primary flows responsive; Receiving/login highest mobile priority. |
| NFR-002 | P0 screens have loading, empty, error, success states. |
| NFR-003 | Operational lists use bounded queries/pagination/limits. |
| NFR-004 | Firestore indexes committed to repo. |
| NFR-005 | No critical workflow needs manual DB correction during demo. |
| NFR-006 | Server timestamps; display in org timezone. |
| NFR-007 | Explicit currency; avoid uncontrolled floating-point totals. |
| NFR-008 | Explicit unit + consistent decimal quantity precision. |
| NFR-009 | Meaningful destructive actions require confirmation. |
| NFR-010 | Public, partner and private data physically separated. |
| NFR-011 | UI components separated from data/business-command services. |
| NFR-012 | No secrets/credentials committed. |
| NFR-013 | Production deployment reproducible from README. |
| NFR-014 | Demo dataset resettable/reproducible. |
| NFR-015 | No unhandled console/runtime error on canonical demo. |
| NFR-016 | Accessibility baseline: labels, focus, contrast, non-color-only status, usable errors. |

---

# 6. Business rules / invariants

| ID | Rule |
|---|---|
| BR-001 | Product belongs to one Organization. |
| BR-002 | Stock never directly overwritten by user. |
| BR-003 | StockMovement immutable. |
| BR-004 | Movement + Balance + ProductStockSummary atomic. |
| BR-005 | Stock commands idempotent by operationId. |
| BR-006 | Buyer never writes supplier private stock and vice versa. |
| BR-007 | Shipment affects supplier ledger; receipt affects buyer ledger. |
| BR-008 | SKU validation uses Partner Catalog, never supplier private Product. |
| BR-009 | Valid SKU still requires semantic confirmation. |
| BR-010 | buyerBaseQty = supplierOrderQty × supplierToBuyerBaseFactor. |
| BR-011 | ACTIVE connection required for new mapping/connected PO. |
| BR-012 | Connected PO line snapshots preserve history. |
| BR-013 | Historical records archived/disabled rather than destroyed. |
| BR-014 | Warehouse archive blocked with stock/open receiving dependency. |
| BR-015 | Client-selected role never authorization truth. |
| BR-016 | One canonical Owner protected from Admin. |
| BR-017 | Handle globally unique + immutable in A/B. |
| BR-018 | Exact handle lookup satisfies B discovery. |
| BR-019 | Private supplier workflow does not claim in-platform acceptance. |
| BR-020 | PARTIALLY_SHIPPED excluded. |
| BR-021 | Public/partner projections contain only explicitly approved fields. |
| BR-022 | Disabled mapping/connection remains historical but unavailable for new work. |

---

# 7. Security requirements

| ID | Requirement |
|---|---|
| SEC-001 | Firebase Auth owns credentials. |
| SEC-002 | Every private operation requires authenticated UID. |
| SEC-003 | Organization operation requires ACTIVE membership. |
| SEC-004 | Role re-derived from Membership; client role is untrusted. |
| SEC-005 | OrganizationDirectoryEntry is public-safe projection only. |
| SEC-006 | Own-tenant master-data CRUD may use Client+Rules. |
| SEC-007 | Material stock changes use trusted backend in recommended profile. |
| SEC-008 | Admin SDK functions explicitly re-check auth/membership/role. |
| SEC-009 | Partner Catalog read requires ACTIVE directional connection. |
| SEC-010 | Cross-business state transitions are backend-controlled. |
| SEC-011 | Audit create server-controlled; update/delete denied. |
| SEC-012 | Unauthenticated private/partner reads denied. |
| SEC-013 | Storefront uses StorefrontCatalogItem only. |
| SEC-014 | Client totals/balances/role/org claims are revalidated. |
| SEC-015 | Replay cannot duplicate side effects. |
| SEC-016 | Secrets/service-account credentials never exposed/committed. |

---

# 8. Administrative/coursework requirements

| ID | Requirement |
|---|---|
| ADM-001 | Verify official DLE deadline because brief says TBA. |
| ADM-002 | Verify presentation/demo requirement. |
| ADM-003 | GitHub accessible to evaluators before submission. |
| ADM-004 | GitHub URL in final report. |
| ADM-005 | Final PDF named with index number. |
| ADM-006 | Submit report and source code to DLE. |
| ADM-007 | Student reviews report for own-word/originality/referencing compliance. |
| ADM-008 | Verify current AI-use policy and comply with declarations. |

---

# 9. Coursework traceability

| Brief goal | StockFlow evidence |
|---|---|
| Management System | Release A Inventory & Procurement core |
| CRUD | Product, Category, Warehouse, Partner, Draft PO, Team state |
| Database | Firestore |
| Major features | Scope freeze + acceptance gates |
| Error-free emphasis | P0 QA/security/integrity tests |
| Quality | coherent UI, validation, safe state model |
| Performance | summaries, bounded queries, indexes/aggregations |
| Adaptability | multi-tenant organizations, units, categories, warehouses, roles |
| Reflection | decision log captures real design problems/resolutions |
| Individual contribution | commit/evidence discipline + student understanding |

---

# 10. Requirement freeze rule

No Release A/B requirement may be added during implementation unless it:

1. closes an actual coursework gap;
2. fixes correctness/security;
3. is student-approved;
4. updates affected tests/docs;
5. still passes schedule gate.

Everything else becomes Release D.
