import { describe, expect, it } from 'vitest';
import {
  aBalance,
  aCatalogItem,
  aConnectedPO,
  aConnection,
  aMapping,
  aMember,
  aMovement,
  anOrganization,
  aPrivatePO,
  aProduct,
  aTransfer,
  aWarehouse,
} from './factories/index.js';

describe('deterministic DB-08 factory families', () => {
  it('constructs every named family reproducibly and permits overrides', () => {
    expect(anOrganization()).toEqual(anOrganization());
    expect(aMember('OWNER').role).toBe('OWNER');
    expect(aProduct({ name: 'Override' }).name).toBe('Override');
    expect(aWarehouse().warehouseId).toBe('warehouse-1');
    expect(aBalance().onHandMilli).toBe(20_000);
    expect(aMovement().movementType).toBe('OPENING_BALANCE');
    expect(aTransfer().out.signedQuantityMilli).toBe(-5_000);
    expect(aPrivatePO().lines).toHaveLength(1);
    expect(aConnection().status).toBe('ACTIVE');
    expect(aCatalogItem().published).toBe(true);
    expect(aMapping().supplierToBuyerBaseFactorMilli).toBe(5_000);
    expect(aConnectedPO().supplierKind).toBe('CONNECTED');
  });
});
