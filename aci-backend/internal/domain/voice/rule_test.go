package voice

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRuleType_IsValid(t *testing.T) {
	tests := []struct {
		name     string
		ruleType RuleType
		want     bool
	}{
		{"do is valid", RuleTypeDo, true},
		{"dont is valid", RuleTypeDont, true},
		{"empty is invalid", RuleType(""), false},
		{"unknown is invalid", RuleType("unknown"), false},
		{"DO uppercase is invalid", RuleType("DO"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.ruleType.IsValid()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestRuleType_String(t *testing.T) {
	assert.Equal(t, "do", RuleTypeDo.String())
	assert.Equal(t, "dont", RuleTypeDont.String())
}

func TestRuleType_DisplayLabel(t *testing.T) {
	assert.Equal(t, "Do", RuleTypeDo.DisplayLabel())
	assert.Equal(t, "Don't", RuleTypeDont.DisplayLabel())
	assert.Equal(t, "custom", RuleType("custom").DisplayLabel())
}

func TestStyleRule_Validate(t *testing.T) {
	validRule := func() *StyleRule {
		return &StyleRule{
			ID:       uuid.New(),
			AgentID:  uuid.New(),
			RuleType: RuleTypeDo,
			RuleText: "Use active voice",
		}
	}

	tests := []struct {
		name    string
		modify  func(*StyleRule)
		wantErr string
	}{
		{
			name:    "valid rule passes",
			modify:  func(r *StyleRule) {},
			wantErr: "",
		},
		{
			name:    "nil agent_id fails",
			modify:  func(r *StyleRule) { r.AgentID = uuid.Nil },
			wantErr: "agent_id is required",
		},
		{
			name:    "invalid rule_type fails",
			modify:  func(r *StyleRule) { r.RuleType = RuleType("invalid") },
			wantErr: "invalid rule_type",
		},
		{
			name:    "empty rule_text fails",
			modify:  func(r *StyleRule) { r.RuleText = "" },
			wantErr: "rule_text is required",
		},
		{
			name:    "whitespace only rule_text fails",
			modify:  func(r *StyleRule) { r.RuleText = "   " },
			wantErr: "rule_text is required",
		},
		{
			name:    "rule_text too long fails",
			modify:  func(r *StyleRule) { r.RuleText = string(make([]byte, 1001)) },
			wantErr: "rule_text must not exceed 1000 characters",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rule := validRule()
			tt.modify(rule)

			err := rule.Validate()

			if tt.wantErr == "" {
				assert.NoError(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			}
		})
	}
}

func TestNewStyleRule(t *testing.T) {
	agentID := uuid.New()
	ruleType := RuleTypeDo
	ruleText := "Use active voice"

	rule := NewStyleRule(agentID, ruleType, ruleText)

	assert.NotEqual(t, uuid.Nil, rule.ID)
	assert.Equal(t, agentID, rule.AgentID)
	assert.Equal(t, ruleType, rule.RuleType)
	assert.Equal(t, ruleText, rule.RuleText)
	assert.Equal(t, 0, rule.SortOrder)
	assert.False(t, rule.CreatedAt.IsZero())
}

func TestGroupStyleRulesByType(t *testing.T) {
	agentID := uuid.New()

	rules := []StyleRule{
		{ID: uuid.New(), AgentID: agentID, RuleType: RuleTypeDo, RuleText: "Do rule 1", SortOrder: 1},
		{ID: uuid.New(), AgentID: agentID, RuleType: RuleTypeDont, RuleText: "Dont rule 1", SortOrder: 1},
		{ID: uuid.New(), AgentID: agentID, RuleType: RuleTypeDo, RuleText: "Do rule 2", SortOrder: 2},
		{ID: uuid.New(), AgentID: agentID, RuleType: RuleTypeDont, RuleText: "Dont rule 2", SortOrder: 2},
	}

	grouped := GroupStyleRulesByType(rules)

	assert.Len(t, grouped.Do, 2)
	assert.Len(t, grouped.Dont, 2)
	assert.Equal(t, "Do rule 1", grouped.Do[0].RuleText)
	assert.Equal(t, "Do rule 2", grouped.Do[1].RuleText)
	assert.Equal(t, "Dont rule 1", grouped.Dont[0].RuleText)
	assert.Equal(t, "Dont rule 2", grouped.Dont[1].RuleText)
}

func TestGroupStyleRulesByType_Empty(t *testing.T) {
	grouped := GroupStyleRulesByType(nil)

	assert.NotNil(t, grouped.Do)
	assert.NotNil(t, grouped.Dont)
	assert.Len(t, grouped.Do, 0)
	assert.Len(t, grouped.Dont, 0)
}
