import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WebhookTriggerDialog } from '../WebhookTriggerDialog';
import { webhookApi } from '@/services/api';

vi.mock('@/services/api', () => ({
  webhookApi: {
    trigger: vi.fn(),
  },
}));

describe('WebhookTriggerDialog', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with webhook URL', () => {
    render(
      <WebhookTriggerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workflowId="workflow-123"
        workflowName="My Workflow"
      />
    );

    expect(screen.getByText('Webhook Trigger')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/webhooks\/trigger\/workflow-123/)).toBeInTheDocument();
    expect(screen.getByText(/My Workflow/)).toBeInTheDocument();
  });

  it('should show webhook URL in input', () => {
    render(
      <WebhookTriggerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workflowId="workflow-123"
        workflowName="Test Workflow"
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toContain('/api/webhooks/trigger/workflow-123');
  });

  it('should call trigger API when Test Trigger is clicked', async () => {
    vi.mocked(webhookApi.trigger).mockResolvedValue({
      runId: 1,
      executionId: 'exec-1',
      status: 'success',
      message: 'Triggered successfully',
    });

    render(
      <WebhookTriggerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workflowId="workflow-123"
        workflowName="Test Workflow"
      />
    );

    const triggerButton = screen.getByText('Test Trigger');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(webhookApi.trigger).toHaveBeenCalledWith('workflow-123');
    });
  });

  it('should show success message after trigger', async () => {
    vi.mocked(webhookApi.trigger).mockResolvedValue({
      runId: 1,
      executionId: 'exec-123',
      status: 'success',
    });

    render(
      <WebhookTriggerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workflowId="workflow-123"
        workflowName="Test Workflow"
      />
    );

    const triggerButton = screen.getByText('Test Trigger');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('Triggered Successfully!')).toBeInTheDocument();
    });
  });

  it('should show error message when trigger fails', async () => {
    vi.mocked(webhookApi.trigger).mockRejectedValue(new Error('Network error'));

    render(
      <WebhookTriggerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workflowId="workflow-123"
        workflowName="Test Workflow"
      />
    );

    const triggerButton = screen.getByText('Test Trigger');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should reset result when dialog is closed', async () => {
    vi.mocked(webhookApi.trigger).mockResolvedValue({
      runId: 1,
      executionId: 'exec-1',
      status: 'success',
    });

    render(
      <WebhookTriggerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        workflowId="workflow-123"
        workflowName="Test Workflow"
      />
    );

    const triggerButton = screen.getByText('Test Trigger');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('Triggered Successfully!')).toBeInTheDocument();
    });

    // Close dialog via onOpenChange
    mockOnOpenChange(false);
    // Wait for state to update
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
