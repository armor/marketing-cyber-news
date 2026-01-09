package n8n

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

// WorkflowFactory creates parameterized workflows from templates
type WorkflowFactory struct {
	client N8nClient
}

// CampaignWorkflowParams for workflow creation
type CampaignWorkflowParams struct {
	TenantID      string
	CampaignID    string
	CampaignName  string
	Channels      []string
	Frequency     string
	CredentialIDs map[string]string
	WebhookSecret string
}

// NewWorkflowFactory creates a new factory
func NewWorkflowFactory(client N8nClient) *WorkflowFactory {
	return &WorkflowFactory{
		client: client,
	}
}

// CreateCampaignWorkflows creates all workflows for a campaign
func (f *WorkflowFactory) CreateCampaignWorkflows(ctx context.Context, params CampaignWorkflowParams) ([]string, error) {
	if err := params.Validate(); err != nil {
		return nil, fmt.Errorf("invalid campaign params: %w", err)
	}

	var workflowIDs []string

	// Create content pipeline workflow
	contentWorkflow, err := f.BuildContentPipeline(params)
	if err != nil {
		return nil, fmt.Errorf("failed to build content pipeline: %w", err)
	}

	created, err := f.client.CreateWorkflow(ctx, contentWorkflow)
	if err != nil {
		return nil, fmt.Errorf("failed to create content pipeline workflow: %w", err)
	}

	workflowIDs = append(workflowIDs, created.ID)

	// Create publisher workflow for each channel
	for _, channel := range params.Channels {
		publisherWorkflow, err := f.BuildChannelPublisher(channel, params)
		if err != nil {
			return nil, fmt.Errorf("failed to build %s publisher: %w", channel, err)
		}

		created, err := f.client.CreateWorkflow(ctx, publisherWorkflow)
		if err != nil {
			return nil, fmt.Errorf("failed to create %s publisher workflow: %w", channel, err)
		}

		workflowIDs = append(workflowIDs, created.ID)
	}

	return workflowIDs, nil
}

// BuildContentPipeline creates a content generation workflow
func (f *WorkflowFactory) BuildContentPipeline(params CampaignWorkflowParams) (*Workflow, error) {
	if params.CampaignName == "" {
		return nil, fmt.Errorf("campaign name is required")
	}

	if params.TenantID == "" {
		return nil, fmt.Errorf("tenant ID is required")
	}

	cronExpr := FrequencyToCron(params.Frequency)

	nodes := []map[string]interface{}{
		// Cron trigger node
		{
			"id":       uuid.New().String(),
			"name":     "Schedule",
			"type":     "n8n-nodes-base.cron",
			"position": []int{250, 300},
			"parameters": map[string]interface{}{
				"triggerTimes": map[string]interface{}{
					"item": []map[string]interface{}{
						{
							"mode":           "custom",
							"cronExpression": cronExpr,
						},
					},
				},
			},
		},
		// HTTP Request to backend API for content generation
		{
			"id":       uuid.New().String(),
			"name":     "Generate Content",
			"type":     "n8n-nodes-base.httpRequest",
			"position": []int{450, 300},
			"parameters": map[string]interface{}{
				"method":          "POST",
				"url":             fmt.Sprintf("{{$env.BACKEND_URL}}/api/campaigns/%s/generate", params.CampaignID),
				"authentication":  "genericCredentialType",
				"genericAuthType": "httpHeaderAuth",
				"options": map[string]interface{}{
					"headers": map[string]interface{}{
						"entries": []map[string]interface{}{
							{
								"name":  "X-Tenant-ID",
								"value": params.TenantID,
							},
						},
					},
				},
			},
		},
		// Webhook callback for approval
		{
			"id":       uuid.New().String(),
			"name":     "Approval Webhook",
			"type":     "n8n-nodes-base.webhook",
			"position": []int{650, 300},
			"parameters": map[string]interface{}{
				"path":         fmt.Sprintf("approve/%s", params.CampaignID),
				"responseMode": "onReceived",
				"options": map[string]interface{}{
					"rawBody": false,
				},
			},
		},
		// Function node to process approval
		{
			"id":       uuid.New().String(),
			"name":     "Process Approval",
			"type":     "n8n-nodes-base.function",
			"position": []int{850, 300},
			"parameters": map[string]interface{}{
				"functionCode": `
const approved = items[0].json.approved;
const contentId = items[0].json.contentId;

if (!approved) {
  return [];
}

return items.map(item => ({
  json: {
    contentId: contentId,
    tenantId: '` + params.TenantID + `',
    campaignId: '` + params.CampaignID + `'
  }
}));
				`,
			},
		},
		// Trigger channel publishers
		{
			"id":       uuid.New().String(),
			"name":     "Trigger Publishers",
			"type":     "n8n-nodes-base.httpRequest",
			"position": []int{1050, 300},
			"parameters": map[string]interface{}{
				"method":          "POST",
				"url":             fmt.Sprintf("{{$env.BACKEND_URL}}/api/campaigns/%s/publish", params.CampaignID),
				"authentication":  "genericCredentialType",
				"genericAuthType": "httpHeaderAuth",
				"options": map[string]interface{}{
					"headers": map[string]interface{}{
						"entries": []map[string]interface{}{
							{
								"name":  "X-Tenant-ID",
								"value": params.TenantID,
							},
						},
					},
				},
			},
		},
	}

	connections := map[string]interface{}{
		"Schedule": map[string]interface{}{
			"main": [][]map[string]interface{}{
				{
					{
						"node":  "Generate Content",
						"type":  "main",
						"index": 0,
					},
				},
			},
		},
		"Generate Content": map[string]interface{}{
			"main": [][]map[string]interface{}{
				{
					{
						"node":  "Approval Webhook",
						"type":  "main",
						"index": 0,
					},
				},
			},
		},
		"Approval Webhook": map[string]interface{}{
			"main": [][]map[string]interface{}{
				{
					{
						"node":  "Process Approval",
						"type":  "main",
						"index": 0,
					},
				},
			},
		},
		"Process Approval": map[string]interface{}{
			"main": [][]map[string]interface{}{
				{
					{
						"node":  "Trigger Publishers",
						"type":  "main",
						"index": 0,
					},
				},
			},
		},
	}

	workflow := &Workflow{
		Name:        fmt.Sprintf("%s - Content Pipeline", params.CampaignName),
		Active:      false,
		Nodes:       nodes,
		Connections: connections,
		Settings: map[string]interface{}{
			"executionOrder": "v1",
		},
		Tags: []string{
			fmt.Sprintf("tenant:%s", params.TenantID),
			fmt.Sprintf("campaign:%s", params.CampaignID),
			"content-pipeline",
		},
	}

	return workflow, nil
}

// BuildChannelPublisher creates a publishing workflow for a channel
func (f *WorkflowFactory) BuildChannelPublisher(channel string, params CampaignWorkflowParams) (*Workflow, error) {
	if channel == "" {
		return nil, fmt.Errorf("channel is required")
	}

	if params.CampaignName == "" {
		return nil, fmt.Errorf("campaign name is required")
	}

	credentialID, ok := params.CredentialIDs[channel]
	if !ok {
		return nil, fmt.Errorf("credential ID not found for channel: %s", channel)
	}

	var publishNode map[string]interface{}

	switch channel {
	case "linkedin":
		publishNode = buildLinkedInNode(credentialID)
	case "twitter":
		publishNode = buildTwitterNode(credentialID)
	case "facebook":
		publishNode = buildFacebookNode(credentialID)
	case "instagram":
		publishNode = buildInstagramNode(credentialID)
	default:
		return nil, fmt.Errorf("unsupported channel: %s", channel)
	}

	nodes := []map[string]interface{}{
		// Webhook trigger
		{
			"id":       uuid.New().String(),
			"name":     "Publish Trigger",
			"type":     "n8n-nodes-base.webhook",
			"position": []int{250, 300},
			"parameters": map[string]interface{}{
				"path":         fmt.Sprintf("publish/%s/%s", params.CampaignID, channel),
				"responseMode": "onReceived",
				"options": map[string]interface{}{
					"rawBody": false,
				},
			},
		},
		// Fetch content from backend
		{
			"id":       uuid.New().String(),
			"name":     "Fetch Content",
			"type":     "n8n-nodes-base.httpRequest",
			"position": []int{450, 300},
			"parameters": map[string]interface{}{
				"method":          "GET",
				"url":             fmt.Sprintf("{{$env.BACKEND_URL}}/api/content/{{$json.contentId}}"),
				"authentication":  "genericCredentialType",
				"genericAuthType": "httpHeaderAuth",
				"options": map[string]interface{}{
					"headers": map[string]interface{}{
						"entries": []map[string]interface{}{
							{
								"name":  "X-Tenant-ID",
								"value": params.TenantID,
							},
						},
					},
				},
			},
		},
		// Publish to channel
		publishNode,
		// Report success
		{
			"id":       uuid.New().String(),
			"name":     "Report Success",
			"type":     "n8n-nodes-base.httpRequest",
			"position": []int{850, 300},
			"parameters": map[string]interface{}{
				"method":          "POST",
				"url":             fmt.Sprintf("{{$env.BACKEND_URL}}/api/content/{{$json.contentId}}/published"),
				"authentication":  "genericCredentialType",
				"genericAuthType": "httpHeaderAuth",
				"options": map[string]interface{}{
					"headers": map[string]interface{}{
						"entries": []map[string]interface{}{
							{
								"name":  "X-Tenant-ID",
								"value": params.TenantID,
							},
						},
					},
					"body": map[string]interface{}{
						"bodyParametersJson": fmt.Sprintf(`{"channel": "%s", "publishedAt": "{{$now}}"}`, channel),
					},
				},
			},
		},
	}

	connections := map[string]interface{}{
		"Publish Trigger": map[string]interface{}{
			"main": [][]map[string]interface{}{
				{
					{
						"node":  "Fetch Content",
						"type":  "main",
						"index": 0,
					},
				},
			},
		},
		"Fetch Content": map[string]interface{}{
			"main": [][]map[string]interface{}{
				{
					{
						"node":  fmt.Sprintf("Publish to %s", strings.Title(channel)),
						"type":  "main",
						"index": 0,
					},
				},
			},
		},
		fmt.Sprintf("Publish to %s", strings.Title(channel)): map[string]interface{}{
			"main": [][]map[string]interface{}{
				{
					{
						"node":  "Report Success",
						"type":  "main",
						"index": 0,
					},
				},
			},
		},
	}

	workflow := &Workflow{
		Name:        fmt.Sprintf("%s - %s Publisher", params.CampaignName, strings.Title(channel)),
		Active:      false,
		Nodes:       nodes,
		Connections: connections,
		Settings: map[string]interface{}{
			"executionOrder": "v1",
		},
		Tags: []string{
			fmt.Sprintf("tenant:%s", params.TenantID),
			fmt.Sprintf("campaign:%s", params.CampaignID),
			fmt.Sprintf("channel:%s", channel),
			"publisher",
		},
	}

	return workflow, nil
}

// FrequencyToCron converts frequency to cron expression
func FrequencyToCron(freq string) string {
	cronMap := map[string]string{
		"daily":     "0 9 * * *",     // 9 AM daily
		"3x_week":   "0 9 * * 1,3,5", // 9 AM Mon, Wed, Fri
		"weekly":    "0 9 * * 1",     // 9 AM Monday
		"bi_weekly": "0 9 */14 * *",  // 9 AM every 14 days
		"monthly":   "0 9 1 * *",     // 9 AM first day of month
	}

	if cron, ok := cronMap[freq]; ok {
		return cron
	}

	// Default to daily
	return "0 9 * * *"
}

// Validate validates campaign workflow params
func (p *CampaignWorkflowParams) Validate() error {
	if p.TenantID == "" {
		return fmt.Errorf("tenant ID is required")
	}

	if p.CampaignID == "" {
		return fmt.Errorf("campaign ID is required")
	}

	if p.CampaignName == "" {
		return fmt.Errorf("campaign name is required")
	}

	if len(p.Channels) == 0 {
		return fmt.Errorf("at least one channel is required")
	}

	if p.Frequency == "" {
		return fmt.Errorf("frequency is required")
	}

	if len(p.CredentialIDs) == 0 {
		return fmt.Errorf("credential IDs are required")
	}

	for _, channel := range p.Channels {
		if _, ok := p.CredentialIDs[channel]; !ok {
			return fmt.Errorf("credential ID missing for channel: %s", channel)
		}
	}

	return nil
}

// buildLinkedInNode creates a LinkedIn publishing node
func buildLinkedInNode(credentialID string) map[string]interface{} {
	return map[string]interface{}{
		"id":       uuid.New().String(),
		"name":     "Publish to LinkedIn",
		"type":     "n8n-nodes-base.linkedIn",
		"position": []int{650, 300},
		"credentials": map[string]interface{}{
			"linkedInOAuth2Api": map[string]interface{}{
				"id":   credentialID,
				"name": "LinkedIn account",
			},
		},
		"parameters": map[string]interface{}{
			"operation": "post",
			"text":      "={{$json.content}}",
			"options": map[string]interface{}{
				"visibility": "PUBLIC",
			},
		},
	}
}

// buildTwitterNode creates a Twitter publishing node
func buildTwitterNode(credentialID string) map[string]interface{} {
	return map[string]interface{}{
		"id":       uuid.New().String(),
		"name":     "Publish to Twitter",
		"type":     "n8n-nodes-base.twitter",
		"position": []int{650, 300},
		"credentials": map[string]interface{}{
			"twitterOAuth2Api": map[string]interface{}{
				"id":   credentialID,
				"name": "Twitter account",
			},
		},
		"parameters": map[string]interface{}{
			"operation": "tweet",
			"text":      "={{$json.content}}",
		},
	}
}

// buildFacebookNode creates a Facebook publishing node
func buildFacebookNode(credentialID string) map[string]interface{} {
	return map[string]interface{}{
		"id":       uuid.New().String(),
		"name":     "Publish to Facebook",
		"type":     "n8n-nodes-base.facebook",
		"position": []int{650, 300},
		"credentials": map[string]interface{}{
			"facebookGraphApi": map[string]interface{}{
				"id":   credentialID,
				"name": "Facebook account",
			},
		},
		"parameters": map[string]interface{}{
			"operation": "post",
			"message":   "={{$json.content}}",
		},
	}
}

// buildInstagramNode creates an Instagram publishing node
func buildInstagramNode(credentialID string) map[string]interface{} {
	return map[string]interface{}{
		"id":       uuid.New().String(),
		"name":     "Publish to Instagram",
		"type":     "n8n-nodes-base.instagram",
		"position": []int{650, 300},
		"credentials": map[string]interface{}{
			"instagramGraphApi": map[string]interface{}{
				"id":   credentialID,
				"name": "Instagram account",
			},
		},
		"parameters": map[string]interface{}{
			"operation": "post",
			"caption":   "={{$json.content}}",
			"imageUrl":  "={{$json.imageUrl}}",
		},
	}
}
