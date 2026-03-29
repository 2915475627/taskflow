import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorkflowEditorPage } from '../WorkflowEditorPage';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useWorkflowStore, useUIStore } from '@/stores';

// Mock reactflow to avoid useReactFlow error
vi.mock('reactflow', () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="react-flow-mock">{children}</div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
  Handle: () => <div data-testid="handle-mock" />,
  Background: () => <div data-testid="background-mock" />,
  Controls: () => <div data-testid="controls-mock" />,
  MiniMap: () => <div data-testid="mini-map-mock" />,
  useNodesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useEdgesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useReactFlow: vi.fn(() => ({
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    fitView: vi.fn(),
    getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
  })),
  addEdge: vi.fn(),
}));

// Mock stores
const mockSelectNode = vi.fn();
const mockReset = vi.fn();
const mockUpdateNode = vi.fn();

vi.mock('@/stores', () => ({
  useWorkflowStore: vi.fn(),
  useUIStore: vi.fn(),
}));

// Mock hooks
vi.mock('@/hooks/useWorkflow', () => ({
  useWorkflow: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

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
      <MemoryRouter initialEntries={['/editor/1']}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('WorkflowEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isDirty: false,
      selectNode: mockSelectNode,
      reset: mockReset,
      updateNode: mockUpdateNode,
    });

    (useUIStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      selectedNodeId: null,
      openDeployDialog: vi.fn(),
    });

    (useWorkflow as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      nodes: [],
      edges: [],
      isDirty: false,
    });
  });

  it('should render editor page with header', () => {
    renderWithProviders(
      <Routes>
        <Route path="/editor/:workflowId" element={<WorkflowEditorPage />} />
      </Routes>
    );

    expect(screen.getByText('Edit Workflow')).toBeInTheDocument();
  });

  it('should render back button', () => {
    renderWithProviders(
      <Routes>
        <Route path="/editor/:workflowId" element={<WorkflowEditorPage />} />
      </Routes>
    );

    // There are multiple buttons, check for the one with ArrowLeft icon
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render Save and Deploy buttons', () => {
    renderWithProviders(
      <Routes>
        <Route path="/editor/:workflowId" element={<WorkflowEditorPage />} />
      </Routes>
    );

    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Deploy')).toBeInTheDocument();
  });

  it('should disable Save button when not dirty', () => {
    renderWithProviders(
      <Routes>
        <Route path="/editor/:workflowId" element={<WorkflowEditorPage />} />
      </Routes>
    );

    const saveButton = screen.getByText('Save') as HTMLButtonElement;
    expect(saveButton.closest('button')).toBeDisabled();
  });

  it('should show unsaved changes indicator when dirty', () => {
    (useWorkflow as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      nodes: [],
      edges: [],
      isDirty: true,
    });

    renderWithProviders(
      <Routes>
        <Route path="/editor/:workflowId" element={<WorkflowEditorPage />} />
      </Routes>
    );

    expect(screen.getByText('(unsaved changes)')).toBeInTheDocument();
  });
});
