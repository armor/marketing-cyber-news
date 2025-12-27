# Developer Quickstart: AI-Powered Newsletter Automation System

**Feature Branch**: `004-ai-newsletter-automation`
**Date**: 2025-12-17

---

## Quick Setup

### Prerequisites

```bash
# Required tools
go version        # Go 1.22+
node --version    # Node 20+
docker --version  # Docker 24+
kubectl version   # Kubernetes access

# Required services (via K8s or local)
# - PostgreSQL 14+
# - Redis 7+
# - ZincSearch
# - n8n
```

### Clone and Setup

```bash
# Checkout feature branch
git checkout 004-ai-newsletter-automation

# Backend setup
cd aci-backend
go mod download
cp .env.example .env.local  # Configure database credentials

# Run migrations
make migrate-up

# Frontend setup
cd ../aci-frontend
npm install
cp .env.example .env.local
```

### Run Development Servers

```bash
# Terminal 1: Backend
cd aci-backend
make run
# API available at http://localhost:8080

# Terminal 2: Frontend
cd aci-frontend
npm run dev
# UI available at http://localhost:5173

# Terminal 3: n8n (if local)
docker-compose up n8n
# n8n available at http://localhost:5678
```

---

## Project Structure

```
aci-backend/
├── internal/
│   ├── domain/
│   │   ├── newsletter.go          # Newsletter types & enums
│   │   ├── segment.go             # Segment types
│   │   ├── contact.go             # Contact types
│   │   └── content.go             # Content types
│   ├── repository/
│   │   ├── interfaces.go          # Repository interfaces
│   │   └── postgres/
│   │       ├── newsletter_repo.go # Configuration repo
│   │       ├── segment_repo.go    # Segment repo
│   │       ├── contact_repo.go    # Contact repo
│   │       └── content_repo.go    # Content repo
│   ├── service/
│   │   ├── newsletter_config_service.go
│   │   ├── segment_service.go
│   │   ├── content_service.go
│   │   ├── generation_service.go
│   │   ├── delivery_service.go
│   │   └── analytics_service.go
│   └── api/
│       ├── handlers/
│       │   ├── newsletter_handler.go
│       │   ├── segment_handler.go
│       │   ├── content_handler.go
│       │   └── analytics_handler.go
│       └── dto/
│           └── newsletter_dto.go
├── migrations/
│   ├── 000008_newsletter_system.up.sql
│   └── 000008_newsletter_system.down.sql
└── tests/
    ├── unit/
    └── integration/

aci-frontend/
├── src/
│   ├── types/
│   │   └── newsletter.ts          # TypeScript types
│   ├── services/api/
│   │   └── newsletter.ts          # API client
│   ├── hooks/
│   │   ├── useNewsletterConfig.ts
│   │   ├── useSegments.ts
│   │   ├── useContentSources.ts
│   │   └── useNewsletterAnalytics.ts
│   ├── components/newsletter/
│   │   ├── config/
│   │   ├── content/
│   │   ├── preview/
│   │   ├── approval/
│   │   └── analytics/
│   └── pages/
│       ├── NewsletterConfigPage.tsx
│       ├── NewsletterPreviewPage.tsx
│       ├── NewsletterApprovalPage.tsx
│       └── NewsletterAnalyticsPage.tsx
└── tests/
    ├── unit/
    └── e2e/
```

---

## Key Patterns

### 1. Guard Clause Pattern (No Nested Ifs)

```go
// WRONG - Nested ifs
func (s *NewsletterService) Generate(ctx context.Context, id uuid.UUID) error {
    if id != uuid.Nil {
        config, err := s.repo.GetByID(ctx, id)
        if err == nil {
            if config.IsActive {
                // do work
            }
        }
    }
    return nil
}

// CORRECT - Guard clauses
func (s *NewsletterService) Generate(ctx context.Context, id uuid.UUID) error {
    if id == uuid.Nil {
        return fmt.Errorf("configuration ID is required")
    }

    config, err := s.repo.GetByID(ctx, id)
    if err != nil {
        return fmt.Errorf("failed to get configuration: %w", err)
    }

    if !config.IsActive {
        return fmt.Errorf("configuration is not active")
    }

    // do work
    return nil
}
```

### 2. Repository Interface Pattern

```go
// interfaces.go
type NewsletterConfigRepository interface {
    Create(ctx context.Context, config *domain.NewsletterConfiguration) error
    GetByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterConfiguration, error)
    List(ctx context.Context, filter ConfigFilter) ([]*domain.NewsletterConfiguration, int, error)
    Update(ctx context.Context, config *domain.NewsletterConfiguration) error
    Delete(ctx context.Context, id uuid.UUID) error
}

// postgres/newsletter_repo.go
type PostgresNewsletterConfigRepo struct {
    db *sqlx.DB
}

func NewNewsletterConfigRepo(db *sqlx.DB) *PostgresNewsletterConfigRepo {
    return &PostgresNewsletterConfigRepo{db: db}
}
```

### 3. Service Layer Pattern

```go
type NewsletterConfigService struct {
    configRepo repository.NewsletterConfigRepository
    auditRepo  repository.AuditLogRepository
    logger     zerolog.Logger
}

func NewNewsletterConfigService(
    configRepo repository.NewsletterConfigRepository,
    auditRepo repository.AuditLogRepository,
    logger zerolog.Logger,
) *NewsletterConfigService {
    return &NewsletterConfigService{
        configRepo: configRepo,
        auditRepo:  auditRepo,
        logger:     logger,
    }
}
```

### 4. Frontend Hooks Pattern

```typescript
// useNewsletterConfig.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newsletterApi } from '@/services/api/newsletter';

const QUERY_KEYS = {
  configs: ['newsletter', 'configs'] as const,
  config: (id: string) => ['newsletter', 'config', id] as const,
};

export function useNewsletterConfigs() {
  return useQuery({
    queryKey: QUERY_KEYS.configs,
    queryFn: newsletterApi.getConfigurations,
  });
}

export function useNewsletterConfig(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.config(id),
    queryFn: () => newsletterApi.getConfiguration(id),
    enabled: !!id,
  });
}

export function useCreateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: newsletterApi.createConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.configs });
    },
  });
}
```

---

## API Endpoints Quick Reference

### Newsletter Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/newsletter/configs` | List configurations |
| POST | `/api/v1/newsletter/configs` | Create configuration |
| GET | `/api/v1/newsletter/configs/:id` | Get configuration |
| PUT | `/api/v1/newsletter/configs/:id` | Update configuration |
| DELETE | `/api/v1/newsletter/configs/:id` | Delete configuration |

### Segments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/newsletter/segments` | List segments |
| POST | `/api/v1/newsletter/segments` | Create segment |
| GET | `/api/v1/newsletter/segments/:id` | Get segment |
| GET | `/api/v1/newsletter/segments/:id/contacts` | Get segment contacts |

### Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/newsletter/content/sources` | List content sources |
| POST | `/api/v1/newsletter/content/sources` | Create content source |
| GET | `/api/v1/newsletter/content/items` | Search content items |
| POST | `/api/v1/newsletter/content/sync` | Trigger content sync |

### Newsletter Issues

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/newsletter/issues` | List issues |
| POST | `/api/v1/newsletter/issues/generate` | Generate new issue |
| GET | `/api/v1/newsletter/issues/:id` | Get issue details |
| GET | `/api/v1/newsletter/issues/:id/preview` | Preview with personalization |
| POST | `/api/v1/newsletter/issues/:id/approve` | Approve issue |
| POST | `/api/v1/newsletter/issues/:id/reject` | Reject issue |
| POST | `/api/v1/newsletter/issues/:id/send` | Send issue |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/newsletter/analytics/overview` | Dashboard overview |
| GET | `/api/v1/newsletter/analytics/segments/:id` | Segment metrics |
| GET | `/api/v1/newsletter/analytics/tests` | A/B test results |

---

## Testing

### Backend Unit Tests

```bash
cd aci-backend

# Run all newsletter tests
go test ./internal/service/newsletter_... -v

# Run with coverage
go test ./internal/... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

### Frontend Tests

```bash
cd aci-frontend

# Unit tests
npm test

# Contract tests
npm run test:contract

# E2E tests
npm run test:e2e
```

### Four-Case Test Template

```go
func TestNewsletterConfigService_Create(t *testing.T) {
    // Happy Path
    t.Run("creates configuration with valid input", func(t *testing.T) {
        // ...
    })

    // Fail Case
    t.Run("returns error for duplicate name", func(t *testing.T) {
        // ...
    })

    // Null Case
    t.Run("returns error for nil configuration", func(t *testing.T) {
        // ...
    })

    // Edge Case
    t.Run("handles maximum blocks limit", func(t *testing.T) {
        // ...
    })
}
```

---

## Common Tasks

### Add a New Content Source

```go
source := &domain.ContentSource{
    Name:               "Security Week",
    SourceType:         domain.SourceRSS,
    FeedURL:            ptr("https://securityweek.com/rss"),
    DefaultContentType: ptr("news"),
    DefaultTopicTags:   []string{"threat_intelligence", "security"},
    TrustScore:         0.85,
    IsInternal:         false,
}

err := contentService.CreateSource(ctx, source)
```

### Generate a Newsletter

```go
issue, err := generationService.Generate(ctx, GenerateRequest{
    ConfigurationID: configID,
    IssueDate:       time.Now(),
})
```

### Query Engagement Analytics

```go
metrics, err := analyticsService.GetSegmentMetrics(ctx, SegmentMetricsRequest{
    SegmentID: segmentID,
    DateFrom:  time.Now().AddDate(0, -1, 0),
    DateTo:    time.Now(),
})
```

---

## Environment Variables

### Backend (.env.local)

```bash
# Database
DATABASE_URL=postgres://user:pass@localhost:5432/aci_db

# Redis
REDIS_URL=redis://localhost:6379

# ZincSearch
ZINCSEARCH_URL=http://localhost:4080
ZINCSEARCH_USER=admin
ZINCSEARCH_PASSWORD=Complexpass#123

# AI Provider - OpenRouter (Meta Llama 70B) - PRIMARY
OPENROUTER_API_KEY=sk-or-v1-...  # Get from: https://openrouter.ai/keys
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct

# AI Provider - Anthropic (fallback)
ANTHROPIC_API_KEY=sk-ant-...    # Get from: https://console.anthropic.com/

# ESP Integration - HubSpot (PRIMARY)
HUBSPOT_API_KEY=pat-...         # Get from: https://app.hubspot.com/api-key
HUBSPOT_PORTAL_ID=12345678

# ESP Integration - Mailchimp (TESTING FALLBACK - Free tier)
MAILCHIMP_API_KEY=...           # Get from: https://mailchimp.com/developer/
MAILCHIMP_SERVER_PREFIX=us1     # e.g., us1, us2, etc.
```

### n8n Credential Setup

For n8n workflows, configure credentials in the n8n UI:

1. **OpenRouter** (for AI generation):
   - Go to n8n → Credentials → Add Credential → OpenRouter
   - API Key: Your OpenRouter key
   - Default Model: `meta-llama/llama-3.1-70b-instruct`

2. **HubSpot** (Primary ESP):
   - Go to n8n → Credentials → Add Credential → HubSpot
   - API Key: Your HubSpot Private App key
   - Scopes needed: `crm.objects.contacts.read`, `marketing.email.send`

3. **Mailchimp** (Testing fallback):
   - Go to n8n → Credentials → Add Credential → Mailchimp
   - API Key: Your Mailchimp API key
   - Server Prefix: Your datacenter (e.g., `us1`)

### Frontend (.env.local)

```bash
VITE_API_URL=http://localhost:8080
VITE_ENABLE_MSW=true  # Enable mock service worker for testing
```

---

## n8n Workflow Development

### Access n8n

```bash
# Via K8s port-forward
kubectl port-forward svc/n8n 5678:5678 -n aci-backend

# Open browser
open http://localhost:5678
```

### Import Workflow Templates

1. Open n8n UI
2. Go to Settings > Import/Export
3. Import from `n8n-workflows/newsletter-generation.json`

### Test Webhook

```bash
curl -X POST http://localhost:5678/webhook/newsletter-generate \
  -H "Content-Type: application/json" \
  -d '{"configuration_id": "uuid-here"}'
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is accessible
psql $DATABASE_URL -c "SELECT 1"

# Run pending migrations
make migrate-up
```

### Redis Connection Issues

```bash
# Check Redis is accessible
redis-cli -u $REDIS_URL ping
```

### n8n Workflow Errors

```bash
# Check n8n logs
kubectl logs -f deployment/n8n -n aci-backend
```

### Frontend Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run typecheck
```

---

## Contact

- **Spec**: [spec.md](./spec.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Research**: [research.md](./research.md)
- **API Contracts**: [contracts/newsletter-api.yaml](./contracts/newsletter-api.yaml)
