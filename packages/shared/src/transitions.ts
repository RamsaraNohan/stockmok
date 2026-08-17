export interface TransitionData<State extends string = string, Action extends string = string> {
  readonly from: State | null;
  readonly action: Action;
  readonly to: State;
  readonly actor: string;
  readonly guard?: string;
}

export const transitionMachines = {
  membership: [
    {
      from: null,
      action: 'accept',
      to: 'ACTIVE',
      actor: 'MATCHING_INVITEE',
      guard: 'EMAIL_MATCHES',
    },
    { from: 'ACTIVE', action: 'suspend', to: 'SUSPENDED', actor: 'ADMINS', guard: 'NOT_OWNER' },
    { from: 'SUSPENDED', action: 'reactivate', to: 'ACTIVE', actor: 'ADMINS', guard: 'NOT_OWNER' },
    { from: 'ACTIVE', action: 'remove', to: 'REMOVED', actor: 'ADMINS', guard: 'NOT_OWNER' },
    { from: 'SUSPENDED', action: 'remove', to: 'REMOVED', actor: 'ADMINS', guard: 'NOT_OWNER' },
  ],
  invitation: [
    { from: null, action: 'create', to: 'PENDING', actor: 'ADMINS' },
    { from: 'PENDING', action: 'accept', to: 'ACCEPTED', actor: 'MATCHING_INVITEE' },
    { from: 'PENDING', action: 'expire', to: 'EXPIRED', actor: 'DERIVED_ON_READ' },
    { from: 'PENDING', action: 'revoke', to: 'REVOKED', actor: 'ADMINS' },
  ],
  product: [
    { from: 'ACTIVE', action: 'archive', to: 'ARCHIVED', actor: 'INVENTORY_WRITERS' },
    { from: 'ARCHIVED', action: 'restore', to: 'ACTIVE', actor: 'INVENTORY_WRITERS' },
  ],
  category: [
    {
      from: 'ACTIVE',
      action: 'archive',
      to: 'ARCHIVED',
      actor: 'INVENTORY_WRITERS',
      guard: 'NO_ACTIVE_PRODUCTS',
    },
    { from: 'ARCHIVED', action: 'restore', to: 'ACTIVE', actor: 'INVENTORY_WRITERS' },
  ],
  warehouse: [
    {
      from: 'ACTIVE',
      action: 'archive',
      to: 'ARCHIVED',
      actor: 'INVENTORY_WRITERS',
      guard: 'EMPTY_AND_NO_OPEN_RECEIVING',
    },
    { from: 'ARCHIVED', action: 'restore', to: 'ACTIVE', actor: 'INVENTORY_WRITERS' },
  ],
  privatePartner: [
    {
      from: 'ACTIVE',
      action: 'deactivate',
      to: 'DEACTIVATED',
      actor: 'PARTNER_WRITERS',
      guard: 'NO_OPEN_ORDERS_Q_080',
    },
    { from: 'DEACTIVATED', action: 'restore', to: 'ACTIVE', actor: 'PARTNER_WRITERS' },
  ],
  connection: [
    { from: null, action: 'request', to: 'PENDING', actor: 'BUYER_PARTNER_WRITERS' },
    { from: 'REJECTED', action: 'request', to: 'PENDING', actor: 'BUYER_PARTNER_WRITERS' },
    { from: 'DISABLED', action: 'request', to: 'PENDING', actor: 'BUYER_PARTNER_WRITERS' },
    { from: 'PENDING', action: 'accept', to: 'ACTIVE', actor: 'SUPPLIER_PARTNER_WRITERS' },
    { from: 'PENDING', action: 'reject', to: 'REJECTED', actor: 'SUPPLIER_PARTNER_WRITERS' },
    { from: 'ACTIVE', action: 'disable', to: 'DISABLED', actor: 'ADMINS' },
  ],
  mapping: [
    {
      from: null,
      action: 'create',
      to: 'VERIFIED',
      actor: 'BUYER_PARTNER_WRITERS',
      guard: 'MAPPING_VALIDATED',
    },
    { from: 'VERIFIED', action: 'disable', to: 'DISABLED', actor: 'BUYER_PARTNER_WRITERS' },
  ],
  privatePurchaseOrder: [
    {
      from: 'DRAFT',
      action: 'order',
      to: 'ORDERED',
      actor: 'PO_WRITERS',
      guard: 'VALID_LINES_AND_SUPPLIER',
    },
    { from: 'DRAFT', action: 'cancel', to: 'CANCELLED', actor: 'PO_WRITERS' },
    {
      from: 'ORDERED',
      action: 'cancel',
      to: 'CANCELLED',
      actor: 'PO_WRITERS',
      guard: 'NOT_RECEIVED',
    },
    { from: 'ORDERED', action: 'receivePartial', to: 'PARTIALLY_RECEIVED', actor: 'RECEIVERS' },
    { from: 'ORDERED', action: 'receiveAll', to: 'RECEIVED', actor: 'RECEIVERS' },
    {
      from: 'PARTIALLY_RECEIVED',
      action: 'receivePartial',
      to: 'PARTIALLY_RECEIVED',
      actor: 'RECEIVERS',
    },
    { from: 'PARTIALLY_RECEIVED', action: 'receiveAll', to: 'RECEIVED', actor: 'RECEIVERS' },
  ],
  connectedPurchaseOrder: [
    { from: 'DRAFT', action: 'submit', to: 'SUBMITTED', actor: 'BUYER_PO_WRITERS' },
    { from: 'DRAFT', action: 'cancel', to: 'CANCELLED', actor: 'BUYER_PO_WRITERS' },
    { from: 'SUBMITTED', action: 'accept', to: 'ACCEPTED', actor: 'SUPPLIER_PO_WRITERS' },
    { from: 'SUBMITTED', action: 'reject', to: 'REJECTED', actor: 'SUPPLIER_PO_WRITERS' },
    { from: 'SUBMITTED', action: 'cancel', to: 'CANCELLED', actor: 'BUYER_PO_WRITERS' },
    { from: 'ACCEPTED', action: 'ship', to: 'SHIPPED', actor: 'SUPPLIER_PO_WRITERS' },
    {
      from: 'SHIPPED',
      action: 'receivePartial',
      to: 'PARTIALLY_RECEIVED',
      actor: 'BUYER_RECEIVERS',
    },
    { from: 'SHIPPED', action: 'receiveAll', to: 'RECEIVED', actor: 'BUYER_RECEIVERS' },
    {
      from: 'PARTIALLY_RECEIVED',
      action: 'receivePartial',
      to: 'PARTIALLY_RECEIVED',
      actor: 'BUYER_RECEIVERS',
    },
    { from: 'PARTIALLY_RECEIVED', action: 'receiveAll', to: 'RECEIVED', actor: 'BUYER_RECEIVERS' },
  ],
} as const satisfies Record<string, readonly TransitionData[]>;

export function canTransitionData(
  machine: keyof typeof transitionMachines,
  from: string | null,
  action: string,
  to: string,
): boolean {
  return transitionMachines[machine].some(
    (transition) =>
      transition.from === from && transition.action === action && transition.to === to,
  );
}
