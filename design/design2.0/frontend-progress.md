# Frontend M1 Progress

**Created**: 2026-03-29
**Status**: COMPLETED

---

## M1: 基础框架 (第 1-2 周)

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

### TDD 进度

| 文件 | 测试状态 | 实现状态 |
|------|----------|----------|
| types/workflow.ts | [x] | [x] |
| stores/workflowStore.ts | [x] | [x] |
| stores/uiStore.ts | [x] | [x] |
| components/ui/Button.tsx | [x] | [x] |
| components/ui/Dialog.tsx | [x] | [x] |
| components/ui/DropdownMenu.tsx | [x] | [x] |
| components/workflow/WorkflowCanvas.tsx | [x] | [x] |
| hooks/useWorkflow.ts | [x] | [x] |
| services/api.ts | [x] | [x] |

### 项目结构

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
│   │   └── index.ts
│   ├── routes/                    # 路由配置
│   │   └── index.tsx
│   ├── mocks/                     # MSW mocks
│   │   ├── handlers.ts
│   │   ├── browser.ts
│   │   └── index.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── setupTests.ts
│   └── vite-env.d.ts
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
└── .eslintrc.cjs
```

---

## M2-M5

(M2-M5 待 M1 完成后启动)

---
