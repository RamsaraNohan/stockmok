import { assertBootstrapSafety } from '../bootstrap/context.js';
import { resolveProfile } from './config.js';
import { seedQaDataset } from './seed.js';
import { verifyQaDataset } from './verify.js';

/**
 * Determinism proof.
 *
 * Two complete reset-seed-verify cycles in one emulator session, compared by
 * fingerprint. Identical hashes over two runs that each began from an empty
 * emulator mean the generator depends on nothing but its seed and configuration:
 * not on wall-clock time, not on iteration order, not on what the previous run
 * left behind.
 *
 * Both fingerprints stay in memory. Writing them to disk would leave untracked
 * files in the worktree for a git scope audit to trip over.
 */

const argv = process.argv.slice(2);
assertBootstrapSafety([...argv]);
const label = resolveProfile(argv).profile.toUpperCase();

console.log(`--- ${label} RUN 1 ---`);
await seedQaDataset(argv);
const first = await verifyQaDataset(argv);

console.log(`--- ${label} RUN 2 ---`);
await seedQaDataset(argv);
const second = await verifyQaDataset(argv);

console.log('--- DETERMINISM ---');
console.log(`${label}_RUN_1_FINGERPRINT=${first.fingerprint}`);
console.log(`${label}_RUN_2_FINGERPRINT=${second.fingerprint}`);
console.log(`FINGERPRINT_DOCUMENT_COUNT=${String(first.documentCount)}`);

const verified = first.failures === 0 && second.failures === 0;
const identical = first.fingerprint === second.fingerprint;

console.log(`${label}_VERIFICATION=${verified ? 'PASS' : 'FAIL'}`);
console.log(`${label}_DETERMINISM=${identical ? 'PASS' : 'FAIL'}`);

if (!verified || !identical) {
  process.exitCode = 1;
}
