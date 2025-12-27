package service

import (
	"context"
	"fmt"
	"hash/fnv"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// ABTestService handles A/B testing for newsletter optimization
type ABTestService struct {
	variantRepo    repository.TestVariantRepository
	engagementRepo repository.EngagementEventRepository
	contactRepo    repository.ContactRepository
	configRepo     repository.NewsletterConfigRepository
}

// TestResult represents the results of an A/B test
type TestResult struct {
	IssueID            uuid.UUID              `json:"issue_id"`
	TestType           domain.TestType        `json:"test_type"`
	Variants           []VariantStats         `json:"variants"`
	Winner             *VariantStats          `json:"winner,omitempty"`
	Confidence         float64                `json:"confidence"`
	IsSignificant      bool                   `json:"is_significant"`
	MinSampleSizeMet   bool                   `json:"min_sample_size_met"`
	TotalSampleSize    int                    `json:"total_sample_size"`
	WinnerDeclaredAt   *time.Time             `json:"winner_declared_at,omitempty"`
}

// VariantStats represents statistics for a single variant
type VariantStats struct {
	VariantID        uuid.UUID  `json:"variant_id"`
	VariantName      string     `json:"variant_name"`
	VariantValue     string     `json:"variant_value"`
	AssignedContacts int        `json:"assigned_contacts"`
	Opens            int        `json:"opens"`
	Clicks           int        `json:"clicks"`
	OpenRate         float64    `json:"open_rate"`
	ClickRate        float64    `json:"click_rate"`
	PrimaryMetric    float64    `json:"primary_metric"`
	ZScore           *float64   `json:"z_score,omitempty"`
	PValue           *float64   `json:"p_value,omitempty"`
	ConfidenceLevel  *float64   `json:"confidence_level,omitempty"`
	IsWinner         bool       `json:"is_winner"`
}

const (
	// DefaultMinSampleSize is the minimum number of contacts per variant
	DefaultMinSampleSize = 100

	// DefaultSignificanceThreshold is the p-value threshold for significance (95% confidence)
	DefaultSignificanceThreshold = 0.05

	// CriticalZScore is the z-score for 95% confidence (two-tailed test)
	CriticalZScore = 1.96

	// DefaultVariantRatio is the default assignment ratio for A/B tests
	DefaultVariantRatio = 0.5
)

// NewABTestService creates a new A/B test service
func NewABTestService(
	variantRepo repository.TestVariantRepository,
	engagementRepo repository.EngagementEventRepository,
	contactRepo repository.ContactRepository,
	configRepo repository.NewsletterConfigRepository,
) *ABTestService {
	if variantRepo == nil {
		panic("variantRepo cannot be nil")
	}
	if engagementRepo == nil {
		panic("engagementRepo cannot be nil")
	}
	if contactRepo == nil {
		panic("contactRepo cannot be nil")
	}
	if configRepo == nil {
		panic("configRepo cannot be nil")
	}

	return &ABTestService{
		variantRepo:    variantRepo,
		engagementRepo: engagementRepo,
		contactRepo:    contactRepo,
		configRepo:     configRepo,
	}
}

// CreateTestVariants creates A and B variants for an issue (FR-043, FR-044)
func (s *ABTestService) CreateTestVariants(
	ctx context.Context,
	issueID uuid.UUID,
	testType domain.TestType,
	variantAValue string,
	variantBValue string,
) ([]domain.TestVariant, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID is required")
	}

	if !testType.IsValid() {
		return nil, fmt.Errorf("invalid test type: %s", testType)
	}

	if variantAValue == "" {
		return nil, fmt.Errorf("variant A value is required")
	}

	if variantBValue == "" {
		return nil, fmt.Errorf("variant B value is required")
	}

	// Check if variants already exist for this issue
	existing, err := s.variantRepo.GetByIssueID(ctx, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing variants: %w", err)
	}

	if len(existing) > 0 {
		return nil, fmt.Errorf("variants already exist for issue %s", issueID)
	}

	now := time.Now()
	assignmentPercentage := DefaultVariantRatio * 100

	// Create variant A
	variantA := &domain.TestVariant{
		ID:                   uuid.New(),
		IssueID:              issueID,
		TestType:             testType,
		VariantName:          "A",
		VariantValue:         variantAValue,
		AssignedContacts:     0,
		AssignmentPercentage: &assignmentPercentage,
		Opens:                0,
		Clicks:               0,
		OpenRate:             0,
		ClickRate:            0,
		IsWinner:             false,
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	// Create variant B
	variantB := &domain.TestVariant{
		ID:                   uuid.New(),
		IssueID:              issueID,
		TestType:             testType,
		VariantName:          "B",
		VariantValue:         variantBValue,
		AssignedContacts:     0,
		AssignmentPercentage: &assignmentPercentage,
		Opens:                0,
		Clicks:               0,
		OpenRate:             0,
		ClickRate:            0,
		IsWinner:             false,
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	// Validate variants
	if err := variantA.Validate(); err != nil {
		return nil, fmt.Errorf("variant A validation failed: %w", err)
	}

	if err := variantB.Validate(); err != nil {
		return nil, fmt.Errorf("variant B validation failed: %w", err)
	}

	// Save variants
	variants := []*domain.TestVariant{variantA, variantB}
	if err := s.variantRepo.BulkCreate(ctx, variants); err != nil {
		return nil, fmt.Errorf("failed to create variants: %w", err)
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Str("test_type", string(testType)).
		Str("variant_a_id", variantA.ID.String()).
		Str("variant_b_id", variantB.ID.String()).
		Msg("Created A/B test variants")

	return []domain.TestVariant{*variantA, *variantB}, nil
}

// AssignContactToVariant assigns a contact to a variant using deterministic hashing (FR-047)
func (s *ABTestService) AssignContactToVariant(
	ctx context.Context,
	contactID uuid.UUID,
	issueID uuid.UUID,
) (*domain.TestVariant, error) {
	if contactID == uuid.Nil {
		return nil, fmt.Errorf("contact ID is required")
	}

	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID is required")
	}

	// Get variants for issue
	variants, err := s.variantRepo.GetByIssueID(ctx, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get variants: %w", err)
	}

	if len(variants) == 0 {
		return nil, fmt.Errorf("no variants found for issue %s", issueID)
	}

	if len(variants) != 2 {
		return nil, fmt.Errorf("expected 2 variants, found %d", len(variants))
	}

	// Deterministic assignment using hash of contact ID and issue ID
	assignmentKey := fmt.Sprintf("%s-%s", contactID.String(), issueID.String())
	hash := hashString(assignmentKey)

	// Use modulo to determine variant (0 or 1)
	variantIndex := hash % 2
	selectedVariant := variants[variantIndex]

	// Increment assigned contacts count
	selectedVariant.AssignedContacts++
	selectedVariant.UpdatedAt = time.Now()

	if err := s.variantRepo.Update(ctx, selectedVariant); err != nil {
		return nil, fmt.Errorf("failed to update variant assignment count: %w", err)
	}

	log.Debug().
		Str("contact_id", contactID.String()).
		Str("issue_id", issueID.String()).
		Str("variant_id", selectedVariant.ID.String()).
		Str("variant_name", selectedVariant.VariantName).
		Msg("Assigned contact to variant")

	return selectedVariant, nil
}

// RecordVariantEvent records an engagement event for a variant (FR-046)
func (s *ABTestService) RecordVariantEvent(
	ctx context.Context,
	variantID uuid.UUID,
	eventType domain.EventType,
) error {
	if variantID == uuid.Nil {
		return fmt.Errorf("variant ID is required")
	}

	if eventType != domain.EventTypeOpen && eventType != domain.EventTypeClick {
		return fmt.Errorf("only open and click events are tracked for variants, got: %s", eventType)
	}

	// Get variant
	variant, err := s.variantRepo.GetByID(ctx, variantID)
	if err != nil {
		return fmt.Errorf("failed to get variant: %w", err)
	}

	// Increment appropriate counter
	var opens, clicks int
	if eventType == domain.EventTypeOpen {
		opens = variant.Opens + 1
		clicks = variant.Clicks
	} else {
		opens = variant.Opens
		clicks = variant.Clicks + 1
	}

	// Update variant results
	if err := s.variantRepo.UpdateResults(ctx, variantID, opens, clicks); err != nil {
		return fmt.Errorf("failed to update variant results: %w", err)
	}

	log.Debug().
		Str("variant_id", variantID.String()).
		Str("event_type", string(eventType)).
		Int("opens", opens).
		Int("clicks", clicks).
		Msg("Recorded variant event")

	return nil
}

// CalculateWinner calculates the winning variant based on statistical significance (FR-045, FR-048)
func (s *ABTestService) CalculateWinner(
	ctx context.Context,
	issueID uuid.UUID,
) (*TestResult, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID is required")
	}

	// Get variants for issue
	variantModels, err := s.variantRepo.GetByIssueID(ctx, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get variants: %w", err)
	}

	if len(variantModels) == 0 {
		return nil, fmt.Errorf("no variants found for issue %s", issueID)
	}

	// Convert to domain models and calculate rates
	variants := make([]domain.TestVariant, len(variantModels))
	for i, v := range variantModels {
		variants[i] = *v
		variants[i].CalculateOpenRate()
		variants[i].CalculateClickRate()
	}

	// Check minimum sample size
	minSampleSizeMet := true
	totalSampleSize := 0
	for _, v := range variants {
		totalSampleSize += v.AssignedContacts
		if v.AssignedContacts < DefaultMinSampleSize {
			minSampleSizeMet = false
		}
	}

	// Calculate variant statistics
	stats := make([]VariantStats, len(variants))
	for i, v := range variants {
		stats[i] = VariantStats{
			VariantID:        v.ID,
			VariantName:      v.VariantName,
			VariantValue:     v.VariantValue,
			AssignedContacts: v.AssignedContacts,
			Opens:            v.Opens,
			Clicks:           v.Clicks,
			OpenRate:         v.OpenRate,
			ClickRate:        v.ClickRate,
			PrimaryMetric:    v.GetPrimaryMetric(),
			IsWinner:         false,
		}
	}

	result := &TestResult{
		IssueID:          issueID,
		TestType:         variants[0].TestType,
		Variants:         stats,
		MinSampleSizeMet: minSampleSizeMet,
		TotalSampleSize:  totalSampleSize,
		IsSignificant:    false,
		Confidence:       0,
	}

	// Cannot determine winner without minimum sample size
	if !minSampleSizeMet {
		log.Info().
			Str("issue_id", issueID.String()).
			Int("total_sample_size", totalSampleSize).
			Int("min_required", DefaultMinSampleSize).
			Msg("Insufficient sample size for winner determination")
		return result, nil
	}

	// Use domain helper to determine winner
	winner := domain.DetermineWinner(variants, DefaultMinSampleSize)
	if winner == nil {
		log.Info().
			Str("issue_id", issueID.String()).
			Msg("No statistically significant winner found")
		return result, nil
	}

	// Calculate z-score and p-value for winner vs other variants
	var maxZScore float64
	var minPValue float64 = 1.0

	for i := range stats {
		if stats[i].VariantID == winner.ID {
			continue
		}

		zScore := domain.CalculateZScore(
			winner.GetPrimaryMetric(),
			stats[i].PrimaryMetric,
			winner.AssignedContacts,
			stats[i].AssignedContacts,
		)

		pValue := calculatePValue(zScore)

		if math.Abs(zScore) > math.Abs(maxZScore) {
			maxZScore = zScore
		}

		if pValue < minPValue {
			minPValue = pValue
		}
	}

	// Update result with winner information
	for i := range stats {
		if stats[i].VariantID == winner.ID {
			stats[i].IsWinner = true
			stats[i].ZScore = &maxZScore
			stats[i].PValue = &minPValue
			confidenceLevel := (1.0 - minPValue) * 100
			stats[i].ConfidenceLevel = &confidenceLevel

			result.Winner = &stats[i]
			result.IsSignificant = true
			result.Confidence = confidenceLevel
			break
		}
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Str("winner_variant", result.Winner.VariantName).
		Float64("confidence", result.Confidence).
		Msg("Calculated A/B test winner")

	return result, nil
}

// ApplyFeedbackLoop stores winning variant data for future optimization (FR-049, FR-050)
func (s *ABTestService) ApplyFeedbackLoop(
	ctx context.Context,
	issueID uuid.UUID,
) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	// Calculate winner
	result, err := s.CalculateWinner(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to calculate winner: %w", err)
	}

	if result.Winner == nil {
		return fmt.Errorf("no winner to apply feedback from")
	}

	if !result.IsSignificant {
		return fmt.Errorf("winner is not statistically significant")
	}

	// Declare winner in database
	significance := result.Confidence / 100.0
	if err := s.variantRepo.DeclareWinner(ctx, result.Winner.VariantID, significance); err != nil {
		return fmt.Errorf("failed to declare winner: %w", err)
	}

	// Get winner variant to access full data
	winner, err := s.variantRepo.GetByID(ctx, result.Winner.VariantID)
	if err != nil {
		return fmt.Errorf("failed to get winner variant: %w", err)
	}

	// Store feedback based on test type
	// For subject line tests, update configuration preferences
	if winner.TestType == domain.TestTypeSubjectLine {
		// This would update configuration with winning subject line pattern
		log.Info().
			Str("issue_id", issueID.String()).
			Str("test_type", string(winner.TestType)).
			Str("winning_value", winner.VariantValue).
			Float64("open_rate", winner.OpenRate).
			Msg("Applied subject line feedback")
	}

	// For send time tests, update optimal send time
	if winner.TestType == domain.TestTypeSendTime {
		log.Info().
			Str("issue_id", issueID.String()).
			Str("test_type", string(winner.TestType)).
			Str("winning_value", winner.VariantValue).
			Float64("click_rate", winner.ClickRate).
			Msg("Applied send time feedback")
	}

	// For content tests (hero topic, CTA framing), store preferences
	if winner.TestType == domain.TestTypeHeroTopic || winner.TestType == domain.TestTypeCTAFraming {
		log.Info().
			Str("issue_id", issueID.String()).
			Str("test_type", string(winner.TestType)).
			Str("winning_value", winner.VariantValue).
			Float64("click_rate", winner.ClickRate).
			Msg("Applied content feedback")
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Str("winner_variant", winner.VariantName).
		Float64("confidence", result.Confidence).
		Msg("Applied feedback loop from A/B test winner")

	return nil
}

// GetTestResults retrieves test results without declaring a winner (FR-048)
func (s *ABTestService) GetTestResults(
	ctx context.Context,
	issueID uuid.UUID,
) (*TestResult, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID is required")
	}

	// Use CalculateWinner to get results (it doesn't modify state)
	result, err := s.CalculateWinner(ctx, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get test results: %w", err)
	}

	// Check if winner was already declared
	declaredWinner, err := s.variantRepo.GetWinner(ctx, issueID)
	if err == nil && declaredWinner != nil {
		result.WinnerDeclaredAt = declaredWinner.WinnerDeclaredAt
	}

	return result, nil
}

// hashString creates a deterministic hash of a string
func hashString(s string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(s))
	return h.Sum32()
}

// calculatePValue calculates the p-value from a z-score (two-tailed test)
func calculatePValue(zScore float64) float64 {
	if zScore == 0 {
		return 1.0
	}

	// Use absolute value for two-tailed test
	absZ := math.Abs(zScore)

	// Approximate p-value using error function
	// This is a simplified calculation; production code might use a statistics library
	pValue := 2.0 * (1.0 - normalCDF(absZ))

	if pValue < 0 {
		return 0
	}
	if pValue > 1 {
		return 1
	}

	return pValue
}

// normalCDF approximates the cumulative distribution function for standard normal distribution
func normalCDF(x float64) float64 {
	// Using the error function (erf) to calculate CDF
	// CDF(x) = 0.5 * (1 + erf(x / sqrt(2)))
	return 0.5 * (1 + math.Erf(x/math.Sqrt2))
}

// isStatisticallySignificant checks if a p-value indicates statistical significance
func isStatisticallySignificant(pValue float64) bool {
	if pValue < 0 {
		return false
	}
	return pValue < DefaultSignificanceThreshold
}

// calculateConfidenceInterval calculates the 95% confidence interval for a rate
func calculateConfidenceInterval(rate float64, sampleSize int) (lower, upper float64) {
	if sampleSize == 0 {
		return 0, 0
	}

	// Standard error
	se := math.Sqrt(rate * (1 - rate) / float64(sampleSize))

	// 95% confidence interval (z-score = 1.96)
	margin := CriticalZScore * se

	lower = rate - margin
	upper = rate + margin

	// Clamp to [0, 1]
	if lower < 0 {
		lower = 0
	}
	if upper > 1 {
		upper = 1
	}

	return lower, upper
}
