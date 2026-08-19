import {
  AuditLogSchema,
  CategorySchema,
  CommandReceiptSchema,
  ConnectionProjectionSchema,
  CounterSchema,
  HandleReservationSchema,
  InvitationSchema,
  MemberSchema,
  NotificationSchema,
  OrganizationDirectorySchema,
  OrganizationSchema,
  OrganizationSettingsSchema,
  PartnerCatalogItemSchema,
  PrivatePartnerSchema,
  ProductMappingSchema,
  ProductSchema,
  ProductSkuIndexSchema,
  ProductStockSummarySchema,
  PurchaseOrderHistorySchema,
  PurchaseOrderItemSchema,
  PurchaseOrderSchema,
  StockBalanceSchema,
  StockMovementSchema,
  UserMembershipSchema,
  UserSchema,
  WarehouseSchema,
  type QueryId,
} from '@stockmok/shared';
import {
  AggregateField,
  type DocumentReference,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type WhereFilterOp,
} from 'firebase-admin/firestore';
import type { z } from 'zod';
import { QUERY_COVERAGE_BY_ID } from './registry.js';
import type {
  AggregateResult,
  ConverterKey,
  QueryContractRecord,
  QueryFieldParameter,
  QueryParameters,
  QueryValueParameter,
} from './types.js';
import { DataReadError } from './types.js';

export interface BoundServerScope {
  readonly orgId?: string;
}

export interface ServerPageCursor {
  readonly queryId: QueryId;
  readonly signature: string;
  readonly snapshot: QueryDocumentSnapshot;
}

export interface ServerPageResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: ServerPageCursor | null;
}

const schemaMap = {
  organizationDirectory: OrganizationDirectorySchema,
  user: UserSchema,
  userMembership: UserMembershipSchema,
  notification: NotificationSchema,
  organization: OrganizationSchema,
  organizationSettings: OrganizationSettingsSchema,
  member: MemberSchema,
  invitation: InvitationSchema,
  counter: CounterSchema,
  commandReceipt: CommandReceiptSchema,
  productSkuIndex: ProductSkuIndexSchema,
  category: CategorySchema,
  warehouse: WarehouseSchema,
  product: ProductSchema,
  stockBalance: StockBalanceSchema,
  productStockSummary: ProductStockSummarySchema,
  stockMovement: StockMovementSchema,
  privatePartner: PrivatePartnerSchema,
  purchaseOrder: PurchaseOrderSchema,
  purchaseOrderItem: PurchaseOrderItemSchema,
  purchaseOrderHistory: PurchaseOrderHistorySchema,
  partnerCatalogItem: PartnerCatalogItemSchema,
  productMapping: ProductMappingSchema,
  connectionProjection: ConnectionProjectionSchema,
  auditLog: AuditLogSchema,
  handleReservation: HandleReservationSchema,
} satisfies Record<ConverterKey, z.ZodType>;

function isValueParameter(value: unknown): value is QueryValueParameter {
  return typeof value === 'object' && value !== null && 'param' in value;
}

function isFieldParameter(value: unknown): value is QueryFieldParameter {
  return typeof value === 'object' && value !== null && 'fieldParam' in value;
}

function segment(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.includes('/')) {
    throw new DataReadError('invalid-argument', `${label} must be one non-empty path segment`);
  }
  return value;
}

function scopedValue(name: string, scope: BoundServerScope, parameters: QueryParameters): unknown {
  return name === 'orgId' ? scope.orgId : parameters[name];
}

function pathFor(template: string, scope: BoundServerScope, parameters: QueryParameters): string {
  return template.replaceAll(/\{([^}]+)\}/g, (_match, name: string) =>
    segment(scopedValue(name, scope, parameters), name),
  );
}

function fieldFor(field: string | QueryFieldParameter, parameters: QueryParameters): string {
  if (!isFieldParameter(field)) return field;
  const value = parameters[field.fieldParam];
  if (
    field.fieldParam !== 'searchField' ||
    (value !== 'productName' && value !== 'internalSkuNormalized')
  ) {
    throw new DataReadError(
      'invalid-argument',
      `${field.fieldParam} must be productName or internalSkuNormalized`,
    );
  }
  return value;
}

function parameterValue(value: unknown, parameters: QueryParameters): unknown {
  if (!isValueParameter(value)) return value;
  const selected = parameters[value.param];
  if (selected === undefined) {
    throw new DataReadError('invalid-argument', `Missing query parameter ${value.param}`);
  }
  return selected;
}

function hasToMillis(value: object): value is { readonly toMillis: () => number } {
  return 'toMillis' in value && typeof value.toMillis === 'function';
}

function signature(queryId: QueryId, scope: BoundServerScope, parameters: QueryParameters): string {
  return JSON.stringify({ queryId, scope, parameters }, (_key, value: unknown) => {
    if (value && typeof value === 'object' && hasToMillis(value)) {
      return { timestampMillis: value.toMillis() };
    }
    return value;
  });
}

function schemaFor(record: QueryContractRecord): z.ZodType {
  if (!record.converter) {
    throw new DataReadError('invalid-argument', `${record.queryId} has no result schema`);
  }
  return schemaMap[record.converter];
}

function buildCollectionQuery(
  db: Firestore,
  scope: BoundServerScope,
  record: QueryContractRecord,
  parameters: QueryParameters,
  requestedLimit?: number,
  cursor?: ServerPageCursor,
): Query {
  let built: Query = db.collection(pathFor(record.path, scope, parameters));
  for (const current of record.filters) {
    if (isValueParameter(current.value) && parameters[current.value.param] === undefined) {
      if (current.optional) continue;
      throw new DataReadError('invalid-argument', `Missing query parameter ${current.value.param}`);
    }
    built = built.where(
      fieldFor(current.field, parameters),
      current.operator as WhereFilterOp,
      parameterValue(current.value, parameters),
    );
  }
  for (const current of record.order) {
    built = built.orderBy(fieldFor(current.field, parameters), current.direction);
  }
  if (requestedLimit !== undefined || record.defaultLimit !== undefined) {
    const selected = requestedLimit ?? record.defaultLimit;
    const maximum = Math.min(record.maxLimit ?? 100, 100);
    if (!selected || !Number.isInteger(selected) || selected < 1 || selected > maximum) {
      throw new DataReadError('invalid-argument', `${record.queryId} has an invalid limit`);
    }
    built = built.limit(selected);
  }
  if (cursor) built = built.startAfter(cursor.snapshot);
  return built;
}

export interface ServerReadBuilders {
  readonly build: (
    queryId: QueryId,
    parameters?: QueryParameters,
  ) => Query | DocumentReference | readonly [DocumentReference, DocumentReference];
  readonly get: <T = unknown>(queryId: QueryId, parameters?: QueryParameters) => Promise<T | null>;
  readonly list: <T = unknown>(
    queryId: QueryId,
    parameters?: QueryParameters,
    page?: { readonly limit?: number; readonly cursor?: ServerPageCursor },
  ) => Promise<ServerPageResult<T>>;
  readonly aggregate: (queryId: QueryId, parameters?: QueryParameters) => Promise<AggregateResult>;
}

export function createServerReadBuilders(
  db: Firestore,
  scope: BoundServerScope,
): ServerReadBuilders {
  function recordFor(queryId: QueryId): QueryContractRecord {
    const record = QUERY_COVERAGE_BY_ID[queryId];
    if (record.status !== 'IMPLEMENTED') {
      throw new DataReadError(
        'invalid-argument',
        `${queryId} is blocked pending an owner ruling; no server substitute exists`,
      );
    }
    return record;
  }

  function build(
    queryId: QueryId,
    parameters: QueryParameters = {},
  ): Query | DocumentReference | readonly [DocumentReference, DocumentReference] {
    const record = recordFor(queryId);
    if (queryId === 'Q-071') {
      const productId = segment(parameters.productId, 'productId');
      const fromWarehouseId = segment(parameters.fromWarehouseId, 'fromWarehouseId');
      const toWarehouseId = segment(parameters.toWarehouseId, 'toWarehouseId');
      const orgId = segment(scope.orgId, 'orgId');
      return [
        db.doc(`organizations/${orgId}/stockBalances/${productId}__${fromWarehouseId}`),
        db.doc(`organizations/${orgId}/stockBalances/${productId}__${toWarehouseId}`),
      ];
    }
    if (record.kind === 'document' || record.kind === 'reference') {
      return db.doc(pathFor(record.path, scope, parameters));
    }
    return buildCollectionQuery(db, scope, record, parameters);
  }

  async function get<T = unknown>(
    queryId: QueryId,
    parameters: QueryParameters = {},
  ): Promise<T | null> {
    const record = recordFor(queryId);
    if (record.kind !== 'document') {
      throw new DataReadError('invalid-argument', `${queryId} is not a server document read`);
    }
    const snapshot = await db.doc(pathFor(record.path, scope, parameters)).get();
    return snapshot.exists ? (schemaFor(record).parse(snapshot.data()) as T) : null;
  }

  async function list<T = unknown>(
    queryId: QueryId,
    parameters: QueryParameters = {},
    page: { readonly limit?: number; readonly cursor?: ServerPageCursor } = {},
  ): Promise<ServerPageResult<T>> {
    const record = recordFor(queryId);
    if (record.kind !== 'list') {
      throw new DataReadError('invalid-argument', `${queryId} is not a server list read`);
    }
    const pageSignature = signature(queryId, scope, parameters);
    if (
      page.cursor &&
      (page.cursor.queryId !== queryId || page.cursor.signature !== pageSignature)
    ) {
      throw new DataReadError('invalid-argument', `${queryId} received a mismatched cursor`);
    }
    const selectedLimit = page.limit ?? record.defaultLimit ?? 25;
    const snapshot = await buildCollectionQuery(
      db,
      scope,
      record,
      parameters,
      selectedLimit,
      page.cursor,
    ).get();
    const selectedSchema = schemaFor(record);
    const items = snapshot.docs.map((current) => selectedSchema.parse(current.data()) as T);
    const last = snapshot.docs.at(-1);
    return {
      items,
      nextCursor:
        items.length === selectedLimit && last
          ? { queryId, signature: pageSignature, snapshot: last }
          : null,
    };
  }

  async function aggregate(
    queryId: QueryId,
    parameters: QueryParameters = {},
  ): Promise<AggregateResult> {
    const record = recordFor(queryId);
    if (!record.aggregation) {
      throw new DataReadError('invalid-argument', `${queryId} is not an aggregation read`);
    }
    const built = buildCollectionQuery(db, scope, record, parameters);
    if (record.kind === 'count') {
      const snapshot = await built.count().get();
      return { count: snapshot.data().count };
    }
    const specification = Object.fromEntries(
      (record.aggregates ?? []).map((current) => [
        current.alias,
        current.operation === 'count'
          ? AggregateField.count()
          : AggregateField.sum(current.field ?? ''),
      ]),
    );
    const snapshot = await built.aggregate(specification).get();
    return snapshot.data();
  }

  return { build, get, list, aggregate };
}
