import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleConfigDialog } from '../ScheduleConfigDialog';
import { scheduleApi } from '@/services/api';

vi.mock('@/services/api', () => ({
  scheduleApi: {
    listByWorkflow: vi.fn(),
    create: vi.fn(),
    setEnabled: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ScheduleConfigDialog', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scheduleApi.listByWorkflow).mockResolvedValue([]);
  });

  it('should render dialog with schedule form', () => {
    render(
      <ScheduleConfigDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workflowId="workflow-123"
        workflowName="Test Workflow"
      />
    );

    expect(screen.getByText('Schedule Workflow')).toBeInTheDocument();
    expect(screen.getByText(/Test Workflow/)).toBeInTheDocument();
  });

  it('should show cron presets', () => {
    render(
      <ScheduleConfigDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workflowId="workflow-123"
        workflowName="Test Workflow"
      />
    );

    expect(screen.getByText('Every hour')).toBeInTheDocument();
    expect(screen.getByText('Every day at midnight')).toBeInTheDocument();
    expect(screen.getByText('Every week')).toBeInTheDocument();
    expect(screen.getByText('Every month')).toBeInTheDocument();
  });

  it('should load existing schedules on open', async () => {
    vi.mocked(scheduleApi.listByWorkflow).mockResolvedValue([
      {
        id: 1,
        workflowId: 123,
        workflowName: 'Test Workflow',
        cronExpression: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        description: 'Daily',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]);

    render(
      <ScheduleConfigDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workflowId="workflow-123"
        workflowName="Test Workflow"
      />
    );

    await waitFor(() => {
      expect(scheduleApi.listByWorkflow).toHaveBeenCalledWith('workflow-123');
    });

    expect(screen.getByText('Existing Schedules')).toBeInTheDocument();
    expect(screen.getByText('0 0 * * *')).toBeInTheDocument();
  });

  it('should create schedule when button clicked', async () => {
    vi.mocked(scheduleApi.create).mockResolvedValue({
      id: 1,
      workflowId: 123,
      workflowName: 'Test Workflow',
      cronExpression: '0 0 * * *',
      timezone: 'UTC',
      enabled: true,
      createdAt: '2024-01-01T00:00:00Z',
    });

    render(
      <ScheduleConfigDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workflowId="workflow-123"
        workflowName="Test Workflow"
      />
    );

    const createButton = screen.getByText('Create Schedule');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(scheduleApi.create).toHaveBeenCalledWith('workflow-123', {
        cronExpression: '0 0 * * *',
        timezone: 'UTC',
        description: '',
      });
    });
  });

  it('should toggle schedule enabled state', async () => {
    vi.mocked(scheduleApi.listByWorkflow).mockResolvedValue([
      {
        id: 1,
        workflowId: 123,
        workflowName: 'Test Workflow',
        cronExpression: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]);
    vi.mocked(scheduleApi.setEnabled).mockResolvedValue({
      id: 1,
      workflowId: 123,
      workflowName: 'Test Workflow',
      cronExpression: '0 0 * * *',
      timezone: 'UTC',
      enabled: false,
      createdAt: '2024-01-01T00:00:00Z',
    });

    render(
      <ScheduleConfigDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workflowId="workflow-123"
        workflowName="Test Workflow"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Disable')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Disable'));

    await waitFor(() => {
      expect(scheduleApi.setEnabled).toHaveBeenCalledWith(1, false);
    });
  });

  it('should delete schedule', async () => {
    vi.mocked(scheduleApi.listByWorkflow).mockResolvedValue([
      {
        id: 1,
        workflowId: 123,
        workflowName: 'Test Workflow',
        cronExpression: '0 0 * * *',
        timezone: 'UTC',
        enabled: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]);
    vi.mocked(scheduleApi.delete).mockResolvedValue(undefined);

    render(
      <ScheduleConfigDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workflowId="workflow-123"
        workflowName="Test Workflow"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Existing Schedules')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(scheduleApi.delete).toHaveBeenCalledWith(1);
    });
  });
});
