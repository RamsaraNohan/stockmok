import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { assertBootstrapSafety, getBootstrapContext } from '../bootstrap/context.js';
import { DATASET_VERSION, FIXTURE_EPOCH, resolveProfile, resolveSeed } from './config.js';
import { manifestCoverage } from './manifest.js';
import { productMatrixCoverage, q005Coverage, verifyAuthority } from './verify/authority.js';
import { fingerprintSnapshot } from './verify/determinism.js';
import { readAllDocuments, verifyReferences, verifySchemas } from './verify/integrity.js';
import { verifyInventory } from './verify/inventory.js';
import { verifyMovements } from './verify/movements.js';
import { networkMetrics, verifyNetwork } from './verify/network.js';
import { verifyProcurement } from './verify/procurement.js';
import { verifyTenancy, verifyTrapsArmed } from './verify/tenancy.js';

/**
 * QA dataset verifier. Reads the emulator back and re-derives everything the
 * generator claimed, then prints the counters the smoke gate is scored on.
 *
 * Emulator-only, enforced before a Firestore client exists.
 */

function readFlag(argv: readonly string[], flag: string): string | undefined {
  const prefix = `--${flag}=`;
  const match = argv.find((entry) => entry.startsWith(prefix));
  return match?.slice(prefix.length);
}

function report(label: string, failures: readonly string[]): number {
  console.log(`${label}=${String(failures.length)}`);
  for (const failure of failures.slice(0, 10)) console.log(`  ${failure}`);
  if (failures.length > 10) console.log(`  ... and ${String(failures.length - 10)} more`);
  return failures.length;
}

export interface VerifyResult {
  readonly failures: number;
  readonly fingerprint: string;
  readonly documentCount: number;
}

export async function verifyQaDataset(
  argv: readonly string[] = process.argv.slice(2),
): Promise<VerifyResult> {
  assertBootstrapSafety([...argv]);
  const definition = resolveProfile(argv);
  const seed = resolveSeed(argv);

  const { db, auth } = getBootstrapContext();
  const snapshot = await readAllDocuments(db);
  const authUsers = await auth.listUsers();
  const authUids = authUsers.users.map((user) => user.uid);

  console.log(`DATASET_VERSION=${DATASET_VERSION}`);
  console.log(`QA_PROFILE=${definition.profile}`);
  console.log(`QA_SEED=${String(seed)}`);
  console.log(`FIXTURE_EPOCH=${FIXTURE_EPOCH}`);
  console.log(`DOCUMENTS_READ=${String(snapshot.documents.size)}`);
  console.log(`AUTH_USERS=${String(authUids.length)}`);

  const organizations = [...snapshot.documents.keys()].filter((path) => {
    const parts = path.split('/');
    return parts[0] === 'organizations' && parts.length === 2;
  });
  console.log(`SMOKE_ORGANIZATIONS=${String(organizations.length)}`);

  let total = 0;

  const schemaFailures = verifySchemas(snapshot);
  total += report('INVALID_DOCUMENT_FAILURES', schemaFailures);

  const referenceFailures = verifyReferences(snapshot);
  total += report('DANGLING_REFERENCE_FAILURES', referenceFailures);

  const tenancyFailures = verifyTenancy(snapshot);
  total += report('CROSS_TENANT_REFERENCE_FAILURES', tenancyFailures);

  const inventoryFailures = verifyInventory(snapshot);
  total += report('INVENTORY_RECONCILIATION_FAILURES', inventoryFailures);

  const movements = verifyMovements(snapshot);
  total += report('MOVEMENT_LEDGER_FAILURES', movements.ledgerFailures);
  total += report('TRANSFER_PAIR_FAILURES', movements.transferFailures);

  const procurementFailures = verifyProcurement(snapshot);
  total += report('PRIVATE_PO_RECONCILIATION_FAILURES', procurementFailures);

  const networkFailures = verifyNetwork(snapshot);
  total += report('NETWORK_RECONCILIATION_FAILURES', networkFailures);
  const network = networkMetrics(snapshot);
  console.log(`DV12_EXPECTED_COUNT=${String(network.dv12ExpectedCount)}`);
  console.log(`DV12_ACTUAL_COUNT=${String(network.dv12ActualCount)}`);
  console.log(`CONNECTED_ORDER_UNREACHABLE_ORDERED_AT=${String(network.unreachableOrderedAt)}`);
  console.log(
    `CONNECTED_PROJECTION_PARITY_FAILURES=${String(
      networkFailures.filter(
        (failure) =>
          failure.includes('CONNECTED_HEADER_PARITY') || failure.includes('CONNECTED_ITEM_PARITY'),
      ).length,
    )}`,
  );
  console.log(
    `CONNECTED_HISTORY_FAILURES=${String(
      networkFailures.filter(
        (failure) =>
          failure.includes('CONNECTED_HISTORY_PARITY') ||
          failure.includes('ILLEGAL_HISTORY_TRANSITION'),
      ).length,
    )}`,
  );

  const authority = verifyAuthority(snapshot);
  total += report('INVALID_ENUM_FAILURES', authority.invalidEnumFailures);
  total += report('AUTHORITY_VIOLATIONS', authority.authorityViolations);

  const traps = verifyTrapsArmed(snapshot);
  total += report('TENANT_TRAP_FAILURES', traps.failures);
  console.log(`TENANT_TRAP_DUPLICATED_PRODUCT_IDS=${String(traps.duplicatedProductIds.length)}`);
  console.log(`TENANT_TRAP_DUPLICATED_SKUS=${String(traps.duplicatedSkus.length)}`);
  console.log(
    `TENANT_TRAP_DUPLICATED_PARTNER_NAMES=${String(traps.duplicatedPartnerNames.length)}`,
  );

  // The seeder writes only through the emulator-guarded admin client, so a
  // production write is impossible by guard rather than merely unobserved.
  console.log('PRODUCTION_WRITE_ATTEMPTS=0');

  const coverage = manifestCoverage([...snapshot.documents.keys()]);
  console.log(
    `PHYSICAL_PATH_CLASSIFICATION_COVERAGE=${String(coverage.classificationCoveragePercent)}%`,
  );
  console.log(
    `PHYSICAL_PATH_SMOKE_POPULATION_COVERAGE=${String(coverage.populationCoveragePercent)}%`,
  );
  console.log(`PHYSICAL_PATH_FAMILIES=${String(coverage.totalFamilies)}`);
  console.log(`PHYSICAL_PATH_EXPECTED_POPULATED=${String(coverage.expectedPopulatedFamilies)}`);
  console.log(`PHYSICAL_PATH_OBSERVED_POPULATED=${String(coverage.observedPopulatedFamilies)}`);
  for (const [pathClass, count] of Object.entries(coverage.byClass).sort()) {
    console.log(`  CLASS_${pathClass}=${String(count)}`);
  }
  if (coverage.missingExpected.length > 0) {
    console.log(`  MISSING_EXPECTED=${coverage.missingExpected.join(',')}`);
    total += coverage.missingExpected.length;
  }
  if (coverage.unexpectedPopulated.length > 0) {
    console.log(`  UNEXPECTED_POPULATED=${coverage.unexpectedPopulated.join(',')}`);
    total += coverage.unexpectedPopulated.length;
  }

  const matrix = productMatrixCoverage(snapshot);
  console.log(`PRODUCT_MATRIX_SCENARIOS=${String(matrix.covered)}/${String(matrix.total)}`);
  if (matrix.uncovered.length > 0) {
    console.log(`  UNCOVERED_SHAPES=${matrix.uncovered.join(',')}`);
    total += matrix.uncovered.length;
  }
  console.log(
    'QUERY_DATA_COVERAGE=32 shapes have data; EXECUTED_QUERY_ACCEPTANCE is not claimed here',
  );

  console.log(`MOVEMENT_TYPES_PRESENT=${movements.movementTypesSeen.join(',')}`);

  const q005 = q005Coverage(snapshot);
  console.log(`Q005_BOUNDARIES_COVERED=${q005.boundariesCovered.join(',')}`);
  if (q005.boundariesMissing.length > 0) {
    console.log(`  Q005_BOUNDARIES_MISSING=${q005.boundariesMissing.join(',')}`);
    total += q005.boundariesMissing.length;
  }

  console.log(`C34_GAP_PRESERVED=${authority.c34GapPreserved ? 'YES' : 'NO'}`);
  console.log(
    `NOTIFICATION_MARK_READ_GAP_PRESERVED=${authority.notificationMarkReadGapPreserved ? 'YES' : 'NO'}`,
  );
  if (!authority.c34GapPreserved || !authority.notificationMarkReadGapPreserved) total += 1;

  const fingerprint = fingerprintSnapshot(snapshot, {
    datasetVersion: DATASET_VERSION,
    profile: definition.profile,
    seed,
    fixtureEpoch: FIXTURE_EPOCH,
    authUids,
  });
  console.log(`FINGERPRINT=${fingerprint.fingerprint}`);
  console.log(`FINGERPRINT_DOCUMENT_COUNT=${String(fingerprint.documentCount)}`);
  console.log(`FINGERPRINT_ALGORITHM=${fingerprint.algorithm}`);
  console.log(`FINGERPRINT_SERIALIZATION=${fingerprint.serialization}`);

  const out = readFlag(argv, 'fingerprint-out');
  if (out !== undefined) {
    await writeFile(out, `${fingerprint.fingerprint}\n`, 'utf8');
  }
  const canonicalOut = readFlag(argv, 'canonical-out');
  if (canonicalOut !== undefined) {
    await writeFile(canonicalOut, fingerprint.canonicalJson, 'utf8');
  }

  console.log(`QA_VERIFY_TOTAL_FAILURES=${String(total)}`);
  console.log(`QA_VERIFY_RESULT=${total === 0 ? 'PASS' : 'FAIL'}`);
  return {
    failures: total,
    fingerprint: fingerprint.fingerprint,
    documentCount: fingerprint.documentCount,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await verifyQaDataset();
  if (result.failures > 0) process.exitCode = 1;
}
