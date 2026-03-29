package com.taskflow.executor;

import com.taskflow.model.NodeType;
import com.taskflow.model.WorkflowDefinition;
import com.taskflow.model.WorkflowDefinition.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for WorkflowExecutor.
 *
 * Tests the core workflow execution logic including:
 * - Starting from START node
 * - Following edges in correct order
 * - Handling condition branching
 * - Detecting cycles
 */
class WorkflowExecutorTest {

    private WorkflowExecutor workflowExecutor;

    @BeforeEach
    void setUp() {
        workflowExecutor = new WorkflowExecutor();
        // Register all executors
        workflowExecutor.registerExecutor(new StartNodeExecutor());
        workflowExecutor.registerExecutor(new EndNodeExecutor());
        workflowExecutor.registerExecutor(new DelayNodeExecutor());
        workflowExecutor.registerExecutor(new ConditionNodeExecutor());
        workflowExecutor.registerExecutor(new HttpRequestNodeExecutor());
        workflowExecutor.registerExecutor(new McpCallNodeExecutor());
    }

    @Test
    @DisplayName("Should execute simple linear workflow: Start -> Delay -> End")
    void shouldExecuteLinearWorkflow() {
        // Given: A simple workflow with Start -> Delay -> End
        Node startNode = new Node("start-1", NodeType.START, "Start", "Start node",
            Map.of("outputVariable", "input"), new Position(0, 0));
        Node delayNode = new Node("delay-1", NodeType.DELAY, "Wait", "Delay node",
            Map.of("duration", 1), new Position(0, 100));
        Node endNode = new Node("end-1", NodeType.END, "End", "End node",
            Map.of(), new Position(0, 200));

        Edge startToDelay = new Edge("e1", "start-1", "delay-1", "output", "input", null);
        Edge delayToEnd = new Edge("e2", "delay-1", "end-1", "output", "input", null);

        WorkflowDefinition definition = new WorkflowDefinition(
            List.of(startNode, delayNode, endNode),
            List.of(startToDelay, delayToEnd)
        );

        ExecutionContext context = new ExecutionContext("exec-1", 1L);

        // When
        Map<String, ExecutionResult> results = workflowExecutor.execute(definition, context);

        // Then
        assertEquals(3, results.size());
        assertTrue(results.get("start-1").isSuccess());
        assertTrue(results.get("delay-1").isSuccess());
        assertTrue(results.get("end-1").isSuccess());
    }

    @Test
    @DisplayName("Should follow condition node execution")
    void shouldExecuteConditionNode() {
        // Given: Start -> Condition -> End
        // The condition checks for 'exists' of a non-null value
        Node startNode = new Node("start-1", NodeType.START, "Start", "Start",
            Map.of("outputVariable", "input"), new Position(0, 0));
        Node conditionNode = new Node("cond-1", NodeType.CONDITION, "Check", "Condition",
            Map.of("conditions", List.of(
                Map.of("field", "status", "operator", "eq", "value", "active")
            ), "logic", "and"), new Position(0, 100));
        Node endNode = new Node("end-1", NodeType.END, "End", "End",
            Map.of(), new Position(0, 200));

        Edge startToCond = new Edge("e1", "start-1", "cond-1", "output", "input", null);
        Edge condToEndTrue = new Edge("e2", "cond-1", "end-1", "true", "input", "true branch");
        Edge condToEndFalse = new Edge("e3", "cond-1", "end-1", "false", "input", "false branch");

        WorkflowDefinition definition = new WorkflowDefinition(
            List.of(startNode, conditionNode, endNode),
            List.of(startToCond, condToEndTrue, condToEndFalse)
        );

        ExecutionContext context = new ExecutionContext("exec-1", 1L);

        // When: Execute workflow
        Map<String, ExecutionResult> results = workflowExecutor.execute(definition, context);

        // Then: Condition node should be executed and return a result
        assertTrue(results.containsKey("cond-1"));
        assertTrue(results.get("cond-1").isSuccess());
        // Branch should be either "true" or "false" depending on input data
        assertNotNull(results.get("cond-1").getBranch());
    }

    @Test
    @DisplayName("Should throw exception when no START node exists")
    void shouldThrowExceptionWhenNoStartNode() {
        // Given: A workflow without START node
        Node endNode = new Node("end-1", NodeType.END, "End", "End",
            Map.of(), new Position(0, 200));

        WorkflowDefinition definition = new WorkflowDefinition(
            List.of(endNode),
            List.of()
        );

        ExecutionContext context = new ExecutionContext("exec-1", 1L);

        // When/Then
        assertThrows(IllegalStateException.class, () ->
            workflowExecutor.execute(definition, context));
    }

    @Test
    @DisplayName("Should avoid infinite loops with cycle detection")
    void shouldAvoidInfiniteLoopWithCycle() {
        // Given: A workflow with a cycle (Start -> A -> B -> A -> End)
        Node startNode = new Node("start-1", NodeType.START, "Start", "Start",
            Map.of(), new Position(0, 0));
        Node nodeA = new Node("node-a", NodeType.DELAY, "A", "Node A",
            Map.of("duration", 1), new Position(0, 100));
        Node nodeB = new Node("node-b", NodeType.DELAY, "B", "Node B",
            Map.of("duration", 1), new Position(0, 200));
        Node endNode = new Node("end-1", NodeType.END, "End", "End",
            Map.of(), new Position(0, 300));

        Edge startToA = new Edge("e1", "start-1", "node-a", "output", "input", null);
        Edge aToB = new Edge("e2", "node-a", "node-b", "output", "input", null);
        Edge bToA = new Edge("e3", "node-b", "node-a", "output", "input", null); // Cycle!
        Edge bToEnd = new Edge("e4", "node-b", "end-1", "output", "input", null);

        WorkflowDefinition definition = new WorkflowDefinition(
            List.of(startNode, nodeA, nodeB, endNode),
            List.of(startToA, aToB, bToA, bToEnd)
        );

        ExecutionContext context = new ExecutionContext("exec-1", 1L);

        // When: Execute should complete without infinite loop
        Map<String, ExecutionResult> results = workflowExecutor.execute(definition, context);

        // Then: Nodes should be visited without infinite loop
        assertEquals(4, results.size());
    }
}
