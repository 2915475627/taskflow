import { useCallback, useState, useEffect } from 'react';
import { useReactFlow } from 'reactflow';
import { Button } from '@/components/ui';
import { Play, Square, Pause, ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflow } from '@/hooks';
import { AddNodeMenu } from './AddNodeMenu';

interface ToolbarProps {
  className?: string;
  workflowId?: string;
}

export function Toolbar({ className, workflowId }: ToolbarProps) {
  const { zoomIn, zoomOut, fitView, getViewport } = useReactFlow();
  const { isExecuting, isPaused, executeWorkflow, stopExecution, pauseExecution, resumeExecution } = useWorkflow();
  const [zoomPercent, setZoomPercent] = useState(100);

  // Update zoom percentage when viewport changes
  useEffect(() => {
    const updateZoom = () => {
      const viewport = getViewport();
      setZoomPercent(Math.round(viewport.zoom * 100));
    };
    updateZoom();
  }, [getViewport]);

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
    setTimeout(() => {
      const viewport = getViewport();
      setZoomPercent(Math.round(viewport.zoom * 100));
    }, 250);
  }, [zoomIn, getViewport]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
    setTimeout(() => {
      const viewport = getViewport();
      setZoomPercent(Math.round(viewport.zoom * 100));
    }, 250);
  }, [zoomOut, getViewport]);

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
          <>
            {isPaused ? (
              <Button
                variant="default"
                size="icon"
                className="h-8 w-8"
                onClick={resumeExecution}
                title="Resume execution"
              >
                <Play className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={pauseExecution}
                title="Pause execution"
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={stopExecution}
              title="Stop execution"
            >
              <Square className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex gap-1 bg-background/90 backdrop-blur border rounded-md p-1 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" data-testid="zoom-in-icon" />
        </Button>
        <span className="flex items-center justify-center text-xs min-w-[40px]">
          {zoomPercent}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" data-testid="zoom-out-icon" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleFitView}
          title="Fit view"
        >
          <Move className="h-4 w-4" data-testid="move-icon" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleToggleFullscreen}
          title="Toggle fullscreen"
        >
          <Maximize className="h-4 w-4" data-testid="maximize-icon" />
        </Button>
      </div>
    </div>
  );
}
