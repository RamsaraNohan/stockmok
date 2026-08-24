import type { DocumentData, Timestamp } from 'firebase-admin/firestore';

import {
  AdjustmentReasonSchema,
  ConnectionStatusSchema,
  LifecycleStatusSchema,
  MappingStatusSchema,
  MemberStatusSchema,
  MovementTypeSchema,
  NotificationCategorySchema,
  NotificationTypeSchema,
  PartnerStatusSchema,
  PoStatusSchema,
  ReferenceTypeSchema,
  RoleSchema,
  SourceTypeSchema,
  StockStatusSchema,
  SupplierKindSchema,
  UnitSchema,
  ViewRoleSchema,
  WarehouseTypeSchema,
} from '../../../packages/shared/src/primitives.js';
import {
  classifyDocumentPath,
  matrixShapes,
  type MatrixFilter,
  type MatrixShape,
  type MatrixSort,
} from '../manifest.js';
import type { QaSnapshot } from './integrity.js';

/**
 * Authority preservation.
 *
 * The QA dataset is data. It must not quietly add production authority, and it
 * must not fabricate the traces of commands that were never run. Two blocked
 * surfaces stay blocked: C-34 and notification mark-read. Nothing in this
 * dataset defines, implies, or exercises either.
 */

const ENUM_FIELDS: Readonly<Record<string, readonly string[]>> = {
  role: RoleSchema.options,
  status: [],
  movementType: MovementTypeSchema.options,
  sourceType: SourceTypeSchema.options,
  adjustmentReason: AdjustmentReasonSchema.options,
  stockStatus: StockStatusSchema.options,
  productStatus: LifecycleStatusSchema.options,
  unit: UnitSchema.options,
  baseUnit: UnitSchema.options,
  buyerBaseUnitSnapshot: UnitSchema.options,
  supplierOrderUnitSnapshot: UnitSchema.options,
  buyerBaseUnit: UnitSchema.options,
  supplierOrderUnit: UnitSchema.options,
  orderUnit: UnitSchema.options,
  type: [],
  viewRole: ViewRoleSchema.options,
  supplierKind: SupplierKindSchema.options,
  category: NotificationCategorySchema.options,
  referenceType: ReferenceTypeSchema.options,
};

/** Some field names carry different enums depending on the collection. */
function statusOptionsFor(collection: string | undefined): readonly string[] {
  switch (collection) {
    case 'members':
      return MemberStatusSchema.options;
    case 'categories':
    case 'warehouses':
    case 'products':
      return LifecycleStatusSchema.options;
    case 'privatePartners':
      return PartnerStatusSchema.options;
    case 'purchaseOrders':
      return PoStatusSchema.options;
    case 'productMappings':
      return MappingStatusSchema.options;
    case 'connections':
      return ConnectionStatusSchema.options;
    default:
      return [];
  }
}

function typeOptionsFor(collection: string | undefined): readonly string[] {
  if (collection === 'warehouses') return WarehouseTypeSchema.options;
  if (collection === 'notifications') return NotificationTypeSchema.options;
  return [];
}

export interface AuthorityReport {
  readonly invalidEnumFailures: readonly string[];
  readonly authorityViolations: readonly string[];
  readonly c34GapPreserved: boolean;
  readonly notificationMarkReadGapPreserved: boolean;
}

export function verifyAuthority(snapshot: QaSnapshot): AuthorityReport {
  const invalidEnumFailures: string[] = [];
  const authorityViolations: string[] = [];
  let commandReceipts = 0;
  let auditLogs = 0;

  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    const collection = parts[0] === 'organizations' ? parts[2] : parts[2];
    const family = classifyDocumentPath(path);

    if (family === undefined) {
      authorityViolations.push(`AUTHORITY_VIOLATION ${path} is outside the coverage manifest`);
      continue;
    }
    if (family.id === 'commandReceipts') commandReceipts += 1;
    if (family.id === 'auditLogs') auditLogs += 1;
    if (!family.smokePopulated) {
      authorityViolations.push(
        `AUTHORITY_VIOLATION ${path} was written into ${family.id}, classified ${family.pathClass} and not seeded by the smoke profile`,
      );
    }

    for (const [key, raw] of Object.entries(data)) {
      if (typeof raw !== 'string') continue;
      let options = ENUM_FIELDS[key];
      if (key === 'status') options = statusOptionsFor(collection);
      if (key === 'type') options = typeOptionsFor(collection);
      if (options === undefined || options.length === 0) continue;
      if (!options.includes(raw)) {
        invalidEnumFailures.push(
          `INVALID_ENUM ${path} ${key}=${raw} is outside [${options.join('|')}]`,
        );
      }
    }
  }

  return {
    invalidEnumFailures,
    authorityViolations,
    // A command receipt exists only where a command ran. C-34 is a blocked
    // authority dependency, so no receipt may claim it did.
    c34GapPreserved: commandReceipts === 0,
    // The `read` flag is seeded state. No mark-read command ran, so no audit
    // log may record one.
    notificationMarkReadGapPreserved: auditLogs === 0,
  };
}

function stringField(data: DocumentData, key: string): string | undefined {
  const value: unknown = data[key];
  return typeof value === 'string' ? value : undefined;
}

function numberField(data: DocumentData, key: string): number | undefined {
  const value: unknown = data[key];
  return typeof value === 'number' ? value : undefined;
}

function millisField(data: DocumentData, key: string): number | undefined {
  const value: unknown = data[key];
  if (value !== null && typeof value === 'object' && 'toMillis' in value) {
    return (value as Timestamp).toMillis();
  }
  return undefined;
}

function sortValue(data: DocumentData, sort: MatrixSort): string | number | undefined {
  switch (sort) {
    case 'name':
      return stringField(data, 'productName');
    case 'sku':
      return stringField(data, 'internalSkuNormalized');
    case 'onHand':
      return numberField(data, 'onHandMilli');
    case 'updated':
      return millisField(data, 'productUpdatedAt');
  }
}

function groupKey(
  org: string,
  data: DocumentData,
  filter: MatrixFilter,
  includeWarehouse: boolean,
): string {
  const segments = [org, stringField(data, 'productStatus') ?? ''];
  if (includeWarehouse) segments.push(stringField(data, 'warehouseId') ?? '');
  if (filter === 'category' || filter === 'categoryStatus') {
    segments.push(stringField(data, 'categoryId') ?? '');
  }
  if (filter === 'status' || filter === 'categoryStatus') {
    segments.push(stringField(data, 'stockStatus') ?? '');
  }
  return segments.join('|');
}

export interface MatrixCoverage {
  readonly total: number;
  readonly covered: number;
  readonly uncovered: readonly string[];
}

/**
 * Data coverage for the 32 product-list index shapes.
 *
 * A shape counts as covered when at least one filter group holds two or more
 * rows with *distinct* values of that shape's sort field - the condition under
 * which ordering is actually observable. This is QUERY_DATA_COVERAGE, not
 * EXECUTED_QUERY_ACCEPTANCE: it says the data can exercise the shape, not that a
 * query was run against it.
 */
export function productMatrixCoverage(snapshot: QaSnapshot): MatrixCoverage {
  const summaryRows: { org: string; data: DocumentData }[] = [];
  const balanceRows: { org: string; data: DocumentData }[] = [];

  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts.length !== 4) continue;
    const org = parts[1];
    if (org === undefined) continue;
    if (parts[2] === 'productStockSummaries') summaryRows.push({ org, data });
    if (parts[2] === 'stockBalances') balanceRows.push({ org, data });
  }

  const uncovered: string[] = [];
  let covered = 0;

  for (const shape of matrixShapes()) {
    const rows = shape.mode === 'summary' ? summaryRows : balanceRows;
    const includeWarehouse = shape.mode === 'warehouse';
    const groups = new Map<string, Set<string>>();
    for (const row of rows) {
      const value = sortValue(row.data, shape.sort);
      if (value === undefined) continue;
      const key = groupKey(row.org, row.data, shape.filter, includeWarehouse);
      const bucket = groups.get(key) ?? new Set<string>();
      bucket.add(String(value));
      groups.set(key, bucket);
    }
    const satisfied = [...groups.values()].some((values) => values.size >= 2);
    if (satisfied) covered += 1;
    else uncovered.push(shapeLabel(shape));
  }

  return { total: matrixShapes().length, covered, uncovered };
}

export function shapeLabel(shape: MatrixShape): string {
  return `${shape.mode}/${shape.filter}/${shape.sort}`;
}

export interface Q005Coverage {
  readonly unreadCountsByUid: Readonly<Record<string, number>>;
  readonly boundariesCovered: readonly number[];
  readonly boundariesMissing: readonly number[];
}

/** Q-005 separates empty, low, pagination-edge, cap, and high-volume windows. */
const SMOKE_Q005_BOUNDARIES = [0, 1, 49, 50, 51] as const;
const WIDE_Q005_BOUNDARIES = [0, 1, 5, 20, 49, 50, 51, 75] as const;

export function q005Coverage(snapshot: QaSnapshot): Q005Coverage {
  const unread = new Map<string, number>();
  const users = new Set<string>();

  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'users') continue;
    const uid = parts[1];
    if (uid === undefined) continue;
    if (parts.length === 2) {
      users.add(uid);
      continue;
    }
    if (parts[2] !== 'notifications') continue;
    const read: unknown = data['read'];
    if (read === false) unread.set(uid, (unread.get(uid) ?? 0) + 1);
  }

  const counts: Record<string, number> = {};
  for (const uid of [...users].sort()) counts[uid] = unread.get(uid) ?? 0;

  const observed = new Set(Object.values(counts));
  const wide = [...snapshot.documents.keys()].some((path) =>
    path.startsWith('organizations/qa-wide-'),
  );
  const boundaries = wide ? WIDE_Q005_BOUNDARIES : SMOKE_Q005_BOUNDARIES;
  return {
    unreadCountsByUid: counts,
    boundariesCovered: boundaries.filter((value) => observed.has(value)),
    boundariesMissing: boundaries.filter((value) => !observed.has(value)),
  };
}
