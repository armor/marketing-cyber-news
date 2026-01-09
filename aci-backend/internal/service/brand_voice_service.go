package service

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// BrandVoiceViolation represents a single brand voice rule violation
type BrandVoiceViolation struct {
	Type        string `json:"type"`
	Location    string `json:"location"`
	Text        string `json:"text"`
	Suggestion  string `json:"suggestion,omitempty"`
	Severity    string `json:"severity"` // "error", "warning", "info"
	RuleID      string `json:"rule_id"`
	Description string `json:"description"`
}

// BrandVoiceValidationResult contains the results of brand voice validation
type BrandVoiceValidationResult struct {
	IsValid       bool                  `json:"is_valid"`
	Violations    []BrandVoiceViolation `json:"violations"`
	Score         float64               `json:"score"` // 0-100 score
	MetaphorCount int                   `json:"metaphor_count"`
	ErrorCount    int                   `json:"error_count"`
	WarningCount  int                   `json:"warning_count"`
	Suggestions   []string              `json:"suggestions,omitempty"`
}

// BrandVoiceService handles brand voice validation and compliance
type BrandVoiceService struct {
	configRepo repository.NewsletterConfigRepository

	// Default banned phrases across all configurations
	defaultBannedPhrases []string

	// Metaphor detection patterns
	metaphorPatterns []*regexp.Regexp
}

// NewBrandVoiceService creates a new brand voice service
func NewBrandVoiceService(configRepo repository.NewsletterConfigRepository) *BrandVoiceService {
	if configRepo == nil {
		panic("configRepo cannot be nil")
	}

	service := &BrandVoiceService{
		configRepo:           configRepo,
		defaultBannedPhrases: getDefaultBannedPhrases(),
		metaphorPatterns:     compileMetaphorPatterns(),
	}

	return service
}

// getDefaultBannedPhrases returns the default list of banned phrases
func getDefaultBannedPhrases() []string {
	return []string{
		// Marketing clichés
		"revolutionary",
		"game-changer",
		"paradigm shift",
		"synergy",
		"leverage",
		"low-hanging fruit",
		"move the needle",
		"circle back",
		"touch base",
		"ping me",
		"bandwidth",
		"deep dive",
		"drill down",
		"actionable insights",
		"thought leader",
		"best-in-class",
		"cutting-edge",
		"world-class",
		"next-generation",
		"at the end of the day",
		"going forward",
		"take it to the next level",
		"think outside the box",
		"win-win",
		// Overused security phrases
		"cyber attack",
		"hacker",
		"cyber criminal",
		// Hyperbolic language
		"never before seen",
		"groundbreaking",
		"unprecedented",
		"unparalleled",
		"absolutely critical",
	}
}

// compileMetaphorPatterns compiles regex patterns for detecting metaphors
func compileMetaphorPatterns() []*regexp.Regexp {
	patterns := []string{
		// Common metaphor indicators
		`(?i)\b(like|as|resembles?|similar to)\s+\w+`,
		// War/battle metaphors
		`(?i)\b(battlefield?|warzone?|combat|fight(?:ing)?|battle|arms race|weapon)\b`,
		// Journey metaphors
		`(?i)\b(journey|path|road|roadmap|navigate|voyage)\b`,
		// Building metaphors
		`(?i)\b(foundation|framework|architect|blueprint|cornerstone)\b`,
		// Nature metaphors
		`(?i)\b(storm|tsunami|flood|avalanche|wildfire|forest)\b`,
		// Sports metaphors
		`(?i)\b(touchdown|home run|slam dunk|knockout|game plan)\b`,
		// Castle/fortress metaphors (common in security)
		`(?i)\b(fortress|castle|moat|stronghold|citadel|bastion)\b`,
	}

	compiled := make([]*regexp.Regexp, 0, len(patterns))
	for _, pattern := range patterns {
		if re, err := regexp.Compile(pattern); err == nil {
			compiled = append(compiled, re)
		}
	}

	return compiled
}

// ValidateCopy validates newsletter copy against brand voice rules
func (s *BrandVoiceService) ValidateCopy(ctx context.Context, configID uuid.UUID, content *ContentToValidate) (*BrandVoiceValidationResult, error) {
	if configID == uuid.Nil {
		return nil, fmt.Errorf("configuration ID is required")
	}

	if content == nil {
		return nil, fmt.Errorf("content to validate cannot be nil")
	}

	// Get configuration for brand voice settings
	config, err := s.configRepo.GetByID(ctx, configID)
	if err != nil {
		return nil, fmt.Errorf("failed to get configuration: %w", err)
	}

	result := &BrandVoiceValidationResult{
		IsValid:    true,
		Violations: make([]BrandVoiceViolation, 0),
		Score:      100.0,
	}

	// Combine default banned phrases with config-specific ones
	bannedPhrases := append(s.defaultBannedPhrases, config.BannedPhrases...)

	// Validate each content field
	s.validateField(result, "subject_line", content.SubjectLine, bannedPhrases, config)
	for i, alt := range content.AlternativeSubjectLines {
		s.validateField(result, fmt.Sprintf("alternative_subject_line_%d", i+1), alt, bannedPhrases, config)
	}
	s.validateField(result, "preheader", content.Preheader, bannedPhrases, config)
	s.validateField(result, "intro", content.Intro, bannedPhrases, config)

	// Validate blocks
	for i, block := range content.Blocks {
		s.validateField(result, fmt.Sprintf("block_%d_title", i+1), block.Title, bannedPhrases, config)
		s.validateField(result, fmt.Sprintf("block_%d_teaser", i+1), block.Teaser, bannedPhrases, config)
		s.validateField(result, fmt.Sprintf("block_%d_cta", i+1), block.CTALabel, bannedPhrases, config)
	}

	// Check metaphor count against limit
	if result.MetaphorCount > config.MaxMetaphors {
		result.Violations = append(result.Violations, BrandVoiceViolation{
			Type:        "metaphor_limit_exceeded",
			Location:    "overall",
			Text:        fmt.Sprintf("Found %d metaphors, limit is %d", result.MetaphorCount, config.MaxMetaphors),
			Severity:    "warning",
			RuleID:      "METAPHOR_LIMIT",
			Description: "Content contains too many metaphors which may dilute the message",
		})
		result.WarningCount++
	}

	// Validate subject line style
	if content.SubjectLine != "" {
		styleViolations := s.validateSubjectLineStyle(content.SubjectLine, config.SubjectLineStyle)
		result.Violations = append(result.Violations, styleViolations...)
		for _, v := range styleViolations {
			if v.Severity == "error" {
				result.ErrorCount++
			} else {
				result.WarningCount++
			}
		}
	}

	// Calculate final score and validity
	result.Score = s.calculateScore(result)
	result.IsValid = result.ErrorCount == 0

	// Generate improvement suggestions
	result.Suggestions = s.generateSuggestions(result, config)

	log.Debug().
		Str("config_id", configID.String()).
		Bool("is_valid", result.IsValid).
		Float64("score", result.Score).
		Int("violations", len(result.Violations)).
		Msg("Brand voice validation completed")

	return result, nil
}

// ContentToValidate represents content to be validated
type ContentToValidate struct {
	SubjectLine             string         `json:"subject_line"`
	AlternativeSubjectLines []string       `json:"alternative_subject_lines,omitempty"`
	Preheader               string         `json:"preheader,omitempty"`
	Intro                   string         `json:"intro,omitempty"`
	Blocks                  []BlockContent `json:"blocks,omitempty"`
}

// BlockContent represents a content block for validation
type BlockContent struct {
	Title    string `json:"title,omitempty"`
	Teaser   string `json:"teaser,omitempty"`
	CTALabel string `json:"cta_label,omitempty"`
}

// validateField validates a single text field against brand voice rules
func (s *BrandVoiceService) validateField(result *BrandVoiceValidationResult, location, text string, bannedPhrases []string, config *domain.NewsletterConfiguration) {
	if text == "" {
		return
	}

	lowerText := strings.ToLower(text)

	// Check for banned phrases
	for _, phrase := range bannedPhrases {
		if strings.Contains(lowerText, strings.ToLower(phrase)) {
			result.Violations = append(result.Violations, BrandVoiceViolation{
				Type:        "banned_phrase",
				Location:    location,
				Text:        phrase,
				Severity:    "error",
				RuleID:      "BANNED_PHRASE",
				Description: fmt.Sprintf("Contains banned phrase: '%s'", phrase),
				Suggestion:  s.getSuggestionForBannedPhrase(phrase),
			})
			result.ErrorCount++
		}
	}

	// Count metaphors
	for _, pattern := range s.metaphorPatterns {
		matches := pattern.FindAllString(text, -1)
		result.MetaphorCount += len(matches)
	}

	// Check for excessive exclamation marks
	exclamationCount := strings.Count(text, "!")
	if exclamationCount > 1 {
		result.Violations = append(result.Violations, BrandVoiceViolation{
			Type:        "excessive_exclamation",
			Location:    location,
			Text:        fmt.Sprintf("%d exclamation marks found", exclamationCount),
			Severity:    "warning",
			RuleID:      "EXCLAMATION_LIMIT",
			Description: "Too many exclamation marks may appear unprofessional",
			Suggestion:  "Limit to one exclamation mark or remove entirely",
		})
		result.WarningCount++
	}

	// Check for ALL CAPS words (excluding acronyms)
	s.checkAllCaps(result, location, text)

	// Check for excessively long sentences
	s.checkSentenceLength(result, location, text)
}

// checkAllCaps checks for words in all caps that aren't acronyms
func (s *BrandVoiceService) checkAllCaps(result *BrandVoiceValidationResult, location, text string) {
	words := strings.Fields(text)
	allCapsPattern := regexp.MustCompile(`^[A-Z]{4,}$`)

	for _, word := range words {
		// Skip common acronyms
		if isCommonAcronym(word) {
			continue
		}

		if allCapsPattern.MatchString(word) {
			result.Violations = append(result.Violations, BrandVoiceViolation{
				Type:        "all_caps_word",
				Location:    location,
				Text:        word,
				Severity:    "warning",
				RuleID:      "ALL_CAPS",
				Description: "Words in all caps can feel aggressive",
				Suggestion:  fmt.Sprintf("Consider: '%s'", strings.Title(strings.ToLower(word))),
			})
			result.WarningCount++
		}
	}
}

// isCommonAcronym checks if a word is a common security/tech acronym
func isCommonAcronym(word string) bool {
	acronyms := map[string]bool{
		"API":   true,
		"APIs":  true,
		"AWS":   true,
		"CISO":  true,
		"CISOS": true,
		"CVE":   true,
		"CVES":  true,
		"DDoS":  true,
		"DNS":   true,
		"EDR":   true,
		"GCP":   true,
		"HTTP":  true,
		"HTTPS": true,
		"IoC":   true,
		"IoCs":  true,
		"IOC":   true,
		"IOCS":  true,
		"MDR":   true,
		"MITRE": true,
		"NIST":  true,
		"OWASP": true,
		"SIEM":  true,
		"SOC":   true,
		"SOAR":  true,
		"SSH":   true,
		"SSL":   true,
		"TLS":   true,
		"URL":   true,
		"VPN":   true,
		"XDR":   true,
		"XSS":   true,
		"ZERO":  true,
		"ZTA":   true,
		"ZTNA":  true,
		"AI":    true,
		"ML":    true,
		"LLM":   true,
		"LLMS":  true,
		"APT":   true,
		"APTS":  true,
		"BEC":   true,
		"BYOD":  true,
		"CASB":  true,
		"CIS":   true,
		"DMARC": true,
		"DoS":   true,
		"GDPR":  true,
		"GRC":   true,
		"IAM":   true,
		"ISMS":  true,
		"ISO":   true,
		"MFA":   true,
		"NGFW":  true,
		"PAM":   true,
		"PCI":   true,
		"RBAC":  true,
		"RMM":   true,
		"SaaS":  true,
		"SAM":   true,
		"SBOM":  true,
		"SCIM":  true,
		"SDN":   true,
		"SLA":   true,
		"SSPM":  true,
		"UEBA":  true,
		"WAF":   true,
	}

	return acronyms[word]
}

// checkSentenceLength checks for excessively long sentences
func (s *BrandVoiceService) checkSentenceLength(result *BrandVoiceValidationResult, location, text string) {
	const maxWordsPerSentence = 25

	// Split by sentence-ending punctuation
	sentences := regexp.MustCompile(`[.!?]+`).Split(text, -1)

	for _, sentence := range sentences {
		sentence = strings.TrimSpace(sentence)
		if sentence == "" {
			continue
		}

		wordCount := len(strings.Fields(sentence))
		if wordCount > maxWordsPerSentence {
			result.Violations = append(result.Violations, BrandVoiceViolation{
				Type:        "long_sentence",
				Location:    location,
				Text:        truncateText(sentence, 50),
				Severity:    "info",
				RuleID:      "SENTENCE_LENGTH",
				Description: fmt.Sprintf("Sentence has %d words (recommended max: %d)", wordCount, maxWordsPerSentence),
				Suggestion:  "Consider breaking into shorter sentences for readability",
			})
		}
	}
}

// validateSubjectLineStyle validates the subject line against the configured style
func (s *BrandVoiceService) validateSubjectLineStyle(subjectLine string, style domain.SubjectLineStyle) []BrandVoiceViolation {
	var violations []BrandVoiceViolation

	// Check length
	charCount := utf8.RuneCountInString(subjectLine)
	if charCount > 60 {
		violations = append(violations, BrandVoiceViolation{
			Type:        "subject_line_too_long",
			Location:    "subject_line",
			Text:        fmt.Sprintf("%d characters", charCount),
			Severity:    "warning",
			RuleID:      "SUBJECT_LENGTH",
			Description: "Subject line exceeds 60 characters and may be truncated in email clients",
			Suggestion:  "Shorten to 60 characters or less",
		})
	}

	// Check for emoji (generally discouraged in B2B security)
	if containsEmoji(subjectLine) {
		violations = append(violations, BrandVoiceViolation{
			Type:        "subject_line_emoji",
			Location:    "subject_line",
			Text:        "Contains emoji",
			Severity:    "warning",
			RuleID:      "SUBJECT_EMOJI",
			Description: "Emojis may not display correctly in all email clients and may reduce deliverability",
			Suggestion:  "Remove emoji for better deliverability",
		})
	}

	// Style-specific validation
	switch style {
	case domain.StylePainFirst:
		// Pain-first should lead with problem/threat language
		painWords := []string{"threat", "risk", "breach", "attack", "vulnerability", "exposed", "danger", "critical", "urgent", "alert", "warning"}
		hasPainWord := false
		lowerSubject := strings.ToLower(subjectLine)
		for _, word := range painWords {
			if strings.Contains(lowerSubject, word) {
				hasPainWord = true
				break
			}
		}
		if !hasPainWord {
			violations = append(violations, BrandVoiceViolation{
				Type:        "style_mismatch",
				Location:    "subject_line",
				Text:        "Missing pain/threat language for pain_first style",
				Severity:    "info",
				RuleID:      "STYLE_PAIN_FIRST",
				Description: "Pain-first style should lead with problem/threat-focused language",
				Suggestion:  "Consider leading with words like: threat, risk, vulnerability, etc.",
			})
		}

	case domain.StyleOpportunityFirst:
		// Opportunity-first should lead with positive/solution language
		opportunityWords := []string{"improve", "protect", "secure", "strengthen", "enhance", "optimize", "achieve", "gain", "unlock", "discover", "new", "better", "faster", "smarter"}
		hasOpportunityWord := false
		lowerSubject := strings.ToLower(subjectLine)
		for _, word := range opportunityWords {
			if strings.Contains(lowerSubject, word) {
				hasOpportunityWord = true
				break
			}
		}
		if !hasOpportunityWord {
			violations = append(violations, BrandVoiceViolation{
				Type:        "style_mismatch",
				Location:    "subject_line",
				Text:        "Missing opportunity language for opportunity_first style",
				Severity:    "info",
				RuleID:      "STYLE_OPPORTUNITY_FIRST",
				Description: "Opportunity-first style should lead with positive/solution language",
				Suggestion:  "Consider leading with words like: improve, protect, enhance, etc.",
			})
		}

	case domain.StyleVisionary:
		// Visionary should have forward-looking language
		visionaryWords := []string{"future", "tomorrow", "vision", "transform", "revolutionize", "evolve", "emerging", "next", "forward", "innovation", "cutting-edge", "pioneering", "leading"}
		hasVisionaryWord := false
		lowerSubject := strings.ToLower(subjectLine)
		for _, word := range visionaryWords {
			if strings.Contains(lowerSubject, word) {
				hasVisionaryWord = true
				break
			}
		}
		if !hasVisionaryWord {
			violations = append(violations, BrandVoiceViolation{
				Type:        "style_mismatch",
				Location:    "subject_line",
				Text:        "Missing visionary language for visionary style",
				Severity:    "info",
				RuleID:      "STYLE_VISIONARY",
				Description: "Visionary style should include forward-looking language",
				Suggestion:  "Consider words like: future, vision, transform, emerging, etc.",
			})
		}
	}

	return violations
}

// containsEmoji checks if text contains emoji characters
func containsEmoji(text string) bool {
	for _, r := range text {
		if r >= 0x1F600 && r <= 0x1F64F || // Emoticons
			r >= 0x1F300 && r <= 0x1F5FF || // Misc Symbols and Pictographs
			r >= 0x1F680 && r <= 0x1F6FF || // Transport and Map
			r >= 0x1F700 && r <= 0x1F77F || // Alchemical Symbols
			r >= 0x1F780 && r <= 0x1F7FF || // Geometric Shapes Extended
			r >= 0x1F800 && r <= 0x1F8FF || // Supplemental Arrows-C
			r >= 0x1F900 && r <= 0x1F9FF || // Supplemental Symbols and Pictographs
			r >= 0x1FA00 && r <= 0x1FA6F || // Chess Symbols
			r >= 0x1FA70 && r <= 0x1FAFF || // Symbols and Pictographs Extended-A
			r >= 0x2600 && r <= 0x26FF || // Misc symbols
			r >= 0x2700 && r <= 0x27BF { // Dingbats
			return true
		}
	}
	return false
}

// calculateScore calculates the brand voice compliance score
func (s *BrandVoiceService) calculateScore(result *BrandVoiceValidationResult) float64 {
	score := 100.0

	// Deduct points for violations
	for _, v := range result.Violations {
		switch v.Severity {
		case "error":
			score -= 15.0
		case "warning":
			score -= 5.0
		case "info":
			score -= 1.0
		}
	}

	if score < 0 {
		score = 0
	}

	return score
}

// generateSuggestions generates improvement suggestions based on violations
func (s *BrandVoiceService) generateSuggestions(result *BrandVoiceValidationResult, config *domain.NewsletterConfiguration) []string {
	suggestions := make([]string, 0)

	hasStyle := false
	hasBanned := false
	hasLength := false

	for _, v := range result.Violations {
		switch v.RuleID {
		case "BANNED_PHRASE":
			if !hasBanned {
				suggestions = append(suggestions, "Replace banned phrases with more professional alternatives")
				hasBanned = true
			}
		case "STYLE_PAIN_FIRST", "STYLE_OPPORTUNITY_FIRST", "STYLE_VISIONARY":
			if !hasStyle {
				suggestions = append(suggestions, fmt.Sprintf("Align subject line with %s style for better engagement", config.SubjectLineStyle))
				hasStyle = true
			}
		case "SUBJECT_LENGTH", "SENTENCE_LENGTH":
			if !hasLength {
				suggestions = append(suggestions, "Shorten content for better readability and deliverability")
				hasLength = true
			}
		case "METAPHOR_LIMIT":
			suggestions = append(suggestions, "Reduce metaphor usage for clearer, more direct communication")
		}
	}

	if result.Score >= 90 && len(suggestions) == 0 {
		suggestions = append(suggestions, "Content meets brand voice guidelines")
	}

	return suggestions
}

// getSuggestionForBannedPhrase returns a suggestion for replacing a banned phrase
func (s *BrandVoiceService) getSuggestionForBannedPhrase(phrase string) string {
	suggestions := map[string]string{
		"revolutionary":             "innovative, effective, new approach",
		"game-changer":              "significant improvement, major advancement",
		"paradigm shift":            "fundamental change, new approach",
		"synergy":                   "collaboration, combined benefit",
		"leverage":                  "use, utilize, apply",
		"low-hanging fruit":         "quick wins, immediate opportunities",
		"move the needle":           "make an impact, show results",
		"circle back":               "follow up, revisit",
		"touch base":                "connect, check in",
		"ping me":                   "contact me, reach out",
		"bandwidth":                 "capacity, time, availability",
		"deep dive":                 "thorough analysis, detailed review",
		"drill down":                "examine closely, investigate",
		"actionable insights":       "practical recommendations",
		"thought leader":            "expert, authority",
		"best-in-class":             "leading, top-performing",
		"cutting-edge":              "advanced, modern, current",
		"world-class":               "excellent, high-quality",
		"next-generation":           "modern, advanced, updated",
		"at the end of the day":     "ultimately, in conclusion",
		"going forward":             "from now on, in the future",
		"take it to the next level": "improve, enhance",
		"think outside the box":     "be creative, find new solutions",
		"win-win":                   "mutually beneficial",
		"cyber attack":              "threat actor activity, malicious campaign",
		"hacker":                    "threat actor, adversary",
		"cyber criminal":            "threat actor, adversary",
		"never before seen":         "novel, newly identified",
		"groundbreaking":            "significant, notable",
		"unprecedented":             "unusual, rare, significant",
		"unparalleled":              "exceptional, significant",
		"absolutely critical":       "critical, essential",
	}

	if suggestion, ok := suggestions[strings.ToLower(phrase)]; ok {
		return fmt.Sprintf("Consider alternatives: %s", suggestion)
	}

	return "Consider more specific, professional language"
}

// truncateText truncates text to the specified length with ellipsis
func truncateText(text string, maxLen int) string {
	if utf8.RuneCountInString(text) <= maxLen {
		return text
	}

	runes := []rune(text)
	return string(runes[:maxLen-3]) + "..."
}

// ValidateBlock validates a single newsletter block content
func (s *BrandVoiceService) ValidateBlock(ctx context.Context, configID uuid.UUID, block *domain.NewsletterBlock) (*BrandVoiceValidationResult, error) {
	if block == nil {
		return nil, fmt.Errorf("block cannot be nil")
	}

	content := &ContentToValidate{
		Blocks: []BlockContent{
			{
				Title:    stringPtrToString(block.Title),
				Teaser:   stringPtrToString(block.Teaser),
				CTALabel: stringPtrToString(block.CTALabel),
			},
		},
	}

	return s.ValidateCopy(ctx, configID, content)
}

// stringPtrToString safely dereferences a string pointer
func stringPtrToString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// GetBannedPhrases returns all banned phrases for a configuration
func (s *BrandVoiceService) GetBannedPhrases(ctx context.Context, configID uuid.UUID) ([]string, error) {
	if configID == uuid.Nil {
		return s.defaultBannedPhrases, nil
	}

	config, err := s.configRepo.GetByID(ctx, configID)
	if err != nil {
		return nil, fmt.Errorf("failed to get configuration: %w", err)
	}

	// Combine default and config-specific banned phrases
	allPhrases := make([]string, 0, len(s.defaultBannedPhrases)+len(config.BannedPhrases))
	allPhrases = append(allPhrases, s.defaultBannedPhrases...)
	allPhrases = append(allPhrases, config.BannedPhrases...)

	return allPhrases, nil
}

// AddBannedPhrase adds a phrase to a configuration's banned list
func (s *BrandVoiceService) AddBannedPhrase(ctx context.Context, configID uuid.UUID, phrase string) error {
	if configID == uuid.Nil {
		return fmt.Errorf("configuration ID is required")
	}

	phrase = strings.TrimSpace(phrase)
	if phrase == "" {
		return fmt.Errorf("phrase cannot be empty")
	}

	config, err := s.configRepo.GetByID(ctx, configID)
	if err != nil {
		return fmt.Errorf("failed to get configuration: %w", err)
	}

	// Check if phrase already exists
	lowerPhrase := strings.ToLower(phrase)
	for _, existing := range config.BannedPhrases {
		if strings.ToLower(existing) == lowerPhrase {
			return nil // Already exists
		}
	}

	config.BannedPhrases = append(config.BannedPhrases, phrase)

	if err := s.configRepo.Update(ctx, config); err != nil {
		return fmt.Errorf("failed to update configuration: %w", err)
	}

	log.Info().
		Str("config_id", configID.String()).
		Str("phrase", phrase).
		Msg("Banned phrase added to configuration")

	return nil
}

// RemoveBannedPhrase removes a phrase from a configuration's banned list
func (s *BrandVoiceService) RemoveBannedPhrase(ctx context.Context, configID uuid.UUID, phrase string) error {
	if configID == uuid.Nil {
		return fmt.Errorf("configuration ID is required")
	}

	phrase = strings.TrimSpace(phrase)
	if phrase == "" {
		return fmt.Errorf("phrase cannot be empty")
	}

	config, err := s.configRepo.GetByID(ctx, configID)
	if err != nil {
		return fmt.Errorf("failed to get configuration: %w", err)
	}

	// Find and remove phrase
	lowerPhrase := strings.ToLower(phrase)
	newPhrases := make([]string, 0, len(config.BannedPhrases))
	found := false

	for _, existing := range config.BannedPhrases {
		if strings.ToLower(existing) == lowerPhrase {
			found = true
			continue
		}
		newPhrases = append(newPhrases, existing)
	}

	if !found {
		return fmt.Errorf("phrase not found in configuration")
	}

	config.BannedPhrases = newPhrases

	if err := s.configRepo.Update(ctx, config); err != nil {
		return fmt.Errorf("failed to update configuration: %w", err)
	}

	log.Info().
		Str("config_id", configID.String()).
		Str("phrase", phrase).
		Msg("Banned phrase removed from configuration")

	return nil
}
