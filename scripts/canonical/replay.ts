import type { DocumentReference, Firestore } from 'firebase-admin/firestore';
import { paths } from '../../packages/shared/src/paths.js';
import {
  cpoDraftSave,
  cpoReceive,
  cpoRespond,
  cpoShip,
  cpoSubmit,
} from '../../functions/src/commands/connected-po.js';
import { poOrder, poReceive } from '../../functions/src/commands/purchase-order.js';
import { stockAdjust } from '../../functions/src/commands/stock.js';
import { CLOCK } from '../bootstrap/fixtures.js';
import { runCommand, seedOperationId } from './commands.js';
import type { SeedContext } from './context.js';
import type { SeedResult } from './seed.js';

/**
 * The canonical demonstration chain — DB-08 §4, on MEAT-001, in order.
 *
 * ```text
 * t₀  opening                                   18 KG   LOW
 * 1   adjustment  RECOUNT_CORRECTION      +2    20 KG   IN_STOCK   (low KPI 4 → 3)
 * 2   private PO, 50 KG ordered, receipt +40    60 KG
 * 3   second receipt → RECEIVED          +10    70 KG
 * 4   connected PO, 10 PACK = 50 KG, SHIP  0    70 KG   supplier 200 → 190 PACK
 * 5   buyer receives 8 PACK              +40   110 KG
 * 6   buyer receives 2 PACK → RECEIVED   +10   120 KG
 * ```
 *
 * *"These numbers are authoritative; any document, screenshot or report figure
 * that disagrees is wrong."* Step 4 changes **only** the supplier's ledger
 * (`INV-10`); steps 5–6 change **only** the buyer's (`INV-11`).
 */

export const PRIVATE_PO_ID = 'po-2026-001';
export const CONNECTED_PO_ID = 'cpo-2026-003';
const PRIVATE_ITEM_ID = 'item-meat-001';
const CONNECTED_ITEM_ID = 'item-meat-001';

/** LKR 1 250.00 per KG from Green Farm, and LKR 6 000.00 per PACK from Fresh Foods. */
const PRIVATE_UNIT_PRICE_MINOR = 125_000;
const CONNECTED_UNIT_PRICE_MINOR = 600_000;

const SLOT = {
  adjustment: 800,
  privateOrder: 801,
  privateReceiptOne: 802,
  privateReceiptTwo: 803,
  connectedSubmit: 804,
  connectedRespond: 805,
  connectedShip: 806,
  connectedReceiptOne: 807,
  connectedReceiptTwo: 808,
} as const;

async function createIfAbsent(
  ref: DocumentReference,
  data: Record<string, unknown>,
): Promise<void> {
  if ((await ref.get()).exists) return;
  await ref.set(data);
}

/**
 * A purchase-order draft and its lines are a **client** write surface while the
 * order is PRIVATE and DRAFT (DB-02 §5.2, `isEditableDraft()`), and the frozen
 * catalog contains no command that creates a line. The seed therefore writes
 * them exactly as the browser would, and every transition out of DRAFT is a
 * command.
 */
async function ensurePrivateDraft(
  db: Firestore,
  seed: SeedResult,
  meatProductId: string,
): Promise<void> {
  await createIfAbsent(db.doc(paths.purchaseOrder(seed.buyerOrgId, PRIVATE_PO_ID)), {
    purchaseOrderId: PRIVATE_PO_ID,
    viewRole: 'BUYER',
    supplierKind: 'PRIVATE',
    counterpartyName: 'Green Farm Poultry',
    privateSupplierId: seed.privatePartnerId,
    status: 'DRAFT',
    currency: 'LKR',
    totalMinor: 0,
    isProjection: false,
    createdBy: seed.uids.buyerProcurement,
    createdAt: CLOCK.privateFirst,
  });
  await createIfAbsent(
    db.doc(paths.purchaseOrderItem(seed.buyerOrgId, PRIVATE_PO_ID, PRIVATE_ITEM_ID)),
    {
      itemId: PRIVATE_ITEM_ID,
      buyerProductId: meatProductId,
      buyerProductNameSnapshot: 'Chicken Breast',
      buyerSkuSnapshot: 'MEAT-001',
      buyerBaseUnitSnapshot: 'KG',
      orderedBuyerBaseMilli: 50_000,
      receivedBuyerBaseMilli: 0,
      unitPriceMinor: PRIVATE_UNIT_PRICE_MINOR,
      lineTotalMinor: 0,
      currency: 'LKR',
    },
  );
}

async function ensureConnectedDraft(
  db: Firestore,
  seed: SeedResult,
  meatProductId: string,
): Promise<void> {
  await createIfAbsent(db.doc(paths.purchaseOrder(seed.buyerOrgId, CONNECTED_PO_ID)), {
    purchaseOrderId: CONNECTED_PO_ID,
    viewRole: 'BUYER',
    supplierKind: 'CONNECTED',
    counterpartyName: 'Fresh Foods Ltd',
    counterpartyOrgId: seed.supplierOrgId,
    counterpartyHandle: 'freshfoods',
    connectionId: seed.connectionId,
    status: 'DRAFT',
    currency: 'LKR',
    totalMinor: 0,
    isProjection: false,
    createdBy: seed.uids.buyerProcurement,
    createdAt: CLOCK.connectedShip,
  });
  await createIfAbsent(
    db.doc(paths.purchaseOrderItem(seed.buyerOrgId, CONNECTED_PO_ID, CONNECTED_ITEM_ID)),
    {
      itemId: CONNECTED_ITEM_ID,
      buyerProductId: meatProductId,
      buyerProductNameSnapshot: 'Chicken Breast',
      buyerSkuSnapshot: 'MEAT-001',
      buyerBaseUnitSnapshot: 'KG',
      orderedBuyerBaseMilli: 0,
      receivedBuyerBaseMilli: 0,
      unitPriceMinor: CONNECTED_UNIT_PRICE_MINOR,
      lineTotalMinor: 0,
      currency: 'LKR',
      mappingId: seed.mappingId,
      supplierCatalogItemId: seed.catalogItemIds.get('CKN-B5'),
      orderedSupplierMilli: 10_000,
      receivedSupplierMilli: 0,
    },
  );
}

export async function replayCanonicalChain(context: SeedContext, seed: SeedResult): Promise<void> {
  const { db } = context;
  const meatProductId = seed.productIds.get('MEAT-001');
  if (!meatProductId) throw new Error('MEAT-001 was not seeded');
  const coldRoomId = seed.buyerWarehouses.cold;

  // ── step 1 · the recount correction ──────────────────────────────────────
  await runCommand(
    stockAdjust,
    {
      uid: seed.uids.buyerInventory,
      orgId: seed.buyerOrgId,
      operationId: seedOperationId(SLOT.adjustment),
      payload: {
        productId: meatProductId,
        warehouseId: coldRoomId,
        signedQuantityMilli: 2000,
        adjustmentReason: 'RECOUNT_CORRECTION',
      },
    },
    db,
  );

  // ── steps 2–3 · the private order from Green Farm ────────────────────────
  await ensurePrivateDraft(db, seed, meatProductId);
  await runCommand(
    poOrder,
    {
      uid: seed.uids.buyerProcurement,
      orgId: seed.buyerOrgId,
      operationId: seedOperationId(SLOT.privateOrder),
      payload: { purchaseOrderId: PRIVATE_PO_ID },
    },
    db,
  );
  for (const [slot, quantityMilli] of [
    [SLOT.privateReceiptOne, 40_000],
    [SLOT.privateReceiptTwo, 10_000],
  ] as const) {
    await runCommand(
      poReceive,
      {
        uid: seed.uids.buyerStorekeeper,
        orgId: seed.buyerOrgId,
        operationId: seedOperationId(slot),
        payload: {
          purchaseOrderId: PRIVATE_PO_ID,
          warehouseId: coldRoomId,
          lines: [{ itemId: PRIVATE_ITEM_ID, quantityMilli }],
        },
      },
      db,
    );
  }

  // ── steps 4–6 · the connected order from Fresh Foods ─────────────────────
  await ensureConnectedDraft(db, seed, meatProductId);
  // `cpo.draftSave` carries **no** `operationId` (DB-06 §0 — a receipt per save
  // would grow without bound), so it has no receipt to short-circuit a rerun.
  // Its guard is the state itself: a draft is editable, and an order that has
  // since been submitted, shipped or received is not. Calling it anyway on a
  // second pass would be asking a command to undo a transition, which the
  // connected state machine correctly refuses.
  const connectedDraft = await db.doc(paths.purchaseOrder(seed.buyerOrgId, CONNECTED_PO_ID)).get();
  if (connectedDraft.get('status') === 'DRAFT') {
    await runCommand(
      cpoDraftSave,
      {
        uid: seed.uids.buyerProcurement,
        orgId: seed.buyerOrgId,
        payload: { purchaseOrderId: CONNECTED_PO_ID, connectionId: seed.connectionId },
      },
      db,
    );
  }
  await runCommand(
    cpoSubmit,
    {
      uid: seed.uids.buyerProcurement,
      orgId: seed.buyerOrgId,
      operationId: seedOperationId(SLOT.connectedSubmit),
      payload: { purchaseOrderId: CONNECTED_PO_ID },
    },
    db,
  );
  await runCommand(
    cpoRespond,
    {
      uid: seed.uids.supplierOwner,
      orgId: seed.supplierOrgId,
      operationId: seedOperationId(SLOT.connectedRespond),
      payload: { purchaseOrderId: CONNECTED_PO_ID, response: 'ACCEPT' },
    },
    db,
  );
  // The supplier's ledger, and only the supplier's: 200 → 190 PACK.
  await runCommand(
    cpoShip,
    {
      uid: seed.uids.supplierOwner,
      orgId: seed.supplierOrgId,
      operationId: seedOperationId(SLOT.connectedShip),
      payload: { purchaseOrderId: CONNECTED_PO_ID },
    },
    db,
  );
  // The buyer's ledger, and only the buyer's: 8 PACK then 2 PACK, converted at
  // 1 PACK = 5 KG, landing exactly on the 50 KG ordered.
  for (const [slot, quantityMilli] of [
    [SLOT.connectedReceiptOne, 8000],
    [SLOT.connectedReceiptTwo, 2000],
  ] as const) {
    await runCommand(
      cpoReceive,
      {
        uid: seed.uids.buyerStorekeeper,
        orgId: seed.buyerOrgId,
        operationId: seedOperationId(slot),
        payload: {
          purchaseOrderId: CONNECTED_PO_ID,
          warehouseId: coldRoomId,
          lines: [{ itemId: CONNECTED_ITEM_ID, quantityMilli }],
        },
      },
      db,
    );
  }
}
