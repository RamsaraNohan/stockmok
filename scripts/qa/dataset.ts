import type { DocumentData, Firestore, WriteBatch } from 'firebase-admin/firestore';
import type { z } from 'zod';

import type {
  LifecycleStatus,
  Role,
  Unit,
  WarehouseType,
} from '../../packages/shared/src/primitives.js';
import { setValidated } from '../bootstrap/write.js';

/**
 * In-memory model of the QA dataset.
 *
 * Generators build a plan; `seed.ts` writes it. Keeping the two apart means the
 * plan can be inspected and unit-tested without an emulator, and it keeps every
 * write flowing through the governed `setValidated` path.
 */

export interface QaDocument {
  readonly path: string;
  /**
   * The schema is captured in this closure rather than stored alongside the
   * value, which keeps a heterogeneous document list type-safe without widening
   * every schema to a common supertype.
   */
  readonly write: (db: Firestore, batch: WriteBatch) => void;
}

export class DatasetBuilder {
  private readonly entries: QaDocument[] = [];
  private readonly parsed = new Map<string, DocumentData>();

  add<T extends DocumentData>(path: string, schema: z.ZodType<T>, value: unknown): void {
    if (this.parsed.has(path)) {
      throw new Error(`QA generator wrote ${path} twice; document ids must be unique`);
    }
    // Parsing here rather than only at write time buys two things: a failure
    // names the path that caused it, and the resulting document map lets the
    // verifiers run against the plan with no emulator in the loop.
    let document: T;
    try {
      document = schema.parse(value);
    } catch (error) {
      throw new Error(
        `QA document ${path} failed schema validation: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    this.parsed.set(path, document);
    this.entries.push({
      path,
      write: (db, batch) => {
        setValidated(db, batch, path, schema, value);
      },
    });
  }

  get documents(): readonly QaDocument[] {
    return this.entries;
  }

  get size(): number {
    return this.entries.length;
  }

  /**
   * The dataset as it will land in Firestore, keyed by path. Structurally this
   * is a `QaSnapshot`, which is what lets the verifiers be unit-tested offline.
   */
  toDocumentMap(): ReadonlyMap<string, DocumentData> {
    return this.parsed;
  }
}

export interface QaAuthUser {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
}

export interface QaUser extends QaAuthUser {
  readonly role: Role;
  /**
   * Q-005 boundary driver. The unread count is asserted verbatim by the
   * notification verifier, so these numbers are contract, not decoration.
   */
  readonly unreadNotifications: number;
  readonly readNotifications: number;
}

export interface QaCategory {
  readonly categoryId: string;
  readonly name: string;
}

export interface QaWarehouse {
  readonly warehouseId: string;
  readonly name: string;
  readonly type: WarehouseType;
}

export interface QaProduct {
  readonly productId: string;
  readonly internalSku: string;
  readonly name: string;
  readonly categoryId: string;
  readonly baseUnit: Unit;
  readonly purchaseCostMinor: number;
  readonly minimumStockMilli: number;
  readonly reorderTargetMilli: number;
  readonly status: LifecycleStatus;
  readonly partnerPublished: boolean;
  /** Distinct per product so `productUpdatedAt DESC` sorts are observable. */
  readonly updatedAtDayOffset: number;
  /** Warehouses this product holds a stock balance in. */
  readonly warehouseIds: readonly string[];
  /** Target on-hand per warehouse; the movement ledger is built to land exactly here. */
  readonly targetOnHandMilli: Readonly<Record<string, number>>;
}

export type QaNetworkRole = 'BUYER' | 'SUPPLIER' | 'ISOLATED';
export type QaSpecialKind =
  'EMPTY' | 'TINY' | 'LOW_STOCK' | 'ARCHIVED' | 'NETWORK_OFF' | 'HIGH_VOLUME';

export interface QaOrg {
  readonly profile: 'smoke' | 'wide';
  readonly specialKind?: QaSpecialKind;
  readonly orgId: string;
  readonly handle: string;
  readonly name: string;
  readonly industry: string;
  readonly country: string;
  readonly currency: string;
  readonly timezone: string;
  readonly monogram: string;
  readonly monogramColor: string;
  readonly ownerUid: string;
  readonly defaultWarehouseId: string;
  readonly purchaseOrderPrefix: string;
  readonly networkRole: QaNetworkRole;
  readonly users: readonly QaUser[];
  readonly categories: readonly QaCategory[];
  readonly warehouses: readonly QaWarehouse[];
  readonly products: readonly QaProduct[];
}

export interface QaPlan {
  readonly datasetVersion: string;
  readonly profile: string;
  readonly seed: number;
  readonly fixtureEpoch: string;
  readonly organizations: readonly QaOrg[];
}

/** Every Auth account the dataset needs, deduplicated across organizations. */
export function collectAuthUsers(plan: QaPlan): readonly QaAuthUser[] {
  const byUid = new Map<string, QaAuthUser>();
  for (const org of plan.organizations) {
    for (const user of org.users) {
      byUid.set(user.uid, { uid: user.uid, email: user.email, displayName: user.displayName });
    }
  }
  return [...byUid.values()].sort((left, right) => left.uid.localeCompare(right.uid));
}
