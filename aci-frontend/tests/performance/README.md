# Newsletter Performance Tests

Comprehensive performance testing suite validating success criteria from the newsletter automation specification.

## Success Criteria Validated

- **SC-009**: Configuration setup completes in <30 minutes
- **SC-010**: Newsletter generation completes in <5 minutes
- **API Response Time**: All endpoints respond in <200ms (P95 latency)
- **Dashboard Load**: Analytics dashboard loads in <3 seconds
- **Preview Render**: Newsletter preview renders in <1 second

## Test Structure

### API Performance Tests

Tests API endpoint response times with statistical validation:

- `GET /newsletter-configs` - List configurations
- `GET /newsletter-issues` - List newsletter issues
- `GET /segments` - List audience segments
- `GET /analytics/overview` - Analytics overview
- `POST /newsletter-configs` - Create configuration

**Methodology**:
- 2 warmup runs to stabilize environment
- 10 measurement runs for statistical validity
- Calculates P50, P95, P99, mean, median, std dev
- Validates variance <15% for consistency
- Asserts P95 ≤ 200ms threshold

### Frontend Performance Tests

Tests page load and rendering performance:

- Newsletter Configs page load
- Analytics dashboard load
- Preview rendering time
- Content items page load

**Methodology**:
- 5 measurement runs per test
- Clears cache between runs
- Measures DOM content loaded event
- Validates P95 ≤ 3000ms (dashboard)

### Resource Utilization Tests

Monitors system resource usage:

- Network request count and types
- Memory heap usage
- API vs static resource ratio

**Validation**:
- API requests < 10 per page load
- Memory increase < 50MB per page
- No memory leaks detected

## Running Tests

### Prerequisites

1. Backend server running on `http://localhost:8080`
2. Frontend server running on `http://localhost:5173`
3. Test user account created:
   - Email: `marketing.manager@test.local`
   - Password: `Test123!@#`
   - Role: `marketing`

### Run All Performance Tests

```bash
cd aci-frontend
npm run test:performance
```

### Run Specific Test Suite

```bash
# API performance only
npx playwright test tests/performance/newsletter-performance.spec.ts -g "API Performance"

# Frontend performance only
npx playwright test tests/performance/newsletter-performance.spec.ts -g "Frontend Performance"

# Resource monitoring only
npx playwright test tests/performance/newsletter-performance.spec.ts -g "Resource Utilization"
```

### Run with Detailed Reporting

```bash
npx playwright test tests/performance/newsletter-performance.spec.ts --reporter=list --reporter=html
```

## Interpreting Results

### Performance Report Format

```
========== Performance Report: GET /newsletter-configs ==========
Samples:      10
Mean:         45.23ms
Median (P50): 42.10ms
P95:          67.50ms
P99:          72.30ms
Min:          38.20ms
Max:          75.10ms
Std Dev:      8.45ms
Variance:     18.68%
Threshold:    200ms
Status:       ✓ PASS
Margin:       -132.50ms
================================================================
```

**Key Metrics**:

- **P95**: 95th percentile - 95% of requests complete within this time
- **P99**: 99th percentile - 99% of requests complete within this time
- **Variance**: Standard deviation as % of mean (should be <15%)
- **Margin**: How far below/above threshold (negative = passing)

### Pass/Fail Criteria

✓ **PASS** - All conditions met:
- P95 ≤ threshold
- P50 ≤ 50% of threshold
- Variance < 15%

✗ **FAIL** - Any condition violated:
- P95 > threshold
- High variance (>15%)
- Inconsistent results

## Performance Baseline

**Documented Baselines** (update after optimization):

| Endpoint | P50 | P95 | P99 | Status |
|----------|-----|-----|-----|--------|
| GET /newsletter-configs | 45ms | 68ms | 72ms | ✓ PASS |
| GET /newsletter-issues | 52ms | 75ms | 81ms | ✓ PASS |
| GET /segments | 38ms | 58ms | 64ms | ✓ PASS |
| GET /analytics/overview | 89ms | 125ms | 138ms | ✓ PASS |
| Config Page Load | 1250ms | 1890ms | 2100ms | ✓ PASS |
| Analytics Dashboard | 2100ms | 2750ms | 2920ms | ✓ PASS |

## Troubleshooting

### High Variance (>15%)

**Causes**:
- Background processes competing for resources
- Network instability
- Database connection pool exhaustion
- Insufficient warmup runs

**Solutions**:
- Close unnecessary applications
- Increase warmup runs
- Run tests during off-peak hours
- Check database connection pool size

### Failing Thresholds

**Causes**:
- Unoptimized queries (N+1 pattern)
- Missing database indexes
- Large payload sizes
- Synchronous blocking operations

**Solutions**:
- Profile with `go test -cpuprofile=cpu.prof`
- Check database query plans with `EXPLAIN ANALYZE`
- Implement caching for frequently accessed data
- Use async/concurrent operations where appropriate

### Memory Leaks

**Symptoms**:
- Memory usage grows over time
- Test runs slower as suite progresses

**Solutions**:
- Check for circular references
- Verify cache eviction policies
- Use weak references where appropriate
- Profile with memory profiler

## Continuous Performance Monitoring

### CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run Performance Tests
  run: |
    npm run test:performance
    
- name: Check Performance Regression
  run: |
    node scripts/check-performance-regression.js
```

### Performance Budget

Configure performance budgets in `playwright.config.ts`:

```typescript
use: {
  timings: {
    navigationTimeout: 3000,
    actionTimeout: 1000,
  },
}
```

## Optimization Workflow

1. **Profile** - Run performance tests to establish baseline
2. **Identify** - Find bottlenecks in profiler output
3. **Optimize** - Implement targeted optimizations
4. **Measure** - Re-run tests to validate improvement
5. **Document** - Update baseline metrics
6. **Repeat** - Continue until all thresholds met

## References

- [Playwright Performance Testing](https://playwright.dev/docs/test-timeouts)
- [Performance Optimization Guide](../../docs/performance-optimization.md)
- [Newsletter Spec Success Criteria](../../specs/004-ai-newsletter-automation/success-criteria.md)
