#!/bin/bash
# Live Data Verification Script
# Tests all 8 user accounts against live backend

echo "=== LIVE DATA VERIFICATION TEST ==="
echo "Testing all 8 user accounts against live backend..."
echo ""

USERS=("superadmin@test.com" "admin@test.com" "marketing@test.com" "branding@test.com" "soc1@test.com" "soc3@test.com" "ciso@test.com" "test@example.com")

PASSED=0
FAILED=0

for email in "${USERS[@]}"; do
  result=$(curl -s -X POST http://localhost:8080/v1/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$email\", \"password\": \"TestPass123\"}" 2>&1)

  if echo "$result" | grep -q "access_token"; then
    role=$(echo "$result" | jq -r '.data.user.role' 2>/dev/null)
    echo "✅ $email - LOGIN SUCCESS (role: $role)"
    ((PASSED++))
  else
    error=$(echo "$result" | jq -r '.error.message // .message // "Unknown error"' 2>/dev/null)
    echo "❌ $email - FAILED: $error"
    ((FAILED++))
  fi
done

echo ""
echo "=== RESULTS ==="
echo "Passed: $PASSED / 8"
echo "Failed: $FAILED / 8"

# If all passed, test API endpoints with superadmin token
if [ $PASSED -eq 8 ]; then
  echo ""
  echo "=== API ENDPOINT TESTS ==="

  # Get superadmin token
  TOKEN=$(curl -s -X POST http://localhost:8080/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "superadmin@test.com", "password": "TestPass123"}' | jq -r '.data.access_token')

  # Test articles endpoint
  echo "Testing GET /v1/articles..."
  ARTICLES=$(curl -s http://localhost:8080/v1/articles \
    -H "Authorization: Bearer $TOKEN" | jq -r '.data | length' 2>/dev/null)
  echo "  Articles count: $ARTICLES"

  # Test approvals endpoint
  echo "Testing GET /v1/approvals/queue..."
  APPROVALS=$(curl -s http://localhost:8080/v1/approvals/queue \
    -H "Authorization: Bearer $TOKEN" | jq -r '.data | length' 2>/dev/null)
  echo "  Approvals in queue: $APPROVALS"

  # Test user profile
  echo "Testing GET /v1/users/me..."
  ME=$(curl -s http://localhost:8080/v1/users/me \
    -H "Authorization: Bearer $TOKEN" | jq -r '.data.email' 2>/dev/null)
  echo "  Authenticated as: $ME"
fi
