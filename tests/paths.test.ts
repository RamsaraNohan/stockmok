import { describe, expect, it } from 'vitest';
import { paths } from '../packages/shared/src/paths.js';
import { serverPaths } from '../packages/shared/src/server/paths.js';

describe('Firestore path builders', () => {
  it('builds every Zone 1-3 path deterministically', () => {
    const built = [
      paths.organizationDirectory('handle'),
      paths.user('uid'),
      paths.membership('uid', 'org'),
      paths.notification('uid', 'notification'),
      paths.organization('org'),
      paths.settings('org'),
      paths.counter('org', 'counter'),
      paths.commandReceipt('org', 'operation'),
      paths.productSkuIndex('org', 'sku'),
      paths.member('org', 'uid'),
      paths.invitation('org', 'invite'),
      paths.category('org', 'category'),
      paths.warehouse('org', 'warehouse'),
      paths.product('org', 'product'),
      paths.stockBalance('org', 'product', 'warehouse'),
      paths.productStockSummary('org', 'product'),
      paths.stockMovement('org', 'movement'),
      paths.privatePartner('org', 'partner'),
      paths.purchaseOrder('org', 'po'),
      paths.purchaseOrderItem('org', 'po', 'item'),
      paths.purchaseOrderHistory('org', 'po', 'history'),
      paths.partnerCatalogItem('org', 'catalog'),
      paths.productMapping('org', 'mapping'),
      paths.connectionProjection('org', 'connection'),
      paths.auditLog('org', 'audit'),
    ];
    expect(new Set(built).size).toBe(built.length);
    expect(paths.stockBalance('org', 'product', 'warehouse')).toBe(
      'organizations/org/stockBalances/product__warehouse',
    );
  });

  it('builds every Zone-4 path only from the server module', () => {
    expect(serverPaths.handleReservation('handle')).toBe('handleReservations/handle');
    expect(serverPaths.canonicalConnection('buyer', 'supplier')).toBe(
      'connections/buyer__supplier',
    );
    expect(serverPaths.connectedPurchaseOrder('po')).toBe('connectedPurchaseOrders/po');
    expect(serverPaths.connectedPurchaseOrderItem('po', 'item')).toBe(
      'connectedPurchaseOrders/po/items/item',
    );
    expect(serverPaths.connectedPurchaseOrderHistory('po', 'history')).toBe(
      'connectedPurchaseOrders/po/history/history',
    );
  });

  it('rejects empty or slash-containing segments in every boundary', () => {
    expect(() => paths.user('')).toThrow();
    expect(() => paths.product('org', 'bad/id')).toThrow();
    expect(() => serverPaths.canonicalConnection('bad/id', 'supplier')).toThrow();
  });
});
