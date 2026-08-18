import type { QueryDocumentSnapshot } from 'firebase/firestore';
import type { QueryId } from '@stockmok/shared';

export type QueryStatus = 'IMPLEMENTED' | 'BLOCKED_PENDING_OWNER_RULING';
export type QueryKind = 'document' | 'list' | 'count' | 'sum' | 'aggregate' | 'reference';
export type QueryScope = 'public' | 'user' | 'organization' | 'server';
export type QueryOperator = '==' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in';
export type QueryDirection = 'asc' | 'desc';

export interface UserReadScope {
  readonly uid: string;
}

export interface OrganizationReadScope {
  readonly orgId: string;
}

export type ReadScope = UserReadScope | OrganizationReadScope | Record<never, never>;

export interface QueryValueParameter {
  readonly param: string;
}

export interface QueryFieldParameter {
  readonly fieldParam: string;
}

export interface QueryFilterDefinition {
  readonly field: string | QueryFieldParameter;
  readonly operator: QueryOperator;
  readonly value: unknown;
  readonly optional?: boolean;
}

export interface QueryOrderDefinition {
  readonly field: string | QueryFieldParameter;
  readonly direction: QueryDirection;
}

export interface AggregateDefinition {
  readonly alias: string;
  readonly operation: 'count' | 'sum';
  readonly field?: string;
}

export type ConverterKey =
  | 'organizationDirectory'
  | 'user'
  | 'userMembership'
  | 'notification'
  | 'organization'
  | 'organizationSettings'
  | 'member'
  | 'invitation'
  | 'counter'
  | 'commandReceipt'
  | 'productSkuIndex'
  | 'category'
  | 'warehouse'
  | 'product'
  | 'stockBalance'
  | 'productStockSummary'
  | 'stockMovement'
  | 'privatePartner'
  | 'purchaseOrder'
  | 'purchaseOrderItem'
  | 'purchaseOrderHistory'
  | 'partnerCatalogItem'
  | 'productMapping'
  | 'connectionProjection'
  | 'auditLog'
  | 'handleReservation';

export interface QueryContractRecord {
  readonly queryId: QueryId;
  readonly purpose: string;
  readonly repositoryMethod: string;
  readonly scope: QueryScope;
  readonly kind: QueryKind;
  readonly path: string;
  readonly converter?: ConverterKey;
  readonly filters: readonly QueryFilterDefinition[];
  readonly order: readonly QueryOrderDefinition[];
  readonly defaultLimit?: number;
  readonly maxLimit?: number;
  readonly cursor: boolean;
  readonly indexIds: readonly string[];
  readonly realtime: boolean;
  readonly aggregation: boolean;
  readonly aggregates?: readonly AggregateDefinition[];
  readonly primaryTest: string;
  readonly status: QueryStatus;
}

declare const cursorBrand: unique symbol;

export interface QueryCursor<T = unknown> {
  readonly queryId: QueryId;
  readonly signature: string;
  readonly snapshot: QueryDocumentSnapshot<T>;
  readonly [cursorBrand]: true;
}

export interface PageRequest {
  readonly limit?: number;
  readonly cursor?: QueryCursor;
}

export interface PageResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: QueryCursor<T> | null;
}

export interface ResolverResult<T> {
  readonly matches: readonly T[];
  readonly overflow: boolean;
}

export interface AggregateResult {
  readonly [alias: string]: number;
}

export type QueryParameters = Readonly<Record<string, unknown>>;

export class DataReadError extends Error {
  public constructor(
    public readonly code: 'invalid-argument' | 'not-found' | 'schema-invalid',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DataReadError';
  }
}
