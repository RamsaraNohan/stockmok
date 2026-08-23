import { mkdirSync, writeFileSync } from 'node:fs';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

import { macroBAcceptanceManifest } from './acceptance-manifest';

/**
 * Macro-B acceptance ledger. Independent from the frozen A10 reporter — blocked
 * (BLOCKED_AUTHORITY_DEPENDENCY) rows are never executable and are reported in
 * their own section rather than counted as required-but-uncovered.
 */
export default class MacroBAcceptanceReporter implements Reporter {
  private readonly passed = new Set<string>();
  private readonly attempted = new Set<string>();
  private readonly runtimeDiagnostics: unknown[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    const ids = test.annotations
      .filter((annotation) => annotation.type === 'acceptance' && annotation.description)
      .map((annotation) => annotation.description as string);

    for (const id of ids) {
      this.attempted.add(id);
      if (result.status === 'passed') this.passed.add(id);
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
    const executableRows = macroBAcceptanceManifest.filter(
      (row) => row.evidenceType !== 'BLOCKED_AUTHORITY_DEPENDENCY',
    );
    const blockedRows = macroBAcceptanceManifest.filter(
      (row) => row.evidenceType === 'BLOCKED_AUTHORITY_DEPENDENCY',
    );

    const rows = executableRows.map((row) => ({
      ...row,
      status: this.passed.has(row.acceptanceId)
        ? 'PASS'
        : this.attempted.has(row.acceptanceId)
          ? 'FAIL'
          : 'NOT_EXECUTED',
    }));
    const blocked = blockedRows.map((row) => ({
      ...row,
      status: 'BLOCKED_AUTHORITY_DEPENDENCY' as const,
    }));

    const report = {
      executableRowsRequired: rows.length,
      executableRowsPassed: rows.filter((row) => row.status === 'PASS').length,
      executableRowsFailed: rows.filter((row) => row.status === 'FAIL').length,
      executableRowsNotExecuted: rows.filter((row) => row.status === 'NOT_EXECUTED').length,
      authorityBlockedRows: blocked.length,
      uncoveredExecutableRows: rows
        .filter((row) => row.status !== 'PASS')
        .map((row) => row.acceptanceId),
      rows,
      blocked,
    };
    mkdirSync('test-results', { recursive: true });
    writeFileSync(
      'test-results/macro-b-acceptance-ledger.json',
      `${JSON.stringify(report, null, 2)}\n`,
    );
    writeFileSync(
      'test-results/macro-b-runtime-diagnostics.json',
      `${JSON.stringify(this.runtimeDiagnostics, null, 2)}\n`,
    );
  }
}
