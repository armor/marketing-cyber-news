#!/bin/bash

# Component Test Suite Verification Script
# Verifies all component tests are properly structured

echo "======================================"
echo "Component Test Suite Verification"
echo "======================================"
echo ""

# Count test files
TEST_FILES=$(find tests/e2e/component -name "*.spec.ts" | wc -l | tr -d ' ')
echo "Test Files: $TEST_FILES (expected: 5)"

# Count tests in each file
echo ""
echo "Test Counts:"
grep -c "^  test(" tests/e2e/component/*.spec.ts 2>/dev/null

# Total test count
TOTAL_TESTS=$(grep "^  test(" tests/e2e/component/*.spec.ts 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "Total Tests: $TOTAL_TESTS (expected: 52)"

# Verify console monitoring
echo ""
echo "Console Monitoring Verification:"
MONITORS=$(grep -l "ConsoleMonitor" tests/e2e/component/*.spec.ts 2>/dev/null | wc -l | tr -d ' ')
echo "Files with ConsoleMonitor: $MONITORS/$TEST_FILES"

# Verify auth helpers
echo ""
echo "Auth Helper Verification:"
LOGIN_AS=$(grep -l "loginAs" tests/e2e/component/*.spec.ts 2>/dev/null | wc -l | tr -d ' ')
echo "Files using loginAs: $LOGIN_AS/$TEST_FILES"

# Verify selectors usage
echo ""
echo "Selector Usage Verification:"
SELECTORS=$(grep -l "selectors\." tests/e2e/component/*.spec.ts 2>/dev/null | wc -l | tr -d ' ')
echo "Files using selectors: $SELECTORS/$TEST_FILES"

# Line counts
echo ""
echo "Line Counts:"
wc -l tests/e2e/component/*.spec.ts 2>/dev/null | tail -1

echo ""
echo "======================================"
if [ "$TOTAL_TESTS" -ge 50 ] && [ "$TEST_FILES" -eq 5 ]; then
    echo "✅ VERIFICATION PASSED"
else
    echo "❌ VERIFICATION FAILED"
fi
echo "======================================"
