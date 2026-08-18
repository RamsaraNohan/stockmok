import { getSeedContext } from './canonical/context.js';
import { assertPostChain, assertT0 } from './canonical/reconcile.js';
import { replayCanonicalChain } from './canonical/replay.js';
import { seedCanonical } from './canonical/seed.js';

/**
 * `npm run seed` — the canonical command-driven seed (DB-08 §5).
 *
 *   `tsx scripts/seed.ts --target=emulator`            t₀ only
 *   `tsx scripts/seed.ts --target=emulator --chain`    t₀ + the §4 chain
 *
 * Idempotent: every idempotent command carries a stable operation id, so a
 * second run reads its `commandReceipt` and writes nothing. Emulator-only, and
 * fail-closed — see `canonical/context.ts`, which refuses rather than defaults.
 *
 * There is no production path here. `seed:prod` is a separate, interactively
 * confirmed script (DB-08 §5) and does not exist yet.
 */

const argv = process.argv.slice(2);
const context = getSeedContext(argv);

const seed = await seedCanonical(context);
const t0 = await assertT0(context.db, seed);
console.log(`${t0.label}=PASS`);
for (const check of t0.checks) console.log(`  ${check}`);

if (argv.includes('--chain')) {
  await replayCanonicalChain(context, seed);
  const postChain = await assertPostChain(context.db, seed);
  console.log(`${postChain.label}=PASS`);
  for (const check of postChain.checks) console.log(`  ${check}`);
}

console.log('CANONICAL_SEED=OK');
console.log(`BUYER_ORG=${seed.buyerOrgId}`);
console.log(`SUPPLIER_ORG=${seed.supplierOrgId}`);
