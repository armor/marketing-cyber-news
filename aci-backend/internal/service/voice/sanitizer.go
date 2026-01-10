package voice

import (
	"regexp"
	"strings"
	"unicode"
)

// InputSanitizer provides input validation and sanitization for LLM prompts
// to protect against prompt injection attacks
type InputSanitizer struct {
	// maxLength is the maximum allowed input length
	maxLength int

	// minLength is the minimum required input length
	minLength int

	// injectionPatterns are compiled regex patterns to detect prompt injection
	injectionPatterns []*regexp.Regexp

	// suspiciousPatterns are patterns that warrant warnings
	suspiciousPatterns []*regexp.Regexp

	// allowedSpecialChars defines which special characters are permitted
	allowedSpecialChars map[rune]bool
}

// SanitizationResult contains the result of input sanitization
type SanitizationResult struct {
	// SanitizedText is the cleaned input text
	SanitizedText string `json:"sanitized_text"`

	// IsValid indicates if the input passed all validation checks
	IsValid bool `json:"is_valid"`

	// Warnings contains non-blocking issues found
	Warnings []string `json:"warnings,omitempty"`

	// Errors contains blocking issues that prevent processing
	Errors []string `json:"errors,omitempty"`

	// RejectedPatterns lists any injection patterns that were detected
	RejectedPatterns []string `json:"rejected_patterns,omitempty"`

	// OriginalLength is the length of the original input
	OriginalLength int `json:"original_length"`

	// SanitizedLength is the length after sanitization
	SanitizedLength int `json:"sanitized_length"`
}

// NewInputSanitizer creates a new sanitizer with default settings
func NewInputSanitizer() *InputSanitizer {
	return &InputSanitizer{
		maxLength:           10000,
		minLength:           10,
		injectionPatterns:   compileInjectionPatterns(),
		suspiciousPatterns:  compileSuspiciousPatterns(),
		allowedSpecialChars: getAllowedSpecialChars(),
	}
}

// NewInputSanitizerWithConfig creates a sanitizer with custom length limits
func NewInputSanitizerWithConfig(minLength, maxLength int) *InputSanitizer {
	s := NewInputSanitizer()
	s.minLength = minLength
	s.maxLength = maxLength
	return s
}

// compileInjectionPatterns returns compiled regex for common prompt injection attempts
func compileInjectionPatterns() []*regexp.Regexp {
	patterns := []string{
		// Direct injection attempts
		`(?i)ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|text)`,
		`(?i)disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)`,
		`(?i)forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)`,
		`(?i)override\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)`,

		// System prompt extraction attempts
		`(?i)reveal\s+(your\s+)?(system\s+)?prompt`,
		`(?i)show\s+(me\s+)?(your\s+)?(system\s+)?prompt`,
		`(?i)what\s+(is|are)\s+(your\s+)?(system\s+)?(prompt|instructions?)`,
		`(?i)print\s+(your\s+)?(system\s+)?prompt`,
		`(?i)output\s+(your\s+)?(system\s+)?prompt`,
		`(?i)display\s+(your\s+)?(system\s+)?prompt`,

		// Role manipulation attempts
		`(?i)you\s+are\s+now\s+.{0,50}(assistant|ai|bot|system)`,
		`(?i)act\s+as\s+(if\s+you\s+are\s+)?a\s+.{0,30}(different|new)`,
		`(?i)pretend\s+(you\s+are|to\s+be)\s+.{0,50}`,
		`(?i)your\s+new\s+(role|instructions?)\s+(is|are)`,
		`(?i)switch\s+(to|into)\s+.{0,30}mode`,

		// Delimiter injection
		`(?i)###\s*(system|assistant|user|human)`,
		`(?i)\[INST\]`,
		`(?i)\[\/INST\]`,
		`(?i)<\|im_start\|>`,
		`(?i)<\|im_end\|>`,
		`(?i)<\|(system|user|assistant)\|>`,

		// Jailbreak attempts
		`(?i)dan\s+mode`,
		`(?i)developer\s+mode`,
		`(?i)jailbreak`,
		`(?i)bypass\s+(safety|content|filter)`,
		`(?i)unlock\s+(your\s+)?potential`,

		// Code/command injection in prompts
		`(?i)execute\s+(the\s+following|this)\s+(code|command|script)`,
		`(?i)run\s+(the\s+following|this)\s+(code|command|script)`,
		`(?i)eval\s*\(`,
		`(?i)exec\s*\(`,

		// Multi-turn manipulation
		`(?i)previous\s+conversation\s+was\s+.{0,50}(joke|test|simulation)`,
		`(?i)that\s+was\s+(just\s+)?(a\s+)?(test|joke|simulation)`,
	}

	compiled := make([]*regexp.Regexp, 0, len(patterns))
	for _, pattern := range patterns {
		if re, err := regexp.Compile(pattern); err == nil {
			compiled = append(compiled, re)
		}
	}
	return compiled
}

// compileSuspiciousPatterns returns patterns that warrant warnings but not blocking
func compileSuspiciousPatterns() []*regexp.Regexp {
	patterns := []string{
		// Unusual formatting that might be manipulation
		`(?i)===.{0,30}===`,
		`(?i)---\s*begin\s*---`,
		`(?i)---\s*end\s*---`,

		// Potential role markers
		`(?i)^\s*(human|user|assistant|ai|system):\s*`,
		`(?i)^\s*\[(human|user|assistant|ai|system)\]\s*`,

		// Encoded content attempts
		`(?i)base64\s*:`,
		`(?i)decode\s+this`,
		`(?i)encrypted\s+message`,

		// Excessive special characters (potential encoding)
		`[%]{3,}`,
		`[\\]{3,}`,
	}

	compiled := make([]*regexp.Regexp, 0, len(patterns))
	for _, pattern := range patterns {
		if re, err := regexp.Compile(pattern); err == nil {
			compiled = append(compiled, re)
		}
	}
	return compiled
}

// getAllowedSpecialChars returns the set of permitted special characters
func getAllowedSpecialChars() map[rune]bool {
	return map[rune]bool{
		' ': true, '\t': true, '\n': true, '\r': true,
		'.': true, ',': true, '!': true, '?': true,
		':': true, ';': true, '\'': true, '"': true,
		'-': true, '_': true, '(': true, ')': true,
		'[': true, ']': true, '{': true, '}': true,
		'/': true, '\\': true, '@': true, '#': true,
		'$': true, '%': true, '&': true, '*': true,
		'+': true, '=': true, '<': true, '>': true,
		'|': true, '~': true, '`': true, '^': true,
		'©': true, '®': true, '™': true,
		'—': true, '–': true, '…': true,
		'\u201c': true, '\u201d': true, '\u2018': true, '\u2019': true, // Smart quotes: " " ' '
	}
}

// Sanitize validates and sanitizes the input text
func (s *InputSanitizer) Sanitize(input string) *SanitizationResult {
	result := &SanitizationResult{
		SanitizedText:  input,
		IsValid:        true,
		Warnings:       make([]string, 0),
		Errors:         make([]string, 0),
		OriginalLength: len(input),
	}

	// Trim whitespace
	input = strings.TrimSpace(input)

	// Check empty input
	if input == "" {
		result.IsValid = false
		result.Errors = append(result.Errors, "input cannot be empty")
		result.SanitizedText = ""
		result.SanitizedLength = 0
		return result
	}

	// Check minimum length
	if len(input) < s.minLength {
		result.IsValid = false
		result.Errors = append(result.Errors, "input is too short")
	}

	// Check maximum length
	if len(input) > s.maxLength {
		result.IsValid = false
		result.Errors = append(result.Errors, "input exceeds maximum length")
	}

	// Check for injection patterns
	for _, pattern := range s.injectionPatterns {
		if matches := pattern.FindStringSubmatch(input); len(matches) > 0 {
			result.IsValid = false
			result.RejectedPatterns = append(result.RejectedPatterns, matches[0])
			result.Errors = append(result.Errors, "potential prompt injection detected")
		}
	}

	// Check for suspicious patterns (warnings only)
	for _, pattern := range s.suspiciousPatterns {
		if pattern.MatchString(input) {
			result.Warnings = append(result.Warnings, "suspicious pattern detected")
		}
	}

	// Sanitize the text
	sanitized := s.sanitizeText(input)
	result.SanitizedText = sanitized
	result.SanitizedLength = len(sanitized)

	// Check if sanitization significantly changed the input
	if float64(result.SanitizedLength)/float64(result.OriginalLength) < 0.5 {
		result.Warnings = append(result.Warnings, "significant content was removed during sanitization")
	}

	return result
}

// sanitizeText performs the actual text cleaning
func (s *InputSanitizer) sanitizeText(input string) string {
	var builder strings.Builder
	builder.Grow(len(input))

	for _, r := range input {
		// Allow letters and digits from any language
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			builder.WriteRune(r)
			continue
		}

		// Allow whitelisted special characters
		if s.allowedSpecialChars[r] {
			builder.WriteRune(r)
			continue
		}

		// Replace control characters with space
		if unicode.IsControl(r) && r != '\n' && r != '\r' && r != '\t' {
			builder.WriteRune(' ')
			continue
		}

		// Allow unicode punctuation and symbols
		if unicode.IsPunct(r) || unicode.IsSymbol(r) {
			builder.WriteRune(r)
			continue
		}

		// Default: replace with space
		builder.WriteRune(' ')
	}

	// Normalize whitespace
	result := builder.String()
	result = normalizeWhitespace(result)

	return result
}

// normalizeWhitespace reduces multiple spaces to single space
func normalizeWhitespace(s string) string {
	// Replace multiple spaces with single space
	spaceRegex := regexp.MustCompile(`[ \t]+`)
	s = spaceRegex.ReplaceAllString(s, " ")

	// Normalize line endings
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")

	// Remove excessive newlines (more than 2 consecutive)
	newlineRegex := regexp.MustCompile(`\n{3,}`)
	s = newlineRegex.ReplaceAllString(s, "\n\n")

	return strings.TrimSpace(s)
}

// IsInjectionAttempt checks if the input contains obvious injection attempts
func (s *InputSanitizer) IsInjectionAttempt(input string) bool {
	for _, pattern := range s.injectionPatterns {
		if pattern.MatchString(input) {
			return true
		}
	}
	return false
}

// GetRejectedPatterns returns which injection patterns matched in the input
func (s *InputSanitizer) GetRejectedPatterns(input string) []string {
	matches := make([]string, 0)
	for _, pattern := range s.injectionPatterns {
		if match := pattern.FindString(input); match != "" {
			matches = append(matches, match)
		}
	}
	return matches
}

// SanitizeForLogging creates a version safe for logging (truncated, no sensitive patterns)
func (s *InputSanitizer) SanitizeForLogging(input string, maxLen int) string {
	if maxLen <= 0 {
		maxLen = 100
	}

	// Truncate
	if len(input) > maxLen {
		input = input[:maxLen] + "..."
	}

	// Remove any newlines for single-line logging
	input = strings.ReplaceAll(input, "\n", "\\n")
	input = strings.ReplaceAll(input, "\r", "\\r")
	input = strings.ReplaceAll(input, "\t", "\\t")

	return input
}
