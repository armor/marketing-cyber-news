package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ImpactLevel represents the impact level on an industry
type ImpactLevel string

const (
	ImpactLevelCritical ImpactLevel = "critical"
	ImpactLevelHigh     ImpactLevel = "high"
	ImpactLevelMedium   ImpactLevel = "medium"
	ImpactLevelLow      ImpactLevel = "low"
)

// IsValid validates the impact level value
func (i ImpactLevel) IsValid() bool {
	switch i {
	case ImpactLevelCritical, ImpactLevelHigh, ImpactLevelMedium, ImpactLevelLow:
		return true
	default:
		return false
	}
}

// Priority represents the priority level for recommendations
type Priority string

const (
	PriorityImmediate Priority = "immediate"
	PriorityHigh      Priority = "high"
	PriorityMedium    Priority = "medium"
	PriorityLow       Priority = "low"
)

// IsValid validates the priority value
func (p Priority) IsValid() bool {
	switch p {
	case PriorityImmediate, PriorityHigh, PriorityMedium, PriorityLow:
		return true
	default:
		return false
	}
}

// Note: SubscriptionTier type and constants are defined in user.go

// ExternalReference represents a reference to external sources
type ExternalReference struct {
	Title       string `json:"title"`
	URL         string `json:"url"`
	Source      string `json:"source"`       // e.g., "CISA", "MITRE", "Vendor Advisory"
	PublishedAt string `json:"published_at"` // ISO 8601 timestamp
}

// IsValid validates the external reference structure
func (e *ExternalReference) IsValid() error {
	if e.Title == "" {
		return fmt.Errorf("title is required")
	}

	if e.URL == "" {
		return fmt.Errorf("url is required")
	}

	if e.Source == "" {
		return fmt.Errorf("source is required")
	}

	return nil
}

// Industry represents an industry affected by the threat with impact level
type Industry struct {
	Name        string      `json:"name"`         // e.g., "Finance", "Healthcare", "Technology"
	ImpactLevel ImpactLevel `json:"impact_level"` // critical, high, medium, low
	Details     string      `json:"details"`      // Specific impact description
}

// IsValid validates the industry structure
func (i *Industry) IsValid() error {
	if i.Name == "" {
		return fmt.Errorf("name is required")
	}

	if !i.ImpactLevel.IsValid() {
		return fmt.Errorf("invalid impact_level")
	}

	return nil
}

// Recommendation represents an action recommendation with priority
type Recommendation struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Priority    Priority `json:"priority"` // immediate, high, medium, low
	Category    string   `json:"category"` // e.g., "patch", "monitor", "mitigate", "investigate"
}

// IsValid validates the recommendation structure
func (r *Recommendation) IsValid() error {
	if r.Title == "" {
		return fmt.Errorf("title is required")
	}

	if r.Description == "" {
		return fmt.Errorf("description is required")
	}

	if !r.Priority.IsValid() {
		return fmt.Errorf("invalid priority")
	}

	if r.Category == "" {
		return fmt.Errorf("category is required")
	}

	validCategories := map[string]bool{
		"patch":       true,
		"monitor":     true,
		"mitigate":    true,
		"investigate": true,
		"configure":   true,
		"update":      true,
	}

	if !validCategories[r.Category] {
		return fmt.Errorf("invalid category: %s", r.Category)
	}

	return nil
}

// MitreTechnique represents a MITRE ATT&CK technique
type MitreTechnique struct {
	ID          string `json:"id"`          // e.g., "T1566.001"
	Name        string `json:"name"`        // e.g., "Spearphishing Attachment"
	Tactic      string `json:"tactic"`      // e.g., "Initial Access"
	Description string `json:"description"` // Brief description
	URL         string `json:"url"`         // Link to MITRE page
}

// IsValid validates the MITRE technique structure
func (m *MitreTechnique) IsValid() error {
	if m.ID == "" {
		return fmt.Errorf("id is required")
	}

	if m.Name == "" {
		return fmt.Errorf("name is required")
	}

	if m.Tactic == "" {
		return fmt.Errorf("tactic is required")
	}

	return nil
}

// TimelineEvent represents an event in the threat timeline
type TimelineEvent struct {
	Date        string `json:"date"`        // ISO 8601 date
	Title       string `json:"title"`       // Event title
	Description string `json:"description"` // Event details
	Source      string `json:"source"`      // Information source
}

// IsValid validates the timeline event structure
func (t *TimelineEvent) IsValid() error {
	if t.Date == "" {
		return fmt.Errorf("date is required")
	}

	if t.Title == "" {
		return fmt.Errorf("title is required")
	}

	if t.Description == "" {
		return fmt.Errorf("description is required")
	}

	// Parse date to ensure it's valid ISO 8601
	if _, err := time.Parse(time.RFC3339, t.Date); err != nil {
		return fmt.Errorf("invalid date format (use ISO 8601): %w", err)
	}

	return nil
}

// TechnicalAnalysis represents detailed technical analysis
type TechnicalAnalysis struct {
	Summary              string   `json:"summary"`                   // Executive summary
	AttackChain          []string `json:"attack_chain"`              // Step-by-step attack progression
	Indicators           []string `json:"indicators"`                // Observable indicators
	DetectionMethods     []string `json:"detection_methods"`         // How to detect this threat
	MitigationStrategies []string `json:"mitigation_strategies"`     // How to mitigate
	ToolsUsed            []string `json:"tools_used,omitempty"`      // Tools used by attackers
	Vulnerabilities      []string `json:"vulnerabilities,omitempty"` // CVEs and vulnerabilities exploited
}

// IsValid validates the technical analysis structure
func (t *TechnicalAnalysis) IsValid() error {
	if t.Summary == "" {
		return fmt.Errorf("summary is required")
	}

	if len(t.AttackChain) == 0 {
		return fmt.Errorf("attack_chain must have at least one step")
	}

	if len(t.Indicators) == 0 {
		return fmt.Errorf("indicators must have at least one entry")
	}

	if len(t.DetectionMethods) == 0 {
		return fmt.Errorf("detection_methods must have at least one entry")
	}

	if len(t.MitigationStrategies) == 0 {
		return fmt.Errorf("mitigation_strategies must have at least one entry")
	}

	return nil
}

// ThreatActorProfile represents information about a threat actor
type ThreatActorProfile struct {
	Name            string   `json:"name"`                       // Actor name or designation
	Aliases         []string `json:"aliases,omitempty"`          // Known aliases
	Motivation      string   `json:"motivation"`                 // e.g., "financial", "espionage", "hacktivism"
	Origin          string   `json:"origin,omitempty"`           // Suspected country/region of origin
	TargetSectors   []string `json:"target_sectors"`             // Industries they target
	KnownTechniques []string `json:"known_techniques,omitempty"` // MITRE technique IDs
	FirstSeen       string   `json:"first_seen,omitempty"`       // ISO 8601 date
	LastSeen        string   `json:"last_seen,omitempty"`        // ISO 8601 date
}

// IsValid validates the threat actor profile structure
func (t *ThreatActorProfile) IsValid() error {
	if t.Name == "" {
		return fmt.Errorf("name is required")
	}

	if t.Motivation == "" {
		return fmt.Errorf("motivation is required")
	}

	validMotivations := map[string]bool{
		"financial":  true,
		"espionage":  true,
		"hacktivism": true,
		"terrorism":  true,
		"unknown":    true,
	}

	if !validMotivations[t.Motivation] {
		return fmt.Errorf("invalid motivation: %s", t.Motivation)
	}

	if len(t.TargetSectors) == 0 {
		return fmt.Errorf("target_sectors must have at least one entry")
	}

	return nil
}

// DeepDive represents comprehensive threat intelligence analysis
type DeepDive struct {
	ID                uuid.UUID            `json:"id"`
	ArticleID         uuid.UUID            `json:"article_id"`
	ExecutiveSummary  string               `json:"executive_summary"`
	TechnicalAnalysis TechnicalAnalysis    `json:"technical_analysis"`
	Timeline          []TimelineEvent      `json:"timeline"`
	MitreTechniques   []MitreTechnique     `json:"mitre_techniques"`
	IOCs              []IOC                `json:"iocs"`
	ThreatActors      []ThreatActorProfile `json:"threat_actors,omitempty"`
	AffectedProducts  []string             `json:"affected_products,omitempty"`
	RelatedThreats    []uuid.UUID          `json:"related_threats,omitempty"` // Article IDs
	RequiredTier      SubscriptionTier     `json:"required_tier"`             // Minimum tier required
	CreatedAt         time.Time            `json:"created_at"`
	UpdatedAt         time.Time            `json:"updated_at"`
}

// Validate performs validation on the DeepDive
func (d *DeepDive) Validate() error {
	if d.ID == uuid.Nil {
		return fmt.Errorf("id is required")
	}

	if d.ArticleID == uuid.Nil {
		return fmt.Errorf("article_id is required")
	}

	if d.ExecutiveSummary == "" {
		return fmt.Errorf("executive_summary is required")
	}

	if err := d.TechnicalAnalysis.IsValid(); err != nil {
		return fmt.Errorf("invalid technical_analysis: %w", err)
	}

	if len(d.Timeline) == 0 {
		return fmt.Errorf("timeline must have at least one event")
	}

	for i, event := range d.Timeline {
		if err := event.IsValid(); err != nil {
			return fmt.Errorf("invalid timeline event at index %d: %w", i, err)
		}
	}

	for i, technique := range d.MitreTechniques {
		if err := technique.IsValid(); err != nil {
			return fmt.Errorf("invalid mitre_technique at index %d: %w", i, err)
		}
	}

	for i, ioc := range d.IOCs {
		if !ioc.IsValid() {
			return fmt.Errorf("invalid ioc at index %d", i)
		}
	}

	for i, actor := range d.ThreatActors {
		if err := actor.IsValid(); err != nil {
			return fmt.Errorf("invalid threat_actor at index %d: %w", i, err)
		}
	}

	if !d.RequiredTier.IsValid() {
		return fmt.Errorf("invalid required_tier")
	}

	if d.CreatedAt.IsZero() {
		return fmt.Errorf("created_at is required")
	}

	if d.UpdatedAt.IsZero() {
		return fmt.Errorf("updated_at is required")
	}

	return nil
}

// GetPreview returns a preview of the deep dive (first 200 characters of executive summary)
func (d *DeepDive) GetPreview() string {
	const previewLength = 200

	if len(d.ExecutiveSummary) <= previewLength {
		return d.ExecutiveSummary
	}

	return d.ExecutiveSummary[:previewLength] + "..."
}

// DeepDivePreview represents a preview for free users
type DeepDivePreview struct {
	Preview      string           `json:"preview"`
	RequiredTier SubscriptionTier `json:"required_tier"`
	UpgradeURL   string           `json:"upgrade_url"`
	Message      string           `json:"message"`
}

// NewDeepDivePreview creates a preview from a deep dive
func NewDeepDivePreview(deepDive *DeepDive, upgradeURL string) *DeepDivePreview {
	return &DeepDivePreview{
		Preview:      deepDive.GetPreview(),
		RequiredTier: deepDive.RequiredTier,
		UpgradeURL:   upgradeURL,
		Message:      "Upgrade to access full threat intelligence analysis with technical details, timelines, and mitigation strategies.",
	}
}
