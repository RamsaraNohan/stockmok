import type {
  LifecycleStatus,
  Role,
  StockStatus,
  Unit,
  WarehouseType,
} from '../../../packages/shared/src/primitives.js';
import { DATASET_VERSION, FIXTURE_EPOCH, type ProfileDefinition } from '../config.js';
import type {
  QaCategory,
  QaOrg,
  QaPlan,
  QaProduct,
  QaSpecialKind,
  QaUser,
  QaWarehouse,
} from '../dataset.js';
import { ordinal } from '../deterministic.js';

/**
 * Builds the logical plan: who exists, what they own, and what shape their
 * inventory takes. Nothing here touches Firestore.
 *
 * Tenant-isolation traps are built in deliberately and are *schema-valid*:
 * category ids, warehouse ids, and a block of product identities are identical
 * across organizations, while every document still lives under its own tenant
 * path and every reference stays inside its own organization. A query that
 * forgets its org boundary returns the wrong tenant's row; a query that keeps it
 * cannot tell the difference. No invalid cross-tenant reference is ever written.
 */

const ROLES: readonly Role[] = [
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
  'PROCUREMENT_MANAGER',
  'STOREKEEPER',
  'ANALYST',
  'VIEWER',
];

/**
 * Display names repeat across organizations on purpose - another confusable
 * identity that a missing tenant filter would surface.
 */
const ROLE_PEOPLE: Readonly<Record<Role, string>> = {
  OWNER: 'Dana Owner',
  ADMIN: 'Alex Admin',
  INVENTORY_MANAGER: 'Ivy Inventory',
  PROCUREMENT_MANAGER: 'Pat Procurement',
  STOREKEEPER: 'Sam Storekeeper',
  ANALYST: 'Ana Analyst',
  VIEWER: 'Val Viewer',
};

/**
 * Q-005 exposes an unread count through an exact aggregate (Transport A) and a
 * `limit(50)` listener that reports `isCapped` (Transport B). The interesting
 * values are therefore 0, 1, 49, 50 and 51, and the alpha organization carries
 * all five.
 */
const Q005_BOUNDARY_UNREAD: Readonly<Record<Role, number>> = {
  OWNER: 0,
  ADMIN: 1,
  INVENTORY_MANAGER: 49,
  PROCUREMENT_MANAGER: 50,
  STOREKEEPER: 51,
  ANALYST: 5,
  VIEWER: 0,
};

const BASELINE_UNREAD: Readonly<Record<Role, number>> = {
  OWNER: 2,
  ADMIN: 0,
  INVENTORY_MANAGER: 3,
  PROCUREMENT_MANAGER: 1,
  STOREKEEPER: 0,
  ANALYST: 2,
  VIEWER: 0,
};

const READ_COUNTS: Readonly<Record<Role, number>> = {
  OWNER: 2,
  ADMIN: 0,
  INVENTORY_MANAGER: 1,
  PROCUREMENT_MANAGER: 0,
  STOREKEEPER: 2,
  ANALYST: 5,
  VIEWER: 0,
};

/** Shared across every organization: the id-level half of the isolation trap. */
const CATEGORIES: readonly QaCategory[] = [
  { categoryId: 'meat', name: 'Meat and Poultry' },
  { categoryId: 'dairy', name: 'Dairy' },
  { categoryId: 'produce', name: 'Fresh Produce' },
  { categoryId: 'dry-goods', name: 'Dry Goods' },
];

const WAREHOUSES: readonly QaWarehouse[] = [
  { warehouseId: 'main-store', name: 'Main Store Room', type: 'STORE_ROOM' },
  { warehouseId: 'cold-room', name: 'Cold Room', type: 'REFRIGERATED' },
  { warehouseId: 'freezer-a', name: 'Freezer A', type: 'FREEZER' },
];

const CATEGORY_UNITS: Readonly<Record<string, Unit>> = {
  meat: 'KG',
  dairy: 'L',
  produce: 'KG',
  'dry-goods': 'PACK',
};

const CATEGORY_SKU_PREFIX: Readonly<Record<string, string>> = {
  meat: 'MEAT',
  dairy: 'DAIR',
  produce: 'PROD',
  'dry-goods': 'DRYG',
};

const PRODUCT_WORDS: readonly string[] = [
  'Chicken Breast',
  'Beef Mince',
  'Lamb Shoulder',
  'Duck Confit',
  'Pork Belly',
  'Turkey Thigh',
  'Full Cream Milk',
  'Greek Yoghurt',
  'Aged Cheddar',
  'Salted Butter',
  'Double Cream',
  'Mozzarella Block',
  'Roma Tomato',
  'Baby Spinach',
  'Red Onion',
  'Sweet Potato',
  'Green Capsicum',
  'Coriander Bunch',
  'Basmati Rice',
  'Red Lentils',
  'Wheat Flour',
  'Caster Sugar',
  'Rock Salt',
  'Black Peppercorn',
  'Coconut Oil',
  'Cider Vinegar',
  'Tomato Paste',
  'Chickpea Tin',
  'Rolled Oats',
  'Almond Flake',
];

const STOCK_TARGETS: readonly StockStatus[] = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'];

/**
 * Products whose identity is duplicated verbatim between two organizations.
 * Same id, same SKU, same name, same quantities: only the tenant path differs.
 */
const TRAP_PRODUCT_COUNT = 4;

const ACTIVE_PRODUCT_COUNT = 24;
const ARCHIVED_PRODUCT_COUNT = 6;

interface OrgSeedIdentity {
  readonly orgId: string;
  readonly handle: string;
  readonly name: string;
  readonly monogram: string;
  readonly monogramColor: string;
  readonly industry: string;
  readonly networkRole: QaOrg['networkRole'];
  /** Organizations sharing a blueprint key receive identical product identities. */
  readonly productBlueprint: 'shared' | 'supplier' | 'wide';
}

const SMOKE_ORGS: readonly OrgSeedIdentity[] = [
  {
    orgId: 'qa-org-alpha',
    handle: 'qa-alpha',
    name: 'QA Alpha Foods',
    monogram: 'QA',
    monogramColor: '#0F766E',
    industry: 'Hospitality',
    networkRole: 'BUYER',
    productBlueprint: 'shared',
  },
  {
    orgId: 'qa-org-beta',
    handle: 'qa-beta',
    name: 'QA Beta Supplies',
    monogram: 'QB',
    monogramColor: '#B45309',
    industry: 'Wholesale',
    networkRole: 'SUPPLIER',
    productBlueprint: 'supplier',
  },
  {
    orgId: 'qa-org-gamma',
    handle: 'qa-gamma',
    name: 'QA Gamma Kitchens',
    monogram: 'QG',
    monogramColor: '#1D4ED8',
    industry: 'Hospitality',
    networkRole: 'ISOLATED',
    productBlueprint: 'shared',
  },
];

function buildUsers(identity: OrgSeedIdentity): readonly QaUser[] {
  const boundary = identity.orgId === 'qa-org-alpha';
  const unread = boundary ? Q005_BOUNDARY_UNREAD : BASELINE_UNREAD;
  return ROLES.map((role) => {
    const slug = role.toLowerCase().replaceAll('_', '-');
    return {
      uid: `${identity.handle}-${slug}`,
      email: `${identity.handle}-${slug}@example.com`,
      displayName: ROLE_PEOPLE[role],
      role,
      unreadNotifications: unread[role],
      readNotifications: READ_COUNTS[role],
    };
  });
}

/** Splits a target on-hand across the warehouses that carry the product. */
function splitOnHand(total: number, warehouseIds: readonly string[]): Record<string, number> {
  const split: Record<string, number> = {};
  if (warehouseIds.length === 1) {
    const only = warehouseIds[0];
    if (only === undefined) throw new Error('warehouse split requires an id');
    split[only] = total;
    return split;
  }
  const [primary, secondary] = warehouseIds;
  if (primary === undefined || secondary === undefined) {
    throw new Error('warehouse split expects exactly one or two warehouses');
  }
  const primaryShare = Math.ceil((total * 3) / 5);
  split[primary] = primaryShare;
  split[secondary] = total - primaryShare;
  return split;
}

function buildProduct(
  index: number,
  status: LifecycleStatus,
  blueprint: OrgSeedIdentity['productBlueprint'],
): QaProduct {
  const category = CATEGORIES[Math.floor(index / 6) % CATEGORIES.length];
  if (category === undefined) throw new Error('category lookup failed');
  const stockTarget = STOCK_TARGETS[Math.floor((index % 6) / 2) % STOCK_TARGETS.length];
  if (stockTarget === undefined) throw new Error('stock target lookup failed');
  const word = PRODUCT_WORDS[index % PRODUCT_WORDS.length];
  if (word === undefined) throw new Error('product word lookup failed');
  const unit = CATEGORY_UNITS[category.categoryId] ?? 'EACH';
  const prefix = CATEGORY_SKU_PREFIX[category.categoryId] ?? 'MISC';

  // Distinct minimums keep LOW_STOCK genuinely below minimum and keep the
  // `minimumStockMilli` axis from collapsing to a single value.
  const minimumStockMilli = 10_000 + index * 250;
  const total =
    stockTarget === 'OUT_OF_STOCK'
      ? 0
      : stockTarget === 'LOW_STOCK'
        ? Math.max(1_000, minimumStockMilli - 3_000 - (index % 2) * 500)
        : minimumStockMilli + 5_000 + index * 100;

  const isTrap = blueprint === 'shared' && status === 'ACTIVE' && index < TRAP_PRODUCT_COUNT;
  const suffix = ordinal(index + 1);
  const productId = isTrap
    ? `product-shared-looking-${ordinal(index + 1, 3)}`
    : `qa-${blueprint}-product-${suffix}`;
  const internalSku = isTrap ? `SHARED-${ordinal(index + 1, 3)}` : `QA-${prefix}-${suffix}`;
  const name = isTrap ? `Standard Widget ${ordinal(index + 1, 3)}` : `${word} ${suffix}`;

  const primary = WAREHOUSES[index % WAREHOUSES.length];
  if (primary === undefined) throw new Error('warehouse lookup failed');
  const warehouseIds =
    index % 5 === 0
      ? [
          primary.warehouseId,
          WAREHOUSES[(index + 1) % WAREHOUSES.length]?.warehouseId ?? primary.warehouseId,
        ]
      : [primary.warehouseId];
  const uniqueWarehouseIds = [...new Set(warehouseIds)];

  return {
    productId,
    internalSku,
    name,
    categoryId: category.categoryId,
    baseUnit: unit,
    purchaseCostMinor: 50_000 + index * 1_750,
    minimumStockMilli,
    reorderTargetMilli: minimumStockMilli + 5_000,
    status,
    partnerPublished: blueprint === 'supplier' && status === 'ACTIVE' && index % 2 === 0,
    updatedAtDayOffset: 2 + index,
    warehouseIds: uniqueWarehouseIds,
    targetOnHandMilli: splitOnHand(total, uniqueWarehouseIds),
  };
}

function buildProducts(blueprint: OrgSeedIdentity['productBlueprint']): readonly QaProduct[] {
  const products: QaProduct[] = [];
  for (let index = 0; index < ACTIVE_PRODUCT_COUNT; index += 1) {
    products.push(buildProduct(index, 'ACTIVE', blueprint));
  }
  for (let offset = 0; offset < ARCHIVED_PRODUCT_COUNT; offset += 1) {
    products.push(buildProduct(ACTIVE_PRODUCT_COUNT + offset, 'ARCHIVED', blueprint));
  }
  return products;
}

function buildOrg(identity: OrgSeedIdentity): QaOrg {
  const users = buildUsers(identity);
  const owner = users.find((user) => user.role === 'OWNER');
  if (owner === undefined) throw new Error(`${identity.orgId} has no OWNER`);
  const defaultWarehouse = WAREHOUSES[0];
  if (defaultWarehouse === undefined) throw new Error('warehouse blueprint is empty');
  return {
    profile: 'smoke',
    orgId: identity.orgId,
    handle: identity.handle,
    name: identity.name,
    industry: identity.industry,
    country: 'LK',
    currency: 'LKR',
    timezone: 'Asia/Colombo',
    monogram: identity.monogram,
    monogramColor: identity.monogramColor,
    ownerUid: owner.uid,
    defaultWarehouseId: defaultWarehouse.warehouseId,
    purchaseOrderPrefix: identity.handle.toUpperCase().replaceAll('-', '').slice(0, 6),
    networkRole: identity.networkRole,
    users,
    categories: CATEGORIES,
    warehouses: WAREHOUSES,
    products: buildProducts(identity.productBlueprint),
  };
}

const WIDE_Q005_BOUNDARIES = [0, 1, 5, 20, 49, 50, 51, 75] as const;

function buildWideUsers(
  identity: OrgSeedIdentity,
  count: number,
  boundaryOrg: boolean,
): readonly QaUser[] {
  return Array.from({ length: count }, (_, index) => {
    const role = ROLES[index % ROLES.length];
    if (role === undefined) throw new Error('wide role lookup failed');
    const slug = role.toLowerCase().replaceAll('_', '-');
    const suffix = ordinal(index + 1, 2);
    return {
      uid: `${identity.handle}-${slug}-${suffix}`,
      email: `${identity.handle}-${slug}-${suffix}@example.com`,
      displayName: `${ROLE_PEOPLE[role]} ${suffix}`,
      role,
      unreadNotifications: boundaryOrg
        ? (WIDE_Q005_BOUNDARIES[index % WIDE_Q005_BOUNDARIES.length] ?? 0)
        : 3 + (index % 5),
      readNotifications: 2 + (index % 3),
    };
  });
}

function buildWideCategories(count: number): readonly QaCategory[] {
  return Array.from({ length: count }, (_, index) => {
    const smoke = CATEGORIES[index];
    return (
      smoke ?? {
        categoryId: `category-${ordinal(index + 1, 2)}`,
        name: `QA Category ${ordinal(index + 1, 2)}`,
      }
    );
  });
}

const WIDE_WAREHOUSE_TYPES: readonly WarehouseType[] = [
  'STORE_ROOM',
  'REFRIGERATED',
  'FREEZER',
  'KITCHEN',
];

function buildWideWarehouses(count: number): readonly QaWarehouse[] {
  return Array.from({ length: count }, (_, index) => {
    const smoke = WAREHOUSES[index];
    const type = WIDE_WAREHOUSE_TYPES[index % WIDE_WAREHOUSE_TYPES.length];
    if (type === undefined) throw new Error('wide warehouse type lookup failed');
    return (
      smoke ?? {
        warehouseId: `warehouse-${ordinal(index + 1, 2)}`,
        name: `QA Store Room ${ordinal(index + 1, 2)}`,
        type,
      }
    );
  });
}

function wideProduct(
  index: number,
  orgIndex: number,
  categories: readonly QaCategory[],
  warehouses: readonly QaWarehouse[],
  specialKind: QaSpecialKind | undefined,
): QaProduct {
  // Adjacent products share the full category/warehouse/status filter group
  // while keeping distinct sort values. That makes all four sorts observable
  // for the most selective product-matrix shape.
  const groupIndex = Math.floor(index / 2);
  const category = categories[groupIndex % categories.length];
  const word = PRODUCT_WORDS[index % PRODUCT_WORDS.length];
  if (category === undefined || word === undefined) throw new Error('wide product lookup failed');
  const unit: Unit =
    index % 4 === 0 ? 'KG' : index % 4 === 1 ? 'L' : index % 4 === 2 ? 'PACK' : 'EACH';
  const archived = specialKind === 'ARCHIVED' || index >= 108;
  const status: LifecycleStatus = archived ? 'ARCHIVED' : 'ACTIVE';
  const minimumStockMilli = 8_000 + (index % 20) * 500;
  const stockTarget: StockStatus =
    specialKind === 'LOW_STOCK'
      ? index % 3 === 0
        ? 'OUT_OF_STOCK'
        : 'LOW_STOCK'
      : (STOCK_TARGETS[index % STOCK_TARGETS.length] ?? 'IN_STOCK');
  const total =
    (specialKind === undefined && index < 108) || (specialKind === 'HIGH_VOLUME' && index < 80)
      ? 300_000
      : stockTarget === 'OUT_OF_STOCK'
        ? 0
        : stockTarget === 'LOW_STOCK'
          ? Math.max(1_000, minimumStockMilli - 2_000)
          : minimumStockMilli + 8_000 + (index % 7) * 500;
  const balanceCount = Math.min(specialKind === 'HIGH_VOLUME' ? 4 : 3, warehouses.length);
  const warehouseIds = Array.from({ length: balanceCount }, (_, offset) => {
    const warehouse = warehouses[(groupIndex + offset) % warehouses.length];
    if (warehouse === undefined) throw new Error('wide product warehouse lookup failed');
    return warehouse.warehouseId;
  });
  const targetOnHandMilli: Record<string, number> = {};
  let remainder = total;
  warehouseIds.forEach((warehouseId, offset) => {
    const value =
      offset === warehouseIds.length - 1 ? remainder : Math.floor(total / warehouseIds.length);
    targetOnHandMilli[warehouseId] = value;
    remainder -= value;
  });
  const trap = index < 30;
  const suffix = ordinal(index + 1, 3);
  return {
    productId: trap
      ? `wide-shared-product-${suffix}`
      : `wide-product-${ordinal(orgIndex + 1, 2)}-${suffix}`,
    internalSku: trap ? `WIDE-SHARED-${suffix}` : `WIDE-${ordinal(orgIndex + 1, 2)}-${suffix}`,
    name: trap ? `Wide Standard Item ${suffix}` : `${word} ${ordinal(orgIndex + 1, 2)}-${suffix}`,
    categoryId: category.categoryId,
    baseUnit: unit,
    purchaseCostMinor: 25_000 + index * 775 + orgIndex * 10,
    minimumStockMilli,
    reorderTargetMilli: minimumStockMilli + 6_000,
    status,
    partnerPublished: status === 'ACTIVE' && index < 60,
    updatedAtDayOffset: 2 + (index % 25),
    warehouseIds,
    targetOnHandMilli,
  };
}

function wideIdentity(index: number): OrgSeedIdentity {
  const suffix = ordinal(index + 1, 2);
  return {
    orgId: `qa-wide-org-${suffix}`,
    handle: `qa-wide-${suffix}`,
    name: `QA Wide Organization ${suffix}`,
    monogram: `W${String(index % 10)}`,
    monogramColor: index % 2 === 0 ? '#0F766E' : '#1D4ED8',
    industry: index % 2 === 0 ? 'Hospitality' : 'Wholesale',
    networkRole: index % 2 === 0 ? 'BUYER' : 'SUPPLIER',
    productBlueprint: 'wide',
  };
}

const SPECIAL_KINDS: readonly QaSpecialKind[] = [
  'EMPTY',
  'TINY',
  'LOW_STOCK',
  'ARCHIVED',
  'NETWORK_OFF',
  'HIGH_VOLUME',
];

function specialIdentity(kind: QaSpecialKind, index: number): OrgSeedIdentity {
  const slug = kind.toLowerCase().replaceAll('_', '-');
  return {
    orgId: `qa-special-${slug}`,
    handle: `qa-${slug}`,
    name: `QA Special ${kind.replaceAll('_', ' ')}`,
    monogram: `S${String(index + 1)}`,
    monogramColor: '#7C3AED',
    industry: 'QA Special',
    networkRole:
      kind === 'NETWORK_OFF' || kind === 'EMPTY' || kind === 'TINY' ? 'ISOLATED' : 'BUYER',
    productBlueprint: 'wide',
  };
}

function buildWideOrg(
  identity: OrgSeedIdentity,
  orgIndex: number,
  specialKind?: QaSpecialKind,
): QaOrg {
  const userCount = specialKind === 'EMPTY' ? 1 : specialKind === 'TINY' ? 2 : 20;
  const categoryCount = specialKind === 'EMPTY' ? 0 : specialKind === 'TINY' ? 1 : 24;
  const warehouseCount = specialKind === 'TINY' || specialKind === 'EMPTY' ? 1 : 20;
  const productCount =
    specialKind === 'EMPTY'
      ? 0
      : specialKind === 'TINY'
        ? 2
        : specialKind === 'HIGH_VOLUME'
          ? 180
          : 120;
  const users = buildWideUsers(identity, userCount, orgIndex === 0);
  const categories = buildWideCategories(categoryCount);
  const warehouses = buildWideWarehouses(warehouseCount);
  const owner = users.find((user) => user.role === 'OWNER') ?? users[0];
  const defaultWarehouse = warehouses[0];
  if (owner === undefined || defaultWarehouse === undefined)
    throw new Error(`${identity.orgId} lacks required core fixtures`);
  return {
    profile: 'wide',
    ...(specialKind === undefined ? {} : { specialKind }),
    orgId: identity.orgId,
    handle: identity.handle,
    name: identity.name,
    industry: identity.industry,
    country: 'LK',
    currency: 'LKR',
    timezone: 'Asia/Colombo',
    monogram: identity.monogram,
    monogramColor: identity.monogramColor,
    ownerUid: owner.uid,
    defaultWarehouseId: defaultWarehouse.warehouseId,
    purchaseOrderPrefix: `W${ordinal(orgIndex + 1, 2)}`,
    networkRole: identity.networkRole,
    users,
    categories,
    warehouses,
    products: Array.from({ length: productCount }, (_, index) =>
      wideProduct(index, orgIndex, categories, warehouses, specialKind),
    ),
  };
}

export function buildPlan(definition: ProfileDefinition, seed: number): QaPlan {
  const organizations =
    definition.profile === 'smoke'
      ? SMOKE_ORGS.slice(0, definition.organizationCount).map(buildOrg)
      : [
          ...Array.from({ length: definition.organizationCount }, (_, index) =>
            buildWideOrg(wideIdentity(index), index),
          ),
          ...SPECIAL_KINDS.slice(0, definition.specialOrganizationCount).map((kind, index) =>
            buildWideOrg(specialIdentity(kind, index), definition.organizationCount + index, kind),
          ),
        ];
  const expected = definition.organizationCount + definition.specialOrganizationCount;
  if (organizations.length !== expected) {
    throw new Error(
      `Profile "${definition.profile}" built ${String(organizations.length)} organizations, expected ${String(expected)}`,
    );
  }
  return {
    datasetVersion: DATASET_VERSION,
    profile: definition.profile,
    seed,
    fixtureEpoch: FIXTURE_EPOCH,
    organizations,
  };
}

export const BLUEPRINT = {
  ROLES,
  CATEGORIES,
  WAREHOUSES,
  TRAP_PRODUCT_COUNT,
  ACTIVE_PRODUCT_COUNT,
  ARCHIVED_PRODUCT_COUNT,
  Q005_BOUNDARY_UNREAD,
} as const;
