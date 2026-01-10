package middleware

import (
	"net/http"
	"time"

	"github.com/go-chi/httprate"
)

// AuthRateLimiter returns rate limiter for auth endpoints
// Limits to 5 requests per minute per IP address to prevent brute force attacks
func AuthRateLimiter() func(http.Handler) http.Handler {
	return httprate.LimitByIP(5, 1*time.Minute)
}

// GlobalRateLimiter returns global rate limiter for all endpoints
// Limits to 100 requests per minute per IP address
func GlobalRateLimiter() func(http.Handler) http.Handler {
	return httprate.LimitByIP(100, 1*time.Minute)
}

// StrictRateLimiter returns strict rate limiter for sensitive operations
// Limits to 3 requests per minute per IP address
func StrictRateLimiter() func(http.Handler) http.Handler {
	return httprate.LimitByIP(3, 1*time.Minute)
}

// WebhookRateLimiter returns rate limiter for webhook endpoints
// HIGH-004: Limits to 200 requests per minute per IP to allow burst traffic
// from ESPs (HubSpot, Mailchimp, SendGrid) while preventing abuse
func WebhookRateLimiter() func(http.Handler) http.Handler {
	return httprate.LimitByIP(200, 1*time.Minute)
}

// N8NWebhookRateLimiter returns rate limiter for n8n webhook endpoints
// HIGH-004: Limits to 30 requests per minute per IP for n8n automation webhooks
func N8NWebhookRateLimiter() func(http.Handler) http.Handler {
	return httprate.LimitByIP(30, 1*time.Minute)
}

// VoiceTransformRateLimiter returns rate limiter for voice transformation endpoints
// FR-009: Limits to 30 transformations per hour per authenticated user
// This uses user ID from JWT claims for rate limiting instead of IP
func VoiceTransformRateLimiter() func(http.Handler) http.Handler {
	return httprate.Limit(
		30,          // 30 requests
		1*time.Hour, // per hour
		httprate.WithKeyFuncs(keyByUserID),
		httprate.WithLimitHandler(voiceRateLimitExceededHandler),
	)
}

// VoiceTransformRateLimiterWithConfig returns a configurable rate limiter for voice transformation
// Allows custom limits for different tiers or testing
func VoiceTransformRateLimiterWithConfig(limit int, window time.Duration) func(http.Handler) http.Handler {
	return httprate.Limit(
		limit,
		window,
		httprate.WithKeyFuncs(keyByUserID),
		httprate.WithLimitHandler(voiceRateLimitExceededHandler),
	)
}

// keyByUserID extracts user ID from JWT claims in context
// Falls back to IP address if user context is not available
func keyByUserID(r *http.Request) (string, error) {
	claims, ok := GetUserFromContext(r.Context())
	if ok && claims != nil {
		return "user:" + claims.UserID.String(), nil
	}

	// Fallback to IP if no user context (shouldn't happen in protected routes)
	ip, err := httprate.KeyByRealIP(r)
	if err != nil {
		return "", err
	}
	return "ip:" + ip, nil
}

// voiceRateLimitExceededHandler returns a custom error response for voice transformation rate limit
func voiceRateLimitExceededHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Retry-After", "3600") // 1 hour in seconds
	w.WriteHeader(http.StatusTooManyRequests)
	w.Write([]byte(`{"error":"rate_limit_exceeded","message":"Voice transformation rate limit exceeded. Maximum 30 transformations per hour.","code":"VOICE_RATE_LIMITED"}`))
}
