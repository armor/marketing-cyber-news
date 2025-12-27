# Technical Research: AI-Powered Newsletter Automation System

**Feature Branch**: `004-ai-newsletter-automation`
**Date**: 2025-12-17
**Spec**: [spec.md](./spec.md)

---

## 0. n8n-First Design Philosophy

> **DESIGN PRINCIPLE**: Leverage n8n's 500+ built-in integrations and nodes to minimize custom code. The Go backend should only handle what n8n cannot.

### What n8n Handles Natively (NO CUSTOM CODE NEEDED)

| Capability | n8n Node/Feature | Replaces Custom Code |
|------------|------------------|---------------------|
| **RSS Content Ingestion** | RSS Feed Trigger, RSS Read | Custom feed parser, scheduler |
| **AI Content Generation** | OpenAI Node, OpenRouter Node, Ollama | AIClient interface, generation service |
| **Email Sending** | SendGrid Node, Mailchimp Node, **HubSpot Node** | ESPClient interface, delivery service |
| **Database Operations** | Postgres Node, Postgres Trigger | Many repository operations |
| **Scheduling** | Schedule Trigger, Cron Node | Custom scheduler service |
| **HTTP API Calls** | HTTP Request Node | Custom HTTP client code |
| **A/B Testing Logic** | Code Node + If/Switch Nodes | ABTestService (partial) |
| **Data Transformation** | Code Node, Set Node | Many mapping functions |
| **Webhook Handling** | Webhook Node | ESP event handlers |
| **Content Aggregation** | Merge Node, SplitInBatches | Custom aggregation logic |
| **Error Handling** | Error Trigger, Retry Logic | Custom retry implementation |

### What Custom Code IS Needed For

| Component | Why Custom | Cannot Use n8n Because |
|-----------|------------|----------------------|
| **Admin UI** | User experience | n8n has no customizable UI builder |
| **Brand Voice Validation** | Domain-specific rules | Complex regex + semantic analysis |
| **Analytics Dashboard** | Complex visualizations | n8n cannot render charts/dashboards |
| **Permission/RBAC** | Security-critical | Must integrate with existing auth |
| **ZincSearch Integration** | Semantic search | No native n8n ZincSearch node |

---

## 1. Technical Decisions

### 1.1 Architecture Pattern

**Decision**: n8n-Orchestrated Architecture with Thin Backend

**Rationale**:
- n8n provides visual workflow design for marketing team visibility
- n8n has native integrations that eliminate custom code
- Existing n8n instance already deployed in Kubernetes cluster
- Supports retry logic, error handling, and manual intervention points
- **Cost savings**: Fewer backend services = less code to maintain

**Architecture Layers**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         n8n-CENTRIC NEWSLETTER ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRESENTATION LAYER (Custom Code - Required)                                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                          │
│  │   Admin UI      │  │  Preview UI     │  │  Analytics UI   │                          │
│  │   (React 19)    │  │  (React 19)     │  │  (React 19)     │                          │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                          │
│           │                    │                    │                                   │
│           └────────────────────┴────────────────────┘                                   │
│                                │                                                        │
│  ORCHESTRATION LAYER (n8n Native - Minimal Custom Code)                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              n8n WORKFLOW ENGINE                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │   OpenAI    │  │  SendGrid   │  │  Postgres   │  │ RSS Feed    │              │   │
│  │  │   Node      │  │   Node      │  │   Node      │  │ Trigger     │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │  Webhook    │  │  Schedule   │  │   Merge     │  │   Code      │              │   │
│  │  │   Node      │  │  Trigger    │  │   Node      │  │   Node      │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                │                                                        │
│  API LAYER (Thin - Only for UI + Complex Logic)                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                        Go Backend (Chi v5) - REDUCED SCOPE                        │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                       │   │
│  │  │ Config CRUD    │  │ Brand Voice    │  │ Analytics      │                       │   │
│  │  │ (UI support)   │  │ Validation     │  │ Aggregation    │                       │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘                       │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                │                                                        │
│  DATA LAYER (Shared by n8n + Backend)                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                               │
│  │  PostgreSQL  │    │    Redis     │    │  ZincSearch  │                               │
│  │  (Primary)   │    │  (Cache/Q)   │    │   (Index)    │                               │
│  └──────────────┘    └──────────────┘    └──────────────┘                               │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Backend Service Design (REDUCED SCOPE)

**Decision**: Thin Go backend that complements n8n (not duplicates)

**Pattern**: Clean Architecture with Guard Clauses (no nested if statements)

**Design Principle**: The backend only implements what n8n cannot handle natively.

**Existing Patterns to Follow** (from `aci-backend/internal/service/approval_service.go`):
```go
// Guard clause pattern - validate early, return early
func (s *NewsletterService) ValidateBrandVoice(ctx context.Context, copy string) (*ValidationResult, error) {
    if copy == "" {
        return nil, fmt.Errorf("copy is required")
    }

    // Complex brand voice validation that n8n Code Node cannot easily handle
    result := s.brandVoiceValidator.Validate(copy)
    if !result.IsValid {
        return result, nil
    }

    // Continue with valid data...
}
```

**Service Comparison: Original vs n8n-First**:

| Original Service | n8n-First Approach | Code Reduction |
|-----------------|-------------------|----------------|
| `NewsletterConfigService` | **Keep** - UI needs CRUD APIs | 0% (still needed) |
| `SegmentService` | **Keep** - Complex queries for UI | 0% (still needed) |
| `ContentService` | **REMOVE** - n8n RSS + Postgres nodes | ~80% reduction |
| `NewsletterGenerationService` | **REMOVE** - n8n OpenAI node | ~90% reduction |
| `DeliveryService` | **REMOVE** - n8n SendGrid node | ~95% reduction |
| `AnalyticsService` | **Keep** - Dashboard aggregations | 0% (still needed) |
| `ABTestService` | **REDUCE** - n8n handles assignment | ~60% reduction |
| `BrandVoiceValidator` | **Keep** - Domain-specific logic | 0% (new, needed) |

**Backend Services (FINAL)**:
| Service | Responsibility | Why Backend (Not n8n) |
|---------|----------------|----------------------|
| `NewsletterConfigService` | Configuration CRUD | UI form handling, validation |
| `SegmentService` | Segment management | Complex queries for UI |
| `AnalyticsService` | Metrics aggregation | Dashboard visualizations |
| `BrandVoiceService` | Brand voice validation | Complex rules, semantic analysis |
| `ZincSearchService` | Content search | No native n8n node |

**What n8n Handles Instead**:
- Content ingestion → n8n RSS Feed Trigger
- AI generation → n8n OpenAI Node
- Email sending → n8n SendGrid/Mailchimp Node
- A/B test assignment → n8n Code Node
- Scheduling → n8n Schedule Trigger
- ESP webhooks → n8n Webhook Node

### 1.3 Database Schema Design

**Decision**: Extend PostgreSQL with new tables for newsletter entities

**New Tables**:
1. `newsletter_configurations` - Global and segment-specific settings
2. `segments` - Audience segment definitions
3. `contacts` - Contact profiles with firmographic/behavioral data
4. `content_items` - Ingested content from sources
5. `content_sources` - Feed configurations
6. `newsletter_issues` - Generated newsletter instances
7. `newsletter_blocks` - Content blocks within issues
8. `test_variants` - A/B test configurations
9. `engagement_events` - Click, open, unsubscribe tracking

**Relationship with Existing Tables**:
- `content_items` references existing `articles` table for Armor blog content
- `newsletter_issues` references `users` for approval workflow integration
- Uses existing RBAC roles for permission management

### 1.4 n8n Workflow Integration (DETAILED)

**Decision**: n8n as primary orchestration engine with native nodes

**Design Philosophy**: Use n8n native nodes wherever possible. Call backend API only for complex logic (brand voice validation, ZincSearch queries, analytics aggregation).

---

## n8n Workflow Specifications

### Workflow 1: Content Ingestion (RSS Feed → Database)

**Trigger**: RSS Feed Trigger (polls every 2 hours)
**n8n Nodes Used**: 100% native (no custom code required)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  WORKFLOW: content-ingestion (n8n Native - Zero Custom Code)                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐                                                            │
│  │ RSS Feed        │  ← Polls configured feeds every 2 hours                    │
│  │ Trigger         │     - Armor Blog RSS                                       │
│  │ (n8n native)    │     - Security Week RSS                                    │
│  └────────┬────────┘     - Curated news feeds                                   │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                            │
│  │ Set Node        │  ← Transform RSS item to content_items schema              │
│  │ (n8n native)    │     - Extract: title, link, summary, pubDate              │
│  └────────┬────────┘     - Add: source_id, topic_tags (from feed config)        │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                            │
│  │ Postgres Node   │  ← Check if item already exists (deduplication)            │
│  │ (SELECT query)  │     SELECT id FROM content_items WHERE url = $1            │
│  └────────┬────────┘                                                            │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                            │
│  │ IF Node         │  ← Branch based on existence                               │
│  │ (n8n native)    │                                                            │
│  └────────┬────────┘                                                            │
│     ┌─────┴─────┐                                                               │
│     ▼           ▼                                                               │
│  [New Item]  [Skip]                                                             │
│     │                                                                           │
│     ▼                                                                           │
│  ┌─────────────────┐                                                            │
│  │ Postgres Node   │  ← Insert new content item                                 │
│  │ (INSERT query)  │     INSERT INTO content_items (...)                        │
│  └─────────────────┘                                                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**n8n Nodes**: RSS Feed Trigger, Set, Postgres (x2), IF
**Custom Code**: NONE

---

### Workflow 2: Newsletter Generation (Main Workflow)

**Trigger**: Schedule Trigger (daily at configured time) OR Webhook (manual trigger)
**n8n Nodes Used**: ~90% native, 10% HTTP Request to backend

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  WORKFLOW: newsletter-generation                                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                                     │
│  │ Schedule        │ OR │ Webhook         │  ← Manual trigger from UI           │
│  │ Trigger         │    │ (POST request)  │                                     │
│  └────────┬────────┘    └────────┬────────┘                                     │
│           └──────────────────────┘                                              │
│                     │                                                           │
│                     ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │ Postgres Node: Get active configurations due for send                │        │
│  │ SELECT * FROM newsletter_configurations                              │        │
│  │ WHERE is_active = true AND next_send_date <= NOW()                   │        │
│  └────────────────────────────────┬────────────────────────────────────┘        │
│                                   │                                             │
│                                   ▼                                             │
│  ┌─────────────────┐                                                            │
│  │ SplitInBatches  │  ← Process each configuration                              │
│  │ (n8n native)    │                                                            │
│  └────────┬────────┘                                                            │
│           │                                                                     │
│           ▼                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  PHASE 1: Content Selection (n8n Native - Postgres)                       │   │
│  │  ┌─────────────────┐                                                      │   │
│  │  │ Postgres Node   │  ← Get content matching segment criteria             │   │
│  │  │ (Complex SELECT)│     - topic_tags IN segment.focus_topics             │   │
│  │  │                 │     - publish_date > NOW() - freshness_threshold     │   │
│  │  │                 │     - trust_score >= min_trust_score                 │   │
│  │  └─────────────────┘     - ORDER BY relevance_score DESC LIMIT 10         │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│           │                                                                     │
│           ▼                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  PHASE 2: AI Content Generation (n8n Native - OpenAI Node)                │   │
│  │                                                                           │   │
│  │  ┌─────────────────┐                                                      │   │
│  │  │ OpenAI Node     │  ← Generate subject lines (2-3 variants)             │   │
│  │  │ (GPT-4/3.5)     │     System prompt: Brand voice rules                 │   │
│  │  │                 │     User prompt: Segment + content summary           │   │
│  │  └────────┬────────┘                                                      │   │
│  │           │                                                               │   │
│  │           ▼                                                               │   │
│  │  ┌─────────────────┐                                                      │   │
│  │  │ OpenAI Node     │  ← Generate preheader (60-90 chars)                  │   │
│  │  └────────┬────────┘                                                      │   │
│  │           │                                                               │   │
│  │           ▼                                                               │   │
│  │  ┌─────────────────┐                                                      │   │
│  │  │ OpenAI Node     │  ← Generate personalized intro                       │   │
│  │  └────────┬────────┘                                                      │   │
│  │           │                                                               │   │
│  │           ▼                                                               │   │
│  │  ┌─────────────────┐                                                      │   │
│  │  │ OpenAI Node     │  ← Generate block teasers (30-60 words each)         │   │
│  │  │ (Loop)          │                                                      │   │
│  │  └─────────────────┘                                                      │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│           │                                                                     │
│           ▼                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  PHASE 3: Brand Voice Validation (HTTP Request → Backend)                 │   │
│  │                                                                           │   │
│  │  ┌─────────────────┐                                                      │   │
│  │  │ HTTP Request    │  ← POST /api/v1/newsletter/validate-brand-voice      │   │
│  │  │ (to Go backend) │     Body: { copy: all_generated_text }               │   │
│  │  └────────┬────────┘     Response: { valid: bool, violations: [] }        │   │
│  │           │                                                               │   │
│  │           ▼                                                               │   │
│  │  ┌─────────────────┐                                                      │   │
│  │  │ IF Node         │  ← Branch on validation result                       │   │
│  │  └────────┬────────┘                                                      │   │
│  │     ┌─────┴─────┐                                                         │   │
│  │     ▼           ▼                                                         │   │
│  │  [Valid]    [Invalid → Regenerate (max 2 attempts)]                       │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│           │                                                                     │
│           ▼                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  PHASE 4: A/B Test Assignment (n8n Native - Code Node)                    │   │
│  │                                                                           │   │
│  │  ┌─────────────────┐                                                      │   │
│  │  │ Code Node       │  ← JavaScript: Assign variant to each recipient      │   │
│  │  │ (n8n native)    │     const variant = Math.random() < 0.5 ? 'A' : 'B'; │   │
│  │  └─────────────────┘     return { ...item, assignedVariant: variant };    │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│           │                                                                     │
│           ▼                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  PHASE 5: Save Issue & Route (n8n Native - Postgres + Switch)             │   │
│  │                                                                           │   │
│  │  ┌─────────────────┐                                                      │   │
│  │  │ Postgres Node   │  ← INSERT newsletter issue with status               │   │
│  │  │ (INSERT)        │     - 'pending_approval' for Tier 2                  │   │
│  │  └────────┬────────┘     - 'ready_to_send' for Tier 1                     │   │
│  │           │                                                               │   │
│  │           ▼                                                               │   │
│  │  ┌─────────────────┐                                                      │   │
│  │  │ Switch Node     │  ← Route based on config.risk_level                  │   │
│  │  └────────┬────────┘                                                      │   │
│  │     ┌─────┴─────┐                                                         │   │
│  │     ▼           ▼                                                         │   │
│  │  [Tier 1]   [Tier 2]                                                      │   │
│  │     │           │                                                         │   │
│  │     ▼           ▼                                                         │   │
│  │  [→ Send]   [→ Wait for Approval Webhook]                                 │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**n8n Nodes**: Schedule Trigger, Webhook, Postgres (x3), SplitInBatches, OpenAI (x4), HTTP Request (x1), Code, IF, Switch
**Custom Code**: Only brand voice validation endpoint

---

### Workflow 3: Newsletter Delivery (Tier 1 Auto-Send)

**Trigger**: Executes as sub-workflow from newsletter-generation
**n8n Nodes Used**: 100% native

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  WORKFLOW: newsletter-delivery (n8n Native - Zero Custom Code)                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐                                                            │
│  │ Execute         │  ← Receives issue_id from parent workflow                  │
│  │ Workflow        │                                                            │
│  │ Trigger         │                                                            │
│  └────────┬────────┘                                                            │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                            │
│  │ Postgres Node   │  ← Get segment contacts                                    │
│  │ (SELECT)        │     SELECT * FROM contacts WHERE segment_id = $1           │
│  └────────┬────────┘     AND unsubscribed = false AND suppressed = false        │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                            │
│  │ SplitInBatches  │  ← Process in batches of 100                               │
│  │ (n8n native)    │                                                            │
│  └────────┬────────┘                                                            │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                            │
│  │ Code Node       │  ← Add UTM parameters to all links                         │
│  │ (n8n native)    │     utm_source=newsletter&utm_medium=email                 │
│  └────────┬────────┘     utm_campaign={issue_id}&utm_content={block_id}         │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                            │
│  │ SendGrid Node   │  ← Send personalized email                                 │
│  │ OR              │     - To: contact.email                                    │
│  │ Mailchimp Node  │     - Subject: assigned_variant.subject_line               │
│  │ (n8n native)    │     - HTML: rendered_newsletter_html                       │
│  └────────┬────────┘     - Personalizations: name, company, role                │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                            │
│  │ Postgres Node   │  ← Record send event                                       │
│  │ (INSERT)        │     INSERT INTO engagement_events (type='sent', ...)       │
│  └─────────────────┘                                                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**n8n Nodes**: Execute Workflow Trigger, Postgres (x2), SplitInBatches, Code, SendGrid/Mailchimp
**Custom Code**: NONE

---

### Workflow 3b: Newsletter Delivery - HubSpot (Alternative ESP)

**Trigger**: Executes as sub-workflow from newsletter-generation
**n8n Nodes Used**: 100% native (HubSpot CRM/Marketing Hub integration)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  WORKFLOW: newsletter-delivery-hubspot (n8n Native - Zero Custom Code)          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐                                                            │
│  │ Execute         │  ← Receives issue_id from parent workflow                  │
│  │ Workflow        │                                                            │
│  │ Trigger         │                                                            │
│  └────────┬────────┘                                                            │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                            │
│  │ Postgres Node   │  ← Get newsletter issue details + HTML content             │
│  │ (SELECT)        │     SELECT * FROM newsletter_issues WHERE id = $1          │
│  └────────┬────────┘                                                            │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  PHASE 1: HubSpot Marketing Email Setup (n8n HubSpot Node)          │        │
│  │                                                                     │        │
│  │  ┌─────────────────┐                                                │        │
│  │  │ HubSpot Node    │  ← Create Marketing Email                      │        │
│  │  │ (Create Email)  │     - name: "Newsletter - {issue_date}"        │        │
│  │  │                 │     - subject: subject_line                    │        │
│  │  │                 │     - html_body: rendered_html                 │        │
│  │  └────────┬────────┘     - from_name: "Armor Security"              │        │
│  │           │                                                         │        │
│  │           ▼                                                         │        │
│  │  ┌─────────────────┐                                                │        │
│  │  │ HubSpot Node    │  ← Get contact list from HubSpot               │        │
│  │  │ (Get List)      │     List = segment.hubspot_list_id             │        │
│  │  └────────┬────────┘                                                │        │
│  └───────────┼─────────────────────────────────────────────────────────┘        │
│              │                                                                  │
│              ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐        │
│  │  PHASE 2: Send Campaign (n8n HubSpot Node)                          │        │
│  │                                                                     │        │
│  │  ┌─────────────────┐                                                │        │
│  │  │ HubSpot Node    │  ← Send Marketing Email to List                │        │
│  │  │ (Send Email)    │     - email_id: created_email.id               │        │
│  │  │                 │     - list_id: segment.hubspot_list_id         │        │
│  │  └────────┬────────┘     - send_time: NOW() or scheduled_time       │        │
│  │           │                                                         │        │
│  └───────────┼─────────────────────────────────────────────────────────┘        │
│              │                                                                  │
│              ▼                                                                  │
│  ┌─────────────────┐                                                            │
│  │ Postgres Node   │  ← Record campaign details                                 │
│  │ (UPDATE)        │     UPDATE newsletter_issues                               │
│  └────────┬────────┘     SET hubspot_campaign_id = $1,                          │
│           │                  status = 'sent', sent_at = NOW()                   │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                            │
│  │ Postgres Node   │  ← Record send events (batch)                              │
│  │ (INSERT)        │     INSERT INTO engagement_events (type='sent', ...)       │
│  └─────────────────┘                                                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**n8n HubSpot Node Configuration**:
```json
{
  "node": "HubSpot",
  "operation": "create",
  "resource": "marketingEmail",
  "additionalFields": {
    "name": "{{ $json.newsletter_name }} - {{ $json.issue_date }}",
    "subject": "{{ $json.subject_line }}",
    "htmlBody": "{{ $json.rendered_html }}",
    "fromName": "Armor Security",
    "replyTo": "newsletter@armorsecurity.com"
  }
}
```

**HubSpot vs SendGrid/Mailchimp Comparison**:

| Feature | SendGrid | Mailchimp | HubSpot |
|---------|----------|-----------|---------|
| **n8n Node** | ✅ Native | ✅ Native | ✅ Native |
| **Contact Sync** | Manual | Bidirectional | CRM native |
| **List Management** | Basic | Advanced | CRM integrated |
| **Personalization** | Token-based | Merge fields | CRM properties |
| **Analytics** | Webhook events | Webhook events | API + Webhook |
| **A/B Testing** | Manual | Built-in | Built-in |
| **Best For** | High volume | Marketing teams | CRM-centric orgs |

**When to Use HubSpot**:
- Organization already uses HubSpot CRM
- Need bidirectional contact/engagement sync
- Want CRM activity timeline for each contact
- Prefer HubSpot's marketing automation features

**n8n Nodes**: Execute Workflow Trigger, Postgres (x3), HubSpot (x3)
**Custom Code**: NONE

---

### Workflow 4: ESP Engagement Webhook Handler

**Trigger**: Webhook (receives POST from SendGrid/Mailchimp)
**n8n Nodes Used**: 100% native

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  WORKFLOW: engagement-webhook (n8n Native - Zero Custom Code)                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐                                                            │
│  │ Webhook Node    │  ← POST /webhook/newsletter/engagement                     │
│  │ (n8n native)    │     Receives: { event, email, timestamp, ... }             │
│  └────────┬────────┘                                                            │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                            │
│  │ Switch Node     │  ← Route by event type                                     │
│  └────────┬────────┘                                                            │
│     ┌─────┼─────┬─────┬─────┐                                                   │
│     ▼     ▼     ▼     ▼     ▼                                                   │
│  [open] [click] [bounce] [spam] [unsub]                                         │
│     │     │     │     │     │                                                   │
│     └─────┴─────┴─────┴─────┘                                                   │
│                 │                                                               │
│                 ▼                                                               │
│  ┌─────────────────┐                                                            │
│  │ Postgres Node   │  ← INSERT engagement_event                                 │
│  │ (INSERT)        │     event_type, contact_id, issue_id, timestamp            │
│  └────────┬────────┘     url (for clicks), block_id, topic_tags                 │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                            │
│  │ IF Node         │  ← Check if unsubscribe event                              │
│  └────────┬────────┘                                                            │
│     ┌─────┴─────┐                                                               │
│     ▼           ▼                                                               │
│  [Unsub]    [Other]                                                             │
│     │                                                                           │
│     ▼                                                                           │
│  ┌─────────────────┐                                                            │
│  │ Postgres Node   │  ← UPDATE contacts SET unsubscribed = true                 │
│  │ (UPDATE)        │                                                            │
│  └─────────────────┘                                                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**n8n Nodes**: Webhook, Switch, Postgres (x2), IF
**Custom Code**: NONE

---

### Workflow 5: Approval Handler

**Trigger**: Webhook (receives approval/rejection from UI)
**n8n Nodes Used**: 100% native

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  WORKFLOW: newsletter-approval (n8n Native - Zero Custom Code)                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐                                                            │
│  │ Webhook Node    │  ← POST /webhook/newsletter/approval                       │
│  │ (n8n native)    │     Body: { issue_id, action, reviewer_id, comments }      │
│  └────────┬────────┘                                                            │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                            │
│  │ Switch Node     │  ← Route by action                                         │
│  └────────┬────────┘                                                            │
│     ┌─────┴─────┐                                                               │
│     ▼           ▼                                                               │
│  [approve]  [reject]                                                            │
│     │           │                                                               │
│     ▼           ▼                                                               │
│  ┌──────────┐  ┌──────────┐                                                     │
│  │ Postgres │  │ Postgres │  ← UPDATE status to 'rejected'                      │
│  │ UPDATE   │  │ UPDATE   │     + Store rejection comments                      │
│  │ 'ready'  │  └──────────┘                                                     │
│  └────┬─────┘                                                                   │
│       │                                                                         │
│       ▼                                                                         │
│  ┌─────────────────┐                                                            │
│  │ Execute         │  ← Trigger delivery workflow                               │
│  │ Workflow Node   │     Pass issue_id to newsletter-delivery                   │
│  └─────────────────┘                                                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**n8n Nodes**: Webhook, Switch, Postgres (x2), Execute Workflow
**Custom Code**: NONE

---

### Workflow Summary

| Workflow | Trigger | n8n Native | Custom API Calls | Code Saved |
|----------|---------|------------|------------------|------------|
| content-ingestion | RSS Feed Trigger (2h) | 100% | 0 | ~300 LOC |
| newsletter-generation | Schedule + Webhook | ~90% | 1 (brand voice) | ~800 LOC |
| newsletter-delivery (SendGrid/Mailchimp) | Execute Workflow | 100% | 0 | ~500 LOC |
| **newsletter-delivery-hubspot** | Execute Workflow | 100% | 0 | ~500 LOC |
| engagement-webhook | Webhook | 100% | 0 | ~200 LOC |
| newsletter-approval | Webhook | 100% | 0 | ~150 LOC |
| **TOTAL** | | ~96% | 1 endpoint | **~1950 LOC** |

**ESP Selection**:
- **HubSpot** (PRIMARY): Organization has existing HubSpot CRM account - CRM-integrated, full contact lifecycle
- **Mailchimp** (TESTING): Free tier available for development and testing

**Estimated Code Reduction**: ~1,950 lines of Go code NOT written

---

**Workflows to Create**:
1. `content-ingestion` - RSS feed polling and content import (n8n native)
2. `newsletter-generation` - Main generation workflow (n8n + 1 API call)
3. `newsletter-delivery` - ESP sending via SendGrid/Mailchimp (n8n native)
4. `newsletter-delivery-hubspot` - ESP sending via HubSpot CRM (n8n native) - **ALTERNATIVE to #3**
5. `engagement-webhook` - ESP event receiver (n8n native)
6. `newsletter-approval` - Approval workflow trigger (n8n native)
7. `ai-feedback-loop` - Periodic prompt optimization (TBD - Phase 2)

### 1.5 AI/LLM Integration (n8n Native - OpenAI OR OpenRouter)

**Decision**: Use n8n's native LLM nodes for AI generation (NO custom AIClient)

**Supported LLM Providers** (all via native n8n nodes):

| Provider | n8n Node | Models Available | Use Case |
|----------|----------|-----------------|----------|
| **OpenAI** | OpenAI Chat Model | GPT-4o, GPT-4, GPT-3.5 | General purpose |
| **OpenRouter** | OpenRouter Chat Model | **Meta Llama 3.1 70B/405B**, DeepSeek R1, Claude 3.5, Gemini 2.0, 100+ more | Cost optimization, model diversity |
| **Ollama** | Ollama Chat Model | Local Llama, Mistral, etc. | Self-hosted, privacy |

**Recommended: OpenRouter for Meta Llama 70B**

OpenRouter provides a unified API to access multiple LLM providers, including Meta's Llama 3.1 70B model which offers:
- Strong reasoning capabilities at lower cost than GPT-4
- OpenAI-compatible API (easy swap)
- Dynamic model routing (choose model per task)

**n8n OpenRouter Node Configuration**:
```json
{
  "node": "OpenRouter Chat Model",
  "model": "meta-llama/llama-3.1-70b-instruct",
  "options": {
    "temperature": 0.7,
    "maxTokens": 500,
    "topP": 0.9
  }
}
```

**Alternative: OpenAI Configuration**:
```json
{
  "node": "OpenAI Chat Model",
  "model": "{{ $env.OPENAI_MODEL }}",
  "messages": [
    {
      "role": "system",
      "content": "You are Armor's newsletter copywriter. Follow these brand voice rules:\n1. Use direct second-person language ('you', 'your team')\n2. Open with reader pain point or outcome, never 'we're excited'\n3. Include human stakes (reduce burnout, give time back)\n4. Max 30-60 words per teaser\n5. No absolute guarantees ('100% secure', 'breach-proof')\n6. No fear tactics or shaming language"
    },
    {
      "role": "user",
      "content": "{{ $json.prompt }}"
    }
  ],
  "options": {
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

**Model Selection Strategy**:
| Task | Recommended Model | Rationale |
|------|-------------------|-----------|
| Subject lines | Llama 3.1 70B | Creative, cost-effective |
| Preheaders | Llama 3.1 70B | Short text, fast |
| Long-form intro | GPT-4o or Claude 3.5 | Better coherence |
| Teasers | Llama 3.1 70B | Bulk generation |

**What n8n Handles**:
| Task | n8n Node | Custom Code Needed |
|------|----------|-------------------|
| Subject line generation | OpenRouter/OpenAI Node | NO |
| Preheader generation | OpenRouter/OpenAI Node | NO |
| Intro personalization | OpenRouter/OpenAI Node | NO |
| Teaser writing | OpenRouter/OpenAI Node | NO |
| **Brand voice validation** | HTTP Request → Backend | YES (complex rules) |

**Custom Backend Interface (Brand Voice Only)**:
```go
// Only this interface is needed - all AI generation is in n8n
type BrandVoiceValidator interface {
    Validate(ctx context.Context, copy string) (*ValidationResult, error)
}

type ValidationResult struct {
    IsValid    bool              `json:"is_valid"`
    Violations []VoiceViolation  `json:"violations"`
    Score      float64           `json:"score"` // 0-100
}

type VoiceViolation struct {
    Rule       string `json:"rule"`       // e.g., "no_fear_tactics"
    Snippet    string `json:"snippet"`    // The offending text
    Suggestion string `json:"suggestion"` // How to fix it
}
```

**Brand Voice Validation Rules** (implemented in Go backend):
- Use second-person language ("you", "your team")
- Open with pain point or outcome, not "we're excited"
- Include human stakes (reduce burnout, give time back)
- No absolute guarantees ("100% secure", "breach-proof")
- No fear tactics or shaming
- Max 25 words with >3 specialized terms
- Max 2 metaphors per issue
- No hype metaphors ("rocketship", "crystal ball")

### 1.6 Redis Usage Strategy

**Decision**: Use Redis for caching, job queuing, and real-time state

**Use Cases**:
| Use Case | Key Pattern | TTL | Purpose |
|----------|-------------|-----|---------|
| Content Cache | `content:{id}` | 1h | Reduce DB queries for hot content |
| Segment Cache | `segment:{id}:contacts` | 15m | Cache contact lists |
| Generation Lock | `gen:lock:{config_id}` | 5m | Prevent duplicate generation |
| Rate Limiting | `rate:{contact_id}` | 30d | Enforce frequency caps |
| Session State | `workflow:{execution_id}` | 24h | n8n workflow state |
| Test Assignment | `test:{variant_id}:{contact_id}` | 90d | A/B test consistency |

### 1.7 ZincSearch Integration

**Decision**: Use ZincSearch for content discovery and topic matching

**Index Structure**:
```json
{
  "name": "newsletter_content",
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "title": { "type": "text", "analyzer": "standard" },
      "summary": { "type": "text", "analyzer": "standard" },
      "content": { "type": "text", "analyzer": "standard" },
      "topic_tags": { "type": "keyword" },
      "framework_tags": { "type": "keyword" },
      "industry_tags": { "type": "keyword" },
      "buyer_stage": { "type": "keyword" },
      "publish_date": { "type": "date" },
      "content_type": { "type": "keyword" },
      "trust_score": { "type": "float" },
      "historical_ctr": { "type": "float" }
    }
  }
}
```

**Search Queries**:
- Topic matching: Full-text search on title, summary, content
- Framework filtering: Keyword match on framework_tags
- Freshness filtering: Range query on publish_date
- Relevance scoring: Combine text score with trust_score and historical_ctr

### 1.8 Frontend Architecture

**Decision**: Extend existing React 19 frontend with newsletter admin module

**New Components**:
```
src/
├── components/newsletter/
│   ├── config/
│   │   ├── ConfigurationForm.tsx
│   │   ├── SegmentSelector.tsx
│   │   ├── ContentMixEditor.tsx
│   │   └── BrandVoiceSettings.tsx
│   ├── content/
│   │   ├── ContentSourceList.tsx
│   │   ├── ContentPreview.tsx
│   │   └── ContentSelector.tsx
│   ├── preview/
│   │   ├── NewsletterPreview.tsx
│   │   ├── BlockEditor.tsx
│   │   └── PersonalizationPreview.tsx
│   ├── approval/
│   │   ├── NewsletterApprovalQueue.tsx
│   │   ├── NewsletterReviewCard.tsx
│   │   └── VersionDiff.tsx
│   ├── analytics/
│   │   ├── EngagementDashboard.tsx
│   │   ├── SegmentMetrics.tsx
│   │   ├── ABTestResults.tsx
│   │   └── KPITracker.tsx
│   └── shared/
│       ├── StatusBadge.tsx
│       └── MetricCard.tsx
├── pages/
│   ├── NewsletterConfigPage.tsx
│   ├── NewsletterPreviewPage.tsx
│   ├── NewsletterApprovalPage.tsx
│   └── NewsletterAnalyticsPage.tsx
├── hooks/
│   ├── useNewsletterConfig.ts
│   ├── useContentSources.ts
│   ├── useNewsletterIssues.ts
│   ├── useEngagementMetrics.ts
│   └── useABTests.ts
└── services/api/
    └── newsletter.ts
```

### 1.9 Security Considerations

**Authentication**: Use existing JWT-based auth with role-based access

**New Permission Matrix**:
| Role | Config | Content | Generate | Approve | Send | Analytics |
|------|--------|---------|----------|---------|------|-----------|
| super_admin | CRUD | CRUD | Yes | Yes | Yes | Full |
| admin | CRUD | CRUD | Yes | Yes | Yes | Full |
| marketing | CRUD | Read | Yes | Tier1 | Tier1 | Segment |
| branding | Read | CRUD | No | Tier2 | No | Read |
| user | No | No | No | No | No | No |

**Security Measures**:
- Input validation on all API endpoints
- SQL injection prevention via parameterized queries
- XSS prevention via React's built-in escaping
- CSRF protection via SameSite cookies
- Rate limiting on API endpoints
- Audit logging for all configuration changes

### 1.10 Testing Strategy

**Four-Case Testing Mandate** (per Constitution):

| Test Type | Backend | Frontend |
|-----------|---------|----------|
| Happy Path | `TestGenerateNewsletter_Success` | `renders configuration form` |
| Fail Case | `TestGenerateNewsletter_InvalidConfig` | `displays error on API failure` |
| Null Case | `TestGenerateNewsletter_NilConfigID` | `handles empty segment list` |
| Edge Case | `TestGenerateNewsletter_MaxBlocks` | `enforces max 6 blocks` |

**E2E Test Coverage** (per Constitution Principle XIX):
1. Login flow with marketing manager credentials
2. Navigate to Newsletter Configuration page
3. Create new newsletter configuration
4. Preview generated newsletter
5. Approve and send (Tier 1 flow)
6. View analytics dashboard
7. Verify no console errors

---

## 2. Integration Points

### 2.1 Existing Article Integration

**Decision**: Reference existing `articles` table for Armor content

**Query Pattern**:
```sql
-- Select approved articles for newsletter content pool
SELECT a.id, a.title, a.slug, a.summary, a.published_at,
       array_agg(DISTINCT t.name) as tags
FROM articles a
LEFT JOIN article_tags at ON a.id = at.article_id
LEFT JOIN tags t ON at.tag_id = t.id
WHERE a.approval_status = 'released'
  AND a.is_published = true
  AND a.published_at > NOW() - INTERVAL '45 days'
GROUP BY a.id
ORDER BY a.published_at DESC;
```

### 2.2 Existing User/Role Integration

**Decision**: Extend existing roles for newsletter permissions

**Role Mapping**:
| Existing Role | Newsletter Capability |
|--------------|----------------------|
| `super_admin` | Full access to all newsletter features |
| `admin` | Full access to all newsletter features |
| `marketing` | Configure, generate, approve Tier 1, view analytics |
| `branding` | Review content, approve Tier 2 brand compliance |
| `soc_level_1` | No newsletter access |
| `soc_level_3` | No newsletter access |
| `ciso` | No newsletter access |
| `user` | No newsletter access |

### 2.3 ESP Integration (External)

**Decision**: Abstract ESP integration behind interface

**Interface**:
```go
type ESPClient interface {
    SendNewsletter(ctx context.Context, issue *NewsletterIssue, recipients []Contact) error
    GetDeliveryStatus(ctx context.Context, campaignID string) (*DeliveryStatus, error)
    RegisterWebhook(ctx context.Context, eventType string, url string) error
}
```

**Supported Events**:
- `email.delivered`
- `email.opened`
- `email.clicked`
- `email.bounced`
- `email.complained`
- `email.unsubscribed`

---

## 3. Performance Requirements

### 3.1 Target Metrics

| Operation | Target | Constraint |
|-----------|--------|------------|
| Configuration load | <500ms | p95 |
| Content selection | <2s | For 1000 content items |
| AI generation (full) | <30s | For complete newsletter |
| Newsletter preview | <1s | With personalization |
| Analytics dashboard | <3s | With 90-day data |
| Send execution | <5min | For 10,000 recipients |

### 3.2 Caching Strategy

**Cache Hierarchy**:
1. **Browser**: TanStack Query with 5-min stale time
2. **Redis**: Hot data with TTL-based expiration
3. **PostgreSQL**: Indexed queries with materialized views for analytics

### 3.3 Database Optimization

**Indexes Required**:
```sql
-- Content selection
CREATE INDEX idx_content_items_publish_date ON content_items(publish_date DESC);
CREATE INDEX idx_content_items_topic_tags ON content_items USING GIN(topic_tags);

-- Engagement queries
CREATE INDEX idx_engagement_events_contact ON engagement_events(contact_id, created_at DESC);
CREATE INDEX idx_engagement_events_issue ON engagement_events(newsletter_issue_id);

-- Segment filtering
CREATE INDEX idx_contacts_segment ON contacts(segment_id);
CREATE INDEX idx_contacts_industry ON contacts(industry);
```

---

## 4. Parallel Work Distribution

### 4.1 Backend Workstreams

**Stream A** (Domain/Repository):
- Newsletter domain types
- Content domain types
- Segment domain types
- PostgreSQL repositories

**Stream B** (Services):
- Configuration service
- Content service
- Generation service
- Analytics service

**Stream C** (API Layer):
- Newsletter handlers
- Content handlers
- Segment handlers
- Analytics handlers

### 4.2 Frontend Workstreams

**Stream D** (Types/API):
- TypeScript types
- API service layer
- TanStack Query hooks

**Stream E** (Configuration UI):
- Configuration form components
- Segment selector
- Content mix editor

**Stream F** (Preview/Approval UI):
- Newsletter preview
- Approval queue
- Version diff

**Stream G** (Analytics UI):
- Dashboard components
- Metric cards
- Chart visualizations

### 4.3 Infrastructure Workstreams

**Stream H** (n8n):
- Generation workflow
- Ingestion workflow
- Engagement sync workflow

### 4.4 Parallel Execution Plan

```
Phase 1: Infrastructure
├── Wave 1.1 [Parallel]
│   ├── [A1] Database migrations
│   ├── [H1] n8n workflow scaffolds
│   └── [D1] TypeScript types

Phase 2: Foundation
├── Wave 2.1 [Parallel]
│   ├── [A2] Domain types (newsletter.go, content.go, segment.go)
│   ├── [A3] Repository interfaces
│   └── [D2] API service layer
├── Wave 2.2 [Parallel]
│   ├── [A4] PostgreSQL repositories
│   └── [D3] TanStack Query hooks

Phase 3: Core Services
├── Wave 3.1 [Parallel]
│   ├── [B1] Configuration service
│   ├── [B2] Segment service
│   └── [B3] Content service
├── Wave 3.2 [Sequential]
│   └── [B4] Generation service (depends on 3.1)
├── Wave 3.3 [Parallel]
│   ├── [B5] Delivery service
│   └── [B6] Analytics service

Phase 4: API Layer
├── Wave 4.1 [Parallel]
│   ├── [C1] Newsletter configuration handlers
│   ├── [C2] Content source handlers
│   └── [C3] Segment handlers
├── Wave 4.2 [Parallel]
│   ├── [C4] Newsletter generation handlers
│   ├── [C5] Newsletter approval handlers
│   └── [C6] Analytics handlers

Phase 5: Frontend UI
├── Wave 5.1 [Parallel]
│   ├── [E1] Configuration form
│   ├── [E2] Segment selector
│   └── [E3] Content mix editor
├── Wave 5.2 [Parallel]
│   ├── [F1] Newsletter preview
│   ├── [F2] Approval queue
│   └── [F3] Version diff
├── Wave 5.3 [Parallel]
│   ├── [G1] Dashboard layout
│   ├── [G2] Engagement metrics
│   └── [G3] A/B test results
├── Wave 5.4 [Sequential]
│   └── Page integration (depends on 5.1-5.3)

Phase 6: n8n Workflows
├── Wave 6.1 [Parallel]
│   ├── [H2] Generation workflow implementation
│   ├── [H3] Content ingestion workflow
│   └── [H4] Engagement sync workflow
├── Wave 6.2 [Sequential]
│   └── [H5] AI feedback loop workflow

Phase 7: Testing & Polish
├── Wave 7.1 [Parallel]
│   ├── Backend unit tests (4-case)
│   ├── Frontend component tests
│   └── Contract tests
├── Wave 7.2 [Parallel]
│   ├── Integration tests
│   └── E2E tests (Playwright)
├── Wave 7.3 [Sequential]
│   └── Security audit
```

---

## 5. Risk Mitigations

| Risk | Impact | Mitigation | Owner |
|------|--------|------------|-------|
| AI generates off-brand copy | Brand damage | Multi-layer validation, fallback templates, Tier 2 review | B4 |
| Content gaps for segments | Poor relevance | Content gap alerts, broader fallback | B3 |
| n8n workflow failures | Newsletter delays | Retry logic, monitoring, manual override | H2 |
| ESP deliverability issues | Reduced reach | DMARC/SPF/DKIM, list hygiene | B5 |
| ZincSearch index stale | Wrong content | Scheduled reindex, freshness check | A4 |
| Redis cache invalidation | Stale data | TTL-based expiration, explicit invalidation | A4 |

---

## 6. Learning System Integration

Per user requirement, the system should integrate with the `/j` learning system:

**Learning Points**:
1. **AI Generation Failures**: Log prompt, output, and validation result for prompt improvement
2. **Brand Voice Violations**: Track which rules are violated most often
3. **A/B Test Winners**: Feed winning patterns back into prompt guidance
4. **Engagement Correlations**: Learn which content attributes drive engagement

**Integration Pattern**:
```go
type LearningClient interface {
    RecordGenerationAttempt(ctx context.Context, req GenerationAttempt) error
    RecordValidationFailure(ctx context.Context, violation BrandVoiceViolation) error
    RecordTestResult(ctx context.Context, result ABTestResult) error
    RecordEngagementSignal(ctx context.Context, signal EngagementSignal) error
}
```

---

## 7. Technology Summary

| Component | Technology | Version | Notes |
|-----------|------------|---------|-------|
| Backend Language | Go | 1.22+ | Existing |
| Backend Router | Chi | v5 | Existing |
| Frontend Framework | React | 19.2 | Existing |
| State Management | TanStack Query | v5 | Existing |
| UI Components | shadcn/ui | Latest | Existing |
| Database | PostgreSQL | 14+ | Existing |
| Cache/Queue | Redis | 7+ | Existing |
| Search | ZincSearch | Latest | Existing |
| Workflow | n8n | Latest | Existing |
| Testing (Go) | testify | Latest | Existing |
| Testing (TS) | Vitest | Latest | Existing |
| E2E Testing | Playwright | Latest | Existing |
| AI/LLM | Configurable | - | New integration |
| ESP | Configurable | - | External integration |
