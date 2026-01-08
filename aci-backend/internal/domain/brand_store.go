package domain

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// BrandStore represents a tenant's brand context for AI content generation.
// It stores brand voice examples, guidelines, terminology rules, and corrections
// in a RAG-backed system using Qdrant vector database.
type BrandStore struct {
	ID                     uuid.UUID   `json:"id" db:"id"`
	TenantID               uuid.UUID   `json:"tenant_id" db:"tenant_id"`
	QdrantCollectionPrefix string      `json:"qdrant_collection_prefix" db:"qdrant_collection_prefix"`
	VoiceExamplesCount     int         `json:"voice_examples_count" db:"voice_examples_count"`
	GuidelinesCount        int         `json:"guidelines_count" db:"guidelines_count"`
	TerminologyCount       int         `json:"terminology_count" db:"terminology_count"`
	CorrectionsCount       int         `json:"corrections_count" db:"corrections_count"`
	HealthScore            int         `json:"health_score" db:"health_score"`
	Strictness             float64     `json:"strictness" db:"strictness"`
	AutoCorrect            bool        `json:"auto_correct" db:"auto_correct"`
	ApprovedTerms          []string    `json:"approved_terms" db:"approved_terms"`
	BannedTerms            []TermEntry `json:"banned_terms" db:"banned_terms"`
	LastTrainedAt          *time.Time  `json:"last_trained_at,omitempty" db:"last_trained_at"`
	CreatedAt              time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt              time.Time   `json:"updated_at" db:"updated_at"`
}

// TermEntry represents a banned term with optional replacement suggestion.
type TermEntry struct {
	Term        string `json:"term"`
	Replacement string `json:"replacement,omitempty"`
	Category    string `json:"category,omitempty"` // e.g., "jargon", "competitor", "offensive"
}

// BrandContext is injected into LLM prompts for content generation.
// It provides relevant brand voice examples, guidelines, and terminology rules
// retrieved from the RAG system.
type BrandContext struct {
	VoiceExamples    []string    `json:"voice_examples"`
	Guidelines       []string    `json:"guidelines"`
	ApprovedTerms    []string    `json:"approved_terms"`
	BannedTerms      []TermEntry `json:"banned_terms"`
	ToneGuidelines   string      `json:"tone_guidelines"`
	TargetAudience   string      `json:"target_audience,omitempty"`
	BrandPersonality string      `json:"brand_personality,omitempty"`
}

// BrandValidation is the result of validating content against brand rules.
type BrandValidation struct {
	Score        int          `json:"score"` // 0-100
	Issues       []BrandIssue `json:"issues"`
	AutoFixed    bool         `json:"auto_fixed"`
	FixedContent string       `json:"fixed_content,omitempty"`
	Warnings     []string     `json:"warnings,omitempty"`
}

// BrandIssue represents a specific brand guideline violation.
type BrandIssue struct {
	Type       BrandIssueType `json:"type"`
	Severity   IssueSeverity  `json:"severity"`
	Message    string         `json:"message"`
	Suggestion string         `json:"suggestion,omitempty"`
	Position   *TextPosition  `json:"position,omitempty"`
	Term       string         `json:"term,omitempty"` // The problematic term
}

// TextPosition indicates where an issue was found in the content.
type TextPosition struct {
	Start int `json:"start"`
	End   int `json:"end"`
}

// BrandIssueType categorizes brand issues.
type BrandIssueType string

const (
	IssueTerminology BrandIssueType = "terminology"
	IssueTone        BrandIssueType = "tone"
	IssueGuideline   BrandIssueType = "guideline"
	IssueLength      BrandIssueType = "length"
	IssueStructure   BrandIssueType = "structure"
	IssueReadability BrandIssueType = "readability"
)

// IssueSeverity indicates how critical an issue is.
type IssueSeverity string

const (
	SeverityError   IssueSeverity = "error"   // Must fix before publishing
	SeverityWarning IssueSeverity = "warning" // Should fix
	SeverityInfo    IssueSeverity = "info"    // Nice to fix
)

// BrandHealth provides an overview of brand store status.
type BrandHealth struct {
	Score              int        `json:"score"` // 0-100
	VoiceExamplesCount int        `json:"voice_examples_count"`
	GuidelinesCount    int        `json:"guidelines_count"`
	TerminologyCount   int        `json:"terminology_count"`
	CorrectionsCount   int        `json:"corrections_count"`
	Strictness         float64    `json:"strictness"`
	Recommendations    []string   `json:"recommendations"`
	LastTrainedAt      *time.Time `json:"last_trained_at,omitempty"`
}

// BrandAsset represents uploaded brand materials.
type BrandAsset struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenant_id"`
	Type        string     `json:"type"` // "guideline", "example", "logo", etc.
	Filename    string     `json:"filename"`
	ContentType string     `json:"content_type"`
	Size        int64      `json:"size"`
	ProcessedAt *time.Time `json:"processed_at,omitempty"`
	ChunkCount  int        `json:"chunk_count"` // Number of vectors in Qdrant
	CreatedAt   time.Time  `json:"created_at"`
}

// NewBrandStore creates a new brand store with sensible defaults.
func NewBrandStore(tenantID uuid.UUID) *BrandStore {
	return &BrandStore{
		ID:                     uuid.New(),
		TenantID:               tenantID,
		QdrantCollectionPrefix: fmt.Sprintf("brand_%s_", tenantID.String()[:8]),
		VoiceExamplesCount:     0,
		GuidelinesCount:        0,
		TerminologyCount:       0,
		CorrectionsCount:       0,
		HealthScore:            0,
		Strictness:             0.70, // Default: moderately strict
		AutoCorrect:            false,
		ApprovedTerms:          []string{},
		BannedTerms:            []TermEntry{},
		CreatedAt:              time.Now(),
		UpdatedAt:              time.Now(),
	}
}

// Validate validates the brand store.
func (b *BrandStore) Validate() error {
	if b.QdrantCollectionPrefix == "" {
		return fmt.Errorf("qdrant collection prefix is required")
	}

	if b.Strictness < 0 || b.Strictness > 1 {
		return fmt.Errorf("strictness must be between 0 and 1")
	}

	if b.HealthScore < 0 || b.HealthScore > 100 {
		return fmt.Errorf("health score must be between 0 and 100")
	}

	return nil
}

// CalculateHealthScore recalculates the health score based on content volume.
// Maximum score is 100 points distributed across four categories.
func (b *BrandStore) CalculateHealthScore() int {
	score := 0

	// Voice examples (max 30 points)
	if b.VoiceExamplesCount >= 10 {
		score += 30
	} else {
		score += b.VoiceExamplesCount * 3
	}

	// Guidelines (max 30 points)
	if b.GuidelinesCount >= 5 {
		score += 30
	} else {
		score += b.GuidelinesCount * 6
	}

	// Terminology (max 20 points)
	if b.TerminologyCount >= 20 {
		score += 20
	} else {
		score += b.TerminologyCount
	}

	// Corrections/feedback (max 20 points)
	if b.CorrectionsCount >= 10 {
		score += 20
	} else {
		score += b.CorrectionsCount * 2
	}

	return score
}

// GetRecommendations returns suggestions for improving brand store health.
func (b *BrandStore) GetRecommendations() []string {
	recommendations := make([]string, 0)

	if b.VoiceExamplesCount < 5 {
		recommendations = append(recommendations,
			fmt.Sprintf("Add more voice examples (currently %d, recommend 10+)", b.VoiceExamplesCount))
	}

	if b.GuidelinesCount < 3 {
		recommendations = append(recommendations,
			"Upload brand guidelines document to improve content consistency")
	}

	if len(b.ApprovedTerms) < 10 {
		recommendations = append(recommendations,
			"Define approved terminology for consistent brand language")
	}

	if len(b.BannedTerms) < 5 {
		recommendations = append(recommendations,
			"Add banned terms to prevent unwanted language in content")
	}

	if b.LastTrainedAt == nil || time.Since(*b.LastTrainedAt) > 30*24*time.Hour {
		recommendations = append(recommendations,
			"Train the brand store with recent content examples")
	}

	return recommendations
}

// ContainsBannedTerm checks if text contains any banned terms.
// Returns true and the term entry if found, false and nil otherwise.
func (b *BrandStore) ContainsBannedTerm(text string) (bool, *TermEntry) {
	lowerText := strings.ToLower(text)

	for i := range b.BannedTerms {
		if strings.Contains(lowerText, strings.ToLower(b.BannedTerms[i].Term)) {
			return true, &b.BannedTerms[i]
		}
	}

	return false, nil
}
