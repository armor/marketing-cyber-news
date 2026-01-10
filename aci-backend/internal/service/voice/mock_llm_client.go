package voice

import (
	"context"
	"time"

	"github.com/stretchr/testify/mock"
)

// MockLLMClient is a mock implementation of LLMClient for testing
type MockLLMClient struct {
	mock.Mock
}

// Ensure MockLLMClient implements LLMClient
var _ LLMClient = (*MockLLMClient)(nil)

// Transform mocks the LLM transformation
func (m *MockLLMClient) Transform(ctx context.Context, request *LLMTransformRequest) (*LLMTransformResponse, error) {
	args := m.Called(ctx, request)

	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*LLMTransformResponse), args.Error(1)
}

// HealthCheck mocks the health check
func (m *MockLLMClient) HealthCheck(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

// Helper methods for common test scenarios

// NewMockLLMClient creates a new mock client
func NewMockLLMClient() *MockLLMClient {
	return &MockLLMClient{}
}

// SetupSuccessfulTransform configures the mock to return a successful transformation
func (m *MockLLMClient) SetupSuccessfulTransform(transformedText string) *mock.Call {
	return m.On("Transform", mock.Anything, mock.Anything).Return(&LLMTransformResponse{
		TransformedText:  transformedText,
		TokensUsed:       100,
		PromptTokens:     50,
		CompletionTokens: 50,
		Latency:          100 * time.Millisecond,
		Model:            "anthropic/claude-3-haiku-20240307",
		FinishReason:     "stop",
	}, nil)
}

// SetupSuccessfulTransformWithTokens configures the mock with specific token counts
func (m *MockLLMClient) SetupSuccessfulTransformWithTokens(transformedText string, promptTokens, completionTokens int) *mock.Call {
	return m.On("Transform", mock.Anything, mock.Anything).Return(&LLMTransformResponse{
		TransformedText:  transformedText,
		TokensUsed:       promptTokens + completionTokens,
		PromptTokens:     promptTokens,
		CompletionTokens: completionTokens,
		Latency:          150 * time.Millisecond,
		Model:            "anthropic/claude-3-haiku-20240307",
		FinishReason:     "stop",
	}, nil)
}

// SetupTransformError configures the mock to return an error
func (m *MockLLMClient) SetupTransformError(err error) *mock.Call {
	return m.On("Transform", mock.Anything, mock.Anything).Return(nil, err)
}

// SetupHealthCheckSuccess configures a successful health check
func (m *MockLLMClient) SetupHealthCheckSuccess() *mock.Call {
	return m.On("HealthCheck", mock.Anything).Return(nil)
}

// SetupHealthCheckError configures a failed health check
func (m *MockLLMClient) SetupHealthCheckError(err error) *mock.Call {
	return m.On("HealthCheck", mock.Anything).Return(err)
}

// SetupTransformSequence configures multiple sequential transform responses
func (m *MockLLMClient) SetupTransformSequence(responses []*LLMTransformResponse, errs []error) {
	for i, resp := range responses {
		var err error
		if i < len(errs) {
			err = errs[i]
		}
		m.On("Transform", mock.Anything, mock.Anything).Return(resp, err).Once()
	}
}

// SetupSlowTransform configures the mock to simulate slow LLM response
func (m *MockLLMClient) SetupSlowTransform(transformedText string, delay time.Duration) *mock.Call {
	return m.On("Transform", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
		time.Sleep(delay)
	}).Return(&LLMTransformResponse{
		TransformedText:  transformedText,
		TokensUsed:       100,
		PromptTokens:     50,
		CompletionTokens: 50,
		Latency:          delay,
		Model:            "anthropic/claude-3-haiku-20240307",
		FinishReason:     "stop",
	}, nil)
}

// SetupRateLimitedTransform configures the mock to simulate rate limiting
func (m *MockLLMClient) SetupRateLimitedTransform() *mock.Call {
	return m.On("Transform", mock.Anything, mock.Anything).Return(nil, ErrLLMRateLimited)
}

// SetupTimeoutTransform configures the mock to simulate a timeout
func (m *MockLLMClient) SetupTimeoutTransform() *mock.Call {
	return m.On("Transform", mock.Anything, mock.Anything).Return(nil, ErrLLMTimeout)
}

// SetupContentFilteredTransform configures the mock to simulate content being filtered
func (m *MockLLMClient) SetupContentFilteredTransform() *mock.Call {
	return m.On("Transform", mock.Anything, mock.Anything).Return(nil, ErrLLMContentFiltered)
}

// StubLLMClient is a simpler stub for basic testing that doesn't require mock assertions
type StubLLMClient struct {
	TransformFunc    func(ctx context.Context, request *LLMTransformRequest) (*LLMTransformResponse, error)
	HealthCheckFunc  func(ctx context.Context) error
	TransformCalls   int
	HealthCheckCalls int
}

// Ensure StubLLMClient implements LLMClient
var _ LLMClient = (*StubLLMClient)(nil)

// NewStubLLMClient creates a new stub client with default successful behavior
func NewStubLLMClient() *StubLLMClient {
	return &StubLLMClient{
		TransformFunc: func(ctx context.Context, request *LLMTransformRequest) (*LLMTransformResponse, error) {
			return &LLMTransformResponse{
				TransformedText:  "Transformed: " + request.UserMessage,
				TokensUsed:       100,
				PromptTokens:     50,
				CompletionTokens: 50,
				Latency:          100 * time.Millisecond,
				Model:            "anthropic/claude-3-haiku-20240307",
				FinishReason:     "stop",
			}, nil
		},
		HealthCheckFunc: func(ctx context.Context) error {
			return nil
		},
	}
}

// Transform implements the LLMClient interface
func (s *StubLLMClient) Transform(ctx context.Context, request *LLMTransformRequest) (*LLMTransformResponse, error) {
	s.TransformCalls++
	if s.TransformFunc != nil {
		return s.TransformFunc(ctx, request)
	}
	return nil, nil
}

// HealthCheck implements the LLMClient interface
func (s *StubLLMClient) HealthCheck(ctx context.Context) error {
	s.HealthCheckCalls++
	if s.HealthCheckFunc != nil {
		return s.HealthCheckFunc(ctx)
	}
	return nil
}
