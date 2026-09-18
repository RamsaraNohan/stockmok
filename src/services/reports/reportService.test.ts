import type { ProductStockSummary, PurchaseOrder } from '@stockmok/shared';
import { describe, expect, it, vi } from 'vitest';

import {
  buildStockReportCsv,
  buildPurchaseOrderReportCsv,
  groupStockReportRows,
  loadPurchaseOrderReportPage,
  loadPurchaseOrderStatusCounts,
  loadStockOnHandPage,
  loadStockReportFilterOptions,
} from './reportService';

function stockRow(
  productId: string,
  productName: string,
  categoryId: string,
  stockValueMinor: number,
): ProductStockSummary {
  return {
    productId,
    productName,
    internalSku: `SKU-${productId}`,
    internalSkuNormalized: `sku-${productId}`,
    categoryId,
    productStatus: 'ACTIVE',
    baseUnitPriceMinor: 125_000,
    productUpdatedAt: {} as ProductStockSummary['productUpdatedAt'],
    onHandMilli: 120_000,
    reservedMilli: 0,
    availableMilli: 120_000,
    minimumStockMilli: 10_000,
    stockStatus: 'IN_STOCK',
    stockValueMinor,
    shortfallMilli: 0,
    unit: 'KG',
    updatedAt: {} as ProductStockSummary['updatedAt'],
  } as unknown as ProductStockSummary;
}

function repositories() {
  return {
    inventory: {
      listCategories: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      listWarehouses: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      listProducts: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    },
    reports: {
      listStockOnHand: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      listStockOnHandByCategory: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      listPurchaseOrders: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      countStatusFamilies: vi.fn().mockResolvedValue([
        { queryId: 'Q-085', count: 2 },
        { queryId: 'Q-086', count: 3 },
        { queryId: 'Q-087', count: 4 },
        { queryId: 'Q-088', count: 5 },
        { queryId: 'Q-089', count: 6 },
      ]),
    },
    raw: { aggregate: vi.fn().mockResolvedValue({ count: 7 }) },
  } as unknown as Parameters<typeof loadStockOnHandPage>[0];
}

describe('reportService', () => {
  it('loads Q-016 and Q-017 filter options through the repositories', async () => {
    const data = repositories();

    await loadStockReportFilterOptions(data);

    expect(data.inventory.listCategories).toHaveBeenCalledWith('ACTIVE');
    expect(data.inventory.listWarehouses).toHaveBeenCalledWith('ACTIVE');
  });

  it('uses Q-061 for the default bounded product-level report', async () => {
    const data = repositories();

    await loadStockOnHandPage(data, {}, { limit: 25 });

    expect(data.reports.listStockOnHand).toHaveBeenCalledWith({ limit: 25 });
    expect(data.inventory.listProducts).not.toHaveBeenCalled();
  });

  it('uses Q-061b for category order and narrows only its bounded page', async () => {
    const data = repositories();
    const meat = stockRow('meat', 'Chicken Breast', 'meat-category', 15_000_000);
    const dairy = stockRow('dairy', 'Fresh Milk', 'dairy-category', 2_000_000);
    vi.mocked(data.reports.listStockOnHandByCategory).mockResolvedValue({
      items: [meat, dairy],
      nextCursor: null,
    });

    const result = await loadStockOnHandPage(data, { categoryId: 'meat-category' });

    expect(data.reports.listStockOnHandByCategory).toHaveBeenCalledWith({ limit: 25 });
    expect(result.items).toEqual([meat]);
  });

  it('uses the exact warehouse matrix shapes without exposing forbidden report sorts', async () => {
    const data = repositories();

    await loadStockOnHandPage(data, { warehouseId: 'cold-room' }, { limit: 100 });
    await loadStockOnHandPage(
      data,
      { warehouseId: 'cold-room', categoryId: 'meat-category' },
      { limit: 25 },
    );

    expect(data.inventory.listProducts).toHaveBeenNthCalledWith(1, {
      productStatus: 'ACTIVE',
      warehouseId: 'cold-room',
      sort: 'name',
      limit: 100,
    });
    expect(data.inventory.listProducts).toHaveBeenNthCalledWith(2, {
      productStatus: 'ACTIVE',
      warehouseId: 'cold-room',
      categoryId: 'meat-category',
      sort: 'name',
      limit: 25,
    });
  });

  it('derives category subtotals and exports exactly the supplied authorized rows', () => {
    const chicken = stockRow('meat-001', 'Chicken, Breast', 'meat-category', 15_000_000);
    const beef = stockRow('meat-002', 'Beef', 'meat-category', 5_000_000);
    const categories = [{ categoryId: 'meat-category', name: 'Meat' }] as unknown as Parameters<
      typeof groupStockReportRows
    >[1];

    const groups = groupStockReportRows([chicken, beef], categories);
    const csv = buildStockReportCsv([chicken], categories);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.stockValueMinor).toBe(20_000_000);
    expect(csv).toContain('Product,SKU,Category,On hand,Unit cost,Stock value');
    expect(csv).toContain('"Chicken, Breast"');
    expect(csv).not.toContain('Beef');
  });

  it('uses Q-062 status-family filters and keeps kind/date filters server-side', async () => {
    const data = repositories();
    const from = { marker: 'from' };
    const to = { marker: 'to' };

    await loadPurchaseOrderReportPage(
      data,
      { statusFamily: 'ACTIVE', supplierKind: 'CONNECTED', from, to },
      { limit: 25 },
    );

    expect(data.reports.listPurchaseOrders).toHaveBeenCalledWith(
      ['ACCEPTED', 'SHIPPED', 'PARTIALLY_RECEIVED'],
      { supplierKind: 'CONNECTED', from, to },
      { limit: 25 },
    );
  });

  it('builds the complete distribution from Q-085 through Q-089, not page rows', async () => {
    const data = repositories();

    const counts = await loadPurchaseOrderStatusCounts(data, { supplierKind: 'PRIVATE' });

    expect(data.reports.countStatusFamilies).toHaveBeenCalledWith(
      [
        ['DRAFT'],
        ['ORDERED', 'SUBMITTED'],
        ['ACCEPTED', 'SHIPPED', 'PARTIALLY_RECEIVED'],
        ['RECEIVED'],
        ['REJECTED', 'CANCELLED'],
      ],
      { supplierKind: 'PRIVATE' },
    );
    expect(counts.map(({ count }) => count)).toEqual([2, 3, 4, 5, 6]);
    expect(data.reports.listPurchaseOrders).not.toHaveBeenCalled();
  });

  it('issues one valid aggregation for a selected family and derives disjoint zeros', async () => {
    const data = repositories();

    const counts = await loadPurchaseOrderStatusCounts(data, {
      statusFamily: 'CANCELLED',
      supplierKind: 'CONNECTED',
    });

    expect(data.raw.aggregate).toHaveBeenCalledWith('Q-089', {
      statusFamily: ['REJECTED', 'CANCELLED'],
      supplierKind: 'CONNECTED',
    });
    expect(counts.map(({ count }) => count)).toEqual([0, 0, 0, 0, 7]);
    expect(data.reports.countStatusFamilies).not.toHaveBeenCalled();
  });

  it('exports only supplied authorized purchase-order rows with exact report fields', () => {
    const timestamp = {
      toDate: () => new Date('2026-08-20T00:00:00.000Z'),
    } as PurchaseOrder['createdAt'];
    const order = {
      purchaseOrderId: 'po-1',
      orderNumber: 'PO-0042',
      counterpartyName: 'Green Farm, Poultry',
      supplierKind: 'PRIVATE',
      status: 'ORDERED',
      totalMinor: 6_000_000,
      currency: 'LKR',
      createdAt: timestamp,
      expectedDate: timestamp,
    } as PurchaseOrder;

    const csv = buildPurchaseOrderReportCsv([order]);

    expect(csv).toContain('PO Number,Counterparty,Kind,Status,Total,Currency,Created,Expected');
    expect(csv).toContain('PO-0042,"Green Farm, Poultry",Private,ORDERED,60000.00,LKR');
  });
});
