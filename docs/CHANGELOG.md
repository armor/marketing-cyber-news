# Changelog

All notable changes to the Armor Newsletter project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Marketing Autopilot feature (Spec 005)
  - Campaign management (create, launch, pause, resume, stop)
  - Content Studio with AI generation
  - Channel connections with OAuth
  - Competitor monitoring
  - Marketing analytics dashboard
  - Calendar management
  - Brand Center

### Changed
- Updated CLAUDE.md with Gang of Four patterns, SOLID, DRY, and no-nested-if rules
- Added mandatory code-reviewer and security-reviewer gates

### Fixed
- Frontend API URL configuration for Kubernetes deployment
- Password hash in seed data for test accounts

---

## [0.4.0] - 2026-01-08

### Added
- AI Newsletter Automation (Spec 004)
  - Newsletter configuration management
  - Content source (RSS) management
  - AI-powered content generation with Claude
  - Newsletter preview and editing
  - Subject line optimization
  - Brand voice validation
  - Multi-segment content distribution
  - Email delivery via n8n workflows
  - Engagement tracking (opens, clicks)

### Changed
- Enhanced approval workflow to support newsletter issues
- Added newsletter-specific n8n workflows

### Security
- Added HMAC validation for n8n webhooks
- Implemented rate limiting on newsletter endpoints

---

## [0.3.0] - 2026-01-08

### Added
- Article Approval Workflow (Spec 003)
  - Multi-stage approval: Submit → Approve → Release
  - Role-based permissions (admin, approver, release_manager)
  - Approval history tracking
  - Rejection with comments
  - Real-time status updates via WebSocket

### Changed
- Refactored article service to support approval states
- Added approval_requests table with state machine

### Fixed
- WebSocket reconnection on network interruption

---

## [0.2.0] - 2025-12-13

### Added
- React Frontend (Spec 002)
  - Dashboard with threat summary
  - Threat list with filtering and search
  - Threat detail pages with deep dives
  - Bookmarks and read history
  - User statistics
  - Authentication (login/logout)
  - Responsive design with shadcn/ui

### Changed
- Adopted TanStack Query for server state
- Implemented react-router-dom v7 for routing

### Tech Stack
- React 19.2
- TypeScript 5.9
- Vite 7.2
- shadcn/ui (Radix + Tailwind)

---

## [0.1.0] - 2025-12-11

### Added
- Core Backend (Spec 001)
  - Go 1.24 REST API server
  - PostgreSQL database with migrations
  - JWT authentication (RS256)
  - Threat intelligence aggregation
  - Article management
  - User management
  - Alert system
  - WebSocket support
  - Health check endpoints

### Infrastructure
- Docker containerization
- Kubernetes manifests (Kustomize)
- GitHub Actions CI/CD
- OCI/OKE deployment support

### Security
- Input validation
- Parameterized SQL queries
- CORS configuration
- Rate limiting

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 0.4.0 | 2026-01-08 | AI Newsletter Automation |
| 0.3.0 | 2026-01-08 | Article Approval Workflow |
| 0.2.0 | 2025-12-13 | React Frontend |
| 0.1.0 | 2025-12-11 | Core Backend |

---

## Migration Notes

### Upgrading to 0.4.0
```bash
# Apply newsletter migrations
psql $DATABASE_URL -f aci-backend/migrations/000008_newsletter_system.up.sql

# Deploy n8n workflows
# Import workflows from n8n-workflows/ directory
```

### Upgrading to 0.3.0
```bash
# Apply approval workflow migration
psql $DATABASE_URL -f aci-backend/migrations/000007_approval_workflow.up.sql
```

---

*For detailed commit history, see `git log --oneline`*
