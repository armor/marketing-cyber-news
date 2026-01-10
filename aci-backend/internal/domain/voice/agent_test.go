package voice

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVoiceAgentStatus_IsValid(t *testing.T) {
	tests := []struct {
		name   string
		status VoiceAgentStatus
		want   bool
	}{
		{"draft is valid", VoiceAgentStatusDraft, true},
		{"active is valid", VoiceAgentStatusActive, true},
		{"inactive is valid", VoiceAgentStatusInactive, true},
		{"empty is invalid", VoiceAgentStatus(""), false},
		{"unknown is invalid", VoiceAgentStatus("unknown"), false},
		{"ACTIVE uppercase is invalid", VoiceAgentStatus("ACTIVE"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.status.IsValid()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestVoiceAgentStatus_String(t *testing.T) {
	assert.Equal(t, "draft", VoiceAgentStatusDraft.String())
	assert.Equal(t, "active", VoiceAgentStatusActive.String())
	assert.Equal(t, "inactive", VoiceAgentStatusInactive.String())
}

func TestVoiceAgent_Validate(t *testing.T) {
	validAgent := func() *VoiceAgent {
		return &VoiceAgent{
			ID:           uuid.New(),
			Name:         "Test Agent",
			SystemPrompt: "You are a helpful assistant.",
			Temperature:  0.7,
			MaxTokens:    2000,
			Status:       VoiceAgentStatusActive,
		}
	}

	tests := []struct {
		name    string
		modify  func(*VoiceAgent)
		wantErr string
	}{
		{
			name:    "valid agent passes",
			modify:  func(a *VoiceAgent) {},
			wantErr: "",
		},
		{
			name:    "empty name fails",
			modify:  func(a *VoiceAgent) { a.Name = "" },
			wantErr: "name is required",
		},
		{
			name:    "whitespace only name fails",
			modify:  func(a *VoiceAgent) { a.Name = "   " },
			wantErr: "name is required",
		},
		{
			name:    "name too long fails",
			modify:  func(a *VoiceAgent) { a.Name = string(make([]byte, 101)) },
			wantErr: "name must not exceed 100 characters",
		},
		{
			name:    "empty system_prompt fails",
			modify:  func(a *VoiceAgent) { a.SystemPrompt = "" },
			wantErr: "system_prompt is required",
		},
		{
			name:    "whitespace only system_prompt fails",
			modify:  func(a *VoiceAgent) { a.SystemPrompt = "   " },
			wantErr: "system_prompt is required",
		},
		{
			name:    "temperature below 0 fails",
			modify:  func(a *VoiceAgent) { a.Temperature = -0.1 },
			wantErr: "temperature must be between 0 and 1",
		},
		{
			name:    "temperature above 1 fails",
			modify:  func(a *VoiceAgent) { a.Temperature = 1.1 },
			wantErr: "temperature must be between 0 and 1",
		},
		{
			name:    "temperature at 0 passes",
			modify:  func(a *VoiceAgent) { a.Temperature = 0 },
			wantErr: "",
		},
		{
			name:    "temperature at 1 passes",
			modify:  func(a *VoiceAgent) { a.Temperature = 1 },
			wantErr: "",
		},
		{
			name:    "max_tokens below 100 fails",
			modify:  func(a *VoiceAgent) { a.MaxTokens = 99 },
			wantErr: "max_tokens must be between 100 and 4000",
		},
		{
			name:    "max_tokens above 4000 fails",
			modify:  func(a *VoiceAgent) { a.MaxTokens = 4001 },
			wantErr: "max_tokens must be between 100 and 4000",
		},
		{
			name:    "max_tokens at 100 passes",
			modify:  func(a *VoiceAgent) { a.MaxTokens = 100 },
			wantErr: "",
		},
		{
			name:    "max_tokens at 4000 passes",
			modify:  func(a *VoiceAgent) { a.MaxTokens = 4000 },
			wantErr: "",
		},
		{
			name:    "invalid status fails",
			modify:  func(a *VoiceAgent) { a.Status = VoiceAgentStatus("invalid") },
			wantErr: "invalid status",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			agent := validAgent()
			tt.modify(agent)

			err := agent.Validate()

			if tt.wantErr == "" {
				assert.NoError(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			}
		})
	}
}

func TestVoiceAgent_IsActive(t *testing.T) {
	tests := []struct {
		name      string
		status    VoiceAgentStatus
		deletedAt *time.Time
		want      bool
	}{
		{"active and not deleted", VoiceAgentStatusActive, nil, true},
		{"active but deleted", VoiceAgentStatusActive, timePtr(time.Now()), false},
		{"inactive and not deleted", VoiceAgentStatusInactive, nil, false},
		{"draft and not deleted", VoiceAgentStatusDraft, nil, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			agent := &VoiceAgent{
				Status:    tt.status,
				DeletedAt: tt.deletedAt,
			}
			assert.Equal(t, tt.want, agent.IsActive())
		})
	}
}

func TestVoiceAgent_IsDeleted(t *testing.T) {
	now := time.Now()

	notDeleted := &VoiceAgent{DeletedAt: nil}
	assert.False(t, notDeleted.IsDeleted())

	deleted := &VoiceAgent{DeletedAt: &now}
	assert.True(t, deleted.IsDeleted())
}

func TestVoiceAgent_CanBeActivated(t *testing.T) {
	tests := []struct {
		name   string
		status VoiceAgentStatus
		want   bool
	}{
		{"draft can be activated", VoiceAgentStatusDraft, true},
		{"inactive can be activated", VoiceAgentStatusInactive, true},
		{"active cannot be activated", VoiceAgentStatusActive, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			agent := &VoiceAgent{Status: tt.status}
			assert.Equal(t, tt.want, agent.CanBeActivated())
		})
	}
}

func TestNewVoiceAgent(t *testing.T) {
	name := "Test Agent"
	prompt := "You are a test assistant."

	agent := NewVoiceAgent(name, prompt)

	assert.NotEqual(t, uuid.Nil, agent.ID)
	assert.Equal(t, name, agent.Name)
	assert.Equal(t, prompt, agent.SystemPrompt)
	assert.Equal(t, "wand", agent.Icon)
	assert.Equal(t, "#6366F1", agent.Color)
	assert.Equal(t, 0.7, agent.Temperature)
	assert.Equal(t, 2000, agent.MaxTokens)
	assert.Equal(t, VoiceAgentStatusDraft, agent.Status)
	assert.Equal(t, 0, agent.SortOrder)
	assert.Equal(t, 1, agent.Version)
	assert.False(t, agent.CreatedAt.IsZero())
	assert.False(t, agent.UpdatedAt.IsZero())
}

func TestVoiceAgentFilter_Validate(t *testing.T) {
	tests := []struct {
		name    string
		filter  VoiceAgentFilter
		wantErr string
	}{
		{
			name:    "valid filter passes",
			filter:  VoiceAgentFilter{Page: 1, PageSize: 20},
			wantErr: "",
		},
		{
			name:    "negative page_size fails",
			filter:  VoiceAgentFilter{Page: 1, PageSize: -1},
			wantErr: "page_size must be non-negative",
		},
		{
			name:    "page_size over 100 fails",
			filter:  VoiceAgentFilter{Page: 1, PageSize: 101},
			wantErr: "page_size cannot exceed 100",
		},
		{
			name:    "page less than 1 fails",
			filter:  VoiceAgentFilter{Page: 0, PageSize: 20},
			wantErr: "page must be at least 1",
		},
		{
			name:    "invalid status fails",
			filter:  VoiceAgentFilter{Page: 1, PageSize: 20, Status: statusPtr(VoiceAgentStatus("bad"))},
			wantErr: "invalid status filter",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.filter.Validate()

			if tt.wantErr == "" {
				assert.NoError(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			}
		})
	}
}

func TestVoiceAgentFilter_Offset(t *testing.T) {
	tests := []struct {
		name     string
		page     int
		pageSize int
		want     int
	}{
		{"page 1 returns 0", 1, 20, 0},
		{"page 2 returns pageSize", 2, 20, 20},
		{"page 3 returns 2*pageSize", 3, 10, 20},
		{"page 0 returns 0", 0, 20, 0},
		{"negative page returns 0", -1, 20, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			filter := VoiceAgentFilter{Page: tt.page, PageSize: tt.pageSize}
			assert.Equal(t, tt.want, filter.Offset())
		})
	}
}

func TestVoiceAgentFilter_WithDefaults(t *testing.T) {
	filter := VoiceAgentFilter{}
	filter.WithDefaults()

	assert.Equal(t, 20, filter.PageSize)
	assert.Equal(t, 1, filter.Page)

	// Should not override existing values
	filter2 := VoiceAgentFilter{Page: 5, PageSize: 50}
	filter2.WithDefaults()

	assert.Equal(t, 50, filter2.PageSize)
	assert.Equal(t, 5, filter2.Page)
}

// Helper functions
func timePtr(t time.Time) *time.Time {
	return &t
}

func statusPtr(s VoiceAgentStatus) *VoiceAgentStatus {
	return &s
}
