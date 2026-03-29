import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../Toolbar';
import * as useWorkflowModule from '@/hooks/useWorkflow';

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
const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();
const mockFitView = vi.fn();
const mockGetViewport = vi.fn(() => ({ x: 0, y: 0, zoom: 1 }));

vi.mock('reactflow', () => ({
  useReactFlow: vi.fn(() => ({
    zoomIn: mockZoomIn,
    zoomOut: mockZoomOut,
    fitView: mockFitView,
    getViewport: mockGetViewport,
  })),
}));

describe('Toolbar', () => {
  const mockExecuteWorkflow = vi.fn();
  const mockStopExecution = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 1 });
    vi.spyOn(useWorkflowModule, 'useWorkflow').mockReturnValue({
      nodes: [],
      edges: [],
      isExecuting: false,
      executeWorkflow: mockExecuteWorkflow,
      stopExecution: mockStopExecution,
    } as unknown as ReturnType<typeof useWorkflowModule.useWorkflow>);
  });

  it('should render add node menu', () => {
    render(<Toolbar />);
    expect(screen.getByTestId('add-node-menu')).toBeInTheDocument();
  });

  it('should render play button when not executing', () => {
    render(<Toolbar />);
    expect(screen.getByTestId('play-icon')).toBeInTheDocument();
  });

  it('should render stop button when executing', () => {
    vi.spyOn(useWorkflowModule, 'useWorkflow').mockReturnValue({
      nodes: [],
      edges: [],
      isExecuting: true,
      executeWorkflow: mockExecuteWorkflow,
      stopExecution: mockStopExecution,
    } as unknown as ReturnType<typeof useWorkflowModule.useWorkflow>);

    render(<Toolbar />);
    expect(screen.getByTestId('square-icon')).toBeInTheDocument();
  });

  it('should call executeWorkflow when play button is clicked with workflowId', () => {
    render(<Toolbar workflowId="123" />);
    fireEvent.click(screen.getByTestId('play-icon'));
    expect(mockExecuteWorkflow).toHaveBeenCalledWith('123');
  });

  it('should call stopExecution when stop button is clicked', () => {
    vi.spyOn(useWorkflowModule, 'useWorkflow').mockReturnValue({
      nodes: [],
      edges: [],
      isExecuting: true,
      executeWorkflow: mockExecuteWorkflow,
      stopExecution: mockStopExecution,
    } as unknown as ReturnType<typeof useWorkflowModule.useWorkflow>);

    render(<Toolbar />);
    fireEvent.click(screen.getByTestId('square-icon'));
    expect(mockStopExecution).toHaveBeenCalled();
  });

  // TODO: The following features need to be implemented in Toolbar component
  // - Zoom controls (zoom-in, zoom-out buttons)
  // - Zoom percentage display
  // - Fit view button
  // - Fullscreen toggle button
  describe('TODO: Zoom and Fullscreen Controls', () => {
    it.skip('should render zoom percentage (TODO: not implemented)', () => {
      render(<Toolbar />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it.skip('should render zoom controls (TODO: not implemented)', () => {
      render(<Toolbar />);
      expect(screen.getByTestId('zoom-in-icon')).toBeInTheDocument();
      expect(screen.getByTestId('zoom-out-icon')).toBeInTheDocument();
    });

    it.skip('should render fit view button (TODO: not implemented)', () => {
      render(<Toolbar />);
      expect(screen.getByTestId('move-icon')).toBeInTheDocument();
    });

    it.skip('should render fullscreen button (TODO: not implemented)', () => {
      render(<Toolbar />);
      expect(screen.getByTestId('maximize-icon')).toBeInTheDocument();
    });
  });
});
