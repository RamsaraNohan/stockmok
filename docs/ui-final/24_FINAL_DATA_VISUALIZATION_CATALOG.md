# Stockmok Final Data Visualization Catalog

**Status:** `CHART_CATALOG_FREEZE = PASS`  
**Authority:** files 07, 10, and 17 in `Stockmok_Final_Control_Pack_v4`  
**Hard ceiling:** exactly three chart definitions; every other analytic visual is removed.  
**Dependency:** charts are optional, lazy-loaded enhancements and never replace the accurate table or text alternative.

## 1. Final chart register

| Chart ID | Name | Surface | Data and query contract | Encoding | Adjacent non-chart alternative | Responsive and states |
|---|---|---|---|---|---|---|
| `CHART-001` | Stock-status donut | Populated Dashboard | Organization-scoped active `ProductStockSummary` count grouped by derived `stockStatus`: `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`. Total equals Active SKUs for the same query boundary. | Three labelled arcs using stock-status tokens; direct legend values and total SKU count in centre. Tooltip repeats label + count + percentage; no 3D, gradients, animation, or unlabeled slices. | Adjacent semantic table: Status, SKU count, Percentage. Text summary template: “Of {total} active SKUs, {in} are in stock, {low} are low stock, and {out} are out of stock.” Each row links to the matching filtered Product list when permitted. | Desktop max height 280 px. At 390 px, table/text appears first and chart may stack below. Loading uses matching Skeleton; empty shows “Add products and opening stock to see stock status”; error keeps the table region and Retry. |
| `CHART-002` | Inventory by location bar | Dashboard operational panel | Organization-scoped non-archived warehouses joined to authorized inventory summary aggregates; one horizontal bar per warehouse using inventory value in the organization currency. Values must reconcile with Inventory Value KPI. | Sorted descending horizontal bars in `primary`; warehouse names remain visible; axis begins at zero; values use explicit currency and tabular numerals. Tooltip: warehouse, currency value, share of total. | Adjacent semantic table: Warehouse, Inventory value, Share of total. Text summary names the highest-value warehouse and total; if one warehouse exists, state that distribution is not comparative. | Maximum 8 visible warehouses; table carries the complete set. At narrow width, hide the chart before truncating labels. Loading/empty/error patterns match `CHART-001`; no horizontal core-flow scroll. |
| `CHART-003` | Purchase-order-status bar | Reports → Purchase Orders tab | Current organization’s report query grouped by displayed PO status after the same date, kind, and status filters as the table. Private and Connected records use the organization projection; no cross-tenant private reads. | Horizontal bars ordered by workflow meaning, not magnitude. Specific statuses map to semantic families: Draft→draft; Ordered/Submitted→pending; Accepted/Shipped/Partially Received→active; Received→complete; Rejected/Cancelled→cancelled. Every bar has a text label and count. | The authoritative PO report table remains present: PO number, Counterparty, Private/Connected, Status, Total, Created, Expected. A compact summary table adds Status and Count, followed by “Filters applied: …”. | On 390/768 px the report table/summary precedes the optional chart. Loading keeps filters usable; zero filtered results show “No purchase orders match these filters”; error offers Retry without clearing filters. |

## 2. KPI versus chart classification

These are numeric summaries, not charts. They use `COMP-009` KPI card and link to the exact filtered destination behind the number.

| KPI | Display contract | Not permitted |
|---|---|---|
| Inventory Value | Explicit organization currency; canonical demo endpoint `LKR 691,700.00`; reconciles with stock summaries | Sparkline, trend arrow without a defined comparison period, fabricated growth percentage |
| Active SKUs | Integer count of active products | Pie/donut duplicate of status distribution |
| Low Stock | Integer count from `stockStatus == LOW_STOCK` | Trend chart or forecast |
| Open POs | Integer count using the frozen open-status filter | Spend or order-volume chart |
| Awaiting Receipt | Integer count of receivable POs | Gauge or progress chart |

## 3. Removed visualization audit

The catalog is closed: if a chart is not `CHART-001`, `CHART-002`, or `CHART-003`, it is `REMOVED` and must not receive a prompt, visual ID, UI region, implementation task, or dependency. The following plausible/proposed analytics are explicitly removed to prevent accidental re-entry:

| Removed ID | Visualization | Disposition and replacement |
|---|---|---|
| `CHART-REMOVED-001` | Inventory value trend | `REMOVED`; current Inventory Value is a KPI. No historical series is authorized. |
| `CHART-REMOVED-002` | SKU-count trend | `REMOVED`; Active SKUs is a KPI. |
| `CHART-REMOVED-003` | Low-stock trend/forecast | `REMOVED`; Low Stock KPI + filtered Product list. Forecasting is Release D and prohibited. |
| `CHART-REMOVED-004` | Purchase spend over time | `REMOVED`; PO report table provides exact values. |
| `CHART-REMOVED-005` | Spend by supplier / top suppliers | `REMOVED`; not one of the three frozen charts and risks unsupported ranking claims. |
| `CHART-REMOVED-006` | Stock movement trend | `REMOVED`; Movement History table is authoritative. |
| `CHART-REMOVED-007` | Inventory by category | `REMOVED`; use Product list category filter. |
| `CHART-REMOVED-008` | Private versus Connected PO split | `REMOVED`; use report Kind filter and table. |
| `CHART-REMOVED-009` | Receiving completion gauge | `REMOVED`; ordered, received, receive-now, and outstanding values remain explicit per line. |
| `CHART-REMOVED-010` | Mapping/conversion diagram | `REMOVED` as data visualization; use the Stepper, paired Cards, equation, and worked preview. |
| `CHART-REMOVED-011` | Sales, storefront, revenue, margin, forecast, AI or marketplace analytics | `REMOVED`; outside Release A/B-Lite. |
| `CHART-REMOVED-012` | Decorative dashboard sparkline or mini-chart | `REMOVED`; KPI context line may contain sourced text only. |

## 4. Shared chart specification

- **Accuracy:** chart, summary table, text summary, KPI, and filtered destination use the same query boundary and timestamp. Rounding occurs only for displayed percentages; counts and currency remain exact.
- **Accessibility:** each figure has a visible title and summary, a programmatic label, keyboard-neutral tooltip content duplicated in the adjacent table, and no information encoded only by hue. The chart SVG/canvas is supplemental and may be hidden from assistive technology when the adjacent table fully names the same data.
- **Colour:** use the semantic pairs from file 21. The stock donut also uses icon/label legend markers. PO bars include exact status labels. Inventory bars use one hue and direct values.
- **Interaction:** no drill-down exists unless the adjacent text/table row is a normal link to an already-authorized filtered route. No brushing, zooming, animation, export image, legend toggling, or cross-filtering.
- **Tables first:** report/export behavior reads from the table/query, never chart pixels or rounded chart data. CSV export follows report permissions at tab/action level.
- **Failure isolation:** a chart bundle or query failure cannot block its page. Render the accurate table/text alternative and a compact chart ErrorState.
- **Performance:** lazy-load all three chart modules. Do not load Recharts for pages without an approved chart.
- **Honesty:** no invented history, comparison period, percent change, customer benchmark, or “live” claim.

## 5. Chart QA and gate

| Check | Acceptance |
|---|---|
| Chart definition count | Exactly `3` |
| Charts on approved surfaces | `CHART-001..003` only |
| Table/text alternative | Required and visible for all `3/3` |
| Query reconciliation | Counts/totals match the adjacent table and relevant KPI |
| Responsive safety | Alternative remains usable at 390 px; no core horizontal scroll |
| Scope leakage | `0` Release B-PLUS/C/D charts |
| `CHART_CATALOG_FREEZE` | `PASS` |

