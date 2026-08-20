import { test as base } from '@playwright/test';

interface RuntimeEvent {
  readonly kind: 'console' | 'pageerror' | 'requestfailed' | 'response';
  readonly severity?: string;
  readonly text: string;
  readonly url?: string;
}

export const test = base.extend<{ runtimeDiagnostics: undefined }>({
  runtimeDiagnostics: [
    async ({ page }, use, testInfo) => {
      const events: RuntimeEvent[] = [];

      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          events.push({ kind: 'console', severity: message.type(), text: message.text() });
        }
      });
      page.on('pageerror', (error) => {
        events.push({ kind: 'pageerror', text: error.message });
      });
      page.on('requestfailed', (request) => {
        events.push({
          kind: 'requestfailed',
          text: request.failure()?.errorText ?? 'Unknown request failure',
          url: request.url(),
        });
      });
      page.on('response', (response) => {
        if (response.status() >= 400) {
          events.push({
            kind: 'response',
            severity: String(response.status()),
            text: response.statusText(),
            url: response.url(),
          });
        }
      });

      await use(undefined);
      await testInfo.attach('a10-runtime-diagnostics', {
        body: Buffer.from(JSON.stringify(events)),
        contentType: 'application/json',
      });
    },
    { auto: true },
  ],
});
