# Stockmok Final UI Microcopy Library

**Status:** AUTHORITATIVE  
**Scope:** Release A + Release B-Lite only  
**Owner:** exact user-facing words for screens, components, validation, command outcomes and machine-reason mapping  
**Sources:** v3 files 02, 04-07, 10, 11 and 17; UI files 18, 20-22  
**Exclusions:** Release B-PLUS, C and D; no marketplace, storefront, checkout, POS, sales-order, AI, forecasting, global-search, command-palette or email-delivery claims

**Authority rule:** this file owns literal visible strings. Action names in files 18-23 are stable functional-ledger labels and route outcomes, not competing display-copy definitions. Files 18 and canonical workflow sources 04/16 continue to own sample data, quantities, and arithmetic.

## 1. Copy contract

1. Every reusable string has one stable `COPY-###` identifier. Implementations and image prompts reference the ID; they do not silently rewrite its text.
2. Text inside backticks is exact display copy. Sentence case is mandatory except for the frozen sidebar section labels.
3. Tokens in braces are interpolated from authorized, already-loaded data. Never interpolate a name or identifier before the relevant route/resource permission succeeds.
4. Supported tokens are `{organizationName}`, `{organizationHandle}`, `{role}`, `{requiredRole}`, `{productName}`, `{sku}`, `{warehouseName}`, `{partnerName}`, `{partnerHandle}`, `{supplierName}`, `{supplierHandle}`, `{supplierItemName}`, `{supplierUnit}`, `{buyerUnit}`, `{factor}`, `{poNumber}`, `{mappingName}`, `{memberName}`, `{email}`, `{unit}`, `{current}`, `{change}`, `{result}`, `{quantity}`, `{outstanding}`, `{currency}`, `{amount}`, `{movementId}`, `{reference}`, `{expiresAt}`, `{count}`, `{from}`, `{to}`, `{total}`, `{filterName}` and `{action}`.
5. Authentication copy is neutral. It never confirms whether an email, user, membership or private resource exists before authentication and authorization.
6. Raw Firebase codes, reason keys, stack traces, document paths, organization IDs and operation IDs are never shown. A movement or purchase-order reference may be shown when the command returns it.
7. Toasts supplement a durable visible result. They are never the only confirmation of a mutation.
8. `Private` means an organization-owned directory relationship. `Connected` means a purpose-built shared surface. Private is complete, not a fallback.
9. Archive, deactivate, disable, suspend, remove and revoke are distinct words and must not be substituted for one another. `Delete` is not used for domain records.
10. Quantities always include the explicit unit and up to three decimals. Money always includes currency; canonical examples use `LKR`.

## 2. Canonical display vocabulary and data

| COPY ID | Use | Exact text |
|---|---|---|
| COPY-001 | Product name | `Stockmok` |
| COPY-002 | Buyer organization | `Grand Ocean Hotel` |
| COPY-003 | Buyer handle | `@grand-ocean` |
| COPY-004 | Connected supplier | `Fresh Foods Ltd` |
| COPY-005 | Connected supplier handle | `@freshfoods` |
| COPY-006 | Demonstration user | `Nimal Perera` |
| COPY-007 | Demonstration assigned role | `Inventory Manager` |
| COPY-008 | Demonstration requested role | `Owner` |
| COPY-009 | Product | `Chicken Breast` |
| COPY-010 | Product SKU | `MEAT-001` |
| COPY-011 | Supplier item | `Fresh Chicken Breast 5 KG Pack` |
| COPY-012 | Supplier SKU | `CKN-B5` |
| COPY-013 | Supplier order unit | `PACK` |
| COPY-014 | Buyer base unit | `KG` |
| COPY-015 | Private supplier | `Green Farm` |
| COPY-016 | Default warehouse | `Main Store` |
| COPY-017 | Demonstration warehouse | `Cold Room` |
| COPY-018 | Adjustment reason | `Recount correction` |
| COPY-019 | Canonical conversion | `1 PACK = 5 KG` |
| COPY-020 | Canonical order conversion | `10 PACK = 50 KG` |
| COPY-021 | Canonical stock chain | `18 KG → 20 KG → 60 KG → 70 KG → 70 KG → 110 KG → 120 KG` |
| COPY-022 | Canonical final value | `LKR 691,700.00` |
| COPY-023 | Role name | `Owner` |
| COPY-024 | Role name | `Admin` |
| COPY-025 | Role name | `Inventory Manager` |
| COPY-026 | Role name | `Procurement Manager` |
| COPY-027 | Role name | `Storekeeper` |
| COPY-028 | Role name | `Analyst` |
| COPY-029 | Role name | `Viewer` |

The isolated `18 → 58 → 68 KG` sequence is superseded and must never appear in UI copy or final visuals.

## 3. Navigation, page titles and tabs

| COPY ID | Use | Exact text |
|---|---|---|
| COPY-030 | Sidebar item/page title | `Dashboard` |
| COPY-031 | Sidebar section | `INVENTORY` |
| COPY-032 | Sidebar item/page title | `Products` |
| COPY-033 | Sidebar item/page title | `Categories` |
| COPY-034 | Sidebar item/page title | `Warehouses` |
| COPY-035 | Sidebar item/page title | `Stock Movements` |
| COPY-036 | Sidebar section | `PROCUREMENT` |
| COPY-037 | Sidebar item/page title | `Purchase Orders` |
| COPY-038 | Sidebar item/page title | `Receiving` |
| COPY-039 | Sidebar item/page title | `Suppliers` |
| COPY-040 | Sidebar item/page title | `Buyers` |
| COPY-041 | Sidebar section | `NETWORK` |
| COPY-042 | Sidebar item/page title | `Connected Businesses` |
| COPY-043 | Sidebar item/page title | `Partner Catalog` |
| COPY-044 | Sidebar item/page title | `Product Mappings` |
| COPY-045 | Sidebar item/page title | `Reports` |
| COPY-046 | Sidebar item/page title | `Notifications` |
| COPY-047 | Sidebar item/page title | `Team` |
| COPY-048 | Sidebar item/page title | `Settings` |
| COPY-049 | Public page title | `Inventory and procurement, in one clear workflow` |
| COPY-050 | Sign-up title | `Create your Stockmok account` |
| COPY-051 | Global-login title | `Sign in to Stockmok` |
| COPY-052 | Branded-login title | `Sign in to {organizationName}` |
| COPY-053 | Workspace-selector title | `Choose a workspace` |
| COPY-054 | Onboarding title | `Create your workspace` |
| COPY-055 | Product-create title | `New product` |
| COPY-056 | Product-edit title | `Edit {productName}` |
| COPY-057 | PO-builder title | `New purchase order` |
| COPY-058 | Team invitation title | `Invite a team member` |
| COPY-059 | Password-reset title | `Reset your password` |
| COPY-060 | Opening-balance title | `Record opening balance` |
| COPY-061 | Stock-adjustment title | `Adjust stock` |
| COPY-062 | Business-discovery title | `Find a Stockmok business` |
| COPY-063 | Mapping-wizard title | `Create product mapping` |
| COPY-064 | Publish-dialog title | `Publish partner item` |
| COPY-065 | Permission page title | `You do not have access to this page` |
| COPY-066 | Not-found page title | `Page not found` |
| COPY-067 | Dashboard section | `Needs attention` |
| COPY-068 | Dashboard section | `Recent activity` |
| COPY-069 | Dashboard section | `Low stock` |
| COPY-070 | Dashboard section | `Recent purchase orders` |
| COPY-071 | Dashboard section/chart | `Inventory by location` |
| COPY-072 | Dashboard chart | `Stock status` |
| COPY-073 | Report chart | `Purchase orders by status` |
| COPY-074 | Product tab | `Overview` |
| COPY-075 | Product tab | `Stock` |
| COPY-076 | Product tab | `Suppliers` |
| COPY-077 | Product tab | `Buyers` |
| COPY-078 | Product tab | `Activity` |
| COPY-079 | Directory tab | `Private` |
| COPY-080 | Directory tab | `Connected` |
| COPY-081 | Directory tab | `Pending` |
| COPY-082 | Report tab | `Stock on Hand` |
| COPY-083 | Report tab | `Purchase Orders` |
| COPY-084 | Notification tab | `All` |
| COPY-085 | Notification tab | `Unread` |
| COPY-086 | Notification tab | `Read` |
| COPY-087 | Settings tab | `Organization Profile` |
| COPY-088 | Settings tab | `Defaults` |
| COPY-089 | Settings tab | `Notifications` |
| COPY-090 | Settings tab | `Feature Flags` |

## 4. Actions and control labels

| COPY ID | Use | Exact text |
|---|---|---|
| COPY-091 | Public CTA | `Create Workspace` |
| COPY-092 | Auth CTA | `Sign in` |
| COPY-093 | Auth provider CTA | `Continue with Google` |
| COPY-094 | Auth link | `Forgot password?` |
| COPY-095 | Branded-login escape | `Not your business? Go to Stockmok login` |
| COPY-096 | Sign-up cross-link | `Already have an account? Sign in` |
| COPY-097 | Password-reset submit | `Send reset instructions` |
| COPY-098 | Password-reset return | `Back to sign in` |
| COPY-099 | Workspace action | `Open workspace` |
| COPY-100 | Workspace action | `Create a new workspace` |
| COPY-101 | Onboarding action | `Continue` |
| COPY-102 | Wizard action | `Back` |
| COPY-103 | Onboarding submit | `Create business` |
| COPY-104 | Generic non-destructive action | `Cancel` |
| COPY-105 | Generic save | `Save changes` |
| COPY-106 | Generic create | `Create` |
| COPY-107 | Generic edit | `Edit` |
| COPY-108 | Generic view | `View` |
| COPY-109 | Retry | `Try again` |
| COPY-110 | Filter action | `Apply filters` |
| COPY-111 | Filter action | `Clear filters` |
| COPY-112 | Pagination | `Previous` |
| COPY-113 | Pagination | `Next` |
| COPY-114 | Pagination range | `Showing {from}–{to} of {total}` |
| COPY-115 | Product action | `Add product` |
| COPY-116 | Product submit | `Save product` |
| COPY-117 | Product action | `Archive product` |
| COPY-118 | Product action | `Restore product` |
| COPY-119 | Category action | `Add category` |
| COPY-120 | Warehouse action | `Add warehouse` |
| COPY-121 | Warehouse action | `Archive warehouse` |
| COPY-122 | Stock action | `Record opening balance` |
| COPY-123 | Stock action | `Adjust stock` |
| COPY-124 | Stock submit | `Confirm adjustment` |
| COPY-125 | Partner action | `Add private supplier` |
| COPY-126 | Partner action | `Add private buyer` |
| COPY-127 | Partner action | `Deactivate` |
| COPY-128 | PO action | `Create purchase order` |
| COPY-129 | PO action | `Save draft` |
| COPY-130 | Private PO transition | `Place order` |
| COPY-131 | Connected PO transition | `Submit to supplier` |
| COPY-132 | PO transition | `Cancel order` |
| COPY-133 | Receiving action | `Receive goods` |
| COPY-134 | Receiving submit | `Receive selected items` |
| COPY-135 | Report action | `Export CSV` |
| COPY-136 | Notification action | `Mark as read` |
| COPY-137 | Notification action | `Mark all as read` |
| COPY-138 | Notification action | `View all notifications` |
| COPY-139 | Team action | `Invite user` |
| COPY-140 | Invitation action | `Copy invitation link` |
| COPY-141 | Invitation action | `Accept invitation` |
| COPY-142 | Team action | `Change role` |
| COPY-143 | Team action | `Suspend member` |
| COPY-144 | Team action | `Remove member` |
| COPY-145 | Invitation action | `Revoke invitation` |
| COPY-146 | Settings action | `Save organization profile` |
| COPY-147 | Settings action | `Save business defaults` |
| COPY-148 | Discovery action | `Find business` |
| COPY-149 | Connection action | `Connect as Supplier` |
| COPY-150 | Connection action | `Accept request` |
| COPY-151 | Connection action | `Reject request` |
| COPY-152 | Connection action | `Disable connection` |
| COPY-153 | Catalog action | `Publish` |
| COPY-154 | Catalog action | `Unpublish` |
| COPY-155 | Mapping action | `New mapping` |
| COPY-156 | Mapping lookup action | `Check supplier SKU` |
| COPY-157 | Mapping submit | `Create verified mapping` |
| COPY-158 | Mapping action | `Disable mapping` |
| COPY-159 | Connected PO action | `Accept order` |
| COPY-160 | Connected PO action | `Reject order` |
| COPY-161 | Connected PO action | `Mark as shipped` |
| COPY-162 | Shell action | `Switch workspace` |
| COPY-163 | Shell action | `Open navigation` |
| COPY-164 | Shell action | `Close navigation` |
| COPY-165 | Shell action | `Collapse navigation` |
| COPY-166 | Shell action | `Expand navigation` |
| COPY-167 | Shell action | `Sign out` |
| COPY-168 | Recovery link | `Return to dashboard` |
| COPY-169 | Recovery link | `Go to Stockmok home` |
| COPY-170 | Clipboard confirmation | `Link copied` |

## 5. Field labels, options and helper text

| COPY ID | Use | Exact text |
|---|---|---|
| COPY-171 | Field | `Email` |
| COPY-172 | Field | `Password` |
| COPY-173 | Field | `Role` |
| COPY-174 | Role option | `Detect automatically` |
| COPY-175 | Role helper | `Role selection is a sign-in preference. Your assigned role controls access.` |
| COPY-176 | Field | `Business name` |
| COPY-177 | Field | `Handle` |
| COPY-178 | Handle prefix | `@` |
| COPY-179 | Handle helper | `Your handle appears in workspace links and cannot be changed later.` |
| COPY-180 | Handle preview | `Your workspace link will use @{organizationHandle}.` |
| COPY-181 | Field | `Industry` |
| COPY-182 | Field | `Country` |
| COPY-183 | Field | `Currency` |
| COPY-184 | Field | `Timezone` |
| COPY-185 | Field | `First warehouse` |
| COPY-186 | Field | `Product name` |
| COPY-187 | Field | `Internal SKU` |
| COPY-188 | SKU helper | `SKUs are unique within this workspace.` |
| COPY-189 | Field | `Category` |
| COPY-190 | Field | `Base unit` |
| COPY-191 | Field | `Purchase cost` |
| COPY-192 | Field | `Selling price` |
| COPY-193 | Field | `Minimum stock` |
| COPY-194 | Minimum helper | `Set to 0 if low-stock tracking is not required.` |
| COPY-195 | Field | `Reorder target` |
| COPY-196 | Field | `Warehouse` |
| COPY-197 | Field | `Direction` |
| COPY-198 | Direction option | `Increase` |
| COPY-199 | Direction option | `Decrease` |
| COPY-200 | Field | `Quantity` |
| COPY-201 | Field | `Reason` |
| COPY-202 | Field | `Reference` |
| COPY-203 | Optional marker | `Optional` |
| COPY-204 | Stock preview label | `Current` |
| COPY-205 | Stock preview label | `Change` |
| COPY-206 | Stock preview label | `Result` |
| COPY-207 | Partner field | `Partner name` |
| COPY-208 | Partner field | `Contact person` |
| COPY-209 | Partner field | `Phone` |
| COPY-210 | Partner field | `Address` |
| COPY-211 | Shared field | `Notes` |
| COPY-212 | PO field | `Supplier` |
| COPY-213 | PO field | `Order type` |
| COPY-214 | PO option | `Private supplier` |
| COPY-215 | PO option | `Connected supplier` |
| COPY-216 | PO field | `Expected date` |
| COPY-217 | PO field | `Ordered quantity` |
| COPY-218 | PO field | `Unit price` |
| COPY-219 | Receiving field | `Receive now` |
| COPY-220 | Receiving label | `Already received` |
| COPY-221 | Receiving label | `Outstanding after` |
| COPY-222 | Receiving label | `Stock after` |
| COPY-223 | Invitation field | `Invitation email` |
| COPY-224 | Invitation field | `Invitation role` |
| COPY-225 | Discovery field | `Business handle` |
| COPY-226 | Discovery helper | `Enter the exact handle. Stockmok does not browse or fuzzy-match businesses.` |
| COPY-227 | Catalog field | `Internal product` |
| COPY-228 | Catalog field | `Partner item name` |
| COPY-229 | Catalog field | `Partner SKU` |
| COPY-230 | Catalog field | `Order unit` |
| COPY-231 | Catalog field | `Pack description` |
| COPY-232 | Catalog field | `Availability` |
| COPY-233 | Availability option | `Available` |
| COPY-234 | Availability option | `Unavailable` |
| COPY-235 | Mapping field | `Your product` |
| COPY-236 | Mapping field | `Supplier SKU` |
| COPY-237 | Mapping field | `Conversion factor` |
| COPY-238 | Connected PO field | `Rejection reason` |
| COPY-239 | Filter | `Search` |
| COPY-240 | Filter | `Stock status` |
| COPY-241 | Filter | `PO status` |
| COPY-242 | Filter | `Include archived` |
| COPY-243 | Filter result | `No filters applied` |
| COPY-244 | Required marker accessible label | `Required` |

## 6. Validation copy

| COPY ID | Use | Exact text |
|---|---|---|
| COPY-245 | Required text | `Enter a value.` |
| COPY-246 | Required selection | `Choose an option.` |
| COPY-247 | Email validation | `Enter a valid email address.` |
| COPY-248 | Password validation | `Enter your password.` |
| COPY-249 | Handle syntax | `Use 3–30 lowercase letters, numbers or hyphens. Do not start or end with a hyphen.` |
| COPY-250 | Handle reserved | `This handle is reserved. Choose another.` |
| COPY-251 | Handle taken | `This handle is already in use. Choose another.` |
| COPY-252 | SKU required | `Enter an internal SKU.` |
| COPY-253 | SKU duplicate | `This SKU is already used in this workspace.` |
| COPY-254 | Number invalid | `Enter a valid number.` |
| COPY-255 | Quantity positive | `Enter a quantity greater than 0.` |
| COPY-256 | Money non-negative | `Enter an amount of 0 or more.` |
| COPY-257 | Minimum non-negative | `Minimum stock cannot be negative.` |
| COPY-258 | Reorder non-negative | `Reorder target cannot be negative.` |
| COPY-259 | Adjustment reason | `Enter a reason for this adjustment.` |
| COPY-260 | Negative-result validation | `This adjustment would reduce stock below 0 {unit}. Enter a smaller quantity.` |
| COPY-261 | Date-range validation | `The start date must be on or before the end date.` |
| COPY-262 | PO line validation | `Add at least one item to this purchase order.` |
| COPY-263 | PO quantity validation | `Enter an order quantity greater than 0.` |
| COPY-264 | Receipt selection | `Enter a quantity for at least one item.` |
| COPY-265 | Over-receipt validation | `You can receive up to {outstanding} {unit}.` |
| COPY-266 | Invitation role validation | `Choose a role for this invitation.` |
| COPY-267 | Supplier SKU required | `Enter the exact supplier SKU.` |
| COPY-268 | Semantic validation | `Confirm that both records refer to the same real-world item.` |
| COPY-269 | Conversion validation | `Enter a conversion factor greater than 0.` |
| COPY-270 | Connected rejection validation | `Enter a reason for rejecting this order.` |
| COPY-271 | Filter correction | `The {filterName} filter was not recognized and has been cleared.` |
| COPY-272 | Field length | `Use {count} characters or fewer.` |

## 7. Shared loading, empty, error and success states

| COPY ID | Use | Exact text |
|---|---|---|
| COPY-273 | Generic loading accessible label | `Loading content` |
| COPY-274 | Auth loading | `Checking your sign-in…` |
| COPY-275 | Organization loading | `Loading workspace…` |
| COPY-276 | Table loading | `Loading results…` |
| COPY-277 | Submit state | `Saving…` |
| COPY-278 | Command state | `Working…` |
| COPY-279 | Search state | `Searching…` |
| COPY-280 | Export state | `Preparing CSV…` |
| COPY-281 | Generic error title | `We could not load this content` |
| COPY-282 | Generic error body | `Check your connection and try again.` |
| COPY-283 | Command error title | `We could not complete that action` |
| COPY-284 | Command error body | `Nothing has been changed. Try again.` |
| COPY-285 | Unknown command outcome | `We could not confirm the result. Try again to safely check the same request.` |
| COPY-286 | Empty filter title | `No matching results` |
| COPY-287 | Empty filter body | `Clear or change the filters to see more results.` |
| COPY-288 | Generic success | `Changes saved.` |
| COPY-289 | Retry success | `Completed successfully. No duplicate change was made.` |
| COPY-290 | Copy failure | `The link could not be copied. Select and copy it manually.` |
| COPY-291 | Permission tooltip | `Requires {requiredRole} access.` |
| COPY-292 | State tooltip | `Available when {action}.` |
| COPY-293 | No longer accessible link | `You no longer have access to the linked item.` |
| COPY-294 | Empty chart summary | `There is not enough data to summarize yet.` |
| COPY-295 | No data label | `No data` |
| COPY-296 | Current filters summary | `{count} filters applied` |
| COPY-297 | Singular filter summary | `1 filter applied` |

## 8. Authentication, workspace and onboarding

| COPY ID | Use | Exact text |
|---|---|---|
| COPY-298 | Neutral sign-in failure | `We could not sign you in with those details. Check them and try again.` |
| COPY-299 | Branded resolving | `Finding this Stockmok business…` |
| COPY-300 | Safe branded not-found title | `Business sign-in unavailable` |
| COPY-301 | Safe branded not-found body | `Check the business link or sign in through Stockmok.` |
| COPY-302 | Non-member title | `This account does not have access to {organizationName}` |
| COPY-303 | Non-member body | `Ask an Owner or Admin of this business for an invitation, or choose another workspace.` |
| COPY-304 | Role mismatch title | `Your assigned role is {role}` |
| COPY-305 | Role mismatch body | `You requested {requiredRole}, but access is based on your assigned workspace role.` |
| COPY-306 | Correct-role action | `Continue as {role}` |
| COPY-307 | Suspended auth title | `Your access to this workspace is suspended` |
| COPY-308 | Suspended auth body | `Contact an Owner or Admin of {organizationName} if you believe this is a mistake.` |
| COPY-309 | Password reset neutral success | `If an account uses that email, password reset instructions are available through its sign-in provider.` |
| COPY-310 | Workspace selector helper | `Choose the business you want to work in. Your access is checked again before it opens.` |
| COPY-311 | No workspace title | `No active workspaces` |
| COPY-312 | No workspace body | `Create a workspace or accept an invitation to get started.` |
| COPY-313 | Workspace stale | `Your access to {organizationName} changed. The workspace list has been refreshed.` |
| COPY-314 | Onboarding step | `Step 1 of 4 · Business` |
| COPY-315 | Onboarding step | `Step 2 of 4 · Locale` |
| COPY-316 | Onboarding step | `Step 3 of 4 · First location` |
| COPY-317 | Onboarding step | `Step 4 of 4 · Review` |
| COPY-318 | Handle available | `@{organizationHandle} is available.` |
| COPY-319 | Onboarding atomicity | `Your workspace is created only after every step succeeds.` |
| COPY-320 | Onboarding failure | `Your workspace was not created. Review the message below and try again.` |
| COPY-321 | Onboarding success | `{organizationName} is ready.` |
| COPY-322 | Emulator ribbon | `EMULATOR` |

## 9. Dashboard, inventory and archive copy

| COPY ID | Use | Exact text |
|---|---|---|
| COPY-323 | KPI | `Inventory Value` |
| COPY-324 | KPI | `Active SKUs` |
| COPY-325 | KPI | `Low Stock` |
| COPY-326 | KPI | `Open Purchase Orders` |
| COPY-327 | KPI | `Awaiting Receipt` |
| COPY-328 | Empty dashboard title | `Set up your inventory` |
| COPY-329 | Empty dashboard body | `Complete these steps to start tracking stock and purchase orders.` |
| COPY-330 | Checklist item | `Add a category` |
| COPY-331 | Checklist item | `Add a product` |
| COPY-332 | Checklist item | `Record opening stock` |
| COPY-333 | Checklist item | `Add a supplier` |
| COPY-334 | Checklist item | `Invite your team` |
| COPY-335 | Empty products title | `No products yet` |
| COPY-336 | Empty products body | `Add your first product to begin tracking inventory.` |
| COPY-337 | Empty categories title | `No categories yet` |
| COPY-338 | Empty categories body | `Add a category to organize your products.` |
| COPY-339 | Empty warehouses title | `No warehouses yet` |
| COPY-340 | Empty warehouses body | `Add a warehouse to track stock by location.` |
| COPY-341 | Empty movements title | `No stock movements yet` |
| COPY-342 | Empty movements body | `Opening balances, adjustments and receipts will appear here.` |
| COPY-343 | Opening-balance helper | `This creates an immutable opening-balance movement for the selected product and warehouse.` |
| COPY-344 | Opening preview | `Opening balance: {quantity} {unit}` |
| COPY-345 | Opening success | `Opening balance recorded. Movement {movementId}.` |
| COPY-346 | Opening duplicate | `An opening balance has already been recorded for this product and warehouse.` |
| COPY-347 | Adjustment preview | `{current} {unit} → {result} {unit}` |
| COPY-348 | Adjustment success | `Stock adjusted to {result} {unit}. Movement {movementId}.` |
| COPY-349 | Adjustment replay | `Stock remains {result} {unit}. This adjustment was already recorded as movement {movementId}.` |
| COPY-350 | Archive product title | `Archive {productName}?` |
| COPY-351 | Archive product body | `This product will be hidden from active lists and unavailable for new purchase orders and mappings. History will remain available.` |
| COPY-352 | Archive product success | `{productName} archived.` |
| COPY-353 | Restore product success | `{productName} restored.` |
| COPY-354 | Archive warehouse title | `Archive {warehouseName}?` |
| COPY-355 | Archive warehouse body | `This warehouse can be archived only when its stock is zero and no open receiving workflow uses it.` |
| COPY-356 | Warehouse stock blocker | `Move or reduce all stock in {warehouseName} to zero before archiving it.` |
| COPY-357 | Warehouse receiving blocker | `Finish or redirect open receiving work for {warehouseName} before archiving it.` |
| COPY-358 | Warehouse combined blocker | `{warehouseName} has stock and open receiving work. Clear both before archiving it.` |
| COPY-359 | Warehouse archive success | `{warehouseName} archived.` |
| COPY-360 | Archived product notice | `Archived products remain available in history but cannot be used for new work.` |
| COPY-361 | Immutable movement notice | `Stock movements are permanent records and cannot be edited or deleted.` |

## 10. Private partners, purchase orders and receiving

| COPY ID | Use | Exact text |
|---|---|---|
| COPY-362 | Empty private suppliers | `No private suppliers yet` |
| COPY-363 | Empty private suppliers body | `Add a supplier you order from. They do not need a Stockmok account.` |
| COPY-364 | Empty private buyers | `No private buyers yet` |
| COPY-365 | Empty private buyers body | `Add buyer contact details for your directory. Sales orders are not part of this release.` |
| COPY-366 | Connected tab disabled | `Connected businesses are not enabled for this workspace.` |
| COPY-367 | Connected tab disabled body | `Private suppliers and buyers remain fully available.` |
| COPY-368 | Deactivate partner title | `Deactivate {partnerName}?` |
| COPY-369 | Deactivate partner body | `This partner will be unavailable for new work. Existing purchase orders and history will remain available.` |
| COPY-370 | Deactivate partner success | `{partnerName} deactivated.` |
| COPY-371 | Empty PO title | `No purchase orders yet` |
| COPY-372 | Empty PO body writer | `Create a purchase order to track ordering and receiving.` |
| COPY-373 | Empty PO body reader | `Purchase orders you can view will appear here.` |
| COPY-374 | Private label | `Private` |
| COPY-375 | Connected label | `Connected` |
| COPY-376 | Draft privacy note | `This connected draft is visible only to {organizationName} until it is submitted.` |
| COPY-377 | Private order confirmation title | `Place purchase order {poNumber}?` |
| COPY-378 | Private order confirmation body | `The order will move from Draft to Ordered. Product, quantity, price and supplier details will be frozen for history.` |
| COPY-379 | Private order success | `Purchase order {poNumber} placed.` |
| COPY-380 | Cancel PO title | `Cancel purchase order {poNumber}?` |
| COPY-381 | Cancel private PO body | `The order will be marked Cancelled. It cannot be received after cancellation.` |
| COPY-382 | Cancel connected PO body | `The order will be marked Cancelled for both businesses. This is available only before supplier acceptance.` |
| COPY-383 | Cancel PO success | `Purchase order {poNumber} cancelled.` |
| COPY-384 | Receiving consequence | `Receiving {quantity} {unit} changes stock from {current} {unit} to {result} {unit}.` |
| COPY-385 | Connected receiving consequence | `Receiving {quantity} {unit} adds {change} to your inventory and changes stock from {current} to {result}.` |
| COPY-386 | Partial receipt success | `Receipt recorded for {poNumber}. {outstanding} {unit} remains outstanding.` |
| COPY-387 | Full receipt success | `Purchase order {poNumber} is fully received.` |
| COPY-388 | Receipt replay | `This receipt was already recorded. No additional stock was added.` |
| COPY-389 | Receiving empty title | `No purchase orders are ready to receive` |
| COPY-390 | Receiving empty body | `Ordered or shipped purchase orders with outstanding items will appear here.` |
| COPY-391 | Receipt stale | `This purchase order changed after the page loaded. Review the latest outstanding quantities before receiving.` |
| COPY-392 | Invalid PO state | `This action is not available while the purchase order is {action}. Refresh to see its current status.` |
| COPY-393 | Archived product PO error | `{productName} is archived and cannot be added to a new purchase order.` |
| COPY-394 | Deactivated supplier PO error | `{supplierName} is deactivated and cannot be used for a new purchase order.` |

## 11. Connections, catalog, mappings and connected orders

| COPY ID | Use | Exact text |
|---|---|---|
| COPY-395 | Empty connections title | `No connected businesses yet` |
| COPY-396 | Empty connections body | `Find a Stockmok business by its exact handle to request a supplier connection.` |
| COPY-397 | Discovery idle | `Enter a business handle to find an exact match.` |
| COPY-398 | Discovery searching | `Looking for @{organizationHandle}…` |
| COPY-399 | Discovery not found | `No Stockmok business uses that handle.` |
| COPY-400 | Discovery found | `Business found` |
| COPY-401 | Discovery self | `You cannot connect {organizationName} to itself.` |
| COPY-402 | Discovery active | `{organizationName} is already connected as a supplier.` |
| COPY-403 | Discovery pending | `A connection request with {organizationName} is already pending.` |
| COPY-404 | Connection requested | `Connection request sent to {organizationName}.` |
| COPY-405 | Connection accepted | `Connection with {organizationName} is active.` |
| COPY-406 | Connection rejected | `Connection request from {organizationName} rejected.` |
| COPY-407 | Disable connection title | `Disable connection with {organizationName}?` |
| COPY-408 | Disable connection body | `New mappings and connected purchase orders will be blocked. Existing mappings, orders and stock history will remain available.` |
| COPY-409 | Connection disabled | `Connection with {organizationName} disabled.` |
| COPY-410 | Connection inactive | `Your connection to {organizationName} is no longer active.` |
| COPY-411 | Empty own catalog title | `No partner items published` |
| COPY-412 | Empty own catalog body | `Publish selected product details for connected buyers.` |
| COPY-413 | Empty buyer catalog title | `No published items` |
| COPY-414 | Empty buyer catalog body | `{supplierName} has not published any items to connected buyers.` |
| COPY-415 | Partner projection notice | `This is a partner projection, not {supplierName}'s inventory. Exact stock, costs, warehouses and other private data are not shared.` |
| COPY-416 | Publish privacy notice | `Connected buyers will see the partner fields below. They cannot see your stock quantities, your costs, your warehouses or any other private data.` |
| COPY-417 | Order unit invariant | `Order unit must match the product's base unit in this release.` |
| COPY-418 | Publish success | `{productName} published to the partner catalog.` |
| COPY-419 | Unpublish title | `Unpublish {productName}?` |
| COPY-420 | Unpublish body | `Connected buyers will no longer find this item for new mappings. Existing history will remain available.` |
| COPY-421 | Unpublish success | `{productName} unpublished from the partner catalog.` |
| COPY-422 | Mapping step | `Step 1 of 5 · Supplier` |
| COPY-423 | Mapping step | `Step 2 of 5 · Supplier SKU` |
| COPY-424 | Mapping step | `Step 3 of 5 · Confirm item` |
| COPY-425 | Mapping step | `Step 4 of 5 · Unit conversion` |
| COPY-426 | Mapping step | `Step 5 of 5 · Review` |
| COPY-427 | Mapping lookup idle | `Enter the exact partner SKU published by {supplierName}.` |
| COPY-428 | Mapping lookup loading | `Checking {supplierName}'s partner catalog…` |
| COPY-429 | Mapping found title | `Partner item found` |
| COPY-430 | Mapping SKU absent | `No published item matches that supplier SKU.` |
| COPY-431 | Mapping SKU unpublished | `That item exists but is not currently published to you.` |
| COPY-432 | Mapping semantic confirmation | `I confirm that {supplierItemName} and {productName} ({sku}) are the same real-world item.` |
| COPY-433 | Mapping factor template | `1 {supplierUnit} = {factor} {buyerUnit}` |
| COPY-434 | Mapping preview template | `{quantity} {supplierUnit} = {result} {buyerUnit}` |
| COPY-435 | Mapping success | `Verified mapping created between {productName} and {supplierItemName}.` |
| COPY-436 | Mapping duplicate | `A verified mapping already links these items.` |
| COPY-437 | Disable mapping title | `Disable this product mapping?` |
| COPY-438 | Disable mapping body | `The mapping cannot be used for new connected purchase orders. Existing order snapshots and history will remain available.` |
| COPY-439 | Disable mapping success | `Product mapping disabled.` |
| COPY-440 | Mapping required | `Every connected order line needs an active verified product mapping.` |
| COPY-441 | Submit connected title | `Submit purchase order {poNumber} to {supplierName}?` |
| COPY-442 | Submit connected body | `The order becomes visible to both businesses. Item, unit, conversion, quantity and price snapshots will be frozen.` |
| COPY-443 | Submit connected success | `Purchase order {poNumber} submitted to {supplierName}.` |
| COPY-444 | Accept connected title | `Accept purchase order {poNumber}?` |
| COPY-445 | Accept connected body | `Both businesses will see the order as Accepted. The next available supplier action is Mark as shipped.` |
| COPY-446 | Accept connected success | `Purchase order {poNumber} accepted.` |
| COPY-447 | Reject connected title | `Reject purchase order {poNumber}?` |
| COPY-448 | Reject connected body | `Both businesses will see the order as Rejected. The rejection reason will be recorded in its timeline.` |
| COPY-449 | Reject connected success | `Purchase order {poNumber} rejected.` |
| COPY-450 | Ship connected title | `Mark purchase order {poNumber} as shipped?` |
| COPY-451 | Ship connected body | `Supplier stock will decrease by the dispatched quantities. Buyer stock will not change until receipt.` |
| COPY-452 | Ship connected success | `Purchase order {poNumber} marked as shipped.` |
| COPY-453 | Supplier-view notice | `You are viewing this order as the supplier.` |
| COPY-454 | Buyer-view notice | `You are viewing this order as the buyer.` |

## 12. Team, invitations and notifications

| COPY ID | Use | Exact text |
|---|---|---|
| COPY-455 | Empty team title | `No other team members yet` |
| COPY-456 | Empty team body | `Invite a team member and assign the access they need.` |
| COPY-457 | Invitation helper | `The invitation expires after 7 days and can be accepted only by the invited email address.` |
| COPY-458 | Invitation created title | `Invitation link created` |
| COPY-459 | Invitation created body | `Copy this link now. It is shown only once and no email has been sent.` |
| COPY-460 | Invitation link expiry | `Expires {expiresAt}` |
| COPY-461 | Invitation accept intro | `{organizationName} invited you to join as {role}.` |
| COPY-462 | Invitation sign-in prompt | `Sign in with {email} to review and accept this invitation.` |
| COPY-463 | Invitation accepted | `You joined {organizationName} as {role}.` |
| COPY-464 | Invitation email mismatch | `This invitation is for a different email address. Sign in with the invited address.` |
| COPY-465 | Invitation expired | `This invitation has expired. Ask an Owner or Admin for a new link.` |
| COPY-466 | Invitation unavailable | `This invitation is no longer available. It may have been accepted or revoked.` |
| COPY-467 | Invitation unknown | `This invitation link is not valid.` |
| COPY-468 | Invitation idempotent | `You are already an active member of {organizationName}.` |
| COPY-469 | Revoke invitation title | `Revoke invitation for {email}?` |
| COPY-470 | Revoke invitation body | `The current link will stop working. A new invitation can be created later.` |
| COPY-471 | Revoke invitation success | `Invitation for {email} revoked.` |
| COPY-472 | Change-role title | `Change {memberName}'s role?` |
| COPY-473 | Change-role body | `Their access will update to {role} across this workspace.` |
| COPY-474 | Change-role success | `{memberName}'s role changed to {role}.` |
| COPY-475 | Suspend-member title | `Suspend {memberName}?` |
| COPY-476 | Suspend-member body | `They will lose access to this workspace until reactivated. Their history will remain.` |
| COPY-477 | Suspend-member success | `{memberName} suspended.` |
| COPY-478 | Remove-member title | `Remove {memberName}?` |
| COPY-479 | Remove-member body | `They will lose access to this workspace. Their historical actions will remain attributed to them.` |
| COPY-480 | Remove-member success | `{memberName} removed.` |
| COPY-481 | Protected-owner tooltip | `The canonical Owner cannot be modified by an Admin.` |
| COPY-482 | Empty notifications title | `No notifications` |
| COPY-483 | Empty notifications body | `Stock and staff-relevant updates will appear here.` |
| COPY-484 | Empty unread notifications title | `You're all caught up` |
| COPY-485 | Empty unread notifications body | `You have no unread notifications.` |
| COPY-486 | Low-stock notification | `{productName} is low on stock at {quantity} {unit}.` |
| COPY-487 | Out-of-stock notification | `{productName} is out of stock.` |
| COPY-488 | Connection-request notification | `{organizationName} requested a supplier connection.` |
| COPY-489 | Connection-accepted notification | `{organizationName} accepted your connection request.` |
| COPY-490 | Connection-rejected notification | `{organizationName} rejected your connection request.` |
| COPY-491 | Connected-PO-submitted notification | `{organizationName} submitted purchase order {poNumber}.` |
| COPY-492 | Connected-PO-accepted notification | `{organizationName} accepted purchase order {poNumber}.` |
| COPY-493 | Connected-PO-rejected notification | `{organizationName} rejected purchase order {poNumber}.` |
| COPY-494 | Connected-PO-shipped notification | `{organizationName} marked purchase order {poNumber} as shipped.` |
| COPY-495 | Connected-PO-received notification | `{organizationName} recorded a receipt for purchase order {poNumber}.` |
| COPY-496 | Notification marked read | `Notification marked as read.` |
| COPY-497 | Notifications marked read | `All visible notifications marked as read.` |

## 13. Permission, not-found and feature-state copy

| COPY ID | Use | Exact text |
|---|---|---|
| COPY-498 | Permission body | `Your {role} role does not include the access required for this page.` |
| COPY-499 | Permission capability | `Required access: {requiredRole}.` |
| COPY-500 | Suspended page title | `Workspace access suspended` |
| COPY-501 | Suspended page body | `Your membership is suspended. Contact an Owner or Admin of {organizationName}.` |
| COPY-502 | Not-found body public | `The page may have moved, or the link may be incorrect.` |
| COPY-503 | Not-found body authenticated | `This page or record is unavailable in the current workspace.` |
| COPY-504 | Network-disabled 404 | `This page is not available in the current workspace.` |
| COPY-505 | Report panel denied title | `Report not available for your role` |
| COPY-506 | Report panel denied body | `Your {role} role does not include access to this report.` |
| COPY-507 | Export denied | `You do not have access to export this report.` |
| COPY-508 | Account state changed | `Your workspace access changed. Sign in again or choose another workspace.` |

## 14. Machine reason mapping

The client maps `HttpsError.details.reason` first, then the fixed `HttpsError.code` fallback. Keys in the first table are canonical server reasons explicitly frozen in v3. `UI_*` keys in the second table are presentation-normalization keys for locally detected or screen-state failures; they do not expand the backend contract.

### 14.1 Canonical server reasons

| Machine reason | HttpsError code | Copy ID | Exact user-facing text | Placement |
|---|---|---|---|---|
| `HANDLE_TAKEN` | `already-exists` | COPY-251 | `This handle is already in use. Choose another.` | Handle field |
| `SKU_DUPLICATE` | `already-exists` | COPY-253 | `This SKU is already used in this workspace.` | SKU field |
| `INSUFFICIENT_STOCK` | `failed-precondition` | COPY-260 | `This adjustment would reduce stock below 0 {unit}. Enter a smaller quantity.` | Quantity field |
| `INVALID_TRANSITION` | `failed-precondition` | COPY-392 | `This action is not available while the purchase order is {action}. Refresh to see its current status.` | PO action panel |
| `CONNECTION_NOT_ACTIVE` | `failed-precondition` | COPY-410 | `Your connection to {organizationName} is no longer active.` | Connection/mapping/PO panel |
| `MAPPING_NOT_VERIFIED` | `failed-precondition` | COPY-440 | `Every connected order line needs an active verified product mapping.` | PO line/wizard |
| `OVER_RECEIPT` | `failed-precondition` | COPY-265 | `You can receive up to {outstanding} {unit}.` | Receive-now field |
| `OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD` | `failed-precondition` | COPY-285 | `We could not confirm the result. Try again to safely check the same request.` | Form alert |
| `INVITE_EMAIL_MISMATCH` | `permission-denied` | COPY-464 | `This invitation is for a different email address. Sign in with the invited address.` | Invitation page |
| `INVITE_EXPIRED` | `failed-precondition` | COPY-465 | `This invitation has expired. Ask an Owner or Admin for a new link.` | Invitation page |
| `INVITE_NOT_PENDING` | `failed-precondition` | COPY-466 | `This invitation is no longer available. It may have been accepted or revoked.` | Invitation page |

### 14.2 UI-normalized reasons

| Machine reason | Copy ID | Exact user-facing text | Placement |
|---|---|---|---|
| `UI_HANDLE_INVALID` | COPY-249 | `Use 3–30 lowercase letters, numbers or hyphens. Do not start or end with a hyphen.` | Handle field |
| `UI_HANDLE_RESERVED` | COPY-250 | `This handle is reserved. Choose another.` | Handle field |
| `UI_REQUIRED` | COPY-245 | `Enter a value.` | Field |
| `UI_SELECTION_REQUIRED` | COPY-246 | `Choose an option.` | Field |
| `UI_EMAIL_INVALID` | COPY-247 | `Enter a valid email address.` | Email field |
| `UI_QUANTITY_INVALID` | COPY-255 | `Enter a quantity greater than 0.` | Quantity field |
| `UI_ADJUSTMENT_REASON_REQUIRED` | COPY-259 | `Enter a reason for this adjustment.` | Reason field |
| `UI_PO_LINES_EMPTY` | COPY-262 | `Add at least one item to this purchase order.` | PO builder |
| `UI_RECEIPT_EMPTY` | COPY-264 | `Enter a quantity for at least one item.` | Receiving form |
| `UI_SEMANTIC_CONFIRMATION_REQUIRED` | COPY-268 | `Confirm that both records refer to the same real-world item.` | Mapping checkbox |
| `UI_CONVERSION_INVALID` | COPY-269 | `Enter a conversion factor greater than 0.` | Factor field |
| `UI_REJECTION_REASON_REQUIRED` | COPY-270 | `Enter a reason for rejecting this order.` | Rejection field |
| `UI_PARTNER_SKU_NOT_FOUND` | COPY-430 | `No published item matches that supplier SKU.` | Mapping lookup |
| `UI_PARTNER_ITEM_UNPUBLISHED` | COPY-431 | `That item exists but is not currently published to you.` | Mapping lookup |
| `UI_MAPPING_DUPLICATE` | COPY-436 | `A verified mapping already links these items.` | Mapping review |
| `UI_CONNECTION_SELF` | COPY-401 | `You cannot connect {organizationName} to itself.` | Discovery result |
| `UI_CONNECTION_ACTIVE` | COPY-402 | `{organizationName} is already connected as a supplier.` | Discovery result |
| `UI_CONNECTION_PENDING` | COPY-403 | `A connection request with {organizationName} is already pending.` | Discovery result |
| `UI_WAREHOUSE_HAS_STOCK` | COPY-356 | `Move or reduce all stock in {warehouseName} to zero before archiving it.` | Archive dialog |
| `UI_WAREHOUSE_HAS_OPEN_RECEIVING` | COPY-357 | `Finish or redirect open receiving work for {warehouseName} before archiving it.` | Archive dialog |
| `UI_WAREHOUSE_HAS_BOTH_BLOCKERS` | COPY-358 | `{warehouseName} has stock and open receiving work. Clear both before archiving it.` | Archive dialog |
| `UI_OPENING_BALANCE_EXISTS` | COPY-346 | `An opening balance has already been recorded for this product and warehouse.` | Opening-balance dialog |
| `UI_AUTH_NEUTRAL_FAILURE` | COPY-298 | `We could not sign you in with those details. Check them and try again.` | Login form |
| `UI_RESOURCE_STALE` | COPY-391 | `This purchase order changed after the page loaded. Review the latest outstanding quantities before receiving.` | Receiving form |

### 14.3 Fixed HttpsError fallback

| HttpsError code | Copy ID | Exact user-facing text |
|---|---|---|
| `unauthenticated` | COPY-508 | `Your workspace access changed. Sign in again or choose another workspace.` |
| `permission-denied` | COPY-498 | `Your {role} role does not include the access required for this page.` |
| `invalid-argument` | COPY-283 | `We could not complete that action` |
| `failed-precondition` | COPY-284 | `Nothing has been changed. Try again.` |
| `not-found` on invitation | COPY-467 | `This invitation link is not valid.` |
| `not-found` on authorized resource | COPY-503 | `This page or record is unavailable in the current workspace.` |
| `already-exists` | COPY-283 | `We could not complete that action` |
| `aborted` | COPY-285 | `We could not confirm the result. Try again to safely check the same request.` |
| `resource-exhausted` | COPY-282 | `Check your connection and try again.` |
| `internal` or unknown | COPY-284 | `Nothing has been changed. Try again.` |

## 15. Status labels and accessibility announcements

| COPY ID | Use | Exact text |
|---|---|---|
| COPY-509 | Stock status | `In Stock` |
| COPY-510 | Stock status | `Low Stock` |
| COPY-511 | Stock status | `Out of Stock` |
| COPY-512 | Entity status | `Active` |
| COPY-513 | Entity status | `Archived` |
| COPY-514 | Entity status | `Deactivated` |
| COPY-515 | Membership status | `Suspended` |
| COPY-516 | Membership status | `Removed` |
| COPY-517 | Invitation/connection status | `Pending` |
| COPY-518 | Invitation status | `Accepted` |
| COPY-519 | Invitation status | `Expired` |
| COPY-520 | Invitation status | `Revoked` |
| COPY-521 | Connection/PO status | `Rejected` |
| COPY-522 | Connection/mapping status | `Disabled` |
| COPY-523 | Mapping status | `Verified` |
| COPY-524 | PO status | `Draft` |
| COPY-525 | Private PO status | `Ordered` |
| COPY-526 | Connected PO status | `Submitted` |
| COPY-527 | Connected PO status | `Accepted` |
| COPY-528 | Connected PO status | `Shipped` |
| COPY-529 | PO status | `Partially Received` |
| COPY-530 | PO status | `Received` |
| COPY-531 | PO status | `Cancelled` |
| COPY-532 | Live region filter result | `{count} results loaded.` |
| COPY-533 | Live region dialog open | `{action} dialog opened.` |
| COPY-534 | Live region navigation open | `Navigation opened.` |
| COPY-535 | Live region navigation close | `Navigation closed.` |
| COPY-536 | Unread count accessible label | `{count} unread notifications` |
| COPY-537 | No unread accessible label | `No unread notifications` |
| COPY-538 | Sign-up submit | `Create account` |
| COPY-539 | Public-header auth link | `Login` |
| COPY-540 | Notification action | `Mark as unread` |

## 16. Copy QA and freeze

- All A and B-Lite navigation labels, screen titles, tabs, actions, fields, validation, shared states, permissions, confirmations, archive/deactivate/disable behavior, private and connected procurement, receiving, mapping, invitations and notifications have stable exact strings.
- Machine reasons are never rendered. Canonical v3 reason keys and fixed `HttpsError` codes resolve to a `COPY-###` string.
- Auth, invitation and not-found copy avoids account, membership and resource enumeration.
- The invitation success surface says that no email has been sent; it does not imply an unimplemented delivery provider.
- Connected-business copy describes exact-handle lookup and purpose-built projections; it never implies marketplace browsing or access to another tenant's inventory.
- Buyer-directory copy does not imply an outbound sales workflow.
- No copy claims customers, revenue, uptime, certifications, automation, AI, forecasting, checkout, POS, storefront or mobile-app availability.
- Canonical demonstration words and arithmetic reconcile through `120 KG` and `LKR 691,700.00`.

`MICROCOPY_AUTHORITY_FREEZE: PASS`
