---
name: taskflow-dev-workflow
description: TaskFlow full-stack development workflow with parallel backend/frontend development, TDD, and E2E testing
triggers:
  - when starting a new feature development
  - when creating a pull request
  - when running integration tests
  - when setting up the development environment
sources:
  - project analysis (taskflow)
  - user's workflow requirements
confidence: 85
---

# TaskFlow 开发流程 Skill

## 触发条件

当用户开始新功能开发、创建 PR、运行集成测试或设置开发环境时激活。

## 技术栈

- **后端**: Spring Boot 3.2.4 + Java 17 + JPA + PostgreSQL
- **前端**: React + Vite + TypeScript + React Flow + Zustand + Playwright

---

## 阶段一：环境验证与功能设计

### 1.1 服务可用性检查

```bash
# 检查 Docker 服务
docker ps | grep -E "postgres|redis"

# 检查后端 (端口 8080)
curl -s http://localhost:8080/api/workflows -H "X-Tenant-ID: 1"

# 检查前端 (端口 5173)
curl -s http://localhost:5173 | head -5

# 检查 PostgreSQL
docker exec -it taskflow-postgres psql -U taskflow -d taskflow -c "SELECT 1"
```

### 1.2 启动服务（如需）

```bash
# 后端
cd backend && mvn spring-boot:run > /tmp/backend.log 2>&1 &

# 前端
cd frontend && npm run dev > /tmp/frontend.log 2>&1 &
```

### 1.3 功能设计与任务分解

**使用 Agent：**

| Agent | 用途 |
|-------|------|
| `planner` | 分解功能为前后端任务 |
| `architect` | 评估技术方案和依赖 |

**输出：**
- 功能列表（后端 API + 前端组件）
- 任务优先级排序
- 本次迭代范围（至少实现一个大功能）

---

## 阶段二：并行开发

### 2.1 后端开发流程

**使用 Agent：**

| Agent | Skill | 用途 |
|-------|-------|------|
| `tdd-guide` | `springboot-tdd` | TDD 流程指导 |
| `go-reviewer` | - | 代码审查 |

**TDD 流程：**

```
1. 功能分析 & 测试计划 (tdd-guide)
   └─ 分析 API 接口需求 → 输出 API 设计文档 + 测试用例清单

2. 编写单元测试 (RED)
   └─ 编写失败的单元测试 → 验证测试正确性

3. 实现功能代码 (GREEN)
   └─ 编写最小实现使测试通过

4. 重构 (IMPROVE)
   └─ go-reviewer 审查代码 → 清理重复代码 → 更新文档

5. 验证测试覆盖率 ≥ 80%
   └─ mvn test -Djacoco
```

**后端产出：**
- `docs/backend/API_DESIGN.md` - API 接口规范
- `docs/backend/TEST_CASES.md` - 测试用例清单
- `docs/backend/COVERAGE.md` - 覆盖率报告

### 2.2 前端开发流程

**使用 Agent：**

| Agent | Skill | 用途 |
|-------|-------|------|
| `frontend-design` | `frontend-patterns` | 前端开发指导 |
| `e2e-runner` | `e2e` | E2E 测试 |

**流程：**

```
1. 功能分析 & 测试计划
   └─ 分析组件需求 → 输出组件设计文档 + 测试用例清单

2. 编写组件测试 (RED)
   └─ 编写失败的 Vitest 单元测试

3. 实现组件代码 (GREEN)
   └─ 使用 frontend-patterns → 遵循组件设计规范

4. 重构 & 代码审查
   └─ 清理重复代码 → 确保组件可复用

5. 验证测试覆盖率 ≥ 80%
   └─ npm run test:coverage
```

**前端产出：**
- `docs/frontend/COMPONENT_DESIGN.md` - 组件设计
- `docs/frontend/TEST_CASES.md` - 测试用例清单

---

## 阶段三：联调与 E2E 测试

### 3.1 TDD 联调流程

**前后端同时进行：**

```bash
# 1. 后端启动
cd backend && mvn spring-boot:run

# 2. 前端启动
cd frontend && npm run dev
```

**使用 Agent：**

| Agent | 用途 |
|-------|------|
| `tdd-guide` | 指导 API 集成测试 |
| `e2e-runner` | 执行 Playwright E2E 测试 |

**联调步骤：**

```
1. 编写集成测试
   ├─ 后端: MockMvc 测试 API
   └─ 前端: MSW 模拟 API 响应

2. 真实 API 联调
   ├─ 后端 Controller 测试
   └─ 前端 API Service 测试

3. 问题修复
   ├─ build-error-resolver 修复构建错误
   └─ tdd-guide 修复测试问题
```

### 3.2 E2E 浏览器测试

**使用 Agent：`e2e-runner`**

```bash
# 运行 Playwright E2E
cd frontend && npx playwright test

# 生成测试报告
npx playwright show-report
```

**E2E 测试用例示例：**

| 用例文件 | 描述 |
|---------|------|
| `workflow-create.spec.ts` | 创建工作流 |
| `workflow-edit.spec.ts` | 编辑工作流 |
| `workflow-execute.spec.ts` | 执行工作流 |
| `workflow-delete.spec.ts` | 删除工作流 |

### 3.3 测试报告产出

**产出：**
- `docs/TEST_REPORT.md` - 完整测试报告
- `docs/E2E_REPORT.md` - E2E 测试报告
- `frontend/playwright-report/index.html` - Playwright 报告

---

## 阶段四：文档产出

### 使用 Agent

| Agent | Skill | 用途 |
|-------|-------|------|
| `doc-updater` | `documentation` | 生成项目文档 |

### 文档清单

```
docs/
├── backend/
│   ├── API_DESIGN.md          # API 设计
│   ├── TEST_CASES.md          # 单元测试用例
│   └── COVERAGE.md            # 覆盖率报告
├── frontend/
│   ├── COMPONENT_DESIGN.md    # 组件设计
│   └── TEST_CASES.md          # 组件测试用例
├── INTEGRATION.md              # 集成测试报告
├── E2E_REPORT.md              # E2E 测试报告
└── TEST_REPORT.md             # 综合测试报告
```

---

## Agent 与 Skill 速查表

### 阶段一：环境 & 设计

| 任务 | Agent | Skill |
|------|-------|-------|
| 功能分解 | `planner` | - |
| 技术方案 | `architect` | - |

### 阶段二：后端

| 任务 | Agent | Skill |
|------|-------|-------|
| TDD 指导 | `tdd-guide` | `springboot-tdd` |
| 代码审查 | `go-reviewer` | - |
| 构建修复 | `build-error-resolver` | - |

### 阶段二：前端

| 任务 | Agent | Skill |
|------|-------|-------|
| 组件开发 | `frontend-design` | `frontend-patterns` |
| E2E 测试 | `e2e-runner` | `e2e` |

### 阶段三：联调

| 任务 | Agent | Skill |
|------|-------|-------|
| 集成测试 | `tdd-guide` | `springboot-tdd` |
| 问题修复 | `build-error-resolver` | - |
| E2E 测试 | `e2e-runner` | `e2e` |

### 阶段四：文档

| 任务 | Agent | Skill |
|------|-------|-------|
| 文档生成 | `doc-updater` | `documentation` |

---

## 测试覆盖率要求

| 类型 | 最低覆盖率 |
|------|----------|
| 后端单元测试 | 80% |
| 前端组件测试 | 80% |
| E2E 测试 | 关键路径覆盖 |

## 快速命令

```bash
# 环境检查
./devops/check-services.sh

# 后端测试
cd backend && mvn test

# 前端单元测试
cd frontend && npm run test:coverage

# E2E 测试
cd frontend && npx playwright test

# 完整测试流程
./devops/run-all-tests.sh
```

---

## 阶段五：代码提交与推送

### 5.1 创建新分支

```bash
# 从 main 分支创建新功能分支
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# 或使用 GitHub CLI
gh pr create --base main --head feature/your-feature-name
```

### 5.2 提交代码

```bash
# 查看变更状态
git status

# 添加变更文件
git add <files>

# 提交（遵循 conventional commits 格式）
git commit -m "feat: add feature description"

# 推送到远程
git push -u origin feature/your-feature-name
```

### 5.3 创建 Pull Request

```bash
# 使用 GitHub CLI 创建 PR
gh pr create \
  --title "feat: feature title" \
  --body "$(cat <<'EOF'
## Summary
- 功能描述

## Test Plan
- [ ] 后端单元测试通过
- [ ] 前端组件测试通过
- [ ] E2E 测试通过

## Screenshots (if applicable)
EOF
)"
```

### 使用 Agent

| Agent | 用途 |
|-------|------|
| `code-reviewer` | PR 代码审查 |

### 分支命名规范

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 功能 | `feature/<name>` | `feature/workflow-execution` |
| 修复 | `fix/<name>` | `fix/workflow-run-bug` |
| 重构 | `refactor/<name>` | `refactor/executor-service` |
| 文档 | `docs/<name>` | `docs/api-design` |

---

## 相关文件

- `DEVELOPMENT.md` - 完整开发流程文档
- `STARTUP.md` - 服务启动文档
- `docs/TEST_REPORT.md` - 测试报告模板
