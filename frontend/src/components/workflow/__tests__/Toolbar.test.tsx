import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../Toolbar';
import { useWorkflowStore } from '@/stores';

// Create mock functions
const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();
const mockFitView = vi.fn();
const mockGetViewport = vi.fn(() => ({ x: 0, y: 0, zoom: 1 }));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Play: () => <span data-testid="play-icon">Play</span>,
  Square: () => <span data-testid="square-icon">Square</span>,
  ZoomIn: () => <span data-testid="zoom-in-icon">ZoomIn</span>,
  ZoomOut: () => <span data-testid="zoom-out-icon">ZoomOut</span>,
  Maximize: () => <span data-testid="maximize-icon">Maximize</span>,
  Move: () => <span data-testid="move-icon">Move</span>,
  Plus: () => <span data-testid="plus-icon">Plus</span>,
  Rocket: () => <span data-testid="rocket-icon">Rocket</span>,
  Flag: () => <span data-testid="flag-icon">Flag</span>,
  Globe: () => <span data-testid="globe-icon">Globe</span>,
  Wrench: () => <span data-testid="wrench-icon">Wrench</span>,
  GitBranch: () => <span data-testid="git-branch-icon">GitBranch</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
}));

// Mock AddNodeMenu to avoid complexity with node creation
vi.mock('../AddNodeMenu', () => ({
  AddNodeMenu: () => <div data-testid="add-node-menu">AddNodeMenu</div>,
}));

// Mock reactflow
vi.mock('reactflow', () => ({
  useReactFlow: vi.fn(() => ({
    zoomIn: mockZoomIn,
    zoomOut: mockZoomOut,
    fitView: mockFitView,
    getViewport: mockGetViewport,
  })),
}));

// Mock the workflow store
vi.mock('@/stores', () => ({
  useWorkflowStore: vi.fn(),
}));

describe('Toolbar', () => {
  const mockStartExecution = vi.fn();
  const mockStopExecution = vi.fn();

  const mockNodes = [
    {
      id: 'node-1',
      type: 'trigger' as const,
      position: { x: 100, y: 100 },
      data: { type: 'trigger' as const, name: 'Trigger', config: {} },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 1 });
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      nodes: mockNodes,
      isExecuting: false,
      startExecution: mockStartExecution,
      stopExecution: mockStopExecution,
    });
  });

  it('should render zoom percentage', () => {
    render(<Toolbar />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should render play button when not executing', () => {
    render(<Toolbar />);
    expect(screen.getByTestId('play-icon')).toBeInTheDocument();
  });

  it('should render stop button when executing', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      nodes: mockNodes,
      isExecuting: true,
      startExecution: mockStartExecution,
      stopExecution: mockStopExecution,
    });

    render(<Toolbar />);
    expect(screen.getByTestId('square-icon')).toBeInTheDocument();
  });

  it('should render zoom controls', () => {
    render(<Toolbar />);
    expect(screen.getByTestId('zoom-in-icon')).toBeInTheDocument();
    expect(screen.getByTestId('zoom-out-icon')).toBeInTheDocument();
  });

  it('should render fit view button', () => {
    render(<Toolbar />);
    expect(screen.getByTestId('move-icon')).toBeInTheDocument();
  });

  it('should render fullscreen button', () => {
    render(<Toolbar />);
    expect(screen.getByTestId('maximize-icon')).toBeInTheDocument();
  });

  it('should call startExecution when play button is clicked', () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByTestId('play-icon'));
    expect(mockStartExecution).toHaveBeenCalled();
  });

  it('should call stopExecution when stop button is clicked', () => {
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      nodes: mockNodes,
      isExecuting: true,
      startExecution: mockStartExecution,
      stopExecution: mockStopExecution,
    });

    render(<Toolbar />);
    fireEvent.click(screen.getByTestId('square-icon'));
    expect(mockStopExecution).toHaveBeenCalled();
  });

  it('should display 50% when viewport zoom is 0.5', () => {
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 0.5 });
    render(<Toolbar />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should display 150% when viewport zoom is 1.5', () => {
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 1.5 });
    render(<Toolbar />);
    expect(screen.getByText('150%')).toBeInTheDocument();
  });
});
