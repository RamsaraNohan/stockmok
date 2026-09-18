import type { CommandResult } from '@stockmok/shared';
import { httpsCallable } from 'firebase/functions';

import { functions } from '@/data/firebase/client';

export async function executeConnectionRequestCommand(
  orgId: string,
  supplierHandle: string,
  operationId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'connectionRequest',
  );

  await callable({
    orgId,
    operationId,
    payload: { supplierHandle },
  });
}

export async function executeConnectionRespondCommand(
  orgId: string,
  connectionId: string,
  response: 'ACCEPT' | 'REJECT',
  operationId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'connectionRespond',
  );
  await callable({ orgId, operationId, payload: { connectionId, response } });
}

export async function executeConnectionDisableCommand(
  orgId: string,
  connectionId: string,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'connectionDisable',
  );
  await callable({ orgId, payload: { connectionId } });
}
