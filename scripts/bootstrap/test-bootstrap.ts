import assert from 'node:assert/strict';
import { getBootstrapContext } from './context.js';
import {
  assertReplayReconciliation,
  assertT0Reconciliation,
  normalizedFirestoreState,
  validateAllBootstrapDocuments,
} from './reconcile.js';
import { replayBootstrap } from './replay.js';
import { resetEmulator } from './reset.js';
import { seedBootstrap } from './seed.js';

const mode = process.argv.find((argument) => argument === 't0' || argument === 'replay');
assert.ok(mode, 'Expected bootstrap evidence mode: t0 or replay');
const context = getBootstrapContext();

await resetEmulator();
await seedBootstrap(context);
await assertT0Reconciliation(context.db);
await validateAllBootstrapDocuments(context.db);
const firstT0 = await normalizedFirestoreState(context.db);
await seedBootstrap(context);
const secondT0 = await normalizedFirestoreState(context.db);
assert.equal(
  secondT0,
  firstT0,
  'bootstrap t0 seed must be idempotent after Timestamp normalization',
);

if (mode === 't0') {
  await resetEmulator();
  await seedBootstrap(context);
  assert.equal(
    await normalizedFirestoreState(context.db),
    firstT0,
    'reset/reseed must reproduce t0 exactly',
  );
  console.log('T-SEED-01a-BOOTSTRAP=PASS');
} else {
  await replayBootstrap(context);
  await assertReplayReconciliation(context.db);
  await validateAllBootstrapDocuments(context.db);
  const firstReplay = await normalizedFirestoreState(context.db);
  await replayBootstrap(context);
  assert.equal(
    await normalizedFirestoreState(context.db),
    firstReplay,
    'bootstrap replay must be idempotent after Timestamp normalization',
  );
  await resetEmulator();
  await seedBootstrap(context);
  await replayBootstrap(context);
  assert.equal(
    await normalizedFirestoreState(context.db),
    firstReplay,
    'reset/reseed/replay must reproduce exactly',
  );
  console.log('T-SEED-01b-BOOTSTRAP=PASS');
}
