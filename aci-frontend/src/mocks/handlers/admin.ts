/**
 * MSW Mock Handlers - Admin Endpoints
 *
 * Mock responses for admin-only API endpoints during development and testing.
 */

import { http, HttpResponse } from 'msw';
import type { PendingArticle, AdminStats } from '@/types/admin';
import { ThreatCategory } from '@/types/threat';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// ============================================================================
// Mock Data
// ============================================================================

const mockPendingArticles: PendingArticle[] = [
  {
    id: 'pending-1',
    title: 'Critical Zero-Day Vulnerability Discovered in Apache Log4j',
    description: 'A critical remote code execution vulnerability has been discovered in the widely-used Apache Log4j logging library, affecting millions of applications worldwide.',
    content: `# Critical Zero-Day Vulnerability in Apache Log4j

A severe zero-day vulnerability (CVE-2021-44228) has been discovered in Apache Log4j, one of the most widely-used logging libraries in Java applications. This vulnerability allows remote code execution and affects countless applications and services across the internet.

## Impact

The vulnerability allows attackers to execute arbitrary code on vulnerable systems by simply sending a specially crafted string to be logged. This has led to widespread exploitation attempts across the internet.

## Affected Versions

- Log4j 2.0-beta9 through 2.14.1

## Mitigation

Upgrade to Log4j 2.15.0 or later immediately.`,
    sourceUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2021-44228',
    sourceName: 'NVD - National Vulnerability Database',
    publishedAt: '2021-12-10T08:00:00Z',
    createdAt: '2025-12-14T10:30:00Z',
    aiCategory: ThreatCategory.ZERO_DAY,
    aiSeverity: 'critical',
    aiConfidence: 0.98,
    cves: ['CVE-2021-44228'],
    status: 'pending',
  },
  {
    id: 'pending-2',
    title: 'New Ransomware Campaign Targeting Healthcare Sector',
    description: 'A sophisticated ransomware group has launched a targeted campaign against healthcare organizations, exploiting vulnerabilities in VPN gateways.',
    content: `# New Ransomware Campaign Targets Healthcare

A new ransomware campaign has been identified targeting healthcare organizations globally. The threat actors are exploiting known vulnerabilities in VPN gateways to gain initial access.

## Tactics

The attackers use spear-phishing emails combined with VPN exploits to breach networks, then deploy ransomware payloads after establishing persistence.

## Recommendations

- Patch all VPN gateways immediately
- Implement multi-factor authentication
- Maintain offline backups`,
    sourceUrl: 'https://www.cisa.gov/news-events/alerts/2025/12/14/ransomware-healthcare',
    sourceName: 'CISA Alerts',
    publishedAt: '2025-12-14T06:00:00Z',
    createdAt: '2025-12-14T09:15:00Z',
    aiCategory: ThreatCategory.RANSOMWARE,
    aiSeverity: 'high',
    aiConfidence: 0.92,
    cves: ['CVE-2023-1234', 'CVE-2023-5678'],
    status: 'pending',
  },
  {
    id: 'pending-3',
    title: 'Phishing Campaign Impersonating Major Cloud Provider',
    description: 'Security researchers have identified a large-scale phishing campaign impersonating AWS to steal cloud credentials from enterprise users.',
    content: `# Phishing Campaign Targets Cloud Credentials

A sophisticated phishing campaign has been identified impersonating Amazon Web Services (AWS) to steal cloud credentials from enterprise users.

## Attack Vector

Attackers send convincing emails claiming account security issues, directing victims to fake AWS login pages that harvest credentials.

## Indicators of Compromise

- Suspicious sender domains mimicking aws.com
- Urgent language about account suspension
- Links to domains similar to AWS but with slight variations`,
    sourceUrl: 'https://blog.cloudsec.com/aws-phishing-2025',
    sourceName: 'CloudSec Blog',
    publishedAt: '2025-12-13T14:30:00Z',
    createdAt: '2025-12-14T08:00:00Z',
    aiCategory: ThreatCategory.PHISHING,
    aiSeverity: 'medium',
    aiConfidence: 0.85,
    cves: [],
    status: 'pending',
  },
  {
    id: 'pending-4',
    title: 'Data Breach Exposes 50 Million Customer Records',
    description: 'A major data breach at a global retail company has exposed personally identifiable information of over 50 million customers.',
    content: `# Major Retail Data Breach

A significant data breach has been disclosed by Global Retail Corp, affecting approximately 50 million customers globally. The breach occurred due to misconfigured cloud storage buckets.

## Data Exposed

- Names
- Email addresses
- Physical addresses
- Purchase history
- Partial credit card information

## Response

The company has engaged cybersecurity experts and is offering credit monitoring services to affected customers.`,
    sourceUrl: 'https://security.news/retail-breach-2025',
    sourceName: 'Security News',
    publishedAt: '2025-12-13T09:00:00Z',
    createdAt: '2025-12-14T07:30:00Z',
    aiCategory: ThreatCategory.DATA_BREACH,
    aiSeverity: 'high',
    aiConfidence: 0.95,
    cves: [],
    status: 'pending',
  },
];

const mockAdminStats: AdminStats = {
  totalUsers: 1250,
  totalArticles: 15420,
  pendingArticles: 23,
  approvedArticles: 145,
  publishedArticles: 15200,
  rejectedArticles: 52,
  articlesToday: 18,
};

// ============================================================================
// Handlers
// ============================================================================

export const adminHandlers = [
  /**
   * GET /admin/articles - Get review queue
   */
  http.get(`${API_BASE_URL}/admin/articles`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const status = url.searchParams.get('status');

    // Filter by status if provided
    let filteredArticles = mockPendingArticles;
    if (status) {
      filteredArticles = mockPendingArticles.filter((a) => a.status === status);
    }

    const total = filteredArticles.length;
    const pages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedArticles = filteredArticles.slice(start, end);

    return HttpResponse.json({
      success: true,
      data: paginatedArticles,
      meta: {
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      },
    });
  }),

  /**
   * GET /admin/articles/:id - Get single article for review
   */
  http.get(`${API_BASE_URL}/admin/articles/:id`, ({ params }) => {
    const { id } = params;
    const article = mockPendingArticles.find((a) => a.id === id);

    if (!article) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Article not found',
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: article,
    });
  }),

  /**
   * POST /admin/articles/:id/approve - Approve article
   */
  http.post(`${API_BASE_URL}/admin/articles/:id/approve`, async ({ params }) => {
    const { id } = params;
    const article = mockPendingArticles.find((a) => a.id === id);

    if (!article) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Article not found',
          },
        },
        { status: 404 }
      );
    }

    // Update article status
    const updatedArticle: PendingArticle = {
      ...article,
      status: 'approved',
    };

    return HttpResponse.json({
      success: true,
      data: updatedArticle,
      message: 'Article approved successfully',
    });
  }),

  /**
   * POST /admin/articles/:id/reject - Reject article
   */
  http.post(`${API_BASE_URL}/admin/articles/:id/reject`, async ({ params }) => {
    const { id } = params;
    const article = mockPendingArticles.find((a) => a.id === id);

    if (!article) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Article not found',
          },
        },
        { status: 404 }
      );
    }

    // Update article status
    const updatedArticle: PendingArticle = {
      ...article,
      status: 'rejected',
    };

    return HttpResponse.json({
      success: true,
      data: updatedArticle,
      message: 'Article rejected successfully',
    });
  }),

  /**
   * POST /admin/articles/:id/release - Release article for publication
   */
  http.post(`${API_BASE_URL}/admin/articles/:id/release`, async ({ params }) => {
    const { id } = params;
    const article = mockPendingArticles.find((a) => a.id === id);

    if (!article) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Article not found',
          },
        },
        { status: 404 }
      );
    }

    if (article.status !== 'approved') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Article must be approved before release',
          },
        },
        { status: 400 }
      );
    }

    // Update article status
    const updatedArticle: PendingArticle = {
      ...article,
      status: 'published',
    };

    return HttpResponse.json({
      success: true,
      data: updatedArticle,
      message: 'Article released for publication',
    });
  }),

  /**
   * GET /admin/stats - Get admin statistics
   */
  http.get(`${API_BASE_URL}/admin/stats`, () => {
    return HttpResponse.json({
      success: true,
      data: mockAdminStats,
    });
  }),
];
