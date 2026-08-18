import { converters, type QueryId } from '@stockmok/shared';
import {
  collection,
  count,
  doc,
  getAggregateFromServer,
  getCountFromServer,
  getDoc,
  getDocs,
  limit as limitConstraint,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  sum,
  where,
  type DocumentData,
  type Firestore,
  type FirestoreDataConverter,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { QUERY_COVERAGE_BY_ID } from './registry.js';
import type {
  AggregateResult,
  PageRequest,
  PageResult,
  QueryContractRecord,
  QueryCursor,
  QueryFieldParameter,
  QueryParameters,
  QueryValueParameter,
  ResolverResult,
} from './types.js';
import { DataReadError } from './types.js';

export interface BoundReadScope {
  readonly uid?: string;
  readonly orgId?: string;
}

type SnapshotHandler<T> = (value: T | null) => void;
type ErrorHandler = (error: unknown) => void;

const converterMap = converters as unknown as Readonly<
  Record<string, FirestoreDataConverter<DocumentData>>
>;

function isValueParameter(value: unknown): value is QueryValueParameter {
  return typeof value === 'object' && value !== null && 'param' in value;
}

function isFieldParameter(value: unknown): value is QueryFieldParameter {
  return typeof value === 'object' && value !== null && 'fieldParam' in value;
}

function pathSegment(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.includes('/')) {
    throw new DataReadError('invalid-argument', `${label} must be one non-empty path segment`);
  }
  return value;
}

function valueFor(name: string, scope: BoundReadScope, parameters: QueryParameters): unknown {
  if (name === 'uid') return scope.uid;
  if (name === 'orgId') return scope.orgId;
  return parameters[name];
}

function resolvePath(template: string, scope: BoundReadScope, parameters: QueryParameters): string {
  return template.replaceAll(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = valueFor(name, scope, parameters);
    return pathSegment(value, name);
  });
}

function resolveField(field: string | QueryFieldParameter, parameters: QueryParameters): string {
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

function resolveFilterValue(value: unknown, parameters: QueryParameters): unknown {
  if (!isValueParameter(value)) return value;
  const resolved = parameters[value.param];
  if (resolved === undefined) {
    throw new DataReadError('invalid-argument', `Missing query parameter ${value.param}`);
  }
  return resolved;
}

function hasToMillis(value: object): value is { readonly toMillis: () => number } {
  return 'toMillis' in value && typeof value.toMillis === 'function';
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    if (hasToMillis(value)) {
      return { timestampMillis: value.toMillis() };
    }
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function signatureFor(
  queryId: QueryId,
  scope: BoundReadScope,
  parameters: QueryParameters,
): string {
  return JSON.stringify(stableValue({ queryId, scope, parameters }));
}

function constraintsFor(
  record: QueryContractRecord,
  parameters: QueryParameters,
): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  for (const current of record.filters) {
    if (isValueParameter(current.value) && parameters[current.value.param] === undefined) {
      if (current.optional) continue;
      throw new DataReadError('invalid-argument', `Missing query parameter ${current.value.param}`);
    }
    constraints.push(
      where(
        resolveField(current.field, parameters),
        current.operator,
        resolveFilterValue(current.value, parameters),
      ),
    );
  }
  for (const current of record.order) {
    constraints.push(orderBy(resolveField(current.field, parameters), current.direction));
  }
  return constraints;
}

function converterFor(record: QueryContractRecord): FirestoreDataConverter<DocumentData> {
  if (!record.converter) {
    throw new DataReadError('invalid-argument', `${record.queryId} has no result converter`);
  }
  const selected = converterMap[record.converter];
  if (!selected) {
    throw new DataReadError(
      'invalid-argument',
      `${record.queryId} references unknown converter ${record.converter}`,
    );
  }
  return selected;
}

function assertExecutable(record: QueryContractRecord): void {
  if (record.status !== 'IMPLEMENTED') {
    throw new DataReadError(
      'invalid-argument',
      `${record.queryId} is blocked pending an owner ruling; no substitute implementation exists`,
    );
  }
  if (record.scope === 'server') {
    throw new DataReadError(
      'invalid-argument',
      `${record.queryId} is server-only and cannot execute through the browser client`,
    );
  }
}

function pageSize(record: QueryContractRecord, requested: number | undefined): number {
  const selected = requested ?? record.defaultLimit;
  if (selected === undefined || !Number.isInteger(selected) || selected < 1) {
    throw new DataReadError(
      'invalid-argument',
      `${record.queryId} requires a positive integer limit`,
    );
  }
  const maximum = record.maxLimit ?? 100;
  if (selected > maximum || selected > 100) {
    throw new DataReadError(
      'invalid-argument',
      `${record.queryId} limit ${String(selected)} exceeds ${String(Math.min(maximum, 100))}`,
    );
  }
  return selected;
}

export function prefixBounds(prefix: string): {
  readonly prefix: string;
  readonly prefixEnd: string;
} {
  if (prefix.length === 0) {
    throw new DataReadError('invalid-argument', 'A prefix search requires a non-empty prefix');
  }
  return { prefix, prefixEnd: `${prefix}\uf8ff` };
}

export interface ReadClient {
  readonly get: <T = DocumentData>(
    queryId: QueryId,
    parameters?: QueryParameters,
  ) => Promise<T | null>;
  readonly list: <T = DocumentData>(
    queryId: QueryId,
    parameters?: QueryParameters,
    page?: PageRequest,
  ) => Promise<PageResult<T>>;
  readonly aggregate: (queryId: QueryId, parameters?: QueryParameters) => Promise<AggregateResult>;
  readonly subscribe: <T = DocumentData>(
    queryId: QueryId,
    parameters: QueryParameters,
    onValue: SnapshotHandler<T>,
    onError?: ErrorHandler,
  ) => Unsubscribe;
  readonly resolve: <T = DocumentData>(
    queryId: 'Q-015r',
    parameters: QueryParameters,
  ) => Promise<ResolverResult<T>>;
}

export function createReadClient(db: Firestore, scope: BoundReadScope): ReadClient {
  async function get<T = DocumentData>(
    queryId: QueryId,
    parameters: QueryParameters = {},
  ): Promise<T | null> {
    const record = QUERY_COVERAGE_BY_ID[queryId];
    assertExecutable(record);
    if (record.kind !== 'document') {
      throw new DataReadError('invalid-argument', `${queryId} is not a document read`);
    }
    const reference = doc(db, resolvePath(record.path, scope, parameters)).withConverter(
      converterFor(record),
    );
    const snapshot = await getDoc(reference);
    return snapshot.exists() ? (snapshot.data() as T) : null;
  }

  async function list<T = DocumentData>(
    queryId: QueryId,
    parameters: QueryParameters = {},
    page: PageRequest = {},
  ): Promise<PageResult<T>> {
    const record = QUERY_COVERAGE_BY_ID[queryId];
    assertExecutable(record);
    if (record.kind !== 'list') {
      throw new DataReadError('invalid-argument', `${queryId} is not a list read`);
    }
    const selectedLimit = pageSize(record, page.limit);
    const signature = signatureFor(queryId, scope, parameters);
    if (page.cursor) {
      if (page.cursor.queryId !== queryId || page.cursor.signature !== signature) {
        throw new DataReadError(
          'invalid-argument',
          `${queryId} cursor belongs to a different query scope or filter set`,
        );
      }
    }
    const reference = collection(db, resolvePath(record.path, scope, parameters)).withConverter(
      converterFor(record),
    );
    const constraints = constraintsFor(record, parameters);
    constraints.push(limitConstraint(selectedLimit));
    if (page.cursor) constraints.push(startAfter(page.cursor.snapshot));
    const snapshot = await getDocs(query(reference, ...constraints));
    const items = snapshot.docs.map((current) => current.data() as T);
    const last = snapshot.docs.at(-1) as QueryDocumentSnapshot<T> | undefined;
    const nextCursor =
      items.length === selectedLimit && last
        ? ({ queryId, signature, snapshot: last } as QueryCursor<T>)
        : null;
    return { items, nextCursor };
  }

  async function aggregate(
    queryId: QueryId,
    parameters: QueryParameters = {},
  ): Promise<AggregateResult> {
    const record = QUERY_COVERAGE_BY_ID[queryId];
    assertExecutable(record);
    if (!record.aggregation || !['count', 'sum', 'aggregate'].includes(record.kind)) {
      throw new DataReadError('invalid-argument', `${queryId} is not an aggregation read`);
    }
    const reference = collection(db, resolvePath(record.path, scope, parameters)).withConverter(
      converterFor(record),
    );
    const built = query(reference, ...constraintsFor(record, parameters));
    if (record.kind === 'count') {
      const snapshot = await getCountFromServer(built);
      return { count: snapshot.data().count };
    }
    const aggregateSpec = Object.fromEntries(
      (record.aggregates ?? []).map((aggregateDefinition) => [
        aggregateDefinition.alias,
        aggregateDefinition.operation === 'count' ? count() : sum(aggregateDefinition.field ?? ''),
      ]),
    );
    const snapshot = await getAggregateFromServer(built, aggregateSpec);
    return snapshot.data();
  }

  function subscribe<T = DocumentData>(
    queryId: QueryId,
    parameters: QueryParameters,
    onValue: SnapshotHandler<T>,
    onError: ErrorHandler = () => undefined,
  ): Unsubscribe {
    const record = QUERY_COVERAGE_BY_ID[queryId];
    assertExecutable(record);
    if (!record.realtime || record.kind !== 'document') {
      throw new DataReadError(
        'invalid-argument',
        `${queryId} is not an approved document listener`,
      );
    }
    const reference = doc(db, resolvePath(record.path, scope, parameters)).withConverter(
      converterFor(record),
    );
    let active = true;
    const unsubscribe = onSnapshot(
      reference,
      (snapshot) => {
        if (!active) return;
        try {
          onValue(snapshot.exists() ? (snapshot.data() as T) : null);
        } catch (error) {
          onError(error);
        }
      },
      (error) => {
        if (active) onError(error);
      },
    );
    return () => {
      if (!active) return;
      active = false;
      unsubscribe();
    };
  }

  async function resolve<T = DocumentData>(
    queryId: 'Q-015r',
    parameters: QueryParameters,
  ): Promise<ResolverResult<T>> {
    const page = await list<T>(queryId, parameters, { limit: 11 });
    return { matches: page.items.slice(0, 10), overflow: page.items.length === 11 };
  }

  return { get, list, aggregate, subscribe, resolve };
}
