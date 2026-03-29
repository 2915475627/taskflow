import { type NodeTypes } from 'reactflow';
import StartNode from './StartNode';
import EndNode from './EndNode';
import HttpRequestNode from './HttpRequestNode';
import McpCallNode from './McpCallNode';
import ConditionNode from './ConditionNode';
import DelayNode from './DelayNode';

export const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  httpRequest: HttpRequestNode,
  mcpCall: McpCallNode,
  condition: ConditionNode,
  delay: DelayNode,
};

export { StartNode };
export { EndNode };
export { HttpRequestNode };
export { McpCallNode };
export { ConditionNode };
export { DelayNode };
export { BaseNode } from './BaseNode';

export default nodeTypes;
