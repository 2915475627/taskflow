# 前端领域设计文档

## 1. 技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | React | 18.x | UI 框架 |
| 构建 | Vite | 5.x | 开发与构建 |
| 路由 | React Router | 6.x | 页面导航 |
| 状态 | Zustand | 4.x | 全局状态管理 |
| 流程图 | React Flow | 11.x | 节点编辑器 |
| 拖拽 | @dnd-kit | 6.x | 拖拽交互 |
| UI 组件 | Radix UI + Shadcn | - | 基础组件库 |
| 请求 | Axios + React Query | - | API 调用与缓存 |
| 测试 | Vitest + React Testing Library + MSW | - | 单元/集成测试 |
| E2E | Playwright | - | 端到端测试 |

## 2. 目录结构

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn 基础组件 (Button, Dialog, DropdownMenu 等)
│   │   └── workflow/         # 流程编辑器通用组件 (NodeHandle, EdgeLabel 等)
│   ├── features/
│   │   └── editor/           # 流程编辑器功能模块
│   │       ├── components/   # 编辑器专用组件
│   │       ├── hooks/        # 编辑器业务 Hooks
│   │       └── utils/        # 编辑器工具函数
│   ├── stores/               # Zustand stores (workflowStore, uiStore)
│   ├── hooks/                # 通用自定义 Hooks
│   ├── services/             # API 服务层 (axios instance, api modules)
│   ├── types/                # TypeScript 类型定义
│   └── __tests__/            # 测试文件 (按模块组织)
```

## 3. 核心模块设计

### 3.1 流程编辑器 (Workflow Editor)

**职责**: 可视化流程编排界面

**组件层**:
- `WorkflowCanvas` - React Flow 画布容器
- `TriggerNode` - 触发器节点
- `ActionNode` - 动作节点
- `ConditionNode` - 条件节点
- `BranchEdge` - 分支连线

**状态层 (Zustand)**:
```typescript
// stores/workflowStore.ts
interface WorkflowStore {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  isDirty: boolean;
  // actions
  addNode: (node: Node) => void;
  updateNode: (id: string, data: Partial<Node>) => void;
  removeNode: (id: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
}
```

### 3.2 节点配置面板 (Node Panel)

**职责**: 节点属性配置

**组件层**:
- `NodePanel` - 右侧配置面板容器
- `TriggerConfig` - 触发器配置表单
- `ActionConfig` - 动作配置表单
- `ConditionConfig` - 条件配置表单

### 3.3 发布管理 (Deployment)

**职责**: 触发器发布与版本管理

**组件层**:
- `DeployButton` - 发布按钮
- `DeployDialog` - 发布确认弹窗
- `VersionHistory` - 版本历史列表

## 4. TDD 测试策略

### 4.1 测试金字塔

```
       /\
      /  \      E2E (Playwright)
     /----\     关键用户流程覆盖
    /      \
   /--------\   集成测试 (MSW)
  /          \  API Mock
 /------------\
/              \ 单元测试 (Vitest + RTL)
```

### 4.2 工具配置

| 工具 | 用途 | 配置 |
|------|------|------|
| Vitest | 测试运行器 | `vitest.config.ts` |
| React Testing Library | 组件测试 | jest-dom 匹配器 |
| MSW | API Mock | `src/mocks/handlers.ts` |
| Playwright | E2E 测试 | `playwright.config.ts` |

### 4.3 测试覆盖要求

| 指标 | 目标 | 说明 |
|------|------|------|
| 语句覆盖 | 80% | 所有可执行语句 |
| 分支覆盖 | 75% | 条件分支 |
| 函数覆盖 | 80% | 关键函数 |
| 行 | 80% | 最小要求 |

### 4.4 测试文件组织

```
src/
├── __tests__/
│   ├── components/          # 组件测试
│   │   └── workflow/
│   │       ├── WorkflowCanvas.test.tsx
│   │       └── NodePanel.test.tsx
│   ├── hooks/               # Hook 测试
│   │   └── useWorkflow.test.ts
│   ├── stores/              # Store 测试
│   │   └── workflowStore.test.ts
│   ├── services/            # API 测试 (MSW)
│   │   └── workflowApi.test.ts
│   └── e2e/                 # Playwright 测试
│       └── workflow-editor.spec.ts
└── mocks/
    ├── handlers.ts          # MSW 请求处理
    └── browser.ts           # MSW 浏览器配置
```

## 5. 相关技能 (Skills)

| Skill | 本地路径 | 用途 |
|-------|----------|------|
| frontend-patterns | 本地已有 | 前端最佳实践模式 |
| frontend-design | 本地已有 | UI/UX 设计规范 |

## 6. 团队角色

| 角色 | Agent | 职责 |
|------|-------|------|
| 前端开发 | frontend-developer | 实现功能模块、编写测试 |
| 前端审查 | frontend-reviewer | Code Review、样式规范检查 |

## 7. Milestones

### M1: 基础框架 (第 1-2 周)

**目标**: 搭建项目骨架、配置开发环境

**交付物**:
- [ ] Vite + React 18 项目初始化
- [ ] 目录结构创建
- [ ] TypeScript 类型定义 (Node, Edge, Workflow)
- [ ] Zustand store 基础结构
- [ ] Shadcn 组件库配置
- [ ] Vitest + RTL + MSW 测试配置
- [ ] React Router 路由配置

**验收标准**:
- 项目可正常运行 `npm run dev`
- 测试可执行 `npm run test`
- TypeScript 编译无错误

---

### M2: 节点面板 (第 2-3 周)

**目标**: 实现流程编辑器核心 UI

**交付物**:
- [ ] React Flow 画布集成
- [ ] 触发器节点 (TriggerNode) 实现
- [ ] 动作节点 (ActionNode) 实现
- [ ] 条件节点 (ConditionNode) 实现
- [ ] 节点拖拽添加
- [ ] 节点配置面板
- [ ] 基础节点测试覆盖 80%

**验收标准**:
- 可在画布上添加、删除、配置节点
- 节点状态正确保存到 store
- 测试覆盖率达标

---

### M3: 执行引擎 (第 3-4 周)

**目标**: 流程执行预览与调试

**交付物**:
- [ ] 工作流执行状态管理
- [ ] 节点执行状态可视化 (运行中/成功/失败)
- [ ] 执行日志面板
- [ ] 断点调试功能
- [ ] 节点间数据流转展示
- [ ] 执行引擎集成测试

**验收标准**:
- 可模拟执行完整流程
- 执行状态实时更新
- 支持单步调试

---

### M4: 触发器发布 (第 4-5 周)

**目标**: 实现触发器部署功能

**交付物**:
- [ ] 发布对话框组件
- [ ] 版本历史记录
- [ ] API 集成 (发布、取消发布)
- [ ] 发布状态反馈
- [ ] 错误处理与重试
- [ ] 发布流程 E2E 测试

**验收标准**:
- 成功发布触发器到后端
- 版本历史正确展示
- 错误场景正确处理

---

### M5: 验收优化 (第 5-6 周)

**目标**: 优化体验、修复问题、补充测试

**交付物**:
- [ ] UI 细节优化
- [ ] 性能优化 (大流程图渲染)
- [ ] 无障碍访问 (a11y)
- [ ] 补充缺失测试
- [ ] Playwright E2E 关键流程覆盖
- [ ] 文档完善

**验收标准**:
- Lighthouse 性能 > 80
- 关键用户流程 E2E 测试通过
- 测试覆盖率达标
- 无高优先级 bug

---

## 8. API 接口 (前端视角)

### 8.1 工作流管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workflows` | 获取工作流列表 |
| GET | `/api/workflows/:id` | 获取工作流详情 |
| POST | `/api/workflows` | 创建工作流 |
| PUT | `/api/workflows/:id` | 更新工作流 |
| DELETE | `/api/workflows/:id` | 删除工作流 |

### 8.2 触发器管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/triggers/:workflowId/deploy` | 发布触发器 |
| POST | `/api/triggers/:workflowId/undeploy` | 下线触发器 |
| GET | `/api/triggers/:workflowId/versions` | 获取版本历史 |

## 9. 关键类型定义

```typescript
// types/workflow.ts
interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: 'draft' | 'published' | 'disabled';
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  position: { x: number; y: number };
  data: TriggerData | ActionData | ConditionData;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string;
  targetHandle?: string;
}
```

## 10. 开发规范

### 10.1 组件规范

- 函数组件 + TypeScript
- Props 使用 interface 定义
- 业务逻辑提取到 custom hooks
- 组件文件不超过 400 行

### 10.2 状态管理规范

- 组件级状态: useState + useReducer
- 跨组件状态: Zustand store
- 服务端状态: React Query

### 10.3 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `WorkflowCanvas` |
| Hooks | camelCase + use 前缀 | `useWorkflow` |
| Store | camelCase + Store 后缀 | `workflowStore` |
| 类型 | PascalCase + 类型后缀 | `WorkflowNode` |
| 测试 | 与被测文件同名 | `WorkflowCanvas.test.tsx` |
