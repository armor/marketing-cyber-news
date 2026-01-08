/**
 * API Latency Performance Tests
 *
 * Validates API response time requirements:
 * - All endpoints respond in <200ms (P95)
 * - P50 (median) response time <100ms
 * - Consistent performance under load
 *
 * Run with:
 *   npx playwright test tests/performance/api-latency.spec.ts
 */

import { test, expect, APIRequestContext } from '@playwright/test';

const PERFORMANCE_THRESHOLDS = {
  API_RESPONSE_P95: 200, // 200ms P95
  API_RESPONSE_P50: 100, // 100ms P50 (median)
  MAX_VARIANCE: 0.20, // 20% maximum variance
};

const TEST_CONFIG = {
  WARMUP_RUNS: 2,
  MEASUREMENT_RUNS: 20,
  COOLDOWN_MS: 50,
};

const TEST_USER = {
  email: 'marketing.manager@test.local',
  password: 'Test123!@#',
};

interface LatencyMetrics {
  endpoint: string;
  method: string;
  samples: number;
  times: number[];
  mean: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  stdDev: number;
  variance: number;
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

function analyzeLatency(endpoint: string, method: string, times: number[]): LatencyMetrics {
  const sorted = [...times].sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const stdDev = standardDeviation(times);

  return {
    endpoint,
    method,
    samples: times.length,
    times,
    mean,
    median,
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev,
    variance: (stdDev / mean) * 100,
  };
}

function logLatencyReport(metrics: LatencyMetrics, thresholdP95?: number, thresholdP50?: number) {
  const passP95 = thresholdP95 ? metrics.p95 <= thresholdP95 : true;
  const passP50 = thresholdP50 ? metrics.median <= thresholdP50 : true;
  const passVariance = metrics.variance <= PERFORMANCE_THRESHOLDS.MAX_VARIANCE * 100;

  console.log('\n========== API Latency Report ==========');
  console.log(`Endpoint:     ${metrics.method} ${metrics.endpoint}`);
  console.log(`Samples:      ${metrics.samples}`);
  console.log(`Mean:         ${metrics.mean.toFixed(2)}ms`);
  console.log(`Median (P50): ${metrics.median.toFixed(2)}ms ${thresholdP50 ? (passP50 ? '✓' : '✗') : ''}`);
  console.log(`P95:          ${metrics.p95.toFixed(2)}ms ${thresholdP95 ? (passP95 ? '✓' : '✗') : ''}`);
  console.log(`P99:          ${metrics.p99.toFixed(2)}ms`);
  console.log(`Min:          ${metrics.min.toFixed(2)}ms`);
  console.log(`Max:          ${metrics.max.toFixed(2)}ms`);
  console.log(`Std Dev:      ${metrics.stdDev.toFixed(2)}ms`);
  console.log(`Variance:     ${metrics.variance.toFixed(2)}% ${passVariance ? '✓' : '✗'}`);

  if (thresholdP95 && thresholdP50) {
    const overallPass = passP95 && passP50 && passVariance;
    console.log(`Status:       ${overallPass ? '✓ PASS' : '✗ FAIL'}`);
  }
  console.log('=========================================\n');
}

async function measureAPILatency(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  authToken: string,
  body?: any
): Promise<number> {
  const start = performance.now();

  const options: any = {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };

  if (body) {
    options.data = body;
  }

  const response = await request[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](url, options);

  const duration = performance.now() - start;

  expect(response.ok()).toBeTruthy();

  return duration;
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

test.describe('API Latency: Newsletter Endpoints', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  test('GET /newsletter-configs responds in <200ms P95', async ({ request }) => {
    const times: number[] = [];

    // Warmup
    for (let i = 0; i < TEST_CONFIG.WARMUP_RUNS; i++) {
      await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/newsletter-configs', authToken);
    }

    // Measure
    for (let i = 0; i < TEST_CONFIG.MEASUREMENT_RUNS; i++) {
      const duration = await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/newsletter-configs', authToken);
      times.push(duration);
      await new Promise((resolve) => setTimeout(resolve, TEST_CONFIG.COOLDOWN_MS));
    }

    const metrics = analyzeLatency('/newsletter-configs', 'GET', times);
    logLatencyReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95, PERFORMANCE_THRESHOLDS.API_RESPONSE_P50);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
    expect(metrics.median).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P50);
    expect(metrics.variance).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_VARIANCE * 100);
  });

  test('GET /newsletter-issues responds in <200ms P95', async ({ request }) => {
    const times: number[] = [];

    for (let i = 0; i < TEST_CONFIG.WARMUP_RUNS; i++) {
      await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/newsletter-issues', authToken);
    }

    for (let i = 0; i < TEST_CONFIG.MEASUREMENT_RUNS; i++) {
      const duration = await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/newsletter-issues', authToken);
      times.push(duration);
      await new Promise((resolve) => setTimeout(resolve, TEST_CONFIG.COOLDOWN_MS));
    }

    const metrics = analyzeLatency('/newsletter-issues', 'GET', times);
    logLatencyReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95, PERFORMANCE_THRESHOLDS.API_RESPONSE_P50);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
    expect(metrics.median).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P50);
  });

  test('GET /segments responds in <200ms P95', async ({ request }) => {
    const times: number[] = [];

    for (let i = 0; i < TEST_CONFIG.WARMUP_RUNS; i++) {
      await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/segments', authToken);
    }

    for (let i = 0; i < TEST_CONFIG.MEASUREMENT_RUNS; i++) {
      const duration = await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/segments', authToken);
      times.push(duration);
      await new Promise((resolve) => setTimeout(resolve, TEST_CONFIG.COOLDOWN_MS));
    }

    const metrics = analyzeLatency('/segments', 'GET', times);
    logLatencyReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95, PERFORMANCE_THRESHOLDS.API_RESPONSE_P50);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
  });

  test('GET /content-items responds in <200ms P95', async ({ request }) => {
    const times: number[] = [];

    for (let i = 0; i < TEST_CONFIG.WARMUP_RUNS; i++) {
      await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/content-items', authToken);
    }

    for (let i = 0; i < TEST_CONFIG.MEASUREMENT_RUNS; i++) {
      const duration = await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/content-items', authToken);
      times.push(duration);
      await new Promise((resolve) => setTimeout(resolve, TEST_CONFIG.COOLDOWN_MS));
    }

    const metrics = analyzeLatency('/content-items', 'GET', times);
    logLatencyReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95, PERFORMANCE_THRESHOLDS.API_RESPONSE_P50);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
  });
});

test.describe('API Latency: Analytics Endpoints', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  test('GET /analytics/overview responds in <200ms P95', async ({ request }) => {
    const times: number[] = [];

    for (let i = 0; i < TEST_CONFIG.WARMUP_RUNS; i++) {
      await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/analytics/overview', authToken);
    }

    for (let i = 0; i < TEST_CONFIG.MEASUREMENT_RUNS; i++) {
      const duration = await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/analytics/overview', authToken);
      times.push(duration);
      await new Promise((resolve) => setTimeout(resolve, TEST_CONFIG.COOLDOWN_MS));
    }

    const metrics = analyzeLatency('/analytics/overview', 'GET', times);
    logLatencyReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95, PERFORMANCE_THRESHOLDS.API_RESPONSE_P50);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
    expect(metrics.median).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P50);
  });

  test('GET /analytics/trends responds in <200ms P95', async ({ request }) => {
    const times: number[] = [];

    for (let i = 0; i < TEST_CONFIG.WARMUP_RUNS; i++) {
      await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/analytics/trends?metric=open_rate', authToken);
    }

    for (let i = 0; i < TEST_CONFIG.MEASUREMENT_RUNS; i++) {
      const duration = await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/analytics/trends?metric=open_rate', authToken);
      times.push(duration);
      await new Promise((resolve) => setTimeout(resolve, TEST_CONFIG.COOLDOWN_MS));
    }

    const metrics = analyzeLatency('/analytics/trends', 'GET', times);
    logLatencyReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95, PERFORMANCE_THRESHOLDS.API_RESPONSE_P50);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
  });

  test('GET /analytics/top-performers responds in <200ms P95', async ({ request }) => {
    const times: number[] = [];

    for (let i = 0; i < TEST_CONFIG.WARMUP_RUNS; i++) {
      await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/analytics/top-performers?metric=open_rate', authToken);
    }

    for (let i = 0; i < TEST_CONFIG.MEASUREMENT_RUNS; i++) {
      const duration = await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/analytics/top-performers?metric=open_rate', authToken);
      times.push(duration);
      await new Promise((resolve) => setTimeout(resolve, TEST_CONFIG.COOLDOWN_MS));
    }

    const metrics = analyzeLatency('/analytics/top-performers', 'GET', times);
    logLatencyReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95, PERFORMANCE_THRESHOLDS.API_RESPONSE_P50);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
  });
});

test.describe('API Latency: Write Operations', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  test('POST /newsletter-configs responds in <200ms P95', async ({ request }) => {
    const times: number[] = [];

    const configData = {
      name: 'Performance Test Config',
      description: 'Config for latency testing',
      segment_id: '550e8400-e29b-41d4-a716-446655440000',
      cadence: 'weekly',
      send_day_of_week: 2,
      send_time_utc: '14:00',
      timezone: 'America/New_York',
      max_blocks: 6,
      education_ratio_min: 0.3,
      content_freshness_days: 7,
      hero_topic_priority: 'critical_vulnerabilities',
      framework_focus: 'NIST',
      subject_line_style: 'pain_first',
      max_metaphors: 2,
      banned_phrases: ['synergy'],
      approval_tier: 'tier1',
      risk_level: 'standard',
      ai_provider: 'anthropic',
      ai_model: 'claude-3-sonnet',
      prompt_version: 2,
      is_active: true,
    };

    // Note: This test creates actual records, so we limit runs
    for (let i = 0; i < 5; i++) {
      const duration = await measureAPILatency(request, 'POST', 'http://localhost:8080/v1/newsletter-configs', authToken, configData);
      times.push(duration);
      await new Promise((resolve) => setTimeout(resolve, TEST_CONFIG.COOLDOWN_MS));
    }

    const metrics = analyzeLatency('/newsletter-configs', 'POST', times);
    logLatencyReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95, PERFORMANCE_THRESHOLDS.API_RESPONSE_P50);

    // Write operations can be slightly slower, but should still meet P95
    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
  });
});

test.describe('API Latency: Load Simulation', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  test('Burst load: 50 rapid requests maintain <200ms P95', async ({ request }) => {
    const times: number[] = [];

    // Simulate burst load
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(measureAPILatency(request, 'GET', 'http://localhost:8080/v1/newsletter-configs', authToken));
    }

    const results = await Promise.all(promises);
    times.push(...results);

    const metrics = analyzeLatency('/newsletter-configs (burst)', 'GET', times);
    logLatencyReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);

    // Under burst load, we expect P95 to still meet threshold
    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
  });

  test('Sustained load: Sequential requests maintain consistency', async ({ request }) => {
    const times: number[] = [];

    // Simulate sustained load over time
    for (let i = 0; i < 100; i++) {
      const duration = await measureAPILatency(request, 'GET', 'http://localhost:8080/v1/newsletter-issues', authToken);
      times.push(duration);

      // No cooldown - sustained load
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10)); // Minimal pause every 10 requests
      }
    }

    const metrics = analyzeLatency('/newsletter-issues (sustained)', 'GET', times);
    logLatencyReport(metrics, PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);

    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
    expect(metrics.variance).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_VARIANCE * 100);
  });
});

test.describe('API Latency: Time to First Byte (TTFB)', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    authToken = await authenticate(request);
  });

  test('Measure TTFB for analytics endpoint', async ({ request }) => {
    const ttfbTimes: number[] = [];

    for (let i = 0; i < TEST_CONFIG.MEASUREMENT_RUNS; i++) {
      const start = performance.now();

      const response = await request.get('http://localhost:8080/v1/analytics/overview', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const ttfb = performance.now() - start;
      ttfbTimes.push(ttfb);

      expect(response.ok()).toBeTruthy();

      await new Promise((resolve) => setTimeout(resolve, TEST_CONFIG.COOLDOWN_MS));
    }

    const metrics = analyzeLatency('/analytics/overview (TTFB)', 'GET', ttfbTimes);
    logLatencyReport(metrics);

    // TTFB should be within P95 threshold
    expect(metrics.p95).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.API_RESPONSE_P95);
  });
});
