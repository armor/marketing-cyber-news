package n8n

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Config holds n8n client configuration
type Config struct {
	BaseURL        string
	APIKey         string
	WebhookBaseURL string
	Timeout        time.Duration
}

// Client provides n8n API operations
type Client struct {
	config     Config
	httpClient *http.Client
}

// Workflow represents an n8n workflow
type Workflow struct {
	ID          string                   `json:"id,omitempty"`
	Name        string                   `json:"name"`
	Active      bool                     `json:"active"`
	Nodes       []map[string]interface{} `json:"nodes"`
	Connections map[string]interface{}   `json:"connections"`
	Settings    map[string]interface{}   `json:"settings,omitempty"`
	Tags        []string                 `json:"tags,omitempty"`
}

// Credential represents an n8n credential
type Credential struct {
	ID   string                 `json:"id,omitempty"`
	Name string                 `json:"name"`
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

// Execution represents a workflow execution
type Execution struct {
	ID        string                 `json:"id"`
	Status    string                 `json:"status"`
	StartedAt time.Time              `json:"startedAt"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

// NewClient creates a new n8n client
func NewClient(config Config) *Client {
	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}

	return &Client{
		config: config,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

// CreateWorkflow creates a new workflow
func (c *Client) CreateWorkflow(ctx context.Context, workflow *Workflow) (*Workflow, error) {
	if workflow == nil {
		return nil, fmt.Errorf("workflow cannot be nil")
	}

	if workflow.Name == "" {
		return nil, fmt.Errorf("workflow name is required")
	}

	body, err := json.Marshal(workflow)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal workflow: %w", err)
	}

	resp, err := c.doRequest(ctx, "POST", "/workflows", body)
	if err != nil {
		return nil, fmt.Errorf("failed to create workflow: %w", err)
	}

	var created Workflow
	if err := json.Unmarshal(resp, &created); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &created, nil
}

// GetWorkflow retrieves a workflow by ID
func (c *Client) GetWorkflow(ctx context.Context, id string) (*Workflow, error) {
	if id == "" {
		return nil, fmt.Errorf("workflow ID is required")
	}

	resp, err := c.doRequest(ctx, "GET", fmt.Sprintf("/workflows/%s", id), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get workflow %s: %w", id, err)
	}

	var workflow Workflow
	if err := json.Unmarshal(resp, &workflow); err != nil {
		return nil, fmt.Errorf("failed to unmarshal workflow: %w", err)
	}

	return &workflow, nil
}

// UpdateWorkflow updates an existing workflow
func (c *Client) UpdateWorkflow(ctx context.Context, workflow *Workflow) (*Workflow, error) {
	if workflow == nil {
		return nil, fmt.Errorf("workflow cannot be nil")
	}

	if workflow.ID == "" {
		return nil, fmt.Errorf("workflow ID is required")
	}

	body, err := json.Marshal(workflow)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal workflow: %w", err)
	}

	resp, err := c.doRequest(ctx, "PUT", fmt.Sprintf("/workflows/%s", workflow.ID), body)
	if err != nil {
		return nil, fmt.Errorf("failed to update workflow %s: %w", workflow.ID, err)
	}

	var updated Workflow
	if err := json.Unmarshal(resp, &updated); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &updated, nil
}

// DeleteWorkflow deletes a workflow
func (c *Client) DeleteWorkflow(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("workflow ID is required")
	}

	_, err := c.doRequest(ctx, "DELETE", fmt.Sprintf("/workflows/%s", id), nil)
	if err != nil {
		return fmt.Errorf("failed to delete workflow %s: %w", id, err)
	}

	return nil
}

// ActivateWorkflow activates a workflow
func (c *Client) ActivateWorkflow(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("workflow ID is required")
	}

	payload := map[string]interface{}{"active": true}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	_, err = c.doRequest(ctx, "PATCH", fmt.Sprintf("/workflows/%s", id), body)
	if err != nil {
		return fmt.Errorf("failed to activate workflow %s: %w", id, err)
	}

	return nil
}

// DeactivateWorkflow deactivates a workflow
func (c *Client) DeactivateWorkflow(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("workflow ID is required")
	}

	payload := map[string]interface{}{"active": false}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	_, err = c.doRequest(ctx, "PATCH", fmt.Sprintf("/workflows/%s", id), body)
	if err != nil {
		return fmt.Errorf("failed to deactivate workflow %s: %w", id, err)
	}

	return nil
}

// ExecuteWorkflow executes a workflow with provided data
func (c *Client) ExecuteWorkflow(ctx context.Context, id string, data map[string]interface{}) (*Execution, error) {
	if id == "" {
		return nil, fmt.Errorf("workflow ID is required")
	}

	body, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal execution data: %w", err)
	}

	resp, err := c.doRequest(ctx, "POST", fmt.Sprintf("/workflows/%s/execute", id), body)
	if err != nil {
		return nil, fmt.Errorf("failed to execute workflow %s: %w", id, err)
	}

	var execution Execution
	if err := json.Unmarshal(resp, &execution); err != nil {
		return nil, fmt.Errorf("failed to unmarshal execution: %w", err)
	}

	return &execution, nil
}

// CreateCredential creates a new credential
func (c *Client) CreateCredential(ctx context.Context, cred *Credential) (*Credential, error) {
	if cred == nil {
		return nil, fmt.Errorf("credential cannot be nil")
	}

	if cred.Name == "" {
		return nil, fmt.Errorf("credential name is required")
	}

	if cred.Type == "" {
		return nil, fmt.Errorf("credential type is required")
	}

	body, err := json.Marshal(cred)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal credential: %w", err)
	}

	resp, err := c.doRequest(ctx, "POST", "/credentials", body)
	if err != nil {
		return nil, fmt.Errorf("failed to create credential: %w", err)
	}

	var created Credential
	if err := json.Unmarshal(resp, &created); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &created, nil
}

// UpdateCredential updates an existing credential
func (c *Client) UpdateCredential(ctx context.Context, cred *Credential) (*Credential, error) {
	if cred == nil {
		return nil, fmt.Errorf("credential cannot be nil")
	}

	if cred.ID == "" {
		return nil, fmt.Errorf("credential ID is required")
	}

	body, err := json.Marshal(cred)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal credential: %w", err)
	}

	resp, err := c.doRequest(ctx, "PUT", fmt.Sprintf("/credentials/%s", cred.ID), body)
	if err != nil {
		return nil, fmt.Errorf("failed to update credential %s: %w", cred.ID, err)
	}

	var updated Credential
	if err := json.Unmarshal(resp, &updated); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &updated, nil
}

// DeleteCredential deletes a credential
func (c *Client) DeleteCredential(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("credential ID is required")
	}

	_, err := c.doRequest(ctx, "DELETE", fmt.Sprintf("/credentials/%s", id), nil)
	if err != nil {
		return fmt.Errorf("failed to delete credential %s: %w", id, err)
	}

	return nil
}

// doRequest performs an HTTP request to the n8n API
func (c *Client) doRequest(ctx context.Context, method, path string, body []byte) ([]byte, error) {
	if c.config.BaseURL == "" {
		return nil, fmt.Errorf("n8n base URL is required")
	}

	url := c.config.BaseURL + path

	var reqBody io.Reader
	if body != nil {
		reqBody = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if c.config.APIKey != "" {
		req.Header.Set("X-N8N-API-KEY", c.config.APIKey)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("n8n API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}
