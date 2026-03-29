import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EdgePanel } from '../EdgePanel';
import { useWorkflowStore } from '@/stores';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
}));

// Mock the workflow store
vi.mock('@/stores', () => ({
  useWorkflowStore: vi.fn(),
}));

describe('EdgePanel', () => {
  const mockUpdateEdge = vi.fn();
  const mockRemoveEdge = vi.fn();
  const mockSelectEdge = vi.fn();

  const mockEdges = [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      label: 'Next',
      edgeType: 'default' as const,
    },
    {
      id: 'edge-2',
      source: 'node-2',
      target: 'node-3',
      label: 'If true',
      edgeType: 'condition' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no edge is selected', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      edges: mockEdges,
      selectedEdgeId: null,
      updateEdge: mockUpdateEdge,
      removeEdge: mockRemoveEdge,
      selectEdge: mockSelectEdge,
    });

    const { container } = render(<EdgePanel />);
    expect(container.firstChild).toBeNull();
  });

  it('should render edge configuration when edge is selected', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      edges: mockEdges,
      selectedEdgeId: 'edge-1',
      updateEdge: mockUpdateEdge,
      removeEdge: mockRemoveEdge,
      selectEdge: mockSelectEdge,
    });

    render(<EdgePanel />);
    expect(screen.getByText('Edge Configuration')).toBeInTheDocument();
    expect(screen.getByText('edge-1')).toBeInTheDocument();
  });

  it('should render connection info', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      edges: mockEdges,
      selectedEdgeId: 'edge-1',
      updateEdge: mockUpdateEdge,
      removeEdge: mockRemoveEdge,
      selectEdge: mockSelectEdge,
    });

    render(<EdgePanel />);
    expect(screen.getByText('node-1 → node-2')).toBeInTheDocument();
  });

  it('should render label input with current value', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      edges: mockEdges,
      selectedEdgeId: 'edge-1',
      updateEdge: mockUpdateEdge,
      removeEdge: mockRemoveEdge,
      selectEdge: mockSelectEdge,
    });

    render(<EdgePanel />);
    const labelInput = screen.getByPlaceholderText('e.g., On success, If true') as HTMLInputElement;
    expect(labelInput.value).toBe('Next');
  });

  it('should call updateEdge when label changes', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      edges: mockEdges,
      selectedEdgeId: 'edge-1',
      updateEdge: mockUpdateEdge,
      removeEdge: mockRemoveEdge,
      selectEdge: mockSelectEdge,
    });

    render(<EdgePanel />);
    const labelInput = screen.getByPlaceholderText('e.g., On success, If true');
    fireEvent.change(labelInput, { target: { value: 'New Label' } });

    expect(mockUpdateEdge).toHaveBeenCalledWith('edge-1', { label: 'New Label' });
  });

  it('should render edge type buttons', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      edges: mockEdges,
      selectedEdgeId: 'edge-1',
      updateEdge: mockUpdateEdge,
      removeEdge: mockRemoveEdge,
      selectEdge: mockSelectEdge,
    });

    render(<EdgePanel />);
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Condition')).toBeInTheDocument();
  });

  it('should call updateEdge when edge type changes', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      edges: mockEdges,
      selectedEdgeId: 'edge-1',
      updateEdge: mockUpdateEdge,
      removeEdge: mockRemoveEdge,
      selectEdge: mockSelectEdge,
    });

    render(<EdgePanel />);
    fireEvent.click(screen.getByText('Condition'));

    expect(mockUpdateEdge).toHaveBeenCalledWith('edge-1', { edgeType: 'condition' });
  });

  it('should call selectEdge with null when close button is clicked', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      edges: mockEdges,
      selectedEdgeId: 'edge-1',
      updateEdge: mockUpdateEdge,
      removeEdge: mockRemoveEdge,
      selectEdge: mockSelectEdge,
    });

    render(<EdgePanel />);
    fireEvent.click(screen.getByTestId('x-icon'));

    expect(mockSelectEdge).toHaveBeenCalledWith(null);
  });

  it('should call removeEdge and selectEdge when delete button is clicked', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      edges: mockEdges,
      selectedEdgeId: 'edge-1',
      updateEdge: mockUpdateEdge,
      removeEdge: mockRemoveEdge,
      selectEdge: mockSelectEdge,
    });

    render(<EdgePanel />);
    fireEvent.click(screen.getByText('Delete Edge'));

    expect(mockRemoveEdge).toHaveBeenCalledWith('edge-1');
    expect(mockSelectEdge).toHaveBeenCalledWith(null);
  });

  it('should render condition edge type correctly', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      edges: mockEdges,
      selectedEdgeId: 'edge-2',
      updateEdge: mockUpdateEdge,
      removeEdge: mockRemoveEdge,
      selectEdge: mockSelectEdge,
    });

    render(<EdgePanel />);
    expect(screen.getByText('node-2 → node-3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('If true')).toBeInTheDocument();
  });
});
