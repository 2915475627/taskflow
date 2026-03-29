# 工作流引擎架构设计 v0.1

## 1. 竞品分析

### 1.1 Dify (AI 工作流)
- **核心能力**: LLM 应用编排、可视化流程设计、RAG 管道
- **架构特点**:
  - 前端使用 React Flow 进行节点编排
  - 后端 Python/Node.js 混合架构
  - 支持多模型切换 (OpenAI/Anthropic/本地模型)
- **数据模型**:
  - 工作流以 DAG 形式存储 (JSON 定义)
  - 运行时通过DSL解释器执行

### 1.2 Coze (Bot 工作流)
- **核心能力**: Bot 编排、插件系统、工作流编排
- **架构特点**:
  - 偏向 Bot 场景，支持插件市场
  - 工作流支持定时触发/Webhook/事件驱动
- **数据模型**:
  - 插件 + 工作流的组合模式
  - 运行时状态持久化

### 1.3 N8N (自动化流程)
- **核心能力**: 自动化工作流、节点市场、自托管
- **架构特点**:
  - 完全开源，节点驱动架构
  - 支持本地执行/云端执行
  - 丰富的集成节点 (200+)
- **数据模型**:
  - 工作流 = 节点数组 + 连接关系
  - 执行历史完整可追溯

## 2. 核心需求定义

### 2.1 功能需求
1. **可视化编排**: 拖拽式流程设计，支持节点配置
2. **节点类型**:
   - 触发节点 (Webhook/定时/事件)
   - 执行节点 (LLM/工具/代码/条件分支)
   - 数据节点 (数据库/API/文件)
3. **执行引擎**: 支持同步/异步执行，支持流程暂停/恢复
4. **版本管理**: 工作流版本控制，支持回滚
5. **执行监控**: 实时日志、断点调试、运行时状态查看
6. **多租户**: 团队空间、资源隔离

### 2.2 非功能需求
- **可扩展性**: 易于添加新节点类型
- **可观测性**: 完整的日志、指标、追踪
- **高可用**: 支持水平扩展，故障恢复
- **性能**: 单流程执行延迟 < 5s (不含外部调用)

## 3. 系统架构设计

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Web UI    │  │   Mobile    │  │   API       │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                          │
│         (Kong / Nginx / Spring Cloud Gateway)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │  Workflow  │ │  Execute   │ │  Node      │ │  Plugin    │  │
│  │  Service   │ │  Service   │ │  Service   │ │  Service   │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │  Auth      │ │  Tenant    │ │  Audit     │                 │
│  │  Service   │ │  Service   │ │  Service   │                 │
│  └────────────┘ └────────────┘ └────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ PostgreSQL│ │  Redis   │ │  MinIO   │ │  Kafka   │          │
│  │(主数据)   │ │(缓存/队列)│ │(文件存储) │ │(事件队列) │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 微服务划分

| 服务 | 职责 | 技术栈 |
|------|------|--------|
| workflow-service | 工作流 CRUD、版本管理、发布 | Spring Boot |
| executor-service | 流程执行引擎、DAG 调度 | Spring Boot + Vert.x |
| node-service | 节点注册、插件管理 | Spring Boot |
| auth-service | 认证授权、多租户 | Spring Boot |
| api-gateway | 请求路由、限流、鉴权 | Kong/Nginx |

### 3.3 核心模块设计

#### 3.3.1 工作流定义模型 (PostgreSQL)

```sql
-- 工作流表
CREATE TABLE workflows (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,  -- DAG 定义
    version INTEGER DEFAULT 1,
    status VARCHAR(20),  -- DRAFT/PUBLISHED/ARCHIVED
    created_by BIGINT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- 工作流版本表
CREATE TABLE workflow_versions (
    id BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT NOT NULL,
    version INTEGER NOT NULL,
    definition JSONB NOT NULL,
    changelog TEXT,
    created_at TIMESTAMP
);

-- 流程执行记录表
CREATE TABLE workflow_runs (
    id BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT NOT NULL,
    workflow_version INTEGER,
    status VARCHAR(20),  -- PENDING/RUNNING/SUCCESS/FAILED/SUSPENDED
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP
);

-- 执行节点状态表
CREATE TABLE node_runs (
    id BIGSERIAL PRIMARY KEY,
    workflow_run_id BIGINT NOT NULL,
    node_id VARCHAR(100) NOT NULL,
    node_type VARCHAR(50),
    status VARCHAR(20),
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);
```

#### 3.3.2 DAG 执行引擎

```java
// 流程定义核心结构
public class WorkflowDefinition {
    private String id;
    private List<Node> nodes;
    private List<Edge> edges;
    private Map<String, Object> variables;
}

public class Node {
    private String id;
    private String type;  // LLM/CONDITION/TOOL/API/DELAY/BRANCH
    private Map<String, Object> config;
    private Map<String, String> inputs;  // 来自上游节点的引用
}

public class Edge {
    private String sourceNodeId;
    private String targetNodeId;
    private String condition;  // 条件边时使用
}
```

#### 3.3.3 执行引擎核心逻辑

```
┌─────────────────────────────────────────────────────────────────┐
│                     Executor Engine                              │
│                                                                  │
│  1. 加载工作流定义 (从 DB/Redis)                                 │
│  2. 构建 DAG 结构                                                │
│  3. 拓扑排序确定执行顺序                                         │
│  4. 依次执行各节点:                                              │
│     ├─ 收集输入 (从上下文/variable/上游输出)                     │
│     ├─ 执行节点逻辑                                             │
│     ├─ 写入 node_runs                                          │
│     └─ 更新上下文变量                                           │
│  5. 处理分支/条件/并行                                           │
│  6. 返回最终结果                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| 编程语言 | Java 17 + Kotlin | 团队技术栈，性能好，生态丰富 |
| Web 框架 | Spring Boot 3.x | 成熟稳定，易于集成 |
| 执行引擎 | Vert.x (协程) | 高并发，非阻塞 IO |
| 数据库 | PostgreSQL | JSONB 支持，关系型事务 |
| 缓存/消息 | Redis + Redis Streams | 轻量级，延迟低 |
| 工作流存储 | MinIO/本地 | 附件、文件存储 |
| 消息队列 | Kafka | 高吞吐，事件驱动 |
| API 网关 | Kong | 成熟稳定，插件丰富 |
| 前端 | React + React Flow | 可视化编排组件成熟 |

## 4. 第一轮待讨论问题

1. **执行模式选择**:
   - 方案 A: 每个流程实例一个 Worker 线程同步执行
   - 方案 B: 异步队列 + 状态机，支持流程暂停恢复
   - 当前倾向于 B，但需要考虑状态持久化复杂度

2. **节点扩展机制**:
   - 方案 A: 硬编码节点类型，通过注册表加载
   - 方案 B: 插件机制，热插拔
   - 当前倾向于 A+B，核心节点硬编码 + 外部插件预留接口

3. **分支处理**:
   - 如何支持条件分支 (IF/ELSE)
   - 如何支持并行分支 (PARALLEL)
   - 需要定义边上的条件表达式语法

4. **LLM 集成**:
   - 是否内置 LLM 调用，还是通过通用 HTTP 节点
   - Dify 的提示词模板机制是否需要