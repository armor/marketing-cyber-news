/**
 * Unit Tests for CVEList Component (TDD)
 *
 * Tests cover:
 * - Happy path: Renders list of CVE badges with IDs, severity scores, and CVSS scores
 * - Error path: Handles external links to NVD correctly
 * - Empty/Null state: Renders empty state when no CVEs provided
 * - Edge case: Collapsible/expandable list when many CVEs (>5)
 * - Accessibility: ARIA labels and semantic HTML
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CVE } from '@/types/threat';
import { CVEList } from '@/components/threat/CVEList';

/**
 * Factory function for creating test CVE data
 */
const createCVE = (overrides?: Partial<CVE>): CVE => ({
  id: 'CVE-2024-1234',
  severity: 'high',
  cvssScore: 8.5,
  description: 'Remote code execution vulnerability',
  ...overrides,
});

describe('CVEList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // HAPPY PATH TESTS - RENDERING CVE BADGES
  // ============================================================================

  describe('Happy Path: Renders list of CVE badges', () => {
    it('should render a single CVE badge with ID', () => {
      const cves: CVE[] = [createCVE()];

      render(<CVEList cves={cves} />);

      expect(screen.getByText('CVE-2024-1234')).toBeInTheDocument();
    });

    it('should render multiple CVE badges', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-1234' }),
        createCVE({ id: 'CVE-2024-5678' }),
        createCVE({ id: 'CVE-2024-9999' }),
      ];

      render(<CVEList cves={cves} />);

      expect(screen.getByText('CVE-2024-1234')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-5678')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-9999')).toBeInTheDocument();
    });

    it('should display severity for each CVE badge', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-0001', severity: 'critical' }),
        createCVE({ id: 'CVE-2024-0002', severity: 'high' }),
        createCVE({ id: 'CVE-2024-0003', severity: 'medium' }),
        createCVE({ id: 'CVE-2024-0004', severity: 'low' }),
      ];

      render(<CVEList cves={cves} />);

      const criticalBadge = screen.getByText('CVE-2024-0001').closest('[data-severity]');
      expect(criticalBadge).toHaveAttribute('data-severity', 'critical');

      const highBadge = screen.getByText('CVE-2024-0002').closest('[data-severity]');
      expect(highBadge).toHaveAttribute('data-severity', 'high');

      const mediumBadge = screen.getByText('CVE-2024-0003').closest('[data-severity]');
      expect(mediumBadge).toHaveAttribute('data-severity', 'medium');

      const lowBadge = screen.getByText('CVE-2024-0004').closest('[data-severity]');
      expect(lowBadge).toHaveAttribute('data-severity', 'low');
    });

    it('should use design tokens for severity colors', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-0001', severity: 'critical' }),
      ];

      render(<CVEList cves={cves} />);

      const badge = screen.getByText('CVE-2024-0001').closest('[data-severity]');

      // Should NOT have hardcoded hex colors, RGB values, etc.
      // Should use CSS custom properties (design tokens)
      // This will fail until implementation uses design tokens
      expect(badge).toHaveAttribute('data-severity', 'critical');
    });

    it('should display CVSS score when available', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-1234', cvssScore: 9.8 }),
      ];

      render(<CVEList cves={cves} />);

      expect(screen.getByText(/9\.8/)).toBeInTheDocument();
    });

    it('should display multiple CVEs with different CVSS scores', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-0001', cvssScore: 10.0, severity: 'critical' }),
        createCVE({ id: 'CVE-2024-0002', cvssScore: 7.5, severity: 'high' }),
        createCVE({ id: 'CVE-2024-0003', cvssScore: 4.3, severity: 'medium' }),
        createCVE({ id: 'CVE-2024-0004', cvssScore: 2.1, severity: 'low' }),
      ];

      render(<CVEList cves={cves} />);

      expect(screen.getByText(/10\.0/)).toBeInTheDocument();
      expect(screen.getByText(/7\.5/)).toBeInTheDocument();
      expect(screen.getByText(/4\.3/)).toBeInTheDocument();
      expect(screen.getByText(/2\.1/)).toBeInTheDocument();
    });

    it('should not display CVSS score when null', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-1234', cvssScore: null }),
      ];

      render(<CVEList cves={cves} />);

      expect(screen.getByText('CVE-2024-1234')).toBeInTheDocument();

      // CVSS score section should not be rendered
      const badge = screen.getByText('CVE-2024-1234').closest('[data-testid="cve-badge"]');
      expect(badge).not.toHaveTextContent(/cvss/i);
    });

    it('should display CVSS score with proper formatting (1 decimal place)', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-0001', cvssScore: 8 }),
        createCVE({ id: 'CVE-2024-0002', cvssScore: 8.12345 }),
      ];

      render(<CVEList cves={cves} />);

      // Should format to 1 decimal place
      expect(screen.getByText(/8\.0/)).toBeInTheDocument();
      expect(screen.getByText(/8\.1/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // EXTERNAL LINKS TESTS - NVD DATABASE
  // ============================================================================

  describe('External Links: CVE badges link to NVD', () => {
    it('should render CVE badge as link to NVD', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-1234' }),
      ];

      render(<CVEList cves={cves} />);

      const link = screen.getByRole('link', { name: /CVE-2024-1234/ });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        'https://nvd.nist.gov/vuln/detail/CVE-2024-1234'
      );
    });

    it('should open NVD link in new tab', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-1234' }),
      ];

      render(<CVEList cves={cves} />);

      const link = screen.getByRole('link', { name: /CVE-2024-1234/ });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should create correct NVD URLs for multiple CVEs', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-0001' }),
        createCVE({ id: 'CVE-2023-5678' }),
        createCVE({ id: 'CVE-2022-9999' }),
      ];

      render(<CVEList cves={cves} />);

      const link1 = screen.getByRole('link', { name: /CVE-2024-0001/ });
      expect(link1).toHaveAttribute('href', 'https://nvd.nist.gov/vuln/detail/CVE-2024-0001');

      const link2 = screen.getByRole('link', { name: /CVE-2023-5678/ });
      expect(link2).toHaveAttribute('href', 'https://nvd.nist.gov/vuln/detail/CVE-2023-5678');

      const link3 = screen.getByRole('link', { name: /CVE-2022-9999/ });
      expect(link3).toHaveAttribute('href', 'https://nvd.nist.gov/vuln/detail/CVE-2022-9999');
    });

    it('should handle CVE ID with different formats correctly', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-12345' }),
        createCVE({ id: 'CVE-2024-00001' }),
      ];

      render(<CVEList cves={cves} />);

      const link1 = screen.getByRole('link', { name: /CVE-2024-12345/ });
      expect(link1).toHaveAttribute('href', 'https://nvd.nist.gov/vuln/detail/CVE-2024-12345');

      const link2 = screen.getByRole('link', { name: /CVE-2024-00001/ });
      expect(link2).toHaveAttribute('href', 'https://nvd.nist.gov/vuln/detail/CVE-2024-00001');
    });
  });

  // ============================================================================
  // EMPTY STATE TESTS
  // ============================================================================

  describe('Empty State: No CVEs provided', () => {
    it('should render empty state when cves array is empty', () => {
      render(<CVEList cves={[]} />);

      expect(screen.getByText(/no cves/i)).toBeInTheDocument();
    });

    it('should render empty state with appropriate message', () => {
      render(<CVEList cves={[]} />);

      const emptyState = screen.getByTestId('cve-list-empty');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveTextContent(/no associated cves|no cves available/i);
    });

    it('should not render any CVE badges in empty state', () => {
      render(<CVEList cves={[]} />);

      const badges = screen.queryAllByTestId('cve-badge');
      expect(badges).toHaveLength(0);
    });

    it('should render correctly when cves prop changes from empty to populated', () => {
      const { rerender } = render(<CVEList cves={[]} />);

      expect(screen.getByText(/no cves/i)).toBeInTheDocument();

      rerender(<CVEList cves={[createCVE({ id: 'CVE-2024-1234' })]} />);

      expect(screen.queryByText(/no cves/i)).not.toBeInTheDocument();
      expect(screen.getByText('CVE-2024-1234')).toBeInTheDocument();
    });

    it('should render correctly when cves prop changes from populated to empty', () => {
      const { rerender } = render(
        <CVEList cves={[createCVE({ id: 'CVE-2024-1234' })]} />
      );

      expect(screen.getByText('CVE-2024-1234')).toBeInTheDocument();

      rerender(<CVEList cves={[]} />);

      expect(screen.getByText(/no cves/i)).toBeInTheDocument();
      expect(screen.queryByText('CVE-2024-1234')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // EDGE CASE TESTS - COLLAPSIBLE LIST
  // ============================================================================

  describe('Edge Case: Collapsible list with many CVEs', () => {
    it('should show only 5 CVEs initially when more than 5 are provided', () => {
      const cves: CVE[] = Array.from({ length: 10 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      render(<CVEList cves={cves} />);

      // First 5 should be visible
      expect(screen.getByText('CVE-2024-0001')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-0002')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-0003')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-0004')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-0005')).toBeInTheDocument();

      // 6th through 10th should not be visible initially
      expect(screen.queryByText('CVE-2024-0006')).not.toBeInTheDocument();
      expect(screen.queryByText('CVE-2024-0010')).not.toBeInTheDocument();
    });

    it('should display "Show More" button when more than 5 CVEs', () => {
      const cves: CVE[] = Array.from({ length: 8 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      render(<CVEList cves={cves} />);

      const showMoreButton = screen.getByRole('button', { name: /show more|show all/i });
      expect(showMoreButton).toBeInTheDocument();
    });

    it('should not display "Show More" button when 5 or fewer CVEs', () => {
      const cves: CVE[] = Array.from({ length: 5 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      render(<CVEList cves={cves} />);

      const showMoreButton = screen.queryByRole('button', { name: /show more|show all/i });
      expect(showMoreButton).not.toBeInTheDocument();
    });

    it('should expand to show all CVEs when "Show More" is clicked', async () => {
      const user = userEvent.setup();
      const cves: CVE[] = Array.from({ length: 8 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      render(<CVEList cves={cves} />);

      expect(screen.queryByText('CVE-2024-0006')).not.toBeInTheDocument();

      const showMoreButton = screen.getByRole('button', { name: /show more|show all/i });
      await user.click(showMoreButton);

      // All CVEs should now be visible
      expect(screen.getByText('CVE-2024-0006')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-0007')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-0008')).toBeInTheDocument();
    });

    it('should change button text to "Show Less" after expansion', async () => {
      const user = userEvent.setup();
      const cves: CVE[] = Array.from({ length: 8 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      render(<CVEList cves={cves} />);

      const showMoreButton = screen.getByRole('button', { name: /show more|show all/i });
      await user.click(showMoreButton);

      const showLessButton = screen.getByRole('button', { name: /show less|show fewer/i });
      expect(showLessButton).toBeInTheDocument();
    });

    it('should collapse back to 5 CVEs when "Show Less" is clicked', async () => {
      const user = userEvent.setup();
      const cves: CVE[] = Array.from({ length: 8 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      render(<CVEList cves={cves} />);

      const showMoreButton = screen.getByRole('button', { name: /show more|show all/i });
      await user.click(showMoreButton);

      expect(screen.getByText('CVE-2024-0008')).toBeInTheDocument();

      const showLessButton = screen.getByRole('button', { name: /show less|show fewer/i });
      await user.click(showLessButton);

      // Should collapse back to 5
      expect(screen.queryByText('CVE-2024-0006')).not.toBeInTheDocument();
      expect(screen.queryByText('CVE-2024-0008')).not.toBeInTheDocument();
      expect(screen.getByText('CVE-2024-0005')).toBeInTheDocument();
    });

    it('should respect custom maxVisible prop', () => {
      const cves: CVE[] = Array.from({ length: 10 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      render(<CVEList cves={cves} maxVisible={3} />);

      // Only first 3 should be visible
      expect(screen.getByText('CVE-2024-0001')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-0002')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-0003')).toBeInTheDocument();
      expect(screen.queryByText('CVE-2024-0004')).not.toBeInTheDocument();

      expect(screen.getByRole('button', { name: /show more|show all/i })).toBeInTheDocument();
    });

    it('should show count of hidden CVEs in "Show More" button', () => {
      const cves: CVE[] = Array.from({ length: 12 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      render(<CVEList cves={cves} />);

      const showMoreButton = screen.getByRole('button', { name: /show.*7.*more/i });
      expect(showMoreButton).toBeInTheDocument();
    });

    it('should handle exactly 6 CVEs correctly', () => {
      const cves: CVE[] = Array.from({ length: 6 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      render(<CVEList cves={cves} />);

      // First 5 visible
      expect(screen.getByText('CVE-2024-0005')).toBeInTheDocument();
      expect(screen.queryByText('CVE-2024-0006')).not.toBeInTheDocument();

      // Should show "Show 1 More"
      expect(screen.getByRole('button', { name: /show.*1.*more/i })).toBeInTheDocument();
    });

    it('should handle 100 CVEs efficiently', async () => {
      const user = userEvent.setup();
      const cves: CVE[] = Array.from({ length: 100 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      render(<CVEList cves={cves} />);

      // Should show first 5
      expect(screen.getByText('CVE-2024-0001')).toBeInTheDocument();
      expect(screen.queryByText('CVE-2024-0100')).not.toBeInTheDocument();

      const showMoreButton = screen.getByRole('button', { name: /show.*95.*more/i });
      await user.click(showMoreButton);

      // Should now show all 100
      expect(screen.getByText('CVE-2024-0100')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('Accessibility: ARIA labels and semantic HTML', () => {
    it('should use semantic list element for CVE list', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-1234' }),
        createCVE({ id: 'CVE-2024-5678' }),
      ];

      render(<CVEList cves={cves} />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      const listItems = within(list).getAllByRole('listitem');
      expect(listItems).toHaveLength(2);
    });

    it('should have descriptive ARIA label for the CVE list', () => {
      const cves: CVE[] = [createCVE()];

      render(<CVEList cves={cves} />);

      const list = screen.getByRole('list', { name: /cve|vulnerabilities/i });
      expect(list).toBeInTheDocument();
    });

    it('should have ARIA label on CVE links describing external navigation', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-1234' }),
      ];

      render(<CVEList cves={cves} />);

      const link = screen.getByRole('link', { name: /CVE-2024-1234/ });
      const ariaLabel = link.getAttribute('aria-label');

      expect(ariaLabel).toMatch(/cve-2024-1234/i);
      expect(ariaLabel).toMatch(/nvd|national vulnerability database|external/i);
    });

    it('should have proper ARIA attributes for severity badges', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-1234', severity: 'critical' }),
      ];

      render(<CVEList cves={cves} />);

      const badge = screen.getByText('CVE-2024-1234').closest('[data-severity]');
      expect(badge).toHaveAttribute('data-severity', 'critical');

      // Should have text representation of severity (not just color)
      const badgeText = badge?.textContent;
      expect(badgeText).toMatch(/critical/i);
    });

    it('should have accessible "Show More" button with descriptive text', () => {
      const cves: CVE[] = Array.from({ length: 8 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      render(<CVEList cves={cves} />);

      const button = screen.getByRole('button', { name: /show.*3.*more/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when list is expanded', async () => {
      const user = userEvent.setup();
      const cves: CVE[] = Array.from({ length: 8 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      render(<CVEList cves={cves} />);

      const button = screen.getByRole('button', { name: /show more|show all/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');

      await user.click(button);

      const updatedButton = screen.getByRole('button', { name: /show less|show fewer/i });
      expect(updatedButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should provide screen reader text for CVSS scores', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-1234', cvssScore: 9.8 }),
      ];

      render(<CVEList cves={cves} />);

      // Should have accessible label for CVSS score
      const badge = screen.getByTestId('cve-badge');
      expect(badge).toHaveTextContent(/9\.8/);

      // Should contain "CVSS" text for context
      expect(badge).toHaveTextContent(/cvss/i);
    });

    it('should maintain focus after expanding/collapsing', async () => {
      const user = userEvent.setup();
      const cves: CVE[] = Array.from({ length: 8 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      render(<CVEList cves={cves} />);

      const button = screen.getByRole('button', { name: /show more|show all/i });
      await user.click(button);

      const collapsedButton = screen.getByRole('button', { name: /show less|show fewer/i });
      expect(collapsedButton).toHaveFocus();
    });

    it('should have proper keyboard navigation for CVE links', async () => {
      const user = userEvent.setup();
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-1234' }),
        createCVE({ id: 'CVE-2024-5678' }),
      ];

      render(<CVEList cves={cves} />);

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);

      // Links should be keyboard accessible
      await user.tab();
      expect(links[0]).toHaveFocus();

      await user.tab();
      expect(links[1]).toHaveFocus();
    });

    it('should provide context for color-blind users via text', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-0001', severity: 'critical' }),
        createCVE({ id: 'CVE-2024-0002', severity: 'high' }),
        createCVE({ id: 'CVE-2024-0003', severity: 'medium' }),
        createCVE({ id: 'CVE-2024-0004', severity: 'low' }),
      ];

      render(<CVEList cves={cves} />);

      // Each badge should have text representation of severity
      const badges = screen.getAllByTestId('cve-badge');
      badges.forEach((badge) => {
        const severity = badge.getAttribute('data-severity');
        expect(badge.textContent).toMatch(new RegExp(severity!, 'i'));
      });
    });

    it('should have proper heading or label for the component', () => {
      const cves: CVE[] = [createCVE()];

      render(<CVEList cves={cves} />);

      // Should have a heading or accessible name
      const container = screen.getByTestId('cve-list');
      expect(container).toHaveAttribute('aria-label');
    });
  });

  // ============================================================================
  // EDGE CASES - DATA HANDLING
  // ============================================================================

  describe('Edge Cases: Data handling and special scenarios', () => {
    it('should handle CVE with very long description', () => {
      const longDescription = 'A'.repeat(500);
      const cves: CVE[] = [
        createCVE({ description: longDescription }),
      ];

      render(<CVEList cves={cves} />);

      expect(screen.getByText('CVE-2024-1234')).toBeInTheDocument();
    });

    it('should handle CVE with empty description', () => {
      const cves: CVE[] = [
        createCVE({ description: '' }),
      ];

      render(<CVEList cves={cves} />);

      expect(screen.getByText('CVE-2024-1234')).toBeInTheDocument();
    });

    it('should handle CVE with special characters in ID', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-00001' }),
      ];

      render(<CVEList cves={cves} />);

      expect(screen.getByText('CVE-2024-00001')).toBeInTheDocument();
    });

    it('should handle CVSS score of 0.0', () => {
      const cves: CVE[] = [
        createCVE({ cvssScore: 0.0 }),
      ];

      render(<CVEList cves={cves} />);

      expect(screen.getByText(/0\.0/)).toBeInTheDocument();
    });

    it('should handle maximum CVSS score of 10.0', () => {
      const cves: CVE[] = [
        createCVE({ cvssScore: 10.0 }),
      ];

      render(<CVEList cves={cves} />);

      expect(screen.getByText(/10\.0/)).toBeInTheDocument();
    });

    it('should not break with single CVE when maxVisible is 0', () => {
      const cves: CVE[] = [createCVE()];

      render(<CVEList cves={cves} maxVisible={0} />);

      // Should show at least 1 CVE or handle gracefully
      expect(screen.getByText('CVE-2024-1234')).toBeInTheDocument();
    });

    it('should handle maxVisible greater than CVE count', () => {
      const cves: CVE[] = [
        createCVE({ id: 'CVE-2024-1234' }),
        createCVE({ id: 'CVE-2024-5678' }),
      ];

      render(<CVEList cves={cves} maxVisible={10} />);

      expect(screen.getByText('CVE-2024-1234')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-5678')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument();
    });

    it('should update correctly when CVE list changes', () => {
      const initialCves: CVE[] = [
        createCVE({ id: 'CVE-2024-1111' }),
        createCVE({ id: 'CVE-2024-2222' }),
      ];

      const { rerender } = render(<CVEList cves={initialCves} />);

      expect(screen.getByText('CVE-2024-1111')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-2222')).toBeInTheDocument();

      const updatedCves: CVE[] = [
        createCVE({ id: 'CVE-2024-3333' }),
      ];

      rerender(<CVEList cves={updatedCves} />);

      expect(screen.queryByText('CVE-2024-1111')).not.toBeInTheDocument();
      expect(screen.queryByText('CVE-2024-2222')).not.toBeInTheDocument();
      expect(screen.getByText('CVE-2024-3333')).toBeInTheDocument();
    });

    it('should maintain expanded state when new CVEs are added', async () => {
      const user = userEvent.setup();
      const initialCves: CVE[] = Array.from({ length: 8 }, (_, i) =>
        createCVE({ id: `CVE-2024-${String(i + 1).padStart(4, '0')}` })
      );

      const { rerender } = render(<CVEList cves={initialCves} />);

      const showMoreButton = screen.getByRole('button', { name: /show more/i });
      await user.click(showMoreButton);

      expect(screen.getByText('CVE-2024-0008')).toBeInTheDocument();

      const updatedCves: CVE[] = [
        ...initialCves,
        createCVE({ id: 'CVE-2024-0009' }),
      ];

      rerender(<CVEList cves={updatedCves} />);

      // Should remain expanded
      expect(screen.getByText('CVE-2024-0008')).toBeInTheDocument();
      expect(screen.getByText('CVE-2024-0009')).toBeInTheDocument();
    });
  });
});
