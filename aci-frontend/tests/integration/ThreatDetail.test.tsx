/**
 * Integration Tests for Threat Detail Page
 * Tests the full ThreatDetailPage rendering with MSW mocked API responses
 *
 * CONSTITUTION PRINCIPLE VIII - TDD Test Completeness:
 * ✓ Happy path: Full threat detail page renders with content, CVEs, and actions
 * ✓ Error path: Shows 404 for non-existent threats, error state with retry button
 * ✓ Empty state: Shows appropriate UI for threats with no CVEs or minimal data
 * ✓ Edge case: Bookmark toggle, navigation, external links, breadcrumb navigation
 *
 * ROUTE: /threats/:id → ThreatDetailPage
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HttpResponse, http } from 'msw';
import { AuthProvider } from '@/stores/AuthContext';
import { server } from '../setup';
import type { Threat, CVE, Severity } from '@/types/threat';
import { ThreatCategory } from '@/types/threat';

/**
 * Placeholder component - ThreatDetailPage will be implemented after tests
 */
const ThreatDetailPage = () => <div>ThreatDetailPage Component Not Implemented</div>;

/**
 * Placeholder component - NotFoundPage for 404 errors
 */
const NotFoundPage = () => <div>404 - Threat Not Found</div>;

/**
 * Placeholder component - ThreatsListPage for back navigation
 */
const ThreatsListPage = () => <div>Threats List Page</div>;

/**
 * Mock CVE data for testing
 */
const MOCK_CVES: readonly CVE[] = [
  {
    id: 'CVE-2024-12345',
    severity: 'critical' as Severity,
    cvssScore: 9.8,
    description: 'Remote code execution vulnerability in Apache Struts',
  },
  {
    id: 'CVE-2024-12346',
    severity: 'critical' as Severity,
    cvssScore: 9.1,
    description: 'SQL injection vulnerability allowing database access',
  },
  {
    id: 'CVE-2024-12347',
    severity: 'high' as Severity,
    cvssScore: 7.5,
    description: 'Buffer overflow vulnerability leading to denial of service',
  },
];

/**
 * Mock threat data with full details
 */
const MOCK_THREAT_DETAIL: Threat = {
  id: 'threat-detail-001',
  title: 'Critical: Zero-day RCE in Apache Struts',
  summary: 'Remote code execution vulnerability affects production systems worldwide',
  content: `# Critical Remote Code Execution Vulnerability

A critical remote code execution (RCE) vulnerability has been discovered in Apache Struts versions 2.x. This vulnerability allows unauthenticated attackers to execute arbitrary code on affected systems.

## Impact

- **Severity**: Critical (CVSS 9.8)
- **Attack Vector**: Network
- **Privileges Required**: None
- **User Interaction**: None

The vulnerability can be exploited remotely without authentication, making it extremely dangerous for internet-facing applications.

## Technical Details

The vulnerability exists in the OGNL (Object-Graph Navigation Language) parser used by Apache Struts. Attackers can craft malicious HTTP requests that trigger arbitrary code execution.

### Exploitation

\`\`\`http
POST /struts2-showcase/integration/saveGangster.action HTTP/1.1
Host: vulnerable-server.com
Content-Type: application/x-www-form-urlencoded

name=%{(#_='multipart/form-data')...}
\`\`\`

## Affected Systems

- Apache Struts 2.0.0 - 2.5.32
- All applications using vulnerable Struts versions
- Estimated 100,000+ internet-facing systems affected

## Mitigation Recommendations

1. **Immediate Actions**
   - Upgrade to Apache Struts 2.5.33 or later
   - Apply emergency patches from vendor
   - Implement WAF rules to block exploitation attempts

2. **Detection**
   - Review web server logs for suspicious OGNL expressions
   - Monitor for unusual outbound connections
   - Check for web shells or backdoors

3. **Long-term**
   - Implement network segmentation
   - Deploy intrusion detection systems
   - Regular security assessments

## Indicators of Compromise

- Unusual HTTP requests with OGNL expressions
- Unexpected process execution on web servers
- Modified configuration files
- Unknown scheduled tasks or cron jobs

## References

- [Apache Struts Security Bulletin](https://struts.apache.org/security)
- [NIST NVD Entry](https://nvd.nist.gov/vuln/detail/CVE-2024-12345)
- [CISA Alert](https://www.cisa.gov/alerts)

## Timeline

- **2024-01-15**: Vulnerability discovered during security research
- **2024-01-20**: Vendor notified (responsible disclosure)
- **2024-02-01**: Patch released by Apache
- **2024-02-02**: Public disclosure and CVE assignment
- **2024-02-03**: Active exploitation observed in the wild

*Last updated: 2024-02-05*`,
  severity: 'critical' as Severity,
  category: ThreatCategory.VULNERABILITY,
  source: 'NVD',
  sourceUrl: 'https://nvd.nist.gov/vuln/detail/CVE-2024-12345',
  publishedAt: new Date('2024-02-05T10:00:00Z').toISOString(),
  createdAt: new Date('2024-02-05T10:00:00Z').toISOString(),
  updatedAt: new Date('2024-02-05T12:30:00Z').toISOString(),
  cves: MOCK_CVES,
  tags: ['apache', 'struts', 'rce', 'zero-day', 'critical'],
  viewCount: 1234,
  isBookmarked: false,
};

/**
 * Mock threat with no CVEs
 */
const MOCK_THREAT_NO_CVES: Threat = {
  id: 'threat-detail-002',
  title: 'High: Ransomware Campaign Targeting Healthcare',
  summary: 'LockBit operators targeting healthcare organizations',
  content: `# Ransomware Campaign Alert

LockBit ransomware group has been observed targeting healthcare sector organizations.

## Impact

Multiple healthcare providers have been affected in the past 48 hours.

## Recommendations

- Implement backup procedures
- Enable MFA
- Patch known vulnerabilities`,
  severity: 'high' as Severity,
  category: ThreatCategory.RANSOMWARE,
  source: 'CISA',
  sourceUrl: 'https://www.cisa.gov/alerts/ransomware',
  publishedAt: new Date('2024-02-04T15:00:00Z').toISOString(),
  createdAt: new Date('2024-02-04T15:00:00Z').toISOString(),
  updatedAt: new Date('2024-02-04T15:00:00Z').toISOString(),
  cves: [],
  tags: ['ransomware', 'healthcare', 'lockbit'],
  viewCount: 567,
  isBookmarked: true,
};

/**
 * Mock threat with minimal content
 */
const MOCK_THREAT_MINIMAL: Threat = {
  id: 'threat-detail-003',
  title: 'Medium: Phishing Campaign Detected',
  summary: 'Targeted phishing emails detected',
  content: 'Brief notification about phishing campaign. Details pending investigation.',
  severity: 'medium' as Severity,
  category: ThreatCategory.PHISHING,
  source: 'Proofpoint',
  sourceUrl: null,
  publishedAt: new Date('2024-02-03T08:00:00Z').toISOString(),
  createdAt: new Date('2024-02-03T08:00:00Z').toISOString(),
  updatedAt: new Date('2024-02-03T08:00:00Z').toISOString(),
  cves: [],
  tags: ['phishing'],
  viewCount: 89,
  isBookmarked: false,
};

/**
 * Test wrapper component with routing and required providers
 */
interface WrapperProps {
  readonly children: React.ReactNode;
  readonly initialRoute?: string;
}

const ThreatDetailWrapper = ({ children, initialRoute = '/threats/threat-detail-001' }: WrapperProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/threats" element={<ThreatsListPage />} />
            <Route path="/threats/:id" element={children} />
            <Route path="/404" element={<NotFoundPage />} />
          </Routes>
        </QueryClientProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('ThreatDetailPage Integration Tests', () => {
  /**
   * Note: MSW server is configured in tests/setup.ts
   * Handlers are reset after each test automatically
   */

  // =========================================================================
  // HAPPY PATH - Full threat detail page renders with all elements
  // =========================================================================

  describe('Happy Path: Full Threat Detail Rendering', () => {
    it('should show loading skeleton initially while fetching threat', async () => {
      // Setup MSW handler with delay to observe loading state
      server.use(
        http.get('/api/v1/threats/:id', async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      // Verify loading skeleton is shown
      expect(screen.getByTestId('threat-detail-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Critical: Zero-day RCE in Apache Struts')).not.toBeInTheDocument();
    });

    it('should render full threat detail after loading', async () => {
      server.use(
        http.get('/api/v1/threats/:id', ({ params }) => {
          const { id } = params;
          if (id === 'threat-detail-001') {
            return HttpResponse.json({
              success: true,
              data: MOCK_THREAT_DETAIL,
            });
          }
          return HttpResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: 'Threat not found' } },
            { status: 404 }
          );
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} initialRoute="/threats/threat-detail-001" />,
      });

      // Wait for threat to load
      await waitFor(
        () => {
          expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify title is rendered
      expect(screen.getByTestId('threat-detail-title')).toHaveTextContent(
        'Critical: Zero-day RCE in Apache Struts'
      );
    });

    it('should display threat metadata (severity, category, source, date)', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      });

      // Verify severity badge
      expect(screen.getByTestId('severity-badge-critical')).toBeInTheDocument();
      expect(screen.getByTestId('severity-badge-critical')).toHaveTextContent(/critical/i);

      // Verify category
      expect(screen.getByTestId('threat-category')).toHaveTextContent(/vulnerability/i);

      // Verify source
      expect(screen.getByTestId('threat-source')).toHaveTextContent('NVD');

      // Verify published date
      expect(screen.getByTestId('threat-published-date')).toBeInTheDocument();
    });

    it('should render threat summary section', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('threat-summary')).toBeInTheDocument();
      });

      expect(screen.getByTestId('threat-summary')).toHaveTextContent(
        'Remote code execution vulnerability affects production systems worldwide'
      );
    });

    it('should render full markdown content with formatting', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('threat-content')).toBeInTheDocument();
      });

      // Verify markdown headings are rendered
      expect(screen.getByRole('heading', { name: /Critical Remote Code Execution Vulnerability/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Impact/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Technical Details/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Mitigation Recommendations/i })).toBeInTheDocument();

      // Verify code blocks are rendered
      expect(screen.getByText(/POST \/struts2-showcase/i)).toBeInTheDocument();
    });

    it('should display CVE list with severity badges', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('threat-cves-list')).toBeInTheDocument();
      });

      // Verify all CVEs are displayed
      expect(screen.getByText('CVE-2024-12345')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-12346')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-12347')).toBeInTheDocument();

      // Verify CVE badges are clickable
      const cve1 = screen.getByTestId('cve-badge-CVE-2024-12345');
      expect(cve1).toBeInTheDocument();
      expect(cve1.tagName).toBe('A'); // Should be a link
    });

    it('should render CVE badges as clickable links to NVD', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByText('CVE-2024-12345')).toBeInTheDocument();
      });

      // Verify CVE link has correct href
      const cveBadge = screen.getByTestId('cve-badge-CVE-2024-12345');
      expect(cveBadge).toHaveAttribute(
        'href',
        'https://nvd.nist.gov/vuln/detail/CVE-2024-12345'
      );
      expect(cveBadge).toHaveAttribute('target', '_blank');
      expect(cveBadge).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should show bookmark button in unbookmarked state', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('bookmark-button')).toBeInTheDocument();
      });

      const bookmarkButton = screen.getByTestId('bookmark-button');
      expect(bookmarkButton).toHaveAttribute('aria-pressed', 'false');
      expect(bookmarkButton).toHaveTextContent(/bookmark|save/i);
    });

    it('should show bookmark button in bookmarked state', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: { ...MOCK_THREAT_DETAIL, isBookmarked: true },
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('bookmark-button')).toBeInTheDocument();
      });

      const bookmarkButton = screen.getByTestId('bookmark-button');
      expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should display back button to threats list', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('back-to-threats-button')).toBeInTheDocument();
      });

      const backButton = screen.getByTestId('back-to-threats-button');
      expect(backButton).toHaveTextContent(/back|return|threats/i);
    });

    it('should display Armor CTA button with external link', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('armor-cta-button')).toBeInTheDocument();
      });

      const armorButton = screen.getByTestId('armor-cta-button');
      expect(armorButton).toHaveTextContent(/armor|protect|defend/i);
      expect(armorButton).toHaveAttribute('target', '_blank');
      expect(armorButton).toHaveAttribute('rel', 'noopener noreferrer');
      expect(armorButton).toHaveAttribute('href', expect.stringContaining('armor'));
    });

    it('should display breadcrumb navigation', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('breadcrumb-nav')).toBeInTheDocument();
      });

      const breadcrumb = screen.getByTestId('breadcrumb-nav');

      // Verify breadcrumb items
      expect(within(breadcrumb).getByText(/home|dashboard/i)).toBeInTheDocument();
      expect(within(breadcrumb).getByText(/threats/i)).toBeInTheDocument();
      expect(within(breadcrumb).getByText(/critical.*apache.*struts/i)).toBeInTheDocument();
    });

    it('should display view count', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('threat-view-count')).toBeInTheDocument();
      });

      expect(screen.getByTestId('threat-view-count')).toHaveTextContent('1234');
    });

    it('should display tags', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('threat-tags')).toBeInTheDocument();
      });

      // Verify tags are displayed
      expect(screen.getByText('apache')).toBeInTheDocument();
      expect(screen.getByText('struts')).toBeInTheDocument();
      expect(screen.getByText('rce')).toBeInTheDocument();
      expect(screen.getByText('zero-day')).toBeInTheDocument();
      expect(screen.getByText('critical')).toBeInTheDocument();
    });

    it('should show source URL as clickable link if available', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('threat-source-link')).toBeInTheDocument();
      });

      const sourceLink = screen.getByTestId('threat-source-link');
      expect(sourceLink).toHaveAttribute('href', 'https://nvd.nist.gov/vuln/detail/CVE-2024-12345');
      expect(sourceLink).toHaveAttribute('target', '_blank');
      expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // =========================================================================
  // INTERACTION - User actions (bookmark, navigation, links)
  // =========================================================================

  describe('User Interactions: Bookmark Toggle and Navigation', () => {
    it('should toggle bookmark when bookmark button clicked', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        }),
        http.post('/api/v1/threats/:id/bookmark', () => {
          return HttpResponse.json({
            success: true,
            data: { bookmarked: true },
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('bookmark-button')).toBeInTheDocument();
      });

      const bookmarkButton = screen.getByTestId('bookmark-button');
      expect(bookmarkButton).toHaveAttribute('aria-pressed', 'false');

      // Click bookmark button
      await user.click(bookmarkButton);

      // Verify optimistic update (button changes immediately)
      await waitFor(() => {
        expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should unbookmark when clicking bookmarked threat', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: { ...MOCK_THREAT_DETAIL, isBookmarked: true },
          });
        }),
        http.delete('/api/v1/threats/:id/bookmark', () => {
          return HttpResponse.json({
            success: true,
            data: { bookmarked: false },
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('bookmark-button')).toBeInTheDocument();
      });

      const bookmarkButton = screen.getByTestId('bookmark-button');
      expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true');

      // Click to unbookmark
      await user.click(bookmarkButton);

      // Verify optimistic update
      await waitFor(() => {
        expect(bookmarkButton).toHaveAttribute('aria-pressed', 'false');
      });
    });

    it('should navigate back to threats list when back button clicked', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('back-to-threats-button')).toBeInTheDocument();
      });

      const backButton = screen.getByTestId('back-to-threats-button');
      await user.click(backButton);

      // Verify navigation occurred
      await waitFor(() => {
        expect(window.location.pathname).toBe('/threats');
      });
    });

    it('should navigate via breadcrumb links', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('breadcrumb-nav')).toBeInTheDocument();
      });

      const breadcrumb = screen.getByTestId('breadcrumb-nav');
      const threatsLink = within(breadcrumb).getByText(/^threats$/i);

      await user.click(threatsLink);

      // Verify navigation to threats list
      await waitFor(() => {
        expect(window.location.pathname).toBe('/threats');
      });
    });

    it('should open CVE link in new tab when clicked', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByText('CVE-2024-12345')).toBeInTheDocument();
      });

      // Verify CVE link attributes (prevents navigation in test)
      const cveBadge = screen.getByTestId('cve-badge-CVE-2024-12345');
      expect(cveBadge).toHaveAttribute('target', '_blank');
      expect(cveBadge).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should open Armor CTA link in new tab', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('armor-cta-button')).toBeInTheDocument();
      });

      const armorButton = screen.getByTestId('armor-cta-button');
      expect(armorButton).toHaveAttribute('target', '_blank');
      expect(armorButton).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // =========================================================================
  // ERROR PATHS - 404, API errors, retry functionality
  // =========================================================================

  describe('Error Paths: 404 and API Failures', () => {
    it('should show 404 page for non-existent threat', async () => {
      server.use(
        http.get('/api/v1/threats/:id', ({ params }) => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: `Threat not found: ${params.id}`,
              },
            },
            { status: 404 }
          );
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} initialRoute="/threats/nonexistent-id" />,
      });

      // Wait for 404 page
      await waitFor(
        () => {
          expect(screen.getByTestId('threat-not-found')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.getByText(/404|not found|doesn't exist/i)).toBeInTheDocument();
    });

    it('should show error message when API returns 500', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Database connection failed',
              },
            },
            { status: 500 }
          );
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      // Wait for error state
      await waitFor(
        () => {
          expect(screen.getByTestId('threat-error-state')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.getByText(/error|failed|unavailable/i)).toBeInTheDocument();
    });

    it('should show retry button on error', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json(
            { success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' } },
            { status: 503 }
          );
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('threat-error-state')).toBeInTheDocument();
      });

      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    it('should retry and recover from API error', async () => {
      let callCount = 0;

      server.use(
        http.get('/api/v1/threats/:id', () => {
          callCount++;
          // First call fails, second succeeds
          if (callCount === 1) {
            return HttpResponse.json(
              { success: false, error: { code: 'TIMEOUT', message: 'Request timeout' } },
              { status: 504 }
            );
          }
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      // Wait for error
      await waitFor(() => {
        expect(screen.getByTestId('threat-error-state')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);

      // Wait for successful load
      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      });

      expect(callCount).toBe(2);
    });

    it('should handle network errors gracefully', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.error();
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('threat-error-state')).toBeInTheDocument();
      });

      expect(screen.getByText(/error|failed|network/i)).toBeInTheDocument();
    });

    it('should show specific error message for bookmark failure', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        }),
        http.post('/api/v1/threats/:id/bookmark', () => {
          return HttpResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
            { status: 401 }
          );
        })
      );

      const user = userEvent.setup();
      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('bookmark-button')).toBeInTheDocument();
      });

      const bookmarkButton = screen.getByTestId('bookmark-button');
      await user.click(bookmarkButton);

      // Verify error toast/message appears
      await waitFor(() => {
        expect(screen.getByText(/authentication required|login|unauthorized/i)).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // EMPTY/NULL STATES - Threats with no CVEs, no source URL, minimal content
  // =========================================================================

  describe('Empty/Null States: Missing Data Scenarios', () => {
    it('should handle threat with no CVEs', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_NO_CVES,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} initialRoute="/threats/threat-detail-002" />,
      });

      await waitFor(() => {
        expect(screen.getByText('High: Ransomware Campaign Targeting Healthcare')).toBeInTheDocument();
      });

      // Verify CVE section shows "No CVEs" or is hidden
      const cveSection = screen.queryByTestId('threat-cves-list');
      if (cveSection) {
        expect(cveSection).toHaveTextContent(/no cves|no vulnerabilities/i);
      } else {
        // CVE section may be hidden entirely
        expect(screen.queryByText('CVE-')).not.toBeInTheDocument();
      }
    });

    it('should handle threat with no source URL', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_MINIMAL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} initialRoute="/threats/threat-detail-003" />,
      });

      await waitFor(() => {
        expect(screen.getByText('Medium: Phishing Campaign Detected')).toBeInTheDocument();
      });

      // Verify source link is not rendered or shows plain text
      expect(screen.queryByTestId('threat-source-link')).not.toBeInTheDocument();
      expect(screen.getByText('Proofpoint')).toBeInTheDocument();
    });

    it('should handle threat with minimal content', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_MINIMAL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} initialRoute="/threats/threat-detail-003" />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('threat-content')).toBeInTheDocument();
      });

      // Verify minimal content is displayed
      expect(screen.getByTestId('threat-content')).toHaveTextContent(
        /Brief notification about phishing campaign/i
      );
    });

    it('should handle threat with empty tags array', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: { ...MOCK_THREAT_MINIMAL, tags: [] },
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} initialRoute="/threats/threat-detail-003" />,
      });

      await waitFor(() => {
        expect(screen.getByText('Medium: Phishing Campaign Detected')).toBeInTheDocument();
      });

      // Tags section should be hidden or show "No tags"
      const tagsSection = screen.queryByTestId('threat-tags');
      if (tagsSection) {
        expect(tagsSection).toHaveTextContent(/no tags/i);
      } else {
        expect(tagsSection).not.toBeInTheDocument();
      }
    });

    it('should handle null/undefined fields gracefully', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: {
              ...MOCK_THREAT_MINIMAL,
              sourceUrl: null,
              viewCount: 0,
              tags: [],
            },
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByText('Medium: Phishing Campaign Detected')).toBeInTheDocument();
      });

      // Page should render without errors
      expect(screen.getByTestId('threat-detail-title')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // EDGE CASES - Multiple CVEs, long content, special characters
  // =========================================================================

  describe('Edge Cases: Multiple CVEs and Content Variations', () => {
    it('should display all CVEs when threat has multiple vulnerabilities', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('threat-cves-list')).toBeInTheDocument();
      });

      const cveList = screen.getByTestId('threat-cves-list');

      // Verify all 3 CVEs are present
      expect(within(cveList).getByText('CVE-2024-12345')).toBeInTheDocument();
      expect(within(cveList).getByText('CVE-2024-12346')).toBeInTheDocument();
      expect(within(cveList).getByText('CVE-2024-12347')).toBeInTheDocument();
    });

    it('should render markdown with code blocks correctly', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_DETAIL,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('threat-content')).toBeInTheDocument();
      });

      // Verify code block exists
      const codeBlocks = screen.getAllByRole('code');
      expect(codeBlocks.length).toBeGreaterThan(0);
    });

    it('should handle threat titles with special characters', async () => {
      const specialThreat: Threat = {
        ...MOCK_THREAT_DETAIL,
        title: 'Critical: <script>alert("XSS")</script> & "Quotes" \' Apostrophes',
      };

      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: specialThreat,
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('threat-detail-title')).toBeInTheDocument();
      });

      // Verify title is sanitized and displayed correctly
      const title = screen.getByTestId('threat-detail-title');
      expect(title).toHaveTextContent(/script.*XSS/i); // Should not execute as HTML
    });

    it('should handle bookmarked threat from initial load', async () => {
      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: MOCK_THREAT_NO_CVES, // isBookmarked: true
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} initialRoute="/threats/threat-detail-002" />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('bookmark-button')).toBeInTheDocument();
      });

      const bookmarkButton = screen.getByTestId('bookmark-button');
      expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should handle rapid bookmark toggles (debouncing)', async () => {
      let bookmarkState = false;

      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: { ...MOCK_THREAT_DETAIL, isBookmarked: bookmarkState },
          });
        }),
        http.post('/api/v1/threats/:id/bookmark', () => {
          bookmarkState = true;
          return HttpResponse.json({ success: true, data: { bookmarked: true } });
        }),
        http.delete('/api/v1/threats/:id/bookmark', () => {
          bookmarkState = false;
          return HttpResponse.json({ success: true, data: { bookmarked: false } });
        })
      );

      const user = userEvent.setup();
      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('bookmark-button')).toBeInTheDocument();
      });

      const bookmarkButton = screen.getByTestId('bookmark-button');

      // Rapid clicks
      await user.tripleClick(bookmarkButton);

      // Button should stabilize to final state (may be debounced)
      await waitFor(() => {
        expect(bookmarkButton).toHaveAttribute('aria-pressed', expect.any(String));
      });
    });

    it('should handle very long content without layout breaking', async () => {
      const longContent = `# ${'Very Long Section '.repeat(100)}\n\n${'Lorem ipsum dolor sit amet. '.repeat(1000)}`;

      server.use(
        http.get('/api/v1/threats/:id', () => {
          return HttpResponse.json({
            success: true,
            data: { ...MOCK_THREAT_DETAIL, content: longContent },
          });
        })
      );

      render(<ThreatDetailPage />, {
        wrapper: (props) => <ThreatDetailWrapper {...props} />,
      });

      await waitFor(() => {
        expect(screen.getByTestId('threat-content')).toBeInTheDocument();
      });

      // Content should render without breaking layout
      const contentElement = screen.getByTestId('threat-content');
      expect(contentElement).toBeInTheDocument();
      expect(contentElement.textContent?.length).toBeGreaterThan(5000);
    });
  });
});
