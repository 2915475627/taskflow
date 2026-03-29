import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { WorkflowListPage } from '../WorkflowListPage';

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock React Query
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('WorkflowListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  const mockWorkflows = [
    {
      id: '1',
      name: 'Test Workflow 1',
      description: 'Test description 1',
      status: 'draft',
      version: 1,
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Test Workflow 2',
      description: 'Test description 2',
      status: 'published',
      version: 2,
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ];

  describe('Loading and Error States', () => {
    it('should show loading state', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      renderWithProviders(<WorkflowListPage />);
      expect(screen.getByText('Loading workflows...')).toBeInTheDocument();
    });

    it('should show error state', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));
      renderWithProviders(<WorkflowListPage />);

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Workflow List', () => {
    it('should render workflow list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkflows }),
      });

      renderWithProviders(<WorkflowListPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
        expect(screen.getByText('Test Workflow 2')).toBeInTheDocument();
      });
    });

    it('should render status badges', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkflows }),
      });

      renderWithProviders(<WorkflowListPage />);

      await waitFor(() => {
        const draftBadges = screen.getAllByText('draft');
        const publishedBadges = screen.getAllByText('published');
        expect(draftBadges).toHaveLength(1);
        expect(publishedBadges).toHaveLength(1);
      });
    });

    it('should render empty state when no workflows', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      renderWithProviders(<WorkflowListPage />);

      await waitFor(() => {
        expect(screen.getByText('No workflows yet')).toBeInTheDocument();
        expect(screen.getByText('Create Your First Workflow')).toBeInTheDocument();
      });
    });
  });

  describe('Create Workflow Modal', () => {
    it('should open create modal when Create button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkflows }),
      });

      renderWithProviders(<WorkflowListPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Create New Workflow/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('My Workflow')).toBeInTheDocument();
    });

    it('should close modal when Cancel is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkflows }),
      });

      renderWithProviders(<WorkflowListPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Create New Workflow/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const cancelButton = await screen.findByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should disable create button when name is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkflows }),
      });

      renderWithProviders(<WorkflowListPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Create New Workflow/i }));

      const createButton = await screen.findByRole('button', { name: /Create/i }) as HTMLButtonElement;
      expect(createButton).toBeDisabled();
    });
  });

  describe('Delete Workflow Modal', () => {
    it('should open delete confirmation when Delete button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkflows }),
      });

      renderWithProviders(<WorkflowListPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Delete Workflow?')).toBeInTheDocument();
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    it('should close modal when Cancel is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkflows }),
      });

      renderWithProviders(<WorkflowListPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButtons[0]);
      expect(screen.getByText('Delete Workflow?')).toBeInTheDocument();

      const cancelButton = await screen.findByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Delete Workflow?')).not.toBeInTheDocument();
      });
    });
  });
});
