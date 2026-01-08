package llm

import (
	"context"
	"strings"
	"testing"
)

func TestMockClient_GenerateContent(t *testing.T) {
	mock := NewMockClient()

	tests := []struct {
		name          string
		prompt        string
		systemContext string
		wantErr       bool
		wantContains  string
	}{
		{
			name:          "valid prompt returns mock content",
			prompt:        "Write a blog post about cybersecurity",
			systemContext: "Professional tone",
			wantErr:       false,
			wantContains:  "Mock generated content",
		},
		{
			name:          "empty prompt returns error",
			prompt:        "",
			systemContext: "",
			wantErr:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			content, err := mock.GenerateContent(ctx, tt.prompt, tt.systemContext)

			if (err != nil) != tt.wantErr {
				t.Errorf("GenerateContent() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr && tt.wantContains != "" {
				if !strings.Contains(content, tt.wantContains) {
					t.Errorf("GenerateContent() content = %v, want to contain %v", content, tt.wantContains)
				}
			}
		})
	}
}

func TestMockClient_RefineContent(t *testing.T) {
	mock := NewMockClient()

	tests := []struct {
		name            string
		originalContent string
		action          string
		wantErr         bool
		wantContains    string
	}{
		{
			name:            "valid refinement returns mock refined content",
			originalContent: "This is the original content",
			action:          "shorter",
			wantErr:         false,
			wantContains:    "Mock Refined",
		},
		{
			name:            "empty original content returns error",
			originalContent: "",
			action:          "shorter",
			wantErr:         true,
		},
		{
			name:            "empty action returns error",
			originalContent: "Some content",
			action:          "",
			wantErr:         true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			content, err := mock.RefineContent(ctx, tt.originalContent, tt.action)

			if (err != nil) != tt.wantErr {
				t.Errorf("RefineContent() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr && tt.wantContains != "" {
				if !strings.Contains(content, tt.wantContains) {
					t.Errorf("RefineContent() content = %v, want to contain %v", content, tt.wantContains)
				}
			}
		})
	}
}

func TestMockClient_WithCustomFunctions(t *testing.T) {
	mock := NewMockClient()

	customGenerated := "Custom generated content"
	customRefined := "Custom refined content"

	mock.WithGenerateContentFunc(func(ctx context.Context, prompt string, systemContext string) (string, error) {
		return customGenerated, nil
	})

	mock.WithRefineContentFunc(func(ctx context.Context, originalContent string, action string) (string, error) {
		return customRefined, nil
	})

	ctx := context.Background()

	// Test custom generate function
	content, err := mock.GenerateContent(ctx, "test prompt", "test context")
	if err != nil {
		t.Errorf("GenerateContent() unexpected error: %v", err)
	}
	if content != customGenerated {
		t.Errorf("GenerateContent() = %v, want %v", content, customGenerated)
	}

	// Test custom refine function
	refined, err := mock.RefineContent(ctx, "original", "action")
	if err != nil {
		t.Errorf("RefineContent() unexpected error: %v", err)
	}
	if refined != customRefined {
		t.Errorf("RefineContent() = %v, want %v", refined, customRefined)
	}
}
