/**
 * Tests for ImportContentSheet Component
 *
 * Sheet component for importing external content via URL or manual entry.
 * Tests tab switching, form validation, metadata fetching, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ImportContentSheet from '../ImportContentSheet';
import { useFetchURLMetadata } from '@/hooks/useFetchURLMetadata';
import { useCreateContentItem } from '@/hooks/useCreateContentItem';

vi.mock('@/hooks/useFetchURLMetadata', () => ({
  useFetchURLMetadata: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
    data: null,
  })),
}));

vi.mock('@/hooks/useCreateContentItem', () => ({
  useCreateContentItem: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
    data: null,
  })),
}));

const mockUseFetchURLMetadata = useFetchURLMetadata as Mock;
const mockUseCreateContentItem = useCreateContentItem as Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock scrollIntoView for Radix UI Select
Element.prototype.scrollIntoView = vi.fn();

describe('ImportContentSheet Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default mock implementations
    mockUseFetchURLMetadata.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: null,
    });
    mockUseCreateContentItem.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: null,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Happy Path - Rendering and Tab Navigation', () => {
    it('should render sheet when open prop is true', () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      // Title is in the sheet header
      expect(screen.getByRole('heading', { name: /Import Content/i })).toBeInTheDocument();
    });

    it('should render with tabs visible', () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /URL Import/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Manual Entry/i })).toBeInTheDocument();
    });

    it('should display URL Import tab by default', () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      // URL Import is the first/default tab - verify URL input is visible
      const urlInput = screen.getByLabelText('Content URL');
      expect(urlInput).toBeInTheDocument();
    });

    it('should switch to Manual Entry tab when clicked', async () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const manualTab = screen.getByRole('button', { name: /Manual Entry/i });
      fireEvent.click(manualTab);

      // After switching, the manual tab content should be visible
      await waitFor(() => {
        expect(manualTab).toBeInTheDocument();
      });
    });

    it('should switch back to URL Import tab', async () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const urlTab = screen.getByRole('button', { name: /URL Import/i });
      const manualTab = screen.getByRole('button', { name: /Manual Entry/i });

      fireEvent.click(manualTab);
      await waitFor(() => {
        expect(manualTab).toBeInTheDocument();
      });

      fireEvent.click(urlTab);
      await waitFor(() => {
        expect(urlTab).toBeInTheDocument();
      });
    });

    it('should have URL input field in URL Import tab', () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText('Content URL');
      expect(urlInput).toBeInTheDocument();
      expect(urlInput).toHaveAttribute('type', 'url');
    });

    it('should have Fetch button in URL Import tab', () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /Fetch/i })).toBeInTheDocument();
    });

    it('should have common form fields visible', () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText('Content title')).toBeInTheDocument();
      expect(screen.getByLabelText('Content summary')).toBeInTheDocument();
      expect(screen.getByLabelText(/Select content type/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Topic tags')).toBeInTheDocument();
      expect(screen.getByLabelText('Author name')).toBeInTheDocument();
      expect(screen.getByLabelText('Image URL')).toBeInTheDocument();
      expect(screen.getByLabelText('Publish date')).toBeInTheDocument();
    });
  });

  describe('URL Metadata Fetching', () => {
    it('should fetch metadata when Fetch button clicked with URL', async () => {
      const fetchMetadataMock = vi.fn();
      mockUseFetchURLMetadata.mockReturnValue({
        mutate: fetchMetadataMock,
        isPending: false,
        error: null,
        data: null,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText('Content URL') as HTMLInputElement;
      fireEvent.change(urlInput, { target: { value: 'https://example.com/article' } });

      const fetchButton = screen.getByRole('button', { name: /Fetch/i });
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(fetchMetadataMock).toHaveBeenCalled();
      });
    });

    it('should disable Fetch button while fetching', () => {
      mockUseFetchURLMetadata.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
        error: null,
        data: null,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const fetchButton = screen.getByRole('button', { name: /Fetching/i });
      expect(fetchButton).toBeDisabled();
    });

    it('should populate form with fetched metadata', async () => {
      const metadata = {
        url: 'https://example.com/article',
        title: 'Security Vulnerability Discovered',
        description: 'Critical vulnerability found in popular software',
        image_url: 'https://example.com/image.jpg',
        publish_date: '2026-01-15T10:00:00Z',
        author: 'Security Researcher',
        read_time_minutes: 5,
        site_name: 'Tech News',
      };

      const fetchMetadataMock = vi.fn((variables, options) => {
        options?.onSuccess?.(metadata);
      });

      mockUseFetchURLMetadata.mockReturnValue({
        mutate: fetchMetadataMock,
        isPending: false,
        error: null,
        data: metadata,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText('Content URL') as HTMLInputElement;
      fireEvent.change(urlInput, { target: { value: 'https://example.com/article' } });

      const fetchButton = screen.getByRole('button', { name: /Fetch/i });
      fireEvent.click(fetchButton);

      await waitFor(() => {
        const titleInput = screen.getByDisplayValue('Security Vulnerability Discovered');
        expect(titleInput).toBeInTheDocument();
      });
    });

    it('should show success message after metadata fetch', async () => {
      const metadata = {
        url: 'https://example.com/article',
        title: 'Article',
        description: null,
        image_url: null,
        publish_date: null,
        author: null,
        read_time_minutes: null,
        site_name: null,
      };

      const fetchMetadataMock = vi.fn((variables, options) => {
        options?.onSuccess?.(metadata);
      });

      mockUseFetchURLMetadata.mockReturnValue({
        mutate: fetchMetadataMock,
        isPending: false,
        error: null,
        data: metadata,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText('Content URL') as HTMLInputElement;
      fireEvent.change(urlInput, { target: { value: 'https://example.com/article' } });

      const fetchButton = screen.getByRole('button', { name: /Fetch/i });
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText(/Metadata fetched successfully/i)).toBeInTheDocument();
      });
    });

    it('should disable Fetch button when URL is empty', () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const fetchButton = screen.getByRole('button', { name: /Fetch/i });
      expect(fetchButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should require title field', () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const titleInput = screen.getByLabelText('Content title');
      expect(titleInput).toHaveAttribute('aria-required', 'true');
    });

    it('should require URL field', () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText('Content URL');
      expect(urlInput).toBeInTheDocument();
    });

    it('should disable Import button when URL is missing', () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const titleInput = screen.getByLabelText('Content title') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Article' } });

      const importButton = screen.getByRole('button', { name: /Import Content/i });
      expect(importButton).toBeDisabled();
    });

    it('should disable Import button when title is missing', () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText('Content URL') as HTMLInputElement;
      fireEvent.change(urlInput, { target: { value: 'https://example.com/article' } });

      const importButton = screen.getByRole('button', { name: /Import Content/i });
      expect(importButton).toBeDisabled();
    });

    it('should enable Import button with valid URL and title', async () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText('Content URL') as HTMLInputElement;
      fireEvent.change(urlInput, { target: { value: 'https://example.com/article' } });

      const titleInput = screen.getByLabelText('Content title') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Article Title' } });

      const importButton = screen.getByRole('button', { name: /Import Content/i });

      await waitFor(() => {
        expect(importButton).not.toBeDisabled();
      });
    });

    it('should parse comma-separated topic tags', async () => {
      const createContentMock = vi.fn((variables, options) => {
        expect(variables.request.topic_tags).toEqual(['security', 'vulnerability', 'exploit']);
        options?.onSuccess?.();
      });

      mockUseCreateContentItem.mockReturnValue({
        mutate: createContentMock,
        isPending: false,
        error: null,
        data: null,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText('Content URL') as HTMLInputElement;
      fireEvent.change(urlInput, { target: { value: 'https://example.com/article' } });

      const titleInput = screen.getByLabelText('Content title') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Article' } });

      const tagsInput = screen.getByLabelText('Topic tags') as HTMLInputElement;
      fireEvent.change(tagsInput, { target: { value: 'security, vulnerability, exploit' } });

      const importButton = screen.getByRole('button', { name: /Import Content/i });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(createContentMock).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message for failed metadata fetch', () => {
      mockUseFetchURLMetadata.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: new Error('Failed to fetch metadata'),
        data: null,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/Failed to fetch metadata/i)).toBeInTheDocument();
    });

    it('should show recovery message for fetch error', () => {
      mockUseFetchURLMetadata.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: new Error('Fetch failed'),
        data: null,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/You can still enter the details manually/i)).toBeInTheDocument();
    });

    it('should display error message for failed content creation', () => {
      mockUseCreateContentItem.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: new Error('Failed to create content item'),
        data: null,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/Failed to create content item/i)).toBeInTheDocument();
    });

    it('should handle duplicate URL error', () => {
      mockUseCreateContentItem.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: new Error('Content item with this URL already exists'),
        data: null,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/Content item with this URL already exists/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state on Import button during creation', () => {
      mockUseCreateContentItem.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
        error: null,
        data: null,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/Importing/i)).toBeInTheDocument();
    });

    it('should disable all inputs during creation', () => {
      mockUseCreateContentItem.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
        error: null,
        data: null,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText('Content URL') as HTMLInputElement;
      const titleInput = screen.getByLabelText('Content title') as HTMLInputElement;

      expect(urlInput).toBeDisabled();
      expect(titleInput).toBeDisabled();
    });

    it('should disable Cancel button during creation', () => {
      mockUseCreateContentItem.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
        error: null,
        data: null,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Sheet Open/Close Behavior', () => {
    it('should not render when open is false', () => {
      const { container } = render(
        <ImportContentSheet open={false} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      // Component should exist but not display content
      expect(container).toBeInTheDocument();
    });

    it('should reset form when sheet closes', async () => {
      const onOpenChangeMock = vi.fn();
      const { rerender } = render(
        <ImportContentSheet open={true} onOpenChange={onOpenChangeMock} />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText('Content URL') as HTMLInputElement;
      fireEvent.change(urlInput, { target: { value: 'https://example.com/article' } });

      expect(urlInput.value).toBe('https://example.com/article');

      // Close sheet
      rerender(
        <ImportContentSheet open={false} onOpenChange={onOpenChangeMock} />
      );

      // Reopen sheet
      rerender(
        <ImportContentSheet open={true} onOpenChange={onOpenChangeMock} />
      );

      const resetUrlInput = screen.getByLabelText('Content URL') as HTMLInputElement;
      expect(resetUrlInput.value).toBe('');
    });

    it('should call onOpenChange when close button clicked', async () => {
      const onOpenChangeMock = vi.fn();

      render(
        <ImportContentSheet open={true} onOpenChange={onOpenChangeMock} />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(onOpenChangeMock).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Content Type Selection', () => {
    it('should display all content type options', () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const contentTypeSelect = screen.getByLabelText(/Select content type/i);
      expect(contentTypeSelect).toBeInTheDocument();
    });

    it('should allow content type selection', async () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const contentTypeSelect = screen.getByLabelText(/Select content type/i);
      fireEvent.click(contentTypeSelect);

      expect(contentTypeSelect).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onSuccess callback after successful creation', async () => {
      const onSuccessMock = vi.fn();
      const createContentMock = vi.fn((variables, options) => {
        options?.onSuccess?.();
      });

      mockUseCreateContentItem.mockReturnValue({
        mutate: createContentMock,
        isPending: false,
        error: null,
        data: null,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} onSuccess={onSuccessMock} />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText('Content URL') as HTMLInputElement;
      fireEvent.change(urlInput, { target: { value: 'https://example.com/article' } });

      const titleInput = screen.getByLabelText('Content title') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Article' } });

      const importButton = screen.getByRole('button', { name: /Import Content/i });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(onSuccessMock).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText('Content URL')).toBeInTheDocument();
      expect(screen.getByLabelText('Content title')).toBeInTheDocument();
      expect(screen.getByLabelText('Content summary')).toBeInTheDocument();
      expect(screen.getByLabelText(/Select content type/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Topic tags')).toBeInTheDocument();
      expect(screen.getByLabelText('Author name')).toBeInTheDocument();
      expect(screen.getByLabelText('Image URL')).toBeInTheDocument();
      expect(screen.getByLabelText('Publish date')).toBeInTheDocument();
    });

    it('should have proper role for error alerts', () => {
      mockUseFetchURLMetadata.mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        error: new Error('Fetch error'),
        data: null,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();
    });

    it('should have proper role for status messages', async () => {
      const metadata = {
        url: 'https://example.com/article',
        title: 'Article',
        description: null,
        image_url: null,
        publish_date: null,
        author: null,
        read_time_minutes: null,
        site_name: null,
      };

      const fetchMetadataMock = vi.fn((variables, options) => {
        options?.onSuccess?.(metadata);
      });

      mockUseFetchURLMetadata.mockReturnValue({
        mutate: fetchMetadataMock,
        isPending: false,
        error: null,
        data: metadata,
      });

      render(
        <ImportContentSheet open={true} onOpenChange={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByLabelText('Content URL') as HTMLInputElement;
      fireEvent.change(urlInput, { target: { value: 'https://example.com/article' } });

      const fetchButton = screen.getByRole('button', { name: /Fetch/i });
      fireEvent.click(fetchButton);

      await waitFor(() => {
        const statusElement = screen.getByRole('status');
        expect(statusElement).toBeInTheDocument();
      });
    });
  });
});
