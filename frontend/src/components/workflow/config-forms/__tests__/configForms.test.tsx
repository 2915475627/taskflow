import { describe, it, expect } from 'vitest';
import { BuiltInNodeType, type HttpRequestConfig, type ConditionConfig, type McpCallConfig, type DelayConfig, type ConditionRule } from '@/types';

describe('Node Config Types', () => {
  describe('HttpRequestConfig', () => {
    it('should have required fields', () => {
      const config: HttpRequestConfig = {
        method: 'POST',
        url: 'https://api.example.com',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name":"test"}',
        timeout: 30000,
      };

      expect(config.method).toBe('POST');
      expect(config.url).toBe('https://api.example.com');
      expect(config.headers['Content-Type']).toBe('application/json');
    });

    it('should support all HTTP methods', () => {
      const methods: HttpRequestConfig['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

      methods.forEach((method) => {
        const config: HttpRequestConfig = { method, url: '', headers: {} };
        expect(config.method).toBe(method);
      });
    });

    it('should allow optional headers', () => {
      const config: HttpRequestConfig = {
        method: 'GET',
        url: 'https://api.example.com',
      };

      expect(config.headers).toBeUndefined();
    });

    it('should allow optional body', () => {
      const config: HttpRequestConfig = {
        method: 'GET',
        url: 'https://api.example.com',
      };

      expect(config.body).toBeUndefined();
    });

    it('should allow optional timeout', () => {
      const config: HttpRequestConfig = {
        method: 'GET',
        url: 'https://api.example.com',
      };

      expect(config.timeout).toBeUndefined();
    });

    it('should support custom timeout', () => {
      const config: HttpRequestConfig = {
        method: 'GET',
        url: 'https://api.example.com',
        timeout: 60000,
      };

      expect(config.timeout).toBe(60000);
    });
  });

  describe('ConditionConfig', () => {
    it('should support multiple conditions with AND logic', () => {
      const config: ConditionConfig = {
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'count', operator: 'gt', value: 0 },
        ],
        logic: 'and',
      };

      expect(config.conditions).toHaveLength(2);
      expect(config.logic).toBe('and');
    });

    it('should support OR logic', () => {
      const config: ConditionConfig = {
        conditions: [
          { field: 'a', operator: 'eq', value: 1 },
          { field: 'b', operator: 'eq', value: 2 },
        ],
        logic: 'or',
      };

      expect(config.logic).toBe('or');
    });

    it('should support all operators', () => {
      const operators: ConditionRule['operator'][] = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains', 'startsWith', 'endsWith'];

      operators.forEach((op) => {
        const config: ConditionConfig = {
          conditions: [{ field: 'test', operator: op, value: 'value' }],
          logic: 'and',
        };
        expect(config.conditions[0].operator).toBe(op);
      });
    });

    it('should allow empty conditions array', () => {
      const config: ConditionConfig = {
        conditions: [],
        logic: 'and',
      };

      expect(config.conditions).toHaveLength(0);
    });

    it('should support various value types', () => {
      const stringCondition: ConditionConfig = {
        conditions: [{ field: 'name', operator: 'eq', value: 'test' }],
        logic: 'and',
      };

      const numberCondition: ConditionConfig = {
        conditions: [{ field: 'count', operator: 'gt', value: 10 }],
        logic: 'and',
      };

      const booleanCondition: ConditionConfig = {
        conditions: [{ field: 'active', operator: 'eq', value: true }],
        logic: 'and',
      };

      expect(stringCondition.conditions[0].value).toBe('test');
      expect(numberCondition.conditions[0].value).toBe(10);
      expect(booleanCondition.conditions[0].value).toBe(true);
    });
  });

  describe('McpCallConfig', () => {
    it('should have server, tool, and arguments', () => {
      const config: McpCallConfig = {
        serverName: 'filesystem',
        toolName: 'read_file',
        arguments: { path: '/tmp/test.txt' },
      };

      expect(config.serverName).toBe('filesystem');
      expect(config.toolName).toBe('read_file');
      expect(config.arguments.path).toBe('/tmp/test.txt');
    });

    it('should allow empty arguments', () => {
      const config: McpCallConfig = {
        serverName: 'filesystem',
        toolName: 'list_directory',
        arguments: {},
      };

      expect(config.arguments).toEqual({});
    });

    it('should allow undefined arguments', () => {
      const config: McpCallConfig = {
        serverName: 'filesystem',
        toolName: 'ping',
      };

      expect(config.arguments).toBeUndefined();
    });

    it('should support complex arguments', () => {
      const config: McpCallConfig = {
        serverName: 'database',
        toolName: 'query',
        arguments: {
          sql: 'SELECT * FROM users',
          params: ['param1', 'param2'],
          options: { timeout: 5000 },
        },
      };

      expect(config.arguments.sql).toBe('SELECT * FROM users');
      expect(config.arguments.params).toEqual(['param1', 'param2']);
      expect(config.arguments.options).toEqual({ timeout: 5000 });
    });
  });

  describe('DelayConfig', () => {
    it('should have duration in milliseconds', () => {
      const config: DelayConfig = { duration: 5000 };
      expect(config.duration).toBe(5000);
    });

    it('should support minimum duration', () => {
      const config: DelayConfig = { duration: 1 };
      expect(config.duration).toBe(1);
    });

    it('should support large durations', () => {
      const config: DelayConfig = { duration: 60000 * 60 * 24 }; // 24 hours
      expect(config.duration).toBe(86400000);
    });
  });

  describe('StartConfig', () => {
    it('should allow custom output variable name', () => {
      const config = { outputVariable: 'customInput' };
      expect(config.outputVariable).toBe('customInput');
    });

    it('should allow undefined output variable', () => {
      const config = {};
      expect(config.outputVariable).toBeUndefined();
    });
  });

  describe('EndConfig', () => {
    it('should be empty object', () => {
      const config = {};
      expect(config).toEqual({});
    });
  });
});
