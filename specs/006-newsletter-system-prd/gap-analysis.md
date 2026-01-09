# Gap Analysis: PRD vs Current Implementation

**Spec ID:** 006-newsletter-system-prd
**Analysis Date:** 2026-01-08
**Analyst:** Claude Code
**Owner:** phillip.boles@armor.com

---

## Executive Summary

The current Armor Newsletter system has **strong foundational coverage** for core newsletter automation but has **significant gaps** in the VoC (Voice of Customer) capabilities and SME-specific workflow routing. The system is approximately **65% aligned** with the PRD requirements.

### Coverage Summary

| Category | PRD Requirements | Implemented | Gap % |
|----------|------------------|-------------|-------|
| Human Roles | 9 roles | 6 roles (partial) | 33% |
| AI Agents | 6 agents | 4 agents (partial) | 33% |
| Approval Workflow | SME-specific routing | Generic 5-gate | 40% |
| VoC Capabilities | Full VoC system | None | 100% |
| Analytics | Advanced insights | Basic metrics | 50% |
| Brand Compliance | Full system | Partial | 30% |

---

## 1. Human Roles Gap Analysis

### 1.1 Implemented Roles ✅

| PRD Role | Current Role | Status | Notes |
|----------|--------------|--------|-------|
| Strategic Owner (CMO) | `super_admin`, `admin` | ✅ Partial | Can approve but lacks editorial calendar feature |
| Product/Content Marketing | `marketing` | ✅ Partial | Basic content approval, missing editorial spine |
| Newsletter Editor/Copywriter | `marketing` | ✅ Partial | Combined with marketing, no dedicated role |
| Designer/Email UX | None | ❌ Missing | Template editing via generic admin |
| Marketing Ops/Email Specialist | `marketing` | ✅ Partial | Has segmentation, missing VoC-driven targeting |
| Data & Testing Lead | `analyst` | ✅ Partial | Basic analytics, missing framing tests |
| Security SME | `soc_level_1`, `soc_level_3` | ✅ Implemented | Dedicated security review gates |
| Compliance & Risk SME | None | ❌ Missing | No dedicated compliance role |
| VoC Expert | None | ❌ Missing | No VoC role or capabilities |

### 1.2 Current Role Definitions (from codebase)

```go
// internal/domain/user.go
const (
    RoleUser       UserRole = "user"
    RoleAdmin      UserRole = "admin"
    RoleAnalyst    UserRole = "analyst"
    RoleViewer     UserRole = "viewer"
    RoleMarketing  UserRole = "marketing"
    RoleBranding   UserRole = "branding"
    RoleSocLevel1  UserRole = "soc_level_1"
    RoleSocLevel3  UserRole = "soc_level_3"
    RoleCISO       UserRole = "ciso"
    RoleSuperAdmin UserRole = "super_admin"
)
```

### 1.3 Role Gaps

| Gap | Priority | Effort | Recommendation |
|-----|----------|--------|----------------|
| Add `compliance_sme` role | P1-Critical | Medium | New role with claims/disclaimer library access |
| Add `voc_expert` role | P1-Critical | Medium | New role with customer insights access |
| Add `designer` role | P2-High | Low | Template editing permissions |
| Add `editor` role | P3-Medium | Low | Separate from marketing for content focus |
| Editorial calendar feature | P2-High | High | New feature for strategic planning |

---

## 2. AI Agent Gap Analysis

### 2.1 Research Agent

| PRD Requirement | Current Implementation | Gap |
|-----------------|------------------------|-----|
| Crawl pre-approved sources | ✅ `newsletter-content-ingestion.json` workflow | None |
| Source whitelist/blacklist | ✅ `content_sources` table with enabled flag | None |
| Classify by theme | ✅ AI enrichment categorizes threats | None |
| Score for ICP fit | ⚠️ Basic `trust_score` field | Missing ICP-specific scoring |
| Summarize 5-10 candidates | ✅ Content selection logic | None |
| Flag "needs SME review" | ⚠️ Severity-based only | Missing technical depth flag |
| JSON output format | ✅ Structured API responses | None |

**Gap Score: 20%** - Minor enhancements needed for ICP scoring and SME flagging.

### 2.2 Content Agent

| PRD Requirement | Current Implementation | Gap |
|-----------------|------------------------|-----|
| Generate subject lines | ✅ `newsletter-generation.json` creates 3 variants | None |
| Generate preheaders | ✅ AI generates preheader text | None |
| Generate intro (problem framing) | ✅ Personalized intro per segment | None |
| Generate 2-3 content blocks | ✅ NewsletterBlock system | None |
| CTA copy aligned to funnel | ⚠️ Generic CTAs | Missing funnel-stage alignment |
| Multiple A/B variants | ✅ `test_variants` table | None |
| Tag blocks with theme/persona | ⚠️ Basic `content_type` metadata | Missing persona tagging |
| Claims list for SME check | ❌ Not implemented | Critical gap |
| Tokenized product messaging | ⚠️ Brand context exists | Missing structured proof points |

**Gap Score: 35%** - Missing funnel-aligned CTAs, claims tracking, and persona tagging.

### 2.3 Publish Agent

| PRD Requirement | Current Implementation | Gap |
|-----------------|------------------------|-----|
| Assemble modules via API | ✅ `DeliveryService` assembles | None |
| Auto-generate UTMs | ✅ UTM parameters in delivery | None |
| Broken link check | ❌ Not implemented | Missing |
| Missing preview text check | ❌ Not implemented | Missing |
| Image alt text check | ❌ Not implemented | Missing |
| Unsubscribe link check | ❌ Not implemented | Missing |
| Propose send time | ⚠️ Static send window | Missing historical optimization |
| QA report output | ❌ Not implemented | Critical gap |
| Human approval required | ✅ `pending_approval` status | None |
| No auto-modify approved copy | ✅ Approval workflow enforces | None |

**Gap Score: 45%** - Missing QA automation (link checks, preview validation, QA reports).

### 2.4 Analytics Agent

| PRD Requirement | Current Implementation | Gap |
|-----------------|------------------------|-----|
| Aggregate by issue/module | ✅ `AnalyticsService` | Partial - issue level only |
| Opens, clicks, unsubscribes | ✅ `engagement_events` table | None |
| Device tracking | ⚠️ In engagement data | Not surfaced in analytics |
| Join web analytics | ❌ Not implemented | Missing GA4/Mixpanel integration |
| Join pipeline data | ❌ Not implemented | Missing CRM attribution |
| Top/bottom decile analysis | ⚠️ Basic KPIs | Missing decile analysis |
| Correlated patterns | ❌ Not implemented | Missing pattern detection |
| Auto-generate test recommendations | ❌ Not implemented | Critical gap |
| Test backlog output | ❌ Not implemented | Critical gap |
| No automated list pruning | ✅ Manual only | None |

**Gap Score: 55%** - Missing advanced analytics, pattern detection, and test recommendations.

### 2.5 Branding Agent

| PRD Requirement | Current Implementation | Gap |
|-----------------|------------------------|-----|
| Score against voice guidelines | ✅ `BrandVoiceService.Validate()` | None |
| Flag off-brand words | ✅ Banned terms detection | None |
| Flag tone issues | ✅ Tone guideline checking | None |
| Suggest inline edits | ✅ Auto-correction suggestions | None |
| Brand compliance score | ✅ 0-100 scoring | None |
| Cannot alter claims | ✅ Routes to SME | None |
| Changes are suggestions | ✅ Human approval required | None |

**Gap Score: 10%** - Well implemented, minor enhancements possible.

### 2.6 Voice of Customer Agent

| PRD Requirement | Current Implementation | Gap |
|-----------------|------------------------|-----|
| Ingest call transcripts | ❌ Not implemented | Critical gap |
| Ingest QBR notes | ❌ Not implemented | Critical gap |
| Ingest win/loss data | ❌ Not implemented | Critical gap |
| Ingest support tickets | ❌ Not implemented | Critical gap |
| Tagging schema (pains, outcomes) | ❌ Not implemented | Critical gap |
| Extract recurring pains | ❌ Not implemented | Critical gap |
| Extract exact phrases | ❌ Not implemented | Critical gap |
| Map topics to pains | ❌ Not implemented | Critical gap |
| Replace jargon with customer phrases | ❌ Not implemented | Critical gap |
| Propose micro-stories/quotes | ❌ Not implemented | Critical gap |
| VoC notes per issue | ❌ Not implemented | Critical gap |
| Anonymize customer details | ❌ Not implemented | Critical gap |

**Gap Score: 100%** - VoC Agent does not exist. This is the largest gap in the system.

---

## 3. Approval Workflow Gap Analysis

### 3.1 Current Implementation

```
pending_marketing → pending_branding → pending_soc_l1 → pending_soc_l3 → pending_ciso → approved → released
```

### 3.2 PRD Requirements

```
Topic Selection → Content Creation → Branding Review → VoC Review → Security SME → Compliance SME → Final Approval
```

### 3.3 Workflow Gaps

| Gap | Current | Required | Priority |
|-----|---------|----------|----------|
| VoC review gate | None | VoC expert review | P1-Critical |
| Compliance SME gate | None | Compliance-specific review | P1-Critical |
| Topic selection gate | Implicit | Explicit strategic approval | P2-High |
| Claims routing | None | Auto-route claims to Compliance SME | P1-Critical |
| SME-specific queues | Generic queues | Role-specific review queues | P2-High |

### 3.4 Current vs Required Flow

```
CURRENT:
[Content Created] → Marketing → Branding → SOC L1 → SOC L3 → CISO → Released

REQUIRED:
[Research] → [Topic Selection] → [Content] → Branding → VoC → Security SME → Compliance SME → Final → Released
             ↑ Human              ↑ Human    ↑ Auto    ↑ Human  ↑ Human        ↑ Human         ↑ Human
```

---

## 4. Data Model Gaps

### 4.1 Missing Tables

| Table | Purpose | Priority |
|-------|---------|----------|
| `voc_insights` | Store customer insights, pains, phrases | P1-Critical |
| `voc_sources` | Configure Gong, Zendesk, CRM integrations | P1-Critical |
| `claims_library` | Pre-approved claims and disclaimers | P1-Critical |
| `editorial_calendar` | Strategic content planning | P2-High |
| `qa_reports` | Publish agent QA results | P2-High |
| `test_recommendations` | Analytics agent suggestions | P2-High |
| `icp_profiles` | ICP definitions for scoring | P2-High |

### 4.2 Missing Fields

| Table | Field | Purpose | Priority |
|-------|-------|---------|----------|
| `content_items` | `icp_fit_score` | ICP-specific relevance | P2-High |
| `content_items` | `sme_review_required` | Flag for SME routing | P2-High |
| `newsletter_blocks` | `persona_tags` | Target persona tagging | P2-High |
| `newsletter_blocks` | `funnel_stage` | CTA alignment | P2-High |
| `newsletter_blocks` | `claims_references` | Link to claims library | P1-Critical |
| `newsletter_issues` | `voc_notes` | VoC agent output | P1-Critical |
| `newsletter_issues` | `qa_report` | Publish agent output | P2-High |
| `users` | Role additions | `compliance_sme`, `voc_expert`, `designer` | P1-Critical |

---

## 5. Integration Gaps

### 5.1 VoC Data Sources (All Missing)

| Source | Integration | Status | Priority |
|--------|-------------|--------|----------|
| Gong | Call transcripts | ❌ Not implemented | P1-Critical |
| Chorus | Call transcripts | ❌ Not implemented | P1-Critical |
| Salesforce | CRM notes, win/loss | ❌ Not implemented | P1-Critical |
| HubSpot CRM | Contact insights | ⚠️ Delivery only | P1-Critical |
| Zendesk | Support tickets | ❌ Not implemented | P1-Critical |
| Intercom | Support tickets | ❌ Not implemented | P1-Critical |
| NPS/CSAT surveys | Survey responses | ❌ Not implemented | P2-High |
| Community | Forum discussions | ❌ Not implemented | P3-Medium |

### 5.2 Analytics Integrations (Partially Missing)

| Source | Integration | Status | Priority |
|--------|-------------|--------|----------|
| GA4 | Web analytics | ❌ Not implemented | P2-High |
| Mixpanel | Product analytics | ❌ Not implemented | P2-High |
| CRM Pipeline | Attribution | ❌ Not implemented | P1-Critical |
| ESP Metrics | Campaign data | ✅ Implemented | None |

---

## 6. Feature Gaps Summary

### 6.1 P1 - Critical Gaps (Must Have)

| # | Gap | Description | Effort |
|---|-----|-------------|--------|
| 1 | VoC Agent | Complete VoC system (agent, data model, integrations) | XL |
| 2 | VoC Expert Role | New role with VoC capabilities | M |
| 3 | Compliance SME Role | New role with claims library access | M |
| 4 | Claims Library | Pre-approved claims and disclaimer management | L |
| 5 | VoC Review Gate | Add VoC review to approval workflow | M |
| 6 | Compliance Review Gate | Add compliance review to approval workflow | M |
| 7 | Claims Tracking | Track which claims are used in content | M |
| 8 | CRM Attribution | Pipeline data integration for analytics | L |

### 6.2 P2 - High Priority Gaps

| # | Gap | Description | Effort |
|---|-----|-------------|--------|
| 9 | QA Automation | Link checking, preview validation, QA reports | M |
| 10 | ICP Scoring | ICP-specific content relevance scoring | M |
| 11 | Editorial Calendar | Strategic content planning feature | L |
| 12 | Designer Role | Dedicated template editing role | S |
| 13 | Funnel-aligned CTAs | CTA generation based on funnel stage | M |
| 14 | Persona Tagging | Tag content blocks by target persona | S |
| 15 | Test Recommendations | Auto-generate A/B test suggestions | M |
| 16 | GA4 Integration | Web analytics for journey tracking | M |

### 6.3 P3 - Nice to Have

| # | Gap | Description | Effort |
|---|-----|-------------|--------|
| 17 | Editor Role | Separate copywriter from marketing | S |
| 18 | Device Analytics | Surface device data in dashboard | S |
| 19 | Decile Analysis | Top/bottom performer identification | M |
| 20 | Pattern Detection | Correlate engagement with content attributes | L |
| 21 | Community Integration | Forum discussion ingestion for VoC | M |

---

## 7. Recommended Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Focus: Core VoC and Compliance Infrastructure**

1. Add new roles: `compliance_sme`, `voc_expert`, `designer`
2. Create `claims_library` table and CRUD API
3. Create `voc_insights` table and data model
4. Add claims tracking to content blocks
5. Add VoC and Compliance gates to approval workflow

**Deliverables:**
- New database migrations
- New API endpoints for claims management
- Updated approval workflow with 2 new gates
- Role-based access control updates

### Phase 2: VoC Agent (Weeks 5-8)

**Focus: Voice of Customer Agent Implementation**

1. Build VoC Agent n8n workflow
2. Integrate Gong/Chorus for call transcripts
3. Integrate CRM (Salesforce/HubSpot) for notes
4. Build pain/phrase extraction logic
5. Add VoC notes to newsletter issues

**Deliverables:**
- `newsletter-voc-agent.json` workflow
- VoC data ingestion pipeline
- VoC review UI in frontend
- Customer language suggestion system

### Phase 3: Enhanced Analytics (Weeks 9-12)

**Focus: Advanced Analytics and Testing**

1. GA4 integration for web journey tracking
2. CRM pipeline attribution
3. Decile analysis and pattern detection
4. Auto-generate test recommendations
5. Test backlog management

**Deliverables:**
- Analytics dashboard enhancements
- Pipeline attribution reports
- AI-generated test recommendations
- Test backlog UI

### Phase 4: QA and Polish (Weeks 13-16)

**Focus: Publish Agent QA and UX**

1. Automated link checking
2. Preview text validation
3. Image alt text verification
4. QA report generation
5. Editorial calendar feature
6. ICP fit scoring

**Deliverables:**
- QA automation in publish workflow
- Editorial calendar UI
- ICP profile management
- Complete PRD alignment

---

## 8. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| VoC integrations complexity | High | Medium | Start with one source (Gong), expand |
| Claims library adoption | Medium | High | Training + simple UX |
| Workflow disruption | High | Medium | Gradual rollout, parallel workflows |
| Data privacy (VoC) | High | Low | Strict anonymization, access controls |
| AI hallucination (VoC) | Medium | Medium | Human review mandatory, no fabrication |

---

## 9. Success Criteria

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| PRD Alignment | 65% | 95% | 16 weeks |
| VoC Coverage | 0% | 100% | 8 weeks |
| Compliance Coverage | 30% | 100% | 4 weeks |
| QA Automation | 0% | 100% | 16 weeks |
| Analytics Depth | 50% | 90% | 12 weeks |

---

## 10. Appendix: Current vs Required Feature Matrix

| Feature | PRD | Current | Gap |
|---------|-----|---------|-----|
| Research Agent | ✅ | ✅ | 20% |
| Content Agent | ✅ | ⚠️ | 35% |
| Publish Agent | ✅ | ⚠️ | 45% |
| Analytics Agent | ✅ | ⚠️ | 55% |
| Branding Agent | ✅ | ✅ | 10% |
| VoC Agent | ✅ | ❌ | 100% |
| Strategic Owner Role | ✅ | ⚠️ | 30% |
| Content Marketing Role | ✅ | ⚠️ | 40% |
| Editor Role | ✅ | ⚠️ | 50% |
| Designer Role | ✅ | ❌ | 100% |
| Marketing Ops Role | ✅ | ⚠️ | 30% |
| Data Lead Role | ✅ | ⚠️ | 50% |
| Security SME Role | ✅ | ✅ | 0% |
| Compliance SME Role | ✅ | ❌ | 100% |
| VoC Expert Role | ✅ | ❌ | 100% |
| Claims Library | ✅ | ❌ | 100% |
| Editorial Calendar | ✅ | ❌ | 100% |
| Multi-gate Approval | ✅ | ⚠️ | 40% |
| A/B Testing | ✅ | ✅ | 10% |
| ESP Integration | ✅ | ✅ | 0% |
| Engagement Tracking | ✅ | ✅ | 10% |
| Web Analytics Integration | ✅ | ❌ | 100% |
| CRM Attribution | ✅ | ❌ | 100% |

---

**Overall Gap Assessment: 35% of PRD requirements are not yet implemented.**

The most critical gaps are:
1. **VoC Agent (100% gap)** - No customer voice capabilities
2. **Compliance SME Role (100% gap)** - No claims/disclaimer management
3. **VoC Expert Role (100% gap)** - No customer insights specialist
4. **Claims Library (100% gap)** - No pre-approved messaging repository
5. **Web Analytics Integration (100% gap)** - No GA4/journey tracking
6. **CRM Attribution (100% gap)** - No pipeline attribution

**Recommendation:** Prioritize Phase 1 (Foundation) immediately to establish the VoC and Compliance infrastructure that everything else depends on.
