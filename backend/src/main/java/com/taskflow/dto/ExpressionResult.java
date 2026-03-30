package com.taskflow.dto;

/**
 * Result of an expression evaluation.
 */
public record ExpressionResult(
    boolean success,
    Object value,
    String error
) {
    public static ExpressionResult success(Object value) {
        return new ExpressionResult(true, value, null);
    }

    public static ExpressionResult failure(String error) {
        return new ExpressionResult(false, null, error);
    }

    public Object getValueOrDefault(Object defaultValue) {
        return success ? value : defaultValue;
    }
}