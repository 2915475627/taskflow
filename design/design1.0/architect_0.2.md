# 工作流引擎架构设计 v0.2（第二轮讨论）

## 1. 需求到架构的映射分析

### 1.1 功能需求 → 架构支撑点

| 需求 | 架构支撑点 | 技术决策 |
|------|------------|----------|
| 可视化流程编排 | 前端流程图渲染 + 后端定义存储 | React Flow + JSONB 存储 DAG |
| 节点类型系统 | 节点注册机制 + 执行框架 | SPI 插件化 + 统一执行接口 |
| 执行引擎 | 异步执行器 + 状态持久化 | Vert.x 协程 + Redis 状态机 |
| 触发器系统 | 事件驱动 + 定时任务 | Kafka 事件总线 + XXL-JOB |
| 版本管理 | 版本存储 + 差异对比 | 快照存储 + JSON Patch |

### 1.2 非功能需求 → 架构考量

| 需求 | 架构策略 |
|------|----------|
| 可扩展性 | 节点 SPI 插件机制，预留扩展点 |
| 可观测性 | 统一日志规范 + 链路追踪 (OpenTelemetry) |
| 高可用 | 无状态服务 + Redis 分布式锁 |
| 性能 | 流程定义缓存 + 异步执行不阻塞 |

---

## 2. 第一轮4个问题的深度分析

### 2.1 执行模式选择

**背景**：第一轮倾向异步队列 + 状态机方案。

#### 方案对比

| 维度 | 同步执行 (方案A) | 异步队列 + 状态机 (方案B) |
|------|------------------|---------------------------|
| 实现复杂度 | 低 | 高 |
| 支持暂停/恢复 | 否 | 是 |
| 资源占用 | 高（线程阻塞） | 低（协程 + 消息队列） |
| 故障恢复 | 需重跑整个流程 | 从断点续传 |
| 适合场景 | 短流程 (<30s) | 长流程、复杂流程 |

#### 推荐方案：B（异步队列 + 状态机）

**执行流程设计**：
```
1. API 接收到执行请求
2. 生成 execution_id，写入 workflow_runs (PENDING)
3. 发送执行任务到 Redis Stream / Kafka
4. Worker 消费任务，状态变更为 RUNNING
5. 按 DAG 拓扑序执行各节点
6. 节点执行结果写入 node_runs + 更新上下文
7. 流程结束，更新 workflow_runs (SUCCESS/FAILED)
```

**状态持久化策略**：
```java
// 流程执行上下文（Redis 存储，TTL 24h）
class ExecutionContext {
    String executionId;
    String workflowId;
    Map<String, Object> variables;      // 流程变量
    Map<String, Object> nodeOutputs;    // 节点输出缓存
    String currentNodeId;               // 当前执行节点
    List<String> completedNodes;       // 已完成节点列表
    int retryCount;                     // 重试次数
}

// 持久化存储（PostgreSQL）
// workflow_runs: 流程执行记录（最终状态）
// node_runs: 节点执行记录（历史）
// execution_context: Redis（运行时状态）
```

**决策点**：
- 状态存储用 Redis（高速读/写）还是 PostgreSQL（持久化）？
  - **推荐**：Redis 存运行时状态（TTL 24h）+ PostgreSQL 存执行历史
  - Redis 故障时从 PostgreSQL 恢复上下文

---

### 2.2 节点扩展机制

**背景**：第一轮倾向核心节点硬编码 + 外部插件预留接口。

#### 推荐方案：分层节点体系

```
┌────────────────────────────────────────────────────────────┐
│                    Node Registry (注册中心)                │
├────────────────────────────────────────────────────────────┤
│  Built-in Nodes (内置节点)    │  Plugin Nodes (插件节点)  │
│  - START                       │  - 用户开发的自定义节点    │
│  - END                         │  - 第三方扩展             │
│  - LLM                         │                          │
│  - HTTP                        │                          │
│  - CONDITION                   │                          │
│  - PARALLEL                    │                          │
│  - DELAY                       │                          │
└────────────────────────────────────────────────────────────┘
```

#### 节点接口设计

```java
// 节点执行接口
public interface NodeExecutor {
    String getType();                           // 节点类型标识

    NodeOutput execute(NodeInput input);        // 执行逻辑

    default List<String> validateConfig() {    // 配置校验
        return Collections.emptyList();
    }
}

// 节点注册接口
public interface NodeRegistry {
    void register(NodeExecutor executor);       // 注册节点
    Optional<NodeExecutor> get(String type);   // 获取节点执行器
    List<NodeDefinition> getAllDefinitions();  // 获取所有节点定义
}
```

#### 节点生命周期

1. **定义阶段**：节点配置在流程编辑器中定义，保存为 DAG 的一部分
2. **解析阶段**：执行引擎加载定义，根据 type 从 Registry 获取执行器
3. **执行阶段**：执行器处理输入，返回输出
4. **扩展阶段**：插件节点通过 SPI 机制加载（classpath 扫描）

#### SPI 插件机制

```yaml
# META-INF/services/com.taskflow.node.NodeExecutor
# 文件内容：自定义节点的全限定类名
com.example.nodes.CustomNodeExecutor
```

**决策点**：
- 是否支持用户在线编辑自定义节点代码？
  - **推荐**：V1 仅支持编译好的 JAR 插件，V2 考虑沙箱执行（WebAssembly）
- 节点版本如何管理？
  - **推荐**：节点配置增加 version 字段，与工作流版本解耦

---

### 2.3 分支处理

**背景**：需要支持条件分支 (IF/ELSE) 和并行分支 (PARALLEL)。

#### 边定义扩展

```java
public class Edge {
    String sourceNodeId;
    String targetNodeId;
    EdgeType type;  // NORMAL, CONDITION, BRANCH

    // 条件边
    String condition;     // 条件表达式，如: {{output.sentiment}} == 'positive'
    Integer branchIndex;  // 分支索引 (PARALLEL 时使用)
}
```

#### 条件表达式引擎

**方案 A**：自研 DSL（简单灵活）
- 语法：`{{variable}} operator value`，如 `{{ctx.score}} > 60`
- 优点：轻量、可定制
- 缺点：需维护解析器

**方案 B**：使用 JsonLogic
- 优点：成熟稳定，安全性好
- 缺点：语法与前端差异

**方案 C**：SpEL (Spring Expression Language)
- 优点：功能强大，与 Spring 集成
- 缺点：功能过于强大，需限制

**推荐方案**：方案 A（自研 DSL）+ 安全沙箱
- 定义简洁语法：`{{path}} [==, !=, >, <, >=, <=, contains, in] <value>`
- 支持逻辑运算：`&&`, `||`, `!`
- 变量来源：`{{node_id.output.field}}`, `{{context.variable}}`

#### 分支执行策略

**条件分支 (IF/ELSE)**：
```
        ┌─────────────┐
        │   CONDITION │
        └──────┬──────┘
               │
       ┌───────┼───────┐
       │               │
   {{score}} > 60  {{score}} <= 60
       │               │
       ▼               ▼
  ┌─────────┐    ┌─────────┐
  │  TRUE   │    │  FALSE  │
  └─────────┘    └─────────┘
```
- 执行时计算条件表达式
- 只执行条件为 true 的分支
- 条件为 false 的分支不执行

**并行分支 (PARALLEL)**：
```
        ┌─────────────┐
        │   PARALLEL  │
        └──────┬──────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌───────┐  ┌───────┐  ┌───────┐
│Branch1│  │Branch2│  │Branch3│
└───┬───┘  └───┬───┘  └───┬───┘
    └──────────┴──────────┘
          │
          ▼
    ┌─────────────┐
    │   JOIN      │
    └─────────────┘
```
- PARALLEL 节点标记并行起点
- JOIN 节点等待所有分支完成
- 并行执行使用 Vert.x Worker Thread Pool

**决策点**：
- 并行分支的最大并发数限制？
  - **推荐**：默认 10，可配置，超出则排队
- 分支超时如何处理？
  - **推荐**：设置分支级超时，超时终止整个流程

---

### 2.4 LLM 集成

**背景**：需要支持大语言模型调用 + 提示词模板。

#### 推荐方案：独立 LLM 节点 + 通用 HTTP 节点

```
┌────────────────────────────────────────────────────┐
│                  LLM Node (内置)                   │
├────────────────────────────────────────────────────┤
│  模型选择: OpenAI / Anthropic / Ollama / 自定义     │
│  请求参数:                                          │
│    - model: string                                 │
│    - temperature: float                            │
│    - max_tokens: integer                           │
│    - system_prompt: string                         │
│    - user_template: string (支持变量替换)          │
│  输出:                                             │
│    - content: string                               │
│    - usage: { prompt_tokens, completion_tokens }   │
└────────────────────────────────────────────────────┘
```

#### 提示词模板机制

```java
// 模板渲染输入
public class PromptTemplateInput {
    String template;           // "分析以下用户问题: {{user.question}}"
    Map<String, Object> variables;  // {user: {question: "如何退款?"}}
}

// 渲染结果
// "分析以下用户问题: 如何退款?"
```

**支持的模板语法**：
- 变量替换：`{{variable.path}}`
- 条件：`{{#if sentiment == 'negative'}}抱歉给您带来不便{{/if}}`
- 循环：`{{#each items}}{{name}}{{/each}}`（用于构建消息历史）

#### LLM 调用封装

```java
public interface LLMClient {
    CompletionResponse chat(CompletionRequest request);

    // 支持流式输出
    Flux<String> streamChat(CompletionRequest request);
}

// 内置实现
public class OpenAIClient implements LLMClient { ... }
public class AnthropicClient implements LLMClient { ... }
public class OllamaClient implements LLMClient { ... }
```

**决策点**：
- 是否内置向量检索（RAG）能力？
  - **推荐**：V1 通过 HTTP 节点调用外部向量库，V2 内置向量节点
- 多模型如何切换？
  - **推荐**：节点配置 model 字段，支持运行时动态切换

---

## 3. 第二轮新增架构挑战

### 3.1 多租户架构

**挑战**：第一轮提到多租户，但未深入设计。

#### 方案对比

| 维度 | 共享数据库 (tenant_id) | 独立数据库 |
|------|-----------------------|------------|
| 实现复杂度 | 中 | 高 |
| 数据隔离 | 逻辑隔离 | 物理隔离 |
| 资源成本 | 低 | 高 |
| 适合场景 | SaaS 中小客户 | 大企业高安全需求 |

**推荐方案**：V1 共享数据库 + tenant_id，V2 可扩展独立数据库

```sql
-- 租户表
CREATE TABLE tenants (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20),  -- ACTIVE, SUSPENDED
    plan VARCHAR(20),    -- FREE, PRO, ENTERPRISE
    created_at TIMESTAMP
);

-- 租户资源配额
CREATE TABLE tenant_quotas (
    tenant_id BIGINT PRIMARY KEY,
    workflow_limit INT DEFAULT 10,
    execution_per_day INT DEFAULT 1000,
    storage_mb BIGINT DEFAULT 1024
);

-- 核心表增加 tenant_id
ALTER TABLE workflows ADD COLUMN tenant_id BIGINT NOT NULL;
ALTER TABLE workflow_runs ADD COLUMN tenant_id BIGINT NOT NULL;
-- ... 其他表同样处理
```

#### 租户隔离策略

- **API 层面**：每个请求带 tenant_id header，网关解析并传递
- **数据层面**：所有查询自动追加 `WHERE tenant_id = ?`
- **执行层面**：执行器验证当前租户配额，超限拒绝执行
- **资源隔离**：不同租户的流程执行在不同的 Worker 分组

---

### 3.2 事件驱动与消息队列

**挑战**：触发器系统需要事件驱动架构，消息队列选型待定。

#### 消息队列选型

| 维度 | Redis Streams | Kafka | RabbitMQ |
|------|---------------|-------|----------|
| 吞吐量 | 中 | 高 | 中 |
| 延迟 | 低 | 中 | 低 |
| 持久化 | 可配置 | 强 | 可配置 |
| 运维复杂度 | 低 | 高 | 中 |
| 功能丰富度 | 低 | 高 | 高 |

**推荐方案**：
- **V1**：Redis Streams（轻量、低延迟、运维简单）
- **V2**：Kafka（高吞吐、事件溯源）

#### 事件模型设计

```java
// 工作流触发事件
public class WorkflowTriggerEvent {
    String eventId;
    String workflowId;
    TriggerType type;  // MANUAL, SCHEDULED, WEBHOOK, EVENT
    Map<String, Object> payload;
    String triggerSource;
    Timestamp triggeredAt;
}

// 节点执行事件
public class NodeExecutionEvent {
    String executionId;
    String nodeId;
    NodeEventType type;  // STARTED, COMPLETED, FAILED
    Map<String, Object> output;
    long durationMs;
}
```

#### 消费组设计

```
Kafka Topics:
├── workflow-trigger (触发器主题)
│   └── consumer-group: workflow-trigger-workers
├── node-execution (节点执行主题)
│   └── consumer-group: node-execution-handlers
└── workflow-audit (审计主题)
    └── consumer-group: audit-processors
```

---

### 3.3 版本管理与执行历史

**挑战**：第一轮提到版本管理，但未设计存储策略。

#### 版本管理策略

**推荐方案**：语义化版本 + 快照存储

```java
public class WorkflowVersion {
    Long version;              // 版本号：1, 2, 3...
    String changelog;         // 变更说明
    String definitionSnapshot; // JSON 快照
    String status;            // DRAFT, PUBLISHED
    String createdBy;
    Timestamp createdAt;
}
```

**版本操作**：
- **保存版本**：每次发布时创建新快照
- **回滚**：切换 current_version 指针，不删除旧版本
- **对比**：计算两个版本的 JSON diff

#### 执行历史存储策略

**冷热数据分离**：

```sql
-- 热数据（最近 7 天，PostgreSQL）
CREATE TABLE workflow_runs (
    ...
) PARTITION BY RANGE (created_at);

-- 分区策略
-- workflow_runs_2024_01 (2024-01-01 ~ 2024-01-31)
-- workflow_runs_2024_02 (2024-02-01 ~ 2024-02-28)
```

| 数据类型 | 存储 | 保留时间 | 查询场景 |
|----------|------|----------|----------|
| 运行时状态 | Redis | 24h | 执行中 |
| 最近执行 | PostgreSQL | 7 天 | 调试、监控 |
| 历史执行 | 归档 (对象存储) | 1 年 | 审计、分析 |

**决策点**：
- 是否支持执行回放（从某个节点重新执行）？
  - **推荐**：V1 不支持，V2 支持（需要保存更详细的上下文快照）

---

### 3.4 流程图的渲染性能

**挑战**：第一轮提到大量节点时的渲染性能问题。

#### 前端优化策略

1. **虚拟化渲染**：只渲染视口内的节点
   - React Flow 的 `viewport` 属性 + 自定义渲染优化

2. **节点分组**：复杂流程支持折叠/展开
   - 使用 React Flow 的 `Group` 组件

3. **层级管理**：自动布局算法
   - Dagre 算法（层次布局）
   - Elk 算法（更灵活的布局）

4. **增量更新**：只更新变化的节点
   - 节点配置修改时局部刷新

#### 后端优化策略

1. **流程定义缓存**：Redis 缓存已发布的 DAG 定义
2. **DSL 压缩**：流程定义使用紧凑的 JSON 结构
3. **延迟加载**：复杂节点的子配置按需加载

---

### 3.5 失败恢复与补偿机制

**挑战**：第一轮提到长流程的事务管理。

#### 失败恢复策略

```java
// 节点重试配置
public class RetryConfig {
    int maxAttempts;      // 最大重试次数，默认 3
    long retryDelayMs;   // 重试间隔，默认 1000ms
    String backoff;      // 退避策略：FIXED, EXPONENTIAL
    List<Integer> retryableErrors; // 可重试的错误码列表
}

// 补偿动作定义（用户配置）
public class CompensationAction {
    String nodeId;           // 需要补偿的节点
    String actionType;       // ROLLBACK, NOTIFY, MANUAL
    Map<String, Object> config;
}
```

#### 事务边界设计

**推荐方案**：Saga 模式（最终一致性）

```
流程执行：
1. 依次执行各节点
2. 每个节点执行成功后更新状态
3. 节点失败时：
   a. 记录失败节点和原因
   b. 标记流程为 FAILED
   c. 可选：触发补偿节点（通知、回调）
4. 不支持传统事务的回滚（已执行的外部调用无法撤回）
```

**决策点**：
- 是否支持手动干预（跳过节点、修改输入、重跑）？
  - **推荐**：V1 支持重跑整个流程，V2 支持从任意节点继续

---

## 4. 架构决策汇总

| 问题 | 决策 | 理由 |
|------|------|------|
| 执行模式 | 异步队列 + 状态机 | 支持长流程、暂停恢复、故障续传 |
| 节点扩展 | 内置节点 (SPI) + 插件预留 | 平衡稳定性与扩展性 |
| 分支处理 | 自研 DSL + 并行池 | 轻量、可定制、Vert.x 原生支持 |
| LLM 集成 | 内置 LLM 节点 + HTTP 节点 | 主流需求内置，灵活需求通用 |
| 多租户 | 共享数据库 + tenant_id | V1 简单实现，后期可升级 |
| 消息队列 | Redis Streams (V1) | 轻量、低延迟、运维简单 |
| 版本管理 | 语义化版本 + 快照 | 简单、回滚方便 |
| 执行历史 | 分区表 + 冷热分离 | 平衡性能与存储成本 |

---

## 5. 第二轮待讨论问题

1. **工作流市场/模板系统**：是否需要预置模板？模板如何分类和分发？

2. **Webhooks 安全性**：外部触发如何防止恶意调用？（签名验签、限流）

3. **监控与告警**：执行失败、节点超时如何通知？（邮件、钉钉、Slack）

4. **国际化**：编辑器 UI 和错误消息是否需要多语言支持？

---

## 6. 下一步建议

1. **深入设计执行引擎**：细化状态机设计、消息格式、Worker 调度
2. **设计节点 SDK**：定义节点开发规范，提供示例插件
3. **原型验证**：实现最小流程（START → HTTP → END）的端到端执行
4. **性能测试**：验证 100 节点流程的执行延迟和吞吐量

---

**相关文件**：
- `/Users/swufan/projects/github/taskflow/design/plan_0.1.md`
- `/Users/swufan/projects/github/taskflow/design/architect_0.1.md`