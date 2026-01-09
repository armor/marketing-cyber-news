package domain

import (
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
)

// TestType represents the type of A/B test being conducted
type TestType string

const (
	TestTypeSubjectLine TestType = "subject_line"
	TestTypeHeroTopic   TestType = "hero_topic"
	TestTypeCTAFraming  TestType = "cta_framing"
	TestTypeSendTime    TestType = "send_time"
)

const (
	// MinSampleSize is the minimum number of contacts needed for statistical significance
	MinSampleSize = 30

	// DefaultSignificanceLevel is the p-value threshold for statistical significance (95% confidence)
	DefaultSignificanceLevel = 0.05

	// MinPercentage is the minimum assignment percentage
	MinPercentage = 0.0

	// MaxPercentage is the maximum assignment percentage
	MaxPercentage = 100.0
)

// IsValid checks if the test type is valid
func (t TestType) IsValid() bool {
	switch t {
	case TestTypeSubjectLine, TestTypeHeroTopic, TestTypeCTAFraming, TestTypeSendTime:
		return true
	default:
		return false
	}
}

// TestVariant represents an A/B test variant for newsletter optimization
type TestVariant struct {
	ID      uuid.UUID `json:"id"`
	IssueID uuid.UUID `json:"issue_id"`

	// Configuration
	TestType     TestType `json:"test_type"`
	VariantName  string   `json:"variant_name"`
	VariantValue string   `json:"variant_value"`

	// Assignment
	AssignedContacts     int      `json:"assigned_contacts"`
	AssignmentPercentage *float64 `json:"assignment_percentage,omitempty"`

	// Results
	Opens     int     `json:"opens"`
	Clicks    int     `json:"clicks"`
	OpenRate  float64 `json:"open_rate"`
	ClickRate float64 `json:"click_rate"`

	// Winner
	IsWinner                bool       `json:"is_winner"`
	WinnerDeclaredAt        *time.Time `json:"winner_declared_at,omitempty"`
	StatisticalSignificance *float64   `json:"statistical_significance,omitempty"`

	// Metadata
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Validate validates the test variant
func (tv *TestVariant) Validate() error {
	if tv.ID == uuid.Nil {
		return fmt.Errorf("test variant ID is required")
	}

	if tv.IssueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	if !tv.TestType.IsValid() {
		return fmt.Errorf("invalid test type: %s", tv.TestType)
	}

	if tv.VariantName == "" {
		return fmt.Errorf("variant name is required")
	}

	if tv.VariantValue == "" {
		return fmt.Errorf("variant value is required")
	}

	if tv.AssignedContacts < 0 {
		return fmt.Errorf("assigned contacts must be non-negative")
	}

	if tv.AssignmentPercentage != nil {
		if *tv.AssignmentPercentage < MinPercentage || *tv.AssignmentPercentage > MaxPercentage {
			return fmt.Errorf("assignment percentage must be between %.1f and %.1f", MinPercentage, MaxPercentage)
		}
	}

	if tv.Opens < 0 {
		return fmt.Errorf("opens must be non-negative")
	}

	if tv.Clicks < 0 {
		return fmt.Errorf("clicks must be non-negative")
	}

	if tv.OpenRate < 0 {
		return fmt.Errorf("open rate must be non-negative")
	}

	if tv.ClickRate < 0 {
		return fmt.Errorf("click rate must be non-negative")
	}

	if tv.StatisticalSignificance != nil && *tv.StatisticalSignificance < 0 {
		return fmt.Errorf("statistical significance must be non-negative")
	}

	return nil
}

// CalculateOpenRate calculates and updates the open rate based on opens and assigned contacts
func (tv *TestVariant) CalculateOpenRate() {
	if tv.AssignedContacts == 0 {
		tv.OpenRate = 0
		return
	}
	tv.OpenRate = float64(tv.Opens) / float64(tv.AssignedContacts)
}

// CalculateClickRate calculates and updates the click rate based on clicks and assigned contacts
func (tv *TestVariant) CalculateClickRate() {
	if tv.AssignedContacts == 0 {
		tv.ClickRate = 0
		return
	}
	tv.ClickRate = float64(tv.Clicks) / float64(tv.AssignedContacts)
}

// IsStatisticallySignificant checks if the variant has statistical significance based on p-value
func (tv *TestVariant) IsStatisticallySignificant(pValue float64) bool {
	if pValue < 0 {
		return false
	}
	return pValue < DefaultSignificanceLevel
}

// GetPrimaryMetric returns the primary metric for this test type
func (tv *TestVariant) GetPrimaryMetric() float64 {
	switch tv.TestType {
	case TestTypeSubjectLine:
		return tv.OpenRate
	case TestTypeHeroTopic, TestTypeCTAFraming, TestTypeSendTime:
		return tv.ClickRate
	default:
		return tv.OpenRate
	}
}

// CompareTo compares this variant to another based on primary metric
// Returns -1 if this variant is worse, 0 if equal, 1 if this variant is better
func (tv *TestVariant) CompareTo(other *TestVariant) int {
	if other == nil {
		return 1
	}

	thisPrimary := tv.GetPrimaryMetric()
	otherPrimary := other.GetPrimaryMetric()

	const epsilon = 1e-9
	if math.Abs(thisPrimary-otherPrimary) < epsilon {
		return 0
	}

	if thisPrimary > otherPrimary {
		return 1
	}

	return -1
}

// TestVariantFilter represents filtering criteria for test variants
type TestVariantFilter struct {
	IssueID  *uuid.UUID `json:"issue_id,omitempty"`
	TestType *TestType  `json:"test_type,omitempty"`
	IsWinner *bool      `json:"is_winner,omitempty"`
}

// CalculateZScore calculates the z-score for comparing two variant rates
// Used to determine statistical significance in A/B testing
func CalculateZScore(rate1, rate2 float64, n1, n2 int) float64 {
	if n1 == 0 || n2 == 0 {
		return 0
	}

	// Pooled proportion
	p1 := rate1
	p2 := rate2
	pooledP := (p1*float64(n1) + p2*float64(n2)) / float64(n1+n2)

	// Standard error
	se := math.Sqrt(pooledP * (1 - pooledP) * (1/float64(n1) + 1/float64(n2)))

	if se == 0 {
		return 0
	}

	// Z-score
	return (p1 - p2) / se
}

// DetermineWinner analyzes test variants and determines the winner based on statistical significance
// Returns nil if no clear winner can be determined
func DetermineWinner(variants []TestVariant, minSampleSize int) *TestVariant {
	if len(variants) == 0 {
		return nil
	}

	// Check if all variants have minimum sample size
	for _, variant := range variants {
		if variant.AssignedContacts < minSampleSize {
			return nil
		}
	}

	// Find the variant with the best primary metric
	var best *TestVariant
	for i := range variants {
		v := &variants[i]

		if best == nil {
			best = v
			continue
		}

		if v.CompareTo(best) > 0 {
			best = v
		}
	}

	if best == nil {
		return nil
	}

	// Check statistical significance against all other variants
	bestMetric := best.GetPrimaryMetric()
	isSignificant := true

	for i := range variants {
		v := &variants[i]

		if v.ID == best.ID {
			continue
		}

		variantMetric := v.GetPrimaryMetric()
		zScore := CalculateZScore(bestMetric, variantMetric, best.AssignedContacts, v.AssignedContacts)

		// For 95% confidence level, z-score should be > 1.96
		const criticalZScore = 1.96
		if math.Abs(zScore) < criticalZScore {
			isSignificant = false
			break
		}
	}

	if !isSignificant {
		return nil
	}

	return best
}
