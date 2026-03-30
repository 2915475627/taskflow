package com.taskflow.service;

import com.taskflow.dto.ExpressionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ExpressionEngine.
 */
class ExpressionEngineTest {

    private ExpressionEngine engine;

    @BeforeEach
    void setUp() {
        engine = new ExpressionEngine();
    }

    // ==================== Variable Substitution Tests ====================

    @Test
    @DisplayName("Should substitute simple variable")
    void shouldSubstituteSimpleVariable() {
        Map<String, Object> context = Map.of("name", "John");

        String result = engine.substituteVariables("Hello ${name}", context);

        assertEquals("Hello John", result);
    }

    @Test
    @DisplayName("Should substitute nested variable")
    void shouldSubstituteNestedVariable() {
        Map<String, Object> context = Map.of(
            "data", Map.of("user", Map.of("name", "Jane"))
        );

        String result = engine.substituteVariables("Hello ${data.user.name}", context);

        assertEquals("Hello Jane", result);
    }

    @Test
    @DisplayName("Should handle missing variable")
    void shouldHandleMissingVariable() {
        Map<String, Object> context = Map.of();

        String result = engine.substituteVariables("Hello ${name}", context);

        assertEquals("Hello ", result);
    }

    @Test
    @DisplayName("Should substitute multiple variables")
    void shouldSubstituteMultipleVariables() {
        Map<String, Object> context = Map.of(
            "firstName", "John",
            "lastName", "Doe"
        );

        String result = engine.substituteVariables("${firstName} ${lastName}", context);

        assertEquals("John Doe", result);
    }

    // ==================== Template Evaluation Tests ====================

    @Test
    @DisplayName("Should evaluate template with variables")
    void shouldEvaluateTemplateWithVariables() {
        Map<String, Object> context = Map.of(
            "name", "World",
            "count", 5
        );

        ExpressionResult result = engine.evaluateTemplate("Hello ${name}! Count: ${count}", context);

        assertTrue(result.success());
        assertEquals("Hello World! Count: 5", result.value());
    }

    @Test
    @DisplayName("Should handle template without variables")
    void shouldHandleTemplateWithoutVariables() {
        Map<String, Object> context = Map.of();

        ExpressionResult result = engine.evaluateTemplate("Hello World!", context);

        assertTrue(result.success());
        assertEquals("Hello World!", result.value());
    }

    // ==================== Math Evaluation Tests ====================

    @Test
    @DisplayName("Should evaluate addition")
    void shouldEvaluateAddition() {
        ExpressionResult result = engine.evaluateMath("5 + 3", Map.of());

        assertTrue(result.success());
        assertEquals(8L, result.value());
    }

    @Test
    @DisplayName("Should evaluate subtraction")
    void shouldEvaluateSubtraction() {
        ExpressionResult result = engine.evaluateMath("10 - 4", Map.of());

        assertTrue(result.success());
        assertEquals(6L, result.value());
    }

    @Test
    @DisplayName("Should evaluate multiplication")
    void shouldEvaluateMultiplication() {
        ExpressionResult result = engine.evaluateMath("3 * 4", Map.of());

        assertTrue(result.success());
        assertEquals(12L, result.value());
    }

    @Test
    @DisplayName("Should evaluate division")
    void shouldEvaluateDivision() {
        ExpressionResult result = engine.evaluateMath("10 / 2", Map.of());

        assertTrue(result.success());
        assertEquals(5, ((Number)result.value()).doubleValue(), 0.001);
    }

    @Test
    @DisplayName("Should handle decimal results")
    void shouldHandleDecimalResults() {
        ExpressionResult result = engine.evaluateMath("10 / 4", Map.of());

        assertTrue(result.success());
        assertEquals(2.5, result.value());
    }

    @Test
    @DisplayName("Should evaluate math with variable substitution")
    void shouldEvaluateMathWithVariableSubstitution() {
        Map<String, Object> context = Map.of(
            "a", 10,
            "b", 3
        );

        ExpressionResult result = engine.evaluateMath("${a} + ${b}", context);

        assertTrue(result.success());
        assertEquals(13L, result.value());
    }

    // ==================== Condition Evaluation Tests ====================

    @Test
    @DisplayName("Should evaluate equals condition")
    void shouldEvaluateEqualsCondition() {
        Map<String, Object> context = Map.of("status", "active");

        ExpressionResult result = engine.evaluateCondition("${status} eq 'active'", context);

        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    @DisplayName("Should evaluate not equals condition")
    void shouldEvaluateNotEqualsCondition() {
        Map<String, Object> context = Map.of("status", "active");

        ExpressionResult result = engine.evaluateCondition("${status} neq 'inactive'", context);

        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    @DisplayName("Should evaluate greater than condition")
    void shouldEvaluateGreaterThanCondition() {
        Map<String, Object> context = Map.of("count", 10);

        ExpressionResult result = engine.evaluateCondition("${count} gt 5", context);

        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    @DisplayName("Should evaluate less than condition")
    void shouldEvaluateLessThanCondition() {
        Map<String, Object> context = Map.of("count", 3);

        ExpressionResult result = engine.evaluateCondition("${count} lt 5", context);

        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    @DisplayName("Should evaluate AND condition")
    void shouldEvaluateAndCondition() {
        Map<String, Object> context = Map.of(
            "status", "active",
            "count", 10
        );

        ExpressionResult result = engine.evaluateCondition(
            "${status} eq 'active' and ${count} gt 5", context);

        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    @DisplayName("Should evaluate OR condition")
    void shouldEvaluateOrCondition() {
        Map<String, Object> context = Map.of(
            "status", "inactive",
            "count", 10
        );

        ExpressionResult result = engine.evaluateCondition(
            "${status} eq 'active' or ${count} gt 5", context);

        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    @DisplayName("Should evaluate contains function")
    void shouldEvaluateContainsFunction() {
        Map<String, Object> context = Map.of("text", "Hello World");

        ExpressionResult result = engine.evaluateCondition("contains(${text}, 'World')", context);

        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    @DisplayName("Should evaluate startsWith function")
    void shouldEvaluateStartsWithFunction() {
        Map<String, Object> context = Map.of("text", "Hello World");

        ExpressionResult result = engine.evaluateCondition("startsWith(${text}, 'Hello')", context);

        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    @DisplayName("Should evaluate endsWith function")
    void shouldEvaluateEndsWithFunction() {
        Map<String, Object> context = Map.of("text", "Hello World");

        ExpressionResult result = engine.evaluateCondition("endsWith(${text}, 'World')", context);

        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    @DisplayName("Should evaluate length function")
    void shouldEvaluateLengthFunction() {
        Map<String, Object> context = Map.of("text", "Hello");

        ExpressionResult result = engine.evaluateCondition("length(${text}) gt 3", context);

        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    @DisplayName("Should evaluate now function")
    void shouldEvaluateNowFunction() {
        ExpressionResult result = engine.evaluateCondition("now() neq null", Map.of());

        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    // ==================== General Evaluation Tests ====================

    @Test
    @DisplayName("Should auto-detect condition expression")
    void shouldAutoDetectConditionExpression() {
        Map<String, Object> context = Map.of("status", "active");

        ExpressionResult result = engine.evaluate("${status} eq 'active'", context);

        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    @DisplayName("Should parse boolean literal")
    void shouldParseBooleanLiteral() {
        ExpressionResult result = engine.evaluate("true", Map.of());

        assertTrue(result.success());
        assertEquals(true, result.value());
    }

    @Test
    @DisplayName("Should parse number literal")
    void shouldParseNumberLiteral() {
        ExpressionResult result = engine.evaluate("42", Map.of());

        assertTrue(result.success());
        assertEquals(42L, result.value());
    }

    @Test
    @DisplayName("Should parse string literal")
    void shouldParseStringLiteral() {
        ExpressionResult result = engine.evaluate("'hello'", Map.of());

        assertTrue(result.success());
        assertEquals("hello", result.value());
    }

    @Test
    @DisplayName("Should return failure for invalid expression")
    void shouldReturnFailureForInvalidExpression() {
        // Use an expression that actually has invalid syntax
        ExpressionResult result = engine.evaluate("contains(${nonexistent", Map.of());

        assertFalse(result.success());
        assertNotNull(result.error());
    }
}