package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/phillipboles/aci-backend/internal/pkg/jwt"
)

// mockClaims creates test JWT claims for a given user ID
func mockClaims(userID uuid.UUID) *jwt.Claims {
	return &jwt.Claims{
		UserID: userID,
		Email:  "test@example.com",
		Role:   "user",
	}
}

// setUserContext adds user claims to request context
func setUserContext(r *http.Request, claims *jwt.Claims) *http.Request {
	ctx := context.WithValue(r.Context(), userClaimsKey, claims)
	return r.WithContext(ctx)
}

// successHandler is a simple handler that returns 200 OK
func successHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})
}

func TestVoiceTransformRateLimiter_AllowsRequestsWithinLimit(t *testing.T) {
	// Use a small limit and window for testing
	limiter := VoiceTransformRateLimiterWithConfig(5, 1*time.Minute)
	handler := limiter(successHandler())

	userID := uuid.New()
	claims := mockClaims(userID)

	// Make 5 requests - all should succeed
	for i := 0; i < 5; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/voice-agents/123/transform", nil)
		req = setUserContext(req, claims)
		req.RemoteAddr = "192.168.1.1:12345"

		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code, "Request %d should succeed", i+1)
	}
}

func TestVoiceTransformRateLimiter_BlocksExcessRequests(t *testing.T) {
	// Use a small limit for testing
	limiter := VoiceTransformRateLimiterWithConfig(3, 1*time.Minute)
	handler := limiter(successHandler())

	userID := uuid.New()
	claims := mockClaims(userID)

	// Make 3 requests - all should succeed
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/voice-agents/123/transform", nil)
		req = setUserContext(req, claims)
		req.RemoteAddr = "192.168.1.1:12345"

		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code, "Request %d should succeed", i+1)
	}

	// 4th request should be rate limited
	req := httptest.NewRequest(http.MethodPost, "/v1/voice-agents/123/transform", nil)
	req = setUserContext(req, claims)
	req.RemoteAddr = "192.168.1.1:12345"

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusTooManyRequests, rr.Code)

	// Verify response body
	var response map[string]string
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "rate_limit_exceeded", response["error"])
	assert.Equal(t, "VOICE_RATE_LIMITED", response["code"])
	assert.Contains(t, response["message"], "30 transformations per hour")

	// Verify Retry-After header
	assert.Equal(t, "3600", rr.Header().Get("Retry-After"))
}

func TestVoiceTransformRateLimiter_DifferentUsersHaveSeparateLimits(t *testing.T) {
	limiter := VoiceTransformRateLimiterWithConfig(2, 1*time.Minute)
	handler := limiter(successHandler())

	user1ID := uuid.New()
	user2ID := uuid.New()
	claims1 := mockClaims(user1ID)
	claims2 := mockClaims(user2ID)

	// User 1 makes 2 requests (hits limit)
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/voice-agents/123/transform", nil)
		req = setUserContext(req, claims1)
		req.RemoteAddr = "192.168.1.1:12345"

		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusOK, rr.Code)
	}

	// User 1's 3rd request should be blocked
	req := httptest.NewRequest(http.MethodPost, "/v1/voice-agents/123/transform", nil)
	req = setUserContext(req, claims1)
	req.RemoteAddr = "192.168.1.1:12345"

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusTooManyRequests, rr.Code)

	// User 2 should still be able to make requests
	req = httptest.NewRequest(http.MethodPost, "/v1/voice-agents/123/transform", nil)
	req = setUserContext(req, claims2)
	req.RemoteAddr = "192.168.1.2:12345" // Different IP but same would work too

	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code, "User 2 should not be affected by User 1's rate limit")
}

func TestVoiceTransformRateLimiter_FallsBackToIPWithoutUserContext(t *testing.T) {
	limiter := VoiceTransformRateLimiterWithConfig(2, 1*time.Minute)
	handler := limiter(successHandler())

	// Make requests without user context
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/voice-agents/123/transform", nil)
		req.RemoteAddr = "192.168.1.100:12345"

		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusOK, rr.Code)
	}

	// 3rd request from same IP should be rate limited
	req := httptest.NewRequest(http.MethodPost, "/v1/voice-agents/123/transform", nil)
	req.RemoteAddr = "192.168.1.100:12345"

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusTooManyRequests, rr.Code)

	// Different IP should still work
	req = httptest.NewRequest(http.MethodPost, "/v1/voice-agents/123/transform", nil)
	req.RemoteAddr = "192.168.1.200:12345"

	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestKeyByUserID_ReturnsUserKey(t *testing.T) {
	userID := uuid.New()
	claims := mockClaims(userID)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req = setUserContext(req, claims)

	key, err := keyByUserID(req)

	require.NoError(t, err)
	assert.Equal(t, "user:"+userID.String(), key)
}

func TestKeyByUserID_FallsBackToIP(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.RemoteAddr = "10.0.0.1:12345"

	key, err := keyByUserID(req)

	require.NoError(t, err)
	assert.Equal(t, "ip:10.0.0.1", key)
}

func TestKeyByUserID_UsesXForwardedFor(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.RemoteAddr = "10.0.0.1:12345"
	req.Header.Set("X-Forwarded-For", "203.0.113.50")

	key, err := keyByUserID(req)

	require.NoError(t, err)
	assert.Equal(t, "ip:203.0.113.50", key)
}

func TestVoiceRateLimitExceededHandler_Response(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/v1/voice-agents/123/transform", nil)
	rr := httptest.NewRecorder()

	voiceRateLimitExceededHandler(rr, req)

	assert.Equal(t, http.StatusTooManyRequests, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
	assert.Equal(t, "3600", rr.Header().Get("Retry-After"))

	var response map[string]string
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, "rate_limit_exceeded", response["error"])
	assert.Equal(t, "VOICE_RATE_LIMITED", response["code"])
	assert.Contains(t, response["message"], "Maximum 30 transformations per hour")
}

// Test the default VoiceTransformRateLimiter function
func TestVoiceTransformRateLimiter_DefaultConfig(t *testing.T) {
	// Just verify it doesn't panic and returns a valid handler
	limiter := VoiceTransformRateLimiter()
	require.NotNil(t, limiter)

	handler := limiter(successHandler())
	require.NotNil(t, handler)
}

// Test existing rate limiters to ensure they still work
func TestAuthRateLimiter_ReturnsMiddleware(t *testing.T) {
	limiter := AuthRateLimiter()
	require.NotNil(t, limiter)

	handler := limiter(successHandler())
	require.NotNil(t, handler)

	// Verify it works with a request
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", nil)
	req.RemoteAddr = "192.168.1.1:12345"

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestGlobalRateLimiter_ReturnsMiddleware(t *testing.T) {
	limiter := GlobalRateLimiter()
	require.NotNil(t, limiter)

	handler := limiter(successHandler())
	require.NotNil(t, handler)
}

func TestStrictRateLimiter_ReturnsMiddleware(t *testing.T) {
	limiter := StrictRateLimiter()
	require.NotNil(t, limiter)

	handler := limiter(successHandler())
	require.NotNil(t, handler)
}

func TestWebhookRateLimiter_ReturnsMiddleware(t *testing.T) {
	limiter := WebhookRateLimiter()
	require.NotNil(t, limiter)

	handler := limiter(successHandler())
	require.NotNil(t, handler)
}

func TestN8NWebhookRateLimiter_ReturnsMiddleware(t *testing.T) {
	limiter := N8NWebhookRateLimiter()
	require.NotNil(t, limiter)

	handler := limiter(successHandler())
	require.NotNil(t, handler)
}
