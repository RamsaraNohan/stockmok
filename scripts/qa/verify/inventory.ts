import type { DocumentData } from 'firebase-admin/firestore';

import {
  deriveShortfall,
  deriveStockStatus,
  deriveStockValueMinor,
} from '../../../packages/shared/src/domain.js';
import type { QaSnapshot } from './integrity.js';

/**
 * Inventory reconciliation.
 *
 * Every derived field on a balance and a summary is recomputed here with the
 * same production helpers the writer used, then compared. That does not prove
 * the helper is right - it proves no fixture drifted away from it, and that the
 * two read models agree with each other.
 */

function numberField(data: DocumentData, key: string): number | undefined {
  const value: unknown = data[key];
  return typeof value === 'number' ? value : undefined;
}

function stringField(data: DocumentData, key: string): string | undefined {
  const value: unknown = data[key];
  return typeof value === 'string' ? value : undefined;
}

function compare(
  failures: string[],
  path: string,
  label: string,
  actual: unknown,
  expected: unknown,
): void {
  if (actual !== expected) {
    failures.push(
      `INVENTORY_RECONCILIATION ${path} ${label}: actual=${String(actual)} expected=${String(expected)}`,
    );
  }
}

export function verifyInventory(snapshot: QaSnapshot): readonly string[] {
  const failures: string[] = [];

  // productId -> summed on-hand across that product's balances.
  const balanceTotals = new Map<string, number>();

  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'stockBalances' || parts.length !== 4)
      continue;
    const org = parts[1];
    const productId = stringField(data, 'productId');
    const onHandMilli = numberField(data, 'onHandMilli');
    const minimumStockMilli = numberField(data, 'minimumStockMilli');
    const baseUnitPriceMinor = numberField(data, 'baseUnitPriceMinor');
    if (
      org === undefined ||
      productId === undefined ||
      onHandMilli === undefined ||
      minimumStockMilli === undefined ||
      baseUnitPriceMinor === undefined
    ) {
      failures.push(`INVENTORY_RECONCILIATION ${path} is missing a reconciliation field`);
      continue;
    }

    compare(
      failures,
      path,
      'stockStatus',
      stringField(data, 'stockStatus'),
      deriveStockStatus(onHandMilli, minimumStockMilli),
    );
    compare(
      failures,
      path,
      'shortfallMilli',
      numberField(data, 'shortfallMilli'),
      deriveShortfall(minimumStockMilli, onHandMilli),
    );
    compare(
      failures,
      path,
      'stockValueMinor',
      numberField(data, 'stockValueMinor'),
      deriveStockValueMinor(onHandMilli, baseUnitPriceMinor),
    );

    const key = `${org}|${productId}`;
    balanceTotals.set(key, (balanceTotals.get(key) ?? 0) + onHandMilli);

    // Snapshot fields must match the live product they were copied from.
    const product = snapshot.documents.get(`organizations/${org}/products/${productId}`);
    if (product === undefined) continue;
    compare(
      failures,
      path,
      'productName',
      stringField(data, 'productName'),
      stringField(product, 'name'),
    );
    compare(
      failures,
      path,
      'internalSku',
      stringField(data, 'internalSku'),
      stringField(product, 'internalSku'),
    );
    compare(
      failures,
      path,
      'categoryId',
      stringField(data, 'categoryId'),
      stringField(product, 'categoryId'),
    );
    compare(
      failures,
      path,
      'productStatus',
      stringField(data, 'productStatus'),
      stringField(product, 'status'),
    );
    compare(
      failures,
      path,
      'baseUnitPriceMinor',
      baseUnitPriceMinor,
      numberField(product, 'purchaseCostMinor'),
    );
    compare(
      failures,
      path,
      'minimumStockMilli',
      minimumStockMilli,
      numberField(product, 'minimumStockMilli'),
    );
    compare(failures, path, 'unit', stringField(data, 'unit'), stringField(product, 'baseUnit'));
  }

  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'productStockSummaries' || parts.length !== 4)
      continue;
    const org = parts[1];
    const productId = stringField(data, 'productId');
    const onHandMilli = numberField(data, 'onHandMilli');
    const minimumStockMilli = numberField(data, 'minimumStockMilli');
    const baseUnitPriceMinor = numberField(data, 'baseUnitPriceMinor');
    if (
      org === undefined ||
      productId === undefined ||
      onHandMilli === undefined ||
      minimumStockMilli === undefined ||
      baseUnitPriceMinor === undefined
    ) {
      failures.push(`INVENTORY_RECONCILIATION ${path} is missing a reconciliation field`);
      continue;
    }

    const expectedTotal = balanceTotals.get(`${org}|${productId}`) ?? 0;
    compare(failures, path, 'onHandMilli vs sum(stockBalances)', onHandMilli, expectedTotal);
    compare(failures, path, 'availableMilli', numberField(data, 'availableMilli'), onHandMilli);
    compare(failures, path, 'reservedMilli', numberField(data, 'reservedMilli'), 0);
    compare(
      failures,
      path,
      'stockStatus',
      stringField(data, 'stockStatus'),
      deriveStockStatus(onHandMilli, minimumStockMilli),
    );
    compare(
      failures,
      path,
      'shortfallMilli',
      numberField(data, 'shortfallMilli'),
      deriveShortfall(minimumStockMilli, onHandMilli),
    );
    compare(
      failures,
      path,
      'stockValueMinor',
      numberField(data, 'stockValueMinor'),
      deriveStockValueMinor(onHandMilli, baseUnitPriceMinor),
    );

    const product = snapshot.documents.get(`organizations/${org}/products/${productId}`);
    if (product === undefined) continue;
    compare(
      failures,
      path,
      'productName',
      stringField(data, 'productName'),
      stringField(product, 'name'),
    );
    compare(
      failures,
      path,
      'productStatus',
      stringField(data, 'productStatus'),
      stringField(product, 'status'),
    );
    compare(failures, path, 'unit', stringField(data, 'unit'), stringField(product, 'baseUnit'));
  }

  return failures;
}
