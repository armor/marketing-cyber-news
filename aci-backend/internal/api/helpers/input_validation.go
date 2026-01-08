package helpers

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"
)

// Input validation constants
const (
	// MaxNameLength is the maximum length for names
	MaxNameLength = 255

	// MaxDescriptionLength is the maximum length for descriptions
	MaxDescriptionLength = 2000

	// MaxSubjectLineLength is the maximum length for email subject lines
	MaxSubjectLineLength = 200

	// MaxURLLength is the maximum length for URLs
	MaxURLLength = 2048

	// MaxSearchQueryLength is the maximum length for search queries
	MaxSearchQueryLength = 100

	// MaxEmailLength is the maximum length for email addresses
	MaxEmailLength = 254
)

// ValidateStringLength validates that a string is within allowed length bounds
// SEC-MED-005: Implements input length validation
func ValidateStringLength(value, fieldName string, maxLength int) error {
	length := utf8.RuneCountInString(value)
	if length > maxLength {
		return fmt.Errorf("%s exceeds maximum length of %d characters (got %d)", fieldName, maxLength, length)
	}
	return nil
}

// ValidateRequiredString validates that a required string is not empty and within length
func ValidateRequiredString(value, fieldName string, maxLength int) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s is required", fieldName)
	}
	return ValidateStringLength(value, fieldName, maxLength)
}

// ValidateSearchQuery validates and sanitizes search query input
// SEC-HIGH-001: Implements SQL injection prevention for search queries
func ValidateSearchQuery(query string) (string, error) {
	// Validate length
	if err := ValidateStringLength(query, "search query", MaxSearchQueryLength); err != nil {
		return "", err
	}

	// Trim whitespace
	query = strings.TrimSpace(query)

	// Must not be empty after trimming
	if query == "" {
		return "", fmt.Errorf("search query cannot be empty")
	}

	// Sanitize - remove potentially dangerous SQL characters
	// Allow: alphanumeric, spaces, hyphens, underscores, dots
	sanitized := regexp.MustCompile(`[^a-zA-Z0-9\s\-_.]+`).ReplaceAllString(query, "")

	if sanitized != query {
		// Log that we sanitized the input (caller should log this)
		return sanitized, nil
	}

	return query, nil
}

// ValidateURL validates and sanitizes URL input
// SEC-MED-002: Implements proper URL validation to prevent SSRF and injection
func ValidateURL(urlStr string) error {
	// Check length
	if err := ValidateStringLength(urlStr, "URL", MaxURLLength); err != nil {
		return err
	}

	// Parse URL
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return fmt.Errorf("invalid URL format: %w", err)
	}

	// Validate scheme - only allow http and https
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return fmt.Errorf("URL scheme must be http or https, got: %s", parsedURL.Scheme)
	}

	// Validate host is present
	if parsedURL.Host == "" {
		return fmt.Errorf("URL must include a host")
	}

	// Prevent SSRF - block localhost and internal IPs
	host := strings.ToLower(parsedURL.Hostname())
	blockedHosts := []string{
		"localhost",
		"127.0.0.1",
		"0.0.0.0",
		"[::]",
		"[::1]",
	}

	for _, blocked := range blockedHosts {
		if host == blocked {
			return fmt.Errorf("URLs pointing to localhost/internal IPs are not allowed")
		}
	}

	// Block private IP ranges
	if strings.HasPrefix(host, "10.") ||
		strings.HasPrefix(host, "192.168.") ||
		strings.HasPrefix(host, "172.16.") ||
		strings.HasPrefix(host, "172.17.") ||
		strings.HasPrefix(host, "172.18.") ||
		strings.HasPrefix(host, "172.19.") ||
		strings.HasPrefix(host, "172.20.") ||
		strings.HasPrefix(host, "172.21.") ||
		strings.HasPrefix(host, "172.22.") ||
		strings.HasPrefix(host, "172.23.") ||
		strings.HasPrefix(host, "172.24.") ||
		strings.HasPrefix(host, "172.25.") ||
		strings.HasPrefix(host, "172.26.") ||
		strings.HasPrefix(host, "172.27.") ||
		strings.HasPrefix(host, "172.28.") ||
		strings.HasPrefix(host, "172.29.") ||
		strings.HasPrefix(host, "172.30.") ||
		strings.HasPrefix(host, "172.31.") {
		return fmt.Errorf("URLs pointing to private IP ranges are not allowed")
	}

	return nil
}

// ValidateEmail validates email address format and length
func ValidateEmail(email string) error {
	// Check length
	if err := ValidateStringLength(email, "email", MaxEmailLength); err != nil {
		return err
	}

	// Basic email regex validation
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}

	return nil
}

// SanitizeUserAgent sanitizes User-Agent strings to prevent injection
// SEC-MED-007: Implements User-Agent sanitization
func SanitizeUserAgent(userAgent string) string {
	// Limit length
	maxLength := 500
	if len(userAgent) > maxLength {
		userAgent = userAgent[:maxLength]
	}

	// Remove potentially dangerous characters
	// Allow: alphanumeric, spaces, common punctuation
	sanitized := regexp.MustCompile(`[^\w\s\-.,;:()/\[\]]+`).ReplaceAllString(userAgent, "")

	return sanitized
}

// ValidatePaginationParams validates pagination parameters
// SEC-MED-004: Implements consistent pagination validation
func ValidatePaginationParams(page, pageSize int) error {
	if page < 1 {
		return fmt.Errorf("page must be at least 1")
	}

	if pageSize < 1 {
		return fmt.Errorf("page_size must be at least 1")
	}

	if pageSize > 100 {
		return fmt.Errorf("page_size cannot exceed 100")
	}

	return nil
}

// ValidateLimitOffset validates limit/offset pagination parameters
func ValidateLimitOffset(limit, offset int) error {
	if limit < 1 {
		return fmt.Errorf("limit must be at least 1")
	}

	if limit > 100 {
		return fmt.Errorf("limit cannot exceed 100")
	}

	if offset < 0 {
		return fmt.Errorf("offset must be non-negative")
	}

	// Prevent deep pagination attacks
	maxOffset := 10000
	if offset > maxOffset {
		return fmt.Errorf("offset cannot exceed %d - use cursor-based pagination for large datasets", maxOffset)
	}

	return nil
}

// ValidateContentTags validates and sanitizes content tags
func ValidateContentTags(tags []string, fieldName string) error {
	maxTags := 20
	maxTagLength := 50

	if len(tags) > maxTags {
		return fmt.Errorf("%s cannot have more than %d tags", fieldName, maxTags)
	}

	for i, tag := range tags {
		// Trim whitespace
		tag = strings.TrimSpace(tag)

		// Check length
		if err := ValidateStringLength(tag, fmt.Sprintf("%s[%d]", fieldName, i), maxTagLength); err != nil {
			return err
		}

		// Validate characters - only alphanumeric, hyphens, underscores
		if !regexp.MustCompile(`^[a-zA-Z0-9\-_]+$`).MatchString(tag) {
			return fmt.Errorf("%s[%d] contains invalid characters (only alphanumeric, hyphen, underscore allowed)", fieldName, i)
		}
	}

	return nil
}
