import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import type { z } from 'zod';

import {
  CommandReceiptSchema,
  CategorySchema,
  CounterSchema,
  HandleReservationSchema,
  InvitationSchema,
  MemberSchema,
  NotificationSchema,
  OrganizationDirectorySchema,
  OrganizationSchema,
  OrganizationSettingsSchema,
  ProductSkuIndexSchema,
  UserMembershipSchema,
  UserSchema,
} from '../../../packages/shared/src/schemas/core.js';
import {
  ProductSchema,
  ProductStockSummarySchema,
  StockBalanceSchema,
  StockMovementSchema,
  WarehouseSchema,
} from '../../../packages/shared/src/schemas/inventory.js';
import {
  AuditLogSchema,
  CanonicalConnectionSchema,
  ConnectedHistorySchema,
  ConnectedPurchaseOrderItemSchema,
  ConnectedPurchaseOrderSchema,
  ConnectionProjectionSchema,
} from '../../../packages/shared/src/schemas/network.js';
import {
  PartnerCatalogItemSchema,
  PrivatePartnerSchema,
  ProductMappingSchema,
  PurchaseOrderHistorySchema,
  PurchaseOrderItemSchema,
  PurchaseOrderSchema,
} from '../../../packages/shared/src/schemas/procurement.js';
import { classifyDocumentPath, PATH_FAMILIES } from '../manifest.js';

/**
 * Structural integrity: every document sits at a known path, parses against the
 * schema that owns that path, and every reference it carries resolves.
 *
 * The path/schema table below is modelled on `schemaForPath` in
 * `scripts/bootstrap/reconcile.ts`, but it is a separate table rather than a
 * reuse of `validateAllBootstrapDocuments`. That function's table predates the
 * QA dataset and has no entry for notifications, invitations, counters,
 * productSkuIndex, handleReservations, commandReceipts or auditLogs - it would
 * assert its way out on the first notification. Extending it would mean editing
 * frozen bootstrap code, so the QA-side table is the additive alternative.
 */

export interface QaSnapshot {
  /** Every document in the emulator, keyed by full path. */
  readonly documents: ReadonlyMap<string, DocumentData>;
}

export async function readAllDocuments(db: Firestore): Promise<QaSnapshot> {
  const documents = new Map<string, DocumentData>();
  const collectionIds = [
    ...new Set(
      PATH_FAMILIES.flatMap((family) =>
        family.template.split('/').filter((_, index) => index % 2 === 0),
      ),
    ),
  ].sort();

  // The old recursive walk called listCollections() once for every document.
  // That is harmless at Smoke scale but becomes ~139k sequential metadata
  // round trips in Wide. The manifest is already the governed enumeration of
  // every physical path family, so one collection-group read per collection id
  // is both complete and bounded. Six concurrent reads keep emulator pressure
  // controlled while reducing traversal from O(documents) RPCs to O(families).
  const concurrency = 6;
  for (let offset = 0; offset < collectionIds.length; offset += concurrency) {
    await Promise.all(
      collectionIds.slice(offset, offset + concurrency).map(async (collectionId) => {
        const snapshot = await db.collectionGroup(collectionId).get();
        for (const document of snapshot.docs) {
          documents.set(document.ref.path, document.data());
        }
      }),
    );
  }

  return { documents };
}

function schemaForQaPath(path: string): z.ZodType | undefined {
  const parts = path.split('/');
  const root = parts[0];

  if (parts.length === 2) {
    return {
      organizationDirectory: OrganizationDirectorySchema,
      handleReservations: HandleReservationSchema,
      users: UserSchema,
      organizations: OrganizationSchema,
      connections: CanonicalConnectionSchema,
      connectedPurchaseOrders: ConnectedPurchaseOrderSchema,
    }[root ?? ''];
  }

  if (root === 'users' && parts.length === 4) {
    if (parts[2] === 'memberships') return UserMembershipSchema;
    if (parts[2] === 'notifications') return NotificationSchema;
    return undefined;
  }

  if (root === 'connectedPurchaseOrders' && parts.length === 4) {
    if (parts[2] === 'items') return ConnectedPurchaseOrderItemSchema;
    if (parts[2] === 'history') return ConnectedHistorySchema;
    return undefined;
  }

  if (root !== 'organizations') return undefined;

  if (parts.length === 6 && parts[2] === 'purchaseOrders') {
    if (parts[4] === 'items') return PurchaseOrderItemSchema;
    if (parts[4] === 'history') return PurchaseOrderHistorySchema;
    return undefined;
  }

  if (parts.length !== 4) return undefined;
  return {
    settings: OrganizationSettingsSchema,
    counters: CounterSchema,
    commandReceipts: CommandReceiptSchema,
    productSkuIndex: ProductSkuIndexSchema,
    members: MemberSchema,
    invitations: InvitationSchema,
    categories: CategorySchema,
    warehouses: WarehouseSchema,
    products: ProductSchema,
    stockBalances: StockBalanceSchema,
    productStockSummaries: ProductStockSummarySchema,
    stockMovements: StockMovementSchema,
    privatePartners: PrivatePartnerSchema,
    purchaseOrders: PurchaseOrderSchema,
    partnerCatalog: PartnerCatalogItemSchema,
    productMappings: ProductMappingSchema,
    connections: ConnectionProjectionSchema,
    auditLogs: AuditLogSchema,
  }[parts[2] ?? ''];
}

export function verifySchemas(snapshot: QaSnapshot): readonly string[] {
  const failures: string[] = [];
  for (const [path, data] of snapshot.documents) {
    if (classifyDocumentPath(path) === undefined) {
      failures.push(`UNCLASSIFIED_PATH ${path} is not in the coverage manifest`);
      continue;
    }
    const schema = schemaForQaPath(path);
    if (schema === undefined) {
      failures.push(`NO_SCHEMA ${path} has no registered QA schema`);
      continue;
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      failures.push(
        `INVALID_DOCUMENT ${path}: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      );
    }
  }
  return failures;
}

function orgOf(path: string): string | undefined {
  const parts = path.split('/');
  return parts[0] === 'organizations' ? parts[1] : undefined;
}

/**
 * The organization whose product and mapping ids an order's lines are written
 * in. For a private order that is the owning organization; for a connected one
 * it is always the buyer, on both projections and on the canonical record.
 */
function buyerOrgFor(snapshot: QaSnapshot, orderPath: string): string | undefined {
  const order = snapshot.documents.get(orderPath);
  if (order === undefined) return undefined;
  if (stringField(order, 'supplierKind') !== 'CONNECTED') return orgOf(orderPath);
  const declared = stringField(order, 'buyerOrgId');
  if (declared !== undefined) return declared;
  const connectionId = stringField(order, 'connectionId');
  if (connectionId === undefined) return undefined;
  const connection = snapshot.documents.get(`connections/${connectionId}`);
  return connection === undefined ? undefined : stringField(connection, 'buyerOrgId');
}

function stringField(data: DocumentData, key: string): string | undefined {
  const value: unknown = data[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Reference checks.
 *
 * Everything is resolved inside the document's own organization, with two
 * deliberate exceptions that are part of the network contract rather than
 * leaks: a purchase order line and a product mapping both carry the *supplier's*
 * `supplierCatalogItemId`, which by design only resolves in the supplier
 * organization named by the connection.
 */
export function verifyReferences(snapshot: QaSnapshot): readonly string[] {
  const failures: string[] = [];
  const has = (path: string): boolean => snapshot.documents.has(path);

  function require(sourcePath: string, label: string, targetPath: string): void {
    if (!has(targetPath)) {
      failures.push(`DANGLING_REFERENCE ${sourcePath} -> ${label} ${targetPath}`);
    }
  }

  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    const org = orgOf(path);
    const collection = org === undefined ? undefined : parts[2];

    if (parts[0] === 'users' && parts[2] === 'memberships') {
      const orgId = stringField(data, 'organizationId');
      if (orgId !== undefined) require(path, 'organization', `organizations/${orgId}`);
      continue;
    }

    if (parts[0] === 'users' && parts[2] === 'notifications') {
      const orgId = stringField(data, 'organizationId');
      const referenceId = stringField(data, 'referenceId');
      const referenceType = stringField(data, 'referenceType');
      if (orgId === undefined || referenceId === undefined || referenceType === undefined) continue;
      require(path, 'organization', `organizations/${orgId}`);
      if (referenceType === 'PRODUCT')
        require(path, 'product', `organizations/${orgId}/products/${referenceId}`);
      if (referenceType === 'PURCHASE_ORDER')
        require(path, 'purchaseOrder', `organizations/${orgId}/purchaseOrders/${referenceId}`);
      if (referenceType === 'MEMBERSHIP')
        require(path, 'member', `organizations/${orgId}/members/${referenceId}`);
      if (referenceType === 'CONNECTION')
        require(path, 'connection', `organizations/${orgId}/connections/${referenceId}`);
      continue;
    }

    if (org === undefined) continue;

    switch (collection) {
      case 'members': {
        const uid = stringField(data, 'uid');
        if (uid !== undefined) require(path, 'user', `users/${uid}`);
        break;
      }
      case 'invitations': {
        const orgId = stringField(data, 'organizationId');
        if (orgId !== undefined) require(path, 'organization', `organizations/${orgId}`);
        break;
      }
      case 'settings': {
        const warehouseId = stringField(data, 'defaultWarehouseId');
        if (warehouseId !== undefined)
          require(path, 'warehouse', `organizations/${org}/warehouses/${warehouseId}`);
        break;
      }
      case 'products': {
        const categoryId = stringField(data, 'categoryId');
        if (categoryId !== undefined)
          require(path, 'category', `organizations/${org}/categories/${categoryId}`);
        break;
      }
      case 'productSkuIndex': {
        const productId = stringField(data, 'productId');
        if (productId !== undefined)
          require(path, 'product', `organizations/${org}/products/${productId}`);
        break;
      }
      case 'stockBalances':
      case 'productStockSummaries': {
        const productId = stringField(data, 'productId');
        const warehouseId = stringField(data, 'warehouseId');
        if (productId !== undefined)
          require(path, 'product', `organizations/${org}/products/${productId}`);
        if (warehouseId !== undefined)
          require(path, 'warehouse', `organizations/${org}/warehouses/${warehouseId}`);
        break;
      }
      case 'stockMovements': {
        for (const [key, label] of [
          ['productId', 'product'],
          ['warehouseId', 'warehouse'],
          ['counterpartWarehouseId', 'warehouse'],
        ] as const) {
          const value = stringField(data, key);
          if (value === undefined) continue;
          const folder = label === 'product' ? 'products' : 'warehouses';
          require(path, label, `organizations/${org}/${folder}/${value}`);
        }
        const actorUid = stringField(data, 'actorUid');
        if (actorUid !== undefined)
          require(path, 'member', `organizations/${org}/members/${actorUid}`);
        const sourceType = stringField(data, 'sourceType');
        const sourceId = stringField(data, 'sourceId');
        if (
          sourceId !== undefined &&
          (sourceType === 'PRIVATE_PO' || sourceType === 'CONNECTED_PO')
        ) {
          require(path, 'purchaseOrder', `organizations/${org}/purchaseOrders/${sourceId}`);
        }
        break;
      }
      case 'purchaseOrders': {
        if (parts.length === 6) {
          // An order line names the *buyer's* product and mapping. On a private
          // order the buyer is the owning organization, but a connected order's
          // supplier projection mirrors the canonical line verbatim, buyer ids
          // included, so those resolve in the buyer's organization instead.
          const owner = buyerOrgFor(snapshot, parts.slice(0, 4).join('/')) ?? org;
          const buyerProductId = stringField(data, 'buyerProductId');
          const mappingId = stringField(data, 'mappingId');
          if (buyerProductId !== undefined)
            require(path, 'product', `organizations/${owner}/products/${buyerProductId}`);
          if (mappingId !== undefined)
            require(path, 'mapping', `organizations/${owner}/productMappings/${mappingId}`);
          break;
        }
        const supplierId = stringField(data, 'privateSupplierId');
        const warehouseId = stringField(data, 'receivingWarehouseId');
        const connectionId = stringField(data, 'connectionId');
        if (supplierId !== undefined)
          require(path, 'privatePartner', `organizations/${org}/privatePartners/${supplierId}`);
        if (warehouseId !== undefined)
          require(path, 'warehouse', `organizations/${org}/warehouses/${warehouseId}`);
        if (connectionId !== undefined)
          require(path, 'connection', `organizations/${org}/connections/${connectionId}`);
        break;
      }
      case 'partnerCatalog': {
        const sourceProductId = stringField(data, 'sourceProductId');
        if (sourceProductId !== undefined)
          require(path, 'product', `organizations/${org}/products/${sourceProductId}`);
        break;
      }
      case 'productMappings': {
        const buyerProductId = stringField(data, 'buyerProductId');
        const supplierOrgId = stringField(data, 'supplierOrgId');
        const catalogItemId = stringField(data, 'supplierCatalogItemId');
        const connectionId = stringField(data, 'connectionId');
        if (buyerProductId !== undefined)
          require(path, 'product', `organizations/${org}/products/${buyerProductId}`);
        if (connectionId !== undefined)
          require(path, 'connection', `organizations/${org}/connections/${connectionId}`);
        // Cross-organization by contract: the catalog item belongs to the supplier.
        if (supplierOrgId !== undefined && catalogItemId !== undefined) {
          require(path, 'supplierCatalogItem', `organizations/${supplierOrgId}/partnerCatalog/${catalogItemId}`);
        }
        break;
      }
      case 'connections': {
        for (const key of ['buyerOrgId', 'supplierOrgId'] as const) {
          const value = stringField(data, key);
          if (value !== undefined) require(path, key, `organizations/${value}`);
        }
        break;
      }
      default:
        break;
    }
  }

  // Canonical connected order lines carry the buyer's product and mapping ids.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'connectedPurchaseOrders' || parts[2] !== 'items') continue;
    const owner = buyerOrgFor(snapshot, parts.slice(0, 2).join('/'));
    if (owner === undefined) continue;
    const buyerProductId = stringField(data, 'buyerProductId');
    const mappingId = stringField(data, 'mappingId');
    if (buyerProductId !== undefined)
      require(path, 'product', `organizations/${owner}/products/${buyerProductId}`);
    if (mappingId !== undefined)
      require(path, 'mapping', `organizations/${owner}/productMappings/${mappingId}`);
  }

  // Canonical connected orders and connections live outside any organization.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'connections' && parts[0] !== 'connectedPurchaseOrders') continue;
    if (parts.length !== 2) continue;
    for (const key of ['buyerOrgId', 'supplierOrgId'] as const) {
      const value = stringField(data, key);
      if (value !== undefined) require(path, key, `organizations/${value}`);
    }
    const connectionId = stringField(data, 'connectionId');
    if (parts[0] === 'connectedPurchaseOrders' && connectionId !== undefined) {
      require(path, 'canonicalConnection', `connections/${connectionId}`);
    }
  }

  return failures;
}
