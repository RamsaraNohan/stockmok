import { beforeEach, describe, expect, it, vi } from 'vitest';

const { callableMock, httpsCallableMock } = vi.hoisted(() => ({
  callableMock: vi.fn(),
  httpsCallableMock: vi.fn(),
}));

vi.mock('firebase/functions', () => ({ httpsCallable: httpsCallableMock }));
vi.mock('@/data/firebase/client', () => ({ functions: { marker: 'functions' } }));

import {
  executeConnectedCancel,
  executeConnectedDraftHeaderSave,
  executeConnectedReceive,
  executeConnectedResponse,
  executeConnectedShip,
  executeConnectedSubmit,
} from './connectedOrderAdapter';

describe('connected order callable boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    httpsCallableMock.mockReturnValue(callableMock);
    callableMock.mockResolvedValue({ data: { ok: true } });
  });

  it('keeps C-34 header-only and sends no connected line intent', async () => {
    await executeConnectedDraftHeaderSave('buyer-org', 'po-1', 'connection-1');

    expect(httpsCallableMock).toHaveBeenCalledWith({ marker: 'functions' }, 'cpoDraftSave');
    expect(callableMock).toHaveBeenCalledWith({
      orgId: 'buyer-org',
      payload: { purchaseOrderId: 'po-1', connectionId: 'connection-1' },
    });
    expect(JSON.stringify(callableMock.mock.calls[0]?.[0])).not.toContain('"lines"');
  });

  it('preserves the C-27 operation id and the non-idempotent C-31 envelope', async () => {
    await executeConnectedSubmit('buyer-org', 'po-1', 'operation-1');
    expect(callableMock).toHaveBeenNthCalledWith(1, {
      orgId: 'buyer-org',
      operationId: 'operation-1',
      payload: { purchaseOrderId: 'po-1' },
    });

    await executeConnectedCancel('buyer-org', 'po-1');
    expect(callableMock).toHaveBeenNthCalledWith(2, {
      orgId: 'buyer-org',
      payload: { purchaseOrderId: 'po-1' },
    });
  });

  it('sends exact idempotent C-28 and C-29 envelopes without extra fields', async () => {
    await executeConnectedResponse('supplier-org', 'po-1', 'REJECT', 'operation-28');
    expect(httpsCallableMock).toHaveBeenNthCalledWith(1, { marker: 'functions' }, 'cpoRespond');
    expect(callableMock).toHaveBeenNthCalledWith(1, {
      orgId: 'supplier-org',
      operationId: 'operation-28',
      payload: { purchaseOrderId: 'po-1', response: 'REJECT' },
    });

    await executeConnectedShip('supplier-org', 'po-1', 'operation-29');
    expect(httpsCallableMock).toHaveBeenNthCalledWith(2, { marker: 'functions' }, 'cpoShip');
    expect(callableMock).toHaveBeenNthCalledWith(2, {
      orgId: 'supplier-org',
      operationId: 'operation-29',
      payload: { purchaseOrderId: 'po-1' },
    });
  });

  it('sends C-30 quantities in the frozen supplier-unit line shape', async () => {
    await executeConnectedReceive(
      'buyer-org',
      'po-1',
      'warehouse-1',
      [{ itemId: 'line-1', quantityMilli: 8000 }],
      'operation-30',
    );

    expect(httpsCallableMock).toHaveBeenCalledWith({ marker: 'functions' }, 'cpoReceive');
    expect(callableMock).toHaveBeenCalledWith({
      orgId: 'buyer-org',
      operationId: 'operation-30',
      payload: {
        purchaseOrderId: 'po-1',
        warehouseId: 'warehouse-1',
        lines: [{ itemId: 'line-1', quantityMilli: 8000 }],
      },
    });
  });
});
