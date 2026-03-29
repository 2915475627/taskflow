import { describe, it, expect } from 'vitest';
import {
  NODE_REGISTRY,
  getNodeDefinition,
  createNodeData,
} from '../nodeRegistry';
import { BuiltInNodeType } from '@/types';

describe('nodeRegistry', () => {
  describe('NODE_REGISTRY', () => {
    it('should have entries for all built-in node types', () => {
      expect(NODE_REGISTRY[BuiltInNodeType.START]).toBeDefined();
      expect(NODE_REGISTRY[BuiltInNodeType.END]).toBeDefined();
      expect(NODE_REGISTRY[BuiltInNodeType.HTTP_REQUEST]).toBeDefined();
      expect(NODE_REGISTRY[BuiltInNodeType.MCP_CALL]).toBeDefined();
      expect(NODE_REGISTRY[BuiltInNodeType.CONDITION]).toBeDefined();
      expect(NODE_REGISTRY[BuiltInNodeType.DELAY]).toBeDefined();
    });

    it('should have valid descriptions for all nodes', () => {
      Object.values(NODE_REGISTRY).forEach((def) => {
        expect(def.description.length).toBeGreaterThan(10);
      });
    });

    it('should have icons for all nodes', () => {
      Object.values(NODE_REGISTRY).forEach((def) => {
        expect(def.icon).toBeDefined();
        expect(def.icon.length).toBeGreaterThan(0);
      });
    });

    it('should have categories for all nodes', () => {
      Object.values(NODE_REGISTRY).forEach((def) => {
        expect(['trigger', 'action', 'logic', 'control']).toContain(def.category);
      });
    });

    it('should have handles configuration for all nodes', () => {
      Object.values(NODE_REGISTRY).forEach((def) => {
        expect(def.handles).toBeDefined();
        expect(def.handles.inputs).toBeDefined();
        expect(def.handles.outputs).toBeDefined();
      });
    });
  });

  describe('getNodeDefinition', () => {
    it('should return definition for START type', () => {
      const def = getNodeDefinition(BuiltInNodeType.START);
      expect(def.label).toBe('Start');
      expect(def.category).toBe('trigger');
      expect(def.defaultConfig).toHaveProperty('outputVariable', 'input');
    });

    it('should return definition for END type', () => {
      const def = getNodeDefinition(BuiltInNodeType.END);
      expect(def.label).toBe('End');
      expect(def.category).toBe('trigger');
    });

    it('should return definition for HTTP_REQUEST type', () => {
      const def = getNodeDefinition(BuiltInNodeType.HTTP_REQUEST);
      expect(def.label).toBe('HTTP Request');
      expect(def.category).toBe('action');
      expect(def.defaultConfig).toHaveProperty('method', 'GET');
      expect(def.defaultConfig).toHaveProperty('url', '');
      expect(def.defaultConfig).toHaveProperty('headers');
      expect(def.defaultConfig).toHaveProperty('timeout', 30000);
    });

    it('should return definition for MCP_CALL type', () => {
      const def = getNodeDefinition(BuiltInNodeType.MCP_CALL);
      expect(def.label).toBe('MCP Call');
      expect(def.category).toBe('action');
      expect(def.defaultConfig).toHaveProperty('serverName');
      expect(def.defaultConfig).toHaveProperty('toolName');
      expect(def.defaultConfig).toHaveProperty('arguments');
    });

    it('should return definition for CONDITION type', () => {
      const def = getNodeDefinition(BuiltInNodeType.CONDITION);
      expect(def.label).toBe('Condition');
      expect(def.category).toBe('logic');
      expect(def.defaultConfig).toHaveProperty('conditions');
      expect(def.defaultConfig).toHaveProperty('logic', 'and');
    });

    it('should return definition for DELAY type', () => {
      const def = getNodeDefinition(BuiltInNodeType.DELAY);
      expect(def.label).toBe('Delay');
      expect(def.category).toBe('control');
      expect(def.defaultConfig).toHaveProperty('duration', 1000);
    });

    it('should return correct handles for CONDITION node', () => {
      const def = getNodeDefinition(BuiltInNodeType.CONDITION);
      expect(def.handles.outputs).toHaveLength(2);
      expect(def.handles.outputs[0].condition).toBe('true');
      expect(def.handles.outputs[1].condition).toBe('false');
    });
  });

  describe('createNodeData', () => {
    it('should create node data with default config for START', () => {
      const data = createNodeData(BuiltInNodeType.START);
      expect(data.type).toBe(BuiltInNodeType.START);
      expect(data.name).toBe('New Start');
      expect(data.config).toHaveProperty('outputVariable', 'input');
    });

    it('should create node data with default config for HTTP_REQUEST', () => {
      const data = createNodeData(BuiltInNodeType.HTTP_REQUEST);
      expect(data.type).toBe(BuiltInNodeType.HTTP_REQUEST);
      expect(data.name).toBe('New HTTP Request');
      expect(data.config).toHaveProperty('method', 'GET');
      expect(data.config).toHaveProperty('url', '');
      expect(data.config).toHaveProperty('headers');
      expect(data.config).toHaveProperty('timeout', 30000);
    });

    it('should create node data with default config for CONDITION', () => {
      const data = createNodeData(BuiltInNodeType.CONDITION);
      expect(data.type).toBe(BuiltInNodeType.CONDITION);
      expect(data.name).toBe('New Condition');
      expect(data.config).toHaveProperty('conditions');
      expect(Array.isArray(data.config.conditions)).toBe(true);
      expect(data.config).toHaveProperty('logic', 'and');
    });

    it('should create node data with default config for DELAY', () => {
      const data = createNodeData(BuiltInNodeType.DELAY);
      expect(data.type).toBe(BuiltInNodeType.DELAY);
      expect(data.name).toBe('New Delay');
      expect(data.config).toHaveProperty('duration', 1000);
    });

    it('should create node data with default config for MCP_CALL', () => {
      const data = createNodeData(BuiltInNodeType.MCP_CALL);
      expect(data.type).toBe(BuiltInNodeType.MCP_CALL);
      expect(data.name).toBe('New MCP Call');
      expect(data.config).toHaveProperty('serverName', '');
      expect(data.config).toHaveProperty('toolName', '');
      expect(data.config).toHaveProperty('arguments');
    });

    it('should create node data with description', () => {
      const data = createNodeData(BuiltInNodeType.DELAY);
      expect(data.description).toBeDefined();
      expect(data.description.length).toBeGreaterThan(0);
    });

    it('should create independent config object (immutability)', () => {
      const data = createNodeData(BuiltInNodeType.HTTP_REQUEST);
      const originalConfig = { ...NODE_REGISTRY[BuiltInNodeType.HTTP_REQUEST].defaultConfig };
      data.config.method = 'POST';
      expect(NODE_REGISTRY[BuiltInNodeType.HTTP_REQUEST].defaultConfig.method).toBe('GET');
    });
  });
});
