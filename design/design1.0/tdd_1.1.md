# TDD 测试架构设计 v1.1

## 概述

本文档从测试驱动开发（TDD）角度分析工作流引擎项目设计，聚焦于测试策略、测试分层、测试覆盖率目标、测试基础设施和Mock策略。

---

## 1. 现有架构分析

### 1.1 架构组件与测试挑战

根据 architect_0.3 和 plan_0.3 的设计，系统包含以下核心组件：

| 组件 | 技术栈 | 测试挑战 |
|------|--------|----------|
| 前端编辑器 | React Flow + Zustand | Canvas渲染状态管理、复杂交互 |
| 后端API | Spring Boot + REST | 多端点、长事务、权限控制 |
| 执行引擎 | 异步队列 + 状态机 | 并发执行、状态转换、容错恢复 |
| 节点系统 | 内置节点 + 插件 | 动态加载、类型扩展、执行隔离 |
| 数据层 | PostgreSQL + Redis | 多租户隔离、缓存一致性 |

### 1.2 测试目标分层

```
┌─────────────────────────────────────────────────────┐
│                   E2E 测试层                         │
│         (Playwright - 关键用户旅程)                 │
├─────────────────────────────────────────────────────┤
│                  集成测试层                          │
│      (Spring Boot Test - API + 执行引擎)            │
├─────────────────────────────────────────────────────┤
│                   单元测试层                         │
│        (Jest/Vitest + JUnit - 核心逻辑)             │
└─────────────────────────────────────────────────────┘
```

---

## 2. 测试策略设计

### 2.1 单元测试策略

**前端单元测试**

| 模块 | 测试重点 | 测试框架 |
|------|----------|----------|
| GraphManager | 布局算法、节点对齐、循环检测 | Vitest |
| NodeManager | 节点CRUD操作、配置验证 | Vitest |
| ValidationEngine | 流程结构校验、变量解析 | Vitest |
| Zustand Store | 状态转换、历史记录 | Vitest + @testing-library/react |
| 节点配置面板 | 表单生成、动态渲染 | Vitest + @testing-library/react |

**后端单元测试**

| 模块 | 测试重点 | 测试框架 |
|------|----------|----------|
| 工作流服务 | CRUD、版本管理、发布逻辑 | JUnit 5 + Mockito |
| 执行引擎 | 状态机转换、队列调度 | JUnit 5 + Mockito |
| 节点执行器 | HTTP/LLM/代码节点执行 | JUnit 5 |
| 权限服务 | RBAC/ABAC 决策逻辑 | JUnit 5 |
| Webhook | 签名验证、限流逻辑 | JUnit 5 |

### 2.2 集成测试策略

**API 集成测试**

```java
@SpringBootTest
@AutoConfigureMockMvc
class WorkflowApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void createWorkflow_shouldReturn201() throws Exception {
        mockMvc.perform(post("/api/v1/workflows")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(workflowJson))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void executeWorkflow_shouldReturnExecutionId() throws Exception {
        // 执行流程并验证异步执行返回
    }
}
```

**执行引擎集成测试**

```java
@SpringBootTest
class ExecutionEngineIntegrationTest {

    @Autowired
    private ExecutionService executionService;

    @Test
    void executeSimpleFlow_shouldComplete() {
        // 测试完整执行链路
    }

    @Test
    void executeWithHttpNode_shouldCallExternal() {
        // 测试HTTP节点调用
    }

    @Test
    void executeWithConditionalBranch_shouldRouteCorrectly() {
        // 测试条件分支
    }
}
```

### 2.3 E2E 测试策略

**关键用户旅程（Playwright）**

| 场景 | 测试用例 |
|------|----------|
| 创建流程 | 空白画布 → 添加节点 → 连接 → 保存 |
| 执行流程 | 配置节点 → 点击运行 → 验证执行结果 |
| 调试模式 | 设置断点 → 单步执行 → 查看变量 |
| 模板使用 | 选择模板 → 自定义 → 发布 |

```typescript
// e2e/workflow-editor.spec.ts
import { test, expect } from '@playwright/test';

test('create and execute workflow', async ({ page }) => {
  await page.goto('/editor/new');

  // 拖拽 START 节点
  const startNode = page.locator('[data-node-type="start"]');
  await startNode.dragTo(page.locator('.canvas'));

  // 拖拽 HTTP 节点并连接
  // ...

  // 配置 HTTP 节点
  await page.fill('[data-testid="http-url"]', 'https://api.example.com/data');

  // 运行流程
  await page.click('[data-testid="run-button"]');

  // 验证执行结果
  await expect(page.locator('[data-testid="execution-status"]')).toHaveText('completed');
});
```

---

## 3. 测试覆盖率目标

### 3.1 覆盖率指标

| 维度 | 目标 | 说明 |
|------|------|------|
| 语句覆盖率 | ≥ 80% | 核心业务逻辑 |
| 分支覆盖率 | ≥ 75% | 条件分支完整覆盖 |
| 函数覆盖率 | ≥ 85% | 公共接口不遗漏 |
| 行覆盖率 | ≥ 80% | 整体代码质量 |

### 3.2 分层覆盖率要求

```
┌─────────────────────────────────────────────────────┐
│ E2E 测试: 关键路径 100% 覆盖                        │
│   - 创建流程并执行成功                              │
│   - 调试模式单步执行                                │
│   - 条件分支执行                                   │
├─────────────────────────────────────────────────────┤
│ 集成测试: API 端点 100% 覆盖                        │
│   - 所有 REST 端点                                 │
│   - 错误码覆盖                                     │
│   - 权限校验路径                                   │
├─────────────────────────────────────────────────────┤
│ 单元测试: 核心模块 80%+ 覆盖                        │
│   - 执行引擎状态机 90%                             │
│   - 节点执行器 85%                                 │
│   - 权限决策逻辑 90%                               │
│   - 验证引擎 85%                                  │
└─────────────────────────────────────────────────────┘
```

### 3.3 关键模块覆盖率

| 模块 | 最低覆盖率 | 优先级 |
|------|------------|--------|
| ExecutionEngine (状态机) | 90% | P0 |
| NodeExecutor (节点执行) | 85% | P0 |
| PermissionService (权限) | 90% | P0 |
| ValidationEngine (验证) | 85% | P1 |
| WorkflowService (工作流) | 80% | P1 |
| GraphManager (编辑器) | 80% | P1 |

---

## 4. 测试基础设施

### 4.1 测试目录结构

```
├── backend/
│   └── src/
│       ├── test/
│       │   ├── java/
│       │   │   └── com/taskflow/
│       │   │       ├── unit/           # 单元测试
│       │   │       │   ├── engine/
│       │   │       │   ├── service/
│       │   │       │   └── security/
│       │   │       ├── integration/    # 集成测试
│       │   │       │   ├── api/
│       │   │       │   └── engine/
│       │   │       └── e2e/           # E2E 测试
│       │   └── resources/
│       │       ├── fixtures/          # 测试数据
│       │       └── application-test.yml
├── frontend/
│   └── src/
│       ├── __tests__/
│       │   ├── unit/                 # 单元测试
│       │   │   ├── components/
│       │   │   ├── hooks/
│       │   │   └── utils/
│       │   ├── integration/          # 集成测试
│       │   │   └── editor/
│       │   └── e2e/                  # E2E 测试
│       └── test-utils/
│           ├── mocks/
│           └── fixtures/
```

### 4.2 测试数据管理

**Fixture 策略**

```typescript
// frontend/test-utils/fixtures/workflow.ts
export const createWorkflowFixture = (overrides = {}): Workflow => ({
  id: 'wf-001',
  name: 'Test Workflow',
  nodes: [
    { id: 'start-1', type: 'start', position: { x: 0, y: 0 } },
    { id: 'http-1', type: 'http', config: { url: 'https://example.com' } }
  ],
  edges: [
    { id: 'e1', source: 'start-1', target: 'http-1' }
  ],
  ...overrides
});

export const createHttpNodeConfig = (): HttpNodeConfig => ({
  method: 'GET',
  url: 'https://api.example.com/data',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
});
```

```java
// backend/src/test/resources/fixtures/test-workflow.json
{
  "id": "wf-test-001",
  "name": "Test Workflow",
  "nodes": [
    {
      "id": "start-1",
      "type": "start"
    },
    {
      "id": "http-1",
      "type": "http",
      "config": {
        "method": "GET",
        "url": "https://example.com/api"
      }
    }
  ]
}
```

### 4.3 测试数据库配置

```yaml
# application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: false
  redis:
    host: localhost
    port: 6379

# 测试环境隔离配置
test:
  tenant:
    id: 999
  user:
    id: 100
    role: admin
```

### 4.4 测试运行脚本

```bash
#!/bin/bash
# scripts/run-tests.sh

# 单元测试
npm run test:unit

# 带覆盖率
npm run test:coverage

# 集成测试
mvn verify -Dspring.profiles.active=test

# E2E 测试
npm run test:e2e

# 全部测试 + 覆盖率报告
npm run test:all
```

---

## 5. Mock 策略

### 5.1 前端 Mock 策略

| 依赖 | Mock 方案 | 工具 |
|------|------------|------|
| REST API | MSW (Mock Service Worker) | msw |
| WebSocket | 模拟事件 | Vitest |
| 第三方 SDK | Jest Mock | Jest |

**MSW 配置示例**

```typescript
// frontend/test-utils/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';

export const workflowHandlers = [
  http.post('/api/v1/workflows', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: { id: 'wf-new-001', ...body }
    }, { status: 201 });
  }),

  http.get('/api/v1/workflows/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: createWorkflowFixture({ id: params.id })
    });
  })
];

export const worker = setupWorker(...workflowHandlers);
```

### 5.2 后端 Mock 策略

| 依赖 | Mock 方案 | 工具 |
|------|------------|------|
| 数据库 | H2 内存数据库 | Spring Boot Test |
| Redis | Embedded Redis | embedded-redis |
| Kafka | Testcontainers | testcontainers |
| 外部 API | WireMock | wireMock-junit5 |
| LLM API | Mock Server | Mockito |

**WireMock 配置示例**

```java
@WireMockTest
class HttpNodeExecutorTest {

    @Test
    void executeHttpNode_shouldCallExternalApi() {
        // 模拟外部 API
        stubFor(get(urlEqualTo("/api/data"))
            .willReturn(aResponse()
                .withStatus(200)
                .withBody("{\"result\": \"success\"}")));

        // 执行节点
        HttpNodeConfig config = new HttpNodeConfig();
        config.setMethod("GET");
        config.setUrl("https://external-api.com/api/data");

        NodeOutput output = httpNodeExecutor.execute(config, new NodeContext());

        // 验证结果
        assertEquals(200, output.getStatus());
        assertNotNull(output.getData());
    }
}
```

### 5.3 Mock 数据工厂

```typescript
// frontend/test-utils/factories/index.ts
export const workflowFactory = {
  create: (overrides?: Partial<Workflow>): Workflow => ({
    ...createBaseWorkflow(),
    ...overrides
  }),

  createList: (count: number): Workflow[] =>
    Array.from({ length: count }, (_, i) =>
      workflowFactory.create({ id: `wf-${i}` })
    ),

  withNodes: (nodeCount: number): Workflow => {
    const nodes = generateNodes(nodeCount);
    return workflowFactory.create({ nodes });
  }
};
```

```java
// backend test fixtures
@Component
public class WorkflowTestDataFactory {

    public Workflow createWorkflow(int nodeCount) {
        Workflow workflow = new Workflow();
        workflow.setId(UUID.randomUUID().toString());
        workflow.setNodes(generateNodes(nodeCount));
        workflow.setEdges(generateEdges(nodeCount));
        return workflow;
    }

    public ExecutionContext createExecutionContext() {
        return ExecutionContext.builder()
            .workflowId("wf-test")
            .variables(new HashMap<>())
            .nodeOutputs(new HashMap<>())
            .build();
    }
}
```

---

## 6. 测试隔离策略

### 6.1 前端测试隔离

| 隔离维度 | 策略 |
|----------|------|
| 状态隔离 | 每个测试使用 fresh store |
| 网络隔离 | MSW 拦截所有请求 |
| 定时器 | Jest.useFakeTimers |
| 本地存储 | jest.spyOn(localStorage) |

```typescript
beforeEach(() => {
  // 重置 store
  useEditorStore.getState().reset();

  // 清空 MSW handlers
  server.resetHandlers();

  // 重置定时器
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});
```

### 6.2 后端测试隔离

| 隔离维度 | 策略 |
|----------|------|
| 数据库 | @Transactional 自动回滚 |
| 缓存 | TestRedisTemplate 清理 |
| 消息队列 | @KafkaTopics 独立命名空间 |
| 租户 | X-Tenant-Id header 隔离 |

```java
@SpringBootTest
@Transactional  // 自动回滚
class WorkflowServiceTest {

    @Autowired
    private WorkflowRepository repository;

    @Test
    void createWorkflow_shouldBeIsolated() {
        // 测试创建的 workflow 不会影响其他测试
        workflowService.create(newWorkflow);
        assertEquals(1, repository.count());
    }
}
```

---

## 7. CI/CD 测试流程

### 7.1 流水线设计

```
┌──────────────────────────────────────────────────────────────┐
│                      CI Pipeline                              │
├──────────────────────────────────────────────────────────────┤
│  1. 单元测试                                                  │
│     - 前端: npm run test:unit                               │
│     - 后端: mvn test                                        │
│     覆盖率门槛: ≥ 80%                                        │
├──────────────────────────────────────────────────────────────┤
│  2. 集成测试                                                  │
│     - 前端: npm run test:integration                         │
│     - 后端: mvn verify                                       │
│     覆盖 API 100%                                            │
├──────────────────────────────────────────────────────────────┤
│  3. E2E 测试                                                  │
│     - npm run test:e2e -- --headed=false                     │
│     - 关键路径覆盖率: 100%                                   │
├──────────────────────────────────────────────────────────────┤
│  4. 安全扫描                                                  │
│     - SonarQube 代码质量                                      │
│     - Snyk 依赖漏洞扫描                                       │
│     - Secret scanning                                       │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 测试报告

| 报告类型 | 工具 | 输出 |
|----------|------|------|
| 单元测试覆盖率 | Jest + JUnit | HTML + JSON |
| 集成测试结果 | Surefire | XML |
| E2E 测试报告 | Playwright | HTML |
| 代码质量 | SonarQube | Dashboard |

### 7.3 测试失败策略

```yaml
# .github/workflows/test.yml
on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout

      - name: Run Unit Tests
        run: npm run test:unit -- --coverage

      - name: Check Coverage
        run: |
          npx jest-coverage-threshold \
            --config jest.config.js \
            --strict \
            --branch 75 \
            --function 85 \
            --line 80 \
            --statement 80

      - name: Run Integration Tests
        run: mvn verify

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: true
```

---

## 8. 测试质量标准

### 8.1 测试命名规范

```typescript
// 前端测试命名
describe('WorkflowService', () => {
  describe('createWorkflow', () => {
    it('should create workflow with valid data', () => {});
    it('should throw error when name is empty', () => {});
    it('should throw error when nodes are invalid', () => {});
  });
});

// 后端测试命名
class WorkflowServiceTest {

    @Test
    void createWorkflow_WithValidData_ShouldReturnCreatedWorkflow() {
    }

    @Test
    void createWorkflow_WithEmptyName_ShouldThrowValidationException() {
    }
}
```

### 8.2 测试代码规范

| 规范 | 要求 |
|------|------|
| 测试独立性 | 每个测试不依赖其他测试 |
| AAA 模式 | Arrange-Act-Assert 结构 |
| 单个断言 | 每个 it/test 聚焦一个行为 |
| 描述性命名 | 测试名描述验证的行为 |
| Mock 清理 | afterEach 清理 mock 调用 |

### 8.3 测试审查清单

- [ ] 每个公共方法有对应单元测试
- [ ] 所有 API 端点有集成测试
- [ ] 关键用户旅程有 E2E 测试
- [ ] 边界条件已覆盖（null, empty, invalid）
- [ ] 错误路径已测试
- [ ] Mock 使用正确（不过度 mock）
- [ ] 测试覆盖率达标
- [ ] 测试名称清晰描述行为

---

## 9. 风险与缓解

### 9.1 测试风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 执行引擎状态机复杂 | 覆盖率难以达标 | 优先TDD开发核心状态机 |
| 外部 API 依赖 | 集成测试不稳定 | WireMock 完全模拟 |
| 前端 Canvas 渲染 | 单元测试困难 | 分离逻辑与渲染测试 |
| 多租户隔离 | 测试数据污染 | 租户 ID 前缀隔离 |
| 异步执行 | 测试时序问题 | 使用 Testcontainers |

### 9.2 性能测试计划

| 测试项 | 工具 | 目标 |
|--------|------|------|
| API 响应时间 | JMeter | P99 < 200ms |
| 执行引擎吞吐量 | JMeter | 100+ 并发 |
| 前端渲染性能 | Lighthouse | FPS > 30 |
| 数据库查询性能 | SQL Analyzer | < 50ms |

---

## 10. 下一步行动

### 10.1 第一轮测试基础设施

- [ ] 配置 Jest + Vitest 测试框架
- [ ] 配置 JUnit 5 + Spring Boot Test
- [ ] 设置 MSW handlers
- [ ] 创建测试数据工厂
- [ ] 配置 H2 测试数据库

### 10.2 核心模块测试开发

- [ ] ExecutionEngine 状态机测试（90% 覆盖率目标）
- [ ] NodeExecutor 测试
- [ ] PermissionService 测试
- [ ] GraphManager 布局算法测试

### 10.3 E2E 测试开发

- [ ] Playwright 配置
- [ ] 关键路径测试用例
- [ ] CI 集成

---

## 附录 A: 测试工具选型

| 类型 | 工具 | 版本 |
|------|------|------|
| 前端测试运行器 | Vitest | 1.x |
| 前端单元测试 | Jest | 29.x |
| 前端组件测试 | @testing-library/react | 14.x |
| 前端 E2E 测试 | Playwright | 1.x |
| 后端测试 | JUnit 5 | 5.x |
| 后端 Mock | Mockito | 5.x |
| API 测试 | MockMvc | Spring |
| 外部 API 模拟 | WireMock | 3.x |
| 数据库模拟 | H2 Database | 2.x |
| 覆盖率报告 | Jest Coverage | - |
| 覆盖率报告 | JaCoCo | 0.8.x |

---

**文档版本**: 1.1
**创建日期**: 2026-03-29
**作者**: TDD Architecture Design
