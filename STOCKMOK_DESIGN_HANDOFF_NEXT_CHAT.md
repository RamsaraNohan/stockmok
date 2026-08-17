# Stockmok — implementation handoff

## 1. Frozen scope
Stockmok (stockmok.com) is a multi-tenant Inventory and Procurement Management System with connected supplier collaboration. Build Release A (standalone inventory + procurement) and Release B-Lite (connected-business collaboration) only. Release C/D excluded. Legacy name StockFlow appears in no UI.

## 2. Design authority
GATE_14 = APPROVED by the owner, 15 Aug 2026. STOCKMOK_DESIGN_FREEZE_v1.0 = APPROVED. The frozen design files are the specification. Design is CLOSED: implementation must not redesign, re-lay-out, re-copy or "improve" any screen. A perceived defect is raised as a change request against the checkpoint and ledger, never fixed by redesign.

## 3. System
COMPONENT_COUNT = 25/25. No 26th component may be introduced. Tokens, five layout families, state grammar (12 states, 62 live cells, 10 declared impossible), and the WCAG AA accessibility contract are frozen: visible labels above fields, 4 px focus ring, unbroken heading order, status by icon + word + reading, table outranks chart, one trapped dialog, 44 px touch targets, 12 px minimum customer-facing text.

## 4. Canonical data anchors
Grand Ocean Hotel @grand-ocean · Hospitality · Sri Lanka · LKR · Asia/Colombo · 13 Aug 2026 09:12. Inventory value LKR 691,700.00 · 12 active products · 8 in stock / 3 low / 1 out · Cold Room LKR 398,900.00 + Main Store LKR 292,800.00. Chicken Breast MEAT-001 120.000 KG, min 20.000, LKR 1,250.00/KG. Open POs 0, committed LKR 0.00. CPO-2026-003 Fresh Foods Ltd: ONE shipment of 10 PACK, received 8 then 2. Mapping CKN-B5 PACK ↔ MEAT-001 KG at 1 PACK = 5 KG.

## 5. Responsive shell contract
Frozen Gate 4 shell: 64 px header + 256 px role-filtered sidebar (LINK-001..016), drawer at 768 and 390. Nine element classes have one declared behaviour at 390/768/1280/1920. 1280 is the reference; 1920 adds margin only, content capped 1440 px centred. Desktop table rows 36 px; forms/dialogs/mobile 40–44 px. No bottom-tab navigation.

## 6. Privacy and connected constraints
Exactly nine items cross between workspaces; a tenth is a defect. Partner catalog projects four fields only, never inventory or balances. Discovery is exact-handle lookup only. Buyer submits/cancels/receives; supplier accepts/rejects/ships; neither sets the other's state or stock. Mappings are never disclosed to the supplier. Notifications are never emailed.

## 7. Production constraints
No print/PDF on an order; the only export is bounded CSV on the two report surfaces. No reconnect, no restore-mapping, no mobile report export, no multi or partial supplier shipment, no generic delete (archive/disable/cancel only). No global search, command palette, dark theme, gradients, glass, decorative motion, AI, forecasting, POS, Sales, Accounting, Marketplace or storefront. No raw routes, engineering copy or error codes in UI.

## 8. Minimum files to read
STOCKMOK_DESIGN_CHECKPOINT.md · Stockmok Design System.dc.html · the Gate 5–12 screen families for the area being built · Stockmok Gate 14 Owner Approval.dc.html.

## 9. NEXT_ACTION
Begin frontend implementation of the frozen Release A + B-Lite screens exactly as designed, starting from the Gate 4 shell and design system. No design changes.

DESIGN_PHASE = CLOSED
GATE_13 = PASS
GATE_14 = APPROVED
STOCKMOK_DESIGN_FREEZE_v1.0 = APPROVED
READY_FOR_FRONTEND_IMPLEMENTATION = YES
PRODUCTION_CODE_CHANGED = NO
