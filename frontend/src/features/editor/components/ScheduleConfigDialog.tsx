import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Loader2, Calendar, Clock, Trash2 } from 'lucide-react';
import { scheduleApi, type ScheduleResponse } from '@/services/api';

interface ScheduleConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  workflowName: string;
}

// Common cron presets
const CRON_PRESETS = [
  { label: 'Every hour', expression: '0 * * * *' },
  { label: 'Every day at midnight', expression: '0 0 * * *' },
  { label: 'Every week', expression: '0 0 * * 0' },
  { label: 'Every month', expression: '0 0 1 * *' },
];

export function ScheduleConfigDialog({
  open,
  onOpenChange,
  workflowId,
  workflowName,
}: ScheduleConfigDialogProps) {
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cronExpression, setCronExpression] = useState('0 0 * * *');
  const [timezone, setTimezone] = useState('UTC');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open && workflowId) {
      loadSchedules();
    }
  }, [open, workflowId]);

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const data = await scheduleApi.listByWorkflow(workflowId);
      setSchedules(data);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      await scheduleApi.create(workflowId, {
        cronExpression,
        timezone,
        description,
      });
      await loadSchedules();
      setCronExpression('0 0 * * *');
      setDescription('');
    } catch (err) {
      console.error('Failed to create schedule:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (schedule: ScheduleResponse) => {
    try {
      await scheduleApi.setEnabled(schedule.id, !schedule.enabled);
      await loadSchedules();
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
    }
  };

  const handleDelete = async (scheduleId: number) => {
    try {
      await scheduleApi.delete(scheduleId);
      await loadSchedules();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Workflow</DialogTitle>
          <DialogDescription>
            Configure scheduled execution for "{workflowName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Create new schedule */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Create New Schedule</h3>

            {/* Cron presets */}
            <div className="flex flex-wrap gap-2">
              {CRON_PRESETS.map((preset) => (
                <button
                  key={preset.expression}
                  onClick={() => setCronExpression(preset.expression)}
                  className={`px-2 py-1 text-xs border rounded ${
                    cronExpression === preset.expression
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Cron expression input */}
            <div>
              <label className="text-sm block mb-1">Cron Expression</label>
              <input
                type="text"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 0 * * *"
                className="w-full px-3 py-2 border rounded-md text-sm font-mono"
              />
            </div>

            {/* Timezone */}
            <div>
              <label className="text-sm block mb-1">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Asia/Shanghai">Asia/Shanghai</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm block mb-1">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Daily backup"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>

            <Button onClick={handleCreate} disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Schedule
                </>
              )}
            </Button>
          </div>

          {/* Existing schedules */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : schedules.length > 0 ? (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">Existing Schedules</h3>
              <div className="space-y-2">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-0.5 rounded">
                          {schedule.cronExpression}
                        </code>
                        <span className="text-xs text-muted-foreground">
                          ({schedule.timezone})
                        </span>
                        {!schedule.enabled && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                            Disabled
                          </span>
                        )}
                      </div>
                      {schedule.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {schedule.description}
                        </p>
                      )}
                      {schedule.lastTriggeredAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          Last run: {new Date(schedule.lastTriggeredAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleEnabled(schedule)}
                      >
                        {schedule.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(schedule.id)}
                        aria-label="Delete schedule"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4 border-t">
              No schedules configured yet
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
