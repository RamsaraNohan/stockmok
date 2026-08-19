import { httpsCallable } from 'firebase/functions';
import { Timestamp } from 'firebase/firestore';
import { functions } from '../firebase/client';
import type { CommandResult, AdjustmentReason } from '@stockmok/shared';

export interface StockRecordOpeningBalancePayload {
  readonly productId: string;
  readonly warehouseId: string;
  readonly quantityMilli: number;
  readonly effectiveAtMillis: number;
}

export async function executeStockRecordOpeningBalanceCommand(
  orgId: string,
  payload: StockRecordOpeningBalancePayload,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'stockRecordOpeningBalance',
  );
  const payloadEnvelope = {
    orgId,
    operationId: crypto.randomUUID(),
    payload: {
      productId: payload.productId,
      warehouseId: payload.warehouseId,
      quantityMilli: payload.quantityMilli,
      effectiveAt: Timestamp.fromMillis(payload.effectiveAtMillis),
    },
  };
  await callable(payloadEnvelope);
}

export interface StockAdjustPayload {
  readonly productId: string;
  readonly warehouseId: string;
  readonly signedQuantityMilli: number;
  readonly adjustmentReason: AdjustmentReason;
  readonly note?: string;
}

export async function executeStockAdjustCommand(
  orgId: string,
  payload: StockAdjustPayload,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'stockAdjust',
  );
  const payloadEnvelope = {
    orgId,
    operationId: crypto.randomUUID(),
    payload,
  };
  await callable(payloadEnvelope);
}

export interface StockTransferPayload {
  readonly productId: string;
  readonly sourceWarehouseId: string;
  readonly destinationWarehouseId: string;
  readonly quantityMilli: number;
}

export async function executeStockTransferCommand(
  orgId: string,
  payload: StockTransferPayload,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'stockTransfer',
  );
  const payloadEnvelope = {
    orgId,
    operationId: crypto.randomUUID(),
    payload,
  };
  await callable(payloadEnvelope);
}
