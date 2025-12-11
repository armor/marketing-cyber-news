# ACI n8n Integration Specification

## Overview

The ACI backend integrates with n8n (v2.0.0+) for workflow automation. n8n handles content scraping, AI enrichment scheduling, and notification workflows. Communication is bidirectional:

> **Note**: n8n 2.0.0 (December 2025) introduces task runners enabled by default, which means Code node executions run in isolated environments. Environment variable access is blocked from Code nodes by default for security.

1. **n8n → ACI**: Webhooks push content and enrichment results
2. **ACI → n8n**: API triggers initiate workflows

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           n8n Workflows                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Scraper   │  │  Enrichment │  │   Digest    │  │   Alert     │    │
│  │  Workflows  │  │  Workflows  │  │  Workflows  │  │  Workflows  │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│         ▼                ▼                ▼                ▼            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Webhook HTTP Request                          │   │
│  │                 POST /v1/webhooks/n8n                            │   │
│  │                 X-N8N-Signature: sha256=...                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           ACI Backend                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Webhook   │  │   Article   │  │   Alert     │  │  WebSocket  │    │
│  │   Handler   │→→│   Service   │→→│   Service   │→→│    Hub      │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│         │                                                    │          │
│         ▼                                                    ▼          │
│  ┌─────────────┐                                    ┌─────────────┐    │
│  │  PostgreSQL │                                    │   Clients   │    │
│  └─────────────┘                                    └─────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Webhook Endpoint

### URL
```
POST /v1/webhooks/n8n
```

### Authentication

All webhooks are authenticated using HMAC-SHA256 signatures.

**Header**: `X-N8N-Signature`
**Format**: `sha256=<hex-encoded-signature>`

#### Signature Computation (n8n side)

```javascript
// n8n Code node to compute signature
const crypto = require('crypto');

const payload = JSON.stringify($input.first().json);
const secret = process.env.N8N_WEBHOOK_SECRET;

const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

return [{
  json: {
    ...JSON.parse(payload),
    computed_signature: `sha256=${signature}`
  }
}];
```

#### Signature Verification (ACI side)

```go
func verifyWebhookSignature(body []byte, signature, secret string) error {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(body)
    expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))

    if !hmac.Equal([]byte(expected), []byte(signature)) {
        return ErrInvalidSignature
    }
    return nil
}
```

## Event Types

### article.created

New article from scraper workflow.

```json
{
  "event_type": "article.created",
  "data": {
    "title": "Critical VMware vCenter Server Vulnerability Under Active Exploitation",
    "content": "<p>Security researchers have discovered a critical vulnerability...</p>",
    "summary": "A critical RCE vulnerability (CVE-2024-12345) in VMware vCenter Server is being actively exploited in the wild.",
    "category_slug": "vulnerabilities",
    "severity": "critical",
    "tags": ["vmware", "vcenter", "rce", "exploitation", "critical"],
    "source_url": "https://www.cisa.gov/news-events/alerts/2024/01/15/vmware-vcenter-vulnerability",
    "source_name": "CISA",
    "published_at": "2024-01-15T10:00:00Z",
    "cves": ["CVE-2024-12345"],
    "vendors": ["VMware"],
    "skip_enrichment": false
  },
  "metadata": {
    "workflow_id": "scraper-cisa",
    "execution_id": "exec_abc123",
    "timestamp": "2024-01-15T10:05:00Z"
  }
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Article title (max 500 chars) |
| `content` | string | Full content (HTML or markdown) |
| `category_slug` | string | Must match existing category |
| `source_url` | string | Original source URL |

#### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `summary` | string | AI-generated | Brief summary |
| `severity` | string | "medium" | critical/high/medium/low/informational |
| `tags` | string[] | [] | Content tags |
| `source_name` | string | Derived from URL | Source name |
| `published_at` | string | Now | ISO 8601 timestamp |
| `cves` | string[] | [] | Related CVE IDs |
| `vendors` | string[] | [] | Affected vendors |
| `skip_enrichment` | boolean | false | Skip AI enrichment |

### article.updated

Update existing article.

```json
{
  "event_type": "article.updated",
  "data": {
    "id": "789e0123-e89b-12d3-a456-426614174001",
    "severity": "critical",
    "cves": ["CVE-2024-12345", "CVE-2024-12346"],
    "vendors": ["VMware", "Broadcom"]
  },
  "metadata": {
    "workflow_id": "enrichment-update",
    "execution_id": "exec_def456",
    "timestamp": "2024-01-15T11:00:00Z"
  }
}
```

**Note**: Only the `id` field is required. All other fields are optional and only update if provided.

### article.deleted

Remove article (soft delete).

```json
{
  "event_type": "article.deleted",
  "data": {
    "id": "789e0123-e89b-12d3-a456-426614174001",
    "reason": "duplicate"
  },
  "metadata": {
    "workflow_id": "cleanup",
    "execution_id": "exec_ghi789",
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

### bulk.import

Import multiple articles at once.

```json
{
  "event_type": "bulk.import",
  "data": {
    "articles": [
      {
        "title": "Article 1",
        "content": "...",
        "category_slug": "vulnerabilities",
        "source_url": "https://example.com/1"
      },
      {
        "title": "Article 2",
        "content": "...",
        "category_slug": "ransomware",
        "source_url": "https://example.com/2"
      }
    ]
  },
  "metadata": {
    "workflow_id": "bulk-scraper",
    "execution_id": "exec_jkl012",
    "timestamp": "2024-01-15T13:00:00Z"
  }
}
```

**Limits**:
- Maximum 100 articles per request
- Processed asynchronously
- Duplicates (by source_url) are skipped

### enrichment.complete

AI enrichment results from enrichment workflow.

```json
{
  "event_type": "enrichment.complete",
  "data": {
    "article_id": "789e0123-e89b-12d3-a456-426614174001",
    "enrichment": {
      "threat_type": "vulnerability",
      "attack_vector": "Network-based remote code execution",
      "impact_assessment": "Critical - Allows unauthenticated attackers to execute arbitrary code with root privileges",
      "recommended_actions": [
        "Apply VMware patch VMSA-2024-0001 immediately",
        "Restrict network access to vCenter Server",
        "Monitor for indicators of compromise",
        "Enable enhanced logging"
      ],
      "threat_actors": [],
      "iocs": [
        {
          "type": "ip",
          "value": "192.168.1.100",
          "context": "Known scanner IP"
        }
      ],
      "confidence_score": 0.95
    }
  },
  "metadata": {
    "workflow_id": "ai-enrichment",
    "execution_id": "exec_mno345",
    "timestamp": "2024-01-15T10:10:00Z"
  }
}
```

## Response Format

### Success (202 Accepted)

```json
{
  "accepted": true,
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Webhook accepted for processing",
  "articles_queued": 1
}
```

### Error (400 Bad Request)

```json
{
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "Missing required field: title",
    "details": {
      "field": "data.title",
      "reason": "required"
    }
  }
}
```

### Error (401 Unauthorized)

```json
{
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "HMAC signature validation failed"
  }
}
```

## Workflow Triggering

The ACI backend can trigger n8n workflows via the API.

### Endpoint

```
POST /v1/webhooks/n8n/trigger/{workflow}
```

### Available Workflows

| Workflow ID | Description |
|-------------|-------------|
| `scrape-all` | Run all scrapers |
| `scrape-cisa` | Scrape CISA alerts |
| `scrape-nvd` | Scrape NVD/CVE database |
| `enrich-pending` | Enrich pending articles |
| `generate-digest` | Generate daily/weekly digest |

### Request

```json
POST /v1/webhooks/n8n/trigger/scrape-cisa

{
  "options": {
    "max_articles": 50,
    "since_date": "2024-01-14T00:00:00Z"
  }
}
```

### Response

```json
{
  "triggered": true,
  "workflow": "scrape-cisa",
  "execution_id": "exec_pqr678",
  "message": "Workflow triggered successfully"
}
```

## n8n Workflow Templates

### Scraper Workflow

```json
{
  "name": "ACI - CISA Scraper",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{ "field": "hours", "hoursInterval": 1 }]
        }
      }
    },
    {
      "name": "Fetch CISA Alerts",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
        "method": "GET"
      }
    },
    {
      "name": "Transform to ACI Format",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Transform CISA data to ACI article format\nreturn items.map(item => ({\n  json: {\n    title: item.json.vulnerabilityName,\n    content: item.json.shortDescription,\n    category_slug: 'vulnerabilities',\n    severity: 'high',\n    source_url: `https://nvd.nist.gov/vuln/detail/${item.json.cveID}`,\n    source_name: 'CISA KEV',\n    cves: [item.json.cveID],\n    vendors: [item.json.vendorProject]\n  }\n}));"
      }
    },
    {
      "name": "Compute Signature",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const crypto = require('crypto');\nconst secret = process.env.N8N_WEBHOOK_SECRET;\n\nreturn items.map(item => {\n  const payload = JSON.stringify({\n    event_type: 'article.created',\n    data: item.json,\n    metadata: {\n      workflow_id: 'scraper-cisa',\n      execution_id: $execution.id,\n      timestamp: new Date().toISOString()\n    }\n  });\n  \n  const signature = 'sha256=' + crypto\n    .createHmac('sha256', secret)\n    .update(payload)\n    .digest('hex');\n  \n  return {\n    json: {\n      payload: JSON.parse(payload),\n      signature\n    }\n  };\n});"
      }
    },
    {
      "name": "Send to ACI",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{ $env.ACI_API_URL }}/v1/webhooks/n8n",
        "method": "POST",
        "headers": {
          "Content-Type": "application/json",
          "X-N8N-Signature": "={{ $json.signature }}"
        },
        "body": "={{ JSON.stringify($json.payload) }}"
      }
    }
  ]
}
```

### Enrichment Workflow

```json
{
  "name": "ACI - AI Enrichment",
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "enrich-article",
        "method": "POST"
      }
    },
    {
      "name": "Call Claude API",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.anthropic.com/v1/messages",
        "method": "POST",
        "headers": {
          "Content-Type": "application/json",
          "x-api-key": "={{ $env.ANTHROPIC_API_KEY }}",
          "anthropic-version": "2023-06-01"
        },
        "body": "={{ JSON.stringify({\n  model: 'claude-3-haiku-20240307',\n  max_tokens: 1024,\n  messages: [{\n    role: 'user',\n    content: `Analyze this cybersecurity article and provide:\n1. Threat type (malware/ransomware/phishing/vulnerability/data_breach/apt/ddos/insider_threat/supply_chain/other)\n2. Attack vector\n3. Impact assessment\n4. Recommended actions (list)\n5. Any indicators of compromise (IOCs)\n6. Confidence score (0-1)\n\nArticle:\n${$json.body.content}\n\nRespond in JSON format.`\n  }]\n}) }}"
      }
    },
    {
      "name": "Parse Claude Response",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const response = JSON.parse(items[0].json.content[0].text);\nreturn [{\n  json: {\n    article_id: $('Webhook Trigger').first().json.body.article_id,\n    enrichment: response\n  }\n}];"
      }
    },
    {
      "name": "Send Enrichment to ACI",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{ $env.ACI_API_URL }}/v1/webhooks/n8n",
        "method": "POST",
        "headers": {
          "Content-Type": "application/json",
          "X-N8N-Signature": "={{ $json.signature }}"
        },
        "body": "={{ JSON.stringify({\n  event_type: 'enrichment.complete',\n  data: $json,\n  metadata: {\n    workflow_id: 'ai-enrichment',\n    execution_id: $execution.id,\n    timestamp: new Date().toISOString()\n  }\n}) }}"
      }
    }
  ]
}
```

## Processing Flow

### Article Creation Flow

```
n8n                                ACI Backend                          Database
 |                                     |                                    |
 |--- POST /webhooks/n8n ------------> |                                    |
 |    event_type: article.created      |                                    |
 |                                     |                                    |
 |                                     |--- Verify HMAC signature           |
 |                                     |                                    |
 |                                     |--- Validate payload                |
 |                                     |                                    |
 |                                     |--- Check for duplicate             |
 |                                     |    (by source_url)                 |
 |                                     |                                    |
 |                                     |--- Generate slug                   |
 |                                     |                                    |
 |                                     |--- INSERT article --------------> |
 |                                     |                                    |
 |                                     |--- Log webhook -----------------> |
 |                                     |                                    |
 |                                     |--- Queue AI enrichment             |
 |                                     |    (if skip_enrichment=false)      |
 |                                     |                                    |
 |                                     |--- Check alert subscriptions       |
 |                                     |                                    |
 |                                     |--- Broadcast to WebSocket hub      |
 |                                     |                                    |
 |<------------ 202 Accepted --------- |                                    |
 |                                     |                                    |
```

### Enrichment Flow

```
ACI Backend                          n8n                              Claude API
 |                                     |                                    |
 |--- Trigger enrichment workflow ---> |                                    |
 |    {article_id, content}            |                                    |
 |                                     |                                    |
 |                                     |--- POST /v1/messages ------------> |
 |                                     |    (Claude analysis prompt)        |
 |                                     |                                    |
 |                                     |<------------ Analysis result ----- |
 |                                     |                                    |
 |<--- POST /webhooks/n8n ------------ |                                    |
 |    event_type: enrichment.complete  |                                    |
 |    {article_id, enrichment}         |                                    |
 |                                     |                                    |
 |--- Update article with enrichment   |                                    |
 |                                     |                                    |
 |--- Recalculate armor_relevance      |                                    |
 |                                     |                                    |
 |--- Broadcast update to WebSocket    |                                    |
 |                                     |                                    |
```

## Content Filtering

### Competitor Detection

The ACI backend filters content that favors competitors. This is done during article processing:

```go
// Competitor keywords to detect
var competitorKeywords = []string{
    "crowdstrike falcon",
    "palo alto prisma",
    "sentinelone",
    "microsoft defender",
    "carbon black",
    // etc.
}

// Check content for competitor promotion
func calculateCompetitorScore(content string) float64 {
    content = strings.ToLower(content)
    score := 0.0

    for _, keyword := range competitorKeywords {
        if strings.Contains(content, keyword) {
            // Check if it's promotional or just news
            if isPromotional(content, keyword) {
                score += 0.3
            } else {
                score += 0.1
            }
        }
    }

    return math.Min(score, 1.0)
}

// Filter decision
func shouldPublish(article *Article) bool {
    // Block if competitor_score > 0.5
    if article.CompetitorScore > 0.5 {
        return false
    }
    // Block if explicitly competitor-favorable
    if article.IsCompetitorFavorable {
        return false
    }
    return true
}
```

### Armor.com Relevance

Calculate how relevant an article is for promoting Armor.com services:

```go
var armorServiceKeywords = map[string]float64{
    "managed detection":     0.3,
    "mdr":                   0.3,
    "cloud security":        0.2,
    "compliance":            0.2,
    "vulnerability management": 0.2,
    "incident response":     0.2,
    "threat intelligence":   0.2,
    "soc":                   0.2,
}

func calculateArmorRelevance(article *Article) float64 {
    content := strings.ToLower(article.Content + " " + article.Summary)
    score := 0.0

    for keyword, weight := range armorServiceKeywords {
        if strings.Contains(content, keyword) {
            score += weight
        }
    }

    // Boost for severity
    switch article.Severity {
    case "critical":
        score += 0.2
    case "high":
        score += 0.1
    }

    return math.Min(score, 1.0)
}
```

## Error Handling

### Retry Strategy

n8n should implement exponential backoff for webhook failures:

```javascript
// n8n retry configuration
{
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 5000 // 5 seconds initial
}
```

### Dead Letter Queue

Failed webhooks are logged for manual review:

```sql
-- Query failed webhooks
SELECT * FROM webhook_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 100;
```

### Idempotency

The ACI backend handles duplicate webhooks gracefully:

- Articles are deduplicated by `source_url`
- Enrichment updates are idempotent (last-write-wins)
- Webhook logs track `execution_id` for debugging

## Environment Variables

### ACI Backend

```bash
# n8n webhook secret (shared with n8n)
N8N_WEBHOOK_SECRET=your-32-char-minimum-secret-key

# n8n API URL (for triggering workflows)
N8N_API_URL=http://n8n:5678/api/v1

# n8n API key (for workflow triggers)
N8N_API_KEY=your-n8n-api-key
```

### n8n

```bash
# ACI backend URL
ACI_API_URL=http://aci-backend:8080

# Shared webhook secret
N8N_WEBHOOK_SECRET=your-32-char-minimum-secret-key

# Anthropic API key (for enrichment)
ANTHROPIC_API_KEY=sk-ant-...
```

## Monitoring

### Webhook Metrics

Track these metrics for monitoring:

| Metric | Description |
|--------|-------------|
| `aci_webhooks_received_total` | Total webhooks received by event type |
| `aci_webhooks_processed_total` | Successfully processed webhooks |
| `aci_webhooks_failed_total` | Failed webhooks by error type |
| `aci_webhook_processing_duration` | Processing time histogram |
| `aci_articles_created_total` | Articles created via webhooks |

### Health Check

```bash
# Check n8n connectivity
curl http://aci-backend:8080/v1/health/ready

# Response includes n8n status
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "n8n": "ok"
  }
}
```
