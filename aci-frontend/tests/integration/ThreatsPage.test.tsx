/**
 * Integration Tests for Threats Page
 * Tests the full Threats page rendering with MSW mocked API responses
 *
 * CONSTITUTION PRINCIPLE VIII - TDD Test Completeness:
 * ✓ Happy path: Full threats page renders with list, filters, search, and pagination
 * ✓ Error path: Shows error state when API returns 500, retry button works
 * ✓ Empty state: Shows "No threats found" when filters return zero results
 * ✓ Edge case: Searches for CVE ID and displays matching results
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { HttpResponse, http } from 'msw';
import { ThreatsPage } from '@/pages/ThreatsPage';
import { AuthProvider } from '@/stores/AuthContext';
import { server } from '../setup';
import type { ThreatSummary, Severity, ThreatCategory } from '@/types/threat';

/**
 * Mock threat data factory
 */
function createMockThreat(overrides?: Partial<ThreatSummary>): ThreatSummary {
  const id = Math.random().toString(36).substr(2, 9);
  return {
    id: `threat-${id}`,
    title: `Threat ${id}`,
    summary: `Summary for threat ${id}`,
    severity: 'medium' as Severity,
    category: 'vulnerability' as ThreatCategory,
    source: 'NVD',
    publishedAt: new Date().toISOString(),
    cves: [],
    isBookmarked: false,
    ...overrides,
  };
}

/**
 * Mock threats for testing
 */
const MOCK_CRITICAL_THREAT: ThreatSummary = {
  id: 'threat-critical-001',
  title: 'Critical: Zero-day RCE in Apache Struts',
  summary: 'Remote code execution vulnerability affects production systems',
  severity: 'critical' as Severity,
  category: 'vulnerability' as ThreatCategory,
  source: 'NVD',
  publishedAt: new Date().toISOString(),
  cves: ['CVE-2024-12345', 'CVE-2024-12346'],
  isBookmarked: false,
};

const MOCK_HIGH_THREAT: ThreatSummary = {
  id: 'threat-high-001',
  title: 'High: Ransomware Campaign Targeting Finance',
  summary: 'LockBit operators targeting financial institutions',
  severity: 'high' as Severity,
  category: 'ransomware' as ThreatCategory,
  source: 'CISA',
  publishedAt: new Date(Date.now() - 3600000).toISOString(),
  cves: [],
  isBookmarked: true,
};

const MOCK_MEDIUM_THREAT: ThreatSummary = {
  id: 'threat-medium-001',
  title: 'Medium: Phishing Campaign Detected',
  summary: 'Targeted phishing emails targeting enterprise users',
  severity: 'medium' as Severity,
  category: 'phishing' as ThreatCategory,
  source: 'Proofpoint',
  publishedAt: new Date(Date.now() - 7200000).toISOString(),
  cves: [],
  isBookmarked: false,
};

const MOCK_LOW_THREAT: ThreatSummary = {
  id: 'threat-low-001',
  title: 'Low: Suspicious Activity Reported',
  summary: 'Minor security incident reported in logs',
  severity: 'low' as Severity,
  category: 'vulnerability' as ThreatCategory,
  source: 'Internal',
  publishedAt: new Date(Date.now() - 86400000).toISOString(),
  cves: [],
  isBookmarked: false,
};

/**
 * Create 25 threats to test pagination (20 per page = 2 pages)
 */
function createMockThreatsForPagination(): ThreatSummary[] {
  const threats: ThreatSummary[] = [];
  for (let i = 0; i < 25; i++) {
    threats.push(
      createMockThreat({
        title: `Threat ${i + 1}`,
        severity: ['critical', 'high', 'medium', 'low'][i % 4] as Severity,
        category: ['vulnerability', 'ransomware', 'phishing', 'vulnerability'][i % 4] as ThreatCategory,
        cves: i % 3 === 0 ? [`CVE-2024-${String(i).padStart(5, '0')}`] : [],
      })
    );
  }
  return threats;
}

/**
 * Test wrapper component with required providers
 */
const ThreatsPageWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('ThreatsPage Integration Tests', () => {
  /**
   * Note: MSW server is configured in tests/setup.ts
   * Handlers are reset after each test automatically
   */

  // =========================================================================
  // HAPPY PATH - Full threats page renders with filters, search, and pagination
  // =========================================================================

  describe('Happy Path: Full Page Rendering with List and Controls', () => {
    it('should render threats list with threat cards', async () => {
      // Setup MSW handler with threat list
      server.use(
        http.get('/api/v1/threats', () => {
          const threats = [MOCK_CRITICAL_THREAT, MOCK_HIGH_THREAT, MOCK_MEDIUM_THREAT];
          return HttpResponse.json({
            success: true,
            data: threats,
            total: threats.length,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      // Wait for threats to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading|loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify threat cards are rendered
      expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      expect(screen.getByText('High: Ransomware Campaign Targeting Finance')).toBeInTheDocument();
      expect(screen.getByText('Medium: Phishing Campaign Detected')).toBeInTheDocument();
    });

    it('should render severity badges on threat cards', async () => {
      server.use(
        http.get('/api/v1/threats', () => {
          return HttpResponse.json({
            success: true,
            data: [MOCK_CRITICAL_THREAT, MOCK_HIGH_THREAT, MOCK_MEDIUM_THREAT, MOCK_LOW_THREAT],
            total: 4,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.queryByText(/Loading|loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify severity badges are present
      const criticalBadges = screen.getAllByTestId('severity-badge-critical');
      expect(criticalBadges.length).toBeGreaterThan(0);

      const highBadges = screen.getAllByTestId('severity-badge-high');
      expect(highBadges.length).toBeGreaterThan(0);
    });

    it('should display threat summaries and metadata', async () => {
      server.use(
        http.get('/api/v1/threats', () => {
          return HttpResponse.json({
            success: true,
            data: [MOCK_CRITICAL_THREAT],
            total: 1,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Remote code execution vulnerability affects production systems')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify metadata is displayed
      expect(screen.getByText(/NVD/i)).toBeInTheDocument(); // source
      expect(screen.getByTestId(`threat-cves-${MOCK_CRITICAL_THREAT.id}`)).toHaveTextContent('CVE-2024-12345');
    });

    it('should render filter panel with severity options', async () => {
      server.use(
        http.get('/api/v1/threats', () => {
          return HttpResponse.json({
            success: true,
            data: [MOCK_CRITICAL_THREAT],
            total: 1,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Critical: Zero-day/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify filter controls are present
      expect(screen.getByTestId('severity-filter')).toBeInTheDocument();
      expect(screen.getByText(/Critical/i, { selector: '[role="option"]' })).toBeInTheDocument();
      expect(screen.getByText(/High/i, { selector: '[role="option"]' })).toBeInTheDocument();
    });

    it('should filter threats by severity', async () => {
      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const severity = url.searchParams.getAll('severity');

          // Filter mock data based on severity param
          let filtered = [MOCK_CRITICAL_THREAT, MOCK_HIGH_THREAT, MOCK_MEDIUM_THREAT, MOCK_LOW_THREAT];
          if (severity.length > 0) {
            filtered = filtered.filter(t => severity.includes(t.severity));
          }

          return HttpResponse.json({
            success: true,
            data: filtered,
            total: filtered.length,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open severity filter
      const severityFilterButton = screen.getByTestId('severity-filter-button');
      await user.click(severityFilterButton);

      // Select only "Critical"
      const criticalOption = screen.getByRole('option', { name: /Critical/i });
      await user.click(criticalOption);

      // Wait for filter to apply
      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
        expect(screen.queryByText('High: Ransomware Campaign Targeting Finance')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should filter threats by category', async () => {
      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const category = url.searchParams.getAll('category');

          let filtered = [MOCK_CRITICAL_THREAT, MOCK_HIGH_THREAT, MOCK_MEDIUM_THREAT];
          if (category.length > 0) {
            filtered = filtered.filter(t => category.includes(t.category));
          }

          return HttpResponse.json({
            success: true,
            data: filtered,
            total: filtered.length,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Open category filter
      const categoryFilterButton = screen.getByTestId('category-filter-button');
      await user.click(categoryFilterButton);

      // Select "Ransomware"
      const ransomwareOption = screen.getByRole('option', { name: /Ransomware/i });
      await user.click(ransomwareOption);

      // Wait for filter to apply
      await waitFor(() => {
        expect(screen.getByText('High: Ransomware Campaign Targeting Finance')).toBeInTheDocument();
        expect(screen.queryByText('Critical: Zero-day RCE in Apache Struts')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should search threats by text', async () => {
      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search');

          let filtered = [MOCK_CRITICAL_THREAT, MOCK_HIGH_THREAT, MOCK_MEDIUM_THREAT];
          if (search) {
            filtered = filtered.filter(t =>
              t.title.toLowerCase().includes(search.toLowerCase()) ||
              t.summary.toLowerCase().includes(search.toLowerCase())
            );
          }

          return HttpResponse.json({
            success: true,
            data: filtered,
            total: filtered.length,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Type in search box
      const searchInput = screen.getByTestId('threat-search-input');
      await user.type(searchInput, 'Ransomware');

      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText('High: Ransomware Campaign Targeting Finance')).toBeInTheDocument();
        expect(screen.queryByText('Critical: Zero-day RCE in Apache Struts')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should support pagination with 20 items per page', async () => {
      const allThreats = createMockThreatsForPagination();

      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const page = parseInt(url.searchParams.get('page') || '1', 10);
          const pageSize = 20;
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          const paginatedThreats = allThreats.slice(start, end);

          return HttpResponse.json({
            success: true,
            data: paginatedThreats,
            total: allThreats.length,
            page,
            page_size: pageSize,
            total_pages: Math.ceil(allThreats.length / pageSize),
          });
        })
      );

      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      // Wait for first page to load
      await waitFor(() => {
        expect(screen.getByText('Threat 1')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify we're on page 1 with 20 items
      expect(screen.getByText('Threat 1')).toBeInTheDocument();
      expect(screen.getByText('Threat 20')).toBeInTheDocument();
      expect(screen.queryByText('Threat 21')).not.toBeInTheDocument();

      // Navigate to page 2
      const user = userEvent.setup();
      const nextPageButton = screen.getByTestId('pagination-next-button');
      await user.click(nextPageButton);

      // Wait for page 2 to load
      await waitFor(() => {
        expect(screen.getByText('Threat 21')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify page 2 has remaining items (5 items on page 2)
      expect(screen.getByText('Threat 25')).toBeInTheDocument();
    });

    it('should navigate to threat detail on card click', async () => {
      server.use(
        http.get('/api/v1/threats', () => {
          return HttpResponse.json({
            success: true,
            data: [MOCK_CRITICAL_THREAT],
            total: 1,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click threat card
      const threatCard = screen.getByTestId(`threat-card-${MOCK_CRITICAL_THREAT.id}`);
      await user.click(threatCard);

      // Verify navigation occurred (URL changed)
      await waitFor(() => {
        expect(window.location.pathname).toContain(`/threats/${MOCK_CRITICAL_THREAT.id}`);
      }, { timeout: 3000 });
    });

    it('should toggle bookmark on threat card', async () => {
      server.use(
        http.get('/api/v1/threats', () => {
          return HttpResponse.json({
            success: true,
            data: [MOCK_CRITICAL_THREAT],
            total: 1,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        }),
        http.post('/api/v1/threats/:id/bookmark', () => {
          return HttpResponse.json({ success: true });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click bookmark button
      const bookmarkButton = screen.getByTestId(`bookmark-button-${MOCK_CRITICAL_THREAT.id}`);
      await user.click(bookmarkButton);

      // Verify bookmark state changed
      await waitFor(() => {
        expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true');
      }, { timeout: 3000 });
    });
  });

  // =========================================================================
  // ERROR PATH - API failure with error state and retry
  // =========================================================================

  describe('Error Path: API Failure and Recovery', () => {
    it('should display error message when API returns 500', async () => {
      server.use(
        http.get('/api/v1/threats', () => {
          return HttpResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/Error|Failed to load|Internal server error/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify error UI is shown
      expect(screen.getByTestId('threats-error-state')).toBeInTheDocument();
    });

    it('should show error details in error state', async () => {
      server.use(
        http.get('/api/v1/threats', () => {
          return HttpResponse.json(
            { success: false, error: 'Database connection failed' },
            { status: 500 }
          );
        })
      );

      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Database connection failed|Error/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should retry and recover from API error', async () => {
      let callCount = 0;

      server.use(
        http.get('/api/v1/threats', () => {
          callCount++;
          // First call fails, second call succeeds
          if (callCount === 1) {
            return HttpResponse.json(
              { success: false, error: 'Service unavailable' },
              { status: 503 }
            );
          }
          return HttpResponse.json({
            success: true,
            data: [MOCK_CRITICAL_THREAT],
            total: 1,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/Error|Failed|unavailable/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click retry button
      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);

      // Wait for successful load
      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(callCount).toBe(2);
    });

    it('should handle network errors gracefully', async () => {
      server.use(
        http.get('/api/v1/threats', () => {
          return HttpResponse.error();
        })
      );

      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Error|Failed to load|Network error/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByTestId('threats-error-state')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // EMPTY/NULL STATE - No results from filters or search
  // =========================================================================

  describe('Empty/Null State: No Threats Found', () => {
    it('should show empty state when no threats exist', async () => {
      server.use(
        http.get('/api/v1/threats', () => {
          return HttpResponse.json({
            success: true,
            data: [],
            total: 0,
            page: 1,
            page_size: 20,
            total_pages: 0,
          });
        })
      );

      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByTestId('threats-empty-state')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText(/No threats found|No data|No results/i)).toBeInTheDocument();
    });

    it('should show empty state when search returns no results', async () => {
      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search');

          // Return empty results for search
          if (search) {
            return HttpResponse.json({
              success: true,
              data: [],
              total: 0,
              page: 1,
              page_size: 20,
              total_pages: 0,
            });
          }

          return HttpResponse.json({
            success: true,
            data: [MOCK_CRITICAL_THREAT],
            total: 1,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Search for non-existent term
      const searchInput = screen.getByTestId('threat-search-input');
      await user.type(searchInput, 'nonexistentterm123xyz');

      // Wait for empty state
      await waitFor(() => {
        expect(screen.getByTestId('threats-empty-state')).toBeInTheDocument();
        expect(screen.getByText(/No threats found|No results|0 results/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show empty state when filters return no results', async () => {
      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const severity = url.searchParams.getAll('severity');

          // Return empty results for specific severity filter
          if (severity.length > 0 && severity.includes('critical')) {
            return HttpResponse.json({
              success: true,
              data: [],
              total: 0,
              page: 1,
              page_size: 20,
              total_pages: 0,
            });
          }

          return HttpResponse.json({
            success: true,
            data: [MOCK_CRITICAL_THREAT, MOCK_HIGH_THREAT],
            total: 2,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Apply filter that returns no results
      const severityFilterButton = screen.getByTestId('severity-filter-button');
      await user.click(severityFilterButton);

      const criticalOption = screen.getByRole('option', { name: /Critical/i });
      await user.click(criticalOption);

      // Wait for empty state
      await waitFor(() => {
        expect(screen.getByTestId('threats-empty-state')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should suggest clearing filters when empty from filter', async () => {
      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const severity = url.searchParams.get('severity');

          if (severity === 'critical') {
            return HttpResponse.json({
              success: true,
              data: [],
              total: 0,
              page: 1,
              page_size: 20,
              total_pages: 0,
            });
          }

          return HttpResponse.json({
            success: true,
            data: [MOCK_HIGH_THREAT],
            total: 1,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Ransomware|Campaign/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Apply filtering that yields no results
      const filterButton = screen.getByTestId('severity-filter-button');
      await user.click(filterButton);

      const criticalOption = screen.getByRole('option', { name: /Critical/i });
      await user.click(criticalOption);

      await waitFor(() => {
        expect(screen.getByTestId('threats-empty-state')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify clear filters button is shown
      expect(screen.getByTestId('clear-filters-button')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // EDGE CASE - Search by CVE ID
  // =========================================================================

  describe('Edge Case: Search by CVE ID', () => {
    it('should find threats by CVE ID', async () => {
      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search');

          let filtered = [MOCK_CRITICAL_THREAT, MOCK_HIGH_THREAT, MOCK_MEDIUM_THREAT];
          if (search) {
            filtered = filtered.filter(t =>
              t.cves.some(cve => cve.toUpperCase().includes(search.toUpperCase()))
            );
          }

          return HttpResponse.json({
            success: true,
            data: filtered,
            total: filtered.length,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Search by CVE ID
      const searchInput = screen.getByTestId('threat-search-input');
      await user.type(searchInput, 'CVE-2024-12345');

      // Wait for filtered results
      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
        // High and Medium threats should not be shown
        expect(screen.queryByText('High: Ransomware Campaign Targeting Finance')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display CVE IDs on matching threats', async () => {
      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search');

          if (search && search.includes('CVE')) {
            return HttpResponse.json({
              success: true,
              data: [MOCK_CRITICAL_THREAT],
              total: 1,
              page: 1,
              page_size: 20,
              total_pages: 1,
            });
          }

          return HttpResponse.json({
            success: true,
            data: [MOCK_CRITICAL_THREAT],
            total: 1,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Search by CVE
      const searchInput = screen.getByTestId('threat-search-input');
      await user.type(searchInput, 'CVE-2024-12345');

      await waitFor(() => {
        const cveElement = screen.getByTestId(`threat-cves-${MOCK_CRITICAL_THREAT.id}`);
        expect(cveElement).toHaveTextContent('CVE-2024-12345');
        expect(cveElement).toHaveTextContent('CVE-2024-12346');
      }, { timeout: 3000 });
    });

    it('should handle partial CVE searches', async () => {
      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search');

          if (search && search.includes('2024')) {
            return HttpResponse.json({
              success: true,
              data: [MOCK_CRITICAL_THREAT],
              total: 1,
              page: 1,
              page_size: 20,
              total_pages: 1,
            });
          }

          return HttpResponse.json({
            success: true,
            data: [MOCK_CRITICAL_THREAT, MOCK_HIGH_THREAT, MOCK_MEDIUM_THREAT],
            total: 3,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Search with partial CVE format
      const searchInput = screen.getByTestId('threat-search-input');
      await user.type(searchInput, 'CVE-2024');

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should return empty result for non-existent CVE', async () => {
      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search');

          if (search === 'CVE-9999-99999') {
            return HttpResponse.json({
              success: true,
              data: [],
              total: 0,
              page: 1,
              page_size: 20,
              total_pages: 0,
            });
          }

          return HttpResponse.json({
            success: true,
            data: [MOCK_CRITICAL_THREAT],
            total: 1,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Search for non-existent CVE
      const searchInput = screen.getByTestId('threat-search-input');
      await user.type(searchInput, 'CVE-9999-99999');

      await waitFor(() => {
        expect(screen.getByTestId('threats-empty-state')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  // =========================================================================
  // ADDITIONAL EDGE CASES
  // =========================================================================

  describe('Additional Edge Cases', () => {
    it('should clear search input when clear button is clicked', async () => {
      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search');

          if (search) {
            return HttpResponse.json({
              success: true,
              data: [MOCK_CRITICAL_THREAT],
              total: 1,
              page: 1,
              page_size: 20,
              total_pages: 1,
            });
          }

          return HttpResponse.json({
            success: true,
            data: [MOCK_CRITICAL_THREAT, MOCK_HIGH_THREAT, MOCK_MEDIUM_THREAT],
            total: 3,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Type search term
      const searchInput = screen.getByTestId('threat-search-input') as HTMLInputElement;
      await user.type(searchInput, 'Critical');

      await waitFor(() => {
        expect(searchInput.value).toBe('Critical');
      }, { timeout: 3000 });

      // Click clear button
      const clearButton = screen.getByTestId('search-clear-button');
      await user.click(clearButton);

      // Verify search cleared and all results returned
      await waitFor(() => {
        expect(searchInput.value).toBe('');
        expect(screen.getByText('High: Ransomware Campaign Targeting Finance')).toBeInTheDocument();
        expect(screen.getByText('Medium: Phishing Campaign Detected')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should reset pagination to page 1 when filters change', async () => {
      const allThreats = createMockThreatsForPagination();

      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const page = parseInt(url.searchParams.get('page') || '1', 10);
          const severity = url.searchParams.getAll('severity');
          const pageSize = 20;

          let filtered = allThreats;
          if (severity.length > 0) {
            filtered = filtered.filter(t => severity.includes(t.severity));
          }

          const start = (page - 1) * pageSize;
          const end = start + pageSize;

          return HttpResponse.json({
            success: true,
            data: filtered.slice(start, end),
            total: filtered.length,
            page,
            page_size: pageSize,
            total_pages: Math.ceil(filtered.length / pageSize),
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Threat 1')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Go to page 2
      const nextButton = screen.getByTestId('pagination-next-button');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Threat 21')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Apply filter
      const filterButton = screen.getByTestId('severity-filter-button');
      await user.click(filterButton);

      // Should reset to page 1
      await waitFor(() => {
        expect(screen.getByTestId('pagination-current-page')).toHaveTextContent('1');
      }, { timeout: 3000 });
    });

    it('should display loading state initially', async () => {
      server.use(
        http.get('/api/v1/threats', async () => {
          // Simulate slow response
          await new Promise(resolve => setTimeout(resolve, 500));
          return HttpResponse.json({
            success: true,
            data: [MOCK_CRITICAL_THREAT],
            total: 1,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      // Initially should show loading
      expect(screen.getByTestId('threats-loading-state')).toBeInTheDocument();

      // Then data loads
      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should combine multiple filters', async () => {
      server.use(
        http.get('/api/v1/threats', async ({ request }) => {
          const url = new URL(request.url);
          const severity = url.searchParams.getAll('severity');
          const category = url.searchParams.getAll('category');

          let filtered = [MOCK_CRITICAL_THREAT, MOCK_HIGH_THREAT, MOCK_MEDIUM_THREAT];

          if (severity.length > 0) {
            filtered = filtered.filter(t => severity.includes(t.severity));
          }
          if (category.length > 0) {
            filtered = filtered.filter(t => category.includes(t.category));
          }

          return HttpResponse.json({
            success: true,
            data: filtered,
            total: filtered.length,
            page: 1,
            page_size: 20,
            total_pages: 1,
          });
        })
      );

      const user = userEvent.setup();
      render(<ThreatsPage />, { wrapper: ThreatsPageWrapper });

      await waitFor(() => {
        expect(screen.getByText('Critical: Zero-day RCE in Apache Struts')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Apply severity filter
      let filterButton = screen.getByTestId('severity-filter-button');
      await user.click(filterButton);
      let option = screen.getByRole('option', { name: /High/i });
      await user.click(option);

      // Apply category filter
      filterButton = screen.getByTestId('category-filter-button');
      await user.click(filterButton);
      option = screen.getByRole('option', { name: /Ransomware/i });
      await user.click(option);

      // Should show only threats matching both filters
      await waitFor(() => {
        expect(screen.getByText('High: Ransomware Campaign Targeting Finance')).toBeInTheDocument();
        expect(screen.queryByText('Critical: Zero-day RCE in Apache Struts')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
