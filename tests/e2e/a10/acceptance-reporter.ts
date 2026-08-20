import { mkdirSync, writeFileSync } from 'node:fs';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

import { acceptanceManifest } from './acceptance-manifest';

export default class AcceptanceReporter implements Reporter {
  private readonly passed = new Set<string>();
  private readonly runtimeDiagnostics: unknown[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed') {
      for (const annotation of test.annotations) {
        if (annotation.type === 'acceptance' && annotation.description) {
          this.passed.add(annotation.description);
        }
      }
    }

    const attachment = result.attachments.find(({ name }) => name === 'a10-runtime-diagnostics');
    if (attachment?.body) {
      this.runtimeDiagnostics.push({
        project: test.parent.project()?.name,
        status: result.status,
        test: test.titlePath().join(' > '),
        events: JSON.parse(attachment.body.toString()) as unknown,
      });
    }
  }

  onEnd() {
    const rows = acceptanceManifest.map((row) => ({
      ...row,
      status: this.passed.has(row.acceptanceId) ? 'PASS' : 'NOT_EXECUTED',
    }));
    const report = {
      liveFeaturesRequired: rows.length,
      liveFeaturesCovered: rows.filter((row) => row.status === 'PASS').length,
      uncoveredImplementedFeatures: rows
        .filter((row) => row.status !== 'PASS')
        .map((row) => row.acceptanceId),
      rows,
    };
    mkdirSync('test-results', { recursive: true });
    writeFileSync(
      'test-results/a10-acceptance-ledger.json',
      `${JSON.stringify(report, null, 2)}\n`,
    );
    writeFileSync(
      'test-results/a10-runtime-diagnostics.json',
      `${JSON.stringify(this.runtimeDiagnostics, null, 2)}\n`,
    );
  }
}
