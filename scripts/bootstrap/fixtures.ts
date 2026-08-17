import { Timestamp } from 'firebase-admin/firestore';
import type { Role, Unit } from '../../packages/shared/src/primitives.js';

export const IDS = {
  grandOrg: 'grand-ocean-org',
  freshOrg: 'fresh-foods-org',
  mainWarehouse: 'main-store',
  coldWarehouse: 'cold-room',
  freshWarehouse: 'supplier-stock',
  connection: 'grand-ocean-org__fresh-foods-org',
  mapping: 'mapping-ckn-b5-meat-001',
  privatePartner: 'green-farm',
  privatePo: 'po-2026-001',
  connectedPo: 'cpo-2026-003',
} as const;

export const CLOCK = {
  t0: Timestamp.fromDate(new Date('2026-08-01T09:00:00.000Z')),
  adjustment: Timestamp.fromDate(new Date('2026-08-03T09:00:00.000Z')),
  privateFirst: Timestamp.fromDate(new Date('2026-08-04T09:00:00.000Z')),
  privateSecond: Timestamp.fromDate(new Date('2026-08-07T09:00:00.000Z')),
  connectedShip: Timestamp.fromDate(new Date('2026-08-11T08:00:00.000Z')),
  connectedFirst: Timestamp.fromDate(new Date('2026-08-11T09:00:00.000Z')),
  connectedSecond: Timestamp.fromDate(new Date('2026-08-12T09:00:00.000Z')),
} as const;

export interface ProductFixture {
  readonly sku: string;
  readonly name: string;
  readonly categoryId: string;
  readonly unit: Unit;
  readonly minimum: number;
  readonly costMinor: number;
  readonly opening: number;
  readonly warehouseId: string;
}

export const GRAND_PRODUCTS: readonly ProductFixture[] = [
  {
    sku: 'MEAT-001',
    name: 'Chicken Breast',
    categoryId: 'meat',
    unit: 'KG',
    minimum: 20,
    costMinor: 125_000,
    opening: 18,
    warehouseId: IDS.coldWarehouse,
  },
  {
    sku: 'MEAT-002',
    name: 'Beef Mince',
    categoryId: 'meat',
    unit: 'KG',
    minimum: 15,
    costMinor: 210_000,
    opening: 40,
    warehouseId: IDS.coldWarehouse,
  },
  {
    sku: 'MEAT-003',
    name: 'Fish Fillet',
    categoryId: 'meat',
    unit: 'KG',
    minimum: 12,
    costMinor: 185_000,
    opening: 10,
    warehouseId: IDS.coldWarehouse,
  },
  {
    sku: 'DAIR-001',
    name: 'Fresh Milk',
    categoryId: 'dairy',
    unit: 'L',
    minimum: 50,
    costMinor: 38_000,
    opening: 120,
    warehouseId: IDS.coldWarehouse,
  },
  {
    sku: 'DAIR-002',
    name: 'Butter Block',
    categoryId: 'dairy',
    unit: 'KG',
    minimum: 10,
    costMinor: 260_000,
    opening: 8,
    warehouseId: IDS.coldWarehouse,
  },
  {
    sku: 'DAIR-003',
    name: 'Cheddar Cheese',
    categoryId: 'dairy',
    unit: 'KG',
    minimum: 8,
    costMinor: 320_000,
    opening: 25,
    warehouseId: IDS.coldWarehouse,
  },
  {
    sku: 'DRY-001',
    name: 'Basmati Rice',
    categoryId: 'dry-goods',
    unit: 'KG',
    minimum: 100,
    costMinor: 42_000,
    opening: 250,
    warehouseId: IDS.mainWarehouse,
  },
  {
    sku: 'DRY-002',
    name: 'Wheat Flour',
    categoryId: 'dry-goods',
    unit: 'KG',
    minimum: 80,
    costMinor: 21_000,
    opening: 60,
    warehouseId: IDS.mainWarehouse,
  },
  {
    sku: 'DRY-003',
    name: 'Sugar',
    categoryId: 'dry-goods',
    unit: 'KG',
    minimum: 60,
    costMinor: 26_000,
    opening: 300,
    warehouseId: IDS.mainWarehouse,
  },
  {
    sku: 'DRY-004',
    name: 'Cooking Oil',
    categoryId: 'dry-goods',
    unit: 'L',
    minimum: 40,
    costMinor: 69_000,
    opening: 0,
    warehouseId: IDS.mainWarehouse,
  },
  {
    sku: 'BEV-001',
    name: 'Bottled Water 1L',
    categoryId: 'beverages',
    unit: 'EACH',
    minimum: 200,
    costMinor: 9_000,
    opening: 600,
    warehouseId: IDS.mainWarehouse,
  },
  {
    sku: 'BEV-002',
    name: 'Orange Juice 1L',
    categoryId: 'beverages',
    unit: 'EACH',
    minimum: 60,
    costMinor: 48_000,
    opening: 90,
    warehouseId: IDS.mainWarehouse,
  },
] as const;

export const TEAM: readonly { uid: string; displayName: string; email: string; role: Role }[] = [
  {
    uid: 'grand-owner',
    displayName: 'Nohan Fernando',
    email: 'owner@grand-ocean.stockmok.test',
    role: 'OWNER',
  },
  {
    uid: 'grand-admin',
    displayName: 'Grand Ocean Admin',
    email: 'admin@grand-ocean.stockmok.test',
    role: 'ADMIN',
  },
  {
    uid: 'grand-inventory',
    displayName: 'Nimal Perera',
    email: 'inventory@grand-ocean.stockmok.test',
    role: 'INVENTORY_MANAGER',
  },
  {
    uid: 'grand-procurement',
    displayName: 'Grand Ocean Procurement Manager',
    email: 'procurement@grand-ocean.stockmok.test',
    role: 'PROCUREMENT_MANAGER',
  },
  {
    uid: 'grand-storekeeper',
    displayName: 'Grand Ocean Storekeeper',
    email: 'storekeeper@grand-ocean.stockmok.test',
    role: 'STOREKEEPER',
  },
  {
    uid: 'grand-analyst',
    displayName: 'Grand Ocean Analyst',
    email: 'analyst@grand-ocean.stockmok.test',
    role: 'ANALYST',
  },
  {
    uid: 'grand-viewer',
    displayName: 'Grand Ocean Viewer',
    email: 'viewer@grand-ocean.stockmok.test',
    role: 'VIEWER',
  },
] as const;

export const productId = (sku: string): string => sku.toLowerCase();
