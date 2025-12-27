# n8n Newsletter Automation Workflows

Complete documentation for n8n workflows that automate content ingestion, processing, and newsletter generation for the Armor newsletter platform.

## Table of Contents

- [Overview](#overview)
- [Workflow Architecture](#workflow-architecture)
- [Workflows](#workflows)
  - [Content Ingestion Workflow](#content-ingestion-workflow)
  - [Newsletter Generation Workflow](#newsletter-generation-workflow)
- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Installation Steps](#installation-steps)
  - [Importing Workflows](#importing-workflows)
- [Credentials Configuration](#credentials-configuration)
  - [PostgreSQL](#postgresql)
  - [OpenRouter API](#openrouter-api)
  - [Email Service (HubSpot/Mailchimp)](#email-service-hubspotmailchimp)
  - [Webhook Configuration](#webhook-configuration)
- [Environment Variables](#environment-variables)
  - [Backend Service](#backend-service)
  - [n8n Workflows](#n8n-workflows)
  - [Mapping Guide](#mapping-guide)
- [Troubleshooting](#troubleshooting)
  - [Connection Issues](#connection-issues)
  - [Credential Problems](#credential-problems)
  - [Common Errors](#common-errors)
- [Monitoring & Logging](#monitoring--logging)
- [Security Considerations](#security-considerations)
- [Support & Updates](#support--updates)

## Overview

The n8n workflow automation system provides two core workflows:

1. **Content Ingestion Workflow**: Pulls raw cybersecurity content from multiple sources, validates, filters, and enriches it before storing in PostgreSQL
2. **Newsletter Generation Workflow**: Takes stored content, applies AI-powered summarization using OpenRouter, segments audiences via HubSpot/Mailchimp, and generates personalized newsletter editions

### Key Capabilities

- **Automated Content Collection**: Regularly ingest news from configured sources
- **AI-Powered Enhancement**: Summarize and contextualize content using Claude (via OpenRouter)
- **Smart Filtering**: Apply relevance scoring, severity classification, and duplicate detection
- **Audience Segmentation**: Target specific user groups with tailored content
- **Multi-Channel Distribution**: Send via email, webhooks, and the application API
- **Compliance & Audit**: Full audit trails for all operations
- **Error Handling**: Graceful degradation with fallback mechanisms

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT INGESTION WORKFLOW                    │
└─────────────────────────────────────────────────────────────────┘

External Sources           Ingestion Pipeline          Storage Layer
  ┌─────────────┐          ┌───────────────┐          ┌──────────┐
  │ RSS Feeds   │          │ Fetch Items   │          │          │
  │ APIs        │──────→   │ Parse         │──────→   │ PostgreSQL
  │ Webhooks    │          │ Validate      │          │ Database │
  └─────────────┘          │ Enrich        │          │          │
                           │ Deduplicate   │          └──────────┘
                           │ Score         │
                           └───────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                 NEWSLETTER GENERATION WORKFLOW                    │
└─────────────────────────────────────────────────────────────────┘

Content Database       Generation Pipeline        Distribution Channels
  ┌──────────────┐    ┌──────────────────┐        ┌────────────────┐
  │  Articles    │    │ Select Content   │        │  Email         │
  │  Metadata    │    │ (Filter/Sort)    │───────→│  Webhooks      │
  │  Segments    │    │ Segment Users    │        │  API Calls     │
  └──────────────┘    │ AI Summarization │        │  CMS Updates   │
                      │ (OpenRouter)     │        └────────────────┘
                      │ Format Issue     │
                      │ Track Engagement │
                      └──────────────────┘


WORKFLOW DEPENDENCIES

                  ┌─────────────────┐
                  │  PostgreSQL DB  │
                  │  (Primary Data) │
                  └────────┬────────┘
                           │
                ┌──────────┴───────────┐
                │                      │
        ┌───────▼─────────┐   ┌───────▼──────────┐
        │  Content        │   │  Newsletter      │
        │  Ingestion      │   │  Generation      │
        │  Workflow       │   │  Workflow        │
        └────────┬────────┘   └────────┬─────────┘
                 │                     │
        ┌────────▼──────────┐  ┌───────▼─────────────┐
        │  External APIs    │  │  Distribution      │
        │  - RSS            │  │  - Email Service   │
        │  - Webhooks       │  │  - Webhooks        │
        │  - Feeds          │  │  - API Gateway     │
        └───────────────────┘  └────────────────────┘
```

## Workflows

### Content Ingestion Workflow

**File**: `newsletter-content-ingestion.json`

**Purpose**: Automatically fetch cybersecurity content from configured sources, validate, enrich with AI insights, and store in PostgreSQL for later use.

**Trigger**: Scheduled (configurable interval: every 30 minutes, 1 hour, 4 hours, or custom)

**Processing Steps**:

1. **Fetch Content**: Retrieve articles from configured sources
   - HTTP endpoints
   - RSS feeds
   - API integrations
   - Webhook payloads

2. **Parse & Validate**: Extract and normalize content
   - Title, description, URL validation
   - Source attribution
   - Published date handling
   - Content type classification

3. **Enrich & Score**: Add AI-generated insights
   - Severity scoring (Low, Medium, High, Critical)
   - Category classification (e.g., Breach, Vulnerability, Malware)
   - Relevance scoring based on keywords
   - Executive summary generation

4. **Deduplication**: Detect and prevent duplicate storage
   - Hash-based comparison
   - URL-based detection
   - Fuzzy title matching

5. **Store in Database**: Save to PostgreSQL tables
   - `articles` - Core content
   - `article_sources` - Attribution
   - `content_items` - Newsletter-specific metadata
   - `audit_logs` - Operation tracking

6. **Error Handling**:
   - Retry failed requests (exponential backoff)
   - Log errors with context
   - Continue processing remaining items
   - Alert on critical failures

**Inputs**:

- `source_ids`: Array of content source identifiers
- `max_items`: Maximum articles to ingest per run
- `time_window`: How far back to look for new content

**Outputs**:

- Stored articles in PostgreSQL
- Audit trail of ingestion
- Error report (if any failures)

**Error Recovery**:

The workflow includes automatic retry logic:
- Connection failures: Retry up to 3 times with exponential backoff
- Timeout: Fall back to cache if available
- Partial failures: Continue with successful items, log failures

### Newsletter Generation Workflow

**File**: `newsletter-generation.json`

**Purpose**: Create personalized newsletter editions by selecting curated content, generating AI summaries, and delivering to segmented audiences.

**Trigger**: Scheduled (configurable: daily, weekly, or manual)

**Processing Steps**:

1. **Content Selection**: Query PostgreSQL for curated articles
   - Filter by date range
   - Sort by severity/relevance
   - Apply category preferences
   - Exclude previously sent items

2. **Audience Segmentation**: Retrieve user segments
   - Query segment definitions
   - Determine user membership
   - Load preference overrides
   - Calculate send time (timezone-aware)

3. **Content Personalization**:
   - Select relevant articles for each segment
   - Apply custom ordering
   - Insert user-specific recommendations
   - Add preference-based filters

4. **AI Summarization** (via OpenRouter):
   - Send article text to Claude API
   - Request concise summaries (1-2 paragraphs)
   - Include key takeaways
   - Format for email/web display
   - Cache results for performance

5. **Issue Assembly**:
   - Create newsletter structure
   - Insert header/footer
   - Add metadata (sent date, issue number)
   - Generate unique tracking IDs

6. **Distribution**:
   - Queue emails via HubSpot/Mailchimp
   - Send API notifications
   - Trigger webhooks
   - Update CMS if integrated

7. **Engagement Tracking**:
   - Record send events
   - Track open rates
   - Monitor click-through rates
   - Capture subscriber actions

**Inputs**:

- `newsletter_config_id`: Which newsletter configuration to use
- `segment_filters`: Optional custom segment selection
- `article_limit`: Maximum articles per issue
- `send_datetime`: When to deliver the issue

**Outputs**:

- Created newsletter issue
- Queued distribution jobs
- Engagement tracking records
- Error/failure report

**Performance Optimization**:

- Batch processing for multiple segments
- Caching of AI summaries
- Connection pooling to database
- Parallel API calls where safe

## Setup Instructions

### Prerequisites

Before setting up the workflows, ensure you have:

1. **n8n Instance**: n8n self-hosted or cloud (v0.200+)
   - Accessible via HTTP/HTTPS
   - WebSocket support enabled
   - File system access for workflow imports

2. **PostgreSQL Database**: v12+
   - Accessible from n8n
   - Required tables created (see [Database Setup](#database-setup))
   - User with appropriate permissions

3. **OpenRouter Account**: For AI-powered content summarization
   - API key obtained
   - Credit balance available
   - Model: Claude 3 Sonnet (recommended)

4. **Email Service Account**: HubSpot or Mailchimp
   - API credentials obtained
   - Contact lists created
   - Email templates configured

5. **Backend API**: Armor platform backend running
   - Accessible from n8n
   - API authentication credentials
   - Webhook endpoint configured

### Installation Steps

#### Step 1: Prepare Your Environment

1. Copy `.env.example` to `.env` in the n8n-workflows directory:
   ```bash
   cp n8n-workflows/.env.example n8n-workflows/.env
   ```

2. Fill in all required credentials:
   ```bash
   nano n8n-workflows/.env
   ```

3. Verify n8n is running:
   ```bash
   curl http://localhost:5678/api/v1/health
   ```
   Expected response: `{"status":"ok"}`

#### Step 2: Create Database Objects

Before importing workflows, ensure all required PostgreSQL tables exist:

```bash
# Connect to your PostgreSQL instance
psql postgresql://user:password@host:5432/armor_db

# Run migrations for newsletter system
\i aci-backend/migrations/000008_newsletter_system.up.sql

# Verify tables created
\dt content_* newsletter_* segment_*
```

**Required Tables** (created by migrations):

- `articles` - Raw cybersecurity articles
- `content_items` - Articles selected for newsletters
- `content_sources` - Content source configurations
- `newsletter_configs` - Newsletter templates
- `newsletter_issues` - Generated editions
- `newsletter_blocks` - Newsletter sections
- `segments` - User audience segments
- `contacts` - Newsletter subscribers
- `audit_logs` - Operation audit trail

#### Step 3: Configure n8n Credentials

Access n8n web interface and configure:

1. **Go to Settings → Credentials** (http://localhost:5678/credentials)

2. Create each credential type below

### Importing Workflows

#### Method 1: Direct File Import (Recommended)

1. **Open n8n**: Navigate to http://localhost:5678

2. **Go to Workflows**: Click "Workflows" in sidebar

3. **Import**: Click the import button (up arrow icon)

4. **Select File**: Choose `newsletter-content-ingestion.json`

5. **Review Nodes**: n8n will prompt you to map credentials to nodes

6. **Configure Credentials**:
   - Click each red node requiring credentials
   - Select or create the appropriate credential
   - Test connection

7. **Activate Workflow**:
   - Click "Save" to persist
   - Toggle the active switch to enable scheduling
   - Set trigger schedule

8. **Repeat** for `newsletter-generation.json`

#### Method 2: API Import

```bash
#!/bin/bash
# Set your n8n API URL and authentication
N8N_URL="http://localhost:5678"
API_TOKEN="your-n8n-api-token"  # Get from n8n UI Settings

# Import content ingestion workflow
curl -X POST "$N8N_URL/api/v1/workflows" \
  -H "X-N8N-API-KEY: $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d @newsletter-content-ingestion.json

# Import generation workflow
curl -X POST "$N8N_URL/api/v1/workflows" \
  -H "X-N8N-API-KEY: $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d @newsletter-generation.json

echo "Workflows imported successfully"
```

#### Method 3: Docker Compose

If using Docker, update your docker-compose.yml:

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=${N8N_DB_USER}
      - DB_POSTGRESDB_PASSWORD=${N8N_DB_PASSWORD}
      - N8N_SECURE_COOKIE=false  # Set to true in production
    volumes:
      - ./n8n-workflows:/home/node/.n8n/workflows
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: armor_db
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./aci-backend/migrations:/docker-entrypoint-initdb.d

volumes:
  n8n_data:
  postgres_data:
```

Then import workflows:

```bash
docker-compose exec n8n n8n import --input=workflows/newsletter-content-ingestion.json
docker-compose exec n8n n8n import --input=workflows/newsletter-generation.json
```

## Credentials Configuration

Workflows require secure credentials for external services. Configure each in n8n UI.

### PostgreSQL

**Credential Type**: Postgres

**Location**: Settings → Credentials → Create Credential → Postgres

**Configuration**:

| Field | Value | Example |
|-------|-------|---------|
| Host | Database hostname | `localhost` or `db.example.com` |
| Port | PostgreSQL port | `5432` |
| Database | Database name | `armor_db` |
| User | Database user | `armor_app` |
| Password | Database password | `secure_password_here` |
| SSL | Connection encryption | Enabled for production |

**Test Connection**: Click "Test connection" button

**Verification**:

```sql
-- In n8n workflow, add a "Postgres" node with this query:
SELECT version();
-- Should return PostgreSQL version info
```

**Permissions Required**:

```sql
-- Grant appropriate permissions to the n8n user:
GRANT CONNECT ON DATABASE armor_db TO armor_app;
GRANT USAGE ON SCHEMA public TO armor_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO armor_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO armor_app;

-- Specifically for newsletter tables:
GRANT ALL PRIVILEGES ON articles, content_items, content_sources,
  newsletter_configs, newsletter_issues, segments, contacts, audit_logs
  TO armor_app;
```

### OpenRouter API

**Credential Type**: HTTP Headers / API Key

**Location**: Settings → Credentials → Create Credential → HTTP Headers

**Configuration**:

| Field | Value | Example |
|-------|-------|---------|
| Name | Credential name | `OpenRouter API` |
| Authorization | Header name | `Authorization` |
| Value | API key format | `Bearer sk-or-XXXXXXXXXXXX` |
| Base URL | OpenRouter endpoint | `https://openrouter.ai/api/v1` |

**Get API Key**:

1. Visit https://openrouter.ai
2. Sign up or log in
3. Go to Settings → API Keys
4. Create new API key
5. Copy full key (starts with `sk-or-`)

**Test Request**:

In n8n, create an HTTP node with:

```json
{
  "method": "POST",
  "url": "https://openrouter.ai/api/v1/chat/completions",
  "headers": {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  "body": {
    "model": "anthropic/claude-3-sonnet",
    "messages": [{"role": "user", "content": "Summarize: test content"}],
    "max_tokens": 200
  }
}
```

**Recommended Models**:

- `anthropic/claude-3-sonnet` (Best balance of speed/cost)
- `anthropic/claude-3-opus` (Most capable, higher cost)
- `openai/gpt-4` (Alternative option)

**Cost Optimization**:

- Summarization: Sonnet (faster, cheaper)
- Complex analysis: Opus (if needed)
- Cache summaries to avoid duplicate API calls
- Batch requests when possible

### Email Service (HubSpot/Mailchimp)

#### HubSpot Configuration

**Credential Type**: HubSpot

**Location**: Settings → Credentials → Create Credential → HubSpot

**Setup Steps**:

1. **Get HubSpot API Key**:
   - Log in to HubSpot account
   - Go to Settings → Account Setup → Integrations → Private apps
   - Click "Create app"
   - Scopes needed:
     - `crm.objects.contacts.read`
     - `crm.objects.contacts.write`
     - `crm.lists.read`
     - `crm.lists.write`
     - `communication_preferences.visitor.write`
   - Install private app
   - Copy access token

2. **Create n8n Credential**:
   - API Token: Paste HubSpot private app token
   - Test connection

3. **Configure Contact Lists**:
   - In HubSpot, create lists for each segment:
     - Security Professionals
     - CISO/Security Leaders
     - Compliance Officers
   - Note list IDs for workflow configuration

**Node Configuration**:

```json
{
  "type": "HubSpot",
  "operation": "create",
  "resource": "contact",
  "properties": {
    "firstname": "First Name",
    "lastname": "Last Name",
    "email": "user@example.com",
    "company": "Company Name"
  }
}
```

#### Mailchimp Configuration

**Credential Type**: HTTP Headers / API Key

**Location**: Settings → Credentials → HTTP Headers

**Setup Steps**:

1. **Get Mailchimp API Key**:
   - Log in to Mailchimp account
   - Go to Account → Extras → API Keys
   - Create new API key
   - Copy key (format: `xxxxxxxxxxxxx-us1`)

2. **Get Server Prefix**:
   - API key ends with `-us#` (e.g., `-us1`, `-eu1`)
   - This is your server prefix

3. **Create n8n Credential**:
   - Base URL: `https://SERVER.api.mailchimp.com/3.0`
   - Authorization Header: `Authorization`
   - Value: `Basic` (will encode username:apikey in base64)

4. **Get Audience/List IDs**:
   - In Mailchimp: Audience → Click audience name
   - Note the list ID from URL or settings
   - Use in workflows for targeting

**Node Configuration**:

```json
{
  "type": "HTTP",
  "method": "POST",
  "url": "https://us1.api.mailchimp.com/3.0/lists/LIST_ID/members",
  "body": {
    "email_address": "user@example.com",
    "merge_fields": {
      "FNAME": "First",
      "LNAME": "Last"
    }
  }
}
```

### Webhook Configuration

**Purpose**: Allow external services to trigger workflow execution

**Setup**:

1. **Enable Webhooks in Workflow**:
   - Open workflow
   - Click "+" to add trigger node
   - Select "Webhook" trigger
   - Choose HTTP method: POST
   - Save workflow

2. **Generate Webhook URL**:
   - n8n auto-generates URL format:
     `https://your-n8n-domain/webhook/UNIQUE_ID`
   - Copy full URL
   - Save in backend configuration

3. **Configure Backend Webhook**:
   - Update backend `.env`:
     ```
     N8N_WEBHOOK_URL=https://your-n8n-domain/webhook/YOUR_WEBHOOK_ID
     N8N_WEBHOOK_SECRET=your_secret_key
     ```

4. **Verify Webhook**:
   - Test with curl:
     ```bash
     curl -X POST https://your-n8n-domain/webhook/YOUR_ID \
       -H "Content-Type: application/json" \
       -d '{"test": "data"}'
     ```
   - Check n8n execution log

## Environment Variables

Environment variables control workflow behavior and connect to external services.

### Backend Service

Located in `aci-backend/.env`:

```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/armor_db
DB_HOST=localhost
DB_PORT=5432
DB_USER=armor_app
DB_PASSWORD=secure_password
DB_NAME=armor_db

# AI/LLM Integration
OPENROUTER_API_KEY=sk-or-XXXXXXXXXXXX
OPENROUTER_MODEL=anthropic/claude-3-sonnet
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Email Service (choose one: HUBSPOT or MAILCHIMP)
EMAIL_SERVICE=hubspot  # or 'mailchimp'
HUBSPOT_API_KEY=pat-na1-XXXXXXXXXXXX
MAILCHIMP_API_KEY=xxxxxxxxxxxxx-us1
MAILCHIMP_SERVER=us1

# n8n Integration
N8N_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key
N8N_WEBHOOK_URL=https://your-domain.com/webhook/xxx
N8N_WEBHOOK_SECRET=webhook_secret_key

# Content Sources
DEFAULT_CONTENT_SOURCES=rss-feeds,api-endpoints
INGEST_INTERVAL_MINUTES=30
INGEST_BATCH_SIZE=50

# Newsletter Configuration
NEWSLETTER_SEND_TIME=08:00  # 24-hour format
NEWSLETTER_TIMEZONE=UTC
DEFAULT_NEWSLETTER_SEGMENT=all
```

### n8n Workflows

n8n stores credentials separately in its database. Configure via UI:

**Settings → Credentials**

**Required Credentials**:

| Name | Type | Environment |
|------|------|-------------|
| PostgreSQL | Postgres | `POSTGRES_CREDENTIALS` |
| OpenRouter | HTTP Headers | `OPENROUTER_CREDENTIALS` |
| HubSpot/Mailchimp | API Key | `EMAIL_SERVICE_CREDENTIALS` |
| Backend API | API Key | `BACKEND_API_CREDENTIALS` |

### Mapping Guide

Connect backend environment variables to n8n credentials:

**Content Ingestion Workflow**:

```
Backend .env                    n8n Nodes
────────────────────────────────────────────────────
DATABASE_URL          →  Postgres node
OPENROUTER_API_KEY    →  HTTP POST (summarization)
OPENROUTER_MODEL      →  HTTP body (model selection)
DEFAULT_CONTENT_SOURCES →  Source configuration node
INGEST_BATCH_SIZE     →  Loop parameter
```

**Newsletter Generation Workflow**:

```
Backend .env                    n8n Nodes
────────────────────────────────────────────────────
DATABASE_URL          →  Postgres node (queries)
OPENROUTER_API_KEY    →  HTTP POST (summaries)
HUBSPOT_API_KEY       →  HubSpot node
MAILCHIMP_API_KEY     →  HTTP node (Mailchimp)
N8N_WEBHOOK_URL       →  Webhook trigger
NEWSLETTER_SEND_TIME  →  Schedule node
```

**Runtime Substitution**:

In workflows, reference environment variables:

```json
{
  "node": "PostgreSQL",
  "credentials": "{{$env.POSTGRES_CREDENTIALS}}",
  "query": "SELECT * FROM articles WHERE created_at > NOW() - INTERVAL '1 hour'"
}
```

## Troubleshooting

### Connection Issues

#### PostgreSQL Connection Fails

**Symptom**: "ECONNREFUSED" or "timeout" errors

**Diagnosis**:

1. Check PostgreSQL is running:
   ```bash
   psql postgresql://user:password@host:5432/armor_db -c "SELECT 1"
   ```

2. Verify network connectivity:
   ```bash
   telnet localhost 5432
   # Should connect successfully
   ```

3. Check credential configuration:
   - Verify host, port, user, password in n8n
   - Test connection button in credential settings

**Solution**:

1. **If local PostgreSQL**:
   ```bash
   # Start PostgreSQL
   brew services start postgresql@15  # macOS
   # or
   systemctl start postgresql  # Linux
   ```

2. **If remote PostgreSQL**:
   - Verify firewall allows port 5432
   - Confirm IP whitelisting in database settings
   - Test from n8n container: `docker exec n8n psql -h host -U user -d dbname`

3. **Update credentials**:
   - Go to Settings → Credentials
   - Edit PostgreSQL credential
   - Click "Test connection" to verify

#### OpenRouter API Fails

**Symptom**: "401 Unauthorized" or "Connection timeout"

**Diagnosis**:

1. Verify API key is correct:
   ```bash
   curl -H "Authorization: Bearer $OPENROUTER_KEY" \
     https://openrouter.ai/api/v1/models
   ```

2. Check account status:
   - Visit https://openrouter.ai
   - Verify account is active
   - Check credit balance (at least $0.01)

3. Verify model availability:
   ```bash
   curl https://openrouter.ai/api/v1/models | grep claude-3-sonnet
   ```

**Solution**:

1. **Invalid API Key**:
   - Copy fresh key from OpenRouter dashboard
   - Update n8n credential
   - Test in workflow

2. **Insufficient Credits**:
   - Add credit to OpenRouter account
   - Start with $5 for testing
   - Monitor usage in dashboard

3. **Model Availability**:
   - Use `anthropic/claude-3-sonnet` (recommended)
   - Avoid `openai/gpt-4-turbo-preview` (may be unavailable)
   - Check https://openrouter.ai/docs for latest models

#### Email Service Connection Fails

**Symptom**: "Invalid credentials" or "Account not found"

**Solution for HubSpot**:

1. Verify private app token:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.hubapi.com/crm/v3/objects/contacts
   ```

2. Check required scopes:
   - Settings → Integrations → Private apps
   - Select your app
   - Verify scopes include:
     - `crm.objects.contacts.read`
     - `crm.objects.contacts.write`

3. Recreate if needed:
   - Delete old app
   - Create new private app with all required scopes
   - Update n8n credential

**Solution for Mailchimp**:

1. Verify API key format:
   - Should be: `xxxxxxxxxxxxxxxx-us1` (includes server suffix)
   - Get from Account → Extras → API Keys

2. Test connection:
   ```bash
   curl -u 'anystring:YOUR_API_KEY' \
     https://YOUR_SERVER.api.mailchimp.com/3.0/
   ```

3. Check server prefix:
   - API key ends with `-us1`, `-us2`, `-eu1`, etc.
   - Must match in base URL: `https://us1.api.mailchimp.com/3.0`

### Credential Problems

#### Missing or Stale Credentials

**Symptom**: Red nodes in workflow, "Credentials not found"

**Solution**:

1. Open workflow in edit mode
2. Click each red node
3. Click "Select Credentials" in panel
4. Choose from existing or create new
5. Save workflow

#### Credential No Longer Valid

**Symptom**: Workflow runs but API returns 401/403

**Solution**:

1. Regenerate/refresh the credential:
   - **HubSpot**: Create new private app token
   - **Mailchimp**: Create new API key
   - **OpenRouter**: Create new API key

2. Update in n8n:
   - Settings → Credentials
   - Edit the credential
   - Paste new key/token
   - Test connection

3. Re-activate workflow:
   - Turn off workflow switch
   - Turn on workflow switch
   - Check execution logs

### Common Errors

#### "Column does not exist" in Postgres node

**Cause**: Database schema out of sync

**Solution**:

1. Verify migrations were run:
   ```bash
   psql armor_db -c "\dt"
   # Should show: articles, content_items, segments, etc.
   ```

2. If tables missing, run migrations:
   ```bash
   cd aci-backend
   goose -dir migrations postgres "$DATABASE_URL" up
   ```

3. Verify column names in workflow match database:
   ```bash
   psql armor_db -c "\d articles"
   # Review actual column names
   ```

#### "Request timeout" in HTTP nodes

**Cause**: API taking too long to respond

**Solution**:

1. Increase timeout in HTTP node:
   - Settings → Timeout: increase to 60000ms (60 seconds)

2. Check API status:
   - Visit OpenRouter/HubSpot status page
   - Monitor API response times

3. Reduce batch size:
   - Process fewer items per execution
   - Split large requests into smaller batches

#### "Memory exceeded" errors

**Cause**: n8n process running out of memory

**Solution**:

1. Check n8n container memory limit:
   ```bash
   docker stats n8n
   ```

2. Increase Docker memory:
   ```yaml
   services:
     n8n:
       deploy:
         resources:
           limits:
             memory: 2G  # Increase from 1G
   ```

3. Optimize workflow:
   - Reduce loop sizes
   - Use pagination for large datasets
   - Delete completed executions (Settings → Data)

#### "Workflow execution timeout"

**Cause**: Workflow takes too long to complete

**Solution**:

1. Break into smaller workflows:
   - Content ingestion: Keep separate from generation
   - Use webhooks to chain workflows

2. Reduce scope per execution:
   - Process fewer articles per run
   - Increase execution frequency (shorter batches)

3. Add timeout to long-running steps:
   - HTTP nodes: Set timeout to 30s
   - Postgres queries: Add LIMIT clauses

## Monitoring & Logging

### Execution Monitoring

**Check Workflow Execution History**:

1. Open workflow in n8n
2. Click "Executions" panel (right sidebar)
3. View last 50 executions
4. Click execution to see details:
   - Input/output for each node
   - Execution time
   - Error messages

**Filter Executions**:

```
Status: All / Success / Error / Running / Waiting
Time Range: Last hour / day / week / month
```

### View Logs

**n8n Application Logs**:

```bash
# If using Docker
docker logs -f n8n

# If self-hosted
tail -f ~/.n8n/logs/*.log

# From n8n UI
Settings → Logs → View all logs
```

**Database Audit Trail**:

```sql
-- View all operations logged to audit_logs table
SELECT
  created_at,
  action,
  entity_type,
  entity_id,
  user_id,
  changes
FROM audit_logs
ORDER BY created_at DESC
LIMIT 100;

-- Filter by workflow/ingestion
SELECT * FROM audit_logs
WHERE action = 'article_ingested'
AND created_at > NOW() - INTERVAL '24 hours';
```

### Performance Metrics

**Monitor Execution Times**:

```sql
-- Average execution time per workflow
SELECT
  workflow_id,
  AVG(execution_duration_ms) as avg_duration,
  MAX(execution_duration_ms) as max_duration,
  MIN(execution_duration_ms) as min_duration,
  COUNT(*) as total_executions
FROM workflow_executions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY workflow_id
ORDER BY avg_duration DESC;
```

**Database Query Performance**:

```sql
-- Identify slow queries
SELECT
  query,
  COUNT(*) as frequency,
  AVG(execution_time_ms) as avg_time,
  MAX(execution_time_ms) as max_time
FROM query_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY query
ORDER BY avg_time DESC
LIMIT 20;
```

### Alerting

**Set Up Email Alerts** (n8n Pro/Enterprise):

1. Workflow Settings → Error handling
2. Add notification node:
   - On error, send email to admin
   - Include execution details
   - Link to workflow execution

**Example Alert Workflow**:

```json
{
  "trigger": "Workflow failed",
  "then": {
    "send_email": {
      "to": "ops@example.com",
      "subject": "Workflow {{$json.name}} failed",
      "body": "Error: {{$json.error}}\nExecution: {{$json.executionUrl}}"
    }
  }
}
```

## Security Considerations

### Credential Management

**Best Practices**:

1. **Use Environment Variables**: Never hardcode secrets
   ```json
   {
     "apiKey": "{{$env.OPENROUTER_KEY}}"
   }
   ```

2. **Rotate Credentials Regularly**:
   - HubSpot/Mailchimp: Monthly
   - OpenRouter: Quarterly or if exposed
   - Database: As per compliance requirements

3. **Access Control**:
   - Limit who can view credentials
   - n8n credentials are encrypted at rest
   - Only decrypt when executing workflows

### Network Security

**If self-hosting n8n**:

1. **Use HTTPS**:
   ```bash
   # Nginx reverse proxy config
   server {
     listen 443 ssl http2;
     ssl_certificate /path/to/cert.pem;
     ssl_certificate_key /path/to/key.pem;

     proxy_pass http://localhost:5678;
   }
   ```

2. **Firewall Rules**:
   - Only allow access from backend API
   - Whitelist specific IP addresses
   - Block direct public access

3. **VPN/Tunnel**:
   - Consider using ngrok/Cloudflare Tunnel for webhooks
   - Requires less firewall changes

### Data Privacy

**GDPR/Privacy Compliance**:

1. **Log Retention**:
   - Delete execution logs after 90 days
   - Settings → Data → Delete old executions

2. **PII Handling**:
   - Don't log email addresses in workflow output
   - Mask sensitive fields in logs
   - Use encrypted environment variables

3. **Database Encryption**:
   ```sql
   -- Enable SSL for PostgreSQL connections
   ALTER DATABASE armor_db SET sslmode = require;
   ```

### API Rate Limiting

**Prevent Abuse**:

1. **OpenRouter**: Monitor usage
   ```bash
   curl https://openrouter.ai/api/v1/auth/key \
     -H "Authorization: Bearer YOUR_KEY"
   # Check "usage" field
   ```

2. **HubSpot**:
   - Respects API rate limits automatically
   - Monitor in HubSpot Settings → Integrations

3. **Implement in Workflows**:
   - Add delays between API calls
   - Use retry logic with exponential backoff
   - Batch requests when possible

## Support & Updates

### Version Management

**Check n8n Version**:

```bash
# In n8n UI
Settings → About

# In Docker
docker exec n8n n8n --version

# In source installation
cat ~/.n8n/version
```

**Update n8n**:

```bash
# Docker
docker pull n8nio/n8n:latest
docker-compose up -d

# Self-hosted
npm update -g n8n

# From source
git pull origin main
npm install
npm run build
```

### Workflow Updates

**When Backend Changes**:

1. **Database Schema Changes**:
   - Run migrations
   - Update Postgres queries in workflows
   - Test with sample data

2. **API Changes**:
   - Update HTTP request nodes
   - Verify response structure
   - Update parsing logic

3. **Credential Changes**:
   - Create new credentials
   - Update workflow nodes
   - Test connections

### Getting Help

**Resources**:

- **n8n Documentation**: https://docs.n8n.io
- **n8n Community Forum**: https://community.n8n.io
- **Project Repository**: https://github.com/your-org/n8n-cyber-news
- **Issue Tracker**: GitHub Issues in main repository

**Reporting Issues**:

1. Collect diagnostic info:
   ```bash
   n8n --version
   psql armor_db -c "SELECT version()"
   docker version
   ```

2. Export workflow (Settings → Download):
   - Don't include credentials
   - Include execution log

3. Create GitHub issue with:
   - n8n version
   - PostgreSQL version
   - Steps to reproduce
   - Workflow JSON (without secrets)
   - Error message

### Contributing

To improve these workflows:

1. Test changes thoroughly
2. Document any modifications
3. Submit pull request with:
   - Updated workflow JSON
   - Changes to this README
   - Test results

---

## Appendix

### Database Setup Reference

```sql
-- Create n8n user if not exists
CREATE USER n8n_user WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT CONNECT ON DATABASE armor_db TO n8n_user;
GRANT USAGE ON SCHEMA public TO n8n_user;

-- Grant all on tables created by migrations
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES
  IN SCHEMA public TO n8n_user;
GRANT USAGE, SELECT ON ALL SEQUENCES
  IN SCHEMA public TO n8n_user;

-- Make permanent
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
  TO n8n_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES
  TO n8n_user;
```

### Common Queries

**Check Article Ingestion Status**:

```sql
-- Last 24 hours of ingestion
SELECT
  source_id,
  COUNT(*) as article_count,
  MAX(created_at) as latest,
  AVG(severity_score) as avg_severity
FROM articles
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source_id
ORDER BY article_count DESC;
```

**Check Newsletter Generation**:

```sql
-- Latest newsletter issues
SELECT
  id,
  newsletter_config_id,
  segment_id,
  created_at,
  sent_at,
  article_count,
  status
FROM newsletter_issues
ORDER BY created_at DESC
LIMIT 10;
```

**Monitor Engagement**:

```sql
-- Newsletter open/click rates
SELECT
  i.id,
  COUNT(e.id) as engagement_events,
  SUM(CASE WHEN e.event_type = 'open' THEN 1 ELSE 0 END) as opens,
  SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END) as clicks
FROM newsletter_issues i
LEFT JOIN engagement_events e ON i.id = e.issue_id
GROUP BY i.id
ORDER BY i.created_at DESC;
```

### Webhook Examples

**Test Content Ingestion Webhook**:

```bash
curl -X POST https://your-n8n-domain/webhook/content-ingestion \
  -H "Content-Type: application/json" \
  -d '{
    "source": "external-api",
    "articles": [
      {
        "title": "Critical Vulnerability Discovered",
        "description": "A new vulnerability affecting...",
        "url": "https://example.com/article",
        "published_at": "2024-12-19T10:00:00Z",
        "severity": "critical"
      }
    ]
  }'
```

**Trigger Newsletter Generation**:

```bash
curl -X POST https://your-n8n-domain/webhook/generate-newsletter \
  -H "Content-Type: application/json" \
  -d '{
    "newsletter_config_id": "config-123",
    "segment_ids": ["segment-1", "segment-2"],
    "article_limit": 10,
    "send_immediately": false
  }'
```

---

**Last Updated**: 2025-12-19
**Version**: 1.0.0
**Maintained By**: Documentation Team

For questions or improvements, open an issue on the project repository.
