package middleware

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/response"
)

const (
	// MaxWebhookTimestampAge is the maximum age of a webhook timestamp (5 minutes)
	MaxWebhookTimestampAge = 5 * time.Minute
)

// WebhookSignature validates HMAC signatures on webhook requests
// SEC-CRIT-001, SEC-CRIT-002: Implements secure webhook signature validation
func WebhookSignature(secret string) func(http.Handler) http.Handler {
	if secret == "" {
		panic("webhook secret cannot be empty - configure WEBHOOK_SECRET environment variable")
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := getRequestID(r.Context())

			// Read body once to validate signature
			bodyBytes, err := io.ReadAll(r.Body)
			if err != nil {
				log.Error().
					Err(err).
					Str("request_id", requestID).
					Msg("Failed to read webhook body")
				response.BadRequest(w, "Failed to read request body")
				return
			}
			defer r.Body.Close()

			// Restore body for handlers to read
			r.Body = io.NopCloser(bytes.NewReader(bodyBytes))

			// Get signature from header (support multiple header formats)
			signature := r.Header.Get("X-Webhook-Signature")
			if signature == "" {
				signature = r.Header.Get("X-Hub-Signature-256")
			}
			if signature == "" {
				signature = r.Header.Get("X-Signature")
			}

			if signature == "" {
				log.Warn().
					Str("request_id", requestID).
					Str("remote_addr", r.RemoteAddr).
					Msg("Webhook signature missing")
				response.Unauthorized(w, "Missing webhook signature")
				return
			}

			// Compute HMAC-SHA256 of raw body
			mac := hmac.New(sha256.New, []byte(secret))
			if _, err := mac.Write(bodyBytes); err != nil {
				log.Error().
					Err(err).
					Str("request_id", requestID).
					Msg("Failed to compute HMAC")
				response.InternalError(w, "Signature validation error", requestID)
				return
			}

			expectedMAC := mac.Sum(nil)
			expectedSignature := "sha256=" + hex.EncodeToString(expectedMAC)

			// Support both "sha256=" prefix and raw hex
			receivedSignature := signature
			if len(signature) == 64 {
				// Raw hex, add prefix
				receivedSignature = "sha256=" + signature
			}

			// Constant-time comparison to prevent timing attacks
			if !hmac.Equal([]byte(receivedSignature), []byte(expectedSignature)) {
				log.Warn().
					Str("request_id", requestID).
					Str("remote_addr", r.RemoteAddr).
					Str("expected_prefix", expectedSignature[:16]+"...").
					Str("received_prefix", receivedSignature[:min(16, len(receivedSignature))]+"...").
					Msg("Webhook signature mismatch")
				response.Unauthorized(w, "Invalid webhook signature")
				return
			}

			log.Debug().
				Str("request_id", requestID).
				Msg("Webhook signature validated successfully")

			next.ServeHTTP(w, r)
		})
	}
}

// WebhookTimestampValidation validates webhook event timestamps to prevent replay attacks
// SEC-MED-003: Implements timestamp validation for webhook events
func WebhookTimestampValidation(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := getRequestID(r.Context())

		// Get timestamp from header
		timestampStr := r.Header.Get("X-Webhook-Timestamp")
		if timestampStr == "" {
			log.Debug().
				Str("request_id", requestID).
				Msg("No webhook timestamp header, skipping validation")
			next.ServeHTTP(w, r)
			return
		}

		// Parse timestamp (Unix seconds)
		var timestamp int64
		if _, err := fmt.Sscanf(timestampStr, "%d", &timestamp); err != nil {
			log.Warn().
				Err(err).
				Str("request_id", requestID).
				Str("timestamp", timestampStr).
				Msg("Invalid webhook timestamp format")
			response.BadRequest(w, "Invalid timestamp format")
			return
		}

		eventTime := time.Unix(timestamp, 0)
		now := time.Now()

		// Check if timestamp is too old (replay attack)
		if now.Sub(eventTime) > MaxWebhookTimestampAge {
			log.Warn().
				Str("request_id", requestID).
				Time("event_time", eventTime).
				Dur("age", now.Sub(eventTime)).
				Msg("Webhook timestamp too old - possible replay attack")
			response.BadRequest(w, "Webhook timestamp too old")
			return
		}

		// Check if timestamp is in the future (clock skew attack)
		if eventTime.After(now.Add(1 * time.Minute)) {
			log.Warn().
				Str("request_id", requestID).
				Time("event_time", eventTime).
				Msg("Webhook timestamp in future - possible clock skew attack")
			response.BadRequest(w, "Webhook timestamp in future")
			return
		}

		log.Debug().
			Str("request_id", requestID).
			Time("event_time", eventTime).
			Msg("Webhook timestamp validated")

		next.ServeHTTP(w, r)
	})
}

// getRequestID extracts request ID from context
func getRequestID(ctx interface{}) string {
	// Type assertion helper
	if id, ok := ctx.(interface{ Value(interface{}) interface{} }); ok {
		if requestID, ok := id.Value("request_id").(string); ok {
			return requestID
		}
	}
	return ""
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
