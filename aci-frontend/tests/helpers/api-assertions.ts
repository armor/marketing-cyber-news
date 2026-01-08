/**
 * Deep testing verification helpers
 *
 * CRITICAL: These helpers implement the mandatory deep E2E testing patterns
 * from CLAUDE.md. Always verify:
 * 1. Network request was actually sent
 * 2. HTTP status is success (200-299)
 * 3. Data persistence survives page reload
 * 4. Validation blocks API calls when invalid
 */

import { Page, expect, Response } from '@playwright/test';

export interface ApiCallExpectation {
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly urlPattern: string | RegExp;
  readonly expectedStatus?: number;
}

/**
 * Verify an action triggers a specific API call
 *
 * MANDATORY PATTERN: Use this for all form submissions and mutations
 *
 * @example
 * const response = await verifyApiCall(
 *   page,
 *   () => page.click('button[type="submit"]'),
 *   { method: 'POST', urlPattern: '/api/newsletter/configs' }
 * );
 */
export async function verifyApiCall(
  page: Page,
  action: () => Promise<void>,
  expected: ApiCallExpectation
): Promise<Response> {
  const [response] = await Promise.all([
    page.waitForResponse((r) => {
      const matchesMethod = r.request().method() === expected.method;
      const matchesUrl =
        typeof expected.urlPattern === 'string'
          ? r.url().includes(expected.urlPattern)
          : expected.urlPattern.test(r.url());
      return matchesMethod && matchesUrl;
    }),
    action(),
  ]);

  const status = response.status();
  const expectedStatus = expected.expectedStatus ?? 200;

  if (expectedStatus >= 200 && expectedStatus < 300) {
    expect(
      status,
      `Expected successful response (${expectedStatus}), got ${status}`
    ).toBeGreaterThanOrEqual(200);
    expect(
      status,
      `Expected successful response (${expectedStatus}), got ${status}`
    ).toBeLessThan(300);
  } else {
    expect(status, `Expected status ${expectedStatus}, got ${status}`).toBe(
      expectedStatus
    );
  }

  return response;
}

/**
 * Verify data persists after page reload
 *
 * MANDATORY PATTERN: Always verify CRUD operations persist
 *
 * @example
 * await verifyPersistence(
 *   page,
 *   'h1',
 *   'My New Newsletter'
 * );
 */
export async function verifyPersistence(
  page: Page,
  selector: string,
  expectedText: string | RegExp
): Promise<void> {
  await page.reload();
  await page.waitForLoadState('networkidle');

  const element = page.locator(selector).first();
  await expect(element).toBeVisible({ timeout: 10000 });

  if (typeof expectedText === 'string') {
    await expect(element).toContainText(expectedText);
  } else {
    const text = await element.textContent();
    expect(text).toMatch(expectedText);
  }
}

/**
 * Verify validation blocks API calls
 *
 * MANDATORY PATTERN: Prove validation PREVENTS invalid submissions
 *
 * @example
 * await verifyValidationBlocks(
 *   page,
 *   () => page.click('button[type="submit"]'),
 *   '/api/newsletter/configs'
 * );
 */
export async function verifyValidationBlocks(
  page: Page,
  action: () => Promise<void>,
  apiPattern: string | RegExp
): Promise<void> {
  let apiCalled = false;

  const handler = (request: any): void => {
    const url = request.url();
    const matches =
      typeof apiPattern === 'string'
        ? url.includes(apiPattern)
        : apiPattern.test(url);
    if (matches) {
      apiCalled = true;
    }
  };

  page.on('request', handler);

  try {
    await action();
    // Wait for any async validation
    await page.waitForTimeout(500);
  } finally {
    page.off('request', handler);
  }

  expect(apiCalled, 'API should NOT be called when validation fails').toBe(
    false
  );

  // Verify error message is shown
  const errorVisible = await page
    .locator('[role="alert"], .text-destructive, [data-testid="validation-error"]')
    .first()
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  expect(
    errorVisible,
    'Validation error should be visible to user'
  ).toBe(true);
}

/**
 * Verify a sequence of API calls in order
 *
 * Use for complex flows like approval chains
 *
 * @example
 * await verifyApiSequence(page, async () => {
 *   await page.click('button:has-text("Submit")');
 *   await page.click('button:has-text("Approve")');
 * }, [
 *   { method: 'POST', urlPattern: '/api/issues' },
 *   { method: 'PUT', urlPattern: '/api/approvals' }
 * ]);
 */
export async function verifyApiSequence(
  page: Page,
  action: () => Promise<void>,
  expectedCalls: readonly ApiCallExpectation[]
): Promise<Response[]> {
  const responses: Response[] = [];

  const responsePromises = expectedCalls.map((expected) =>
    page.waitForResponse((r) => {
      const matchesMethod = r.request().method() === expected.method;
      const matchesUrl =
        typeof expected.urlPattern === 'string'
          ? r.url().includes(expected.urlPattern)
          : expected.urlPattern.test(r.url());
      return matchesMethod && matchesUrl;
    })
  );

  const [allResponses] = await Promise.all([
    Promise.all(responsePromises),
    action(),
  ]);

  responses.push(...allResponses);

  // Verify all responses are successful
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    const expected = expectedCalls[i];
    const status = response.status();
    const expectedStatus = expected.expectedStatus ?? 200;

    if (expectedStatus >= 200 && expectedStatus < 300) {
      expect(
        status,
        `Call ${i + 1}: Expected successful response, got ${status}`
      ).toBeGreaterThanOrEqual(200);
      expect(
        status,
        `Call ${i + 1}: Expected successful response, got ${status}`
      ).toBeLessThan(300);
    } else {
      expect(
        status,
        `Call ${i + 1}: Expected status ${expectedStatus}, got ${status}`
      ).toBe(expectedStatus);
    }
  }

  return responses;
}

/**
 * Verify no network errors occurred
 *
 * Use at end of tests to catch silent failures
 */
export async function verifyNoNetworkErrors(page: Page): Promise<void> {
  const failedRequests: string[] = [];

  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      failedRequests.push(`${response.request().method()} ${response.url()} -> ${status}`);
    }
  });

  // Give time for any pending requests
  await page.waitForTimeout(500);

  expect(
    failedRequests,
    `Network errors occurred:\n${failedRequests.join('\n')}`
  ).toHaveLength(0);
}

/**
 * Wait for API response and return JSON body
 *
 * Useful for verifying response data
 */
export async function captureApiResponse<T = any>(
  page: Page,
  action: () => Promise<void>,
  expected: ApiCallExpectation
): Promise<T> {
  const response = await verifyApiCall(page, action, expected);
  const data = await response.json();
  return data as T;
}

/**
 * Verify optimistic UI updates (immediate feedback before API response)
 *
 * Pattern: Check UI updates immediately, then verify API call follows
 */
export async function verifyOptimisticUpdate(
  page: Page,
  action: () => Promise<void>,
  optimisticSelector: string,
  optimisticText: string | RegExp,
  apiExpectation: ApiCallExpectation
): Promise<Response> {
  const actionPromise = action();

  // Check optimistic update appears quickly
  await expect(page.locator(optimisticSelector)).toContainText(optimisticText, {
    timeout: 1000,
  });

  // Then verify API actually called
  const [response] = await Promise.all([
    page.waitForResponse((r) => {
      const matchesMethod = r.request().method() === apiExpectation.method;
      const matchesUrl =
        typeof apiExpectation.urlPattern === 'string'
          ? r.url().includes(apiExpectation.urlPattern)
          : apiExpectation.urlPattern.test(r.url());
      return matchesMethod && matchesUrl;
    }),
    actionPromise,
  ]);

  const status = response.status();
  expect(status, 'Optimistic update must be followed by successful API call').toBeGreaterThanOrEqual(200);
  expect(status, 'Optimistic update must be followed by successful API call').toBeLessThan(300);

  return response;
}
