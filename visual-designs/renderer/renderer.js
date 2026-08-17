const RENDER_VERSION = "2.0.0";

const STOCKMOK = Object.freeze({
  productName: "Stockmok",
  primary: "#1D4ED8",
  defaultOrganization: "Grand Ocean Hotel",
  defaultMonogram: "GO",
});

const GLYPHS = Object.freeze({
  dashboard: "▦",
  inventory: "□",
  products: "▣",
  categories: "◇",
  warehouses: "⌂",
  movements: "⇄",
  procurement: "≡",
  suppliers: "◉",
  buyers: "◎",
  receiving: "↓",
  network: "⌁",
  reports: "▥",
  team: "♙",
  settings: "⚙",
  default: "•",
});

// The only Stackline-S geometry in the renderer. It follows the accepted
// 24-unit master: 4-unit bars, a 4-unit spine, proportional rounding.
function brandMark(className = "brand-mark") {
  return `<svg class="${escapeAttribute(className)}" viewBox="0 0 24 24" role="img" aria-label="Stockmok">
    <path fill="currentColor" d="M4 2h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2v2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-6v4h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h6v-4h0V6H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/>
  </svg>`;
}

function brandLockup() {
  return `<span class="brand-lockup">${brandMark()}<span class="brand-wordmark">Stockmok</span></span>`;
}

const CP1252_BYTES = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

function mojibakeScore(value) {
  return (String(value).match(/[ÃÂâ]/g) || []).length;
}

function decodeCp1252Utf8(value) {
  const bytes = [];
  for (const character of String(value)) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 0xff) bytes.push(codePoint);
    else if (CP1252_BYTES.has(codePoint)) bytes.push(CP1252_BYTES.get(codePoint));
    else bytes.push(...new TextEncoder().encode(character));
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    return null;
  }
}

function sanitizeText(value) {
  let text = String(value ?? "");
  for (let pass = 0; pass < 3 && mojibakeScore(text) > 0; pass += 1) {
    const decoded = decodeCp1252Utf8(text);
    if (!decoded || mojibakeScore(decoded) >= mojibakeScore(text)) break;
    text = decoded;
  }
  return text;
}

function escapeHTML(value) {
  return sanitizeText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value).replaceAll("`", "&#096;");
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [value];
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function compactText(value, fallback = "") {
  const resolved = firstDefined(value, fallback);
  return typeof resolved === "string" || typeof resolved === "number" ? String(resolved) : fallback;
}

function slug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCase(value) {
  return String(value ?? "").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function normalizedOptions(value) {
  if (typeof value === "string" && /^(?:none|none encoded|not applicable|n\/a)$/i.test(value.trim())) return [];
  return asArray(value);
}

function initials(name, fallback = "U") {
  const words = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return fallback;
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function manifestEntries(manifest) {
  if (Array.isArray(manifest)) return manifest;
  const direct = [manifest?.targets, manifest?.renders, manifest?.entries, manifest?.visuals, manifest?.screens, manifest?.items];
  for (const candidate of direct) {
    if (Array.isArray(candidate)) return candidate;
  }
  if (manifest && typeof manifest === "object") {
    const likelyMap = firstDefined(manifest.targets, manifest.renders, manifest.entries, manifest.visuals, manifest.screens);
    if (likelyMap && typeof likelyMap === "object" && !Array.isArray(likelyMap)) {
      return Object.entries(likelyMap).map(([key, value]) => ({ id: key, ...(value || {}) }));
    }
    if (manifest.id || manifest.visualId || manifest.visual_id || manifest.promptId) return [manifest];
  }
  return [];
}

function entryIdentity(entry) {
  return compactText(firstDefined(
    entry?.visualId,
    entry?.visual_id,
    entry?.id,
    entry?.screenId,
    entry?.screen_id,
    entry?.promptId,
    entry?.prompt_id,
    entry?.slug,
  ));
}

function selectEntry(manifest, requestedId) {
  const entries = manifestEntries(manifest);
  if (!entries.length) throw new Error("The render manifest does not contain any render entries.");
  if (!requestedId) return entries[0];
  const wanted = requestedId.toLowerCase();
  const match = entries.find((entry) => {
    const candidates = [
      entryIdentity(entry), entry?.visualId, entry?.visual_id, entry?.id,
      entry?.screenId, entry?.screen_id, entry?.promptId, entry?.prompt_id, entry?.slug,
    ];
    return candidates.some((candidate) => String(candidate ?? "").toLowerCase() === wanted);
  });
  if (!match) throw new Error(`No manifest entry matched “${requestedId}”.`);
  return match;
}

function normalizeNav(navSource) {
  const nav = asArray(navSource);
  if (!nav.length) return [];
  if (nav.some((item) => Array.isArray(item?.items) || Array.isArray(item?.links))) {
    return nav.map((section, index) => ({
      label: compactText(firstDefined(section.label, section.title, section.name), index === 0 ? "Workspace" : ""),
      items: asArray(firstDefined(section.items, section.links)).map(normalizeNavItem),
    }));
  }
  return [{ label: "", items: nav.map(normalizeNavItem) }];
}

function normalizeNavItem(item) {
  if (typeof item === "string") return { label: item, icon: slug(item), active: false };
  return {
    label: compactText(firstDefined(item?.label, item?.title, item?.name)),
    href: compactText(firstDefined(item?.href, item?.route), "#"),
    icon: compactText(firstDefined(item?.icon, item?.key, item?.label), "default"),
    active: Boolean(firstDefined(item?.active, item?.current, item?.selected, false)),
    badge: compactText(item?.badge),
  };
}

function markActiveNavigation(sections, route, explicitActive) {
  if (!explicitActive && sections.some((section) => section.items.some((item) => item.active))) return sections;
  const routeKey = slug(route);
  const activeKey = slug(explicitActive);
  let matched = false;
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const labelKey = slug(item.label);
      const candidate = !matched && labelKey && (activeKey
        ? labelKey === activeKey
        : (
          routeKey.endsWith(labelKey) ||
          (labelKey === "dashboard" && routeKey.endsWith("dashboard")) ||
          (labelKey === "stock-movements" && routeKey.includes("inventory-movements"))
        ));
      if (candidate) matched = true;
      return { ...item, active: Boolean(candidate) };
    }),
  }));
}

function normalizeAction(action) {
  if (typeof action === "string") return { label: action, variant: "primary" };
  return {
    label: compactText(firstDefined(action?.label, action?.text, action?.name)),
    variant: compactText(firstDefined(action?.variant, action?.kind, action?.tone), "primary").toLowerCase(),
    disabled: Boolean(action?.disabled),
    href: compactText(firstDefined(action?.href, action?.route), "#"),
  };
}

function normalizeBlock(block, index) {
  if (typeof block === "string") return { type: "card", title: block, body: "", span: 12, _index: index };
  const type = compactText(firstDefined(block?.type, block?.kind, block?.component, block?.variant), "card").toLowerCase();
  return { ...block, type, _index: index };
}

function usefulContractText(value) {
  const text = compactText(value).trim();
  return text && !/^(?:none|none specified|none encoded|not separately specified by authority|see exact screen and prompt authorities)$/i.test(text)
    ? text : "";
}

function sampleTokens(renderConfig) {
  return asArray(renderConfig?.exactSampleDataCopy?.copy)
    .map((value) => compactText(value).trim())
    .filter((value) => value && !/^\/?(?:app|login|signup|b|invite|select-workspace)\b/i.test(value))
    .filter((value) => !/visual-designs\/|\.png$/i.test(value))
    .filter((value) => !/^COMP-\d{3}/.test(value));
}

function parseActionCopy(value) {
  const actionPattern = /^(?:row\s+|primary\s+)?(Add|Create|Save|Submit|Cancel|Confirm|Edit|Adjust|Archive|Receive|Place|Try|Team|Settings|Sign|Copy|Close|Open|Invite|Remove|Suspend|Change|Send|Accept|Reject|Disable|Publish|Unpublish|Start|Verify|Ship|Mark|Set|Clear|Apply|View)\b/i;
  return compactText(value)
    .split(/\s*(?:,|;|\band\b)\s*/i)
    .map((part) => part.replace(/^(?:row|primary)\s+/i, "").replace(/[.]+$/, "").trim())
    .filter((part) => part.length > 1 && part.length <= 48 && actionPattern.test(part))
    .map((label) => ({ label, variant: /^(?:Cancel|Archive|Remove|Reject|Disable|Unpublish)/i.test(label) ? "secondary" : "primary" }));
}

function derivePageActions(renderConfig, entry) {
  if (renderConfig.suppressPageActions === true) return [];
  const explicitSource = [renderConfig.actions, renderConfig.requiredActions, entry.actions]
    .find((value) => asArray(value).length > 0) || [];
  const explicit = asArray(explicitSource).map(normalizeAction);
  const seen = new Set();
  return explicit.filter((action) => {
    const key = action.label.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deriveBreadcrumbs(value, route) {
  const stopPattern = /^(?:PageHeader|FilterBar|Button|Table|Form|Dialog|Drawer|Modal|Add |Create |Apply |Clear )/i;
  const supplied = asArray(value).map((item) => compactText(firstDefined(item?.label, item?.title, item))).filter(Boolean);
  const clean = [];
  for (const item of supplied) {
    if (stopPattern.test(item)) break;
    if (!clean.includes(item)) clean.push(item);
    if (clean.length === 4) break;
  }
  if (clean.length) return clean;
  const path = compactText(route).split("?")[0];
  const segments = path.split("/").filter(Boolean).filter((segment) => segment !== "app" && !segment.startsWith(":"));
  if (segments.length && segments[0] === "grand-ocean") segments.shift();
  return segments.slice(-3).map((segment) => titleCase(segment.replaceAll("-", " ")));
}

function fieldValueFor(label, tokens) {
  const key = label.toLowerCase();
  if (key.includes("current balance")) return tokens.find((token) => /\b18 KG\b/i.test(token)) || "";
  if (key.includes("quantity") && !key.includes("converted")) return tokens.find((token) => /\b(?:2 KG|10 PACK)\b/i.test(token)) || "";
  if (key.includes("computed result")) return tokens.find((token) => /\b20 KG\b/i.test(token)) || "";
  if (key.includes("converted")) return tokens.find((token) => /\b50 KG\b/i.test(token)) || "";
  if (key.includes("operation")) return tokens.find((token) => /^OP-/i.test(token)) || "";
  return "";
}

function fieldsFromContract(renderConfig) {
  const source = renderConfig?.fields;
  if (Array.isArray(source)) return source;
  const contract = usefulContractText(source?.fieldsAndValidation || (typeof source === "string" ? source : ""));
  if (!contract) return [];
  const tokens = sampleTokens(renderConfig);
  return contract.split(/\s*;\s*/).map((raw) => raw.replace(/^`[^`]+`\s*/i, "").trim()).filter((raw) => {
    return raw && !/^(?:Quantity\s*>|result\s*[≥>]|>|operationId|Buyer DRAFT|submit creates|Atomic movement)/i.test(raw);
  }).map((raw) => {
    let label = raw
      .replace(/\s+read-only.*$/i, "")
      .replace(/\s+required.*$/i, "")
      .replace(/\s+Increase\/Decrease.*$/i, "")
      .replace(/\s+with\s+.*$/i, "")
      .replace(/\s*\([^)]*\).*$/i, "")
      .trim();
    if (/^direction/i.test(raw)) label = "Direction";
    if (/^quantity/i.test(raw)) label = raw.match(/^quantity(?:\s*\+\s*unit)?/i)?.[0] || "Quantity";
    const select = /warehouse|direction|role|status|supplier|unit/i.test(label);
    return {
      label: titleCase(label),
      type: select ? "select" : "text",
      options: /direction/i.test(label) ? ["Increase", "Decrease"] : [],
      value: fieldValueFor(label, tokens),
      required: /required/i.test(raw),
      readOnly: /read-only/i.test(raw),
      help: sanitizeText(raw),
    };
  }).filter((field) => field.label && field.label.length <= 72);
}

function tableColumns(table) {
  return asArray(firstDefined(table.columns, compactText(table.exactColumns).split(/\s*,\s*/)))
    .filter(Boolean)
    .map((label, index) => ({ key: `column-${index}`, label: compactText(label) }));
}

function productRowsFromState(state, columns) {
  const rows = [];
  const pattern = /([A-Z][A-Za-z ]+?)\s+([A-Z]{3,5}-\d{3})\s+(\d+(?:\.\d+)?\s+[A-Z]+)\s+(Low Stock|In Stock|Out of Stock)/g;
  for (const match of sanitizeText(state).matchAll(pattern)) {
    const values = new Map([
      ["Product (name + placeholder)", { primary: match[1].trim() }],
      ["Product", { primary: match[1].trim() }],
      ["SKU", match[2]],
      ["On Hand + unit", match[3]],
      ["Stock Status", { badge: match[4], tone: match[4] === "In Stock" ? "success" : match[4] === "Low Stock" ? "warning" : "danger" }],
      ["Status", { badge: match[4], tone: match[4] === "In Stock" ? "success" : "warning" }],
    ]);
    rows.push(Object.fromEntries(columns.map((column) => [column.key, values.get(column.label) || ""])));
  }
  return rows;
}

function poRowsFromContract(renderConfig, columns) {
  const source = sanitizeText(compactText(renderConfig?.fields?.fieldsAndValidation));
  const match = source.match(/(?:with\s+)?([^;]+?)\s+and\s+([A-Za-z ]+)\s+([A-Z]{3,5}-\d{3}):\s*(\d+(?:\.\d+)?\s+[A-Z]+)\s+at\s+(LKR\s+[\d,.]+),\s*total\s+(LKR\s+[\d,.]+)/i);
  if (!match) return [];
  const unit = match[4].split(/\s+/).at(-1);
  const values = new Map([
    ["Product", match[2].trim()], ["SKU", match[3]], ["Unit", unit], ["Ordered", match[4]],
    ["Unit Price", match[5]], ["Line Total", match[6]],
  ]);
  return [Object.fromEntries(columns.map((column) => [column.key, values.get(column.label) || ""]))];
}

function tableRows(table, entry, renderConfig, columns) {
  if (table.id === "TABLE-001") return productRowsFromState(renderConfig.states, columns);
  if (table.id === "TABLE-011") return poRowsFromContract(renderConfig, columns);
  if (table.id === "TABLE-004") {
    const text = `${renderConfig.exactRequirements?.content || ""} ${renderConfig.tabs || ""}`;
    const quantity = sanitizeText(text).match(/\b(\d+(?:\.\d+)?\s+(?:KG|L|PACK))\b/)?.[1] || "";
    const status = sanitizeText(text).match(/\b(Low Stock|In Stock|Out of Stock)\b/)?.[1] || "";
    const unit = quantity.split(/\s+/).at(-1) || "";
    const values = new Map([["On Hand", quantity.replace(/\s+[A-Z]+$/, "")], ["Unit", unit], ["Status", status ? { badge: status, tone: status === "In Stock" ? "success" : "warning" } : ""]]);
    return quantity || status ? [Object.fromEntries(columns.map((column) => [column.key, values.get(column.label) || ""]))] : [];
  }
  return [];
}

function parseTabs(value) {
  if (Array.isArray(value)) return value.map((tab, index) => typeof tab === "string" ? { label: tab, active: index === 0 } : { ...tab, label: compactText(firstDefined(tab.label, tab.title, tab.name)), active: Boolean(firstDefined(tab.active, tab.current, tab.selected, false)) });
  const text = usefulContractText(value);
  if (!text) return [];
  const navigationClause = sanitizeText(text).split(/\.(?:\s|$)/)[0].replace(/^Tabs?\s*/i, "");
  const rawParts = navigationClause.split(/\s*,\s*|\s+and\s+/i);
  return rawParts.map((part) => part.replace(/\s+active.*$/i, "").replace(/\s+may\s+.*$/i, "").trim()).filter((part) => part && part.length <= 32).map((label, index) => ({ label: titleCase(label), active: /active/i.test(rawParts[index] || "") || index === 0 }));
}

function kpisFromContent(value) {
  const labels = ["Inventory Value", "Active SKUs", "Low Stock", "Open Purchase Orders", "Awaiting Receipt"];
  const text = sanitizeText(value);
  return labels.map((label) => {
    const match = text.match(new RegExp(`${label.replaceAll(" ", "\\s+")}\\s+(LKR\\s+[\\d,.]+|\\d+)`, "i"));
    return match ? { label, value: match[1], meta: label.includes("Low Stock") ? "Needs attention" : "Current", tone: label.includes("Low Stock") ? "warning" : "" } : null;
  }).filter(Boolean);
}

function detailItemsFromContract(entry, renderConfig) {
  if (entry.visualId === "VISUAL-MOBILE-006") {
    return [
      ["Name", "Chicken Breast"], ["SKU", "MEAT-001"], ["Category", "Meat"], ["Base unit", "KG"],
      ["Purchase cost", "LKR 1,250.00"], ["Selling price", "Not set"], ["Minimum", "20 KG"],
      ["Reorder", "50 KG"], ["Status", "Low Stock"], ["Preferred supplier", "Green Farm"],
    ].map(([label, value]) => ({ label, value }));
  }
  const text = usefulContractText(renderConfig.exactRequirements?.content);
  return text.split(/\s*;\s*/).map((part) => part.match(/^([^:]{2,40}):\s*(.+)$/)).filter(Boolean).map((match) => ({ label: match[1], value: match[2] }));
}

function stateFrames(renderConfig) {
  const text = sanitizeText(usefulContractText(renderConfig.states));
  const frameText = text.match(/(?:mini-frames|frames):\s*(.+?)(?:\.\s+Use\b|$)/i)?.[1] || "";
  return frameText.split(/\s*;\s*/).map((part) => part.trim()).filter(Boolean);
}

function componentBlocks(entry, renderConfig) {
  if (!/^VISUAL-COMP-/.test(entry.visualId)) return [];
  const content = sanitizeText(usefulContractText(renderConfig.exactRequirements?.content));
  const variants = content.match(/primary, secondary, ghost and danger/i)
    ? ["Primary", "Secondary", "Ghost", "Danger"] : [];
  const states = content.match(/default, hover, visible focus, disabled and loading/i)?.[0] || usefulContractText(renderConfig.states);
  const samples = parseActionCopy(renderConfig.requiredActionCopy);
  return variants.map((title, index) => ({
    type: "card",
    title: `${title} button`,
    description: states,
    span: 3,
    actions: [{ ...(samples[index] || samples[0] || { label: title }), variant: title.toLowerCase() }],
  }));
}

function deriveBlocks(entry, renderConfig) {
  const blocks = [];
  const layout = compactText(renderConfig.layoutType).toLowerCase();

  const fields = layout.includes("form") && !/^VISUAL-STATE-/.test(entry.visualId) ? fieldsFromContract(renderConfig) : [];
  if (fields.length) blocks.push({ type: "form", title: renderConfig.title, description: usefulContractText(renderConfig.fields?.submitOutcome), fields, actions: derivePageActions(renderConfig, entry), span: layout.includes("form") ? 8 : 12 });

  for (const table of asArray(renderConfig.tables)) {
    const columns = tableColumns(table);
    blocks.push({
      type: "table",
      title: compactText(firstDefined(table.owner, table.id), "Table"),
      description: usefulContractText(table.queryFiltersSorting),
      columns,
      rows: tableRows(table, entry, renderConfig, columns),
      span: asArray(renderConfig.tables).length > 1 ? 6 : 12,
    });
  }

  return blocks.map(normalizeBlock);
}

function normalizeEntry(entry, requestedViewport) {
  const renderConfig = firstDefined(entry.render, entry.renderer, entry.config, {});
  const screen = firstDefined(renderConfig.screen, entry.screen, entry.page, entry.content, {});
  const shellSource = firstDefined(renderConfig.shell, entry.shell, screen.shell, {});
  const organizationSource = firstDefined(shellSource.organization, renderConfig.organization, entry.organization, screen.organization, {});
  const organizationCandidate = Array.isArray(organizationSource) ? organizationSource[0] : organizationSource;
  const organizationName = compactText(firstDefined(
    organizationCandidate?.name,
    typeof organizationCandidate === "string" ? organizationCandidate : undefined,
    shellSource.organizationName,
    entry.organizationName,
  ));
  const routeCandidate = firstDefined(renderConfig.route, entry.route, screen.route, entry.path);
  const route = compactText(Array.isArray(routeCandidate) ? routeCandidate[0] : routeCandidate);
  const inferredShellKind = /^VISUAL-COMP-/.test(entryIdentity(entry))
    ? "board"
    : /^\/?(?:app\/|app$)/i.test(route)
      ? "app"
      : route && !/^APP\//.test(route) ? "auth" : "app";
  const shellKind = /^VISUAL-COMP-/.test(entryIdentity(entry))
    ? "board"
    : /^\/?app\//i.test(route)
      ? "app"
    : compactText(firstDefined(renderConfig.shell?.kind, shellSource.kind, shellSource.type, entry.shellKind, entry.shell_type), inferredShellKind).toLowerCase();
  const explicitBlocks = asArray(firstDefined(
    renderConfig.blocks,
    renderConfig.components,
    renderConfig.sections,
    entry.blocks,
    entry.components,
    entry.sections,
    screen.blocks,
    screen.components,
    screen.sections,
  ));
  const blocks = (explicitBlocks.length ? explicitBlocks.map(normalizeBlock) : deriveBlocks(entry, renderConfig));
  const pageActions = derivePageActions(renderConfig, { ...entry, actions: firstDefined(screen.actions, entry.actions, entry.pageActions) });
  const viewport = requestedViewport || compactText(firstDefined(entry.viewport?.name, entry.viewport, entry.breakpoint), "desktop");
  const pathTitle = titleCase(compactText(entry.canonicalPath).split(/[\\/]/).pop()?.replace(/\.png$/i, "").replace(/^VISUAL-[A-Z]+-\d+[_-]?/i, "").replaceAll(/[_-]+/g, " "));

  return {
    id: entryIdentity(entry),
    promptId: compactText(firstDefined(entry.promptId, entry.prompt_id)),
    route,
    viewport,
    shell: {
      kind: shellKind,
      organization: organizationName,
      monogram: compactText(firstDefined(organizationCandidate?.monogram, shellSource.monogram, entry.monogram), organizationName ? initials(organizationName, STOCKMOK.defaultMonogram) : ""),
      handle: compactText(firstDefined(organizationCandidate?.handle, shellSource.organizationHandle, entry.handle)),
      role: compactText(firstDefined(shellSource.role, renderConfig.role, entry.role, screen.role)),
      workspaceSwitcher: Boolean(firstDefined(shellSource.workspaceSwitcher, shellSource.showWorkspaceSwitcher, entry.workspaceSwitcher, false)),
      notificationCount: Number(firstDefined(shellSource.notificationCount, shellSource.notifications, entry.notificationCount, 0)) || 0,
      userName: compactText(firstDefined(shellSource.userName, shellSource.user?.name, entry.userName), "User"),
      userInitials: compactText(firstDefined(shellSource.userInitials, shellSource.user?.initials), initials(firstDefined(shellSource.userName, shellSource.user?.name, entry.userName), "U")),
      nav: markActiveNavigation(normalizeNav(firstDefined(shellSource.navigation, shellSource.nav, entry.navigation, entry.nav)), route, renderConfig.activeNav),
      mobileNavOpen: Boolean(firstDefined(
        shellSource.mobileNavOpen,
        shellSource.drawerOpen,
        renderConfig.mobileNavOpen,
        entry.mobileNavOpen,
        entry.screenId === "SCREEN-043" || entryIdentity(entry) === "VISUAL-SCREEN-043",
      )),
    },
    page: {
      title: compactText(firstDefined(renderConfig.title, screen.title, entry.title, entry.name, pathTitle), entryIdentity(entry)),
      eyebrow: compactText(firstDefined(screen.eyebrow, entry.eyebrow)),
      subtitle: usefulContractText(firstDefined(renderConfig.subtitle, screen.subtitle, screen.description, entry.subtitle, entry.description)),
      breadcrumbs: deriveBreadcrumbs(firstDefined(renderConfig.breadcrumb, screen.breadcrumbs, entry.breadcrumbs), route),
      actions: pageActions,
      tabs: parseTabs(firstDefined(renderConfig.tabs, screen.tabs, entry.tabs)),
    },
    blocks,
    raw: entry,
  };
}

function renderBadge(value, tone = "") {
  if (value === undefined || value === null || value === "") return "";
  const safeTone = ["primary", "info", "success", "warning", "danger"].includes(String(tone).toLowerCase())
    ? ` badge--${String(tone).toLowerCase()}` : "";
  return `<span class="badge${safeTone}">${escapeHTML(value)}</span>`;
}

function renderAction(action) {
  const normalized = normalizeAction(action);
  if (!normalized.label) return "";
  const variant = ["secondary", "ghost", "danger"].includes(normalized.variant) ? ` button--${normalized.variant}` : "";
  return `<a class="button${variant}" href="${escapeAttribute(normalized.href)}"${normalized.disabled ? ' aria-disabled="true" tabindex="-1"' : ""}>${escapeHTML(normalized.label)}</a>`;
}

function renderActions(actions, className = "card-actions") {
  const content = asArray(actions).map(renderAction).join("");
  return content ? `<div class="${escapeAttribute(className)}">${content}</div>` : "";
}

function navGlyph(icon) {
  const key = slug(icon);
  const match = Object.keys(GLYPHS).find((candidate) => key.includes(candidate));
  return GLYPHS[match || "default"];
}

function renderNavigation(nav) {
  return nav.map((section) => `<section class="nav-section">
    ${section.label ? `<h2 class="nav-section__label">${escapeHTML(section.label)}</h2>` : ""}
    <ul class="nav-list">${section.items.map((item) => `<li>
      <a class="nav-item${item.active ? " nav-item--active" : ""}" href="${escapeAttribute(item.href || "#")}"${item.active ? ' aria-current="page"' : ""} title="${escapeAttribute(item.label)}">
        <span class="nav-item__icon" aria-hidden="true">${escapeHTML(navGlyph(item.icon))}</span>
        <span class="nav-item__label">${escapeHTML(item.label)}</span>
        ${item.badge ? renderBadge(item.badge) : ""}
      </a>
    </li>`).join("")}</ul>
  </section>`).join("");
}

function renderShellHeader(shell, route) {
  const notification = shell.notificationCount > 0
    ? `<span class="notification-count">${escapeHTML(shell.notificationCount > 99 ? "99+" : shell.notificationCount)}</span>` : "";
  const organization = shell.organization ? `<div class="organization-control">
    <span class="monogram" aria-hidden="true">${escapeHTML(shell.monogram || initials(shell.organization, STOCKMOK.defaultMonogram))}</span>
    <span class="organization-copy">
      <span class="organization-name">${escapeHTML(shell.organization)}</span>
      <span class="organization-meta">${shell.handle ? `<span class="organization-handle">${escapeHTML(shell.handle)}</span>` : ""}${renderBadge(shell.role)}</span>
    </span>
  </div>` : `<div class="organization-control"><span class="route-chip">${escapeHTML(route)}</span>${renderBadge(shell.role)}</div>`;

  return `<header class="shell-header">
    <button class="mobile-menu-button" type="button" aria-label="Open navigation"><span class="menu-glyph" aria-hidden="true">☰</span></button>
    <div class="shell-header__brand">${brandLockup()}</div>
    <div class="shell-header__controls">
      ${organization}
      <div class="header-actions">
        ${shell.workspaceSwitcher ? `<button class="workspace-control" type="button"><span>Switch workspace</span><span class="chevron-glyph" aria-hidden="true">⌄</span></button>` : ""}
        <button class="header-action" type="button" aria-label="Notifications"><span class="header-action__glyph" aria-hidden="true">♢</span>${notification}</button>
        <button class="user-control" type="button" aria-label="Open user menu"><span class="avatar" aria-hidden="true">${escapeHTML(shell.userInitials)}</span><span class="chevron-glyph" aria-hidden="true">⌄</span></button>
      </div>
    </div>
  </header>`;
}

function renderBreadcrumbs(items) {
  const crumbs = asArray(items).map((item) => typeof item === "string" ? item : firstDefined(item?.label, item?.title, item?.name)).filter(Boolean);
  return crumbs.length ? `<nav aria-label="Breadcrumb"><ol class="breadcrumbs">${crumbs.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ol></nav>` : "";
}

function renderTabs(tabs) {
  if (!tabs.length) return "";
  return `<div class="tabs" role="tablist">${tabs.map((tab, index) => {
    const label = typeof tab === "string" ? tab : compactText(firstDefined(tab.label, tab.title, tab.name));
    const active = typeof tab === "object" ? Boolean(firstDefined(tab.active, tab.current, tab.selected, false)) : index === 0;
    return `<button class="tab${active ? " tab--active" : ""}" type="button" role="tab" aria-selected="${active}">${escapeHTML(label)}${typeof tab === "object" && tab.count !== undefined ? ` ${renderBadge(tab.count)}` : ""}</button>`;
  }).join("")}</div>`;
}

function renderPageHeader(page, route) {
  return `${renderBreadcrumbs(page.breadcrumbs)}<header class="page-header">
    <div class="page-header__copy">
      ${page.eyebrow ? `<p class="page-eyebrow">${escapeHTML(page.eyebrow)}</p>` : ""}
      <h1 class="page-title">${escapeHTML(page.title)}</h1>
      ${page.subtitle ? `<p class="page-subtitle">${escapeHTML(page.subtitle)}</p>` : ""}
      ${route ? `<p class="route-chip">${escapeHTML(route)}</p>` : ""}
    </div>
    ${renderActions(page.actions, "page-actions")}
  </header>${renderTabs(page.tabs)}`;
}

function blockSpan(block) {
  const span = Number(firstDefined(block.span, block.columns, block.width, 12));
  return [3, 4, 5, 6, 7, 8, 9].includes(span) ? ` span-${span}` : "";
}

function renderCardHeader(block) {
  const title = compactText(firstDefined(block.title, block.label, block.heading));
  const description = compactText(firstDefined(block.description, block.subtitle, block.help));
  const actions = renderActions(firstDefined(block.actions, block.action), "card-actions");
  if (!title && !description && !actions) return "";
  return `<div class="card-header"><div>${title ? `<h2 class="card-title">${escapeHTML(title)}</h2>` : ""}${description ? `<p class="card-description">${escapeHTML(description)}</p>` : ""}</div>${actions}</div>`;
}

function renderStats(block) {
  const items = asArray(firstDefined(block.items, block.stats, block.values, block.metrics));
  const columns = Math.max(1, Math.min(5, Number(block.columns) || items.length || 1));
  return `<div class="stat-grid" style="--stat-columns:${columns}">${items.map((item) => {
    const data = typeof item === "object" ? item : { label: item };
    const tone = compactText(data.tone).toLowerCase();
    return `<article class="stat-card${data.action ? " stat-card--interactive" : ""}">
      <p class="stat-label">${escapeHTML(firstDefined(data.label, data.title, data.name))}</p>
      <p class="stat-value">${escapeHTML(firstDefined(data.value, data.amount, "—"))}</p>
      ${firstDefined(data.meta, data.change, data.description) ? `<p class="stat-meta${["success", "danger", "warning"].includes(tone) ? ` stat-meta--${tone}` : ""}">${escapeHTML(firstDefined(data.meta, data.change, data.description))}</p>` : ""}${data.action ? `<span class="stat-link">${escapeHTML(data.action)} →</span>` : ""}
    </article>`;
  }).join("")}</div>`;
}

function normalizeColumns(block) {
  const columns = asArray(firstDefined(block.columns, block.headers));
  if (columns.length) return columns.map((column) => typeof column === "string" ? { key: slug(column), label: column } : {
    key: compactText(firstDefined(column.key, column.id, column.field, slug(column.label))),
    label: compactText(firstDefined(column.label, column.title, column.name, column.key)),
  });
  const firstRow = asArray(firstDefined(block.rows, block.items, block.data))[0];
  return firstRow && typeof firstRow === "object"
    ? Object.keys(firstRow).map((key) => ({ key, label: key.replaceAll(/[_-]+/g, " ") })) : [];
}

function renderCell(value) {
  if (value && typeof value === "object") {
    if (value.badge !== undefined || value.tone) return renderBadge(firstDefined(value.badge, value.label, value.value), value.tone);
    if (value.primary !== undefined) return `<div class="cell-stack"><span class="cell-primary">${escapeHTML(value.primary)}</span>${value.secondary ? `<small>${escapeHTML(value.secondary)}</small>` : ""}</div>`;
    return escapeHTML(firstDefined(value.label, value.value, ""));
  }
  return escapeHTML(value);
}

function renderTable(block) {
  const rows = asArray(firstDefined(block.rows, block.items, block.data));
  const columns = normalizeColumns(block);
  return `<section class="table-card">
    <div class="table-header"><div>${block.title ? `<h2 class="card-title">${escapeHTML(block.title)}</h2>` : ""}${block.description ? `<p class="card-description">${escapeHTML(block.description)}</p>` : ""}</div>${renderActions(block.actions, "card-actions")}</div>
    <div class="table-wrap"><table class="data-table"><thead><tr>${columns.map((column) => `<th scope="col">${escapeHTML(column.label)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${columns.map((column, columnIndex) => {
      const value = Array.isArray(row) ? row[columnIndex] : row?.[column.key];
      return `<td data-label="${escapeAttribute(column.label)}">${renderCell(value)}</td>`;
    }).join("")}</tr>`).join("")}</tbody></table></div>
  </section>`;
}

function renderList(block) {
  const items = asArray(firstDefined(block.items, block.rows, block.steps));
  return `<section class="card">${renderCardHeader(block)}<ul class="list">${items.map((item, index) => {
    const data = typeof item === "object" ? item : { title: item };
    const complete = Boolean(firstDefined(data.complete, data.completed, data.done, false));
    return `<li class="list-item"><span class="list-marker${complete ? " list-marker--complete" : ""}" aria-hidden="true">${complete ? "✓" : escapeHTML(firstDefined(data.marker, index + 1))}</span><span class="list-copy"><span class="list-title">${escapeHTML(firstDefined(data.title, data.label, data.name))}</span>${firstDefined(data.description, data.subtitle, data.meta) ? `<span class="list-description">${escapeHTML(firstDefined(data.description, data.subtitle, data.meta))}</span>` : ""}</span>${data.badge ? renderBadge(data.badge, data.tone) : ""}</li>`;
  }).join("")}</ul></section>`;
}

function renderAlert(block) {
  const tone = ["success", "warning", "danger"].includes(compactText(block.tone).toLowerCase()) ? ` alert--${compactText(block.tone).toLowerCase()}` : "";
  return `<div class="alert${tone}" role="status"><span class="alert__icon" aria-hidden="true">${tone.includes("success") ? "✓" : tone.includes("danger") ? "!" : "i"}</span><span>${block.title ? `<span class="alert__title">${escapeHTML(block.title)}</span>` : ""}${firstDefined(block.body, block.description, block.message) ? `<span class="alert__body">${escapeHTML(firstDefined(block.body, block.description, block.message))}</span>` : ""}</span></div>`;
}

function renderField(field, index) {
  const data = typeof field === "string" ? { label: field } : field;
  const id = `field-${index}-${slug(firstDefined(data.name, data.label, "input"))}`;
  const type = compactText(firstDefined(data.type, data.control), "text").toLowerCase();
  const label = compactText(firstDefined(data.label, data.name));
  const value = compactText(firstDefined(data.value, data.defaultValue));
  const common = `id="${escapeAttribute(id)}" class="field-control" name="${escapeAttribute(firstDefined(data.name, id))}"${data.disabled ? " disabled" : ""}${data.readonly || data.readOnly ? " readonly" : ""}`;
  let control;
  if (type === "select") {
    const options = asArray(data.options);
    if (value && !options.some((option) => String(typeof option === "string" ? option : firstDefined(option.value, option.label)) === value)) {
      options.unshift(value);
    }
    control = `<select ${common}>${options.map((option) => {
      const optionValue = typeof option === "string" ? option : firstDefined(option.value, option.label);
      const optionLabel = typeof option === "string" ? option : firstDefined(option.label, option.value);
      return `<option${String(optionValue) === value ? " selected" : ""}>${escapeHTML(optionLabel)}</option>`;
    }).join("")}</select>`;
  } else if (type === "textarea") {
    control = `<textarea ${common} placeholder="${escapeAttribute(data.placeholder)}">${escapeHTML(value)}</textarea>`;
  } else {
    const inputType = ["text", "email", "password", "number", "date", "search", "tel", "url"].includes(type) ? type : "text";
    control = `<input ${common} type="${inputType}" value="${escapeAttribute(value)}" placeholder="${escapeAttribute(data.placeholder)}" />`;
  }
  return `<label class="field${data.full || data.fullWidth ? " field--full" : ""}" for="${escapeAttribute(id)}"><span class="field-label">${escapeHTML(label)}${data.required ? ' <span class="field-required">*</span>' : ""}</span>${control}${data.error ? `<span class="field-error">${escapeHTML(data.error)}</span>` : data.help ? `<span class="field-help">${escapeHTML(data.help)}</span>` : ""}</label>`;
}

function renderForm(block) {
  const fields = asArray(firstDefined(block.fields, block.items));
  return `<section class="form-card">${renderCardHeader({ ...block, actions: [] })}<form><div class="field-grid">${fields.map(renderField).join("")}</div>${renderActions(block.actions, "form-actions")}</form></section>`;
}

function renderDetails(block) {
  const items = asArray(firstDefined(block.items, block.rows, block.details));
  return `<section class="card">${renderCardHeader(block)}<dl class="definition-list">${items.map((item) => {
    const data = typeof item === "object" ? item : { label: item, value: "" };
    return `<div class="definition-row"><dt>${escapeHTML(firstDefined(data.label, data.term, data.name))}</dt><dd>${renderCell(firstDefined(data.value, data.description, data.detail))}</dd></div>`;
  }).join("")}</dl></section>`;
}

function renderChart(block) {
  const items = asArray(firstDefined(block.items, block.data, block.values));
  const numericValues = items.map((item) => Number(typeof item === "object" ? firstDefined(item.value, item.amount, 0) : item) || 0);
  const max = Math.max(...numericValues, 1);
  return `<section class="card">${renderCardHeader(block)}<div class="chart" role="img" aria-label="${escapeAttribute(firstDefined(block.accessibleLabel, block.title, "Bar chart"))}">${items.map((item, index) => {
    const data = typeof item === "object" ? item : { label: index + 1, value: item };
    const height = Math.max(4, Math.round((numericValues[index] / max) * 100));
    return `<span class="chart-bar" style="--bar-height:${height}%" title="${escapeAttribute(`${firstDefined(data.label, index + 1)}: ${numericValues[index]}`)}"><span class="chart-bar__label">${escapeHTML(firstDefined(data.label, index + 1))}</span></span>`;
  }).join("")}</div></section>`;
}

function renderDonut(block) {
  const items = asArray(firstDefined(block.items, block.data, block.values));
  const total = Math.max(1, items.reduce((sum, item) => sum + (Number(typeof item === "object" ? item.value : item) || 0), 0));
  let offset = 0;
  const palette = ["#1D4ED8", "#F59E0B", "#DC2626", "#64748B"];
  const stops = items.map((item, index) => {
    const value = Number(typeof item === "object" ? item.value : item) || 0;
    const start = (offset / total) * 100;
    offset += value;
    const end = (offset / total) * 100;
    return `${palette[index % palette.length]} ${start}% ${end}%`;
  }).join(", ");
  return `<section class="card">${renderCardHeader(block)}<div class="donut-layout"><div class="donut" style="--donut-stops:${escapeAttribute(stops)}" role="img" aria-label="${escapeAttribute(firstDefined(block.accessibleLabel, block.title, "Donut chart"))}"><span>${escapeHTML(total)}</span></div><ul class="donut-legend">${items.map((item, index) => { const data = typeof item === "object" ? item : { label: index + 1, value: item }; return `<li><span class="donut-swatch" style="background:${palette[index % palette.length]}"></span><span>${escapeHTML(data.label)}</span><strong>${escapeHTML(data.value)}</strong></li>`; }).join("")}</ul></div></section>`;
}

function renderHorizontalChart(block) {
  const items = asArray(firstDefined(block.items, block.data, block.values));
  const numericValues = items.map((item) => Number(typeof item === "object" ? firstDefined(item.value, item.amount, 0) : item) || 0);
  const max = Math.max(...numericValues, 1);
  return `<section class="card">${renderCardHeader(block)}<div class="chart chart--horizontal" role="img" aria-label="${escapeAttribute(firstDefined(block.accessibleLabel, block.title, "Horizontal bar chart"))}">${items.map((item, index) => { const data = typeof item === "object" ? item : { label: index + 1, value: item }; const width = Math.max(3, Math.round((numericValues[index] / max) * 100)); return `<div class="horizontal-bar"><span class="horizontal-bar__label">${escapeHTML(data.label)}</span><span class="horizontal-bar__track"><span class="horizontal-bar__fill" style="--bar-width:${width}%"></span></span><strong>${escapeHTML(firstDefined(data.displayValue, data.value, numericValues[index]))}</strong></div>`; }).join("")}</div>${block.alternative ? `<p class="chart-alternative">${escapeHTML(block.alternative)}</p>` : ""}</section>`;
}

function summaryItems(summary) {
  if (Array.isArray(summary)) return summary;
  if (summary && typeof summary === "object") return Object.entries(summary).map(([label, value]) => ({ label, value }));
  return usefulContractText(summary) ? [{ label: "Summary", value: summary }] : [];
}

function renderModal(block, preview = false) {
  const fields = asArray(block.fields);
  const summary = summaryItems(block.summary);
  const size = ["sm", "small", "lg", "large", "sheet"].includes(compactText(block.size).toLowerCase()) ? slug(block.size) : "md";
  return `<div class="modal-overlay${preview ? " modal-overlay--preview" : ""}"><section class="modal-dialog modal-dialog--${escapeAttribute(size)}" role="dialog" aria-modal="true" aria-labelledby="modal-${block._index}-title"><header class="modal-dialog__header"><div><h2 id="modal-${block._index}-title" class="card-title">${escapeHTML(firstDefined(block.title, "Dialog"))}</h2>${block.description ? `<p class="card-description">${escapeHTML(block.description)}</p>` : ""}</div><button class="modal-dialog__close" type="button" aria-label="Close">×</button></header>${fields.length ? `<div class="field-grid modal-dialog__fields">${fields.map(renderField).join("")}</div>` : ""}${summary.length ? `<dl class="definition-list modal-dialog__summary">${summary.map((item) => `<div class="definition-row"><dt>${escapeHTML(firstDefined(item.label, item.name))}</dt><dd>${renderCell(firstDefined(item.value, item.detail))}</dd></div>`).join("")}</dl>` : ""}<footer class="modal-dialog__footer">${renderActions(block.actions, "form-actions")}</footer></section></div>`;
}

function renderNotificationRows(items, compact = false) {
  return `<ul class="notification-list${compact ? " notification-list--compact" : ""}">${asArray(items).map((item) => { const unread = /unread/i.test(compactText(firstDefined(item.readState, item.state))) || item.unread === true; return `<li class="notification-row${unread ? " notification-row--unread" : ""}"><span class="notification-row__state" aria-label="${unread ? "Unread" : "Read"}"></span><span class="notification-row__copy"><strong>${escapeHTML(firstDefined(item.headline, item.title, item.label))}</strong>${item.organization ? `<span>${escapeHTML(item.organization)}</span>` : ""}${firstDefined(item.object, item.description) ? `<small>${escapeHTML(firstDefined(item.object, item.description))}</small>` : ""}</span>${item.time ? `<time>${escapeHTML(item.time)}</time>` : ""}</li>`; }).join("")}</ul>`;
}

function renderNotificationList(block) {
  return `<section class="card notification-card">${renderCardHeader({ ...block, actions: [] })}${renderNotificationRows(block.items)}${renderActions(block.actions, "card-actions")}</section>`;
}

function renderPopover(block) {
  return `<div class="popover-stage"><div class="popover-host-preview" aria-hidden="true"><div class="popover-host-kpis"><span>Inventory Value<strong>LKR 564,200.00</strong></span><span>Active SKUs<strong>12</strong></span><span>Low Stock<strong>4</strong></span><span>Open Purchase Orders<strong>0</strong></span><span>Awaiting Receipt<strong>0</strong></span></div><div class="popover-host-panel"><strong>Needs attention</strong><span>Low Stock 4 · Out of Stock 1</span></div></div><section class="notification-popover" role="dialog" aria-label="${escapeAttribute(firstDefined(block.title, "Notifications"))}"><header class="notification-popover__header"><h2>${escapeHTML(firstDefined(block.title, "Notifications"))}</h2>${block.count !== undefined ? renderBadge(block.count, "primary") : ""}</header>${renderNotificationRows(block.items, true)}<footer>${renderActions(block.actions, "card-actions")}</footer></section></div>`;
}

function normalizeStep(step, index, currentStep) {
  const data = typeof step === "object" ? step : { label: step };
  const explicit = compactText(firstDefined(data.state, data.status)).toLowerCase();
  const numericCurrent = Number(currentStep);
  const state = explicit || (Number.isFinite(numericCurrent) ? index + 1 < numericCurrent ? "complete" : index + 1 === numericCurrent ? "current" : "upcoming" : index === 0 ? "current" : "upcoming");
  return { ...data, label: compactText(firstDefined(data.label, data.title, data.name, `Step ${index + 1}`)), state };
}

function renderWizard(block) {
  const steps = asArray(block.steps).map((step, index) => normalizeStep(step, index, firstDefined(block.currentStep, block.current)));
  const fields = asArray(block.fields);
  const lineItems = asArray(block.lineItems);
  const summary = summaryItems(block.summary);
  return `<section class="wizard card"><ol class="wizard-steps">${steps.map((step, index) => `<li class="wizard-step wizard-step--${escapeAttribute(step.state)}" aria-current="${step.state === "current" ? "step" : "false"}"><span>${step.state === "complete" ? "✓" : index + 1}</span><strong>${escapeHTML(step.label)}</strong></li>`).join("")}</ol><div class="wizard-panel">${renderCardHeader({ ...block, actions: [] })}${fields.length ? `<div class="field-grid">${fields.map(renderField).join("")}</div>` : ""}${lineItems.length ? `<div class="wizard-lines">${lineItems.map((item) => `<article><strong>${escapeHTML(firstDefined(item.title, item.product, item.label))}</strong>${firstDefined(item.quantity, item.value, item.description) ? `<span>${escapeHTML(firstDefined(item.quantity, item.value, item.description))}</span>` : ""}</article>`).join("")}</div>` : ""}${summary.length ? `<dl class="definition-list">${summary.map((item) => `<div class="definition-row"><dt>${escapeHTML(firstDefined(item.label, item.name))}</dt><dd>${renderCell(firstDefined(item.value, item.detail))}</dd></div>`).join("")}</dl>` : ""}${renderActions(block.actions, "form-actions")}</div></section>`;
}

function renderStatusBar(block) {
  const steps = asArray(firstDefined(block.steps, block.items, block.statuses)).map((step, index) => normalizeStep(step, index, firstDefined(block.currentStep, block.current)));
  return `<section class="status-progress card">${renderCardHeader(block)}<ol class="status-progress__track">${steps.map((step) => `<li class="status-progress__step status-progress__step--${escapeAttribute(step.state)}"><span></span><strong>${escapeHTML(step.label)}</strong>${step.state === "error" ? "<small>Error</small>" : step.description ? `<small>${escapeHTML(step.description)}</small>` : ""}</li>`).join("")}</ol></section>`;
}

function renderFrameGrid(block) {
  const frames = asArray(block.frames);
  return `<section class="frame-board">${block.title ? `<header class="frame-board__header"><h2>${escapeHTML(block.title)}</h2>${block.description ? `<p>${escapeHTML(block.description)}</p>` : ""}</header>` : ""}<div class="frame-grid">${frames.map((frame, index) => `<article class="state-frame state-frame--${escapeAttribute(slug(firstDefined(frame.state, "default")))}"><header><span class="frame-label">${escapeHTML(firstDefined(frame.label, `Frame ${index + 1}`))}</span>${frame.state ? renderBadge(frame.state, /error|denied|invalid/i.test(frame.state) ? "danger" : /success|complete|received/i.test(frame.state) ? "success" : "info") : ""}</header><h3>${escapeHTML(firstDefined(frame.title, frame.label))}</h3>${frame.body ? `<p>${escapeHTML(frame.body)}</p>` : ""}${asArray(frame.fields).length ? `<div class="frame-fields">${asArray(frame.fields).map((field) => `<div><span>${escapeHTML(firstDefined(field.label, field.name))}</span><strong>${escapeHTML(firstDefined(field.value, field.text))}</strong></div>`).join("")}</div>` : ""}${frame.kind === "skeleton" ? `<div class="frame-skeleton"><span></span><span></span><span></span></div>` : ""}${asArray(frame.specimen).length ? `<div class="frame-specimen">${asArray(frame.specimen).map((item) => `<span>${escapeHTML(item)}</span>`).join("")}</div>` : ""}${renderActions(frame.actions, "card-actions")}</article>`).join("")}</div></section>`;
}

function renderOrganizationHero(block) {
  return `<section class="organization-hero card"><span class="organization-hero__monogram">${escapeHTML(firstDefined(block.monogram, "GO"))}</span><div><h2>${escapeHTML(firstDefined(block.name, block.title))}</h2><p>${escapeHTML(firstDefined(block.handle, block.description))}</p>${block.help ? `<small>${escapeHTML(block.help)}</small>` : ""}</div>${block.badge ? renderBadge(block.badge, "primary") : ""}${renderActions(block.actions, "card-actions")}</section>`;
}

function renderCollapsedFilter(block) {
  const filters = asArray(block.filters);
  return `<section class="collapsed-filter card"><div><span class="eyebrow">${escapeHTML(firstDefined(block.eyebrow, "Filters"))}</span><h2>${escapeHTML(firstDefined(block.title, "Filter products"))}</h2><p>${escapeHTML(filters.join(" · "))}</p></div><button class="button button--secondary" type="button" aria-expanded="false">${escapeHTML(firstDefined(block.toggleLabel, `Show filters (${filters.length})`))}</button>${renderActions(block.actions, "card-actions")}</section>`;
}

function renderProductCardList(block) {
  return `<section class="product-card-list">${renderCardHeader({ ...block, actions: [] })}${asArray(block.items).map((item) => `<article class="product-mobile-card"><header><div><h3>${escapeHTML(item.name)}</h3><small>${escapeHTML(item.sku)}</small></div>${renderBadge(item.status, item.status === "In Stock" ? "success" : "warning")}</header><dl>${asArray(item.details).map((detail) => `<div><dt>${escapeHTML(detail.label)}</dt><dd>${escapeHTML(detail.value)}</dd></div>`).join("")}</dl>${renderActions(item.actions, "card-actions")}</article>`).join("")}${renderActions(block.actions, "card-actions")}</section>`;
}

function renderLoadingBoard(block) {
  const states = asArray(firstDefined(block.sections, block.items, block.states));
  return `<section class="component-gallery loading-board">${renderCardHeader(block)}<div class="component-gallery__grid">${states.map((state, index) => { const data = typeof state === "object" ? state : { title: state }; const variant = compactText(firstDefined(data.variant, data.state, data.type), "loading").toLowerCase(); if (/empty/.test(variant)) return renderEmpty(data); if (/error/.test(variant)) return renderEmpty(data, true); return `<article class="card skeleton-preview"><h3>${escapeHTML(firstDefined(data.title, `Loading ${index + 1}`))}</h3><span></span><span></span><span class="short"></span></article>`; }).join("")}</div></section>`;
}

function renderGallerySection(section, index) {
  const variant = compactText(firstDefined(section.variant, section.type, section.kind), "default").toLowerCase();
  if (/organization|workspace/.test(variant)) return `<article class="gallery-cell">${renderOrganizationHero(section)}</article>`;
  if (/collapsed-sidebar/.test(variant)) return `<article class="gallery-cell collapsed-sidebar-preview"><div class="collapsed-rail">${asArray(section.items).map((item) => `<span title="${escapeAttribute(item)}">${escapeHTML(String(item).slice(0, 1))}<em>${escapeHTML(item)}</em></span>`).join("")}</div></article>`;
  if (/drawer/.test(variant)) return `<article class="gallery-cell drawer-preview"><header>${brandLockup()}<button aria-label="Close navigation">×</button></header><div class="organization-hero__monogram">GO</div><strong>Grand Ocean Hotel</strong>${asArray(section.items).map((item) => `<span class="nav-item">${escapeHTML(item)}</span>`).join("")}</article>`;
  if (/tabs/.test(variant)) return `<article class="gallery-cell tabs-preview">${asArray(section.items).map((item) => `<span class="tab${item.state === "active" ? " tab--active" : ""}${item.state === "disabled" ? " tab--disabled" : ""}">${escapeHTML(item.label)}${item.count !== undefined ? ` ${renderBadge(item.count)}` : ""}</span>`).join("")}</article>`;
  if (/placement/.test(variant)) return `<article class="gallery-cell placement-preview"><div class="placement-desktop">${asArray(section.items).map((item) => renderAlert(item)).join("")}</div><div class="placement-mobile">${asArray(section.items).slice(0, 2).map((item) => renderAlert(item)).join("")}</div></article>`;
  if (/^form|filter/.test(variant)) return `<article class="gallery-cell">${renderForm(section)}</article>`;
  if (/^table/.test(variant)) return `<article class="gallery-cell">${renderTable(section)}</article>`;
  if (/dialog|modal/.test(variant)) return renderModal({ ...section, _index: `gallery-${index}` }, true);
  if (/alert|toast/.test(variant)) return `<article class="gallery-cell">${renderAlert(section)}${renderActions(section.actions, "card-actions")}</article>`;
  if (/kpi|stat/.test(variant)) return `<article class="gallery-cell">${renderStats({ items: firstDefined(section.items, section.stats, [section]) })}${renderActions(section.actions, "card-actions")}</article>`;
  if (/horizontal.*chart/.test(variant)) return `<article class="gallery-cell">${renderHorizontalChart(section)}</article>`;
  if (/chart|donut/.test(variant)) return `<article class="gallery-cell">${/donut/.test(variant) ? renderDonut(section) : renderChart(section)}</article>`;
  if (/loading|empty|error/.test(variant)) return `<article class="gallery-cell">${renderLoadingBoard({ sections: [section] })}</article>`;
  if (/stepper|status/.test(variant)) return `<article class="gallery-cell">${renderStatusBar({ ...section, items: firstDefined(section.steps, section.items) })}</article>`;
  if (/timeline|activity/.test(variant)) return `<article class="gallery-cell">${renderList({ ...section, items: firstDefined(section.items, section.events) })}</article>`;
  if (/navigation|sidebar|header/.test(variant)) return `<article class="gallery-cell navigation-preview"><div class="navigation-preview__header">${brandLockup()}${renderBadge(firstDefined(section.role, "Role"))}</div><div class="navigation-preview__body">${asArray(firstDefined(section.items, section.navigation)).map((item, itemIndex) => `<span class="nav-item${itemIndex === 0 ? " nav-item--active" : ""}">${escapeHTML(firstDefined(item.label, item.title, item))}</span>`).join("")}</div></article>`;
  return `<article class="gallery-cell card"><h3>${escapeHTML(firstDefined(section.title, `Variant ${index + 1}`))}</h3>${section.content ? `<p>${escapeHTML(section.content)}</p>` : ""}${renderActions(section.actions, "card-actions")}</article>`;
}

function renderComponentGallery(block) {
  return `<section class="component-gallery">${renderCardHeader(block)}<div class="component-gallery__grid">${asArray(block.sections).map(renderGallerySection).join("")}</div></section>`;
}

function renderMobileComposition(block, kind) {
  if (kind === "mobile-auth") return `<section class="mobile-composition mobile-composition--auth auth-card">${renderCardHeader({ ...block, actions: [] })}${renderForm({ ...block, title: "", description: "" })}</section>`;
  if (kind === "mobile-receiving") return `<section class="mobile-composition mobile-composition--receiving">${renderWizard({ ...block, steps: firstDefined(block.steps, ["Select PO", "Review items", "Receive", "Complete"]) })}</section>`;
  if (kind === "mobile-list") return `<section class="mobile-composition mobile-composition--list">${renderList(block)}</section>`;
  return `<section class="mobile-composition mobile-composition--detail">${renderCardHeader({ ...block, actions: [] })}${renderTabs(asArray(block.tabs))}${renderDetails({ title: "Details", items: firstDefined(block.items, block.details), actions: [] })}${renderActions(block.actions, "card-actions")}</section>`;
}

function renderEmpty(block, isError = false) {
  const title = compactText(firstDefined(block.title, block.heading));
  const body = compactText(firstDefined(block.body, block.description, block.message));
  return `<section class="${isError ? "error-state" : "empty-state"}"><div class="${isError ? "error-state__inner" : "empty-state__inner"}"><span class="${isError ? "error-state__icon" : "empty-state__icon"}" aria-hidden="true">${isError ? "!" : "□"}</span>${title ? `<h2>${escapeHTML(title)}</h2>` : ""}${body ? `<p>${escapeHTML(body)}</p>` : ""}${renderActions(firstDefined(block.actions, block.action), "card-actions")}</div></section>`;
}

function renderCard(block) {
  const body = compactText(firstDefined(block.body, block.content, block.text));
  return `<section class="card">${renderCardHeader(block)}${body ? `<p class="card-description">${escapeHTML(body)}</p>` : ""}${Array.isArray(block.items) ? renderList({ items: block.items }) : ""}</section>`;
}

function renderBlock(block) {
  const type = block.type;
  let content;
  if (["stats", "stat-grid", "kpis", "kpi-grid", "metrics"].includes(type)) content = renderStats(block);
  else if (["table", "data-table", "list-table"].includes(type)) content = renderTable(block);
  else if (["list", "checklist", "activity", "steps", "stepper"].includes(type)) content = renderList(block);
  else if (["alert", "notice", "banner", "callout"].includes(type)) content = renderAlert(block);
  else if (["form", "fields", "field-group"].includes(type)) content = renderForm(block);
  else if (["details", "summary", "definition-list", "key-value"].includes(type)) content = renderDetails(block);
  else if (type === "chart" && ["donut", "donut-chart"].includes(compactText(firstDefined(block.kind, block.variant)).toLowerCase())) content = renderDonut(block);
  else if (type === "chart" && /horizontal/.test(compactText(firstDefined(block.kind, block.variant)).toLowerCase())) content = renderHorizontalChart(block);
  else if (["chart", "bar-chart"].includes(type)) content = renderChart(block);
  else if (["donut", "donut-chart"].includes(type)) content = renderDonut(block);
  else if (["horizontal-chart", "horizontal-bar", "horizontal-bar-chart"].includes(type)) content = renderHorizontalChart(block);
  else if (["modal", "dialog", "confirmation-dialog"].includes(type)) content = renderModal(block);
  else if (["modal-preview", "dialog-preview"].includes(type)) content = renderModal(block, true);
  else if (["notificationlist", "notification-list", "notifications"].includes(type)) content = renderNotificationList(block);
  else if (["popover", "notification-popover"].includes(type)) content = renderPopover(block);
  else if (["wizard", "stepper-wizard", "receiving-wizard"].includes(type)) content = renderWizard(block);
  else if (["framegrid", "frame-grid", "state-board", "multi-frame"].includes(type)) content = renderFrameGrid(block);
  else if (["componentgallery", "component-gallery", "component-board"].includes(type)) content = renderComponentGallery(block);
  else if (["organizationhero", "organization-hero"].includes(type)) content = renderOrganizationHero(block);
  else if (["productcardlist", "product-card-list"].includes(type)) content = renderProductCardList(block);
  else if (["collapsedfilter", "collapsed-filter"].includes(type)) content = renderCollapsedFilter(block);
  else if (["status-bar", "po-status", "po-status-bar", "status-progress"].includes(type)) content = renderStatusBar(block);
  else if (["loading-board", "loading-states", "lifecycle-board"].includes(type)) content = renderLoadingBoard(block);
  else if (["mobile-auth", "mobile-list", "mobile-detail", "mobile-receiving"].includes(type)) content = renderMobileComposition(block, type);
  else if (["empty", "empty-state", "zero-state"].includes(type)) content = renderEmpty(block);
  else if (["error", "error-state", "denied", "not-found"].includes(type)) content = renderEmpty(block, true);
  else content = renderCard(block);
  const titleClass = slug(firstDefined(block.title, block.heading));
  return `<div class="block${blockSpan(block)}${titleClass ? ` block--${escapeAttribute(titleClass)}` : ""}" data-block-type="${escapeAttribute(type)}">${content}</div>`;
}

function renderApp(config) {
  const drawerClass = config.shell.mobileNavOpen ? " shell-sidebar--mobile-open" : "";
  return `<div class="app-shell" data-viewport="${escapeAttribute(config.viewport)}" data-visual-id="${escapeAttribute(config.id)}">
    ${renderShellHeader(config.shell, config.route)}
    ${config.shell.mobileNavOpen ? '<div class="mobile-drawer-backdrop" aria-hidden="true"></div>' : ""}
    <aside class="shell-sidebar${drawerClass}" aria-label="Primary navigation"${config.shell.mobileNavOpen ? ' aria-modal="true" role="dialog"' : ""}>
      <div class="mobile-drawer-header">${brandLockup()}<button class="mobile-drawer-close" type="button" aria-label="Close navigation">×</button></div>
      ${renderNavigation(config.shell.nav)}
    </aside>
    <main class="shell-main"><div class="page">${renderPageHeader(config.page, config.route)}<div class="content-grid">${config.blocks.map(renderBlock).join("")}</div></div></main>
  </div>`;
}

function renderSimple(config) {
  const isPublic = config.shell.kind === "public";
  const formBlock = config.blocks.find((block) => ["form", "fields", "field-group"].includes(block.type));
  const remaining = config.blocks.filter((block) => block !== formBlock);
  const inner = `<section class="auth-card">${renderPageHeader(config.page, config.route)}${formBlock ? renderForm({ ...formBlock, title: "", description: "" }) : ""}${remaining.map(renderBlock).join("")}</section>`;
  return `<div class="${isPublic ? "public-layout" : "auth-layout"}" data-viewport="${escapeAttribute(config.viewport)}" data-visual-id="${escapeAttribute(config.id)}"><header class="simple-header">${brandLockup()}<span class="simple-header__context">${config.route ? `<span class="route-chip">${escapeHTML(config.route)}</span>` : ""}${config.shell.role ? renderBadge(config.shell.role) : ""}</span></header><main class="simple-main">${inner}</main></div>`;
}

function renderBoard(config) {
  return `<div class="board-layout" data-viewport="${escapeAttribute(config.viewport)}" data-visual-id="${escapeAttribute(config.id)}"><header class="simple-header">${brandLockup()}${config.shell.role ? renderBadge(config.shell.role) : ""}</header><main class="board-main"><div class="page">${renderPageHeader(config.page, config.route)}<div class="content-grid">${config.blocks.map(renderBlock).join("")}</div></div></main></div>`;
}

function render(config) {
  if (config.shell.kind === "board") return renderBoard(config);
  if (["auth", "authentication", "public", "utility", "onboarding"].includes(config.shell.kind)) return renderSimple(config);
  return renderApp(config);
}

function renderFailure(error) {
  return `<main class="render-error"><section class="render-error__panel"><h1>Renderer configuration error</h1><p>${escapeHTML(error instanceof Error ? error.message : error)}</p></section></main>`;
}

async function boot() {
  const root = document.querySelector("#app");
  const params = new URLSearchParams(window.location.search);
  const manifestUrl = params.get("manifest") || "./render-manifest.json";
  const requestedId = params.get("id") || params.get("visual") || params.get("visualId") || "";
  const requestedViewport = params.get("viewport") || "";
  window.__STOCKMOK_RENDER_READY__ = false;
  window.__STOCKMOK_RENDER_ERROR__ = null;

  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load ${manifestUrl} (${response.status}).`);
    const manifest = await response.json();
    const entry = selectEntry(manifest, requestedId);
    const config = normalizeEntry(entry, requestedViewport);
    if (!config.id) throw new Error("The selected manifest entry has no visual or screen identifier.");
    document.title = `${config.id} · Stockmok`;
    document.documentElement.dataset.viewport = config.viewport;
    root.innerHTML = render(config);
    root.dataset.renderStatus = "ready";
    root.dataset.visualId = config.id;
    window.__STOCKMOK_RENDER_CONFIG__ = config;
  } catch (error) {
    root.innerHTML = renderFailure(error);
    root.dataset.renderStatus = "error";
    window.__STOCKMOK_RENDER_ERROR__ = error instanceof Error ? error.message : String(error);
    console.error("[Stockmok renderer]", error);
  } finally {
    window.__STOCKMOK_RENDER_READY__ = true;
    window.dispatchEvent(new CustomEvent("stockmok-render-ready", {
      detail: { status: root.dataset.renderStatus, version: RENDER_VERSION },
    }));
  }
}

boot();
