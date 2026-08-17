#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const manifestPath = path.join(here, "render-manifest.json");
const TICK = String.fromCharCode(96);

const FILES = {
  inventory: "docs/ui-final/18_FINAL_UI_MASTER_INVENTORY.md",
  screens: "docs/ui-final/19_FINAL_PAGE_AND_SCREEN_REGISTRY.md",
  navigation: "docs/ui-final/20_FINAL_NAVIGATION_LINK_AND_ROUTE_MAP.md",
  components: "docs/ui-final/21_FINAL_DESIGN_SYSTEM_AND_COMPONENT_INVENTORY.md",
  interactions: "docs/ui-final/22_FINAL_SCREEN_CONTENT_AND_INTERACTION_SPEC.md",
  states: "docs/ui-final/23_FINAL_UI_STATE_AND_PERMISSION_MATRIX.md",
  charts: "docs/ui-final/24_FINAL_DATA_VISUALIZATION_CATALOG.md",
  brand: "docs/ui-final/25_FINAL_BRAND_LOGO_AND_VISUAL_ASSET_PLAN.md",
  promptLibrary: "docs/ui-final/26_FINAL_VISUAL_GENERATION_PROMPT_LIBRARY.md",
  boardPrompts: "docs/ui-final/27_FINAL_MULTI_SCREEN_BOARD_PROMPTS.md",
  register: "docs/ui-final/31_FINAL_VISUAL_ASSET_REGISTER.md",
};

const EXPECTED_COUNTS = {
  DETERMINISTIC_UI_RENDER: 69,
  COMPOSITE_REVIEW_BOARD: 17,
  IMAGEGEN_FOUNDATION: 19,
};
const EXPECTED_TOTAL = 105;
const FOUNDATION_PROMPT_IDS = new Set([
  "PROMPT-SCREEN-001",
  "PROMPT-SCREEN-002",
  "PROMPT-SCREEN-003",
  "PROMPT-SCREEN-004",
  "PROMPT-SCREEN-005",
  "PROMPT-SCREEN-006",
  "PROMPT-SCREEN-007",
  "PROMPT-SCREEN-009",
  "PROMPT-SCREEN-029",
  "PROMPT-SCREEN-030",
  "PROMPT-SCREEN-041",
  "PROMPT-SCREEN-043",
  "PROMPT-COMP-002",
  "PROMPT-COMP-003",
  "PROMPT-COMP-004",
  "PROMPT-BRAND-002",
  "PROMPT-BRAND-003",
  "PROMPT-BRAND-004",
  "PROMPT-BRAND-005",
]);
const LAYOUT_TYPES = new Set([
  "List",
  "Detail with tabs",
  "Form",
  "Wizard",
  "Dashboard",
]);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function stripCell(value) {
  let result = String(value ?? "").trim();
  if (result.startsWith(TICK) && result.endsWith(TICK)) {
    result = result.slice(1, -1).trim();
  }
  return result;
}

function parseRegister() {
  const rows = [];
  for (const line of read(FILES.register).split(/\r?\n/)) {
    if (!line.startsWith("| " + TICK + "PROMPT-")) continue;
    const cells = line.split("|").slice(1, -1).map(stripCell);
    const hasMethodColumn = cells.length >= 18;
    const promptGateIndex = hasMethodColumn ? 8 : 7;
    const dimensionsIndex = hasMethodColumn ? 6 : 5;
    if (cells[promptGateIndex] !== "APPROVED_FOR_GENERATION") continue;
    const dimensions = cells[dimensionsIndex].match(/(\d+)[^\d]+(\d+)/);
    if (!dimensions) throw new Error("Unparseable dimensions: " + line);
    rows.push({
      promptId: cells[0],
      visualId: cells[1],
      category: cells[2],
      context: cells[3],
      method: hasMethodColumn ? cells[4] : "",
      canonicalPath: cells[hasMethodColumn ? 5 : 4],
      width: Number(dimensions[1]),
      height: Number(dimensions[2]),
      batch: cells[hasMethodColumn ? 7 : 6],
      authorityNote: cells[hasMethodColumn ? 17 : 16] || "",
    });
  }
  return rows;
}

function parsePromptContracts() {
  const contracts = new Map();
  const library = read(FILES.promptLibrary);
  const libraryHeading = new RegExp(
    "^### +" + TICK + "?(PROMPT-[A-Z]+-\\d{3})" + TICK + "?[^\\r\\n]*$",
    "gm",
  );
  const libraryHeadings = [...library.matchAll(libraryHeading)];
  for (let index = 0; index < libraryHeadings.length; index += 1) {
    const heading = libraryHeadings[index];
    const start = heading.index + heading[0].length;
    const end = libraryHeadings[index + 1]?.index ?? library.length;
    const match = library.slice(start, end).match(/\*\*Prompt:\*\*\s*([^\r\n]+)/);
    if (match) contracts.set(heading[1], match[1].trim());
  }

  const boardLibrary = read(FILES.boardPrompts);
  const boardHeadings = [
    ...boardLibrary.matchAll(
      /^### +(PROMPT-(?:BOARD|REVIEW)-\d{3})[^\r\n]*$/gm,
    ),
  ];
  for (let index = 0; index < boardHeadings.length; index += 1) {
    const heading = boardHeadings[index];
    const start = heading.index + heading[0].length;
    const end = boardHeadings[index + 1]?.index ?? boardLibrary.length;
    const section = boardLibrary.slice(start, end);
    const fenceStart = section.indexOf(TICK.repeat(3) + "text");
    const bodyStart =
      fenceStart < 0 ? -1 : section.indexOf("\n", fenceStart) + 1;
    const fenceEnd =
      bodyStart <= 0 ? -1 : section.indexOf(TICK.repeat(3), bodyStart);
    if (bodyStart > 0 && fenceEnd > bodyStart) {
      contracts.set(
        heading[1],
        section.slice(bodyStart, fenceEnd).trim().replace(/\s+/g, " "),
      );
    }
  }
  return contracts;
}

function parseActions() {
  const actions = [];
  for (const line of read(FILES.interactions).split(/\r?\n/)) {
    if (!line.startsWith("| ACTION-")) continue;
    const cells = line.split("|").slice(1, -1).map(stripCell);
    if (/^ACTION-\d{3}$/.test(cells[0])) {
      actions.push({ id: cells[0], label: cells[1] });
    }
  }
  return actions;
}

function parseNavigationLabels() {
  const labels = [];
  for (const line of read(FILES.navigation).split(/\r?\n/)) {
    const match = line.match(/^\| LINK-(?:00[1-9]|01[0-6])\s+([^|]+)\|/);
    if (match) labels.push(match[1].trim());
  }
  return labels;
}

function parseSidebarMatrix() {
  const matrix = new Map();
  const lines = read(FILES.navigation).split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.startsWith("| Item / LINK ID | Destination | Owner |"),
  );
  if (headerIndex < 0) return matrix;
  const headers = lines[headerIndex]
    .split("|")
    .slice(1, -1)
    .map(stripCell);
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith("| LINK-")) break;
    const cells = line.split("|").slice(1, -1).map(stripCell);
    const item = cells[0].replace(/^LINK-\d{3}\s+/, "");
    const flag = cells[headers.indexOf("Flag")];
    for (const role of [
      "Owner",
      "Admin",
      "Inventory Mgr",
      "Procurement Mgr",
      "Storekeeper",
      "Analyst",
      "Viewer",
    ]) {
      if (!matrix.has(role)) matrix.set(role, []);
      const access = cells[headers.indexOf(role)];
      if (access && access !== "HIDDEN") {
        matrix.get(role).push({ label: item, flag });
      }
    }
  }
  return matrix;
}

function parseScreenSections() {
  const source = read(FILES.screens);
  const headings = [
    ...source.matchAll(/^#### `?(SCREEN-\d{3})`?\s+[^\r\n]*$/gm),
  ];
  const sections = new Map();
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const title = heading[0]
      .replace(/^#### `?SCREEN-\d{3}`?\s+[—-]\s+/, "")
      .trim();
    const start = heading.index + heading[0].length;
    const end = headings[index + 1]?.index ?? source.length;
    sections.set(heading[1], {
      title,
      exactContract: source.slice(start, end).trim(),
    });
  }
  return sections;
}

function parseFormSchemas() {
  const forms = new Map();
  for (const line of read(FILES.screens).split(/\r?\n/)) {
    if (!line.startsWith("| " + TICK + "FORM-")) continue;
    const cells = line.split("|").slice(1, -1).map(stripCell);
    if (!/^FORM-\d{3}$/.test(cells[0])) continue;
    forms.set(cells[0], {
      id: cells[0],
      surfaces: cells[1],
      fieldsAndValidation: cells[2],
      submitOutcome: cells[3],
    });
  }
  return forms;
}

function parseTableSchemas() {
  const tables = new Map();
  for (const line of read(FILES.screens).split(/\r?\n/)) {
    if (!line.startsWith("| " + TICK + "TABLE-")) continue;
    const cells = line.split("|").slice(1, -1).map(stripCell);
    if (!/^TABLE-\d{3}$/.test(cells[0])) continue;
    tables.set(cells[0], {
      id: cells[0],
      owner: cells[1],
      columns: cells[2]
        .split(",")
        .map((column) => column.trim())
        .filter(Boolean),
      exactColumns: cells[2],
      queryFiltersSorting: cells[3],
    });
  }
  return tables;
}

function extractLabeledSegment(contract, label, fallback = "not specified") {
  const labels =
    "Fields(?:/tables)?|Tables|Actions?|State|Sample data|Sample context|Accessibility|Responsive intent|Responsive behavior|Exclude|Output(?: exactly)?";
  const match = contract.match(
    new RegExp(
      "(?:^|\\s)(?:" +
        label +
        ")(?::|\\s+)(.*?)(?=\\s+(?:" +
        labels +
        ")(?::|\\s+)|$)",
      "i",
    ),
  );
  return match ? match[1].trim() : fallback;
}

function layoutTypeFor(row, contract, screenSection) {
  const text = [row.context, contract, screenSection?.title || ""]
    .join(" ")
    .toLowerCase();
  if (/dashboard|kpi/.test(text)) return "Dashboard";
  if (/wizard|stepper|onboarding|step \d/.test(text)) return "Wizard";
  if (
    /\bform\b|sign up|login|password reset|adjustment|opening balance|settings|receiving|create \/ edit/.test(
      text,
    )
  ) {
    return "Form";
  }
  if (/detail|\btabs?\b|summary card|timeline/.test(text)) {
    return "Detail with tabs";
  }
  return "List";
}

function activeNavFor(screenId, contract, nav) {
  const explicit = contract.match(
    /(?:active (?:sidebar )?(?:item|navigation)|highlight)\s+[“"]?([^,.;”"]+)/i,
  )?.[1]?.trim();
  if (explicit) {
    const exact = nav.find((label) =>
      new RegExp("\\b" + label.replace(" ", "\\s+") + "\\b", "i").test(
        explicit,
      ),
    );
    if (exact) return exact;
  }
  for (const label of nav) {
    if (
      new RegExp(
        "\\b" + label.replace(" ", "\\s+") + "(?:\\s+is)?\\s+active\\b",
        "i",
      ).test(contract)
    ) {
      return label;
    }
  }
  if (!screenId) return null;
  const number = Number(screenId.slice(-3));
  const groups = [
    [[8, 9, 10, 44, 45, 46, 47], "Dashboard"],
    [[11, 12, 13, 42], "Products"],
    [[14], "Categories"],
    [[15], "Warehouses"],
    [[16, 17], "Stock Movements"],
    [[18], "Suppliers"],
    [[19], "Buyers"],
    [[21, 22, 23, 38, 39], "Purchase Orders"],
    [[24, 40], "Receiving"],
    [[25, 48, 49], "Reports"],
    [[26, 52], "Notifications"],
    [[27, 50], "Team"],
    [[28], "Settings"],
    [[31, 32, 33], "Connected Businesses"],
    [[34, 35, 51], "Partner Catalog"],
    [[36, 37], "Product Mappings"],
  ];
  return groups.find(([ids]) => ids.includes(number))?.[1] || null;
}

function breadcrumbFor(contract) {
  const exact = contract.match(/\bBreadcrumbs?\s+([^,.;]+)/i)?.[1]?.trim() || "";
  if (!exact) return [];
  return exact
    .split(/\s*(?:>|→|\/|,)\s*/)
    .map((part) => part.replace(/^[“"]|[”"]$/g, "").trim())
    .filter(Boolean);
}

function overlayFactsFor(contract) {
  const types = uniq(
    ["dialog", "drawer", "sheet", "modal", "popover"]
      .filter((type) => new RegExp("\\b" + type + "s?\\b", "i").test(contract))
      .map((type) => type.toUpperCase()),
  );
  return {
    types,
    exactRequirements:
      types.length > 0
        ? extractLabeledSegment(
            contract,
            "(?:State|Responsive intent|Responsive behavior)",
            "overlay behavior is specified in the exact requirements",
          )
        : "none specified",
  };
}

function idsWithRanges(text, prefix) {
  const ids = [];
  const pattern = new RegExp(prefix + "-(\\d{3})(?:\\.\\.(\\d{3}))?", "g");
  let match;
  while ((match = pattern.exec(text))) {
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    for (let number = start; number <= end; number += 1) {
      ids.push(prefix + "-" + String(number).padStart(3, "0"));
    }
  }
  const slashPattern = new RegExp(prefix + "-(\\d{3})/(\\d{3})", "g");
  while ((match = slashPattern.exec(text))) {
    ids.push(prefix + "-" + match[1], prefix + "-" + match[2]);
  }
  return uniq(ids);
}

function renderColumns(schema) {
  return schema.columns.map((label, index) => ({ key: "c" + index, label }));
}

function renderedAction(label, index = 0) {
  const lower = label.toLowerCase();
  const variant = /archive|remove|reject|suspend|cancel order/.test(lower)
    ? "danger"
    : index === 0
      ? "primary"
      : "secondary";
  return { label, variant };
}

function structuredActionsFor(contract, registered) {
  const labels = registered.map((action) => action.label);
  const exactCandidates = [
    "Add product",
    "Edit",
    "Adjust stock",
    "Archive product",
    "View",
    "Cancel",
    "Close",
    "Confirm adjustment",
    "Try again",
    "Receive goods",
    "Submit to supplier",
    "Save draft",
    "Place order",
    "Accept order",
    "Reject order",
    "Mark as shipped",
    "Back",
    "Continue",
    "Profile",
    "Sign out",
  ];
  for (const label of exactCandidates) {
    if (new RegExp("\\b" + label.replace(" ", "\\s+") + "\\b", "i").test(contract)) {
      labels.push(label);
    }
  }
  return uniq(labels).map(renderedAction);
}

function structuredTabsFor(contract) {
  const match = contract.match(/\bTabs?\b\s*(?::|are\s+)?\s*([^.;]+)/i);
  if (!match) return [];
  const raw = match[1]
    .replace(/\bmay horizontally scroll.*$/i, "")
    .replace(/\bwith\s+.*$/i, "")
    .trim();
  const pieces = raw
    .split(/\s*(?:,|\/|\band\b)\s*/i)
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 8);
  return pieces.map((piece, index) => {
    const active = /\bactive\b/i.test(piece) || (index === 0 && !pieces.some((item) => /\bactive\b/i.test(item)));
    return { label: piece.replace(/\s+active\b/i, "").trim(), active };
  });
}

function shellFor(target, contract, activeNav) {
  const route = target.route[0] || "";
  const isAuthenticated =
    /authenticated (?:shell|route|mobile header)/i.test(contract) ||
    route.startsWith("/app/") ||
    /^APP\//.test(route);
  const kind = isAuthenticated
    ? "app"
    : /onboarding|workspace selector/i.test(contract)
      ? "onboarding"
      : /public route/i.test(contract)
        ? "public"
        : /login|sign up|password reset|invitation/i.test(contract)
          ? "auth"
          : "utility";
  const nav = target.nav;
  const section = (label, names) => ({
    label,
    items: names
      .filter((name) => nav.includes(name))
      .map((name) => ({ label: name, active: name === activeNav })),
  });
  const navigation = [
    section("", ["Dashboard"]),
    section("Inventory", ["Products", "Categories", "Warehouses", "Stock Movements"]),
    section("Procurement", ["Suppliers", "Buyers", "Purchase Orders", "Receiving"]),
    section("Network", ["Connected Businesses", "Partner Catalog", "Product Mappings"]),
    section("", ["Reports", "Notifications", "Team", "Settings"]),
  ].filter((group) => group.items.length);
  const organizationName = target.organization[0] ||
    (/Grand Ocean Hotel|\/app\/grand-ocean/i.test(contract)
      ? "Grand Ocean Hotel"
      : /Fresh Foods Ltd|\/app\/freshfoods/i.test(contract)
        ? "Fresh Foods Ltd"
        : "");
  const shell = {
    kind,
    organization: organizationName
      ? {
          name: organizationName,
          monogram: organizationName === "Grand Ocean Hotel" ? "GO" : undefined,
          handle: organizationName === "Grand Ocean Hotel" && /@grand-ocean/i.test(contract)
            ? "@grand-ocean"
            : undefined,
        }
      : undefined,
    role: target.role === "not role-specific" ? "" : target.role,
    workspaceSwitcher: /workspace switch/i.test(contract),
    notificationCount: Number(contract.match(/(?:bell|unread) count\s+(\d+)/i)?.[1] || 0),
    userName: /Nimal Perera/i.test(contract) ? "Nimal Perera" : "",
    userInitials: /Nimal Perera/i.test(contract) ? "NP" : "",
    navigation,
    mobileNavOpen: /drawer open|navigation drawer|mobile navigation/i.test(contract),
    userActions: structuredActionsFor(contract, []).filter((action) =>
      ["Profile", "Sign out"].includes(action.label),
    ),
  };
  return shell;
}

function genericFormFields(fieldGroups) {
  const fields = [];
  for (const group of fieldGroups) {
    const exact = group.fieldsAndValidation || "";
    for (const piece of exact.split(";").map((value) => value.trim()).filter(Boolean)) {
      const lower = piece.toLowerCase();
      fields.push({
        label: piece,
        type: /select|category|warehouse|currency|timezone|role|status|type/.test(lower)
          ? "select"
          : /notes|description|reason/.test(lower)
            ? "textarea"
            : /email/.test(lower)
              ? "email"
              : /quantity|factor|price|cost|stock|balance/.test(lower)
                ? "number"
                : "text",
        required: /required/.test(lower),
        readOnly: /read-only|immutable|locked/.test(lower),
      });
    }
  }
  return fields.slice(0, 12);
}

function stateFrameItems(contract) {
  const match = contract.match(
    /\blabelled(?:, straight-on)?\s+(?:mini-)?frames?:\s*(.*?)(?=\s+(?:Fields|Actions|Use|Accessibility|Responsive|Exclude)\b)/i,
  );
  if (!match) return [];
  return match[1]
    .split(/\s*;\s*/)
    .map((title) => title.replace(/^\(\d+\)\s*/, "").trim())
    .filter(Boolean)
    .map((title, index) => ({ title, marker: index + 1 }));
}

function canonicalDataText(contract) {
  return contract.match(
    /\b(?:Data|Sample(?: data| context| rows?)?)(?::|\s+(?:includes?|traces?))\s*(.*?)(?=\s+(?:Accessibility|Responsive|Exclude|Output)\b)/i,
  )?.[1]?.trim() || "";
}

function tableBlock(schema, rows = [], extra = {}) {
  return {
    type: "table",
    schemaId: schema.id,
    title: schema.owner,
    columns: renderColumns(schema),
    rows,
    ...extra,
  };
}

function priorityRenderFacts(promptId, tableSchemas) {
  if (promptId === "PROMPT-SCREEN-011") {
    const schema = tableSchemas.get("TABLE-001");
    const rowActions = "View · Edit · Adjust stock · Archive product";
    return {
      actions: [renderedAction("Add product")],
      blocks: [
        {
          type: "form",
          title: "Filters",
          fields: [
            { label: "Search", type: "search" },
            { label: "Category", type: "select" },
            { label: "Stock status", type: "select" },
            { label: "Warehouse", type: "select" },
            { label: "Include archived", type: "select", value: "Off" },
          ],
          actions: [renderedAction("Apply filters"), renderedAction("Clear filters", 1)],
          span: 12,
        },
        tableBlock(schema, [
          ["Chicken Breast", "MEAT-001", "", "18 KG", { badge: "Low Stock", tone: "warning" }, "", "", rowActions],
          ["Beef Mince", "MEAT-002", "", "40 KG", { badge: "In Stock", tone: "success" }, "", "", rowActions],
          ["Fish Fillet", "MEAT-003", "", "10 KG", { badge: "Low Stock", tone: "warning" }, "", "", rowActions],
          ["Fresh Milk", "DAIR-001", "", "120 L", { badge: "In Stock", tone: "success" }, "", "", rowActions],
          ["Butter Block", "DAIR-002", "", "8 KG", { badge: "Low Stock", tone: "warning" }, "", "", rowActions],
          ["Cheddar Cheese", "DAIR-003", "", "25 KG", { badge: "In Stock", tone: "success" }, "", "", rowActions],
        ], {
          description: "Showing 1–6 of 6 · Previous disabled · Next disabled",
        }),
      ],
    };
  }
  if (promptId === "PROMPT-SCREEN-016") {
    return {
      actions: [],
      blocks: [
        {
          type: "form",
          title: "Stock Adjustment",
          description: "Atomic stock movement; success returns a movement reference.",
          fields: [
            { label: "Product", value: "Chicken Breast / MEAT-001", readOnly: true },
            { label: "Warehouse", type: "select", value: "Cold Room", options: ["Cold Room"], required: true },
            { label: "Current balance", value: "18 KG", readOnly: true },
            { label: "Direction", type: "select", value: "Increase", options: ["Increase", "Decrease"], required: true },
            { label: "Quantity", type: "number", value: "2", required: true, help: "KG" },
            { label: "Reason", type: "textarea", value: "Recount correction", required: true },
            { label: "Result", value: "20 KG", readOnly: true },
          ],
          actions: [renderedAction("Confirm adjustment"), renderedAction("Cancel", 1)],
        },
      ],
    };
  }
  if (promptId === "PROMPT-SCREEN-038") {
    const schema = tableSchemas.get("TABLE-011");
    return {
      actions: [renderedAction("Save draft"), renderedAction("Submit to supplier", 1), renderedAction("Cancel", 2)],
      blocks: [
        {
          type: "details",
          title: "Connected purchase order",
          items: [
            { label: "Supplier", value: "Fresh Foods Ltd" },
            { label: "Status", value: { badge: "Draft", tone: "info" } },
            { label: "Visibility", value: "Buyer-private before submit" },
          ],
          span: 5,
        },
        {
          type: "form",
          title: "Draft fields",
          fields: [
            { label: "Connected supplier", type: "select", value: "Fresh Foods Ltd", options: ["Fresh Foods Ltd"], required: true },
            { label: "Mapped item", type: "select", value: "Fresh Chicken Breast 5 KG Pack", options: ["Fresh Chicken Breast 5 KG Pack"], required: true },
            { label: "Ordered supplier quantity", type: "number", value: "10", required: true, help: "PACK = 50 KG" },
            { label: "Unit price", type: "number", value: "1250.00", required: true, help: "LKR" },
          ],
          span: 7,
        },
        tableBlock(schema, [[
          "Chicken Breast / Fresh Chicken Breast 5 KG Pack",
          "MEAT-001 / CKN-B5",
          "KG / PACK",
          "10 PACK / 50 KG",
          "",
          "LKR 1,250.00",
          "LKR 12,500.00",
        ]], { title: "Connected line" }),
      ],
    };
  }
  if (promptId === "PROMPT-MOBILE-006") {
    const stock = tableSchemas.get("TABLE-004");
    const activity = tableSchemas.get("TABLE-005");
    return {
      actions: [renderedAction("Edit"), renderedAction("Adjust stock", 1)],
      tabs: ["Overview", "Stock", "Suppliers", "Activity"].map((label, index) => ({ label, active: index === 0 })),
      blocks: [
        {
          type: "stats",
          items: [
            { label: "On hand", value: "18 KG", meta: "Low Stock", tone: "warning" },
          ],
        },
        {
          type: "details",
          title: "Overview",
          items: [
            { label: "Name", value: "Chicken Breast" },
            { label: "SKU", value: "MEAT-001" },
            { label: "Category", value: "Meat" },
            { label: "Base unit", value: "KG" },
            { label: "Purchase cost", value: "LKR 1,250.00" },
            { label: "Selling price", value: "Not set" },
            { label: "Minimum", value: "20 KG" },
            { label: "Reorder target", value: "50 KG" },
            { label: "Status", value: { badge: "Low Stock", tone: "warning" } },
            { label: "Preferred private supplier", value: "Green Farm" },
          ],
          span: 12,
        },
        tableBlock(stock, [[
          "Cold Room",
          "18",
          "18",
          "KG",
          { badge: "Low Stock", tone: "warning" },
          "Seed snapshot",
        ]], {
          title: "Stock preview",
          compact: true,
          span: 12,
        }),
        tableBlock(activity, [], {
          title: "Activity preview",
          description: "No recent activity.",
          compact: true,
          span: 12,
        }),
      ],
    };
  }
  if (promptId === "PROMPT-STATE-004") {
    const schema = tableSchemas.get("TABLE-011");
    return {
      actions: [],
      blocks: [
        {
          type: "list",
          title: "Seven purchase-order frames",
          items: [
            { title: "Draft", description: "Editable · Save draft · Place order · Cancel" },
            { title: "Ordered", description: "Immutable · Receive goods" },
            { title: "Partially Received", description: "Remaining quantity visible" },
            { title: "Received", description: "Read-only" },
            { title: "Cancelled", description: "Read-only" },
            { title: "Cancel confirmation", description: "Names the purchase order" },
            { title: "Invalid edit attempt", description: "Explains purchase-order immutability" },
          ],
          span: 4,
        },
        tableBlock(schema, [["Chicken Breast", "MEAT-001", "KG", "50 KG", "", "LKR 1,200.00", "LKR 60,000.00"]], {
          title: "PO-0042 · Green Farm",
          span: 8,
        }),
      ],
    };
  }
  if (promptId === "PROMPT-COMP-001") {
    return {
      actions: [
        renderedAction("Add product"),
        renderedAction("Receive selected items", 1),
        renderedAction("Cancel order", 2),
        renderedAction("Try again", 3),
      ],
      blocks: [
        {
          type: "details",
          title: "Button foundations",
          items: [
            { label: "Desktop height", value: "40 px" },
            { label: "Mobile height", value: "44 px" },
            { label: "Primary", value: "#1D4ED8" },
            { label: "Danger", value: "#B91C1C" },
            { label: "Radius", value: "6 px" },
          ],
          span: 4,
        },
        {
          type: "list",
          title: "Button variants",
          items: ["Primary", "Secondary", "Ghost", "Danger"].map((title) => ({
            title,
            description: "Default · hover · visible focus · disabled · loading",
          })),
          span: 4,
        },
        {
          type: "list",
          title: "IconButton accessible names",
          items: ["Bell", "Close", "Overflow", "Edit", "Archive"].map((title) => ({ title, description: "Accessible name / tooltip required" })),
          span: 4,
        },
      ],
    };
  }
  if (promptId === "PROMPT-SCREEN-044") {
    const activity = tableSchemas.get("TABLE-024");
    const lowStock = tableSchemas.get("TABLE-025");
    const recentPOs = tableSchemas.get("TABLE-026");
    const location = tableSchemas.get("TABLE-027");
    return {
      actions: [renderedAction("Add product"), renderedAction("Create purchase order", 1)],
      blocks: [
        {
          type: "stats",
          columns: 3,
          compact: true,
          span: 7,
          items: [
            { label: "Inventory Value", value: "LKR 564,200.00", meta: "Replacement cost" },
            { label: "Active SKUs", value: "12" },
            { label: "Low Stock", value: "4", tone: "warning" },
          ],
        },
        {
          type: "stats",
          columns: 2,
          compact: true,
          span: 5,
          items: [
            { label: "Open Purchase Orders", value: "0" },
            { label: "Awaiting Receipt", value: "0" },
          ],
        },
        {
          type: "list",
          title: "Needs attention",
          items: [
            { title: "Low Stock", description: "4 items", badge: "4", tone: "warning" },
            { title: "Out of Stock", description: "1 item", badge: "1", tone: "danger" },
          ],
          span: 4,
        },
        {
          type: "chart",
          title: "Stock status",
          kind: "donut",
          variant: "donut",
          accessibleLabel: "Stock status counts: 7 in stock, 4 low stock, 1 out of stock",
          items: [
            { label: "In Stock", value: 7 },
            { label: "Low Stock", value: 4 },
            { label: "Out of Stock", value: 1 },
          ],
          span: 4,
        },
        {
          type: "chart",
          title: "Inventory by location",
          kind: "bar",
          variant: "bar",
          accessibleLabel: "Inventory by location: Main Store LKR 292,800.00, 51.90%; Cold Room LKR 271,400.00, 48.10%; total LKR 564,200.00.",
          description: "Main Store 51.90% · Cold Room 48.10% · Total LKR 564,200.00",
          items: [
            { label: "Main Store", value: 292800, meta: "LKR 292,800.00 · 51.90%" },
            { label: "Cold Room", value: 271400, meta: "LKR 271,400.00 · 48.10%" },
          ],
          span: 4,
        },
        tableBlock(activity, [], { title: "Recent activity", description: "No recent activity.", span: 3, compact: true }),
        tableBlock(lowStock, [], { title: "Low stock — table alternative", description: "Four Low Stock items.", span: 3, compact: true }),
        tableBlock(recentPOs, [], { title: "Recent purchase orders", description: "No recent purchase orders.", span: 3, compact: true }),
        tableBlock(location, [
          ["Main Store", "LKR 292,800.00 · 51.90%"],
          ["Cold Room", "LKR 271,400.00 · 48.10%"],
        ], {
          title: "Inventory by location — table alternative",
          description: "Total LKR 564,200.00",
          span: 3,
          compact: true,
        }),
      ],
    };
  }
  if (promptId === "PROMPT-SCREEN-008") {
    return {
      actions: [renderedAction("Profile"), renderedAction("Sign out", 1)],
      blocks: [
        {
          type: "list",
          title: "Authenticated shell anatomy",
          items: [
            { title: "Header", description: "GO · Grand Ocean Hotel · Owner · workspace switcher · Notifications 3 · Nimal Perera" },
            { title: "Inventory", description: "Products · Categories · Warehouses · Stock Movements" },
            { title: "Procurement", description: "Suppliers · Buyers · Purchase Orders · Receiving" },
            { title: "Network", description: "Connected Businesses · Partner Catalog · Product Mappings" },
            { title: "Utilities", description: "Reports · Notifications · Team · Settings" },
          ],
        },
        {
          type: "alert",
          title: "Authority resolution",
          body: "Source 07 and file 20 shell navigation take precedence: Notifications navigation and the Profile user action are retained.",
        },
      ],
    };
  }
  return null;
}

function blocksFor(target, contract, tableSchemas) {
  const priority = priorityRenderFacts(target.promptId, tableSchemas);
  if (priority) return priority;
  const blocks = [];
  const frames = stateFrameItems(contract);
  if (frames.length) blocks.push({ type: "list", title: "State frames", items: frames });
  for (const fieldGroup of target.render.fields) {
    const fields = genericFormFields([fieldGroup]);
    if (fields.length) {
      blocks.push({
        type: "form",
        title: fieldGroup.id || "Fields",
        description: fieldGroup.submitOutcome || "",
        fields,
        actions: structuredActionsFor(contract, target.render.requiredActions).slice(0, 3),
      });
    }
  }
  for (const schema of target.render.tables) blocks.push(tableBlock(schema));
  const data = canonicalDataText(contract);
  if (data) {
    blocks.push({ type: "details", title: "Canonical data", items: [{ label: "Exact source data", value: data }] });
  }
  if (/CHART-001/.test(contract)) {
    blocks.push({ type: "chart", title: "Stock status", accessibleLabel: "Stock status chart with required text/table alternative", items: [] });
  }
  if (/CHART-002/.test(contract)) {
    blocks.push({ type: "chart", title: "Inventory by location", accessibleLabel: "Inventory by location chart with required table alternative", items: [] });
  }
  if (/CHART-003/.test(contract)) {
    blocks.push({ type: "chart", title: "Purchase-order status", accessibleLabel: "Purchase-order status chart with required table alternative", items: [] });
  }
  if (!blocks.length) {
    blocks.push({
      type: /error|denied|not found|404/i.test(target.render.states) ? "alert" : "details",
      title: target.render.title,
      tone: /error|denied|not found|404/i.test(target.render.states) ? "danger" : undefined,
      body: target.render.states,
      items: [
        { label: "Content", value: target.render.exactRequirements.content },
        { label: "State", value: target.render.states },
      ],
    });
  }
  return { blocks };
}

function methodFor(promptId, canonicalPath) {
  if (FOUNDATION_PROMPT_IDS.has(promptId)) {
    return "IMAGEGEN_FOUNDATION";
  }
  if (
    /^PROMPT-(?:BOARD|REVIEW)-/.test(promptId) ||
    promptId === "PROMPT-BRAND-006"
  ) {
    return "COMPOSITE_REVIEW_BOARD";
  }
  return "DETERMINISTIC_UI_RENDER";
}

function phrase(contract, key, fallback) {
  const match = contract.match(new RegExp(key + "\\s+([^.;]+)", "i"));
  return match ? match[1].trim() : fallback;
}

function routesFor(contract) {
  const matches = contract.match(
    /(?:\/(?:app|b|invite|login|signup|select-workspace|onboarding)(?:\/[A-Za-z0-9_:@?=&.-]+)*)|(?:APP\/[A-Za-z0-9_:@?=&./-]+)/g,
  );
  const routes = (matches || []).map((value) => value.replace(/[),.;]+$/, ""));
  if (contract.includes(TICK + "/" + TICK)) routes.unshift("/");
  return uniq(routes);
}

function roleFor(contract) {
  const firstFacts = contract.slice(0, 420);
  const audience = firstFacts.match(/\baudience\s+([^,;.]+)/i)?.[1]?.trim();
  if (audience) return audience;
  const explicit = firstFacts.match(
    /\b(?:authenticated\s+)?role\s+(Owner\/Admin|Owner|Admin|Inventory Manager|Procurement Manager|Storekeeper|Analyst|Viewer|Supplier|Buyer)\b/i,
  )?.[1];
  if (explicit) return explicit;
  const roles = [
    "Owner/Admin",
    "Owner",
    "Admin",
    "Inventory Manager",
    "Procurement Manager",
    "Procurement",
    "Storekeeper",
    "Viewer",
    "Supplier",
    "Buyer",
    "Network user",
    "Authenticated user",
    "Anonymous",
  ];
  const found = roles.filter((role) =>
    new RegExp("\\b" + role.replace("/", "\\/") + "\\b", "i").test(firstFacts),
  );
  return uniq(found).join(" | ") || "not role-specific";
}

function featureFlagsFor(contract) {
  const lower = contract.toLowerCase();
  if (/\bnetwork\s+(?:enabled|on)\b/.test(lower)) return { network: "enabled" };
  if (/\bnetwork\s+(?:disabled|off|absent)\b/.test(lower)) return { network: "disabled" };
  if (
    lower.includes("network feature flag") ||
    lower.includes("feature-flag")
  ) {
    if (lower.includes("disabled")) return { network: "disabled" };
    if (lower.includes("enabled")) return { network: "enabled" };
    return { network: "encoded in prompt contract" };
  }
  if (lower.includes("network-enabled")) return { network: "enabled" };
  return {};
}

function exactCopyFor(contract) {
  const values = [];
  let match;
  const quotePattern = /[“"]([^”"]{1,120})[”"]/g;
  while ((match = quotePattern.exec(contract))) values.push(match[1].trim());
  const tickPattern = new RegExp(
    TICK + "([^" + TICK + "]{1,120})" + TICK,
    "g",
  );
  while ((match = tickPattern.exec(contract))) {
    const value = match[1].trim();
    if (
      !/^(?:PROMPT|VISUAL|SCREEN|STATE|TABLE|CHART|ACTION|BRAND|COMP|BOARD|REVIEW|MOBILE)-\d{3}$/.test(
        value,
      )
    ) {
      values.push(value);
    }
  }
  return uniq(values).slice(0, 40);
}

function authoritiesFor(row, contract) {
  const sources = [
    FILES.inventory,
    FILES.screens,
    FILES.navigation,
    FILES.components,
    FILES.interactions,
    FILES.states,
  ];
  if (/CHART-\d{3}/.test(contract)) sources.push(FILES.charts);
  if (
    /PROMPT-(?:BRAND|COMP|BOARD|REVIEW)-/.test(row.promptId) ||
    /VISUAL-BRAND/.test(contract)
  ) {
    sources.push(FILES.brand);
  }
  sources.push(
    /^PROMPT-(?:BOARD|REVIEW)-/.test(row.promptId)
      ? FILES.boardPrompts
      : FILES.promptLibrary,
    FILES.register,
  );
  return uniq(sources);
}

function buildManifest() {
  const register = parseRegister();
  const contracts = parsePromptContracts();
  const actions = parseActions();
  const navLabels = parseNavigationLabels();
  const sidebarMatrix = parseSidebarMatrix();
  const screenSections = parseScreenSections();
  const formSchemas = parseFormSchemas();
  const tableSchemas = parseTableSchemas();
  const organizations = [
    "Harbor Foods",
    "Grand Ocean Hotel",
    "Luna Retail",
    "Northwind Deli",
    "Cedar Bay Supplies",
  ];

  const targets = register.map((row) => {
    const contract = contracts.get(row.promptId);
    if (!contract) throw new Error("Missing prompt contract: " + row.promptId);
    const positiveContract = contract.split(/\bExclude\b/i)[0];
    const hasNavigationContext =
      /\b(?:navigation|sidebar|drawer|menu rows?|shell nav)\b/i.test(
        positiveContract,
      );
    const resolvedRole = roleFor(contract);
    const roleAlias = {
      "Owner/Admin": "Owner",
      "Inventory Manager": "Inventory Mgr",
      "Procurement Manager": "Procurement Mgr",
    }[resolvedRole] || resolvedRole;
    const flags = featureFlagsFor(contract);
    const matrixNav = (sidebarMatrix.get(roleAlias) || [])
      .filter((entry) => entry.flag === "A" || flags.network === "enabled")
      .map((entry) => entry.label);
    const explicitNav = hasNavigationContext
      ? navLabels.filter((label) =>
          new RegExp(
            "\\b" + label.replace(" ", "\\s+") + "\\b",
            "i",
          ).test(positiveContract),
        )
      : [];
    const method = methodFor(row.promptId, row.canonicalPath);
    const screenId = /^SCREEN-\d{3}$/.test(row.context)
      ? row.context
      : undefined;
    const screenSection = screenId ? screenSections.get(screenId) : undefined;
    const exactContext = [contract, screenSection?.exactContract || ""].join(" ");
    const formIds = idsWithRanges(exactContext, "FORM");
    const tableIds = idsWithRanges(exactContext, "TABLE");
    const promptExactCopy = exactCopyFor(contract);
    const requiredActions = actions.filter((action) =>
      new RegExp(
        "\\b" +
          action.label.replace(/[.*+?^$()|[\]\\]/g, "\\$&") +
          "\\b",
        "i",
      ).test(positiveContract),
    );
    const excludedContract = contract.split(/\bExclude\b/i)[1] || "";
    const forbiddenActions = actions.filter((action) =>
      new RegExp(
        "\\b" +
          action.label.replace(/[.*+?^$()|[\]\\]/g, "\\$&") +
          "\\b",
        "i",
      ).test(excludedContract),
    );
    const target = {
      promptId: row.promptId,
      visualId: row.visualId,
      canonicalPath: row.canonicalPath,
      width: row.width,
      height: row.height,
      viewport: { width: row.width, height: row.height },
      category: row.category,
      method,
      context: row.context,
      batch: row.batch,
      route: routesFor(contract),
      role: resolvedRole,
      organization: organizations.filter((name) =>
        new RegExp("\\b" + name.replace(" ", "\\s+") + "\\b", "i").test(
          positiveContract,
        ),
      ),
      nav: uniq([...matrixNav, ...explicitNav]),
      actions: requiredActions,
      actionCopy: phrase(
        contract,
        "(?:actions?|buttons?|CTAs?)",
        "none encoded",
      ),
      fields: phrase(
        contract,
        "(?:fields?|field labels?)",
        "none encoded",
      ),
      tables: tableIds,
      tabs: phrase(contract, "(?:tabs?|tab labels?)", "none encoded"),
      states: phrase(
        contract,
        "(?:states?|state treatment|interaction state)",
        "encoded in prompt contract",
      ),
      featureFlags: flags,
      exactCopy: promptExactCopy,
      sourceVisuals: uniq(
        contract.match(
          /VISUAL-(?:BRAND|COMP|SCREEN|MOBILE|STATE)-\d{3}/g,
        ) || [],
      ),
      sourceAuthorities: authoritiesFor(row, contract),
      authorityNote: row.authorityNote,
      promptSha256: sha256(contract),
    };
    if (screenId) target.screenId = screenId;
    if (method === "DETERMINISTIC_UI_RENDER") {
      const title = screenSection?.title || row.context;
      target.render = {
        title,
        subtitle: extractLabeledSegment(
          contract,
          "(?:Subtitle|Supporting copy)",
          "not separately specified by authority",
        ),
        layoutType: layoutTypeFor(row, contract, screenSection),
        exactRequirements: {
          surface: contract.split(/\b(?:Show|Place|Fields(?:\/tables)?):/i)[0].trim(),
          content: extractLabeledSegment(
            contract,
            "(?:Show|Place|Content)",
            "see exact screen and prompt authorities",
          ),
          fieldsTables: extractLabeledSegment(
            contract,
            "Fields(?:\/tables)?",
            "none specified",
          ),
          actions: extractLabeledSegment(
            contract,
            "Actions?",
            "none specified",
          ),
          state: extractLabeledSegment(contract, "State", "ready/default"),
          accessibility: extractLabeledSegment(
            contract,
            "Accessibility",
            "global frozen accessibility rules apply",
          ),
          responsive: extractLabeledSegment(
            contract,
            "(?:Responsive intent|Responsive behavior)",
            "global frozen responsive rules apply",
          ),
          forbidden: extractLabeledSegment(
            contract,
            "Exclude",
            "global anti-invention clause applies",
          ),
        },
        organization: [...organizations.filter((name) =>
          new RegExp("\\b" + name.replace(" ", "\\s+") + "\\b", "i").test(
            positiveContract,
          ),
        )],
        activeNav: activeNavFor(screenId, contract, uniq([...matrixNav, ...explicitNav])),
        breadcrumb: breadcrumbFor(contract),
        fields: [
          ...formIds
            .map((formId) => formSchemas.get(formId))
            .filter(Boolean),
          ...(formIds.length === 0 &&
          !/^none\b/i.test(
            extractLabeledSegment(
              contract,
              "Fields(?:\/tables)?",
              "none specified",
            ),
          )
            ? [
                {
                  source: "prompt",
                  fieldsAndValidation: extractLabeledSegment(
                    contract,
                    "Fields(?:\/tables)?",
                    "none specified",
                  ),
                },
              ]
            : []),
        ],
        tables: tableIds
          .map((tableId) => tableSchemas.get(tableId))
          .filter(Boolean),
        tabRequirements: extractLabeledSegment(contract, "Tabs?", "none specified"),
        states: extractLabeledSegment(
          contract,
          "State",
          uniq(exactContext.match(/STATE-\d{3}/g) || []).join(", ") ||
            "ready/default",
        ),
        featureFlags: flags,
        exactSampleDataCopy: {
          sampleData: extractLabeledSegment(
            contract,
            "(?:Sample data|Sample context)",
            "none specified",
          ),
          copy: promptExactCopy,
        },
        requiredActions,
        requiredActionCopy: extractLabeledSegment(
          contract,
          "Actions?",
          "none specified",
        ),
        forbiddenActions,
        dialogsDrawers: overlayFactsFor(contract),
        sourceScreenContract: screenSection?.exactContract || "not applicable",
      };
      const rendererFacts = blocksFor(target, contract, tableSchemas);
      target.render.actions =
        rendererFacts.actions || structuredActionsFor(contract, requiredActions).slice(0, 4);
      target.render.tabs = rendererFacts.tabs || structuredTabsFor(contract);
      target.render.breadcrumbs = target.render.breadcrumb;
      target.render.screen = {
        title: target.render.title,
        subtitle:
          target.render.subtitle === "not separately specified by authority"
            ? ""
            : target.render.subtitle,
        breadcrumbs: target.render.breadcrumbs,
      };
      target.render.shell = shellFor(target, contract, target.render.activeNav);
      target.render.blocks = rendererFacts.blocks;
      if (row.promptId === "PROMPT-SCREEN-008") {
        const authorityResolution =
          "Authority precedence: source 07 and file 20 authenticated-shell navigation supersede the conflicting derived prompt omission; retain Notifications navigation and the Profile user action.";
        target.authorityResolution = authorityResolution;
        target.render.authorityResolution = authorityResolution;
        target.render.shell.authorityResolution = authorityResolution;
        target.render.shell.userActions = [
          renderedAction("Profile"),
          renderedAction("Sign out", 1),
        ];
      }
    }
    return target;
  });

  const methodCounts = Object.fromEntries(
    Object.keys(EXPECTED_COUNTS).map((method) => [
      method,
      targets.filter((target) => target.method === method).length,
    ]),
  );

  return {
    schemaVersion: 1,
    product: "Stockmok",
    registerStatus: "APPROVED_FOR_GENERATION current targets only",
    classificationBasis:
      "Frozen accepted pre-batch foundation snapshot: 19 canonical IMAGEGEN foundations; deterministic outputs do not self-reclassify after rendering.",
    generatedFrom: Object.values(FILES),
    expectedTargetCount: EXPECTED_TOTAL,
    expectedMethodCounts: EXPECTED_COUNTS,
    methodCounts,
    exclusions: ["PROMPT-BRAND-001", "VISUAL-BRAND-001"],
    sharedTableSchemas: Object.fromEntries(tableSchemas),
    targets,
  };
}

function emitManifestPatch() {
  const json = JSON.stringify(buildManifest()) + "\n";
  const body = json
    .replace(/\r\n/g, "\n")
    .replace(/\n$/, "")
    .split("\n")
    .map((line) => "+" + line)
    .join("\n");
  process.stdout.write(
    "*** Begin Patch\n" +
      "*** Add File: visual-designs/renderer/render-manifest.json\n" +
      body +
      "\n*** End Patch\n",
  );
}

function validate(manifest) {
  const errors = [];
  const register = parseRegister();
  const contracts = parsePromptContracts();
  const registeredActions = new Map(
    parseActions().map((action) => [action.id, action.label]),
  );
  const registeredNav = new Set(parseNavigationLabels());
  const tableSchemas = parseTableSchemas();
  const formSchemas = parseFormSchemas();
  const expectedByPrompt = new Map(
    register.map((entry) => [entry.promptId, entry]),
  );

  const fail = (message) => errors.push(message);
  if (register.length !== EXPECTED_TOTAL) {
    fail("Authority register count is " + register.length + ", expected 105");
  }
  if (!Array.isArray(manifest.targets)) {
    fail("targets must be an array");
    return errors;
  }
  if (manifest.product !== "Stockmok") fail("product must be Stockmok");
  if (manifest.expectedTargetCount !== EXPECTED_TOTAL) {
    fail("expectedTargetCount must equal 105");
  }
  if (manifest.targets.length !== EXPECTED_TOTAL) {
    fail("Target count is " + manifest.targets.length + ", expected 105");
  }
  const availableFoundationCount = register.filter(
    (entry) =>
      FOUNDATION_PROMPT_IDS.has(entry.promptId) &&
      fs.existsSync(path.join(root, entry.canonicalPath)),
  ).length;
  if (availableFoundationCount !== EXPECTED_COUNTS.IMAGEGEN_FOUNDATION) {
    fail(
      "Available frozen foundation PNG count is " +
        availableFoundationCount +
        ", expected " +
        EXPECTED_COUNTS.IMAGEGEN_FOUNDATION,
    );
  }
  if (
    !manifest.sharedTableSchemas ||
    Object.keys(manifest.sharedTableSchemas).length !== tableSchemas.size
  ) {
    fail("sharedTableSchemas must contain all " + tableSchemas.size + " tables");
  }
  if (/stockflow/i.test(JSON.stringify(manifest))) {
    fail("Legacy StockFlow string found in current manifest");
  }
  if (
    manifest.targets.some(
      (target) =>
        target.promptId === "PROMPT-BRAND-001" ||
        target.visualId === "VISUAL-BRAND-001",
    )
  ) {
    fail("Retired BRAND-001 is present as a current target");
  }
  if (
    JSON.stringify(manifest).includes("PROMPT-BRAND-001") &&
    !manifest.exclusions?.includes("PROMPT-BRAND-001")
  ) {
    fail("Retired PROMPT-BRAND-001 appears outside the explicit exclusion");
  }

  for (const key of ["promptId", "visualId", "canonicalPath"]) {
    const seen = new Set();
    for (const target of manifest.targets) {
      const value = target[key];
      if (!value) fail("Missing " + key + " on target " + (target.promptId || "?"));
      else if (seen.has(value)) fail("Duplicate " + key + ": " + value);
      else seen.add(value);
    }
  }

  const actualMethods = {};
  for (const target of manifest.targets) {
    actualMethods[target.method] = (actualMethods[target.method] || 0) + 1;
    const expected = expectedByPrompt.get(target.promptId);
    if (!expected) {
      fail("Manifest target not approved by register: " + target.promptId);
      continue;
    }
    for (const key of [
      "visualId",
      "canonicalPath",
      "width",
      "height",
      "category",
    ]) {
      if (target[key] !== expected[key]) {
        fail(
          target.promptId +
            " wrong " +
            key +
            ": " +
            JSON.stringify(target[key]) +
            " expected " +
            JSON.stringify(expected[key]),
        );
      }
    }
    if (target.method !== methodFor(target.promptId, target.canonicalPath)) {
      fail(target.promptId + " has wrong render method " + target.method);
    }
    if (
      target.viewport?.width !== target.width ||
      target.viewport?.height !== target.height
    ) {
      fail(target.promptId + " viewport does not match registered dimensions");
    }
    if (!/^PROMPT-[A-Z]+-\d{3}$/.test(target.promptId)) {
      fail("Malformed promptId: " + target.promptId);
    }
    if (!/^VISUAL-[A-Z]+-\d{3}$/.test(target.visualId)) {
      fail("Malformed visualId: " + target.visualId);
    }
    if (
      target.promptId.replace(/^PROMPT-/, "") !==
      target.visualId.replace(/^VISUAL-/, "")
    ) {
      fail(target.promptId + " / " + target.visualId + " ID pair mismatch");
    }
    if (
      !target.canonicalPath.endsWith(".png") ||
      !/^visual-designs\/(?:generated|review-boards)\//.test(
        target.canonicalPath,
      )
    ) {
      fail(target.promptId + " has invalid canonical PNG path");
    }
    if (
      /^SCREEN-\d{3}$/.test(expected.context) &&
      target.screenId !== expected.context
    ) {
      fail(target.promptId + " missing or wrong screenId");
    }
    if (!Array.isArray(target.sourceAuthorities) || !target.sourceAuthorities.length) {
      fail(target.promptId + " has no sourceAuthorities");
    }
    if (!/^[a-f0-9]{64}$/.test(target.promptSha256 || "")) {
      fail(target.promptId + " has no valid promptSha256");
    }
    if (target.promptSha256 !== sha256(contracts.get(target.promptId) || "")) {
      fail(target.promptId + " prompt facts drifted from files 26/27");
    }
    for (const field of [
      "route",
      "organization",
      "nav",
      "actions",
      "tables",
      "exactCopy",
      "sourceVisuals",
    ]) {
      if (!Array.isArray(target[field])) {
        fail(target.promptId + " " + field + " must be an array");
      }
    }
    for (const label of target.nav || []) {
      if (!registeredNav.has(label)) {
        fail(target.promptId + " encodes unregistered navigation: " + label);
      }
    }
    for (const action of target.actions || []) {
      if (
        !action?.id ||
        !registeredActions.has(action.id) ||
        registeredActions.get(action.id) !== action.label
      ) {
        fail(
          target.promptId +
            " encodes unregistered or mismatched action: " +
            JSON.stringify(action),
        );
      }
    }
    if (target.method === "DETERMINISTIC_UI_RENDER") {
      const render = target.render;
      if (!render || typeof render !== "object") {
        fail(target.promptId + " deterministic target has no render payload");
        continue;
      }
      for (const key of ["title", "subtitle", "tabRequirements", "states", "requiredActionCopy"]) {
        if (typeof render[key] !== "string" || !render[key].trim()) {
          fail(target.promptId + " render." + key + " must be a non-empty string");
        }
      }
      if (!LAYOUT_TYPES.has(render.layoutType)) {
        fail(target.promptId + " render.layoutType is outside the frozen five");
      }
      if (!("activeNav" in render)) {
        fail(target.promptId + " render.activeNav is missing");
      } else if (render.activeNav !== null && !registeredNav.has(render.activeNav)) {
        fail(target.promptId + " render.activeNav is unregistered: " + render.activeNav);
      }
      for (const field of [
        "organization",
        "breadcrumb",
        "fields",
        "tables",
        "requiredActions",
        "forbiddenActions",
        "actions",
        "tabs",
        "breadcrumbs",
        "blocks",
      ]) {
        if (!Array.isArray(render[field])) {
          fail(target.promptId + " render." + field + " must be an array");
        }
      }
      if (
        !render.exactRequirements ||
        typeof render.exactRequirements !== "object" ||
        !render.exactRequirements.surface ||
        !render.exactRequirements.forbidden
      ) {
        fail(target.promptId + " render.exactRequirements is inadequate");
      }
      if (
        !render.exactSampleDataCopy ||
        typeof render.exactSampleDataCopy !== "object" ||
        !Array.isArray(render.exactSampleDataCopy.copy)
      ) {
        fail(target.promptId + " render.exactSampleDataCopy is inadequate");
      }
      if (!render.featureFlags || typeof render.featureFlags !== "object") {
        fail(target.promptId + " render.featureFlags must be an object");
      }
      if (
        !render.dialogsDrawers ||
        !Array.isArray(render.dialogsDrawers.types) ||
        typeof render.dialogsDrawers.exactRequirements !== "string"
      ) {
        fail(target.promptId + " render.dialogsDrawers is inadequate");
      }
      if (!render.blocks.length) {
        fail(target.promptId + " render.blocks must not be empty");
      }
      const supportedBlocks = new Set([
        "stats",
        "table",
        "list",
        "alert",
        "form",
        "details",
        "chart",
        "empty",
        "modal",
        "wizard",
        "notificationList",
        "popover",
        "frameGrid",
        "componentGallery",
        "mobile-auth",
        "mobile-list",
        "mobile-detail",
        "mobile-receiving",
        "organizationHero",
        "productCardList",
        "collapsedFilter",
        "mobile-auth",
        "mobile-list",
        "mobile-detail",
        "mobile-receiving",
      ]);
      for (const block of render.blocks || []) {
        if (!supportedBlocks.has(block?.type)) {
          fail(target.promptId + " has unsupported render block " + JSON.stringify(block?.type));
          continue;
        }
        if (block.type === "table") {
          const authoritative = tableSchemas.get(block.schemaId);
          if (!authoritative) {
            fail(target.promptId + " table block has unknown schemaId " + block.schemaId);
          } else {
            const labels = (block.columns || []).map((column) => column.label);
            if (JSON.stringify(labels) !== JSON.stringify(authoritative.columns)) {
              fail(target.promptId + " table block columns drifted for " + block.schemaId);
            }
          }
          if (!Array.isArray(block.rows)) fail(target.promptId + " table block rows must be an array");
        }
        if (block.type === "form" && !Array.isArray(block.fields)) {
          fail(target.promptId + " form block fields must be an array");
        }
        if (["stats", "list", "details", "chart"].includes(block.type) && !Array.isArray(block.items)) {
          fail(target.promptId + " " + block.type + " block items must be an array");
        }
        if (block.type === "modal" && !Array.isArray(block.fields || [])) {
          fail(target.promptId + " modal block fields must be an array when present");
        }
        if (block.type === "wizard" && (!Array.isArray(block.steps) || block.steps.length !== 4)) {
          fail(target.promptId + " wizard block must contain exactly four steps");
        }
        if (["notificationList", "popover"].includes(block.type) && !Array.isArray(block.items)) {
          fail(target.promptId + " " + block.type + " block items must be an array");
        }
        if (block.type === "frameGrid" && !Array.isArray(block.frames)) {
          fail(target.promptId + " frameGrid block frames must be an array");
        }
        if (block.type === "componentGallery" && !Array.isArray(block.sections)) {
          fail(target.promptId + " componentGallery block sections must be an array");
        }
        if (block.type === "productCardList" && !Array.isArray(block.items)) fail(target.promptId + " productCardList items must be an array");
      }
      if (!render.shell || typeof render.shell !== "object" || !Array.isArray(render.shell.navigation)) {
        fail(target.promptId + " render.shell is inadequate");
      } else {
        for (const section of render.shell.navigation) {
          for (const item of section.items || []) {
            if (!registeredNav.has(item.label)) {
              fail(target.promptId + " shell encodes unregistered navigation " + item.label);
            }
          }
        }
      }
      for (const action of render.actions || []) {
        if (!action?.label || !["primary", "secondary", "danger"].includes(action.variant)) {
          fail(target.promptId + " has malformed structured render action");
        }
      }
      for (const tab of render.tabs || []) {
        if (!tab?.label || typeof tab.active !== "boolean") {
          fail(target.promptId + " has malformed structured tab");
        }
      }
      if (
        !render.screen ||
        render.screen.title !== render.title ||
        !Array.isArray(render.screen.breadcrumbs)
      ) {
        fail(target.promptId + " render.screen/breadcrumbs are inadequate");
      }
      if (target.promptId === "PROMPT-SCREEN-008") {
        const shellNav = render.shell.navigation.flatMap((section) => section.items || []).map((item) => item.label);
        const userActions = (render.shell.userActions || []).map((action) => action.label);
        if (!shellNav.includes("Notifications")) fail("PROMPT-SCREEN-008 must retain Notifications navigation");
        if (!userActions.includes("Profile")) fail("PROMPT-SCREEN-008 must retain Profile user action");
        if (!target.authorityResolution || !render.authorityResolution) {
          fail("PROMPT-SCREEN-008 must document authorityResolution");
        }
      }
      const blockOf = (type) => render.blocks.find((block) => block.type === type);
      const tableOf = (schemaId) =>
        render.blocks.find((block) => block.type === "table" && block.schemaId === schemaId);
      if (target.promptId === "PROMPT-SCREEN-011") {
        if ((tableOf("TABLE-001")?.rows || []).length !== 6) {
          fail("PROMPT-SCREEN-011 must encode all six canonical product rows");
        }
        if ((blockOf("form")?.fields || []).length < 5) {
          fail("PROMPT-SCREEN-011 must encode the exact filter controls");
        }
      }
      if (target.promptId === "PROMPT-SCREEN-016") {
        const priorityFields = blockOf("modal")?.fields || blockOf("form")?.fields || [];
        const labels = priorityFields.map((field) => field.label);
        for (const label of ["Product", "Warehouse", "Current balance", "Direction", "Quantity", "Reason", "Result"]) {
          if (!labels.includes(label)) fail("PROMPT-SCREEN-016 missing explicit field " + label);
        }
        for (const [label, value] of [["Warehouse", "Cold Room"], ["Direction", "Increase"]]) {
          const field = priorityFields.find((candidate) => candidate.label === label);
          if (!field?.options?.includes(value)) {
            fail("PROMPT-SCREEN-016 " + label + " must include selected option " + value);
          }
        }
      }
      if (target.promptId === "PROMPT-SCREEN-038") {
        const priorityFields = blockOf("form")?.fields || [];
        if (priorityFields.length < 4) {
          fail("PROMPT-SCREEN-038 must encode four editable Draft fields");
        }
        for (const [label, value] of [["Connected supplier", "Fresh Foods Ltd"], ["Mapped item", "Fresh Chicken Breast 5 KG Pack"]]) {
          const field = priorityFields.find((candidate) => candidate.label === label);
          if (!field?.options?.includes(value)) {
            fail("PROMPT-SCREEN-038 " + label + " must include selected option " + value);
          }
        }
        if ((tableOf("TABLE-011")?.rows || []).length !== 1) {
          fail("PROMPT-SCREEN-038 must encode its canonical connected PO row");
        }
      }
      if (target.promptId === "PROMPT-MOBILE-006") {
        if (render.tabs.length !== 4 || !blockOf("stats") || !blockOf("details")) {
          fail("PROMPT-MOBILE-006 must encode four tabs, stock stat and Overview details");
        }
      }
      if (target.promptId === "PROMPT-STATE-004") {
        if ((blockOf("list")?.items || []).length !== 7) {
          fail("PROMPT-STATE-004 must encode seven state frames");
        }
        if ((tableOf("TABLE-011")?.rows || []).length !== 1) {
          fail("PROMPT-STATE-004 must encode its canonical PO row");
        }
      }
      if (target.promptId === "PROMPT-COMP-001") {
        if (render.blocks.length < 3 || render.actions.length !== 4) {
          fail("PROMPT-COMP-001 must encode button foundations, variants, icons and four sample actions");
        }
      }
      if (target.promptId === "PROMPT-SCREEN-044") {
        const charts = render.blocks.filter((block) => block.type === "chart");
        const stats = render.blocks.filter((block) => block.type === "stats");
        const statItems = stats.flatMap((block) => block.items || []);
        const attention = render.blocks.find((block) => block.type === "list" && block.title === "Needs attention");
        if (statItems.length !== 5 || charts.length !== 2 || (attention?.items || []).length !== 2) {
          fail("PROMPT-SCREEN-044 must encode five KPIs, two charts and exact attention aggregates");
        }
        const donut = charts.find((chart) => chart.title === "Stock status");
        const bar = charts.find((chart) => chart.title === "Inventory by location");
        if (donut?.variant !== "donut" || donut?.kind !== "donut" || bar?.variant !== "bar") {
          fail("PROMPT-SCREEN-044 must encode CHART-001 donut and CHART-002 bar variants");
        }
        for (const tableId of ["TABLE-024", "TABLE-025", "TABLE-026", "TABLE-027"]) {
          if (!tableOf(tableId)) fail("PROMPT-SCREEN-044 missing exact columns for " + tableId);
        }
        const expectedLocationItems = [
          { label: "Main Store", value: 292800, meta: "LKR 292,800.00 · 51.90%" },
          { label: "Cold Room", value: 271400, meta: "LKR 271,400.00 · 48.10%" },
        ];
        const expectedLocationRows = [
          ["Main Store", "LKR 292,800.00 · 51.90%"],
          ["Cold Room", "LKR 271,400.00 · 48.10%"],
        ];
        if (JSON.stringify(bar?.items) !== JSON.stringify(expectedLocationItems)) {
          fail("PROMPT-SCREEN-044 CHART-002 location values drifted from canonical seed");
        }
        if (JSON.stringify(tableOf("TABLE-027")?.rows) !== JSON.stringify(expectedLocationRows)) {
          fail("PROMPT-SCREEN-044 TABLE-027 location rows drifted from canonical seed");
        }
        if (!/total LKR 564,200\.00/i.test(bar?.accessibleLabel || "")) {
          fail("PROMPT-SCREEN-044 CHART-002 accessible summary must reconcile total LKR 564,200.00");
        }
        if (!/No recent activity/.test(tableOf("TABLE-024")?.description || "") || !/No recent purchase orders/.test(tableOf("TABLE-026")?.description || "")) {
          fail("PROMPT-SCREEN-044 must encode honest empty activity and purchase-order panels");
        }
      }
      for (const table of render.tables || []) {
        const authoritative = tableSchemas.get(table.id);
        if (!authoritative) {
          fail(target.promptId + " render references unknown table " + table.id);
        } else if (
          table.exactColumns !== authoritative.exactColumns ||
          JSON.stringify(table.columns) !== JSON.stringify(authoritative.columns)
        ) {
          fail(target.promptId + " render table columns drifted for " + table.id);
        }
      }
      for (const fieldGroup of render.fields || []) {
        if (!fieldGroup.id) continue;
        const authoritative = formSchemas.get(fieldGroup.id);
        if (!authoritative) {
          fail(target.promptId + " render references unknown form " + fieldGroup.id);
        } else if (
          fieldGroup.fieldsAndValidation !== authoritative.fieldsAndValidation ||
          fieldGroup.submitOutcome !== authoritative.submitOutcome
        ) {
          fail(target.promptId + " render form schema drifted for " + fieldGroup.id);
        }
      }
      for (const action of [
        ...(render.requiredActions || []),
        ...(render.forbiddenActions || []),
      ]) {
        if (
          !action?.id ||
          !registeredActions.has(action.id) ||
          registeredActions.get(action.id) !== action.label
        ) {
          fail(
            target.promptId +
              " render encodes unregistered action " +
              JSON.stringify(action),
          );
        }
      }
    } else if (target.render !== undefined) {
      fail(target.promptId + " non-deterministic target must not carry render payload");
    }
  }

  for (const expected of register) {
    if (!manifest.targets.some((target) => target.promptId === expected.promptId)) {
      fail("Missing approved target: " + expected.promptId);
    }
  }
  for (const [method, count] of Object.entries(EXPECTED_COUNTS)) {
    if ((actualMethods[method] || 0) !== count) {
      fail(
        method +
          " count is " +
          (actualMethods[method] || 0) +
          ", expected " +
          count,
      );
    }
    if (manifest.methodCounts?.[method] !== count) {
      fail("Declared methodCounts." + method + " must equal " + count);
    }
    if (manifest.expectedMethodCounts?.[method] !== count) {
      fail("Declared expectedMethodCounts." + method + " must equal " + count);
    }
  }
  return errors;
}

if (process.argv.includes("--emit-manifest-patch")) {
  emitManifestPatch();
  process.exit(0);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (error) {
  console.error("FAIL: cannot load render-manifest.json: " + error.message);
  process.exit(1);
}

const errors = validate(manifest);
if (errors.length) {
  console.error("FAIL: render manifest has " + errors.length + " error(s)");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log(
  "PASS: 105 current approved targets; " +
    "69 DETERMINISTIC_UI_RENDER, " +
    "17 COMPOSITE_REVIEW_BOARD, " +
    "19 IMAGEGEN_FOUNDATION; retired BRAND-001 excluded.",
);
