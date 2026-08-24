import { pathToFileURL } from 'node:url';

import { assertBootstrapSafety, getBootstrapContext } from '../bootstrap/context.js';
import { resetEmulator } from '../bootstrap/reset.js';
import { upsertAuthUser } from '../bootstrap/write.js';
import { assertProfileExecutable, resolveProfile, resolveSeed } from './config.js';
import { DatasetBuilder, collectAuthUsers, type QaPlan } from './dataset.js';
import { buildPlan } from './generators/organizations.js';
import { generateIdentity } from './generators/users.js';
import { generateInventory } from './generators/inventory.js';
import { generateMovements } from './generators/movements.js';
import {
  generateNetwork,
  connectedNetworkPlan,
  connectedSubmittedCount,
} from './generators/network.js';
import { generateNotifications } from './generators/notifications.js';
import { generateProcurement, orderedPoCount } from './generators/procurement.js';

/**
 * QA dataset seeder.
 *
 * Emulator-only, enforced before anything else happens: `assertBootstrapSafety`
 * runs on the first line of work, so an invocation without `--target=emulator`,
 * against a non-loopback host, against the wrong project, or with live service
 * account credentials present aborts before a Firestore client is ever
 * constructed.
 *
 * Repeatability comes from reset-before-seed, not from merge idempotence. The
 * generator writes each document exactly once and refuses duplicate ids, so
 * seeding onto a populated emulator is a mistake rather than a no-op. `--keep`
 * exists for inspecting a partially seeded emulator and skips the reset.
 */

/** Firestore caps a write batch at 500 operations. */
const BATCH_LIMIT = 400;

export function buildDataset(plan: QaPlan): DatasetBuilder {
  const builder = new DatasetBuilder();

  // The buyer's `counters/purchaseOrder` allocates numbers for private *and*
  // connected orders, so identity needs both plans before it can write a
  // counter value that agrees with the order numbers on disk.
  const network = connectedNetworkPlan(plan);
  const counters = new Map<string, number>();
  for (const org of plan.organizations) {
    const connected =
      network !== undefined && network.buyer.orgId === org.orgId
        ? connectedSubmittedCount(network)
        : 0;
    counters.set(org.orgId, orderedPoCount(org) + connected);
  }

  generateIdentity(builder, plan, counters);
  generateInventory(builder, plan);
  generateProcurement(builder, plan);
  generateNetwork(builder, plan);
  generateMovements(builder, plan);
  generateNotifications(builder, plan);
  return builder;
}

export async function seedQaDataset(
  argv: readonly string[] = process.argv.slice(2),
): Promise<QaPlan> {
  assertBootstrapSafety([...argv]);

  const definition = resolveProfile(argv);
  assertProfileExecutable(definition);
  const seed = resolveSeed(argv);
  const plan = buildPlan(definition, seed);
  const builder = buildDataset(plan);

  // `--dry-run` stops after the guard and the offline build. It is what lets the
  // safety tests exercise this entrypoint - guard included - without an emulator.
  if (argv.includes('--dry-run')) {
    console.log(`QA_DRY_RUN_DOCUMENTS=${String(builder.size)}`);
    console.log('QA_SEED_RESULT=DRY_RUN');
    return plan;
  }

  if (!argv.includes('--keep')) {
    await resetEmulator();
  }

  const { db, auth } = getBootstrapContext();

  for (const user of collectAuthUsers(plan)) {
    await upsertAuthUser(auth, user);
  }

  const documents = builder.documents;
  for (let offset = 0; offset < documents.length; offset += BATCH_LIMIT) {
    const chunk = documents.slice(offset, offset + BATCH_LIMIT);
    const batch = db.batch();
    for (const document of chunk) {
      try {
        document.write(db, batch);
      } catch (error) {
        throw new Error(
          `QA document ${document.path} failed schema validation: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    await batch.commit();
  }

  console.log(`QA_DATASET_VERSION=${plan.datasetVersion}`);
  console.log(`QA_PROFILE=${plan.profile}`);
  console.log(`QA_SEED=${String(plan.seed)}`);
  console.log(`QA_FIXTURE_EPOCH=${plan.fixtureEpoch}`);
  console.log(`QA_ORGANIZATIONS=${String(plan.organizations.length)}`);
  console.log(`QA_AUTH_USERS=${String(collectAuthUsers(plan).length)}`);
  console.log(`QA_DOCUMENTS_WRITTEN=${String(documents.length)}`);
  console.log('QA_SEED_RESULT=PASS');
  return plan;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await seedQaDataset();
}
