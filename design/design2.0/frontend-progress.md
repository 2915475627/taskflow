# Frontend M1-M2 Progress

**Created**: 2026-03-29
**Status**: M1 COMPLETED, M2 IN PROGRESS

---

## M1: 基础框架 (第 1-2 周) - COMPLETED

**目标**: 搭建项目骨架、配置开发环境

**完成日期**: 2026-03-29

### 交付物

| 交付项 | 状态 | 说明 |
|--------|------|------|
| Vite + React 18 项目初始化 | [x] | 完整项目配置 (package.json, vite.config.ts, tsconfig) |
| 目录结构创建 | [x] | components/ui, features/editor, stores, hooks, services, types, __tests__ |
| TypeScript 类型定义 | [x] | Node, Edge, Workflow 类型 (types/workflow.ts) |
| Zustand store 基础结构 | [x] | workflowStore, uiStore (stores/) |
| Shadcn 组件库配置 | [x] | Button, Dialog, DropdownMenu 组件 |
| Vitest + RTL + MSW 测试配置 | [x] | 测试环境配置 (setupTests.ts, vite.config.ts) |
| React Router 路由配置 | [x] | 路由定义 (routes/index.tsx) |

---

## M2: 节点面板 (第 2-3 周) - IN PROGRESS

**目标**: 实现流程编辑器核心 UI

**开始日期**: 2026-03-29

### 迭代 1 交付物

| 交付项 | 状态 | 说明 |
|--------|------|------|
| WorkflowListPage CRUD Modal | [x] | 使用 Radix Dialog 重构 |
| Create Workflow Modal | [x] | 使用 React Query mutation |
| Delete Confirmation Modal | [x] | 使用 React Query mutation |
| NodePanel 组件 | [x] | 节点配置面板基础实现 |
| TriggerConfig | [x] | 触发器配置表单 |
| ActionConfig | [x] | 动作配置表单 |
| ConditionConfig | [x] | 条件配置表单 |
| 单元测试 | [x] | 89 tests passing |
| E2E 测试 | [x] | 15 tests passing |

### 新增/修改文件

#### 组件
- `src/components/workflow/NodePanel.tsx` - 新增节点配置面板
- `src/components/workflow/index.ts` - 导出 NodePanel

#### 页面
- `src/pages/WorkflowListPage.tsx` - 重构使用 Radix Dialog
- `src/pages/WorkflowEditorPage.tsx` - 集成 NodePanel

#### 测试
- `src/components/workflow/__tests__/NodePanel.test.tsx` - 新增 11 tests
- `src/pages/__tests__/WorkflowListPage.test.tsx` - 新增 10 tests
- `src/pages/__tests__/WorkflowEditorPage.test.tsx` - 新增 5 tests

### 测试结果

```
Unit Tests: 89 passed
E2E Tests: 15 passed
```

### E2E 测试覆盖

- Workflow List Page: 4 tests
  - Load page with heading
  - Display workflows after loading
  - Create new workflow button
  - Navigate to editor on create

- Workflow Editor Page: 7 tests
  - Load editor page
  - Header with buttons
  - Edit workflow mode
  - Navigate back to list
  - Display canvas, controls, minimap

- Navigation: 4 tests
  - Home to editor navigation
  - Editor to home navigation
  - Specific workflow editor
  - URL state preservation

### 待完成

- [ ] 触发器节点 (TriggerNode) 实现
- [ ] 动作节点 (ActionNode) 实现
- [ ] 条件节点 (ConditionNode) 实现
- [ ] 节点拖拽添加
- [ ] 节点间连线

---

## 项目结构

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                    # Shadcn 组件 (Button, Dialog, DropdownMenu)
│   │   │   ├── __tests__/
│   │   │   ├── Button.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── DropdownMenu.tsx
│   │   │   └── index.ts
│   │   └── workflow/              # 流程编辑器组件
│   │       ├── WorkflowCanvas.tsx
│   │       ├── NodePanel.tsx     # 新增
│   │       └── index.ts
│   ├── features/
│   │   └── editor/                # 编辑器功能模块
│   ├── stores/                    # Zustand stores
│   │   ├── __tests__/
│   │   ├── workflowStore.ts
│   │   ├── uiStore.ts
│   │   └── index.ts
│   ├── hooks/                     # 自定义 hooks
│   │   ├── __tests__/
│   │   ├── useWorkflow.ts
│   │   └── index.ts
│   ├── services/                  # API 服务层
│   │   ├── __tests__/
│   │   ├── api.ts
│   │   └── index.ts
│   ├── types/                     # TypeScript 类型
│   │   ├── workflow.ts
│   │   └── index.ts
│   ├── pages/                     # 页面组件
│   │   ├── WorkflowEditorPage.tsx
│   │   ├── WorkflowListPage.tsx
│   │   └── __tests__/            # 新增测试
│   │       ├── WorkflowListPage.test.tsx
│   │       └── WorkflowEditorPage.test.tsx
│   ├── routes/                    # 路由配置
│   │   └── index.tsx
│   ├── mocks/                     # MSW mocks
│   ├── lib/
│   │   └── utils.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── setupTests.ts
├── e2e/                           # Playwright E2E 测试
│   ├── workflow-list.spec.ts
│   ├── workflow-editor.spec.ts
│   └── navigation.spec.ts
└── playwright.config.ts
```

---

## M3-M5

(M3-M5 待 M2 完成后启动)

---
