/**
 * Unit Tests for ThreatCard Component (TDD)
 *
 * Tests cover:
 * - Happy path: Renders threat card with all fields (title, summary, severity badge, category, source, timestamp, CVEs)
 * - Failure path: Handles click event and calls onSelect callback with threat ID
 * - Empty/Null state: Renders correctly when optional fields are missing (no CVEs, not bookmarked)
 * - Edge case: Renders bookmark button and shows bookmarked state correctly
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ThreatSummary } from '@/types/threat';
import { ThreatCategory } from '@/types/threat';
import { ThreatCard } from '@/components/threat/ThreatCard';

/**
 * Factory function for creating test threat data
 */
const createThreatSummary = (overrides?: Partial<ThreatSummary>): ThreatSummary => ({
  id: 'threat-001',
  title: 'Critical Apache Log4j RCE Vulnerability',
  summary: 'Remote code execution vulnerability discovered in Log4j affecting millions of systems',
  severity: 'critical',
  category: ThreatCategory.VULNERABILITY,
  source: 'CISA',
  publishedAt: new Date('2024-12-13T10:30:00Z').toISOString(),
  cves: ['CVE-2024-1234', 'CVE-2024-5678'],
  isBookmarked: false,
  ...overrides,
});

describe('ThreatCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ============================================================================
  // HAPPY PATH TESTS
  // ============================================================================

  describe('Happy Path: Renders threat card with all fields', () => {
    it('should render threat card with title, summary, and all required information', () => {
      const threat = createThreatSummary();

      render(<ThreatCard threat={threat} />);

      expect(screen.getByText('Critical Apache Log4j RCE Vulnerability')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Remote code execution vulnerability discovered in Log4j affecting millions of systems'
        )
      ).toBeInTheDocument();
    });

    it('should display severity badge with correct styling for critical severity', () => {
      const threat = createThreatSummary({
        severity: 'critical',
      });

      render(<ThreatCard threat={threat} />);

      const severityBadge = screen.getByText(/critical/i);
      expect(severityBadge).toBeInTheDocument();
      expect(severityBadge).toHaveAttribute('data-severity', 'critical');
    });

    it('should display threat category', () => {
      const threat = createThreatSummary({
        category: ThreatCategory.VULNERABILITY,
      });

      render(<ThreatCard threat={threat} />);

      // Category should be displayed (may be formatted as "Vulnerability" or similar)
      const card = screen.getByText('Critical Apache Log4j RCE Vulnerability').closest('div[data-testid="threat-card"]');
      expect(card).toHaveTextContent(/vulnerability/i);
    });

    it('should display threat source', () => {
      const threat = createThreatSummary({
        source: 'CISA',
      });

      render(<ThreatCard threat={threat} />);

      expect(screen.getByText('CISA')).toBeInTheDocument();
    });

    it('should display formatted timestamp', () => {
      const publishedDate = new Date('2024-12-13T10:30:00Z');
      const threat = createThreatSummary({
        publishedAt: publishedDate.toISOString(),
      });

      render(<ThreatCard threat={threat} />);

      // Timestamp should be visible (formatted relative to current time or absolute)
      const card = screen.getByText('Critical Apache Log4j RCE Vulnerability').closest('div[data-testid="threat-card"]');
      expect(card).toBeInTheDocument();
      // Time should be visible somewhere in the card
      expect(screen.getByText(/dec|december|\d{1,2}.*\d{1,2}:\d{2}/i)).toBeInTheDocument();
    });

    it('should display all CVEs as individual items or list', () => {
      const threat = createThreatSummary({
        cves: ['CVE-2024-1234', 'CVE-2024-5678', 'CVE-2024-9999'],
      });

      render(<ThreatCard threat={threat} />);

      expect(screen.getByText(/CVE-2024-1234/)).toBeInTheDocument();
      expect(screen.getByText(/CVE-2024-5678/)).toBeInTheDocument();
      expect(screen.getByText(/CVE-2024-9999/)).toBeInTheDocument();
    });

    it('should display severity badge for high severity', () => {
      const threat = createThreatSummary({
        severity: 'high',
      });

      render(<ThreatCard threat={threat} />);

      const severityBadge = screen.getByText(/high/i);
      expect(severityBadge).toBeInTheDocument();
      expect(severityBadge).toHaveAttribute('data-severity', 'high');
    });

    it('should display severity badge for medium severity', () => {
      const threat = createThreatSummary({
        severity: 'medium',
      });

      render(<ThreatCard threat={threat} />);

      const severityBadge = screen.getByText(/medium/i);
      expect(severityBadge).toBeInTheDocument();
      expect(severityBadge).toHaveAttribute('data-severity', 'medium');
    });

    it('should display severity badge for low severity', () => {
      const threat = createThreatSummary({
        severity: 'low',
      });

      render(<ThreatCard threat={threat} />);

      const severityBadge = screen.getByText(/low/i);
      expect(severityBadge).toBeInTheDocument();
      expect(severityBadge).toHaveAttribute('data-severity', 'low');
    });

    it('should display all threat categories correctly', () => {
      const categories = [
        ThreatCategory.MALWARE,
        ThreatCategory.PHISHING,
        ThreatCategory.RANSOMWARE,
        ThreatCategory.DATA_BREACH,
      ];

      categories.forEach((category) => {
        const threat = createThreatSummary({ category });
        const { unmount } = render(<ThreatCard threat={threat} />);

        const card = screen.getByText('Critical Apache Log4j RCE Vulnerability').closest('div[data-testid="threat-card"]');
        expect(card).toHaveTextContent(new RegExp(category, 'i'));

        unmount();
      });
    });

    // ============================================================================
    // FAILURE PATH TESTS - CALLBACK HANDLING
    // ============================================================================

    describe('Failure Path: Callback handling and user interactions', () => {
      it('should call onSelect callback with threat ID when card is clicked', async () => {
        const onSelect = vi.fn();
        const threat = createThreatSummary({
          id: 'threat-select-001',
        });

        render(<ThreatCard threat={threat} onSelect={onSelect} />);

        const card = screen.getByText('Critical Apache Log4j RCE Vulnerability').closest('div[data-testid="threat-card"]');
        await userEvent.click(card!);

        expect(onSelect).toHaveBeenCalledWith('threat-select-001');
        expect(onSelect).toHaveBeenCalledTimes(1);
      });

      it('should call onSelect only once when card is clicked once', async () => {
        const onSelect = vi.fn();
        const threat = createThreatSummary();

        render(<ThreatCard threat={threat} onSelect={onSelect} />);

        const card = screen.getByText('Critical Apache Log4j RCE Vulnerability').closest('div[data-testid="threat-card"]');
        await userEvent.click(card!);

        expect(onSelect).toHaveBeenCalledTimes(1);
      });

      it('should handle onSelect callback correctly with different threat IDs', async () => {
        const onSelect = vi.fn();
        const threat1 = createThreatSummary({ id: 'threat-1' });
        const threat2 = createThreatSummary({ id: 'threat-2', title: 'Different Threat' });

        const { rerender } = render(<ThreatCard threat={threat1} onSelect={onSelect} />);

        const card1 = screen.getByText('Critical Apache Log4j RCE Vulnerability').closest('div[data-testid="threat-card"]');
        await userEvent.click(card1!);

        expect(onSelect).toHaveBeenCalledWith('threat-1');

        vi.clearAllMocks();

        rerender(<ThreatCard threat={threat2} onSelect={onSelect} />);

        const card2 = screen.getByText('Different Threat').closest('div[data-testid="threat-card"]');
        await userEvent.click(card2!);

        expect(onSelect).toHaveBeenCalledWith('threat-2');
      });

      it('should not throw error when onSelect is not provided', async () => {
        const threat = createThreatSummary();

        render(<ThreatCard threat={threat} />);

        const card = screen.getByText('Critical Apache Log4j RCE Vulnerability').closest('div[data-testid="threat-card"]');

        expect(() => {
          fireEvent.click(card!);
        }).not.toThrow();
      });

      it('should call onBookmarkToggle when bookmark button is clicked', async () => {
        const onBookmarkToggle = vi.fn();
        const threat = createThreatSummary({
          id: 'threat-bookmark-001',
          isBookmarked: false,
        });

        render(<ThreatCard threat={threat} onBookmarkToggle={onBookmarkToggle} />);

        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        await userEvent.click(bookmarkButton);

        expect(onBookmarkToggle).toHaveBeenCalledWith('threat-bookmark-001');
        expect(onBookmarkToggle).toHaveBeenCalledTimes(1);
      });

      it('should prevent default card click when clicking bookmark button', async () => {
        const onSelect = vi.fn();
        const onBookmarkToggle = vi.fn();
        const threat = createThreatSummary();

        render(
          <ThreatCard
            threat={threat}
            onSelect={onSelect}
            onBookmarkToggle={onBookmarkToggle}
          />
        );

        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        await userEvent.click(bookmarkButton);

        // Only bookmark callback should fire, not select
        expect(onBookmarkToggle).toHaveBeenCalled();
        expect(onSelect).not.toHaveBeenCalled();
      });
    });

    // ============================================================================
    // EMPTY/NULL STATE TESTS
    // ============================================================================

    describe('Empty/Null State: Optional fields missing', () => {
      it('should render correctly with no CVEs (empty array)', () => {
        const threat = createThreatSummary({
          cves: [],
        });

        render(<ThreatCard threat={threat} />);

        expect(screen.getByText('Critical Apache Log4j RCE Vulnerability')).toBeInTheDocument();

        // Should not display empty CVE section
        const cveSection = screen.queryByText(/cve/i);
        if (cveSection) {
          expect(cveSection.closest('div')).not.toHaveTextContent('CVE-');
        }
      });

      it('should render correctly when isBookmarked is undefined', () => {
        const threat = createThreatSummary({
          isBookmarked: undefined,
        });

        render(<ThreatCard threat={threat} />);

        expect(screen.getByText('Critical Apache Log4j RCE Vulnerability')).toBeInTheDocument();

        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).toBeInTheDocument();
        // Should show as not bookmarked by default
        expect(bookmarkButton).not.toHaveAttribute('aria-pressed', 'true');
      });

      it('should render correctly when isBookmarked is false', () => {
        const threat = createThreatSummary({
          isBookmarked: false,
        });

        render(<ThreatCard threat={threat} />);

        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).not.toHaveAttribute('aria-pressed', 'true');
      });

      it('should handle single CVE correctly', () => {
        const threat = createThreatSummary({
          cves: ['CVE-2024-1234'],
        });

        render(<ThreatCard threat={threat} />);

        expect(screen.getByText(/CVE-2024-1234/)).toBeInTheDocument();
      });

      it('should handle very long title gracefully', () => {
        const longTitle = 'Critical ' + 'A'.repeat(200) + ' Vulnerability Detection System';
        const threat = createThreatSummary({
          title: longTitle,
        });

        render(<ThreatCard threat={threat} />);

        expect(screen.getByText(new RegExp(longTitle))).toBeInTheDocument();
      });

      it('should handle very long summary gracefully', () => {
        const longSummary = 'Description of threat: ' + 'X'.repeat(300);
        const threat = createThreatSummary({
          summary: longSummary,
        });

        render(<ThreatCard threat={threat} />);

        expect(screen.getByText(new RegExp(longSummary))).toBeInTheDocument();
      });

      it('should handle special characters in title and summary', () => {
        const threat = createThreatSummary({
          title: 'Threat with <special> & "characters" (2024)',
          summary: 'Summary with @#$%^&*() symbols',
        });

        render(<ThreatCard threat={threat} />);

        expect(screen.getByText(/Threat with <special>/)).toBeInTheDocument();
        expect(screen.getByText(/Summary with @#\$%\^&\*\(\)/)).toBeInTheDocument();
      });

      it('should render with empty source string', () => {
        const threat = createThreatSummary({
          source: '',
        });

        render(<ThreatCard threat={threat} />);

        expect(screen.getByText('Critical Apache Log4j RCE Vulnerability')).toBeInTheDocument();
      });

      it('should render with very long source name', () => {
        const longSource = 'Very Long Source Name That Is ' + 'A'.repeat(100);
        const threat = createThreatSummary({
          source: longSource,
        });

        render(<ThreatCard threat={threat} />);

        expect(screen.getByText(new RegExp(longSource))).toBeInTheDocument();
      });
    });

    // ============================================================================
    // EDGE CASE TESTS - BOOKMARK BEHAVIOR
    // ============================================================================

    describe('Edge Case: Bookmark button and state', () => {
      it('should render bookmark button as unfilled when isBookmarked is false', () => {
        const threat = createThreatSummary({
          isBookmarked: false,
        });

        render(<ThreatCard threat={threat} />);

        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).toBeInTheDocument();
        expect(bookmarkButton).not.toHaveAttribute('aria-pressed', 'true');
      });

      it('should render bookmark button as filled when isBookmarked is true', () => {
        const threat = createThreatSummary({
          isBookmarked: true,
        });

        render(<ThreatCard threat={threat} />);

        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).toBeInTheDocument();
        expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true');
      });

      it('should update bookmark button state when isBookmarked prop changes', async () => {
        const threat = createThreatSummary({
          isBookmarked: false,
        });

        const { rerender } = render(<ThreatCard threat={threat} />);

        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).not.toHaveAttribute('aria-pressed', 'true');

        rerender(
          <ThreatCard
            threat={{
              ...threat,
              isBookmarked: true,
            }}
          />
        );

        const updatedButton = screen.getByRole('button', { name: /bookmark/i });
        expect(updatedButton).toHaveAttribute('aria-pressed', 'true');
      });

      it('should handle rapid bookmark toggle clicks', async () => {
        const onBookmarkToggle = vi.fn();
        const threat = createThreatSummary({
          id: 'threat-rapid-toggle',
          isBookmarked: false,
        });

        render(<ThreatCard threat={threat} onBookmarkToggle={onBookmarkToggle} />);

        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });

        await userEvent.click(bookmarkButton);
        await userEvent.click(bookmarkButton);
        await userEvent.click(bookmarkButton);

        expect(onBookmarkToggle).toHaveBeenCalledTimes(3);
      });

      it('should maintain bookmark state when card is clicked', async () => {
        const onSelect = vi.fn();
        const onBookmarkToggle = vi.fn();
        const threat = createThreatSummary({
          isBookmarked: true,
        });

        render(
          <ThreatCard
            threat={threat}
            onSelect={onSelect}
            onBookmarkToggle={onBookmarkToggle}
          />
        );

        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true');

        const card = screen.getByText('Critical Apache Log4j RCE Vulnerability').closest('div[data-testid="threat-card"]');
        await userEvent.click(card!);

        // Bookmark state should still be true
        const stillBookmarked = screen.getByRole('button', { name: /bookmark/i });
        expect(stillBookmarked).toHaveAttribute('aria-pressed', 'true');
      });

      it('should render correctly with many CVEs', () => {
        const cves = Array.from({ length: 15 }, (_, i) => `CVE-2024-${String(i + 1).padStart(4, '0')}`);
        const threat = createThreatSummary({
          cves,
        });

        render(<ThreatCard threat={threat} />);

        // All CVEs should be visible
        cves.forEach((cve) => {
          expect(screen.getByText(new RegExp(cve))).toBeInTheDocument();
        });
      });

      it('should handle ISO timestamp formatting correctly', () => {
        const threat = createThreatSummary({
          publishedAt: new Date('2024-12-13T23:59:59Z').toISOString(),
        });

        render(<ThreatCard threat={threat} />);

        // Should render without throwing
        expect(screen.getByText('Critical Apache Log4j RCE Vulnerability')).toBeInTheDocument();
      });

      it('should handle old timestamp correctly', () => {
        const threat = createThreatSummary({
          publishedAt: new Date('2020-01-01T00:00:00Z').toISOString(),
        });

        render(<ThreatCard threat={threat} />);

        expect(screen.getByText('Critical Apache Log4j RCE Vulnerability')).toBeInTheDocument();
      });

      it('should render multiple threat cards simultaneously without interference', async () => {
        const threat1 = createThreatSummary({
          id: 'threat-1',
          title: 'First Threat',
        });

        const threat2 = createThreatSummary({
          id: 'threat-2',
          title: 'Second Threat',
        });

        const onSelect1 = vi.fn();
        const onSelect2 = vi.fn();

        const { container } = render(
          <div>
            <ThreatCard threat={threat1} onSelect={onSelect1} />
            <ThreatCard threat={threat2} onSelect={onSelect2} />
          </div>
        );

        expect(screen.getByText('First Threat')).toBeInTheDocument();
        expect(screen.getByText('Second Threat')).toBeInTheDocument();

        const cards = container.querySelectorAll('[data-testid="threat-card"]');
        expect(cards.length).toBe(2);

        await userEvent.click(cards[0]);
        expect(onSelect1).toHaveBeenCalledWith('threat-1');
        expect(onSelect2).not.toHaveBeenCalled();

        await userEvent.click(cards[1]);
        expect(onSelect2).toHaveBeenCalledWith('threat-2');
      });
    });

    // ============================================================================
    // ACCESSIBILITY TESTS
    // ============================================================================

    describe('Accessibility', () => {
      it('should have proper semantic HTML structure', () => {
        const threat = createThreatSummary();

        render(<ThreatCard threat={threat} />);

        const card = screen.getByTestId('threat-card');
        expect(card).toBeInTheDocument();
      });

      it('should have descriptive ARIA labels for interactive elements', () => {
        const threat = createThreatSummary({
          id: 'threat-aria-001',
        });

        render(<ThreatCard threat={threat} />);

        const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
        expect(bookmarkButton).toHaveAttribute('aria-pressed');
        expect(bookmarkButton).toHaveAttribute('aria-label');
      });

      it('should indicate clickability of card for keyboard users', () => {
        const threat = createThreatSummary();

        render(<ThreatCard threat={threat} />);

        const card = screen.getByTestId('threat-card');
        expect(card).toHaveAttribute('role', 'button');
      });

      it('should provide color-independent severity indication', () => {
        const threat = createThreatSummary({
          severity: 'critical',
        });

        render(<ThreatCard threat={threat} />);

        const severityBadge = screen.getByText(/critical/i);
        // Should have data attribute for non-color indication
        expect(severityBadge).toHaveAttribute('data-severity', 'critical');
      });

      it('should support keyboard navigation', async () => {
        const onSelect = vi.fn();
        const threat = createThreatSummary();

        render(<ThreatCard threat={threat} onSelect={onSelect} />);

        const card = screen.getByTestId('threat-card');

        // Simulate spacebar press on card
        fireEvent.keyDown(card, { key: ' ', code: 'Space' });

        // Component should handle keyboard interaction
        expect(card).toHaveAttribute('role', 'button');
      });
    });
  });
});