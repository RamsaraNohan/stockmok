import { describe, expect, it } from 'vitest';

import { DEFAULT_RANDOM_SEED, PROFILES } from '../../scripts/qa/config.js';
import { collectAuthUsers } from '../../scripts/qa/dataset.js';
import { connectedNetworkPlans } from '../../scripts/qa/generators/network.js';
import { buildPlan } from '../../scripts/qa/generators/organizations.js';
import { privateProcurementPlan } from '../../scripts/qa/generators/procurement.js';

const plan = buildPlan(PROFILES.wide, DEFAULT_RANDOM_SEED);
const normal = plan.organizations.filter((org) => org.specialKind === undefined);

describe('QA Wide profile', () => {
  it('builds exactly 50 Wide and six named Special organizations', () => {
    expect(normal).toHaveLength(50);
    expect(plan.organizations.filter((org) => org.specialKind !== undefined)).toHaveLength(6);
    expect(new Set(plan.organizations.map((org) => org.specialKind).filter(Boolean))).toEqual(
      new Set(['EMPTY', 'TINY', 'LOW_STOCK', 'ARCHIVED', 'NETWORK_OFF', 'HIGH_VOLUME']),
    );
  });

  it('meets every normal organization cardinality target', () => {
    for (const org of normal) {
      expect(org.users, `${org.orgId} members`).toHaveLength(20);
      expect(org.categories, `${org.orgId} categories`).toHaveLength(24);
      expect(org.warehouses, `${org.orgId} warehouses`).toHaveLength(20);
      expect(org.products, `${org.orgId} products`).toHaveLength(120);
      expect(
        org.products.reduce((sum, product) => sum + product.warehouseIds.length, 0),
        `${org.orgId} balances`,
      ).toBeGreaterThanOrEqual(300);
      const orders = privateProcurementPlan(org);
      expect(orders, `${org.orgId} private orders`).toHaveLength(50);
      expect(orders.every((order) => order.lines.length === 5)).toBe(true);
    }
  });

  it('gives every normal organization 20 relationships, 40 mappings, and 30 buyer orders', () => {
    const networks = connectedNetworkPlans(plan);
    expect(networks).toHaveLength(500);
    for (const org of normal) {
      const relationships = networks.filter(
        (network) => network.buyer.orgId === org.orgId || network.supplier.orgId === org.orgId,
      );
      const buying = networks.filter((network) => network.buyer.orgId === org.orgId);
      expect(relationships, `${org.orgId} relationships`).toHaveLength(20);
      expect(
        buying.reduce((sum, network) => sum + network.mappings.length, 0),
        `${org.orgId} mappings`,
      ).toBe(40);
      expect(
        buying.reduce((sum, network) => sum + network.orders.length, 0),
        `${org.orgId} connected orders`,
      ).toBe(30);
    }
  });

  it('covers all roles and all required unread boundaries', () => {
    expect(collectAuthUsers(plan)).toHaveLength(1083);
    expect(new Set(normal.flatMap((org) => org.users.map((user) => user.role))).size).toBe(7);
    const unread = new Set(
      plan.organizations.flatMap((org) => org.users.map((user) => user.unreadNotifications)),
    );
    for (const boundary of [0, 1, 5, 20, 49, 50, 51, 75]) expect(unread.has(boundary)).toBe(true);
  });
});
