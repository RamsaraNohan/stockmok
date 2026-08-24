import type { DocumentData } from 'firebase-admin/firestore';

import { convertMilli } from '../../../packages/shared/src/domain.js';
import type { QaSnapshot } from './integrity.js';

/**
 * Connected-network reconciliation.
 *
 * A submitted connected order exists three times: once canonically and once in
 * each organization. This verifier proves the three agree, that `isProjection`
 * follows the production rule, that a DRAFT has neither a canonical record nor a
 * supplier projection, and that supplier-to-buyer unit conversion round-trips
 * through the factor snapshot the line itself carries.
 */

function numberField(data: DocumentData, key: string): number | undefined {
  const value: unknown = data[key];
  return typeof value === 'number' ? value : undefined;
}

function stringField(data: DocumentData, key: string): string | undefined {
  const value: unknown = data[key];
  return typeof value === 'string' ? value : undefined;
}

function boolField(data: DocumentData, key: string): boolean | undefined {
  const value: unknown = data[key];
  return typeof value === 'boolean' ? value : undefined;
}

const SHARED_CONNECTION_FIELDS = [
  'connectionId',
  'buyerOrgId',
  'supplierOrgId',
  'buyerHandle',
  'buyerName',
  'supplierHandle',
  'supplierName',
  'status',
  'requestedByUid',
] as const;

const SHARED_ORDER_FIELDS = [
  'status',
  'totalMinor',
  'orderNumber',
  'connectionId',
  'currency',
] as const;

export function verifyNetwork(snapshot: QaSnapshot): readonly string[] {
  const failures: string[] = [];

  // Connection projections must mirror the canonical record.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'connections' || parts.length !== 4) continue;
    const connectionId = parts[3];
    if (connectionId === undefined) continue;
    const canonical = snapshot.documents.get(`connections/${connectionId}`);
    if (canonical === undefined) {
      failures.push(`NETWORK_RECONCILIATION ${path} has no canonical connection`);
      continue;
    }
    for (const field of SHARED_CONNECTION_FIELDS) {
      const projected: unknown = data[field];
      const authority: unknown = canonical[field];
      if (projected !== authority) {
        failures.push(
          `NETWORK_RECONCILIATION ${path} ${field}=${String(projected)} disagrees with canonical ${String(authority)}`,
        );
      }
    }
  }

  // Count numbered connected orders per connection, from the canonical records.
  const numberedByConnection = new Map<string, number>();
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'connectedPurchaseOrders' || parts.length !== 2) continue;
    const connectionId = stringField(data, 'connectionId');
    if (connectionId === undefined) continue;
    if (stringField(data, 'orderNumber') !== undefined) {
      numberedByConnection.set(connectionId, (numberedByConnection.get(connectionId) ?? 0) + 1);
    }
    if (boolField(data, 'isProjection') !== false) {
      failures.push(
        `NETWORK_RECONCILIATION ${path} canonical record must carry isProjection=false`,
      );
    }

    const buyerOrgId = stringField(data, 'buyerOrgId');
    const supplierOrgId = stringField(data, 'supplierOrgId');
    const purchaseOrderId = parts[1];
    if (buyerOrgId === undefined || supplierOrgId === undefined || purchaseOrderId === undefined)
      continue;

    for (const [org, expectedRole] of [
      [buyerOrgId, 'BUYER'],
      [supplierOrgId, 'SUPPLIER'],
    ] as const) {
      const projectionPath = `organizations/${org}/purchaseOrders/${purchaseOrderId}`;
      const projection = snapshot.documents.get(projectionPath);
      if (projection === undefined) {
        failures.push(
          `NETWORK_RECONCILIATION ${path} has no ${expectedRole} projection at ${projectionPath}`,
        );
        continue;
      }
      if (stringField(projection, 'viewRole') !== expectedRole) {
        failures.push(
          `NETWORK_RECONCILIATION ${projectionPath} should carry viewRole=${expectedRole}`,
        );
      }
      if (boolField(projection, 'isProjection') !== true) {
        failures.push(`NETWORK_RECONCILIATION ${projectionPath} must carry isProjection=true`);
      }
      for (const field of SHARED_ORDER_FIELDS) {
        const projected: unknown = projection[field];
        const authority: unknown = data[field];
        if (projected !== authority) {
          failures.push(
            `NETWORK_RECONCILIATION ${projectionPath} ${field}=${String(projected)} disagrees with canonical ${String(authority)}`,
          );
        }
      }
    }
  }

  // A connected DRAFT lives only on the buyer side and has no canonical record.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'purchaseOrders' || parts.length !== 4)
      continue;
    if (stringField(data, 'supplierKind') !== 'CONNECTED') continue;
    const purchaseOrderId = parts[3];
    if (purchaseOrderId === undefined) continue;
    const status = stringField(data, 'status');
    const canonicalExists = snapshot.documents.has(`connectedPurchaseOrders/${purchaseOrderId}`);

    if (status === 'DRAFT') {
      if (canonicalExists) {
        failures.push(`NETWORK_RECONCILIATION ${path} is a DRAFT with a canonical record`);
      }
      if (stringField(data, 'viewRole') !== 'BUYER') {
        failures.push(
          `NETWORK_RECONCILIATION ${path} is a connected DRAFT outside the buyer organization`,
        );
      }
      if (boolField(data, 'isProjection') !== false) {
        failures.push(
          `NETWORK_RECONCILIATION ${path} is a DRAFT and projects nothing, so isProjection must be false`,
        );
      }
    } else if (!canonicalExists) {
      failures.push(`NETWORK_RECONCILIATION ${path} is ${String(status)} with no canonical record`);
    }
  }

  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'connections' || parts.length !== 4) continue;
    const connectionId = parts[3];
    if (connectionId === undefined) continue;
    const actual = numberField(data, 'ordersPlacedCount');
    const expected = numberedByConnection.get(connectionId) ?? 0;
    if (actual !== expected) {
      failures.push(
        `NETWORK_RECONCILIATION ${path} ordersPlacedCount=${String(actual)} but ${String(expected)} connected orders carry a number`,
      );
    }
  }

  // Unit conversion must round-trip through the factor the line carries.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    const isOrgLine = parts[0] === 'organizations' && parts[4] === 'items';
    const isCanonicalLine = parts[0] === 'connectedPurchaseOrders' && parts[2] === 'items';
    if (!isOrgLine && !isCanonicalLine) continue;

    const factor = numberField(data, 'supplierToBuyerBaseFactorMilliSnapshot');
    if (factor === undefined) continue;
    if (factor <= 0) {
      failures.push(`NETWORK_RECONCILIATION ${path} carries a non-positive conversion factor`);
      continue;
    }
    for (const [supplierKey, buyerKey] of [
      ['orderedSupplierMilli', 'orderedBuyerBaseMilli'],
      ['receivedSupplierMilli', 'receivedBuyerBaseMilli'],
    ] as const) {
      const supplierValue = numberField(data, supplierKey);
      const buyerValue = numberField(data, buyerKey);
      if (supplierValue === undefined || buyerValue === undefined) continue;
      const expected = convertMilli(supplierValue, factor);
      if (buyerValue !== expected) {
        failures.push(
          `NETWORK_RECONCILIATION ${path} ${buyerKey}=${String(buyerValue)} but converting ${supplierKey} gives ${String(expected)}`,
        );
      }
    }
  }

  // Mappings must be usable: a verified status and a positive factor.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'productMappings' || parts.length !== 4)
      continue;
    const factor = numberField(data, 'supplierToBuyerBaseFactorMilli');
    if (factor === undefined || factor <= 0) {
      failures.push(`NETWORK_RECONCILIATION ${path} has a non-positive conversion factor`);
    }
    const status = stringField(data, 'status');
    if (status !== 'VERIFIED' && status !== 'DISABLED') {
      failures.push(
        `NETWORK_RECONCILIATION ${path} has an unexpected mapping status ${String(status)}`,
      );
    }
  }

  return failures;
}
