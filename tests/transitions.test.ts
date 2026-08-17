import { describe, expect, it } from 'vitest';
import { canTransitionData, transitionMachines } from '../packages/shared/src/transitions.js';

describe('immutable transition data', () => {
  it('accepts every frozen legal transition without evaluating actor or guard metadata', () => {
    for (const [machine, transitions] of Object.entries(transitionMachines)) {
      for (const transition of transitions) {
        expect(
          canTransitionData(
            machine as keyof typeof transitionMachines,
            transition.from,
            transition.action,
            transition.to,
          ),
        ).toBe(true);
      }
    }
  });

  it('rejects forbidden and terminal-state transitions', () => {
    expect(canTransitionData('privatePurchaseOrder', 'RECEIVED', 'receiveAll', 'RECEIVED')).toBe(
      false,
    );
    expect(canTransitionData('connectedPurchaseOrder', 'REJECTED', 'accept', 'ACCEPTED')).toBe(
      false,
    );
    expect(canTransitionData('product', 'ACTIVE', 'restore', 'ACTIVE')).toBe(false);
    expect(canTransitionData('mapping', 'DISABLED', 'disable', 'DISABLED')).toBe(false);
  });
});
