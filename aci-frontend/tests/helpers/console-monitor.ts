/**
 * Console error and warning monitoring
 *
 * MANDATORY: Capture and assert zero console errors in all E2E tests
 *
 * Usage:
 * ```typescript
 * const monitor = new ConsoleMonitor();
 * monitor.attach(page);
 * // ... run tests ...
 * monitor.assertNoErrors();
 * ```
 */

import { Page, expect, ConsoleMessage } from '@playwright/test';

export interface ConsoleEntry {
  readonly type: 'error' | 'warning' | 'info' | 'log';
  readonly text: string;
  readonly timestamp: number;
  readonly location?: string;
}

export class ConsoleMonitor {
  private errors: ConsoleEntry[] = [];
  private warnings: ConsoleEntry[] = [];
  private logs: ConsoleEntry[] = [];
  private isAttached: boolean = false;

  /**
   * Attach console monitoring to a page
   *
   * CRITICAL: Call this at the start of every test
   */
  attach(page: Page): void {
    if (this.isAttached) {
      return;
    }

    this.isAttached = true;

    page.on('console', (msg: ConsoleMessage) => {
      const entry: ConsoleEntry = {
        type: msg.type() as ConsoleEntry['type'],
        text: msg.text(),
        timestamp: Date.now(),
        location: msg.location()
          ? `${msg.location().url}:${msg.location().lineNumber}:${msg.location().columnNumber}`
          : undefined,
      };

      switch (msg.type()) {
        case 'error':
          // Filter out known false positives
          if (!this.isKnownFalsePositive(entry.text)) {
            this.errors.push(entry);
          }
          break;
        case 'warning':
          if (!this.isKnownFalsePositive(entry.text)) {
            this.warnings.push(entry);
          }
          break;
        case 'info':
        case 'log':
          this.logs.push(entry);
          break;
      }
    });

    page.on('pageerror', (err: Error) => {
      const entry: ConsoleEntry = {
        type: 'error',
        text: err.message,
        timestamp: Date.now(),
      };

      if (!this.isKnownFalsePositive(entry.text)) {
        this.errors.push(entry);
      }
    });
  }

  /**
   * Assert zero console errors
   *
   * MANDATORY: Call at end of every test
   */
  assertNoErrors(): void {
    if (this.errors.length === 0) {
      return;
    }

    const errorReport = this.errors
      .map(
        (e, i) =>
          `[${i + 1}] ${e.text}${e.location ? `\n    at ${e.location}` : ''}`
      )
      .join('\n\n');

    expect(
      this.errors,
      `Console errors detected:\n\n${errorReport}`
    ).toHaveLength(0);
  }

  /**
   * Assert no warnings (optional, use for strict testing)
   */
  assertNoWarnings(): void {
    if (this.warnings.length === 0) {
      return;
    }

    const warningReport = this.warnings
      .map(
        (w, i) =>
          `[${i + 1}] ${w.text}${w.location ? `\n    at ${w.location}` : ''}`
      )
      .join('\n\n');

    expect(
      this.warnings,
      `Console warnings detected:\n\n${warningReport}`
    ).toHaveLength(0);
  }

  /**
   * Get all captured errors
   */
  getErrors(): readonly ConsoleEntry[] {
    return [...this.errors];
  }

  /**
   * Get all captured warnings
   */
  getWarnings(): readonly ConsoleEntry[] {
    return [...this.warnings];
  }

  /**
   * Get all captured logs
   */
  getLogs(): readonly ConsoleEntry[] {
    return [...this.logs];
  }

  /**
   * Check if there are any errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Check if there are any warnings
   */
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * Reset all captured messages
   */
  reset(): void {
    this.errors = [];
    this.warnings = [];
    this.logs = [];
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    readonly errors: number;
    readonly warnings: number;
    readonly logs: number;
  } {
    return {
      errors: this.errors.length,
      warnings: this.warnings.length,
      logs: this.logs.length,
    };
  }

  /**
   * Filter out known false positives
   *
   * Add patterns here for legitimate errors/warnings that should be ignored
   */
  private isKnownFalsePositive(message: string): boolean {
    const falsePositivePatterns = [
      // React dev mode warnings
      /Warning: ReactDOM.render/i,
      /Warning: useLayoutEffect/i,

      // Browser extensions
      /chrome-extension:/i,
      /moz-extension:/i,

      // DevTools
      /DevTools/i,

      // Third-party script errors (add as needed)
      /Third party cookie/i,

      // MSW service worker messages (informational)
      /\[MSW\]/i,
      /service worker/i,

      // React Query dev tools
      /React Query Devtools/i,

      // Expected HTTP errors in auth flows
      /401.*Unauthorized/i,
      /403.*Forbidden/i,
      /status of 401/i,
      /status of 403/i,

      // Rate limiting responses (expected in test scenarios)
      /status of 429/i,
      /Too Many Requests/i,
    ];

    return falsePositivePatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Print detailed error report (useful for debugging)
   */
  printReport(): void {
    const summary = this.getSummary();

    console.log('\n=== Console Monitor Report ===');
    console.log(`Errors: ${summary.errors}`);
    console.log(`Warnings: ${summary.warnings}`);
    console.log(`Logs: ${summary.logs}`);

    if (this.errors.length > 0) {
      console.log('\n--- Errors ---');
      this.errors.forEach((e, i) => {
        console.log(`[${i + 1}] ${e.text}`);
        if (e.location) {
          console.log(`    at ${e.location}`);
        }
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n--- Warnings ---');
      this.warnings.forEach((w, i) => {
        console.log(`[${i + 1}] ${w.text}`);
        if (w.location) {
          console.log(`    at ${w.location}`);
        }
      });
    }

    console.log('\n=============================\n');
  }
}

/**
 * Create and attach a console monitor in one step
 *
 * Convenience function for quick setup
 */
export function createConsoleMonitor(page: Page): ConsoleMonitor {
  const monitor = new ConsoleMonitor();
  monitor.attach(page);
  return monitor;
}

/**
 * Fixture-style helper for Playwright tests
 *
 * Usage in test file:
 * ```typescript
 * import { test as base } from '@playwright/test';
 * import { withConsoleMonitor } from './helpers/console-monitor';
 *
 * const test = base.extend({
 *   consoleMonitor: withConsoleMonitor,
 * });
 * ```
 */
export async function withConsoleMonitor({ page }: { page: Page }, use: any): Promise<void> {
  const monitor = new ConsoleMonitor();
  monitor.attach(page);

  await use(monitor);

  // Assert no errors at end of test
  monitor.assertNoErrors();
}
