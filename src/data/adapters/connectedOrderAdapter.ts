import type { CommandResult } from '@stockmok/shared';
import { httpsCallable } from 'firebase/functions';

import { functions } from '@/data/firebase/client';

export async function executeConnectedDraftHeaderSave(
  orgId: string,
  purchaseOrderId: string,
  connectionId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'cpoDraftSave',
  );
  await callable({ orgId, payload: { purchaseOrderId, connectionId } });
}

export async function executeConnectedSubmit(
  orgId: string,
  purchaseOrderId: string,
  operationId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'cpoSubmit',
  );
  await callable({ orgId, operationId, payload: { purchaseOrderId } });
}

export async function executeConnectedResponse(
  orgId: string,
  purchaseOrderId: string,
  response: 'ACCEPT' | 'REJECT',
  operationId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'cpoRespond',
  );
  await callable({ orgId, operationId, payload: { purchaseOrderId, response } });
}

export async function executeConnectedShip(
  orgId: string,
  purchaseOrderId: string,
  operationId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'cpoShip',
  );
  await callable({ orgId, operationId, payload: { purchaseOrderId } });
}

export async function executeConnectedReceive(
  orgId: string,
  purchaseOrderId: string,
  warehouseId: string,
  lines: ReadonlyArray<{ readonly itemId: string; readonly quantityMilli: number }>,
  operationId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'cpoReceive',
  );
  await callable({
    orgId,
    operationId,
    payload: { purchaseOrderId, warehouseId, lines },
  });
}

export async function executeConnectedCancel(
  orgId: string,
  purchaseOrderId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'cpoCancel',
  );
  await callable({ orgId, payload: { purchaseOrderId } });
}
