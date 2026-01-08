package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/google/uuid"
)

// ParsePagination extracts pagination parameters from request
// Returns page (1-indexed), pageSize, and any validation error
func ParsePagination(r *http.Request) (page int, pageSize int, err error) {
	page = 1
	pageSize = 20

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		p, parseErr := strconv.Atoi(pageStr)
		if parseErr != nil {
			return 0, 0, fmt.Errorf("invalid page parameter: %w", parseErr)
		}
		if p < 1 {
			return 0, 0, fmt.Errorf("page must be at least 1")
		}
		page = p
	}

	if pageSizeStr := r.URL.Query().Get("page_size"); pageSizeStr != "" {
		ps, parseErr := strconv.Atoi(pageSizeStr)
		if parseErr != nil {
			return 0, 0, fmt.Errorf("invalid page_size parameter: %w", parseErr)
		}
		if ps < 1 {
			return 0, 0, fmt.Errorf("page_size must be at least 1")
		}
		if ps > 100 {
			return 0, 0, fmt.Errorf("page_size cannot exceed 100")
		}
		pageSize = ps
	}

	return page, pageSize, nil
}

// ParseLimitOffset extracts limit/offset pagination from request
func ParseLimitOffset(r *http.Request) (limit, offset int) {
	limit = 50
	offset = 0

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	return limit, offset
}

// CalculateTotalPages calculates total pages from total count and page size
func CalculateTotalPages(total, pageSize int) int {
	if pageSize <= 0 {
		return 0
	}
	pages := total / pageSize
	if total%pageSize > 0 {
		pages++
	}
	return pages
}

// getRequestID extracts request ID from context
func getRequestID(ctx context.Context) string {
	if id, ok := ctx.Value("request_id").(string); ok {
		return id
	}
	return ""
}

// GetClientIP extracts client IP from request headers
func GetClientIP(r *http.Request) string {
	// Check X-Forwarded-For header
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fallback to RemoteAddr
	return r.RemoteAddr
}

// parseIntQuery parses an integer query parameter with a default value
func parseIntQuery(r *http.Request, key string, defaultValue int) (int, error) {
	valueStr := r.URL.Query().Get(key)
	if valueStr == "" {
		return defaultValue, nil
	}

	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return 0, fmt.Errorf("invalid %s parameter: %w", key, err)
	}

	return value, nil
}

// getUserIDFromContext extracts the user ID from context
func getUserIDFromContext(ctx context.Context) uuid.UUID {
	if userID, ok := ctx.Value("user_id").(uuid.UUID); ok {
		return userID
	}
	return uuid.Nil
}

// getTenantID extracts tenant ID from context
// Supports both uuid.UUID and string types for flexibility
func getTenantID(ctx context.Context) (uuid.UUID, error) {
	if id, ok := ctx.Value("tenant_id").(uuid.UUID); ok {
		return id, nil
	}

	// Try string format
	if idStr, ok := ctx.Value("tenant_id").(string); ok {
		return uuid.Parse(idStr)
	}

	return uuid.Nil, fmt.Errorf("tenant_id not found in context")
}

// truncateString truncates a string to maxLen characters, preferring word boundaries
// If the string is longer than maxLen, it finds the last space before maxLen and truncates there
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}

	if maxLen <= 3 {
		return s[:maxLen]
	}

	truncated := s[:maxLen]
	lastSpace := -1
	for i := len(truncated) - 1; i >= 0; i-- {
		if truncated[i] == ' ' {
			lastSpace = i
			break
		}
	}

	if lastSpace > 0 {
		return truncated[:lastSpace] + "..."
	}

	return truncated + "..."
}
