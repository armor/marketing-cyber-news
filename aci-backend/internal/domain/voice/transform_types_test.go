package voice

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTransformRequest_Validate(t *testing.T) {
	validRequest := func() *TransformRequest {
		return &TransformRequest{
			AgentID:    uuid.New(),
			Text:       "This is a sample text that needs to be transformed into a different voice.",
			NumOptions: 3,
		}
	}

	tests := []struct {
		name    string
		modify  func(*TransformRequest)
		wantErr string
	}{
		{
			name:    "valid request passes",
			modify:  func(r *TransformRequest) {},
			wantErr: "",
		},
		{
			name:    "nil agent_id fails",
			modify:  func(r *TransformRequest) { r.AgentID = uuid.Nil },
			wantErr: "agent_id is required",
		},
		{
			name:    "empty text fails",
			modify:  func(r *TransformRequest) { r.Text = "" },
			wantErr: "text is required",
		},
		{
			name:    "whitespace only text fails",
			modify:  func(r *TransformRequest) { r.Text = "   " },
			wantErr: "text is required",
		},
		{
			name:    "text too short fails",
			modify:  func(r *TransformRequest) { r.Text = "short" },
			wantErr: "text must be at least 10 characters",
		},
		{
			name:    "text exactly 10 chars passes",
			modify:  func(r *TransformRequest) { r.Text = "1234567890" },
			wantErr: "",
		},
		{
			name:    "text too long fails",
			modify:  func(r *TransformRequest) { r.Text = string(make([]byte, 10001)) },
			wantErr: "text must not exceed 10000 characters",
		},
		{
			name:    "num_options negative fails",
			modify:  func(r *TransformRequest) { r.NumOptions = -1 },
			wantErr: "num_options must be between 1 and 5",
		},
		{
			name:    "num_options too high fails",
			modify:  func(r *TransformRequest) { r.NumOptions = 6 },
			wantErr: "num_options must be between 1 and 5",
		},
		{
			name:    "num_options at 0 passes (uses default)",
			modify:  func(r *TransformRequest) { r.NumOptions = 0 },
			wantErr: "",
		},
		{
			name:    "num_options at 5 passes",
			modify:  func(r *TransformRequest) { r.NumOptions = 5 },
			wantErr: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := validRequest()
			tt.modify(request)

			err := request.Validate()

			if tt.wantErr == "" {
				assert.NoError(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			}
		})
	}
}

func TestTransformRequest_WithDefaults(t *testing.T) {
	request := &TransformRequest{
		AgentID: uuid.New(),
		Text:    "Sample text",
	}

	request.WithDefaults()

	assert.Equal(t, DefaultNumOptions, request.NumOptions)

	// Should not override existing value
	request2 := &TransformRequest{
		AgentID:    uuid.New(),
		Text:       "Sample text",
		NumOptions: 5,
	}

	request2.WithDefaults()

	assert.Equal(t, 5, request2.NumOptions)
}

func TestTransformOptionLabel_String(t *testing.T) {
	assert.Equal(t, "conservative", TransformOptionConservative.String())
	assert.Equal(t, "moderate", TransformOptionModerate.String())
	assert.Equal(t, "bold", TransformOptionBold.String())
}

func TestTransformOptionLabel_DisplayLabel(t *testing.T) {
	assert.Equal(t, "Conservative", TransformOptionConservative.DisplayLabel())
	assert.Equal(t, "Moderate", TransformOptionModerate.DisplayLabel())
	assert.Equal(t, "Bold", TransformOptionBold.DisplayLabel())
	assert.Equal(t, "custom", TransformOptionLabel("custom").DisplayLabel())
}

func TestDefaultTransformOptions(t *testing.T) {
	options := DefaultTransformOptions()

	require.Len(t, options, 3)

	assert.Equal(t, TransformOptionConservative, options[0].Label)
	assert.Equal(t, 0.3, options[0].Temperature)

	assert.Equal(t, TransformOptionModerate, options[1].Label)
	assert.Equal(t, 0.5, options[1].Temperature)

	assert.Equal(t, TransformOptionBold, options[2].Label)
	assert.Equal(t, 0.7, options[2].Temperature)
}

func TestSelectTransformRequest_Validate(t *testing.T) {
	validRequest := func() *SelectTransformRequest {
		return &SelectTransformRequest{
			RequestID:           uuid.New(),
			TransformationIndex: 1,
		}
	}

	tests := []struct {
		name    string
		modify  func(*SelectTransformRequest)
		wantErr string
	}{
		{
			name:    "valid request passes",
			modify:  func(r *SelectTransformRequest) {},
			wantErr: "",
		},
		{
			name:    "nil request_id fails",
			modify:  func(r *SelectTransformRequest) { r.RequestID = uuid.Nil },
			wantErr: "request_id is required",
		},
		{
			name:    "transformation_index below 0 fails",
			modify:  func(r *SelectTransformRequest) { r.TransformationIndex = -1 },
			wantErr: "transformation_index must be between 0 and 4",
		},
		{
			name:    "transformation_index above 4 fails",
			modify:  func(r *SelectTransformRequest) { r.TransformationIndex = 5 },
			wantErr: "transformation_index must be between 0 and 4",
		},
		{
			name:    "transformation_index at 0 passes",
			modify:  func(r *SelectTransformRequest) { r.TransformationIndex = 0 },
			wantErr: "",
		},
		{
			name:    "transformation_index at 4 passes",
			modify:  func(r *SelectTransformRequest) { r.TransformationIndex = 4 },
			wantErr: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := validRequest()
			tt.modify(request)

			err := request.Validate()

			if tt.wantErr == "" {
				assert.NoError(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			}
		})
	}
}

func TestConstants(t *testing.T) {
	// Verify constants match data model spec
	assert.Equal(t, 3, DefaultNumOptions)
	assert.Equal(t, 5, MaxNumOptions)
	assert.Equal(t, 10, MinInputLength)
	assert.Equal(t, 10000, MaxInputLength)
}
