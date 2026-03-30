package com.taskflow.service;

import com.taskflow.dto.ExpressionResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for evaluating expressions.
 *
 * Supports:
 * - Variable substitution: ${variable.path}
 * - String templates: "Hello ${name}"
 * - Math expressions: ${a + b}, ${a * b}
 * - Comparison operators: eq, neq, gt, lt, gte, lte
 * - Logical operators: and, or, not
 * - String functions: contains(), startsWith(), endsWith(), length(), upper(), lower()
 * - Date functions: now(), format()
 */
@Service
public class ExpressionEngine {

    private static final Logger log = LoggerFactory.getLogger(ExpressionEngine.class);

    // Pattern to match ${...} expressions
    private static final Pattern EXPRESSION_PATTERN = Pattern.compile("\\$\\{([^}]+)}");

    // Pattern to match math operations
    private static final Pattern MATH_PATTERN = Pattern.compile("^\\s*(-?\\d+(?:\\.\\d+)?)\\s*([+\\-*/])\\s*(-?\\d+(?:\\.\\d+)?)\\s*$");

    /**
     * Evaluate a conditional expression.
     * Returns true or false based on the comparison.
     *
     * @param expression The expression to evaluate (e.g., "${data.status} eq 'active'")
     * @param context The variable context for variable substitution
     * @return ExpressionResult with boolean value or error
     */
    public ExpressionResult evaluateCondition(String expression, Map<String, Object> context) {
        try {
            // First, substitute variables in the expression
            String resolved = substituteVariables(expression, context);
            resolved = resolved.trim();

            // Parse and evaluate the condition
            return evaluateConditionExpression(resolved, context);
        } catch (Exception e) {
            log.error("Condition evaluation failed for expression '{}': {}", expression, e.getMessage());
            return ExpressionResult.failure("Failed to evaluate condition: " + e.getMessage());
        }
    }

    /**
     * Evaluate a string template with variable substitution.
     *
     * @param template The template string (e.g., "Hello ${name}")
     * @param context The variable context
     * @return ExpressionResult with the resolved string or error
     */
    public ExpressionResult evaluateTemplate(String template, Map<String, Object> context) {
        try {
            String result = substituteVariables(template, context);
            // If it's a single variable reference that resolved to empty, return null
            if (template.matches("\\$\\{[^}]+}$") && result.isEmpty()) {
                return ExpressionResult.success(null);
            }
            // If the result is a quoted string, strip the quotes
            if ((result.startsWith("\"") && result.endsWith("\"")) ||
                (result.startsWith("'") && result.endsWith("'"))) {
                result = result.substring(1, result.length() - 1);
            }
            return ExpressionResult.success(result);
        } catch (Exception e) {
            log.error("Template evaluation failed for '{}': {}", template, e.getMessage());
            return ExpressionResult.failure("Failed to evaluate template: " + e.getMessage());
        }
    }

    /**
     * Evaluate a math expression.
     *
     * @param expression The math expression (e.g., "${a + b}" or just "a + b")
     * @param context The variable context
     * @return ExpressionResult with numeric value or error
     */
    public ExpressionResult evaluateMath(String expression, Map<String, Object> context) {
        try {
            String resolved = substituteVariables(expression, context);
            resolved = resolved.trim();

            // Try to evaluate as simple math
            Matcher mathMatcher = MATH_PATTERN.matcher(resolved);
            if (mathMatcher.matches()) {
                double left = Double.parseDouble(mathMatcher.group(1));
                String operator = mathMatcher.group(2);
                double right = Double.parseDouble(mathMatcher.group(3));

                double result = switch (operator) {
                    case "+" -> left + right;
                    case "-" -> left - right;
                    case "*" -> left * right;
                    case "/" -> right != 0 ? left / right : Double.NaN;
                    default -> throw new IllegalArgumentException("Unknown operator: " + operator);
                };

                // Return integer if result is whole number
                if (result == Math.floor(result) && !Double.isInfinite(result)) {
                    return ExpressionResult.success((long) result);
                }
                return ExpressionResult.success(result);
            }

            // Try to parse as a number directly
            try {
                if (resolved.contains(".")) {
                    return ExpressionResult.success(Double.parseDouble(resolved));
                } else {
                    return ExpressionResult.success(Long.parseLong(resolved));
                }
            } catch (NumberFormatException e) {
                return ExpressionResult.failure("Not a valid number: " + resolved);
            }
        } catch (Exception e) {
            log.error("Math evaluation failed for expression '{}': {}", expression, e.getMessage());
            return ExpressionResult.failure("Failed to evaluate math: " + e.getMessage());
        }
    }

    /**
     * Evaluate a general expression (auto-detect type).
     *
     * @param expression The expression to evaluate
     * @param context The variable context
     * @return ExpressionResult with the evaluated value or error
     */
    public ExpressionResult evaluate(String expression, Map<String, Object> context) {
        try {
            // Check if it's a comparison expression
            if (containsComparisonOperator(expression)) {
                return evaluateCondition(expression, context);
            }

            // Check if it's a condition expression with function calls
            if (isFunctionCall(expression)) {
                return evaluateCondition(expression, context);
            }

            // Check for string concatenation with + operator before template check
            if (expression.contains("${") && expression.contains("+")) {
                return evaluateStringConcat(expression, context);
            }

            // Check for math expressions with variables (contains ${ and *, /, or standalone +)
            if (expression.contains("${")) {
                String afterSubstitution = substituteVariables(expression, context);
                // If substituted result looks like math, evaluate as math
                if (MATH_PATTERN.matcher(afterSubstitution.trim()).matches()) {
                    return evaluateMath(expression, context);
                }
                // If it's a single variable reference that resolved to empty, return null
                if (expression.matches("\\$\\{[^}]+}$") && afterSubstitution.isEmpty()) {
                    return ExpressionResult.success(null);
                }
                // Otherwise treat as template
                return evaluateTemplate(expression, context);
            }

            // Check if it's a math expression
            String resolved = substituteVariables(expression, context);
            if (MATH_PATTERN.matcher(resolved.trim()).matches()) {
                return evaluateMath(expression, context);
            }

            // Otherwise, try to parse as literal value
            return parseLiteral(resolved);
        } catch (Exception e) {
            log.error("Evaluation failed for expression '{}': {}", expression, e.getMessage());
            return ExpressionResult.failure("Failed to evaluate: " + e.getMessage());
        }
    }

    private boolean isFunctionCall(String expression) {
        return expression.contains("(") && expression.contains(")") &&
               (expression.contains("contains") ||
                expression.contains("startsWith") ||
                expression.contains("endsWith") ||
                expression.contains("length") ||
                expression.contains("now"));
    }

    /**
     * Evaluate string concatenation expression like "${a} + ' ' + ${b}".
     * If all operands are numbers, performs addition instead of concatenation.
     */
    private ExpressionResult evaluateStringConcat(String expression, Map<String, Object> context) {
        try {
            String[] parts = splitByPlusRespectingQuotes(expression);
            java.util.List<Object> values = new java.util.ArrayList<>();
            boolean hasNonNumeric = false;

            for (String part : parts) {
                String trimmed = part.trim();
                // Skip empty parts
                if (trimmed.isEmpty()) {
                    continue;
                }
                // Handle quoted strings - strip quotes and mark as non-numeric
                if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
                    (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                    values.add(trimmed.substring(1, trimmed.length() - 1));
                    hasNonNumeric = true;
                } else if (trimmed.startsWith("${") && trimmed.endsWith("}")) {
                    // Handle variable references - strip ${} and resolve
                    Object resolved = resolveVariable(trimmed.substring(2, trimmed.length() - 1), context);
                    if (resolved != null) {
                        values.add(resolved);
                        if (!(resolved instanceof Number)) {
                            hasNonNumeric = true;
                        }
                    }
                } else {
                    // Otherwise try to evaluate as expression
                    Object resolved = resolveValue(trimmed, context);
                    if (resolved != null) {
                        values.add(resolved);
                        if (!(resolved instanceof Number)) {
                            hasNonNumeric = true;
                        }
                    }
                }
            }

            // If all values are numbers, perform addition
            if (!values.isEmpty() && !hasNonNumeric) {
                double sum = 0;
                for (Object val : values) {
                    sum += ((Number) val).doubleValue();
                }
                if (sum == Math.floor(sum) && !Double.isInfinite(sum)) {
                    return ExpressionResult.success((long) sum);
                }
                return ExpressionResult.success(sum);
            }

            // Otherwise, concatenate as strings
            StringBuilder result = new StringBuilder();
            for (Object val : values) {
                result.append(val.toString());
            }
            return ExpressionResult.success(result.toString());
        } catch (Exception e) {
            log.error("String concatenation evaluation failed for '{}': {}", expression, e.getMessage());
            return ExpressionResult.failure("Failed to evaluate string concatenation: " + e.getMessage());
        }
    }

    /**
     * Split by + operator while respecting quoted strings.
     */
    private String[] splitByPlusRespectingQuotes(String expression) {
        java.util.List<String> parts = new java.util.ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuote = false;
        char quoteChar = 0;

        for (int i = 0; i < expression.length(); i++) {
            char c = expression.charAt(i);

            if ((c == '"' || c == '\'') && !inQuote) {
                inQuote = true;
                quoteChar = c;
                current.append(c);
            } else if (c == quoteChar && inQuote) {
                inQuote = false;
                quoteChar = 0;
                current.append(c);
            } else if (c == '+' && !inQuote) {
                parts.add(current.toString());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }

        String last = current.toString().trim();
        if (!last.isEmpty()) {
            parts.add(last);
        }

        return parts.toArray(new String[0]);
    }

    /**
     * Substitute ${variable.path} patterns with values from context.
     */
    public String substituteVariables(String input, Map<String, Object> context) {
        if (input == null || context == null) {
            return input;
        }

        Matcher matcher = EXPRESSION_PATTERN.matcher(input);
        StringBuilder result = new StringBuilder();

        while (matcher.find()) {
            String expression = matcher.group(1);
            Object value = resolveVariable(expression, context);
            String replacement = value != null ? value.toString() : "";
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(result);

        return result.toString();
    }

    /**
     * Resolve a variable path to its value.
     * Supports nested paths like "data.user.name"
     */
    @SuppressWarnings("unchecked")
    private Object resolveVariable(String path, Map<String, Object> context) {
        if (path == null || context == null) {
            return null;
        }

        Object value = context;
        for (String part : path.split("\\.")) {
            if (value instanceof Map) {
                value = ((Map<String, Object>) value).get(part);
            } else {
                return null;
            }
            if (value == null) {
                return null;
            }
        }
        return value;
    }

    private ExpressionResult evaluateConditionExpression(String expression, Map<String, Object> context) {
        // Handle logical operators
        if (expression.contains(" and ")) {
            String[] parts = expression.split(" and ");
            boolean result = true;
            for (String part : parts) {
                ExpressionResult r = evaluateConditionExpression(part.trim(), context);
                if (!r.success()) return r;
                if (!Boolean.TRUE.equals(r.value())) {
                    result = false;
                    break;
                }
            }
            return ExpressionResult.success(result);
        }

        if (expression.contains(" or ")) {
            String[] parts = expression.split(" or ");
            for (String part : parts) {
                ExpressionResult r = evaluateConditionExpression(part.trim(), context);
                if (!r.success()) return r;
                if (Boolean.TRUE.equals(r.value())) {
                    return ExpressionResult.success(true);
                }
            }
            return ExpressionResult.success(false);
        }

        // Handle comparison operators
        for (String op : List.of(" eq ", " neq ", " gt ", " lt ", " gte ", " lte ", " >= ", " <= ", " > ", " < ")) {
            int idx = expression.indexOf(op);
            if (idx > 0) {
                String left = expression.substring(0, idx).trim();
                String right = expression.substring(idx + op.length()).trim();
                return compareValues(left, right, op.trim(), context);
            }
        }

        // Handle function calls
        if (expression.contains("contains(")) {
            return evaluateContains(expression, context);
        }

        if (expression.contains("startsWith(")) {
            return evaluateStartsWith(expression, context);
        }

        if (expression.contains("endsWith(")) {
            return evaluateEndsWith(expression, context);
        }

        // Handle length function
        if (expression.startsWith("length(")) {
            return evaluateLength(expression, context);
        }

        // Handle now() function
        if (expression.equals("now()")) {
            return ExpressionResult.success(Instant.now().toString());
        }

        // If no operator found, treat as boolean
        Object value = resolveVariable(expression, context);
        if (value == null) {
            return ExpressionResult.failure("Variable not found: " + expression);
        }
        return ExpressionResult.success(Boolean.TRUE.equals(value) || "true".equalsIgnoreCase(value.toString()));
    }

    private ExpressionResult compareValues(String leftStr, String rightStr, String operator, Map<String, Object> context) {
        // Resolve variables or evaluate expressions
        Object left = resolveValue(leftStr, context);
        Object right = resolveValue(rightStr, context);

        // Handle null
        if (left == null || right == null) {
            return ExpressionResult.success(operator.equals("neq"));
        }

        // Compare based on operator
        return switch (operator) {
            case "eq", "=" -> ExpressionResult.success(Objects.equals(left, right));
            case "neq", "!=" -> ExpressionResult.success(!Objects.equals(left, right));
            case "gt", ">" -> ExpressionResult.success(compareNumbers(left, right) > 0);
            case "lt", "<" -> ExpressionResult.success(compareNumbers(left, right) < 0);
            case "gte", ">=" -> ExpressionResult.success(compareNumbers(left, right) >= 0);
            case "lte", "<=" -> ExpressionResult.success(compareNumbers(left, right) <= 0);
            default -> ExpressionResult.failure("Unknown operator: " + operator);
        };
    }

    /**
     * Resolve a value from a string - handles variables, function calls, and literals.
     */
    private Object resolveValue(String str, Map<String, Object> context) {
        // Try resolving as variable first
        Object value = resolveVariable(str, context);
        if (value != null) {
            return value;
        }

        // Try evaluating as expression/function
        ExpressionResult result = evaluateExpression(str, context);
        if (result.success()) {
            return result.value();
        }

        // Fall back to parsing as literal
        ExpressionResult literal = parseLiteral(str);
        return literal.success() ? literal.value() : null;
    }

    /**
     * Evaluate an expression string (used internally for function calls etc).
     */
    private ExpressionResult evaluateExpression(String expression, Map<String, Object> context) {
        // Check for function calls
        if (expression.contains("(") && expression.contains(")")) {
            if (expression.startsWith("length(")) {
                return evaluateLength(expression, context);
            }
            if (expression.contains("contains(")) {
                return evaluateContains(expression, context);
            }
            if (expression.contains("startsWith(")) {
                return evaluateStartsWith(expression, context);
            }
            if (expression.contains("endsWith(")) {
                return evaluateEndsWith(expression, context);
            }
            if (expression.equals("now()")) {
                return ExpressionResult.success(Instant.now().toString());
            }
        }
        return ExpressionResult.failure("Cannot evaluate: " + expression);
    }

    private int compareNumbers(Object a, Object b) {
        double numA = toDouble(a);
        double numB = toDouble(b);
        return Double.compare(numA, numB);
    }

    private double toDouble(Object value) {
        if (value instanceof Number) return ((Number) value).doubleValue();
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private ExpressionResult evaluateContains(String expression, Map<String, Object> context) {
        int start = expression.indexOf("contains(") + 9;
        int end = expression.lastIndexOf(")");
        String content = expression.substring(start, end);
        String[] args = splitArgs(content);

        if (args.length != 2) {
            return ExpressionResult.failure("contains() requires 2 arguments");
        }

        Object str = evaluateArg(args[0].trim(), context);
        Object sub = evaluateArg(args[1].trim(), context);

        if (str == null || sub == null) {
            return ExpressionResult.failure("contains() argument not found");
        }

        return ExpressionResult.success(str.toString().contains(sub.toString()));
    }

    private ExpressionResult evaluateStartsWith(String expression, Map<String, Object> context) {
        int start = expression.indexOf("startsWith(") + 11;
        int end = expression.lastIndexOf(")");
        String content = expression.substring(start, end);
        String[] args = splitArgs(content);

        if (args.length != 2) {
            return ExpressionResult.failure("startsWith() requires 2 arguments");
        }

        Object str = evaluateArg(args[0].trim(), context);
        Object prefix = evaluateArg(args[1].trim(), context);

        if (str == null || prefix == null) {
            return ExpressionResult.failure("startsWith() argument not found");
        }

        return ExpressionResult.success(str.toString().startsWith(prefix.toString()));
    }

    private ExpressionResult evaluateEndsWith(String expression, Map<String, Object> context) {
        int start = expression.indexOf("endsWith(") + 9;
        int end = expression.lastIndexOf(")");
        String content = expression.substring(start, end);
        String[] args = splitArgs(content);

        if (args.length != 2) {
            return ExpressionResult.failure("endsWith() requires 2 arguments");
        }

        Object str = evaluateArg(args[0].trim(), context);
        Object suffix = evaluateArg(args[1].trim(), context);

        if (str == null || suffix == null) {
            return ExpressionResult.failure("endsWith() argument not found");
        }

        return ExpressionResult.success(str.toString().endsWith(suffix.toString()));
    }

    private ExpressionResult evaluateLength(String expression, Map<String, Object> context) {
        int start = expression.indexOf("length(") + 7;
        int end = expression.lastIndexOf(")");
        String arg = expression.substring(start, end).trim();

        Object value = evaluateArg(arg, context);
        if (value == null) {
            return ExpressionResult.failure("length() argument not found: " + arg);
        }

        if (value instanceof String) {
            return ExpressionResult.success(((String) value).length());
        }
        if (value instanceof List) {
            return ExpressionResult.success(((List<?>) value).size());
        }
        return ExpressionResult.failure("length() requires string or list");
    }

    /**
     * Evaluate a function argument which can be a variable reference or a literal.
     */
    private Object evaluateArg(String arg, Map<String, Object> context) {
        // If it starts with ${, it's a variable reference
        if (arg.startsWith("${") && arg.endsWith("}")) {
            return resolveVariable(arg.substring(2, arg.length() - 1), context);
        }
        // Otherwise, try to parse as literal
        ExpressionResult parsed = parseLiteral(arg);
        return parsed.success() ? parsed.value() : null;
    }

    private String[] splitArgs(String content) {
        // Split by comma, but respect quoted strings
        java.util.List<String> args = new java.util.ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuote = false;
        char quoteChar = 0;

        for (int i = 0; i < content.length(); i++) {
            char c = content.charAt(i);

            if ((c == '"' || c == '\'') && !inQuote) {
                inQuote = true;
                quoteChar = c;
                current.append(c);
            } else if (c == quoteChar && inQuote) {
                inQuote = false;
                quoteChar = 0;
                current.append(c);
            } else if (c == ',' && !inQuote) {
                args.add(current.toString().trim());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }

        // Add the last argument
        String last = current.toString().trim();
        if (!last.isEmpty()) {
            args.add(last);
        }

        return args.toArray(new String[0]);
    }

    private boolean containsComparisonOperator(String expression) {
        return expression.contains(" eq ") || expression.contains(" neq ") ||
               expression.contains(" gt ") || expression.contains(" lt ") ||
               expression.contains(" gte ") || expression.contains(" lte ") ||
               expression.contains(" > ") || expression.contains(" < ") ||
               expression.contains(" >= ") || expression.contains(" <= ") ||
               expression.contains(" and ") || expression.contains(" or ") ||
               expression.contains("contains(");
    }

    private ExpressionResult parseLiteral(String value) {
        if (value == null) {
            return ExpressionResult.success(null);
        }

        String trimmed = value.trim();

        // Boolean
        if ("true".equalsIgnoreCase(trimmed)) {
            return ExpressionResult.success(true);
        }
        if ("false".equalsIgnoreCase(trimmed)) {
            return ExpressionResult.success(false);
        }

        // Null
        if ("null".equalsIgnoreCase(trimmed)) {
            return ExpressionResult.success(null);
        }

        // Number
        try {
            if (trimmed.contains(".")) {
                return ExpressionResult.success(Double.parseDouble(trimmed));
            } else {
                return ExpressionResult.success(Long.parseLong(trimmed));
            }
        } catch (NumberFormatException e) {
            // Not a number
        }

        // String (remove quotes)
        if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return ExpressionResult.success(trimmed.substring(1, trimmed.length() - 1));
        }

        return ExpressionResult.success(trimmed);
    }
}