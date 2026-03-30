import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Copy, Check, Play, Loader2 } from 'lucide-react';
import { webhookApi } from '@/services/api';

interface WebhookTriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  workflowName: string;
}

interface TriggerResult {
  success: boolean;
  runId?: number;
  executionId?: string;
  status?: string;
  message?: string;
}

export function WebhookTriggerDialog({
  open,
  onOpenChange,
  workflowId,
  workflowName,
}: WebhookTriggerDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<TriggerResult | null>(null);

  const webhookUrl = `${window.location.origin}/api/webhooks/trigger/${workflowId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleTrigger = async () => {
    setIsTriggering(true);
    setTriggerResult(null);
    try {
      const result = await webhookApi.trigger(workflowId);
      setTriggerResult({
        success: true,
        runId: result.runId,
        executionId: result.executionId,
        status: result.status,
        message: result.message,
      });
    } catch (err) {
      setTriggerResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to trigger workflow',
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTriggerResult(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Webhook Trigger</DialogTitle>
          <DialogDescription>
            Trigger workflow "{workflowName}" via webhook URL
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Webhook URL */}
          <div>
            <label className="text-sm font-medium block mb-2">Webhook URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-3 py-2 border rounded-md text-sm bg-muted font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                title="Copy URL"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              POST this URL to trigger the workflow
            </p>
          </div>

          {/* Test Trigger */}
          <div className="border-t pt-4">
            <Button
              onClick={handleTrigger}
              disabled={isTriggering}
              className="w-full"
            >
              {isTriggering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Test Trigger
                </>
              )}
            </Button>
          </div>

          {/* Result */}
          {triggerResult && (
            <div
              className={`p-3 rounded-md text-sm ${
                triggerResult.success
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {triggerResult.success ? (
                <div>
                  <p className="font-medium">Triggered Successfully!</p>
                  <p className="text-xs mt-1">
                    Run ID: {triggerResult.runId} | Execution: {triggerResult.executionId}
                  </p>
                  {triggerResult.message && (
                    <p className="text-xs mt-1">{triggerResult.message}</p>
                  )}
                </div>
              ) : (
                <p className="font-medium">{triggerResult.message}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
