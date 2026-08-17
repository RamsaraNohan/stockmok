import { pathToFileURL } from 'node:url';
import {
  CategorySchema,
  MemberSchema,
  OrganizationDirectorySchema,
  OrganizationSchema,
  OrganizationSettingsSchema,
  UserMembershipSchema,
  UserSchema,
} from '../../packages/shared/src/schemas/core.js';
import {
  ProductSchema,
  ProductStockSummarySchema,
  StockBalanceSchema,
  StockMovementSchema,
  WarehouseSchema,
} from '../../packages/shared/src/schemas/inventory.js';
import {
  CanonicalConnectionSchema,
  ConnectionProjectionSchema,
} from '../../packages/shared/src/schemas/network.js';
import {
  PartnerCatalogItemSchema,
  PrivatePartnerSchema,
  ProductMappingSchema,
} from '../../packages/shared/src/schemas/procurement.js';
import {
  deriveShortfall,
  deriveStockStatus,
  deriveStockValueMinor,
} from '../../packages/shared/src/domain.js';
import { paths } from '../../packages/shared/src/paths.js';
import { serverPaths } from '../../packages/shared/src/server/paths.js';
import { getBootstrapContext, type BootstrapContext } from './context.js';
import { CLOCK, GRAND_PRODUCTS, IDS, TEAM, productId } from './fixtures.js';
import { setValidated, upsertAuthUser } from './write.js';

const CATEGORY_NAMES = new Map([
  ['meat', 'Meat'],
  ['dairy', 'Dairy'],
  ['dry-goods', 'Dry Goods'],
  ['beverages', 'Beverages'],
]);

function productDocuments(product: (typeof GRAND_PRODUCTS)[number]) {
  const id = productId(product.sku);
  const onHandMilli = product.opening * 1000;
  const minimumStockMilli = product.minimum * 1000;
  const stockValueMinor = deriveStockValueMinor(onHandMilli, product.costMinor);
  const stockStatus = deriveStockStatus(onHandMilli, minimumStockMilli);
  const shortfallMilli = deriveShortfall(minimumStockMilli, onHandMilli);
  return {
    id,
    product: {
      productId: id,
      internalSku: product.sku,
      internalSkuNormalized: product.sku,
      name: product.name,
      categoryId: product.categoryId,
      baseUnit: product.unit,
      purchaseCostMinor: product.costMinor,
      currency: 'LKR',
      minimumStockMilli,
      reorderTargetMilli: Math.max(minimumStockMilli, minimumStockMilli * 2),
      status: 'ACTIVE',
      partnerPublished: false,
      storefrontPublished: false,
      createdAt: CLOCK.t0,
      createdBy: 'grand-inventory',
      updatedAt: CLOCK.t0,
      updatedBy: 'grand-inventory',
    },
    balance: {
      productId: id,
      warehouseId: product.warehouseId,
      onHandMilli,
      unit: product.unit,
      productName: product.name,
      internalSku: product.sku,
      internalSkuNormalized: product.sku,
      categoryId: product.categoryId,
      productStatus: 'ACTIVE',
      baseUnitPriceMinor: product.costMinor,
      minimumStockMilli,
      productUpdatedAt: CLOCK.t0,
      stockValueMinor,
      stockStatus,
      shortfallMilli,
      updatedAt: CLOCK.t0,
    },
    summary: {
      productId: id,
      productName: product.name,
      internalSku: product.sku,
      internalSkuNormalized: product.sku,
      categoryId: product.categoryId,
      productStatus: 'ACTIVE',
      baseUnitPriceMinor: product.costMinor,
      productUpdatedAt: CLOCK.t0,
      onHandMilli,
      reservedMilli: 0,
      availableMilli: onHandMilli,
      minimumStockMilli,
      stockStatus,
      stockValueMinor,
      shortfallMilli,
      unit: product.unit,
      updatedAt: CLOCK.t0,
    },
    movement: {
      movementId: `opening-${id}`,
      productId: id,
      warehouseId: product.warehouseId,
      productNameSnapshot: product.name,
      skuSnapshot: product.sku,
      movementType: 'OPENING_BALANCE',
      signedQuantityMilli: onHandMilli,
      unit: product.unit,
      balanceAfterMilli: onHandMilli,
      sourceType: 'MANUAL',
      operationId: `bootstrap-opening-${id}`,
      actorUid: 'grand-inventory',
      actorName: 'Nimal Perera',
      warehouseNameSnapshot: product.warehouseId === IDS.coldWarehouse ? 'Cold Room' : 'Main Store',
      effectiveAt: CLOCK.t0,
      createdAt: CLOCK.t0,
    },
  } as const;
}

export async function seedBootstrap(
  context: BootstrapContext = getBootstrapContext(),
): Promise<void> {
  const { db, auth } = context;
  for (const user of TEAM) await upsertAuthUser(auth, user);
  await upsertAuthUser(auth, {
    uid: 'fresh-owner',
    displayName: 'Fresh Foods Owner',
    email: 'owner@freshfoods.stockmok.test',
  });

  const batch = db.batch();
  setValidated(db, batch, paths.organizationDirectory('grand-ocean'), OrganizationDirectorySchema, {
    organizationId: IDS.grandOrg,
    handle: 'grand-ocean',
    name: 'Grand Ocean Hotel',
    logoUrl: null,
    monogram: 'GO',
    monogramColor: 'ocean',
    industry: 'Hospitality',
    country: 'LK',
    directoryStatus: 'LISTED',
    createdAt: CLOCK.t0,
  });
  setValidated(db, batch, paths.organizationDirectory('freshfoods'), OrganizationDirectorySchema, {
    organizationId: IDS.freshOrg,
    handle: 'freshfoods',
    name: 'Fresh Foods Ltd',
    logoUrl: null,
    monogram: 'FF',
    monogramColor: 'fresh',
    industry: 'Food & Beverage',
    country: 'LK',
    directoryStatus: 'LISTED',
    createdAt: CLOCK.t0,
  });

  for (const [orgId, values] of [
    [
      IDS.grandOrg,
      {
        name: 'Grand Ocean Hotel',
        handle: 'grand-ocean',
        industry: 'Hospitality',
        monogram: 'GO',
        color: 'ocean',
        owner: 'grand-owner',
        warehouse: IDS.mainWarehouse,
      },
    ],
    [
      IDS.freshOrg,
      {
        name: 'Fresh Foods Ltd',
        handle: 'freshfoods',
        industry: 'Food & Beverage',
        monogram: 'FF',
        color: 'fresh',
        owner: 'fresh-owner',
        warehouse: IDS.freshWarehouse,
      },
    ],
  ] as const) {
    setValidated(db, batch, paths.organization(orgId), OrganizationSchema, {
      organizationId: orgId,
      name: values.name,
      handle: values.handle,
      industry: values.industry,
      country: 'LK',
      logoUrl: null,
      monogram: values.monogram,
      monogramColor: values.color,
      status: 'ACTIVE',
      ownerUid: values.owner,
      createdAt: CLOCK.t0,
      createdBy: values.owner,
      schemaVersion: 1,
    });
    setValidated(db, batch, paths.settings(orgId), OrganizationSettingsSchema, {
      defaultWarehouseId: values.warehouse,
      currency: 'LKR',
      timezone: 'Asia/Colombo',
      lowStockNotificationsEnabled: true,
      purchaseOrderPrefix: orgId === IDS.grandOrg ? 'PO' : 'FFPO',
      quantityPrecision: 3,
      networkEnabled: true,
      storefrontEnabled: false,
      updatedAt: CLOCK.t0,
      updatedBy: values.owner,
    });
  }

  for (const user of TEAM) {
    setValidated(db, batch, paths.user(user.uid), UserSchema, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      status: 'ACTIVE',
      createdAt: CLOCK.t0,
      lastSeenAt: CLOCK.t0,
    });
    setValidated(db, batch, paths.member(IDS.grandOrg, user.uid), MemberSchema, {
      ...user,
      status: 'ACTIVE',
      joinedAt: CLOCK.t0,
      updatedAt: CLOCK.t0,
    });
    setValidated(db, batch, paths.membership(user.uid, IDS.grandOrg), UserMembershipSchema, {
      organizationId: IDS.grandOrg,
      handle: 'grand-ocean',
      organizationName: 'Grand Ocean Hotel',
      monogram: 'GO',
      monogramColor: 'ocean',
      role: user.role,
      status: 'ACTIVE',
      joinedAt: CLOCK.t0,
      updatedAt: CLOCK.t0,
    });
  }
  setValidated(db, batch, paths.user('fresh-owner'), UserSchema, {
    uid: 'fresh-owner',
    displayName: 'Fresh Foods Owner',
    email: 'owner@freshfoods.stockmok.test',
    status: 'ACTIVE',
    createdAt: CLOCK.t0,
    lastSeenAt: CLOCK.t0,
  });
  setValidated(db, batch, paths.member(IDS.freshOrg, 'fresh-owner'), MemberSchema, {
    uid: 'fresh-owner',
    role: 'OWNER',
    status: 'ACTIVE',
    displayName: 'Fresh Foods Owner',
    email: 'owner@freshfoods.stockmok.test',
    joinedAt: CLOCK.t0,
    updatedAt: CLOCK.t0,
  });
  setValidated(db, batch, paths.membership('fresh-owner', IDS.freshOrg), UserMembershipSchema, {
    organizationId: IDS.freshOrg,
    handle: 'freshfoods',
    organizationName: 'Fresh Foods Ltd',
    monogram: 'FF',
    monogramColor: 'fresh',
    role: 'OWNER',
    status: 'ACTIVE',
    joinedAt: CLOCK.t0,
    updatedAt: CLOCK.t0,
  });

  for (const [categoryId, name] of CATEGORY_NAMES) {
    setValidated(db, batch, paths.category(IDS.grandOrg, categoryId), CategorySchema, {
      categoryId,
      name,
      status: 'ACTIVE',
      createdAt: CLOCK.t0,
      createdBy: 'grand-inventory',
      updatedAt: CLOCK.t0,
      updatedBy: 'grand-inventory',
    });
  }
  for (const [categoryId, name] of [
    ['meat', 'Meat'],
    ['dairy', 'Dairy'],
  ] as const) {
    setValidated(db, batch, paths.category(IDS.freshOrg, categoryId), CategorySchema, {
      categoryId,
      name,
      status: 'ACTIVE',
      createdAt: CLOCK.t0,
      createdBy: 'fresh-owner',
      updatedAt: CLOCK.t0,
      updatedBy: 'fresh-owner',
    });
  }
  for (const [orgId, warehouse] of [
    [
      IDS.grandOrg,
      { id: IDS.mainWarehouse, name: 'Main Store', type: 'STORE_ROOM', actor: 'grand-inventory' },
    ],
    [
      IDS.grandOrg,
      { id: IDS.coldWarehouse, name: 'Cold Room', type: 'REFRIGERATED', actor: 'grand-inventory' },
    ],
    [
      IDS.freshOrg,
      {
        id: IDS.freshWarehouse,
        name: 'Supplier Stock',
        type: 'REFRIGERATED',
        actor: 'fresh-owner',
      },
    ],
  ] as const) {
    setValidated(db, batch, paths.warehouse(orgId, warehouse.id), WarehouseSchema, {
      warehouseId: warehouse.id,
      name: warehouse.name,
      type: warehouse.type,
      status: 'ACTIVE',
      createdAt: CLOCK.t0,
      createdBy: warehouse.actor,
      updatedAt: CLOCK.t0,
      updatedBy: warehouse.actor,
    });
  }

  for (const fixture of GRAND_PRODUCTS) {
    const documents = productDocuments(fixture);
    setValidated(
      db,
      batch,
      paths.product(IDS.grandOrg, documents.id),
      ProductSchema,
      documents.product,
    );
    setValidated(
      db,
      batch,
      paths.stockBalance(IDS.grandOrg, documents.id, fixture.warehouseId),
      StockBalanceSchema,
      documents.balance,
    );
    setValidated(
      db,
      batch,
      paths.productStockSummary(IDS.grandOrg, documents.id),
      ProductStockSummarySchema,
      documents.summary,
    );
    setValidated(
      db,
      batch,
      paths.stockMovement(IDS.grandOrg, documents.movement.movementId),
      StockMovementSchema,
      documents.movement,
    );
  }

  for (const supplier of [
    {
      sku: 'FF-CHK-05',
      name: 'Chicken Breast 5 KG Pack',
      categoryId: 'meat',
      unit: 'PACK',
      opening: 200,
    },
    { sku: 'FF-BTR-01', name: 'Butter Block 1 KG', categoryId: 'dairy', unit: 'KG', opening: 300 },
  ] as const) {
    const id = productId(supplier.sku);
    const onHandMilli = supplier.opening * 1000;
    const common = {
      productId: id,
      productName: supplier.name,
      internalSku: supplier.sku,
      internalSkuNormalized: supplier.sku,
      categoryId: supplier.categoryId,
      productStatus: 'ACTIVE',
      baseUnitPriceMinor: 0,
      productUpdatedAt: CLOCK.t0,
    };
    setValidated(db, batch, paths.product(IDS.freshOrg, id), ProductSchema, {
      productId: id,
      internalSku: supplier.sku,
      internalSkuNormalized: supplier.sku,
      name: supplier.name,
      categoryId: supplier.categoryId,
      baseUnit: supplier.unit,
      purchaseCostMinor: 0,
      currency: 'LKR',
      minimumStockMilli: 0,
      reorderTargetMilli: 0,
      status: 'ACTIVE',
      partnerPublished: true,
      storefrontPublished: false,
      createdAt: CLOCK.t0,
      createdBy: 'fresh-owner',
      updatedAt: CLOCK.t0,
      updatedBy: 'fresh-owner',
    });
    setValidated(
      db,
      batch,
      paths.stockBalance(IDS.freshOrg, id, IDS.freshWarehouse),
      StockBalanceSchema,
      {
        ...common,
        warehouseId: IDS.freshWarehouse,
        onHandMilli,
        unit: supplier.unit,
        minimumStockMilli: 0,
        stockValueMinor: 0,
        stockStatus: 'IN_STOCK',
        shortfallMilli: 0,
        updatedAt: CLOCK.t0,
      },
    );
    setValidated(
      db,
      batch,
      paths.productStockSummary(IDS.freshOrg, id),
      ProductStockSummarySchema,
      {
        ...common,
        onHandMilli,
        reservedMilli: 0,
        availableMilli: onHandMilli,
        minimumStockMilli: 0,
        stockStatus: 'IN_STOCK',
        stockValueMinor: 0,
        shortfallMilli: 0,
        unit: supplier.unit,
        updatedAt: CLOCK.t0,
      },
    );
    setValidated(
      db,
      batch,
      paths.stockMovement(IDS.freshOrg, `opening-${id}`),
      StockMovementSchema,
      {
        movementId: `opening-${id}`,
        productId: id,
        warehouseId: IDS.freshWarehouse,
        productNameSnapshot: supplier.name,
        skuSnapshot: supplier.sku,
        movementType: 'OPENING_BALANCE',
        signedQuantityMilli: onHandMilli,
        unit: supplier.unit,
        balanceAfterMilli: onHandMilli,
        sourceType: 'MANUAL',
        operationId: `bootstrap-opening-${id}`,
        actorUid: 'fresh-owner',
        actorName: 'Fresh Foods Owner',
        warehouseNameSnapshot: 'Supplier Stock',
        effectiveAt: CLOCK.t0,
        createdAt: CLOCK.t0,
      },
    );
  }

  setValidated(
    db,
    batch,
    paths.partnerCatalogItem(IDS.freshOrg, 'catalog-ckn-b5'),
    PartnerCatalogItemSchema,
    {
      catalogItemId: 'catalog-ckn-b5',
      sourceProductId: 'ff-chk-05',
      internalProductNameSnapshot: 'Chicken Breast 5 KG Pack',
      internalSkuSnapshot: 'FF-CHK-05',
      partnerSku: 'CKN-B5',
      partnerSkuNormalized: 'CKN-B5',
      displayName: 'Chicken Breast 5 KG Pack',
      orderUnit: 'PACK',
      packDescription: '5 KG',
      availabilityState: 'IN_STOCK',
      published: true,
      updatedAt: CLOCK.t0,
    },
  );
  setValidated(
    db,
    batch,
    paths.partnerCatalogItem(IDS.freshOrg, 'catalog-btr-1k'),
    PartnerCatalogItemSchema,
    {
      catalogItemId: 'catalog-btr-1k',
      sourceProductId: 'ff-btr-01',
      internalProductNameSnapshot: 'Butter Block 1 KG',
      internalSkuSnapshot: 'FF-BTR-01',
      partnerSku: 'BTR-1K',
      partnerSkuNormalized: 'BTR-1K',
      displayName: 'Butter Block 1 KG',
      orderUnit: 'KG',
      packDescription: '1 KG',
      availabilityState: 'IN_STOCK',
      published: true,
      updatedAt: CLOCK.t0,
    },
  );
  setValidated(
    db,
    batch,
    paths.privatePartner(IDS.grandOrg, IDS.privatePartner),
    PrivatePartnerSchema,
    {
      partnerId: IDS.privatePartner,
      partnerTypes: ['SUPPLIER'],
      name: 'Green Farm',
      status: 'ACTIVE',
      ordersPlacedCount: 0,
      createdAt: CLOCK.t0,
      createdBy: 'grand-procurement',
      updatedAt: CLOCK.t0,
      updatedBy: 'grand-procurement',
    },
  );

  const connection = {
    connectionId: IDS.connection,
    buyerOrgId: IDS.grandOrg,
    supplierOrgId: IDS.freshOrg,
    buyerHandle: 'grand-ocean',
    buyerName: 'Grand Ocean Hotel',
    supplierHandle: 'freshfoods',
    supplierName: 'Fresh Foods Ltd',
    status: 'ACTIVE',
    requestedByUid: 'grand-procurement',
    requestedAt: CLOCK.t0,
    respondedByUid: 'fresh-owner',
    respondedAt: CLOCK.t0,
    updatedAt: CLOCK.t0,
  };
  setValidated(
    db,
    batch,
    serverPaths.canonicalConnection(IDS.grandOrg, IDS.freshOrg),
    CanonicalConnectionSchema,
    connection,
  );
  setValidated(
    db,
    batch,
    paths.connectionProjection(IDS.grandOrg, IDS.connection),
    ConnectionProjectionSchema,
    { ...connection, ordersPlacedCount: 0 },
  );
  setValidated(
    db,
    batch,
    paths.connectionProjection(IDS.freshOrg, IDS.connection),
    ConnectionProjectionSchema,
    { ...connection, ordersPlacedCount: 0 },
  );
  setValidated(db, batch, paths.productMapping(IDS.grandOrg, IDS.mapping), ProductMappingSchema, {
    mappingId: IDS.mapping,
    connectionId: IDS.connection,
    buyerOrgId: IDS.grandOrg,
    buyerProductId: 'meat-001',
    buyerProductNameSnapshot: 'Chicken Breast',
    buyerSkuSnapshot: 'MEAT-001',
    supplierOrgId: IDS.freshOrg,
    supplierCatalogItemId: 'catalog-ckn-b5',
    supplierPartnerSkuSnapshot: 'CKN-B5',
    supplierDisplayNameSnapshot: 'Chicken Breast 5 KG Pack',
    buyerBaseUnit: 'KG',
    supplierOrderUnit: 'PACK',
    supplierToBuyerBaseFactorMilli: 5000,
    semanticConfirmedByUid: 'grand-procurement',
    semanticConfirmedByName: 'Grand Ocean Procurement Manager',
    semanticConfirmedAt: CLOCK.t0,
    status: 'VERIFIED',
    createdAt: CLOCK.t0,
  });

  await batch.commit();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await seedBootstrap();
  console.log('BOOTSTRAP_T0_SEED=PASS');
}
