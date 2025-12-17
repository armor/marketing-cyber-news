/**
 * Unit Tests for ThreatDetail Component (TDD)
 *
 * Tests cover:
 * - Happy path: Renders full threat detail with all fields
 * - Loading state: Shows skeleton while fetching
 * - Error state: Shows error message when fetch fails
 * - Empty/Not found state: Shows not found message
 * - Markdown rendering: Content displays as formatted HTML
 * - Severity badges: Uses correct design tokens
 * - CVE display: Shows all CVEs with severity indicators
 * - Bookmark functionality: Toggle bookmark state
 * - Timestamps: Display formatted dates
 * - Armor CTA: Shows call-to-action section
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Threat, CVE } from '@/types/threat';
import { ThreatCategory } from '@/types/threat';
import { ThreatDetail } from '@/components/threat/ThreatDetail';

/**
 * Factory function for creating test CVE data
 */
const createMockCVE = (overrides?: Partial<CVE>): CVE => ({
  id: 'CVE-2024-1234',
  severity: 'critical',
  cvssScore: 9.8,
  description: 'Remote code execution vulnerability in Apache Struts',
  ...overrides,
});

/**
 * Factory function for creating test threat detail data
 */
const createMockThreat = (overrides?: Partial<Threat>): Threat => ({
  id: 'threat-detail-001',
  title: 'Critical Apache Log4j RCE Vulnerability (Log4Shell)',
  summary: 'Remote code execution vulnerability discovered in Log4j affecting millions of systems worldwide',
  content: `# Critical Remote Code Execution Vulnerability

A critical remote code execution vulnerability has been discovered in Apache Log4j 2.x. This vulnerability allows unauthenticated attackers to execute arbitrary code on affected systems.

## Impact
- Remote code execution
- Full system compromise
- Data exfiltration risk
- Lateral movement potential

## Mitigation
Apply security patches immediately. Upgrade to Log4j 2.17.1 or later.

## Detection
Search logs for JNDI lookup patterns: \`\${jndi:ldap://\``,
  severity: 'critical',
  category: ThreatCategory.VULNERABILITY,
  source: 'CISA',
  sourceUrl: 'https://www.cisa.gov/news-events/alerts/2021/12/11/apache-log4j-vulnerability',
  publishedAt: new Date('2024-12-13T10:30:00Z').toISOString(),
  createdAt: new Date('2024-12-13T09:00:00Z').toISOString(),
  updatedAt: new Date('2024-12-13T15:45:00Z').toISOString(),
  cves: [
    createMockCVE({ id: 'CVE-2021-44228', severity: 'critical', cvssScore: 10.0 }),
    createMockCVE({ id: 'CVE-2021-45046', severity: 'high', cvssScore: 9.0 }),
  ],
  tags: ['rce', 'log4j', 'java', 'zero-day'],
  viewCount: 12453,
  isBookmarked: false,
  ...overrides,
});

/**
 * Mock useThreat hook
 */
const mockUseThreat = vi.fn();

// Mock the useThreat hook before tests
vi.mock('@/hooks/useThreat', () => ({
  useThreat: (threatId: string) => mockUseThreat(threatId),
}));

/**
 * Mock useAuth hook - ThreatDetail requires authentication
 */
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-001', email: 'test@example.com' },
  }),
}));

/**
 * Test wrapper with QueryClient provider
 */
const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ThreatDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ============================================================================
  // HAPPY PATH TESTS
  // ============================================================================

  describe('Happy Path: Renders threat detail with all fields', () => {
    it('should render threat title', async () => {
      const threat = createMockThreat();
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText('Critical Apache Log4j RCE Vulnerability (Log4Shell)')).toBeInTheDocument();
      });
    });

    it('should render threat description/summary', async () => {
      const threat = createMockThreat();
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(
          screen.getByText(/Remote code execution vulnerability discovered in Log4j/)
        ).toBeInTheDocument();
      });
    });

    it('should render markdown content as formatted HTML', async () => {
      const threat = createMockThreat({
        content: '# Heading\n\nParagraph with **bold** text.\n\n## Subheading\n\n- List item 1\n- List item 2',
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        // Markdown should be rendered as HTML elements
        expect(screen.getByRole('heading', { name: /Heading/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Subheading/i })).toBeInTheDocument();
        expect(screen.getByText(/Paragraph with/)).toBeInTheDocument();
        expect(screen.getByText(/bold/)).toBeInTheDocument();
      });
    });

    it('should display severity badge with critical severity and correct color token', async () => {
      const threat = createMockThreat({ severity: 'critical' });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const severityBadge = screen.getByText(/critical/i);
        expect(severityBadge).toBeInTheDocument();
        expect(severityBadge).toHaveAttribute('data-severity', 'critical');
      });
    });

    it('should display severity badge with high severity', async () => {
      const threat = createMockThreat({ severity: 'high' });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const severityBadge = screen.getByText(/high/i);
        expect(severityBadge).toHaveAttribute('data-severity', 'high');
      });
    });

    it('should display severity badge with medium severity', async () => {
      const threat = createMockThreat({ severity: 'medium' });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const severityBadge = screen.getByText(/medium/i);
        expect(severityBadge).toHaveAttribute('data-severity', 'medium');
      });
    });

    it('should display severity badge with low severity', async () => {
      const threat = createMockThreat({ severity: 'low' });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const severityBadge = screen.getByText(/low/i);
        expect(severityBadge).toHaveAttribute('data-severity', 'low');
      });
    });

    it('should display category badge', async () => {
      const threat = createMockThreat({ category: ThreatCategory.VULNERABILITY });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/vulnerability/i)).toBeInTheDocument();
      });
    });

    it('should display source badge with link when sourceUrl provided', async () => {
      const threat = createMockThreat({
        source: 'CISA',
        sourceUrl: 'https://www.cisa.gov/test',
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const sourceLink = screen.getByRole('link', { name: /CISA/i });
        expect(sourceLink).toBeInTheDocument();
        expect(sourceLink).toHaveAttribute('href', 'https://www.cisa.gov/test');
      });
    });

    it('should display source badge without link when sourceUrl is null', async () => {
      const threat = createMockThreat({
        source: 'Internal Report',
        sourceUrl: null,
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/Internal Report/i)).toBeInTheDocument();
        // Should not be a link
        expect(screen.queryByRole('link', { name: /Internal Report/i })).not.toBeInTheDocument();
      });
    });

    it('should display all CVEs when present', async () => {
      const threat = createMockThreat({
        cves: [
          createMockCVE({ id: 'CVE-2021-44228', severity: 'critical' }),
          createMockCVE({ id: 'CVE-2021-45046', severity: 'high' }),
          createMockCVE({ id: 'CVE-2021-45105', severity: 'medium' }),
        ],
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/CVE-2021-44228/)).toBeInTheDocument();
        expect(screen.getByText(/CVE-2021-45046/)).toBeInTheDocument();
        expect(screen.getByText(/CVE-2021-45105/)).toBeInTheDocument();
      });
    });

    it('should display CVEs with severity indicators and CVSS scores', async () => {
      const threat = createMockThreat({
        cves: [
          createMockCVE({
            id: 'CVE-2021-44228',
            severity: 'critical',
            cvssScore: 10.0,
            description: 'Log4Shell RCE',
          }),
        ],
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/CVE-2021-44228/)).toBeInTheDocument();
        expect(screen.getByText(/10\.0/)).toBeInTheDocument();
        expect(screen.getByText(/Log4Shell RCE/)).toBeInTheDocument();
      });
    });

    it('should display published timestamp', async () => {
      const threat = createMockThreat({
        publishedAt: new Date('2024-12-13T10:30:00Z').toISOString(),
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        // Published date should be visible
        expect(screen.getByText(/published/i)).toBeInTheDocument();
      });
    });

    it('should display updated timestamp when different from published', async () => {
      const threat = createMockThreat({
        publishedAt: new Date('2024-12-13T10:30:00Z').toISOString(),
        updatedAt: new Date('2024-12-13T15:45:00Z').toISOString(),
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/updated/i)).toBeInTheDocument();
      });
    });

    it('should display bookmark button', async () => {
      const threat = createMockThreat({ isBookmarked: false });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).toBeInTheDocument();
      });
    });

    it('should show bookmark button as active when threat is bookmarked', async () => {
      const threat = createMockThreat({ isBookmarked: true });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should display Armor CTA section', async () => {
      const threat = createMockThreat();
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        // Should contain CTA about Armor protection
        expect(screen.getByText(/armor/i)).toBeInTheDocument();
      });
    });

    it('should display view count', async () => {
      const threat = createMockThreat({ viewCount: 12453 });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/12,?453/)).toBeInTheDocument();
      });
    });

    it('should display tags when present', async () => {
      const threat = createMockThreat({
        tags: ['rce', 'log4j', 'java', 'zero-day'],
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/rce/i)).toBeInTheDocument();
        expect(screen.getByText(/log4j/i)).toBeInTheDocument();
        expect(screen.getByText(/java/i)).toBeInTheDocument();
        expect(screen.getByText(/zero-day/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // LOADING STATE TESTS
  // ============================================================================

  describe('Loading State: Shows skeleton while fetching', () => {
    it('should show loading skeleton when isLoading is true', () => {
      mockUseThreat.mockReturnValue({
        threat: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      // Should show loading state
      expect(screen.getByTestId('threat-detail-skeleton')).toBeInTheDocument();
    });

    it('should show loading skeleton for title', () => {
      mockUseThreat.mockReturnValue({
        threat: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      const skeleton = screen.getByTestId('threat-detail-skeleton');
      expect(within(skeleton).getByTestId('skeleton-title')).toBeInTheDocument();
    });

    it('should show loading skeleton for content sections', () => {
      mockUseThreat.mockReturnValue({
        threat: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      const skeleton = screen.getByTestId('threat-detail-skeleton');
      expect(within(skeleton).getByTestId('skeleton-content')).toBeInTheDocument();
    });

    it('should not show threat content while loading', () => {
      mockUseThreat.mockReturnValue({
        threat: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      expect(screen.queryByText('Critical Apache Log4j RCE Vulnerability')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // ERROR STATE TESTS
  // ============================================================================

  describe('Error State: Shows error message when fetch fails', () => {
    it('should show error message when isError is true', async () => {
      mockUseThreat.mockReturnValue({
        threat: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed to fetch threat'),
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should show specific error message from error object', async () => {
      mockUseThreat.mockReturnValue({
        threat: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network connection failed'),
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/Network connection failed/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      const refetch = vi.fn();
      mockUseThreat.mockReturnValue({
        threat: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed to fetch threat'),
        refetch,
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry|try again/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should call refetch when retry button clicked', async () => {
      const refetch = vi.fn();
      mockUseThreat.mockReturnValue({
        threat: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed to fetch threat'),
        refetch,
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry|try again/i });
        userEvent.click(retryButton);
      });

      expect(refetch).toHaveBeenCalled();
    });

    it('should not show threat content when error occurs', async () => {
      mockUseThreat.mockReturnValue({
        threat: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed to fetch threat'),
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.queryByText('Critical Apache Log4j RCE Vulnerability')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // EMPTY/NOT FOUND STATE TESTS
  // ============================================================================

  describe('Empty/Not Found State: Shows not found message', () => {
    it('should show not found message when threat is undefined', async () => {
      mockUseThreat.mockReturnValue({
        threat: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="nonexistent-threat" />);

      await waitFor(() => {
        expect(screen.getByText(/not found|no threat/i)).toBeInTheDocument();
      });
    });

    it('should show not found message when threat is null', async () => {
      mockUseThreat.mockReturnValue({
        threat: null,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="nonexistent-threat" />);

      await waitFor(() => {
        expect(screen.getByText(/not found|no threat/i)).toBeInTheDocument();
      });
    });

    it('should not show CVE section when threat has empty CVE array', async () => {
      const threat = createMockThreat({ cves: [] });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText('Critical Apache Log4j RCE Vulnerability (Log4Shell)')).toBeInTheDocument();
      });

      // CVE section header should not exist
      expect(screen.queryByText(/associated cves|cve list|vulnerabilities/i)).not.toBeInTheDocument();
    });

    it('should not show tags section when threat has empty tags array', async () => {
      const threat = createMockThreat({ tags: [] });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText('Critical Apache Log4j RCE Vulnerability (Log4Shell)')).toBeInTheDocument();
      });

      // Tags section should not be visible
      const tags = screen.queryByText(/tags/i);
      if (tags) {
        // If tags section exists, it should be empty
        expect(tags.nextSibling).toBeEmptyDOMElement();
      }
    });
  });

  // ============================================================================
  // INTERACTION TESTS - BOOKMARK FUNCTIONALITY
  // ============================================================================

  describe('Interaction: Bookmark toggle functionality', () => {
    it('should toggle bookmark when bookmark button is clicked', async () => {
      const threat = createMockThreat({ isBookmarked: false });
      const refetch = vi.fn();
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch,
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).not.toHaveAttribute('aria-pressed', 'true');
      });

      const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
      await userEvent.click(bookmarkButton);

      // Refetch should be called to update bookmark state
      await waitFor(() => {
        expect(refetch).toHaveBeenCalled();
      });
    });

    it('should show optimistic UI update when toggling bookmark', async () => {
      const threat = createMockThreat({ isBookmarked: false });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).toBeInTheDocument();
      });

      const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
      await userEvent.click(bookmarkButton);

      // Button should show loading or updated state immediately
      expect(bookmarkButton).toBeInTheDocument();
    });

    it('should handle bookmark toggle when already bookmarked', async () => {
      const threat = createMockThreat({ isBookmarked: true });
      const refetch = vi.fn();
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch,
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true');
      });

      const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
      await userEvent.click(bookmarkButton);

      await waitFor(() => {
        expect(refetch).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe('Edge Cases: Special content and data handling', () => {
    it('should handle very long threat title', async () => {
      const longTitle = 'Critical ' + 'A'.repeat(500) + ' Vulnerability';
      const threat = createMockThreat({ title: longTitle });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(longTitle))).toBeInTheDocument();
      });
    });

    it('should handle very long markdown content', async () => {
      const longContent = '# Section\n\n' + 'Paragraph. '.repeat(1000);
      const threat = createMockThreat({ content: longContent });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/Section/)).toBeInTheDocument();
      });
    });

    it('should handle markdown with code blocks', async () => {
      const threat = createMockThreat({
        content: '# Exploit\n\n```bash\ncurl http://example.com\n```\n\nDetection command above.',
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/Exploit/)).toBeInTheDocument();
        expect(screen.getByText(/curl http:\/\/example\.com/)).toBeInTheDocument();
      });
    });

    it('should handle markdown with links', async () => {
      const threat = createMockThreat({
        content: 'See [documentation](https://example.com/docs) for details.',
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /documentation/i });
        expect(link).toHaveAttribute('href', 'https://example.com/docs');
      });
    });

    it('should handle CVE with null CVSS score', async () => {
      const threat = createMockThreat({
        cves: [createMockCVE({ cvssScore: null })],
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/CVE-2024-1234/)).toBeInTheDocument();
        // Should show N/A or similar for missing score
        expect(screen.getByText(/N\/A|not available|unknown/i)).toBeInTheDocument();
      });
    });

    it('should handle many CVEs (10+)', async () => {
      const cves = Array.from({ length: 15 }, (_, i) =>
        createMockCVE({
          id: `CVE-2024-${String(i + 1000).padStart(5, '0')}`,
          severity: 'medium',
        })
      );
      const threat = createMockThreat({ cves });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        cves.forEach((cve) => {
          expect(screen.getByText(cve.id)).toBeInTheDocument();
        });
      });
    });

    it('should handle special characters in content', async () => {
      const threat = createMockThreat({
        content: 'Content with <special> & "characters" and $symbols',
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/Content with <special>/)).toBeInTheDocument();
      });
    });

    it('should handle old timestamp correctly', async () => {
      const threat = createMockThreat({
        publishedAt: new Date('2020-01-01T00:00:00Z').toISOString(),
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText('Critical Apache Log4j RCE Vulnerability (Log4Shell)')).toBeInTheDocument();
      });
    });

    it('should handle threat with zero view count', async () => {
      const threat = createMockThreat({ viewCount: 0 });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        expect(screen.getByText(/0/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      const threat = createMockThreat();
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 });
        expect(mainHeading).toBeInTheDocument();
      });
    });

    it('should have accessible bookmark button with aria-label', async () => {
      const threat = createMockThreat();
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).toHaveAttribute('aria-label');
        expect(bookmarkButton).toHaveAttribute('aria-pressed');
      });
    });

    it('should have accessible external links with proper attributes', async () => {
      const threat = createMockThreat({
        sourceUrl: 'https://www.cisa.gov/test',
      });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const sourceLink = screen.getByRole('link', { name: /CISA/i });
        expect(sourceLink).toHaveAttribute('target', '_blank');
        expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('should provide color-independent severity indication', async () => {
      const threat = createMockThreat({ severity: 'critical' });
      mockUseThreat.mockReturnValue({
        threat,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<ThreatDetail threatId="threat-detail-001" />);

      await waitFor(() => {
        const severityBadge = screen.getByText(/critical/i);
        expect(severityBadge).toHaveAttribute('data-severity', 'critical');
      });
    });
  });
});
