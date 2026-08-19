import { paths, type Unit } from '@stockmok/shared';
import {
  normalizeSku,
  readCanonicalConnection,
  requireBuyerSide,
  requireConnectionActive,
} from './connected-lib.js';
import { newId, requireMembership } from './lib.js';
import { requireOperationId } from './stock-lib.js';
import { writeAudit } from '../core/audit.js';
import { defineCommand } from '../core/define-command.js';
import { fail } from '../core/errors.js';
import { serverTimestamp } from '../core/time.js';
import { PARTNER_WRITERS } from '../guards/roles.js';

/**
 * `C-25`, `C-26` — product mappings: the buyer's statement that *their* product
 * and *this* supplier catalog item are the same physical thing, and how much of
 * one a unit of the other is.
 *
 * A mapping is stored under the **buyer** organization (DB-02 §6.2) because the
 * conversion factor is the buyer's commercial data and the supplier has no need
 * of it. Nothing about the supplier's private product is copied into it — only
 * the two snapshots taken from the **B2B-safe catalog item** the buyer was
 * already entitled to read.
 *
 * `MappingStatus` is exactly `VERIFIED` | `DISABLED`. `PENDING` and `REJECTED`
 * are B-PLUS and must never appear (DB-07 §7).
 */

const MAPPING_ENTITY = 'PRODUCT_MAPPING';

/**
 * C-25 `mapping.create` — buyer `PARTNER_WRITERS`, idempotent, transactional,
 * audited.
 *
 * DB-07 §7 specifies **seven** server re-validations, in order, refusing to
 * trust any of them from the client. They are performed here in that order and
 * each has its own drawn refusal state:
 *
 *   1. caller is an ACTIVE `PARTNER_WRITERS` of the buyer org  — the frame;
 *   2. the connection exists, is `ACTIVE`, and names the caller as **buyer**;
 *   3. the buyer product exists, is this org's, and is `ACTIVE`;
 *   4. the supplier catalog item exists under **that connection's**
 *      `supplierOrgId`, is `published`, and its `partnerSkuNormalized` equals
 *      the normalised typed SKU;
 *   5. `semanticConfirmed === true`;
 *   6. `supplierToBuyerBaseFactorMilli > 0`;
 *   7. no `VERIFIED` mapping already links this pair (`Q-070`, `IDX-32`).
 *
 * **Step 4 is where a SKU stops being evidence.** The typed SKU is only ever a
 * lookup key and never the stored link (`BR-008`, `FR-NET-014`): the mapping
 * stores the resolved `supplierCatalogItemId`, and the typed value is used once,
 * to prove the buyer was looking at the item they think they were. Two products
 * sharing a SKU string are not thereby the same product, which is exactly why
 * step 5 exists as a separate human confirmation — **a valid SKU alone is not
 * sufficient** (`BR-009`).
 */
export const mappingCreate = defineCommand({
  id: 'C-25',
  authorization: { kind: 'MEMBER_ROLE', roles: PARTNER_WRITERS },
  handler: async ({ db, scope, membership, orgId, payload, operationId }) => {
    const actor = requireMembership(membership);
    const opId = requireOperationId(operationId);

    // 2 · the connection, re-read inside the transaction and proved to name this
    //     organization as the buyer.
    const connection = await readCanonicalConnection(scope, db, payload.connectionId);
    requireBuyerSide(actor, connection);
    requireConnectionActive(connection);

    // 3 · the buyer's own product.
    const product = await scope.get(db.doc(paths.product(orgId, payload.buyerProductId)));
    if (!product.exists) {
      fail('CROSS_TENANT_REFERENCE', 'The product does not belong to this organization.');
    }
    if (product.get('status') !== 'ACTIVE') {
      fail('PRODUCT_NOT_ACTIVE', 'An archived product cannot be mapped.');
    }

    // 4 · the supplier catalog item — read under the connection's OWN
    //     `supplierOrgId`, never under an organization the payload named, so a
    //     forged pairing resolves to a missing document rather than to another
    //     tenant's data.
    const catalogItem = await scope.get(
      db.doc(paths.partnerCatalogItem(connection.supplierOrgId, payload.supplierCatalogItemId)),
    );
    if (!catalogItem.exists) {
      fail('RESOURCE_NOT_FOUND', 'That supplier catalog item was not found.');
    }
    if (catalogItem.get('published') !== true) {
      fail('CATALOG_ITEM_NOT_PUBLISHED', 'That supplier catalog item is not published.');
    }
    if (catalogItem.get('partnerSkuNormalized') !== normalizeSku(payload.typedPartnerSku)) {
      fail('SKU_NOT_FOUND', 'The typed SKU does not match that catalog item.');
    }

    // 5 · the human semantic confirmation. The frozen payload types this field
    //     `literal(true)`, so Zod has already refused anything else before the
    //     handler runs — the cast is what lets the check exist at all, and it
    //     exists because DB-07 §7 names this a *server re-validation* with its
    //     own reason code. A guard that lives only in a type disappears the
    //     moment the type does.
    if (!(payload.semanticConfirmed as boolean)) {
      fail('SEMANTIC_NOT_CONFIRMED', 'The product match must be confirmed before mapping.');
    }

    // 6 · the conversion factor.
    const factorMilli = payload.supplierToBuyerBaseFactorMilli as number;
    if (!Number.isSafeInteger(factorMilli) || factorMilli <= 0) {
      fail(
        'INVALID_FACTOR',
        'The conversion factor must be a positive whole number of milli units.',
      );
    }

    // 7 · `Q-070` on `IDX-32` — no second VERIFIED mapping for this pair,
    //     checked inside the transaction so it cannot be raced.
    const duplicate = await scope.query(
      db
        .collection(`${paths.organization(orgId)}/productMappings`)
        .where('buyerProductId', '==', payload.buyerProductId)
        .where('supplierCatalogItemId', '==', payload.supplierCatalogItemId)
        .where('status', '==', 'VERIFIED'),
      1,
    );
    if (!duplicate.empty) {
      fail('MAPPING_EXISTS', 'This product is already mapped to that supplier item.');
    }

    // ─── every read is done; the write phase begins here ────────────────────
    const now = serverTimestamp();
    const mappingId = newId(db, `${paths.organization(orgId)}/productMappings`);

    scope.create(db.doc(paths.productMapping(orgId, mappingId)), {
      mappingId,
      connectionId: connection.connectionId,
      buyerOrgId: orgId,
      buyerProductId: payload.buyerProductId,
      // A3 · DB-CR-036 — display snapshots so `TABLE-023` needs no cross-role
      // read of `members`, which is ADMINS-only and unreadable by the
      // Procurement Manager who owns the screen.
      buyerProductNameSnapshot: product.get('name') as string,
      buyerSkuSnapshot: product.get('internalSku') as string,
      supplierOrgId: connection.supplierOrgId,
      supplierCatalogItemId: payload.supplierCatalogItemId,
      // From the B2B-safe catalog item — never from the supplier's private
      // product document, which this command does not read and could not use.
      supplierPartnerSkuSnapshot: catalogItem.get('partnerSku') as string,
      supplierDisplayNameSnapshot: catalogItem.get('displayName') as string,
      buyerBaseUnit: product.get('baseUnit') as Unit,
      supplierOrderUnit: catalogItem.get('orderUnit') as Unit,
      supplierToBuyerBaseFactorMilli: factorMilli,
      semanticConfirmedByUid: actor.uid,
      semanticConfirmedByName: actor.displayName,
      semanticConfirmedAt: now,
      status: 'VERIFIED',
      createdAt: now,
    });

    writeAudit(scope, db, actor, {
      action: 'mapping.create',
      entityType: MAPPING_ENTITY,
      entityId: mappingId,
      operationId: opId,
      summary: `Mapped ${product.get('name') as string} to ${catalogItem.get('displayName') as string}.`,
      metadata: { supplierToBuyerBaseFactorMilli: factorMilli },
    });

    return {
      mappingId,
      status: 'VERIFIED',
      supplierCatalogItemId: payload.supplierCatalogItemId,
      supplierToBuyerBaseFactorMilli: factorMilli,
    };
  },
});

/**
 * C-26 `mapping.disable` — buyer `PARTNER_WRITERS`, **not** idempotent,
 * transactional, audited.
 *
 * `VERIFIED → DISABLED`, and `DISABLED` is terminal (DB-07 §7). The document is
 * kept: connected order lines already snapshot their `mappingId` and factor, so
 * `INV-15` holds and a historical order still renders. What a disabled mapping
 * stops is **future** use — `cpo.draftSave`, `cpo.submit` and `cpo.receive` all
 * require `VERIFIED`, so it can never again serve as a receiving conversion.
 */
export const mappingDisable = defineCommand({
  id: 'C-26',
  authorization: { kind: 'MEMBER_ROLE', roles: PARTNER_WRITERS },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);

    const mappingRef = db.doc(paths.productMapping(orgId, payload.mappingId));
    const mapping = await scope.get(mappingRef);
    if (!mapping.exists) {
      fail('CROSS_TENANT_REFERENCE', 'The mapping does not belong to this organization.');
    }
    if (mapping.get('status') !== 'VERIFIED') {
      fail('INVALID_TRANSITION', 'That mapping is already disabled.');
    }

    // ─── every read is done; the write phase begins here ────────────────────
    scope.update(mappingRef, { status: 'DISABLED', disabledAt: serverTimestamp() });

    writeAudit(scope, db, actor, {
      action: 'mapping.disable',
      entityType: MAPPING_ENTITY,
      entityId: payload.mappingId,
      summary: `Disabled the mapping for ${mapping.get('buyerProductNameSnapshot') as string}.`,
    });

    return { mappingId: payload.mappingId, status: 'DISABLED' };
  },
});
