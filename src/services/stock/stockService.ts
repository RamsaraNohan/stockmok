import {
  executeStockRecordOpeningBalanceCommand as adapterRecordOpeningBalance,
  executeStockAdjustCommand as adapterAdjust,
  executeStockTransferCommand as adapterTransfer,
} from '@/data/adapters/stockAdapter';

import type {
  StockRecordOpeningBalancePayload,
  StockAdjustPayload,
  StockTransferPayload,
} from '@/data/adapters/stockAdapter';

export type { StockRecordOpeningBalancePayload, StockAdjustPayload, StockTransferPayload };

export async function executeStockRecordOpeningBalanceCommand(
  orgId: string,
  payload: StockRecordOpeningBalancePayload,
): Promise<void> {
  return adapterRecordOpeningBalance(orgId, payload);
}

export async function executeStockAdjustCommand(
  orgId: string,
  payload: StockAdjustPayload,
): Promise<void> {
  return adapterAdjust(orgId, payload);
}

export async function executeStockTransferCommand(
  orgId: string,
  payload: StockTransferPayload,
): Promise<void> {
  return adapterTransfer(orgId, payload);
}
