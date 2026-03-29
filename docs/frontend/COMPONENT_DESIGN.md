# Frontend Component Design - Workflow Execution

## Execution State Management

### workflowStore
```typescript
nodeStatuses: Record<string, NodeExecutionStatus>
// 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

nodeOutputs: Record<string, unknown>
// Stores node output data or error messages
```

### useWorkflow Hook
```typescript
executeWorkflow(workflowId: string)
// POST /api/workflows/{id}/execute
// Starts polling run status after initiating

pollRunStatus(executionId: string)
// Polls GET /api/workflows/runs/{executionId} every 1s
// Updates nodeStatuses based on run status
```

## Component Updates

### Toolbar.tsx
- Added `workflowId` prop
- Play button calls `executeWorkflow(workflowId)` when workflowId is set
- Stop button calls `stopExecution()`

### CustomNode.tsx
- Displays node execution status
- Shows error message when status is 'failed'
- Visual indicators: pending (gray), running (blue pulse), completed (green), failed (red)

### WorkflowCanvas.tsx
- Passes `workflowId` to Toolbar

### WorkflowEditorPage.tsx
- Passes `workflowId` to WorkflowCanvas

## API Integration

### executionApi
```typescript
execute(workflowId: string): Promise<WorkflowExecuteResponse>
getRunStatus(executionId: string): Promise<WorkflowRunStatus>
```

## Node Status Display

| Status | Visual | Description |
|--------|--------|-------------|
| pending | Gray | Not yet executed |
| running | Blue pulse | Currently executing |
| completed | Green check | Successfully completed |
| failed | Red X + message | Error occurred |
| skipped | Gray dashed | Skipped (e.g., condition false branch) |
