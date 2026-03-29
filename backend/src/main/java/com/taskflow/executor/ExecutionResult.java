package com.taskflow.executor;

/**
 * Result of executing a single node.
 *
 * Contains the node output, success/failure status, and for condition nodes,
 * the branch that was taken (true/false).
 */
public class ExecutionResult {
    private final String nodeId;
    private final boolean success;
    private final Object output;
    private final String errorMessage;
    private final String branch; // For condition nodes: "true" or "false"

    private ExecutionResult(String nodeId, boolean success, Object output, String errorMessage, String branch) {
        this.nodeId = nodeId;
        this.success = success;
        this.output = output;
        this.errorMessage = errorMessage;
        this.branch = branch;
    }

    public static ExecutionResult success(String nodeId, Object output) {
        return new ExecutionResult(nodeId, true, output, null, null);
    }

    public static ExecutionResult failure(String nodeId, String errorMessage) {
        return new ExecutionResult(nodeId, false, null, errorMessage, null);
    }

    public static ExecutionResult success(String nodeId, Object output, String branch) {
        return new ExecutionResult(nodeId, true, output, null, branch);
    }

    public String getNodeId() { return nodeId; }
    public boolean isSuccess() { return success; }
    public Object getOutput() { return output; }
    public String getErrorMessage() { return errorMessage; }
    public String getBranch() { return branch; }
}
