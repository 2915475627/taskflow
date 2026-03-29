package com.taskflow.executor;

import java.util.HashMap;
import java.util.Map;

/**
 * Context passed through workflow execution.
 *
 * Holds workflow variables, execution metadata, and provides
 * thread-safe variable storage during execution.
 */
public class ExecutionContext {
    private final Map<String, Object> variables = new HashMap<>();
    private final String executionId;
    private final Long runId;

    public ExecutionContext(String executionId, Long runId) {
        this.executionId = executionId;
        this.runId = runId;
    }

    public void setVariable(String name, Object value) {
        variables.put(name, value);
    }

    public Object getVariable(String name) {
        return variables.get(name);
    }

    public Map<String, Object> getAllVariables() {
        return new HashMap<>(variables);
    }

    public String getExecutionId() { return executionId; }
    public Long getRunId() { return runId; }
}
