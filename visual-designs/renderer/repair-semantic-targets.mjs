import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");
const path = join(root, "visual-designs", "renderer", "render-manifest.json");
const manifest = JSON.parse(await readFile(path, "utf8"));
const action = (label, variant = "primary") => ({ label, variant });
const field = (label, value, extra = {}) => ({ label, value, ...extra });
const columns = (...labels) => labels.map((label) => ({ key: label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/^_|_$/g, ""), label }));
const blockMap = new Map();

blockMap.set("VISUAL-SCREEN-016", [{ type: "modal", title: "Adjust stock", description: "Chicken Breast / MEAT-001", fields: [field("Product", "Chicken Breast / MEAT-001", { readOnly: true }), field("Warehouse", "Cold Room", { type: "select", options: ["Cold Room"] }), field("Current balance", "18 KG", { readOnly: true }), field("Direction", "Increase", { type: "select", options: ["Increase", "Decrease"] }), field("Quantity", "2", { type: "number", required: true, help: "KG" }), field("Reason", "Recount correction", { required: true }), field("Result", "20 KG", { readOnly: true })], summary: [{ label: "Movement", value: "Recorded atomically after confirmation" }], actions: [action("Cancel", "secondary"), action("Confirm adjustment")] }]);
blockMap.set("VISUAL-SCREEN-017", [{ type: "form", title: "Filters", fields: [field("Search", "Chicken Breast", { type: "search" }), field("Date range", "All dates"), field("Product", "All products", { type: "select", options: ["All products", "Chicken Breast"] }), field("Warehouse", "All warehouses", { type: "select", options: ["All warehouses", "Cold Room"] }), field("Movement type", "All types", { type: "select", options: ["All types", "Opening balance", "Adjustment", "Receive"] })], actions: [action("Apply filters"), action("Clear filters", "secondary")] }, { type: "table", schemaId: "TABLE-006", title: "Stock movements", description: "Immutable movement history · newest first", columns: columns("Time", "Product", "SKU", "Warehouse", "Type", "Signed Quantity + unit", "Balance After", "Actor", "Reference"), rows: [
  { time: "Connected receipt 2", product: "Chicken Breast", sku: "MEAT-001", warehouse: "Cold Room", type: "Receive", signed_quantity_unit: "+10 KG", balance_after: "120 KG", actor: "Storekeeper", reference: "CPO-0001 receipt 2" },
  { time: "Connected receipt 1", product: "Chicken Breast", sku: "MEAT-001", warehouse: "Cold Room", type: "Receive", signed_quantity_unit: "+40 KG", balance_after: "110 KG", actor: "Storekeeper", reference: "CPO-0001 receipt 1" },
  { time: "Private receipt 2", product: "Chicken Breast", sku: "MEAT-001", warehouse: "Cold Room", type: "Receive", signed_quantity_unit: "+10 KG", balance_after: "70 KG", actor: "Storekeeper", reference: "PO-0042 receipt 2" },
  { time: "Private receipt 1", product: "Chicken Breast", sku: "MEAT-001", warehouse: "Cold Room", type: "Receive", signed_quantity_unit: "+40 KG", balance_after: "60 KG", actor: "Storekeeper", reference: "PO-0042 receipt 1" },
  { time: "Adjustment", product: "Chicken Breast", sku: "MEAT-001", warehouse: "Cold Room", type: "Adjustment", signed_quantity_unit: "+2 KG", balance_after: "20 KG", actor: "Inventory Manager", reference: "OP-A" },
  { time: "Opening balance", product: "Chicken Breast", sku: "MEAT-001", warehouse: "Cold Room", type: "Opening balance", signed_quantity_unit: "+18 KG", balance_after: "18 KG", actor: "Inventory Manager", reference: "OP-A" }
], actions: [] }]);
blockMap.set("VISUAL-SCREEN-020", [
  { type: "organizationHero", monogram: "FF", name: "Fresh Foods Ltd", handle: "@freshfoods", badge: "Connected · Active", help: "Mapped items: 1", actions: [action("Open connection detail")] },
  { type: "table", schemaId: "TABLE-008", title: "Open purchase orders", columns: columns("Number", "Kind", "Status", "Created", "Expected", "Total"), rows: [{ number: "CPO-0001", kind: "Connected", status: "Shipped", created: "10 Aug 2026", expected: "17 Aug 2026", total: "LKR 12,500.00" }], actions: [action("Open purchase order")] },
  { type: "table", schemaId: "TABLE-009", title: "Order history", description: "No completed connected orders yet", columns: columns("Number", "Kind", "Final Status", "Ordered", "Received/Cancelled", "Total"), rows: [] }
]);
blockMap.set("VISUAL-SCREEN-022", [{ type: "wizard", title: "Create private purchase order", description: "Items · Step 2 of 4", steps: [{ label: "Supplier", state: "complete" }, { label: "Items", state: "current" }, { label: "Delivery and notes", state: "upcoming" }, { label: "Review", state: "upcoming" }], currentStep: 2, fields: [field("Supplier", "Green Farm", { type: "select", options: ["Green Farm"] }), field("Product", "Chicken Breast / MEAT-001", { type: "select", options: ["Chicken Breast / MEAT-001"] }), field("Quantity", "50 KG"), field("Unit price", "LKR 1,200.00")], lineItems: [{ title: "Chicken Breast · MEAT-001", quantity: "50 KG × LKR 1,200.00 = LKR 60,000.00" }], summary: [{ label: "Subtotal", value: "LKR 60,000.00" }, { label: "Later steps", value: "Expected date and optional notes" }, { label: "Review-only action", value: "Place order appears only on the Review step" }], actions: [action("Back", "secondary"), action("Save draft", "secondary"), action("Continue")] }]);
const notifications = [
  { readState: "Unread", headline: "Stock adjustment recorded", organization: "Grand Ocean Hotel", object: "Chicken Breast · 18 KG → 20 KG", time: "Just now" },
  { readState: "Unread", headline: "PO-0042 received", organization: "Grand Ocean Hotel", object: "Private purchase order", time: "Recently" },
  { readState: "Unread", headline: "Connected PO CPO-0001 shipped", organization: "Fresh Foods Ltd", object: "Connected purchase order", time: "Recently" }
];
blockMap.set("VISUAL-SCREEN-026", [{ type: "details", title: "Filters", items: [{ label: "Read state", value: "All · Unread · Read" }, { label: "Event type", value: "All events" }], actions: [action("Apply filters"), action("Clear filters", "secondary")] }, { type: "notificationList", title: "Notifications", description: "3 unread · newest first", items: notifications, actions: [action("Mark all as read"), action("Mark as read", "secondary"), action("Mark as unread", "secondary"), action("Open related item", "secondary"), action("Previous", "secondary"), action("Next", "secondary")] }]);
blockMap.set("VISUAL-SCREEN-042", [{ type: "modal", title: "Record opening balance", description: "Available only before a movement exists for this product and warehouse.", fields: [field("Product", "Chicken Breast / MEAT-001", { readOnly: true }), field("Unit", "KG", { readOnly: true }), field("Warehouse", "Cold Room", { type: "select", options: ["Cold Room"] }), field("Quantity", "18", { type: "number", required: true })], summary: [{ label: "Success", value: "Updates the Stock tab and displays a movement reference" }], actions: [action("Cancel", "secondary"), action("Record opening balance")] }]);
const dashboardKpis = { type: "stats", columns: 5, items: [{ label: "Inventory Value", value: "LKR 564,200.00" }, { label: "Active SKUs", value: "12" }, { label: "Low Stock", value: "4" }, { label: "Open Purchase Orders", value: "0" }, { label: "Awaiting Receipt", value: "0" }] };
const stockDonut = { type: "chart", kind: "donut", title: "Stock status", accessibleLabel: "Stock status counts", items: [{ label: "In Stock", value: 7 }, { label: "Low Stock", value: 4 }, { label: "Out of Stock", value: 1 }], span: 6 };
const locationBars = { type: "chart", kind: "horizontal-bar", title: "Inventory by location", accessibleLabel: "Inventory value by location", items: [{ label: "Main Store", value: 292800, displayValue: "LKR 292,800.00 · 51.90%" }, { label: "Cold Room", value: 271400, displayValue: "LKR 271,400.00 · 48.10%" }], alternative: "Main Store LKR 292,800.00; Cold Room LKR 271,400.00", span: 6 };
blockMap.set("VISUAL-SCREEN-046", [dashboardKpis, { type: "list", title: "Needs attention", items: [{ title: "Low Stock", description: "4 products" }, { title: "Out of Stock", description: "1 product" }], actions: [action("Create purchase order"), action("Add private supplier", "secondary"), action("Add private buyer", "secondary"), action("Open Receiving", "secondary"), action("Find business", "secondary")] }, { type: "empty", title: "Recent purchase orders", body: "No purchase orders yet." }, { type: "empty", title: "Awaiting Receipt", body: "Nothing is awaiting receipt." }, stockDonut, locationBars, { type: "list", title: "Chart alternatives", items: [{ title: "Stock status", description: "In Stock 7 · Low Stock 4 · Out of Stock 1" }, { title: "Inventory by location", description: "Main Store LKR 292,800.00 · 51.90%; Cold Room LKR 271,400.00 · 48.10%" }] }]);
blockMap.set("VISUAL-SCREEN-048", [{ type: "details", title: "Filters and disclosure", items: [{ label: "Filters", value: "Warehouse · Category · Stock Status" }, { label: "Value basis", value: "Inventory value uses replacement cost, not selling price or margin." }] }, { type: "table", schemaId: "TABLE-013", title: "Stock on Hand", columns: columns("Product", "Warehouse", "On Hand", "Unit", "Status", "Value"), rows: [
  { product: "Chicken Breast", warehouse: "Cold Room", on_hand: "120", unit: "KG", status: "In Stock", value: "LKR 150,000.00" },
  { product: "Beef Mince", warehouse: "Cold Room", on_hand: "40", unit: "KG", status: "In Stock", value: "LKR 84,000.00" },
  { product: "Fish Fillet", warehouse: "Cold Room", on_hand: "10", unit: "KG", status: "Low Stock", value: "LKR 18,500.00" },
  { product: "Fresh Milk", warehouse: "Main Store", on_hand: "120", unit: "L", status: "In Stock", value: "LKR 45,600.00" },
  { product: "Butter Block", warehouse: "Main Store", on_hand: "8", unit: "KG", status: "Low Stock", value: "LKR 20,800.00" },
  { product: "Cheddar Cheese", warehouse: "Main Store", on_hand: "25", unit: "KG", status: "In Stock", value: "LKR 80,000.00" }
], actions: [action("Export CSV"), action("Apply filters", "secondary"), action("Clear filters", "secondary")] }]);
blockMap.set("VISUAL-SCREEN-049", [{ type: "form", title: "Report filters", fields: [field("Status", "All statuses", { type: "select", options: ["All statuses", "Received"] }), field("Date range", "10–17 Aug 2026"), field("Kind", "Private / Connected", { type: "select", options: ["Private / Connected", "Private", "Connected"] })], actions: [action("Apply filters"), action("Clear filters", "secondary")] }, { type: "table", schemaId: "TABLE-014", title: "Purchase Orders", columns: columns("PO Number", "Counterparty", "Private/Connected", "Status", "Total", "Created", "Expected"), rows: [{ po_number: "PO-0042", counterparty: "Green Farm", private_connected: "Private", status: "Received", total: "LKR 60,000.00", created: "10 Aug 2026", expected: "17 Aug 2026" }, { po_number: "CPO-0001", counterparty: "Fresh Foods Ltd", private_connected: "Connected", status: "Received", total: "LKR 12,500.00", created: "10 Aug 2026", expected: "17 Aug 2026" }], actions: [action("Export CSV")] }, { type: "chart", kind: "horizontal-bar", title: "Purchase-order status", items: [{ label: "Draft", value: 0 }, { label: "Ordered / Submitted", value: 0 }, { label: "Accepted", value: 0 }, { label: "Shipped", value: 0 }, { label: "Partially Received", value: 0 }, { label: "Received", value: 2 }], alternative: "Status / Count: Received 2; all earlier workflow states 0 · Filters applied" }]);
blockMap.set("VISUAL-SCREEN-052", [{ type: "popover", title: "Notifications", count: 3, items: notifications, actions: [action("Open related item", "secondary"), action("Mark as read", "secondary"), action("View all notifications"), action("Close", "secondary")] }]);

blockMap.set("VISUAL-MOBILE-001", [{ type: "mobile-auth", title: "Sign in", description: "Welcome back to Stockmok", fields: [field("Email", "nimal@example.com", { type: "email" }), field("Password", "••••••••", { type: "password" })], actions: [action("Sign in"), action("Continue with Google", "secondary"), action("Forgot password", "secondary"), action("Create account", "secondary")] }]);
blockMap.set("VISUAL-MOBILE-002", [{ type: "organizationHero", monogram: "GO", name: "Grand Ocean Hotel", handle: "@grand-ocean", help: "Requested role is a preference only and grants nothing." }, { type: "mobile-auth", title: "Sign in", description: "Branded access", fields: [field("Email", "nimal@example.com", { type: "email" }), field("Requested role", "Detect automatically", { type: "select", options: ["Detect automatically"] }), field("Password", "••••••••", { type: "password" })], actions: [action("Sign in"), action("Forgot password", "secondary"), action("Global login", "secondary")] }]);
blockMap.set("VISUAL-MOBILE-003", [{ type: "componentGallery", title: "Choose a workspace", sections: [{ variant: "workspace", monogram: "GO", name: "Grand Ocean Hotel", handle: "@grand-ocean · Inventory Manager", actions: [action("Open workspace")] }, { variant: "workspace", monogram: "FF", name: "Fresh Foods Ltd", handle: "@freshfoods · Viewer", actions: [action("Open workspace")] }, { variant: "card", title: "Session", content: "Two active workspaces", actions: [action("Sign out", "secondary")] }] }]);
const mobileDashboardKpis = { type: "stats", columns: 2, items: dashboardKpis.items.map((item) => ({ ...item, action: `Open filtered ${item.label}` })) };
blockMap.set("VISUAL-MOBILE-004", [mobileDashboardKpis, { type: "list", title: "Needs attention", items: [{ title: "Chicken Breast · 18 KG", description: "Low Stock" }, { title: "Out of Stock", description: "1 product" }], actions: [action("Add product"), action("Adjust stock", "secondary"), action("Open Receiving", "secondary")] }, { type: "empty", title: "Recent purchase orders", body: "No purchase orders yet." }, { type: "details", title: "Stock status alternative", items: [{ label: "In Stock", value: "7" }, { label: "Low Stock", value: "4" }, { label: "Out of Stock", value: "1" }] }, stockDonut]);
const productCards = [
  ["Chicken Breast", "MEAT-001", "Meat", "18 KG", "Low Stock", "Green Farm", "Updated"], ["Beef Mince", "MEAT-002", "Meat", "40 KG", "In Stock", "—", "Updated"], ["Fish Fillet", "SEA-001", "Seafood", "10 KG", "Low Stock", "—", "Updated"], ["Fresh Milk", "DAIRY-001", "Dairy", "120 L", "In Stock", "—", "Updated"], ["Butter Block", "DAIRY-002", "Dairy", "8 KG", "Low Stock", "—", "Updated"], ["Cheddar Cheese", "DAIRY-003", "Dairy", "25 KG", "In Stock", "—", "Updated"]
].map(([name, sku, category, onHand, status, supplier, updated]) => ({ name, sku, status, details: [{ label: "Category", value: category }, { label: "On Hand", value: onHand }, { label: "Preferred Supplier", value: supplier }, { label: "Updated", value: updated }], actions: [action("View"), action("Edit", "secondary"), action("Adjust stock", "secondary"), action("Archive product", "secondary")] }));
blockMap.set("VISUAL-MOBILE-005", [{ type: "collapsedFilter", title: "Product filters", filters: ["Search", "Category", "Stock status", "Warehouse"], toggleLabel: "Show filters (4)", actions: [action("Add product")] }, { type: "productCardList", title: "Products", items: productCards, actions: [action("Previous", "secondary"), action("Next", "secondary")] }]);
blockMap.set("VISUAL-MOBILE-008", [{ type: "mobile-detail", title: "PO-0042 · Private · Ordered", description: "Green Farm · LKR 60,000.00", items: [{ label: "Product", value: "Chicken Breast · MEAT-001" }, { label: "Unit", value: "KG" }, { label: "Ordered", value: "50" }, { label: "Received", value: "0" }, { label: "Unit price", value: "LKR 1,200.00" }, { label: "Line total", value: "LKR 60,000.00" }, { label: "Timeline", value: "Placed by Procurement Manager · Grand Ocean Hotel" }], actions: [action("Receive goods"), action("Cancel order", "secondary"), action("View supplier", "secondary")] }]);
blockMap.set("VISUAL-MOBILE-009", [{ type: "mobile-receiving", title: "Receive PO-0042", description: "Green Farm · Warehouse Cold Room", steps: [{ label: "Select PO", state: "complete" }, { label: "Review items", state: "complete" }, { label: "Receive", state: "current" }, { label: "Complete", state: "upcoming" }], fields: [field("Warehouse", "Cold Room", { type: "select", options: ["Cold Room"] }), field("Receive now", "40", { type: "number", required: true, help: "KG" })], lineItems: [{ title: "Chicken Breast · MEAT-001", quantity: "Ordered 50 KG · Received 0 KG · Receive now 40 KG" }], summary: [{ label: "Current stock", value: "20 KG" }, { label: "Stock after", value: "60 KG" }, { label: "Outstanding", value: "10 KG" }, { label: "Second receipt", value: "10 KG moves 60 KG → 70 KG; outstanding 0 KG" }], actions: [action("Cancel", "secondary"), action("Receive selected items")] }]);
blockMap.set("VISUAL-MOBILE-010", [{ type: "form", title: "Notification filters", fields: [field("Event type", "All events", { type: "select", options: ["All events", "Stock", "Purchase order", "Connected PO"] })], actions: [action("Mark all as read")] }, { type: "notificationList", items: notifications, actions: [action("Open related item", "secondary"), action("Mark as read", "secondary"), action("Mark as unread", "secondary"), action("Previous", "secondary"), action("Next", "secondary")] }]);

blockMap.set("VISUAL-STATE-001", [{ type: "frameGrid", title: "Branded login states", frames: [
  { label: "1 · Resolving", title: "Resolving organization", body: "Checking this organization securely.", state: "loading" },
  { label: "2 · Not found", title: "Organization not found", body: "Use Global login to continue safely.", state: "error", actions: [action("Global login")] },
  { label: "3 · Ready", title: "Grand Ocean Hotel", body: "Branded sign-in ready.", state: "ready", fields: [field("Email", "nimal@example.com"), field("Password", "••••••••")] },
  { label: "4 · Authentication failed", title: "Sign-in failed", body: "Check your credentials and try again.", state: "error", actions: [action("Try again")] },
  { label: "5 · Not a member", title: "No workspace access", body: "This account is not an active member.", state: "denied", actions: [action("Global login")] },
  { label: "6 · Role mismatch", title: "Requested Owner", body: "Assigned role: Inventory Manager. Preferences do not grant access.", state: "warning" },
  { label: "7 · Correct role", title: "Continue as Inventory Manager", body: "Your assigned role is available.", state: "success", actions: [action("Continue")] },
  { label: "8 · Suspended", title: "Membership suspended", body: "Contact an organization administrator.", state: "denied", actions: [action("Sign out")] }
] }]);
blockMap.set("VISUAL-STATE-010", [{ type: "frameGrid", title: "Permission states", frames: [
  { label: "1 · DENIED", title: "Storekeeper · Purchase-Order Report", body: "Current role: Storekeeper. Required role: Analyst.", state: "denied", specimen: ["Host: /reports?tab=purchase-orders", "Navigation: Receiving available", "Report payload hidden"], actions: [action("Open Receiving")] },
  { label: "2 · DENIED", title: "Viewer · Stock Movements", body: "This route is not available to Viewer.", state: "denied", specimen: ["Host: /inventory/movements", "Current role: Viewer", "Safe report route"], actions: [action("Open Stock on Hand")] },
  { label: "3 · READ_ONLY", title: "Analyst · Product List", body: "Product data is visible; write actions are hidden.", state: "read only", specimen: ["Product row visible", "View control", "Add / Edit / Archive hidden"] },
  { label: "4 · HIDDEN", title: "Admin · Canonical Owner row", body: "Owner member actions are hidden.", state: "hidden", specimen: ["Owner · Active", "Role column visible", "Row actions hidden"] },
  { label: "5 · LIMITED", title: "Procurement Manager · Conversion", body: "Conversion is disabled in this context.", state: "disabled", specimen: ["Mapping host", "Convert control disabled", "Tooltip explains context"] },
  { label: "6 · 404", title: "Network unavailable", body: "Authenticated 404. Network navigation is absent.", state: "not found", specimen: ["Host: /network/connections", "Network nav absent", "No connection payload"], actions: [action("Open dashboard")] }
] }]);
blockMap.set("VISUAL-STATE-011", [{ type: "frameGrid", title: "Loading, empty and error", frames: [
  { label: "1 · Loading", title: "Layout-shaped skeletons", body: "Card and table geometry is retained.", state: "loading", kind: "skeleton" },
  { label: "2 · Product empty", title: "No products yet", body: "Add your first product to begin.", state: "empty", actions: [action("Add product")] },
  { label: "3 · Stock status empty", title: "No stock status yet", body: "Add products and opening stock to see stock status", state: "empty" },
  { label: "4 · Zero filter", title: "No report matches", body: "Filters remain available.", state: "empty", specimen: ["Warehouse: Cold Room", "Status: Low Stock", "0 matching rows"], actions: [action("Clear filters")] },
  { label: "5 · Chart error", title: "Chart unavailable", body: "The accessible table remains usable.", state: "error", specimen: ["Product | On Hand | Value", "Chicken Breast | 120 KG | LKR 150,000.00"], actions: [action("Try again")] },
  { label: "6 · Query error", title: "Products could not be loaded", body: "Try again. No raw error is exposed.", state: "error", actions: [action("Try again")] },
  { label: "7 · Mutation error", title: "Could not save", body: "Your safe input is preserved.", state: "error", fields: [field("Quantity", "2 KG")], actions: [action("Try again")] }
] }]);

blockMap.set("VISUAL-COMP-005", [{ type: "componentGallery", title: "Navigation system", sections: [
  { variant: "navigation", title: "Owner shell · 256 px sidebar", role: "Owner", navigation: ["Dashboard", "Products", "Purchase Orders", "Receiving", "Network", "Reports", "Team", "Settings"] },
  { variant: "collapsed-sidebar", title: "Storekeeper shell · 72 px collapsed", role: "Storekeeper", items: ["Dashboard", "Products", "Stock Movements", "Receiving", "Notifications"] },
  { variant: "stepper", title: "Four-step wizard", steps: [{ label: "Supplier", state: "complete" }, { label: "Items", state: "current" }, { label: "Delivery", state: "upcoming" }, { label: "Review", state: "error" }] },
  { variant: "stepper", title: "Five-step flow", steps: [{ label: "Start", state: "complete" }, { label: "Details", state: "complete" }, { label: "Map", state: "current" }, { label: "Review", state: "error" }, { label: "Complete", state: "upcoming" }] },
  { variant: "card", title: "64 px header", content: "GO · Grand Ocean Hotel · Role badge · Bell 3 · Workspace menu · Breadcrumbs · PageHeader", actions: [action("Switch workspace"), action("Open notifications", "secondary")] },
  { variant: "tabs", title: "Tabs", items: [{ label: "Overview", state: "active" }, { label: "Stock", state: "focus", count: 4 }, { label: "Buyers", state: "disabled" }] },
  { variant: "drawer", title: "390 px focus-trapped drawer", role: "Storekeeper", items: ["Dashboard", "Products", "Stock Movements", "Receiving", "Notifications"] }
] }]);
blockMap.set("VISUAL-COMP-006", [{ type: "componentGallery", title: "Dialogs and drawers", sections: [
  { variant: "modal", size: "sm", title: "Add category", fields: [field("Name", "Meat"), field("Description", "Perishable meat products")], actions: [action("Cancel", "secondary"), action("Save changes")] },
  { variant: "modal", size: "md", title: "Adjust stock", fields: [field("Warehouse", "Cold Room"), field("Quantity", "2 KG")], summary: [{ label: "Result", value: "20 KG" }], actions: [action("Cancel", "secondary"), action("Confirm adjustment")] },
  { variant: "modal", size: "lg", title: "Archive warehouse", description: "Archive Cold Room?", actions: [action("Cancel", "secondary"), action("Archive warehouse", "danger")] },
  { variant: "drawer", title: "Mobile navigation · 390 px sheet", items: ["Dashboard", "Products", "Stock Movements", "Receiving", "Notifications"] },
  { variant: "modal", size: "md", title: "Submitting adjustment", fields: [field("Quantity", "2 KG", { readOnly: true })], actions: [{ label: "Confirm adjustment · Submitting", variant: "primary", disabled: true }] },
  { variant: "modal", size: "md", title: "Adjustment error", fields: [field("Quantity", "2 KG", { error: "Could not save. Your entry is preserved." })], actions: [action("Cancel", "secondary"), action("Try again")] }
] }]);
blockMap.set("VISUAL-COMP-007", [{ type: "componentGallery", title: "Alerts, toasts and timeline", sections: [
  { variant: "toast", tone: "success", title: "Stock adjusted — movement MOV-1048", body: "Updated data remains visible.", actions: [action("Dismiss", "secondary")] },
  { variant: "toast", tone: "danger", title: "Receipt could not be recorded.", body: "Your entries are preserved.", actions: [action("Try again"), action("Dismiss", "secondary")] },
  { variant: "toast", title: "Network routes will be unavailable after you save", body: "Information", actions: [action("Dismiss", "secondary")] },
  { variant: "toast", tone: "warning", title: "This invitation link will not be shown again.", body: "Copy it before closing.", actions: [action("Dismiss", "secondary")] },
  { variant: "timeline", title: "Connected PO timeline", items: [{ title: "Shipped · 10 Aug 2026, 14:30", description: "Fresh Foods Ltd · Supplier · CPO-0001 · 10 PACK shipped" }, { title: "Accepted · 10 Aug 2026, 10:15", description: "Fresh Foods Ltd · Supplier · Order accepted for fulfilment" }] },
  { variant: "placement", title: "Desktop and 390 placement", items: [{ tone: "success", title: "Stock adjusted", body: "MOV-1048" }, { tone: "danger", title: "Receipt could not be recorded", body: "Entries preserved" }, { tone: "warning", title: "Invitation link", body: "Copy before closing" }] }
] }]);
blockMap.set("VISUAL-COMP-008", [{ type: "componentGallery", title: "Cards and KPI cards", sections: [
  { variant: "card", title: "Plain card", content: "Default bordered surface" }, { variant: "card", title: "Header + footer action", content: "One clear action", actions: [action("Open filtered view")] }, { variant: "card", title: "Interactive focus", content: "Visible focus ring and one target" },
  { variant: "kpi", title: "Ready KPI", items: dashboardKpis.items }, { variant: "kpi", title: "Loading KPI", items: dashboardKpis.items.map((item) => ({ ...item, value: "Loading" })) }, { variant: "kpi", title: "Error KPI", items: [{ label: "Inventory Value", value: "Unavailable", meta: "Try again" }], actions: [action("Try again")] }
] }]);
blockMap.set("VISUAL-COMP-009", [{ type: "componentGallery", title: "Closed chart set", sections: [
  { variant: "form", title: "Report filters", fields: [field("Status", "All", { type: "select", options: ["All"] }), field("Date range", "10–17 Aug 2026"), field("Kind", "Private / Connected")], actions: [action("Apply filters"), action("Clear filters", "secondary")] },
  { variant: "donut", title: "CHART-001 · Stock status", items: stockDonut.items, accessibleLabel: "Stock status" },
  { variant: "horizontal-chart", title: "CHART-002 · Inventory by location", items: locationBars.items, alternative: "Warehouse / Inventory value / Share table" },
  { variant: "horizontal-chart", title: "CHART-003 · PO status", items: [{ label: "Draft", value: 1 }, { label: "Ordered", value: 1 }, { label: "Shipped", value: 1 }, { label: "Partially Received", value: 1 }, { label: "Received", value: 1 }], alternative: "Status / Count · Filters applied" },
  { variant: "table", title: "Complete table alternatives", columns: columns("Chart", "Label", "Value / Count / Share"), rows: [{ chart: "Stock status", label: "In Stock / Low / Out", value_count_share: "7 / 4 / 1" }, { chart: "Inventory by location", label: "Main Store / Cold Room", value_count_share: "51.90% / 48.10%" }, { chart: "PO status", label: "Received", value_count_share: "2 · Filters applied" }] },
  { variant: "loading", title: "Loading", content: "Layout-shaped chart skeleton" }, { variant: "empty", title: "Empty", body: "No chart data for the current filters." }, { variant: "error", title: "Chart error", body: "The table remains usable.", actions: [action("Try again")] }
] }]);
blockMap.set("VISUAL-COMP-010", [{ type: "componentGallery", title: "Loading, empty and error components", sections: [
  { variant: "empty", title: "No products yet", body: "Add your first product.", actions: [action("Add product")] }, { variant: "empty", title: "You’re all caught up", body: "No notifications need attention." }, { variant: "empty", title: "No report matches", body: "Filters remain available.", actions: [action("Clear filters")] },
  { variant: "table", title: "Chart error · table retained", columns: columns("Product", "On Hand", "Value"), rows: [{ product: "Chicken Breast", on_hand: "120 KG", value: "LKR 150,000.00" }], actions: [action("Try again")] }, { variant: "form", title: "Form server error · input retained", fields: [field("Quantity", "2 KG", { error: "Could not save. Your input is preserved." })], actions: [action("Try again")] },
  { variant: "loading", title: "Text skeleton" }, { variant: "loading", title: "Card skeleton" }, { variant: "loading", title: "Table-row skeleton" }, { variant: "card", title: "Retry behavior", content: "The registered Retry action uses the visible label Try again." }
] }]);

for (const target of manifest.targets) {
  const blocks = blockMap.get(target.visualId);
  if (!blocks) continue;
  target.render ||= {};
  target.render.blocks = blocks;
  target.render.actions = [];
  target.render.suppressPageActions = true;
  if (["VISUAL-SCREEN-016", "VISUAL-SCREEN-042"].includes(target.visualId)) target.render.activeNav = "Products";
  if (target.visualId === "VISUAL-SCREEN-052") target.render.activeNav = "Dashboard";
  if (["VISUAL-SCREEN-048", "VISUAL-SCREEN-049"].includes(target.visualId)) target.render.activeNav = "Reports";
  if (target.visualId === "VISUAL-SCREEN-020") target.render.tabs = [{ label: "Overview", active: false }, { label: "Open purchase orders", active: true }, { label: "Order history", active: false }];
  if (target.visualId === "VISUAL-SCREEN-048") target.render.tabs = [{ label: "Stock on Hand", active: true }];
  if (target.visualId === "VISUAL-SCREEN-049") target.render.tabs = [{ label: "Stock on Hand", active: false }, { label: "Purchase Orders", active: true }];
  if (target.visualId === "VISUAL-MOBILE-010") target.render.tabs = [{ label: "All", active: true }, { label: "Unread", active: false, count: 3 }, { label: "Read", active: false }];
  if (target.visualId === "VISUAL-STATE-001") target.render.shell = { ...(target.render.shell || {}), kind: "board", navigation: [] };
  if (["VISUAL-STATE-010", "VISUAL-STATE-011", "VISUAL-COMP-005", "VISUAL-COMP-009", "VISUAL-COMP-010"].includes(target.visualId)) target.render.tabs = [];
  target.render.subtitle = `${target.context || target.visualId} · authoritative Stockmok visual contract`;
  target.render.fields = target.visualId === "VISUAL-SCREEN-016" ? [...blocks[0].fields, field("Result", "20 KG", { readOnly: true })] : target.visualId === "VISUAL-SCREEN-042" ? blocks[0].fields : [];
  target.render.tables = [];
  if (target.visualId === "VISUAL-COMP-010") {
    target.route = [];
    target.render.route = false;
    target.render.breadcrumb = [];
    for (const item of [...(target.actions || []), ...(target.render.requiredActions || [])]) if (item.id === "ACTION-051") item.label = "Retry";
  }
  if (target.visualId === "VISUAL-COMP-009") {
    const poStatus = blocks[0].sections.find((section) => section.title.includes("CHART-003"));
    if (poStatus && !poStatus.items.some((item) => item.label === "Accepted")) poStatus.items.splice(2, 0, { label: "Accepted", value: 1 });
    const alternatives = blocks[0].sections.find((section) => section.variant === "table");
    if (alternatives) alternatives.rows[2] = { chart: "PO status", label: "Draft / Ordered / Accepted / Shipped / Partially Received / Received", value_count_share: "1 / 1 / 1 / 1 / 1 / 1 · Filters applied" };
  }
}
if (blockMap.size !== 27) throw new Error(`Expected 27 repairs, got ${blockMap.size}`);
const matched = manifest.targets.filter((target) => blockMap.has(target.visualId)).length;
if (matched !== 27) throw new Error(`Matched ${matched}/27 repair targets`);
await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ repaired: matched, visualIds: [...blockMap.keys()] }, null, 2)}\n`);
