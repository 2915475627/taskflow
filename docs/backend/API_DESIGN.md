# Backend API Design - Workflow Execution

## Execution Flow

```
POST /api/workflows/{id}/execute
    ↓
WorkflowService.executeWorkflow()
    ↓
Creates WorkflowRun with PENDING status
    ↓
Triggers ExecutionEngineService.executeRun()
    ↓
WorkflowExecutor executes nodes sequentially
    ↓
Updates WorkflowRun status (SUCCESS/FAILED)
    ↓
Notifies webhooks
```

## Key Components

### ExecutionEngineService
- `executeRun(Long runId)`: Main execution entry point
- `getRunStatus(Long runId)`: Returns current run status
- Supports both full execution (WorkflowExecutor) and legacy simulation

### WorkflowExecutor
- Orchestrates workflow execution from START to END
- Traverses graph following connections
- Handles condition branching
- Returns Map<String, ExecutionResult> for all nodes

### NodeExecutors
- `StartNodeExecutor`: Entry point (no-op)
- `EndNodeExecutor`: Terminal node (no-op)
- `DelayNodeExecutor`: Adds delay
- `ConditionNodeExecutor`: Branches based on condition
- `HttpRequestNodeExecutor`: Makes HTTP calls
- `McpCallNodeExecutor`: Calls MCP tools

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/workflows/{id}/execute | Start workflow execution |
| GET | /api/workflows/{id}/runs | List workflow runs |
| GET | /api/workflows/runs/{executionId} | Get run status |

## Response Format

```json
{
  "success": true,
  "data": {
    "runId": 123,
    "executionId": "uuid-string",
    "status": "PENDING|RUNNING|SUCCESS|FAILED",
    "message": "Execution started"
  }
}
```

## Node Execution Result

Each node returns `ExecutionResult`:
```json
{
  "nodeId": "node-1",
  "success": true,
  "output": { "result": "data" },
  "errorMessage": null,
  "branch": null
}
```

## Test Coverage

- `WorkflowExecutorTest`: 4 tests
- `ExecutionEngineServiceIntegrationTest`: 6 tests
- `ExecutionEngineServiceTest`: 6 tests (legacy)
