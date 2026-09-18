import type { TestInfo } from '@playwright/test';

import { acceptanceIds } from './acceptance-manifest';

export function cover(testInfo: TestInfo, ...ids: readonly string[]) {
  for (const id of ids) {
    if (!acceptanceIds.has(id)) throw new Error(`Unknown A10 acceptance row: ${id}`);
    testInfo.annotations.push({ type: 'acceptance', description: id });
  }
}
