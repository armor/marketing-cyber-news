# Features Documentation

> Complete feature reference for Armor Newsletter

---

## Table of Contents

1. [Threat Intelligence](#threat-intelligence)
2. [Article Approval Workflow](#article-approval-workflow)
3. [AI Newsletter Automation](#ai-newsletter-automation)
4. [Marketing Autopilot](#marketing-autopilot)
5. [Authentication & Authorization](#authentication--authorization)
6. [Real-time Notifications](#real-time-notifications)

---

## Threat Intelligence

**Spec:** 001-aci-backend, 002-nexus-frontend

### Overview
Automated aggregation and analysis of cybersecurity threats from multiple sources.

### Capabilities

| Feature | Description |
|---------|-------------|
| **Source Aggregation** | RSS feeds, CISA alerts, security blogs |
| **AI Enrichment** | Claude-powered threat analysis and summaries |
| **Deep Dives** | Detailed threat breakdown with impact analysis |
| **Search** | Full-text search across all threat data |
| **Filtering** | By severity, category, date, source |
| **Bookmarks** | Save threats for later reference |
| **Read History** | Track which threats have been viewed |

### API Endpoints

```
GET  /v1/threats                    # List all threats
GET  /v1/threats/:id                # Get threat by ID
GET  /v1/threats/:id/deep-dive      # Get AI deep dive analysis
POST /v1/threats/:id/bookmark       # Bookmark a threat
DELETE /v1/threats/:id/bookmark     # Remove bookmark
POST /v1/threats/:id/read           # Mark as read
GET  /v1/threats/search?q=          # Search threats
```

### UI Components

- **Dashboard** - Summary cards, severity distribution, recent threats
- **Threat List** - Filterable table with pagination
- **Threat Detail** - Full content with deep dive panel
- **Bookmarks Page** - Saved threats
- **History Page** - Read history

---

## Article Approval Workflow

**Spec:** 003-article-approval-workflow

### Overview
Multi-stage human-in-the-loop approval process for content before publication.

### Workflow States

```
DRAFT → PENDING_APPROVAL → APPROVED → RELEASED
                        ↘ REJECTED
```

| State | Description | Who Can Transition |
|-------|-------------|-------------------|
| `draft` | Initial creation | Author |
| `pending_approval` | Submitted for review | Author → Approver |
| `approved` | Approved, not yet public | Approver |
| `rejected` | Sent back with comments | Approver |
| `released` | Published to audience | Release Manager |

### Role Permissions

| Role | Submit | Approve | Reject | Release |
|------|--------|---------|--------|---------|
| `viewer` | No | No | No | No |
| `author` | Yes | No | No | No |
| `approver` | Yes | Yes | Yes | No |
| `release_manager` | Yes | Yes | Yes | Yes |
| `admin` | Yes | Yes | Yes | Yes |

### API Endpoints

```
GET  /v1/approvals                  # List pending approvals
GET  /v1/approvals/:id              # Get approval details
POST /v1/articles/:id/submit        # Submit for approval
POST /v1/articles/:id/approve       # Approve article
POST /v1/articles/:id/reject        # Reject with comment
POST /v1/articles/:id/release       # Release to audience
GET  /v1/articles/:id/history       # Approval history
```

### UI Components

- **Approval Queue** - List of items pending review
- **Approval Card** - Summary with action buttons
- **Approval Progress** - Visual state indicator
- **History Modal** - Timeline of all approval actions

---

## AI Newsletter Automation

**Spec:** 004-ai-newsletter-automation

### Overview
End-to-end newsletter creation using AI content generation, human review, and automated delivery.

### Workflow

```
1. Configure Newsletter → Define audience, segments, schedule
2. Ingest Content → RSS feeds polled automatically
3. Generate Issue → AI creates newsletter from content
4. Review & Edit → Human reviews, makes edits
5. Approve → Approval workflow gate
6. Deliver → n8n sends via email channels
7. Track Engagement → Opens, clicks, conversions
```

### Newsletter Configuration

| Setting | Description |
|---------|-------------|
| **Name** | Newsletter identifier |
| **Description** | Purpose and audience |
| **Schedule** | Cron expression for automation |
| **Segments** | Audience groups for targeting |
| **Brand Voice** | AI personality guidelines |
| **Content Sources** | RSS feeds to aggregate |

### Content Generation

| Feature | Description |
|---------|-------------|
| **AI Summaries** | Claude generates article summaries |
| **Subject Lines** | Multiple AI-generated options with scoring |
| **Brand Voice** | Content validated against brand guidelines |
| **Personalization** | Segment-specific content variations |

### API Endpoints

```
# Configuration
GET  /v1/newsletters                     # List configs
POST /v1/newsletters                     # Create config
PUT  /v1/newsletters/:id                 # Update config
DELETE /v1/newsletters/:id               # Delete config

# Content Sources
GET  /v1/newsletters/:id/sources         # List sources
POST /v1/newsletters/:id/sources         # Add source
DELETE /v1/newsletters/:id/sources/:sid  # Remove source

# Issues
GET  /v1/newsletters/:id/issues          # List issues
POST /v1/newsletters/:id/issues          # Generate issue
GET  /v1/newsletters/:id/issues/:iid     # Get issue
PUT  /v1/newsletters/:id/issues/:iid     # Update issue
POST /v1/newsletters/:id/issues/:iid/send # Send issue

# Engagement
GET  /v1/newsletters/:id/analytics       # Engagement metrics
```

### n8n Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `newsletter-content-ingestion` | Schedule | Poll RSS feeds |
| `newsletter-generation` | API call | Generate newsletter |
| `newsletter-approval` | Webhook | Human approval gate |
| `newsletter-delivery-smtp` | API call | Send via SMTP |
| `engagement-webhook` | Email events | Track opens/clicks |

---

## Marketing Autopilot

**Spec:** 005-marketing-autopilot (In Progress)

### Overview
Multi-channel marketing campaign management with AI content generation, competitor monitoring, and analytics.

### Modules

#### Campaign Management

| Feature | Description |
|---------|-------------|
| **Create Campaign** | Define goals, audience, channels, budget |
| **Campaign Lifecycle** | draft → active → paused → completed |
| **A/B Testing** | Test variants for optimization |
| **Scheduling** | Plan campaigns on calendar |

```
# API Endpoints
GET  /v1/campaigns                  # List campaigns
POST /v1/campaigns                  # Create campaign
GET  /v1/campaigns/:id              # Get campaign
PUT  /v1/campaigns/:id              # Update campaign
POST /v1/campaigns/:id/launch       # Launch campaign
POST /v1/campaigns/:id/pause        # Pause campaign
POST /v1/campaigns/:id/resume       # Resume campaign
POST /v1/campaigns/:id/stop         # Stop campaign
```

#### Content Studio

| Feature | Description |
|---------|-------------|
| **AI Generation** | Create content with Claude |
| **Refinement** | Iterate on generated content |
| **Validation** | Check brand voice compliance |
| **Scheduling** | Queue content for publishing |
| **Publishing** | Push to connected channels |

```
# API Endpoints
POST /v1/content/generate           # Generate content
POST /v1/content/:id/refine         # Refine content
POST /v1/content/:id/validate       # Validate against brand
POST /v1/content/:id/schedule       # Schedule for publishing
POST /v1/content/:id/publish        # Publish immediately
```

#### Channel Connections

| Channel Type | OAuth Support | Features |
|--------------|---------------|----------|
| Email (SMTP) | No | Send, track |
| Mailchimp | Yes | Send, lists, analytics |
| HubSpot | Yes | CRM integration |
| LinkedIn | Yes | Post, analytics |
| Twitter/X | Yes | Post, analytics |

```
# API Endpoints
GET  /v1/channels                   # List connected channels
POST /v1/channels/:type/connect     # Start OAuth flow
POST /v1/channels/:id/disconnect    # Disconnect channel
POST /v1/channels/:id/test          # Test connection
```

#### Competitor Monitoring

| Feature | Description |
|---------|-------------|
| **Profile Tracking** | Monitor competitor profiles |
| **Content Alerts** | New content notifications |
| **Trend Analysis** | Compare performance trends |

```
# API Endpoints
GET  /v1/competitors                # List competitors
POST /v1/competitors                # Add competitor
GET  /v1/competitors/:id/content    # Get competitor content
GET  /v1/competitors/:id/alerts     # Get alerts
```

#### Marketing Analytics

| Metric | Description |
|--------|-------------|
| **Impressions** | Total content views |
| **Engagement Rate** | Interactions / impressions |
| **Click-through Rate** | Clicks / impressions |
| **Conversions** | Goal completions |
| **ROI** | Revenue / spend |

```
# API Endpoints
GET  /v1/marketing/analytics        # Dashboard metrics
GET  /v1/campaigns/:id/analytics    # Campaign metrics
GET  /v1/channels/:id/analytics     # Channel metrics
```

#### Brand Center

| Feature | Description |
|---------|-------------|
| **Brand Guidelines** | Colors, fonts, logos |
| **Voice Settings** | Tone, personality, keywords |
| **Asset Management** | Image and document library |

```
# API Endpoints
GET  /v1/brand                      # Get brand settings
PUT  /v1/brand                      # Update brand settings
POST /v1/brand/assets               # Upload asset
DELETE /v1/brand/assets/:id         # Delete asset
```

---

## Authentication & Authorization

### Authentication Flow

```
1. User submits email/password
2. Backend validates credentials
3. Backend issues JWT (access + refresh tokens)
4. Frontend stores tokens
5. Frontend includes Bearer token in requests
6. Backend validates JWT on each request
```

### Token Configuration

| Token | Lifetime | Purpose |
|-------|----------|---------|
| Access Token | 15 minutes | API authentication |
| Refresh Token | 7 days | Obtain new access token |

### User Statuses

| Status | Description |
|--------|-------------|
| `pending_verification` | Awaiting email verification |
| `pending_approval` | Awaiting admin approval |
| `active` | Full access |
| `suspended` | Temporarily disabled |
| `deactivated` | Permanently disabled |

### API Endpoints

```
POST /v1/auth/register              # Create account
POST /v1/auth/login                 # Authenticate
POST /v1/auth/refresh               # Refresh tokens
POST /v1/auth/logout                # Invalidate tokens
POST /v1/auth/verify-email          # Verify email
POST /v1/auth/forgot-password       # Request reset
POST /v1/auth/reset-password        # Reset password
```

---

## Real-time Notifications

### WebSocket Connection

```javascript
const ws = new WebSocket('wss://api.example.com/ws?token=<jwt>');

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  // Handle notification
};
```

### Event Types

| Event | Description |
|-------|-------------|
| `threat.new` | New threat detected |
| `threat.updated` | Threat updated |
| `approval.requested` | New approval request |
| `approval.completed` | Approval decision made |
| `newsletter.generated` | Newsletter ready for review |
| `newsletter.sent` | Newsletter delivered |
| `campaign.status` | Campaign status change |

### Message Format

```json
{
  "type": "approval.requested",
  "payload": {
    "id": "uuid",
    "title": "Article title",
    "submittedBy": "user@example.com",
    "submittedAt": "2026-01-08T12:00:00Z"
  },
  "timestamp": "2026-01-08T12:00:01Z"
}
```

---

## Feature Roadmap

### Completed
- [x] Threat Intelligence (001)
- [x] React Frontend (002)
- [x] Article Approval Workflow (003)
- [x] AI Newsletter Automation (004)

### In Progress
- [ ] Marketing Autopilot (005)

### Planned
- [ ] Marketing Intelligence Platform (006)
- [ ] Advanced Analytics (007)
- [ ] Multi-tenancy (008)

---

*For implementation details, see the spec files in `specs/` directory.*
