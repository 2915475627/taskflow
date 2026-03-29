import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodePanel } from '../NodePanel';
import { useWorkflowStore } from '@/stores';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
}));

// Mock the workflow store
vi.mock('@/stores', () => ({
  useWorkflowStore: vi.fn(),
}));

describe('NodePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSelectNode = vi.fn();
  const mockUpdateNode = vi.fn();

  const defaultMockStore = {
    nodes: [
      {
        id: 'node-1',
        type: 'trigger' as const,
        position: { x: 0, y: 0 },
        data: {
          type: 'trigger' as const,
          name: 'Test Trigger',
          description: 'Test description',
          config: { event: 'webhook', cron: '' },
        },
      },
    ],
    edges: [],
    selectedNodeId: 'node-1',
    selectNode: mockSelectNode,
    updateNode: mockUpdateNode,
  };

  const actionNodeMockStore = {
    nodes: [
      {
        id: 'node-2',
        type: 'action' as const,
        position: { x: 100, y: 100 },
        data: {
          type: 'action' as const,
          name: 'Test Action',
          description: '',
          config: { service: 'github', method: 'POST' },
        },
      },
    ],
    edges: [],
    selectedNodeId: 'node-2',
    selectNode: mockSelectNode,
    updateNode: mockUpdateNode,
  };

  const conditionNodeMockStore = {
    nodes: [
      {
        id: 'node-3',
        type: 'condition' as const,
        position: { x: 200, y: 200 },
        data: {
          type: 'condition' as const,
          name: 'Test Condition',
          description: '',
          config: {},
        },
      },
    ],
    edges: [],
    selectedNodeId: 'node-3',
    selectNode: mockSelectNode,
    updateNode: mockUpdateNode,
  };

  it('should return null when no node is selected', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...defaultMockStore,
      selectedNodeId: null,
    });

    const { container } = render(<NodePanel />);
    expect(container.firstChild).toBeNull();
  });

  it('should render node configuration when a node is selected', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultMockStore);

    render(<NodePanel />);

    expect(screen.getByText('Node Configuration')).toBeInTheDocument();
    expect(screen.getByText('trigger')).toBeInTheDocument();
    expect(screen.getByText('node-1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Trigger')).toBeInTheDocument();
  });

  it('should render name and description fields', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultMockStore);

    render(<NodePanel />);

    const nameInput = screen.getByPlaceholderText('Node name') as HTMLInputElement;
    const descTextarea = screen.getByPlaceholderText('Optional description...') as HTMLTextAreaElement;

    expect(nameInput).toBeInTheDocument();
    expect(nameInput.value).toBe('Test Trigger');
    expect(descTextarea).toBeInTheDocument();
    expect(descTextarea.value).toBe('Test description');
  });

  it('should render trigger-specific config fields', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultMockStore);

    render(<NodePanel />);

    expect(screen.getByText('Trigger Settings')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., webhook, schedule')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., * * * * *')).toBeInTheDocument();
  });

  it('should switch to action config when action node is selected', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(actionNodeMockStore);

    render(<NodePanel />);

    expect(screen.getByText('Action Settings')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., github, slack')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., POST, GET')).toBeInTheDocument();
  });

  it('should render condition config when condition node is selected', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(conditionNodeMockStore);

    render(<NodePanel />);

    expect(screen.getByText('Condition Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure conditions to branch workflow execution.')).toBeInTheDocument();
  });

  it('should call selectNode with null when close button is clicked', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultMockStore);

    render(<NodePanel />);

    fireEvent.click(screen.getByTestId('x-icon'));
    expect(mockSelectNode).toHaveBeenCalledWith(null);
  });

  it('should update node name when input changes', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultMockStore);

    render(<NodePanel />);

    const nameInput = screen.getByPlaceholderText('Node name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { name: 'New Name' });
  });

  it('should update node description when textarea changes', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultMockStore);

    render(<NodePanel />);

    const descTextarea = screen.getByPlaceholderText('Optional description...');
    fireEvent.change(descTextarea, { target: { value: 'New description' } });

    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', { description: 'New description' });
  });

  it('should update trigger config when event input changes', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultMockStore);

    render(<NodePanel />);

    const eventInput = screen.getByPlaceholderText('e.g., webhook, schedule');
    fireEvent.change(eventInput, { target: { value: 'schedule' } });

    expect(mockUpdateNode).toHaveBeenCalledWith('node-1', {
      config: { event: 'schedule', cron: '' },
    });
  });

  it('should apply correct styling', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultMockStore);

    const { container } = render(<NodePanel className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('w-80');
    expect(container.firstChild).toHaveClass('border-l');
  });
});
