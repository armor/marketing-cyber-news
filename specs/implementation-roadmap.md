# Armor Cyber Intelligence (ACI) - Implementation Roadmap

## Overview

This document outlines the implementation roadmap for the Armor Cyber Intelligence (ACI) backend service. The project follows a 4-phase approach over 10 weeks, with clear deliverables and testing gates at each phase.

## Technology Stack Summary

| Component | Technology | Version | Notes |
|-----------|------------|---------|-------|
| Language | Go | 1.25+ | Latest: 1.25.5 (Dec 2025) |
| HTTP Router | Chi | v5.0.12 | Go 1.22+ mux routing support |
| Database | PostgreSQL | 18+ | Latest: 18.1 (Nov 2025) |
| Vector Search | pgvector | 0.8.1 | HNSW indexes, halfvec support |
| WebSocket | gorilla/websocket | v1.5.1 | RFC 6455 compliant |
| Logging | zerolog | v1.33+ | Zero allocation JSON logger |
| Validation | go-playground/validator | v10.28.0 | Go 1.25 support |
| JWT | golang-jwt | v5 | RS256, ES256 support |
| AI | Anthropic Claude | claude-4.5-sonnet | Official Go SDK |
| Workflows | n8n | 2.0.0 | Task runners, security hardening |
| DB Migrations | golang-migrate | v4.19.1 | PostgreSQL driver support |
| DB Driver | pgx | v5 | High-performance PostgreSQL |

---

## Phase 1: Foundation (Weeks 1-2)

### Goals
- Establish project structure and development environment
- Implement core database schema and migrations
- Set up authentication system
- Create health and status endpoints

### Week 1: Project Setup & Database

#### Sprint 1.1: Project Bootstrap
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Initialize Go module and directory structure | P0 | 4 | None |
| Configure development environment (Docker, Make) | P0 | 4 | None |
| Set up PostgreSQL with pgvector extension | P0 | 4 | Docker setup |
| Implement configuration loading (env, yaml) | P0 | 4 | Project init |
| Set up zerolog with structured logging | P1 | 2 | Config |
| Create Makefile with common commands | P1 | 2 | Project init |

#### Sprint 1.2: Database Foundation
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Create migration framework (golang-migrate) | P0 | 4 | PostgreSQL |
| Implement users table migration | P0 | 4 | Migration framework |
| Implement refresh_tokens table | P0 | 2 | Users table |
| Implement user_preferences table | P0 | 2 | Users table |
| Create database connection pool (pgx) | P0 | 4 | PostgreSQL |
| Implement repository base patterns | P0 | 4 | Connection pool |

### Week 2: Authentication

#### Sprint 2.1: JWT Authentication
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Implement JWT service (RS256 signing) | P0 | 8 | Config |
| Create access token generation/validation | P0 | 4 | JWT service |
| Create refresh token rotation logic | P0 | 4 | JWT service |
| Implement user repository | P0 | 4 | Database layer |
| Create password hashing service (bcrypt) | P0 | 2 | None |

#### Sprint 2.2: Auth Endpoints
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| POST /v1/auth/register endpoint | P0 | 4 | User repo, JWT |
| POST /v1/auth/login endpoint | P0 | 4 | User repo, JWT |
| POST /v1/auth/refresh endpoint | P0 | 4 | Token rotation |
| POST /v1/auth/logout endpoint | P0 | 2 | Token repo |
| Auth middleware implementation | P0 | 4 | JWT validation |
| GET /health and /ready endpoints | P0 | 2 | None |

### Phase 1 Testing Requirements

```go
// Required test coverage for Phase 1
- Unit tests for JWT service (signing, validation, expiry)
- Unit tests for password hashing
- Integration tests for auth endpoints
- Database integration tests for user repository
- Failure tests: invalid tokens, expired tokens, wrong passwords
- Null/empty state tests: missing fields, empty requests
```

### Phase 1 Deliverables
- [ ] Running Go application with Chi router
- [ ] PostgreSQL database with core schema
- [ ] Working authentication flow (register, login, refresh, logout)
- [ ] Health check endpoints
- [ ] 80%+ test coverage on auth module

---

## Phase 2: Core Content (Weeks 3-5)

### Goals
- Implement article storage and retrieval
- Set up category and source management
- Create n8n webhook integration
- Build content filtering system

### Week 3: Content Schema

#### Sprint 3.1: Sources & Categories
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Implement sources table migration | P0 | 4 | Migration framework |
| Implement categories table migration | P0 | 4 | Migration framework |
| Create source repository | P0 | 4 | Database layer |
| Create category repository | P0 | 4 | Database layer |
| Seed initial categories (8 cyber categories) | P0 | 2 | Category repo |
| Seed initial sources (10 trusted sources) | P0 | 2 | Source repo |

#### Sprint 3.2: Articles Table
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Implement articles table migration | P0 | 6 | Sources, Categories |
| Create article repository (CRUD operations) | P0 | 8 | Database layer |
| Implement full-text search with ts_vector | P0 | 6 | Articles table |
| Implement semantic search with pgvector | P1 | 6 | pgvector extension |

### Week 4: Content APIs

#### Sprint 4.1: Article Endpoints
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| GET /v1/articles (list with pagination) | P0 | 6 | Article repo |
| GET /v1/articles/:id (single article) | P0 | 2 | Article repo |
| GET /v1/articles/search endpoint | P0 | 6 | Full-text search |
| GET /v1/articles/feed (personalized feed) | P1 | 6 | User prefs |
| Implement response DTOs and transformers | P0 | 4 | None |

#### Sprint 4.2: Category & Source Endpoints
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| GET /v1/categories endpoint | P0 | 2 | Category repo |
| GET /v1/categories/:slug endpoint | P0 | 2 | Category repo |
| GET /v1/sources endpoint | P0 | 2 | Source repo |
| GET /v1/sources/:id endpoint | P0 | 2 | Source repo |

### Week 5: n8n Integration

#### Sprint 5.1: Webhook System
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Implement HMAC-SHA256 signature verification | P0 | 4 | Config |
| POST /v1/webhooks/n8n endpoint | P0 | 6 | Signature verify |
| Handle article.created event | P0 | 4 | Article repo |
| Handle article.updated event | P0 | 2 | Article repo |
| Handle bulk.import event | P0 | 4 | Article repo |
| Implement webhook_logs table and logging | P0 | 4 | Database layer |

#### Sprint 5.2: Content Filtering
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Implement competitor detection service | P0 | 8 | Config |
| Create competitor keyword dictionary | P0 | 4 | None |
| Implement Armor.com relevance scoring | P0 | 6 | None |
| Build CTA injection service | P1 | 4 | Armor scoring |
| Implement content moderation flags | P1 | 4 | Article repo |

### Phase 2 Testing Requirements

```go
// Required test coverage for Phase 2
- Unit tests for competitor detection (known competitors, edge cases)
- Unit tests for relevance scoring algorithm
- Integration tests for article CRUD operations
- Integration tests for search (full-text and semantic)
- Webhook signature verification tests
- Bulk import stress tests (1000+ articles)
- Content filtering edge cases
```

### Phase 2 Deliverables
- [ ] Full article management system
- [ ] Category and source management
- [ ] Working n8n webhook integration
- [ ] Content filtering with competitor detection
- [ ] Full-text and semantic search
- [ ] 80%+ test coverage on content module

---

## Phase 3: Real-time & Alerts (Weeks 6-8)

### Goals
- Implement WebSocket infrastructure
- Build alert system with matching
- Add user engagement features (bookmarks, read tracking)
- Implement statistics and analytics

### Week 6: WebSocket Infrastructure

#### Sprint 6.1: WebSocket Hub
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Implement WebSocket hub (connection manager) | P0 | 8 | None |
| Create client connection handler | P0 | 6 | Hub |
| Implement JWT authentication for WS | P0 | 4 | JWT service |
| Build message router | P0 | 4 | Hub |
| Implement ping/pong heartbeat | P0 | 2 | Client handler |

#### Sprint 6.2: Subscriptions
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Implement channel subscription system | P0 | 6 | Hub |
| articles:all channel | P0 | 2 | Subscription system |
| articles:critical channel | P0 | 2 | Subscription system |
| articles:category:{slug} channels | P0 | 4 | Subscription system |
| Broadcast service for new articles | P0 | 4 | Hub |

### Week 7: Alert System

#### Sprint 7.1: Alert Management
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Implement alerts table migration | P0 | 4 | Migration framework |
| Create alert repository | P0 | 4 | Database layer |
| POST /v1/alerts endpoint | P0 | 4 | Alert repo |
| GET /v1/alerts endpoint | P0 | 2 | Alert repo |
| PATCH /v1/alerts/:id endpoint | P0 | 2 | Alert repo |
| DELETE /v1/alerts/:id endpoint | P0 | 2 | Alert repo |

#### Sprint 7.2: Alert Matching
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Implement alert matching service | P0 | 8 | Alert repo |
| Keyword matching logic | P0 | 4 | Matching service |
| Category/severity matching | P0 | 4 | Matching service |
| Implement alert_matches table | P0 | 4 | Database layer |
| Real-time alert notifications via WS | P0 | 4 | WebSocket hub |
| alerts:user channel implementation | P0 | 4 | Subscription system |

### Week 8: User Engagement

#### Sprint 8.1: Bookmarks & Read Tracking
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Implement bookmarks table migration | P0 | 2 | Migration framework |
| POST /v1/articles/:id/bookmark endpoint | P0 | 2 | Bookmark repo |
| DELETE /v1/articles/:id/bookmark endpoint | P0 | 2 | Bookmark repo |
| GET /v1/users/me/bookmarks endpoint | P0 | 4 | Bookmark repo |
| Implement article_reads table | P0 | 2 | Migration framework |
| POST /v1/articles/:id/read endpoint | P0 | 2 | Read tracking repo |

#### Sprint 8.2: Statistics
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Implement daily_stats table migration | P0 | 4 | Migration framework |
| Create stats aggregation service | P0 | 6 | Database layer |
| GET /v1/stats/dashboard endpoint | P0 | 4 | Stats service |
| GET /v1/stats/categories endpoint | P0 | 4 | Stats service |
| GET /v1/stats/trends endpoint | P1 | 6 | Stats service |
| Scheduled stats aggregation job | P1 | 4 | Stats service |

### Phase 3 Testing Requirements

```go
// Required test coverage for Phase 3
- WebSocket connection tests (connect, auth, disconnect)
- Subscription tests (subscribe, unsubscribe, broadcast)
- Alert matching unit tests (all match types)
- Real-time notification integration tests
- Concurrent connection stress tests (100+ connections)
- Bookmark and read tracking tests
- Statistics aggregation tests
- Disconnection recovery tests
```

### Phase 3 Deliverables
- [ ] Production-ready WebSocket infrastructure
- [ ] Complete alert system with real-time notifications
- [ ] User engagement features (bookmarks, read tracking)
- [ ] Statistics and analytics endpoints
- [ ] 80%+ test coverage on real-time module

---

## Phase 4: AI & Production (Weeks 9-10)

### Goals
- Integrate Claude AI for content enrichment
- Build admin endpoints
- Production hardening and security
- Performance optimization

### Week 9: AI Integration

#### Sprint 9.1: Claude Integration
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Implement Anthropic client wrapper | P0 | 4 | Config |
| Create AI enrichment service | P0 | 8 | Anthropic client |
| Implement threat analysis generation | P0 | 6 | AI service |
| Implement Armor CTA generation | P0 | 4 | AI service |
| Handle enrichment.complete webhook event | P0 | 4 | Webhook handler |

#### Sprint 9.2: AI Processing Pipeline
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Build article enrichment queue | P0 | 6 | AI service |
| Implement rate limiting for Claude API | P0 | 4 | AI service |
| Create embedding generation for semantic search | P0 | 6 | pgvector |
| Implement AI analysis caching | P1 | 4 | Redis optional |

### Week 10: Production Readiness

#### Sprint 10.1: Admin & Security
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Admin article management endpoints | P0 | 6 | Admin middleware |
| Admin user management endpoints | P0 | 4 | Admin middleware |
| Admin source management endpoints | P0 | 4 | Admin middleware |
| Implement audit_logs table and logging | P0 | 4 | Database layer |
| Rate limiting middleware | P0 | 4 | Chi middleware |
| Request ID and correlation tracking | P0 | 2 | Middleware |

#### Sprint 10.2: Production Hardening
| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Implement graceful shutdown | P0 | 4 | None |
| Database connection pool tuning | P0 | 2 | pgx config |
| Add Prometheus metrics endpoint | P1 | 4 | None |
| Create Kubernetes manifests | P1 | 6 | Docker image |
| Load testing and optimization | P0 | 8 | All systems |
| Security audit and fixes | P0 | 8 | All systems |

### Phase 4 Testing Requirements

```go
// Required test coverage for Phase 4
- AI service unit tests (with mocked Claude responses)
- Embedding generation tests
- Admin endpoint authorization tests
- Rate limiting tests
- Graceful shutdown tests
- Load tests (target: 1000 req/s, 500 concurrent WS)
- Security penetration testing
- End-to-end integration tests
```

### Phase 4 Deliverables
- [ ] Full Claude AI integration
- [ ] Admin management endpoints
- [ ] Production-ready deployment configuration
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] 80%+ overall test coverage

---

## Dependency Graph

```
Phase 1: Foundation
├── Project Setup
│   └── Database Setup
│       └── Migration Framework
│           ├── Users Table
│           │   ├── Refresh Tokens Table
│           │   └── User Preferences Table
│           └── JWT Service
│               └── Auth Endpoints

Phase 2: Core Content
├── Sources Table (depends: Migration Framework)
├── Categories Table (depends: Migration Framework)
└── Articles Table (depends: Sources, Categories)
    ├── Article Endpoints
    ├── Search Implementation
    └── n8n Webhook Integration
        └── Content Filtering

Phase 3: Real-time & Alerts
├── WebSocket Hub (depends: JWT Service)
│   └── Subscription System
│       └── Broadcast Service
├── Alert System (depends: Articles)
│   └── Alert Matching
│       └── Real-time Notifications (depends: WebSocket)
└── User Engagement (depends: Articles, Users)

Phase 4: AI & Production
├── Claude Integration (depends: Articles, Content Filtering)
│   └── AI Processing Pipeline
├── Admin Endpoints (depends: All CRUD operations)
└── Production Hardening (depends: All systems)
```

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| pgvector performance at scale | High | Medium | Index tuning, query optimization, fallback to full-text |
| WebSocket connection limits | High | Low | Horizontal scaling, connection pooling |
| Claude API rate limits | Medium | Medium | Queue system, caching, rate limiting |
| n8n webhook reliability | Medium | Low | Retry logic, dead letter queue |

### Schedule Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Authentication complexity | Medium | Low | Use proven JWT patterns |
| Content filtering edge cases | Medium | Medium | Iterative refinement, allow manual overrides |
| WebSocket debugging | Medium | Medium | Comprehensive logging, test tooling |

---

## Testing Strategy

### Test Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  10%
                    │   Tests     │
                    ├─────────────┤
                    │ Integration │  30%
                    │    Tests    │
                    ├─────────────┤
                    │    Unit     │  60%
                    │    Tests    │
                    └─────────────┘
```

### Testing Tools

| Type | Tool | Purpose |
|------|------|---------|
| Unit | Go testing + testify | Business logic testing |
| Integration | testcontainers-go | Database integration |
| API | httptest | HTTP endpoint testing |
| WebSocket | gorilla/websocket | WS connection testing |
| Load | k6 | Performance testing |
| Security | gosec | Static security analysis |

### Coverage Requirements

- Phase gate: 80% coverage required before proceeding
- Critical paths: 90% coverage (auth, content filtering, alerts)
- New code: Must include tests in same PR

---

## Definition of Done

### Per Feature
- [ ] Code implemented and compiles
- [ ] Unit tests written and passing
- [ ] Integration tests where applicable
- [ ] Code reviewed (if team)
- [ ] Documentation updated
- [ ] No critical security issues (gosec)

### Per Phase
- [ ] All features complete
- [ ] 80%+ test coverage
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] API documentation updated
- [ ] Deployment tested in staging

### Project Complete
- [ ] All phases delivered
- [ ] End-to-end tests passing
- [ ] Load testing passed (1000 req/s)
- [ ] Security audit completed
- [ ] Production deployment successful
- [ ] Monitoring and alerting configured
- [ ] Runbook documentation complete

---

## Quick Reference: Sprint Timeline

| Week | Sprint | Focus | Key Deliverable |
|------|--------|-------|-----------------|
| 1 | 1.1-1.2 | Setup & Database | Running app with migrations |
| 2 | 2.1-2.2 | Authentication | Complete auth flow |
| 3 | 3.1-3.2 | Content Schema | Articles, categories, sources |
| 4 | 4.1-4.2 | Content APIs | Full article CRUD + search |
| 5 | 5.1-5.2 | n8n Integration | Webhook processing + filtering |
| 6 | 6.1-6.2 | WebSocket | Real-time infrastructure |
| 7 | 7.1-7.2 | Alerts | Alert system + matching |
| 8 | 8.1-8.2 | Engagement | Bookmarks, stats |
| 9 | 9.1-9.2 | AI Integration | Claude enrichment |
| 10 | 10.1-10.2 | Production | Security, performance, deploy |

---

## Appendix: Environment Setup Checklist

### Development Environment

```bash
# Prerequisites
- Go 1.25+ (latest: 1.25.5)
- Docker & Docker Compose
- Make
- PostgreSQL 18+ client (psql)

# Initial Setup
git clone <repo>
cd armor-cyber-intel
make setup        # Install tools
make docker-up    # Start PostgreSQL
make migrate-up   # Run migrations
make seed         # Load seed data
make run          # Start server
make test         # Run all tests
```

### Environment Variables

```bash
# Required
DATABASE_URL=postgres://user:pass@localhost:5432/aci?sslmode=disable
JWT_PRIVATE_KEY_PATH=/path/to/private.pem
JWT_PUBLIC_KEY_PATH=/path/to/public.pem
N8N_WEBHOOK_SECRET=<shared-secret>
ANTHROPIC_API_KEY=<claude-api-key>

# Optional
SERVER_PORT=8080
LOG_LEVEL=debug
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

*Last Updated: Generated by ACI Planning Session*
*Version: 1.0.0*
