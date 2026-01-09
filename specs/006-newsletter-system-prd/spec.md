# PRD: B2B Cybersecurity Newsletter System

**Spec ID:** 006-newsletter-system-prd
**Status:** Active
**Owner:** phillip.boles@armor.com
**Created:** 2026-01-08
**Version:** 1.0

---

## 1. Executive Summary

A B2B cybersecurity newsletter platform with 6-8 clearly defined roles and AI agents implemented as reusable n8n sub-workflows. The system ensures issues are grounded in real buyer pains and language through a Voice of the Customer (VoC) expert role.

---

## 2. Human Roles & Responsibilities

### 2.1 Strategic Owner (CMO / Head of Marketing)

**Responsibilities:**
- Set objectives (pipeline, brand authority, customer expansion)
- Define which security, compliance, and risk themes matter most to the ICP and segments
- Approve the editorial calendar
- Sign off on issues where risk/regulatory positioning or big customer narratives are material

### 2.2 Product / Content Marketing

**Responsibilities:**
- Own the editorial spine: recurring sections mapped to threats, compliance, and risk
- Ground content in what customers actually struggle with (audits, evidence, board questions, tool sprawl)
- Translate SME and VoC inputs into narratives and assets
- Show how the solution helps without drifting into generic "we secure everything" claims

### 2.3 Newsletter Editor / Copywriter

**Responsibilities:**
- Draft subject lines, intros, and CTAs that emphasize education and risk reduction
- Write in customer language surfaced by the VoC expert
- Use checklists for both claims risk (Compliance & Risk SME) and customer resonance (VoC expert) before send

### 2.4 Designer / Email UX

**Responsibilities:**
- Maintain modular templates that keep complex security and compliance topics skimmable
- Visually separate educational content from disclosures
- Highlight customer-oriented elements (quotes, mini case snippets, "what your peers are doing") in consistent visual patterns suggested by the VoC expert

### 2.5 Marketing Operations / Email Specialist

**Responsibilities:**
- Manage segmentation, cadence, and automation
- Use VoC insights to drive smarter targeting (e.g., segments by maturity, framework focus, or role)
- Own the approval workflow routing: content passes through Security SME, Compliance & Risk SME, and VoC expert as required before final scheduling

### 2.6 Data & Testing Lead

**Responsibilities:**
- Track engagement and list health plus behavioral patterns by segment
- Identify which topics/angles customers click and which they ignore
- Test framing types informed by VoC (problem-first vs. framework-first vs. peer-story-first)
- Keep approved claims and disclaimers static during tests

### 2.7 Security SME

**Responsibilities:**
- Provide timely inputs on emerging threats, vulnerabilities, and operational realities the product addresses
- Adapt content for CISOs, CTOs, and security leaders
- Validate technical accuracy around controls, detection, response, and architecture

### 2.8 Compliance & Risk SME

**Responsibilities:**
- Own accuracy on regulatory frameworks, certifications, audit outcomes, and compliance promises
- Maintain a library of pre-approved claims, disclaimers, and "do/don't say" examples that marketing can safely reuse

### 2.9 Voice of the Customer (VoC) Expert

**Responsibilities:**
- Aggregate customer insights from calls, win/loss, NPS, CSAT, community, and sales notes
- Translate insights into prioritized themes, objections, and exact phrases for the newsletter to echo
- Guide topic selection and angles: which pains, use cases, and outcomes matter most to specific segments
- Identify which proof (quotes, micro-case studies, anonymized stories) will resonate
- Review drafts for customer truth and clarity:
  - Does this issue speak to real situations customers describe, in their own words?
  - Are promises aligned with lived customer outcomes and referenceable stories?

---

## 3. AI Agent Requirements

Each AI "agent" is a reusable n8n sub-workflow with clear inputs/outputs, guardrails, and handoffs.

### 3.1 Research Agent

**Goal:** Continuously surface high-signal, credible topics and sources for the newsletter.

**Inputs:**
- ICP + segment (role, industry, maturity)
- Current big themes (e.g., ransomware, NERC CIP, AI risk)
- Source whitelist/blacklist (sites allowed, sites banned)

**Core Actions:**
- Crawl pre-approved sources (trusted cyber, compliance, cloud security sites) and summarize 5-10 candidate stories per cycle
- Classify each story by theme (threat, compliance, architecture, cloud, board/exec, etc.)
- Score stories for "fit" based on ICP, recency, and overlap with existing Armor content

**Outputs:**
- Structured JSON list: title, summary, URL, theme, fit score, suggested angle
- Flags for "needs SME review" if technical/compliance depth is high

**Guardrails:**
- Only from whitelisted domains
- Never claim product capabilities; stick to neutral summaries

### 3.2 Content Agent

**Goal:** Turn approved topics into on-brand newsletter modules.

**Inputs:**
- Research agent output (selected items)
- Brand voice rules and banned phrases
- Tokenized product messaging (core value props, proof points)

**Core Actions:**
- Generate:
  - Subject line options and preheaders
  - Short intro (problem framing) and 2-3 content blocks
  - CTA copy aligned to funnel stage (read, watch, book, assess)
- Create multiple variants per block (A/B-ready)
- Tag each block with theme and target persona

**Outputs:**
- JSON payload of modules: copy, tags, recommended placement
- List of claims that reference product or outcomes for Compliance/Risk SME check

**Guardrails:**
- Must use customer-focused, educational framing first
- Use only approved claims templates for product mentions

### 3.3 Publish Agent

**Goal:** Assemble, QA, and schedule the newsletter in ESP/MAP.

**Inputs:**
- Approved content modules (after SME and VoC passes)
- Template ID and layout rules
- Segment, send time window, and UTM schema

**Core Actions:**
- Assemble modules into the newsletter template via API
- Auto-generate UTMs based on campaign and link type
- Run automated checks (broken links, missing preview text, image alt text, unsubscribe link present)
- Propose send time based on historical engagement for that segment

**Outputs:**
- Draft campaign object in ESP/MAP with all content and settings
- QA report (pass/fail items) and a final "ready for human approval" status

**Guardrails:**
- Cannot auto-send; human approval required
- Cannot modify approved copy beyond minor spacing/formatting fixes

### 3.4 Analytics Agent

**Goal:** Turn raw campaign data into insight and tests.

**Inputs:**
- ESP/MAP metrics (opens, clicks, unsubscribes, complaints, device)
- Web analytics and pipeline data joined by campaign/cookie IDs
- Content metadata (topic, persona, CTA type, send time)

**Core Actions:**
- Aggregate results by issue and by module (clicks by card, topic, CTA)
- Identify top/bottom decile performers and correlated patterns (e.g., role, topic, CTA framing)
- Auto-generate 2-3 test recommendations for the next send

**Outputs:**
- Structured weekly/issue analytics JSON and a short narrative summary
- Test backlog: subject patterns, hero topics, CTA type, send times

**Guardrails:**
- No automated list pruning; only recommendations
- Cannot change targeting rules—only propose

### 3.5 Branding Agent

**Goal:** Enforce consistent voice, visual rules, and terminology.

**Inputs:**
- Brand book (tone, examples, visual guidance)
- "Do/don't say" lexicon and compliance-safe phrases
- Draft content from Content agent

**Core Actions:**
- Score copy against voice guidelines (e.g., clarity, jargon, confidence)
- Flag off-brand words, tone issues, or banned phrases
- Suggest inline edits that preserve meaning while aligning with brand

**Outputs:**
- Annotated content with suggested edits
- Brand compliance score and list of issues to resolve

**Guardrails:**
- Cannot materially alter claims or promises—those changes must route back through SMEs
- Changes are suggestions; human owner approves or rejects

### 3.6 Voice of the Customer Agent

**Goal:** Inject real customer language and priorities into topics and copy.

**Inputs:**
- Transcripts/notes from calls, QBRs, win-loss, support tickets (sanitized)
- Tagging schema for pains, outcomes, objections, and roles
- Draft content from Content/Branding agents

**Core Actions:**
- Extract top recurring pains and exact phrases for each persona/segment
- Map upcoming topics to the most relevant pains and outcomes
- Review drafts to:
  - Replace internal jargon with customer phrases where safe
  - Propose micro-stories, anonymized quotes, or "what your peers are doing" snippets

**Outputs:**
- Updated content suggestions with customer-language variants
- VoC notes per issue: key pains addressed, objections surfaced, and missing angles

**Guardrails:**
- Must anonymize any customer details unless an explicit reference story is approved
- Cannot fabricate outcomes; only reference patterns present in data/notes

---

## 4. Workflow Integration

The agents chain together in the following flow:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEWSLETTER WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐                                                        │
│  │  RESEARCH    │  ──→  Candidate stories (5-10 per cycle)               │
│  │  AGENT       │                                                        │
│  └──────┬───────┘                                                        │
│         │                                                                │
│         ▼  [Human: Topic Selection]                                      │
│                                                                          │
│  ┌──────────────┐                                                        │
│  │  CONTENT     │  ──→  Draft modules (subject, intro, blocks, CTAs)     │
│  │  AGENT       │                                                        │
│  └──────┬───────┘                                                        │
│         │                                                                │
│         ▼                                                                │
│                                                                          │
│  ┌──────────────┐                                                        │
│  │  BRANDING    │  ──→  Voice-aligned content + compliance score         │
│  │  AGENT       │                                                        │
│  └──────┬───────┘                                                        │
│         │                                                                │
│         ▼                                                                │
│                                                                          │
│  ┌──────────────┐                                                        │
│  │  VOC         │  ──→  Customer-language variants + VoC notes           │
│  │  AGENT       │                                                        │
│  └──────┬───────┘                                                        │
│         │                                                                │
│         ▼  [Human: SME Reviews - Security, Compliance/Risk, VoC]         │
│                                                                          │
│  ┌──────────────┐                                                        │
│  │  PUBLISH     │  ──→  Assembled newsletter + QA report                 │
│  │  AGENT       │                                                        │
│  └──────┬───────┘                                                        │
│         │                                                                │
│         ▼  [Human: Final Approval]                                       │
│                                                                          │
│  ┌──────────────┐                                                        │
│  │  SEND        │  ──→  Newsletter delivered                             │
│  └──────┬───────┘                                                        │
│         │                                                                │
│         ▼                                                                │
│                                                                          │
│  ┌──────────────┐                                                        │
│  │  ANALYTICS   │  ──→  Performance insights + test recommendations      │
│  │  AGENT       │                                                        │
│  └──────────────┘                                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Human Approval Gates

1. **Topic Selection** - Strategic owner/Content marketing selects from Research Agent candidates
2. **SME Reviews** - Security SME, Compliance & Risk SME, VoC expert review before publishing
3. **Final Approval** - Cannot auto-send; human approval required before delivery

---

## 5. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Open Rate | >25% | ESP metrics |
| Click-Through Rate | >5% | ESP metrics |
| Unsubscribe Rate | <0.5% | ESP metrics |
| Brand Compliance Score | >90% | Branding Agent |
| VoC Alignment Score | >80% | VoC Agent |
| SME Approval Rate | >95% first pass | Approval workflow |
| Pipeline Attribution | Track | CRM integration |

---

## 6. Technical Requirements

### 6.1 Data Sources for VoC Agent
- Call transcripts (Gong, Chorus, etc.)
- CRM notes (Salesforce, HubSpot)
- Support tickets (Zendesk, Intercom)
- NPS/CSAT surveys
- Win/loss analysis
- Community discussions

### 6.2 Integration Points
- ESP/MAP: HubSpot, Mailchimp
- CRM: Salesforce, HubSpot
- Analytics: GA4, Mixpanel
- Content sources: RSS feeds, custom APIs
- AI providers: OpenRouter (Claude), Anthropic

### 6.3 Compliance Requirements
- Pre-approved claims library
- Disclaimer templates
- Do/don't say lexicon
- Audit trail for all content changes
- Customer data anonymization

---

## 7. References

- [PRD Source Image](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/18156434/907446dc-c54a-4575-9bb3-7b2b3ce796ad/image.jpg)
