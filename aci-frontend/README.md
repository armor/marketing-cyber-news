# Armor Cyber Intelligence Frontend

A React-based cybersecurity intelligence platform with AI-powered newsletter automation, threat monitoring, and approval workflows.

## Tech Stack

- **React 19** with TypeScript 5.9
- **Vite 7.2** for fast development and builds
- **TanStack Query v5** for data fetching and caching
- **shadcn/ui** (Radix UI + Tailwind CSS) for components
- **React Router DOM v7** for routing
- **Playwright** for E2E testing
- **MSW** for API mocking

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

## Newsletter Automation (Spec 004)

The AI Newsletter Automation feature enables automated generation, approval, and delivery of cybersecurity newsletters.

### Features

| Feature | Description | Route |
|---------|-------------|-------|
| **Configuration** | Create and manage newsletter templates | `/newsletter/configs` |
| **Preview** | Preview generated newsletter content | `/newsletter/preview` |
| **Approval** | Multi-stage approval workflow | `/newsletter/approval` |
| **Analytics** | Engagement metrics and performance | `/newsletter/analytics` |
| **Content** | Manage content sources and items | `/newsletter/content` |

### User Stories Implemented

- **US1**: Newsletter Configuration Management (P1)
- **US2**: AI Content Generation (P1)
- **US3**: A/B Testing with deterministic hash-based variants (P2)
- **US4**: Multi-stage Approval Workflow (P2)
- **US5**: Email Delivery via HubSpot/Mailchimp/SMTP (P2)
- **US6**: Engagement Tracking webhooks (P3)
- **US7**: Analytics Dashboard (P3)
- **US8**: Content Source Management (P3)

### n8n Workflow Integration

The newsletter system integrates with 7 n8n workflows:

| Workflow | Purpose |
|----------|---------|
| `newsletter-content-ingestion.json` | Ingest content from RSS/API sources |
| `newsletter-generation.json` | AI-powered newsletter generation |
| `newsletter-approval.json` | Approval workflow automation |
| `newsletter-delivery-hubspot.json` | HubSpot email delivery |
| `newsletter-delivery-mailchimp.json` | Mailchimp email delivery |
| `newsletter-delivery-smtp.json` | Direct SMTP delivery |
| `engagement-webhook.json` | Track opens, clicks, engagement |

See `n8n-workflows/README.md` for setup instructions.

### Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| SC-009: Config setup | <30 min | Verified |
| SC-010: Generation time | <5 min | Verified |
| Analytics page load | <3 sec | Verified (1.0-1.2s) |
| API response (P95) | <200ms | Verified |

## Testing

### E2E Regression Suite

```bash
# Run full newsletter regression (81 tests)
npm run test:e2e:regression

# Run newsletter-specific tests
npm run test:e2e:newsletter

# View HTML report
npm run test:e2e:report
```

### Performance Tests

Performance tests require a running backend:

```bash
# Ensure backend is running on localhost:8080
npm run test:performance
```

### Test Reports

- HTML Report: `tests/reports/playwright-html/index.html`
- JSON Results: `tests/reports/playwright-results.json`
- Regression Report: `tests/reports/REGRESSION-REPORT-004.md`

## Project Structure

```
src/
├── components/
│   ├── newsletter/       # Newsletter-specific components
│   ├── approval/         # Approval workflow components
│   └── ui/               # shadcn/ui components
├── hooks/
│   ├── useNewsletterConfig.ts
│   ├── useIssues.ts
│   ├── useSegments.ts
│   └── useNewsletterAnalytics.ts
├── pages/
│   ├── NewsletterConfigPage.tsx
│   ├── NewsletterPreviewPage.tsx
│   ├── NewsletterApprovalPage.tsx
│   ├── NewsletterAnalyticsPage.tsx
│   └── NewsletterContentPage.tsx
├── services/api/
│   └── newsletter.ts     # Newsletter API client
└── types/
    └── newsletter.ts     # TypeScript interfaces

tests/
├── e2e/
│   └── newsletter-master-regression.spec.ts
└── performance/
    └── newsletter-performance.spec.ts
```

## Development

### ESLint Configuration

For production applications, enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```

## Related Documentation

- [n8n Workflows README](../n8n-workflows/README.md)
- [Spec 004 PM Signoff](../specs/004-ai-newsletter-automation/PM-SIGNOFF.md)
- [Backend API Docs](../aci-backend/README.md)
