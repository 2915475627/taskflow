package com.taskflow.executor;

import com.taskflow.model.NodeType;
import com.taskflow.model.WorkflowDefinition;
import com.taskflow.model.WorkflowDefinition.Edge;
import com.taskflow.model.WorkflowDefinition.Node;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.*;

/**
 * Orchestrates workflow execution from START to END nodes.
 *
 * The executor:
 * 1. Finds the START node
 * 2. Traverses the graph following connections
 * 3. Executes each node using the appropriate executor
 * 4. Handles condition branching
 * 5. Returns results for all nodes
 */
@Service
public class WorkflowExecutor {

    private static final Logger log = LoggerFactory.getLogger(WorkflowExecutor.class);

    private final Map<NodeType, NodeExecutor> executors = new HashMap<>();

    @PostConstruct
    public void init() {
        // Note: Spring will inject NodeExecutor beans after construction
        // Use @Autowired or constructor injection in real implementation
    }

    public void registerExecutor(NodeExecutor executor) {
        executors.put(executor.getSupportedType(), executor);
    }

    /**
     * Execute a workflow starting from the START node.
     *
     * @param definition The workflow definition with nodes and edges
     * @param context Execution context with variables
     * @return Map of node IDs to their execution results
     */
    public Map<String, ExecutionResult> execute(WorkflowDefinition definition, ExecutionContext context) {
        Map<String, ExecutionResult> results = new LinkedHashMap<>();

        // Find the START node
        Node startNode = definition.nodes().stream()
            .filter(n -> n.type() == NodeType.START)
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("Workflow must have a START node"));

        log.info("Starting workflow execution from node: {} ({})", startNode.id(), startNode.type());

        // Execute from START node
        executeNode(startNode, definition, context, results);

        return results;
    }

    private void executeNode(Node node, WorkflowDefinition definition,
                             ExecutionContext context, Map<String, ExecutionResult> results) {
        // Avoid cycles
        if (results.containsKey(node.id())) {
            return;
        }

        log.info("Executing node: {} ({})", node.id(), node.type());

        NodeExecutor executor = executors.get(node.type());
        if (executor == null) {
            results.put(node.id(), ExecutionResult.failure(node.id(),
                "No executor for node type: " + node.type()));
            return;
        }

        // Gather input data from connected nodes
        Map<String, Object> inputData = gatherInputData(node, definition, results);

        // Execute the node
        ExecutionResult result = executor.execute(node.id(), node.config(), inputData, context);
        results.put(node.id(), result);

        if (!result.isSuccess()) {
            log.error("Node {} failed: {}", node.id(), result.getErrorMessage());
            return;
        }

        // Find and execute next nodes
        List<Node> nextNodes = getNextNodes(node, result, definition);
        for (Node nextNode : nextNodes) {
            executeNode(nextNode, definition, context, results);
        }
    }

    private Map<String, Object> gatherInputData(Node node, WorkflowDefinition definition,
                                                Map<String, ExecutionResult> results) {
        Map<String, Object> inputData = new HashMap<>();

        for (Edge edge : definition.edges()) {
            if (edge.target().equals(node.id())) {
                ExecutionResult sourceResult = results.get(edge.source());
                if (sourceResult != null && sourceResult.getOutput() != null) {
                    String key = edge.sourceHandle() != null ? edge.sourceHandle() : "default";
                    inputData.put(key, sourceResult.getOutput());
                }
            }
        }

        return inputData;
    }

    private List<Node> getNextNodes(Node currentNode, ExecutionResult result, WorkflowDefinition definition) {
        List<Node> nextNodes = new ArrayList<>();

        // For condition nodes, follow the appropriate branch
        if (currentNode.type() == NodeType.CONDITION && result.getBranch() != null) {
            String branch = result.getBranch();
            for (Edge edge : definition.edges()) {
                if (edge.source().equals(currentNode.id()) && branch.equals(edge.sourceHandle())) {
                    definition.nodes().stream()
                        .filter(n -> n.id().equals(edge.target()))
                        .findFirst()
                        .ifPresent(nextNodes::add);
                }
            }
            return nextNodes;
        }

        // For other nodes, follow all outgoing edges
        for (Edge edge : definition.edges()) {
            if (edge.source().equals(currentNode.id())) {
                definition.nodes().stream()
                    .filter(n -> n.id().equals(edge.target()))
                    .findFirst()
                    .ifPresent(nextNodes::add);
            }
        }

        return nextNodes;
    }
}
