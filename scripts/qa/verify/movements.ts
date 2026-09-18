import type { DocumentData, Timestamp } from 'firebase-admin/firestore';

import type { QaSnapshot } from './integrity.js';

/**
 * Movement ledger reconciliation.
 *
 * The ledger is the source of truth; the balance is a read model over it. This
 * verifier re-derives the balance from the movements alone and compares, so a
 * fixture that wrote a convenient balance without the history behind it fails.
 */

function numberField(data: DocumentData, key: string): number | undefined {
  const value: unknown = data[key];
  return typeof value === 'number' ? value : undefined;
}

function stringField(data: DocumentData, key: string): string | undefined {
  const value: unknown = data[key];
  return typeof value === 'string' ? value : undefined;
}

function millisField(data: DocumentData, key: string): number {
  const value: unknown = data[key];
  if (value !== null && typeof value === 'object' && 'toMillis' in value) {
    return (value as Timestamp).toMillis();
  }
  return 0;
}

interface MovementRow {
  readonly path: string;
  readonly data: DocumentData;
  readonly effectiveAtMillis: number;
  readonly movementId: string;
}

const ADJUSTMENT_TYPES: ReadonlySet<string> = new Set(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT']);

export interface MovementReport {
  readonly ledgerFailures: readonly string[];
  readonly transferFailures: readonly string[];
  readonly movementTypesSeen: readonly string[];
}

export function verifyMovements(snapshot: QaSnapshot): MovementReport {
  const ledgerFailures: string[] = [];
  const transferFailures: string[] = [];
  const typesSeen = new Set<string>();

  // (org, product, warehouse) -> movements
  const ledgers = new Map<string, MovementRow[]>();
  // transferId -> movements
  const transfers = new Map<string, MovementRow[]>();

  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'stockMovements' || parts.length !== 4)
      continue;
    const org = parts[1];
    const productId = stringField(data, 'productId');
    const warehouseId = stringField(data, 'warehouseId');
    const movementId = stringField(data, 'movementId') ?? parts[3] ?? path;
    const movementType = stringField(data, 'movementType');
    if (org === undefined || productId === undefined || warehouseId === undefined) {
      ledgerFailures.push(`MOVEMENT_LEDGER ${path} is missing its balance key`);
      continue;
    }
    if (movementType !== undefined) typesSeen.add(movementType);

    const row: MovementRow = {
      path,
      data,
      effectiveAtMillis: millisField(data, 'effectiveAt'),
      movementId,
    };
    const key = `${org}|${productId}|${warehouseId}`;
    const bucket = ledgers.get(key);
    if (bucket === undefined) ledgers.set(key, [row]);
    else bucket.push(row);

    const transferId = stringField(data, 'transferId');
    if (transferId !== undefined) {
      // Scoped by organization. A transfer id is only unique *within* a tenant,
      // and product ids repeat across organizations by design, so two tenants
      // legitimately produce the same id. Grouping globally would report a
      // four-legged transfer - which is exactly the missing-tenant-filter bug
      // the isolation traps exist to surface.
      const pairKey = `${org}|${transferId}`;
      const pair = transfers.get(pairKey);
      if (pair === undefined) transfers.set(pairKey, [row]);
      else pair.push(row);
    }

    // Shape rules the schema states, re-checked as data rather than as a parse.
    const signed = numberField(data, 'signedQuantityMilli');
    const reason = stringField(data, 'adjustmentReason');
    if (movementType !== undefined && movementType !== 'OPENING_BALANCE' && signed === 0) {
      ledgerFailures.push(
        `MOVEMENT_LEDGER ${path} records a zero quantity outside an opening balance`,
      );
    }
    if (movementType !== undefined) {
      const isAdjustment = ADJUSTMENT_TYPES.has(movementType);
      if (isAdjustment !== (reason !== undefined)) {
        ledgerFailures.push(
          `MOVEMENT_LEDGER ${path} adjustmentReason does not match ${movementType}`,
        );
      }
    }
  }

  for (const [key, rows] of ledgers) {
    const [org, productId, warehouseId] = key.split('|');
    if (org === undefined || productId === undefined || warehouseId === undefined) continue;

    const sorted = [...rows].sort((left, right) =>
      left.effectiveAtMillis === right.effectiveAtMillis
        ? left.movementId.localeCompare(right.movementId)
        : left.effectiveAtMillis - right.effectiveAtMillis,
    );

    const openings = sorted.filter(
      (row) => stringField(row.data, 'movementType') === 'OPENING_BALANCE',
    );
    if (openings.length !== 1) {
      ledgerFailures.push(
        `MOVEMENT_LEDGER ${key} has ${String(openings.length)} opening balances, expected exactly 1`,
      );
    } else if (sorted[0] !== openings[0]) {
      ledgerFailures.push(`MOVEMENT_LEDGER ${key} does not start with its opening balance`);
    }

    let running = 0;
    for (const row of sorted) {
      const signed = numberField(row.data, 'signedQuantityMilli');
      const balanceAfter = numberField(row.data, 'balanceAfterMilli');
      if (signed === undefined || balanceAfter === undefined) {
        ledgerFailures.push(`MOVEMENT_LEDGER ${row.path} is missing quantity or balanceAfter`);
        continue;
      }
      running += signed;
      if (running < 0) {
        ledgerFailures.push(
          `MOVEMENT_LEDGER ${row.path} drives the balance negative (${String(running)})`,
        );
      }
      if (running !== balanceAfter) {
        ledgerFailures.push(
          `MOVEMENT_LEDGER ${row.path} balanceAfterMilli=${String(balanceAfter)} but the running total is ${String(running)}`,
        );
      }
    }

    const balancePath = `organizations/${org}/stockBalances/${productId}__${warehouseId}`;
    const balance = snapshot.documents.get(balancePath);
    if (balance === undefined) {
      ledgerFailures.push(
        `MOVEMENT_LEDGER ${key} has movements but no stock balance at ${balancePath}`,
      );
      continue;
    }
    const onHand = numberField(balance, 'onHandMilli');
    if (onHand !== running) {
      ledgerFailures.push(
        `MOVEMENT_LEDGER ${balancePath} onHandMilli=${String(onHand)} but the ledger sums to ${String(running)}`,
      );
    }
  }

  // Every balance must be backed by a ledger, not only the other way round.
  for (const path of snapshot.documents.keys()) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'stockBalances' || parts.length !== 4)
      continue;
    const org = parts[1];
    const id = parts[3];
    if (org === undefined || id === undefined) continue;
    const separator = id.lastIndexOf('__');
    if (separator < 0) continue;
    const key = `${org}|${id.slice(0, separator)}|${id.slice(separator + 2)}`;
    if (!ledgers.has(key)) {
      ledgerFailures.push(`MOVEMENT_LEDGER ${path} has no movements behind it`);
    }
  }

  for (const [pairKey, rows] of transfers) {
    const transferId = pairKey;
    if (rows.length !== 2) {
      transferFailures.push(
        `TRANSFER_PAIR ${transferId} has ${String(rows.length)} legs, expected exactly 2`,
      );
      continue;
    }
    const [first, second] = rows;
    if (first === undefined || second === undefined) continue;
    const out = [first, second].find(
      (row) => stringField(row.data, 'movementType') === 'TRANSFER_OUT',
    );
    const incoming = [first, second].find(
      (row) => stringField(row.data, 'movementType') === 'TRANSFER_IN',
    );
    if (out === undefined || incoming === undefined) {
      transferFailures.push(
        `TRANSFER_PAIR ${transferId} is not one TRANSFER_OUT and one TRANSFER_IN`,
      );
      continue;
    }
    const outQuantity = numberField(out.data, 'signedQuantityMilli') ?? 0;
    const inQuantity = numberField(incoming.data, 'signedQuantityMilli') ?? 0;
    if (outQuantity >= 0 || inQuantity <= 0 || outQuantity + inQuantity !== 0) {
      transferFailures.push(
        `TRANSFER_PAIR ${transferId} quantities do not cancel (${String(outQuantity)}, ${String(inQuantity)})`,
      );
    }
    if (stringField(out.data, 'productId') !== stringField(incoming.data, 'productId')) {
      transferFailures.push(`TRANSFER_PAIR ${transferId} moves two different products`);
    }
    if (out.path.split('/')[1] !== incoming.path.split('/')[1]) {
      transferFailures.push(`TRANSFER_PAIR ${transferId} crosses an organization boundary`);
    }
    if (
      stringField(out.data, 'counterpartWarehouseId') !==
        stringField(incoming.data, 'warehouseId') ||
      stringField(incoming.data, 'counterpartWarehouseId') !== stringField(out.data, 'warehouseId')
    ) {
      transferFailures.push(`TRANSFER_PAIR ${transferId} legs do not point at each other`);
    }
  }

  return {
    ledgerFailures,
    transferFailures,
    movementTypesSeen: [...typesSeen].sort(),
  };
}
