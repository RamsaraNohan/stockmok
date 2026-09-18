import type { TestInfo } from '@playwright/test';

import { macroBAcceptanceIds } from './acceptance-manifest';

export function cover(testInfo: TestInfo, ...ids: readonly string[]) {
  for (const id of ids) {
    if (!macroBAcceptanceIds.has(id)) throw new Error(`Unknown Macro-B acceptance row: ${id}`);
    testInfo.annotations.push({ type: 'acceptance', description: id });
  }
}
