import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { Button } from '@/components/ui';
import { Play, Square, ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflow } from '@/hooks';
import { AddNodeMenu } from './AddNodeMenu';

interface ToolbarProps {
  className?: string;
  workflowId?: string;
}

export function Toolbar({ className, workflowId }: ToolbarProps) {
  const { zoomIn, zoomOut, fitView, getViewport } = useReactFlow();
  const { isExecuting, executeWorkflow, stopExecution } = useWorkflow();

  const handleExecute = useCallback(async () => {
    if (workflowId) {
      try {
        await executeWorkflow(workflowId);
      } catch (error) {
        console.error('Failed to execute workflow:', error);
      }
    }
  }, [workflowId, executeWorkflow]);

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 200, padding: 0.2 });
  }, [fitView]);

  const handleToggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  const viewport = getViewport();

  return (
    <div
      className={cn(
        'absolute top-4 left-4 z-10 flex flex-col gap-2',
        className
      )}
    >
      {/* Execution controls */}
      <div className="flex gap-1 bg-background/90 backdrop-blur border rounded-md p-1 shadow-sm">
        <AddNodeMenu />
        {!isExecuting ? (
          <Button
            variant="default"
            size="icon"
            className="h-8 w-8"
            onClick={handleExecute}
            title="Start execution"
            disabled={!workflowId}
          >
            <Play className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8"
            onClick={stopExecution}
            title="Stop execution"
          >
            <Square className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Canvas controls */}
      <div className="flex flex-col gap-1 bg-background/90 backdrop-blur border rounded-md p-1 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleFitView}
          title="Fit view"
        >
          <Move className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleToggleFullscreen}
          title="Toggle fullscreen"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom level indicator */}
      <div className="bg-background/90 backdrop-blur border rounded-md px-3 py-1.5 text-xs font-mono shadow-sm">
        {(viewport.zoom * 100).toFixed(0)}%
      </div>
    </div>
  );
}
