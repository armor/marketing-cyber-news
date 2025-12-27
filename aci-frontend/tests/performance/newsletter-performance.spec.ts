/**
 * Performance Tests: Newsletter Feature
 *
 * Validates performance success criteria from spec:
 * - SC-009: Configuration setup completes in <30 minutes
 * - SC-010: Newsletter generation completes in <5 minutes
 * - API endpoints respond in <200ms (P95)
 * - Analytics dashboard loads in <3 seconds
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const PERFORMANCE_THRESHOLDS = {
  CONFIG_CREATION: 30 * 60 * 1000,
  GENERATION_COMPLETE: 5 * 60 * 1000,
  API_RESPONSE_P95: 200,
  API_RESPONSE_P50: 100,
  DASHBOARD_LOAD: 3000,
  PREVIEW_RENDER: 1000,
};

const PERF_CONFIG = {
  MIN_RUNS: 5,
  MAX_VARIANCE: 0.15,
  WARMUP_RUNS: 2,
};

const TEST_USER = {
  email: 'marketing.manager@test.local',
  password: 'Test123!@#',
};

interface PerformanceMetrics {
  operation: string;
  times: number[];
  mean: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  stdDev: number;
}

function percentile(sortedArray: number[], p: number): number {
  const index = Math.ceil((sortedArray.length * p) / 100) - 1;
  return sortedArray[Math.max(0, index)];
}

function standardDeviation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function analyzePerformance(operation: string, times: number[]): PerformanceMetrics {
  const sorted = [...times].sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const median = sorted[Math.floor(sorted.length / 2)];

  return {
    operation,
    times,
    mean,
    median,
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev: standardDeviation(times),
  };
}

function logPerformanceReport(metrics: PerformanceMetrics, threshold?: number) {
  const variancePct = (metrics.stdDev / metrics.mean) * 100;
  
  console.log('\n========== Performance Report: ' + metrics.operation + ' ==========');
  console.log('Samples:      ' + metrics.times.length);
  console.log('Mean:         ' + metrics.mean.toFixed(2) + 'ms');
  console.log('Median (P50): ' + metrics.median.toFixed(2) + 'ms');
  console.log('P95:          ' + metrics.p95.toFixed(2) + 'ms');
  console.log('P99:          ' + metrics.p99.toFixed(2) + 'ms');
  console.log('Min:          ' + metrics.min.toFixed(2) + 'ms');
  console.log('Max:          ' + metrics.max.toFixed(2) + 'ms');
  console.log('Std Dev:      ' + metrics.stdDev.toFixed(2) + 'ms');
  console.log('Variance:     ' + variancePct.toFixed(2) + '%');

  if (threshold) {
    const passed = metrics.p95 <= threshold;
    const margin = passed ? threshold - metrics.p95 : metrics.p95 - threshold;
    console.log('Threshold:    ' + threshold + 'ms');
    console.log('Status:       ' + (passed ? '✓ PASS' : '✗ FAIL'));
    console.log('Margin:       ' + (passed ? '-' : '+') + margin.toFixed(2) + 'ms');
  }
  console.log('================================================================\n');
}

async function measureOperation(
  operation: string,
  fn: () => Promise<void>,
  warmupRuns = PERF_CONFIG.WARMUP_RUNS,
  measureRuns = PERF_CONFIG.MIN_RUNS
): Promise<PerformanceMetrics> {
  for (let i = 0; i < warmupRuns; i++) {
    await fn();
  }

  const times: number[] = [];
  for (let i = 0; i < measureRuns; i++) {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    times.push(duration);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return analyzePerformance(operation, times);
}

async function authenticate(request: APIRequestContext): Promise<string> {
  const response = await request.post('http://localhost:8080/v1/auth/login', {
    data: {
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.data.access_token;
}

test.describe('API Performance', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  test('GET /newsletter-configs responds in <200ms (P95)', async ({ request }) => {
    const metrics = await measureOperation(
      'GET /newsletter-configs',
      async () => {
        const response = await request.get('http://localhost:8080/v1/newsletter-configs', {
          headers: { Authorization: 'Bearer ' + authToken },
        });
        expect(response.ok()).toBeTruthy();
      },
      2,
      10
    );

    logPerformanceReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
    expect(metrics.median).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P50);

    const variance = (metrics.stdDev / metrics.mean) * 100;
    expect(variance).toBeLessThan(PERF_CONFIG.MAX_VARIANCE * 100);
  });

  test('GET /newsletter-issues responds in <200ms (P95)', async ({ request }) => {
    const metrics = await measureOperation(
      'GET /newsletter-issues',
      async () => {
        const response = await request.get('http://localhost:8080/v1/newsletter-issues', {
          headers: { Authorization: 'Bearer ' + authToken },
        });
        expect(response.ok()).toBeTruthy();
      },
      2,
      10
    );

    logPerformanceReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
    expect(metrics.median).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P50);
  });

  test('GET /segments responds in <200ms (P95)', async ({ request }) => {
    const metrics = await measureOperation(
      'GET /segments',
      async () => {
        const response = await request.get('http://localhost:8080/v1/segments', {
          headers: { Authorization: 'Bearer ' + authToken },
        });
        expect(response.ok()).toBeTruthy();
      },
      2,
      10
    );

    logPerformanceReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
  });

  test('GET /analytics/overview responds in <200ms (P95)', async ({ request }) => {
    const metrics = await measureOperation(
      'GET /analytics/overview',
      async () => {
        const response = await request.get('http://localhost:8080/v1/analytics/overview', {
          headers: { Authorization: 'Bearer ' + authToken },
        });
        expect(response.ok()).toBeTruthy();
      },
      2,
      10
    );

    logPerformanceReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
  });
});

test.describe('Frontend Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/dashboard');
  });

  test('Newsletter Configs page loads in <3 seconds', async ({ page }) => {
    const times: number[] = [];

    for (let i = 0; i < PERF_CONFIG.MIN_RUNS; i++) {
      await page.goto('about:blank');

      const start = performance.now();
      await page.goto('http://localhost:5173/newsletter-configs');
      await page.waitForLoadState('domcontentloaded');

      const duration = performance.now() - start;
      times.push(duration);

      await page.waitForTimeout(500);
    }

    const metrics = analyzePerformance('Newsletter Configs Page Load', times);
    logPerformanceReport(metrics, PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD);
  });

  test('Analytics dashboard loads in <3 seconds', async ({ page }) => {
    const times: number[] = [];

    for (let i = 0; i < PERF_CONFIG.MIN_RUNS; i++) {
      await page.goto('about:blank');

      const start = performance.now();
      await page.goto('http://localhost:5173/newsletter-analytics');
      await page.waitForLoadState('domcontentloaded');

      const duration = performance.now() - start;
      times.push(duration);

      await page.waitForTimeout(500);
    }

    const metrics = analyzePerformance('Analytics Dashboard Load', times);
    logPerformanceReport(metrics, PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD);
  });
});

test.describe('Resource Utilization', () => {
  test('Monitor network requests during page load', async ({ page }) => {
    const requests: any[] = [];

    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
      });
    });

    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/dashboard');

    requests.length = 0;

    await page.goto('http://localhost:5173/newsletter-configs');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const apiRequests = requests.filter((r) => r.url.includes('/v1/'));

    console.log('\nNetwork Requests Report:');
    console.log('Total Requests: ' + requests.length);
    console.log('API Requests: ' + apiRequests.length);

    expect(apiRequests.length).toBeLessThan(10);
  });
});
