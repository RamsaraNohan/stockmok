import { deriveStockStatus, paths, type Unit } from '@stockmok/shared';
import type { DocumentSnapshot, Firestore } from 'firebase-admin/firestore';
import {
  MAX_PARTNER_CATALOG_PAGE,
  normalizeSku,
  readCanonicalConnection,
  requireBuyerSide,
  requireConnectionActive,
} from './connected-lib.js';
import { newId, requireMembership } from './lib.js';
import { writeAudit } from '../core/audit.js';
import { defineCommand } from '../core/define-command.js';
import { fail } from '../core/errors.js';
import { serverTimestamp } from '../core/time.js';
import type { TransactionScope } from '../core/transaction.js';
import { PARTNER_WRITERS } from '../guards/roles.js';

/**
 * `C-21` … `C-24` — the Partner Catalog: the **only** thing a connected buyer
 * can see of a supplier's inventory.
 *
 * Stockmok keeps three grains of the same product deliberately apart
 * (DB-05 §8):
 *
 *   · the **private product** — exact, organization-only operational data;
 *   · the **partner catalog item** — a B2B-safe projection document;
 *   · the storefront item — public, Release C, not built.
 *
 * They are separate **documents**, not filtered views of one document, for a
 * reason `INV-13` states plainly: Firestore reads whole documents, so a rule
 * cannot hide a field. A projection is therefore an allow-list that is copied,
 * and {@link toBuyerCatalogItem} is that allow-list in executable form —
 * nothing reaches a buyer except by being named there.
 *
 * **A buyer has no client read path to this collection at all** (DB-04 §6): the
 * rule on `organizations/{supplierOrgId}/partnerCatalog/**` is own-org
 * `PARTNER_WRITERS`, and `C-23`/`C-24` are the only way across. That is why
 * both are commands rather than queries even though neither writes anything.
 */

const CATALOG_ENTITY = 'PARTNER_CATALOG_ITEM';

/**
 * The B2B-safe field set — `INV-13`, and A3 · DB-CR-036's explicit ruling that
 * `internalProductNameSnapshot` and `internalSkuSnapshot` *"are supplier-private
 * display values and are never included in the projection a connected buyer
 * reads"* (`T-SEC-38`).
 *
 * `sourceProductId` is excluded for the same reason it is never needed: a buyer
 * links to the **catalog item**, and the supplier's internal product identity is
 * no part of the relationship. `availabilityState` is coarse by construction —
 * two words, never a quantity.
 */
export function toBuyerCatalogItem(item: DocumentSnapshot): Record<string, unknown> {
  const packDescription: unknown = item.get('packDescription');
  const wholesalePriceMinor: unknown = item.get('wholesalePriceMinor');
  const currency: unknown = item.get('currency');
  return {
    catalogItemId: item.id,
    partnerSku: item.get('partnerSku') as string,
    displayName: item.get('displayName') as string,
    orderUnit: item.get('orderUnit') as Unit,
    availabilityState: item.get('availabilityState') as string,
    ...(typeof packDescription === 'string' ? { packDescription } : {}),
    ...(typeof wholesalePriceMinor === 'number' ? { wholesalePriceMinor } : {}),
    ...(typeof currency === 'string' ? { currency } : {}),
  };
}

/**
 * `IDX-16` (`published ASC, partnerSkuNormalized ASC`) — the frozen index behind
 * `Q-046`, `Q-047` and this publish-time uniqueness guard. Bounded, always.
 */
function publishedCatalogQuery(db: Firestore, supplierOrgId: string) {
  return db
    .collection(`${paths.organization(supplierOrgId)}/partnerCatalog`)
    .where('published', '==', true);
}

/**
 * C-21 `partnerCatalog.publish` — `PARTNER_WRITERS`, **not** idempotent,
 * transactional, audited.
 *
 * **`INV-17` is the load-bearing validation**: a catalog item's `orderUnit` must
 * equal its source product's `baseUnit`. Without it `cpo.ship` could not know
 * how much supplier stock a shipped line consumes without a second conversion
 * factor that exists nowhere in the schema — so this is not a tidiness rule, it
 * is what makes supplier dispatch computable at all.
 *
 * `partnerSkuNormalized` is unique **within the published catalog** (DB-02 §6.1),
 * enforced by a bounded `limit(1)` query on `IDX-16` inside the transaction, so
 * the check cannot be raced. Unpublished items keep their SKU, which is exactly
 * why the uniqueness predicate carries `published == true`.
 *
 * `product.partnerPublished` is the frozen record of "this product is in the
 * partner catalog", so publishing an already-published product is refused here
 * rather than allowed to produce a second item the flag could not describe.
 *
 * **Nothing exact crosses.** The item is built from an allow-list; the only
 * stock-derived field is `availabilityState`, which is two words computed from
 * the supplier's own summary and never a quantity.
 */
export const partnerCatalogPublish = defineCommand({
  id: 'C-21',
  authorization: { kind: 'MEMBER_ROLE', roles: PARTNER_WRITERS },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);

    const productRef = db.doc(paths.product(orgId, payload.sourceProductId));
    const product = await scope.get(productRef);
    if (!product.exists) {
      fail('CROSS_TENANT_REFERENCE', 'The product does not belong to this organization.');
    }
    if (product.get('status') !== 'ACTIVE') {
      fail('PRODUCT_NOT_ACTIVE', 'An archived product cannot be published.');
    }
    if (product.get('partnerPublished') === true) {
      fail('INVALID_TRANSITION', 'This product is already published to your partner catalog.');
    }

    const baseUnit = product.get('baseUnit') as Unit;
    if (payload.orderUnit !== baseUnit) {
      // INV-17, stated as its own failure so the cause is unambiguous.
      fail(
        'SCHEMA_INVALID',
        `A catalog item's order unit must match the product's base unit (${baseUnit}).`,
        { path: 'orderUnit' },
      );
    }

    const partnerSkuNormalized = normalizeSku(payload.partnerSku);
    const clash = await scope.query(
      publishedCatalogQuery(db, orgId).where('partnerSkuNormalized', '==', partnerSkuNormalized),
      1,
    );
    if (!clash.empty) {
      fail('SKU_TAKEN', 'Another published catalog item already uses that partner SKU.');
    }

    // Coarse availability from the supplier's **own** summary. Two words, never
    // a quantity — the exact figure never leaves this organization.
    const summary = await scope.get(
      db.doc(paths.productStockSummary(orgId, payload.sourceProductId)),
    );
    const onHandMilli: unknown = summary.get('onHandMilli');
    const availabilityState =
      typeof onHandMilli === 'number' && deriveStockStatus(onHandMilli, 0) !== 'OUT_OF_STOCK'
        ? 'IN_STOCK'
        : 'OUT_OF_STOCK';

    // ─── every read is done; the write phase begins here ────────────────────
    const now = serverTimestamp();
    const catalogItemId = newId(db, `${paths.organization(orgId)}/partnerCatalog`);
    const currency: unknown = product.get('currency');

    scope.create(db.doc(paths.partnerCatalogItem(orgId, catalogItemId)), {
      catalogItemId,
      sourceProductId: payload.sourceProductId,
      // A3 · DB-CR-036 — supplier-private display snapshots. They live on the
      // document so the supplier's own catalog screen needs no per-row join;
      // they are stripped by `toBuyerCatalogItem` on the way out.
      internalProductNameSnapshot: product.get('name') as string,
      internalSkuSnapshot: product.get('internalSku') as string,
      partnerSku: payload.partnerSku,
      partnerSkuNormalized,
      displayName: payload.displayName,
      orderUnit: payload.orderUnit,
      ...(payload.packDescription !== undefined
        ? { packDescription: payload.packDescription }
        : {}),
      availabilityState,
      ...(payload.wholesalePriceMinor !== undefined
        ? {
            wholesalePriceMinor: payload.wholesalePriceMinor as number,
            ...(typeof currency === 'string' ? { currency } : {}),
          }
        : {}),
      published: true,
      updatedAt: now,
    });
    scope.update(productRef, { partnerPublished: true });

    writeAudit(scope, db, actor, {
      action: 'partnerCatalog.publish',
      entityType: CATALOG_ENTITY,
      entityId: catalogItemId,
      summary: `Published ${payload.displayName} to the partner catalog as ${payload.partnerSku}.`,
    });

    return { catalogItemId, partnerSku: payload.partnerSku, published: true };
  },
});

/**
 * C-22 `partnerCatalog.unpublish` — `PARTNER_WRITERS`, **not** idempotent,
 * transactional, audited.
 *
 * The document is **kept** and flipped to `published: false`. It is not deleted,
 * because `INV-15` requires historical references to stay resolvable: a mapping
 * and every connected order line that ever pointed at this item must still
 * render. `Q-046`/`Q-047` filter on `published == true`, so an unpublished item
 * simply stops being discoverable — which is the whole of what unpublishing
 * means here.
 */
export const partnerCatalogUnpublish = defineCommand({
  id: 'C-22',
  authorization: { kind: 'MEMBER_ROLE', roles: PARTNER_WRITERS },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);

    const itemRef = db.doc(paths.partnerCatalogItem(orgId, payload.catalogItemId));
    const item = await scope.get(itemRef);
    if (!item.exists) {
      fail('CROSS_TENANT_REFERENCE', 'The catalog item does not belong to this organization.');
    }
    if (item.get('published') !== true) {
      fail('INVALID_TRANSITION', 'That catalog item is not published.');
    }

    const sourceProductId = item.get('sourceProductId') as string;
    const productRef = db.doc(paths.product(orgId, sourceProductId));
    const product = await scope.get(productRef);

    // ─── every read is done; the write phase begins here ────────────────────
    scope.update(itemRef, { published: false, updatedAt: serverTimestamp() });
    if (product.exists) scope.update(productRef, { partnerPublished: false });

    writeAudit(scope, db, actor, {
      action: 'partnerCatalog.unpublish',
      entityType: CATALOG_ENTITY,
      entityId: payload.catalogItemId,
      summary: `Removed ${item.get('displayName') as string} from the partner catalog.`,
    });

    return { catalogItemId: payload.catalogItemId, published: false };
  },
});

/**
 * Both read commands establish the same three facts before reading a single
 * catalog row: the connection exists, the caller is its **buyer**, and it is
 * ACTIVE right now. A disabled connection stops the catalog being readable at
 * the same instant it stops new orders (`SC-17`, `ATTACK-09`).
 */
async function requireCatalogAccess(
  scope: TransactionScope,
  db: Firestore,
  actor: ReturnType<typeof requireMembership>,
  connectionId: string,
): Promise<string> {
  const connection = await readCanonicalConnection(scope, db, connectionId);
  requireBuyerSide(actor, connection);
  requireConnectionActive(connection);
  return connection.supplierOrgId;
}

/**
 * C-23 `partnerCatalog.list` — `PARTNER_WRITERS` of a connected buyer, **not**
 * idempotent, no audit, no write.
 *
 * `Q-046` on `IDX-16`: `published == true` ordered by `partnerSkuNormalized`,
 * hard-bounded at 100 server-side whatever the caller asks for. It is a command
 * rather than a query because a Security Rule on the supplier's catalog could
 * not determine which of the caller's organizations is the buyer without an
 * unbounded `get()` per candidate organization (DB-04 §6) — making the catalog
 * callable-only costs one function and removes an entire vulnerability class.
 *
 * **It persists nothing.** No receipt (non-idempotent), no audit row, no
 * side effect of any kind — a read that logged would be a read that wrote.
 */
export const partnerCatalogList = defineCommand({
  id: 'C-23',
  authorization: { kind: 'MEMBER_ROLE', roles: PARTNER_WRITERS },
  handler: async ({ db, scope, membership, payload }) => {
    const actor = requireMembership(membership);
    const supplierOrgId = await requireCatalogAccess(scope, db, actor, payload.connectionId);

    const limit = Math.min(payload.limit, MAX_PARTNER_CATALOG_PAGE);
    const page = await scope.query(
      publishedCatalogQuery(db, supplierOrgId).orderBy('partnerSkuNormalized', 'asc'),
      limit,
    );

    return {
      connectionId: payload.connectionId,
      count: page.size,
      items: page.docs.map(toBuyerCatalogItem),
    };
  },
});

/**
 * C-24 `partnerCatalog.lookupBySku` — `PARTNER_WRITERS` of a connected buyer,
 * **not** idempotent, no audit, no write.
 *
 * `Q-047`: `partnerSkuNormalized == …` and `published == true`, `limit(1)`, on
 * `IDX-16`. The typed SKU is normalised here and used **only** as a lookup key;
 * what the buyer stores is the resolved `catalogItemId` (`BR-008`,
 * `FR-NET-014`). A SKU that resolves to nothing is `SKU_NOT_FOUND` — one of the
 * seven drawn refusal states of the mapping wizard.
 */
export const partnerCatalogLookupBySku = defineCommand({
  id: 'C-24',
  authorization: { kind: 'MEMBER_ROLE', roles: PARTNER_WRITERS },
  handler: async ({ db, scope, membership, payload }) => {
    const actor = requireMembership(membership);
    const supplierOrgId = await requireCatalogAccess(scope, db, actor, payload.connectionId);

    const match = await scope.query(
      publishedCatalogQuery(db, supplierOrgId).where(
        'partnerSkuNormalized',
        '==',
        normalizeSku(payload.partnerSku),
      ),
      1,
    );
    const item = match.docs[0];
    if (!item) {
      fail('SKU_NOT_FOUND', 'No published catalog item uses that SKU.');
    }

    return { connectionId: payload.connectionId, item: toBuyerCatalogItem(item) };
  },
});
