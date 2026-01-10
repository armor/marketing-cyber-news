package voice

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// RuleType represents the category of a style rule
type RuleType string

const (
	RuleTypeDo   RuleType = "do"
	RuleTypeDont RuleType = "dont"
)

// IsValid checks if the rule type is valid
func (r RuleType) IsValid() bool {
	switch r {
	case RuleTypeDo, RuleTypeDont:
		return true
	default:
		return false
	}
}

// String returns the string representation of the rule type
func (r RuleType) String() string {
	return string(r)
}

// DisplayLabel returns a human-readable label for the rule type
func (r RuleType) DisplayLabel() string {
	switch r {
	case RuleTypeDo:
		return "Do"
	case RuleTypeDont:
		return "Don't"
	default:
		return string(r)
	}
}

// StyleRule represents a do/don't guideline for a voice agent
type StyleRule struct {
	ID        uuid.UUID `json:"id" db:"id"`
	AgentID   uuid.UUID `json:"agent_id" db:"agent_id"`
	RuleType  RuleType  `json:"rule_type" db:"rule_type"`
	RuleText  string    `json:"rule_text" db:"rule_text"`
	SortOrder int       `json:"sort_order" db:"sort_order"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// Validate performs validation on the StyleRule
func (s *StyleRule) Validate() error {
	if s.AgentID == uuid.Nil {
		return fmt.Errorf("agent_id is required")
	}

	if !s.RuleType.IsValid() {
		return fmt.Errorf("invalid rule_type: %s", s.RuleType)
	}

	if strings.TrimSpace(s.RuleText) == "" {
		return fmt.Errorf("rule_text is required")
	}

	if len(s.RuleText) > 1000 {
		return fmt.Errorf("rule_text must not exceed 1000 characters")
	}

	return nil
}

// NewStyleRule creates a new StyleRule with default values
func NewStyleRule(agentID uuid.UUID, ruleType RuleType, ruleText string) *StyleRule {
	return &StyleRule{
		ID:        uuid.New(),
		AgentID:   agentID,
		RuleType:  ruleType,
		RuleText:  ruleText,
		SortOrder: 0,
		CreatedAt: time.Now(),
	}
}

// StyleRulesByType groups style rules by their type
type StyleRulesByType struct {
	Do   []StyleRule `json:"do"`
	Dont []StyleRule `json:"dont"`
}

// GroupByType takes a slice of StyleRule and groups them by rule type
func GroupStyleRulesByType(rules []StyleRule) StyleRulesByType {
	result := StyleRulesByType{
		Do:   make([]StyleRule, 0),
		Dont: make([]StyleRule, 0),
	}

	for _, rule := range rules {
		switch rule.RuleType {
		case RuleTypeDo:
			result.Do = append(result.Do, rule)
		case RuleTypeDont:
			result.Dont = append(result.Dont, rule)
		}
	}

	return result
}
