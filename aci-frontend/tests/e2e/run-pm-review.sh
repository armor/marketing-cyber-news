#!/bin/bash

# PM Review Test Runner
# Executes comprehensive E2E tests for PM sign-off

set -e

echo "========================================="
echo "PM REVIEW - Comprehensive E2E Test Suite"
echo "========================================="
echo ""
echo "Test File: newsletter-comprehensive-pm-review.spec.ts"
echo "Tests: 30 total"
echo "Categories:"
echo "  - Happy Path: 5 tests"
echo "  - Failure Path: 6 tests"
echo "  - Empty State: 5 tests"
echo "  - Edge Cases: 5 tests"
echo "  - Connectivity: 4 tests"
echo "  - Multi-Tenancy: 4 tests"
echo "  - Coverage Summary: 1 test"
echo ""
echo "========================================="
echo ""

# Clean up old screenshots
echo "🧹 Cleaning up old screenshots..."
rm -rf tests/artifacts/pm-review/*.png 2>/dev/null || true
mkdir -p tests/artifacts/pm-review

# Run tests
echo "🚀 Running comprehensive PM review tests..."
echo ""

if npx playwright test tests/e2e/newsletter-comprehensive-pm-review.spec.ts --reporter=list,html; then
    echo ""
    echo "========================================="
    echo "✅ ALL TESTS PASSED!"
    echo "========================================="
    echo ""
    echo "📸 Screenshots: $(ls -1 tests/artifacts/pm-review/*.png 2>/dev/null | wc -l) captured"
    echo "📊 HTML Report: tests/reports/playwright-html/index.html"
    echo ""
    echo "Next Steps:"
    echo "  1. Review screenshots in: tests/artifacts/pm-review/"
    echo "  2. Open HTML report: open tests/reports/playwright-html/index.html"
    echo "  3. Submit for PM approval"
    echo ""
    exit 0
else
    echo ""
    echo "========================================="
    echo "❌ TESTS FAILED"
    echo "========================================="
    echo ""
    echo "📸 Screenshots: $(ls -1 tests/artifacts/pm-review/*.png 2>/dev/null | wc -l) captured"
    echo "📊 HTML Report: tests/reports/playwright-html/index.html"
    echo ""
    echo "Debugging:"
    echo "  1. Review failed test screenshots"
    echo "  2. Check HTML report for details"
    echo "  3. Run with --ui flag for interactive mode:"
    echo "     npx playwright test newsletter-comprehensive-pm-review.spec.ts --ui"
    echo ""
    exit 1
fi
