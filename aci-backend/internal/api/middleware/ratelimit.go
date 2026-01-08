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
