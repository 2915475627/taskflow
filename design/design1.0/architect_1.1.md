# 工作流引擎架构设计 v1.1（第一轮架构完善）

## 1. 微服务架构设计

### 1.1 服务划分

基于前三轮讨论，完善后的微服务架构如下：

| 服务 | 职责 | 技术栈 | 部署策略 |
|------|------|--------|----------|
| **workflow-service** | 工作流 CRUD、版本管理、发布管理 | Spring Boot 3.x | 2+ 副本 |
| **executor-service** | 流程执行引擎、DAG 调度、状态管理 | Spring Boot + Vert.x | 3+ 副本 |
| **node-service** | 节点注册、插件管理、节点定义 | Spring Boot | 2+ 副本 |
| **auth-service** | 认证授权、JWT 签发、多租户上下文 | Spring Boot | 2+ 副本 |
| **gateway-service** | 请求路由、限流、鉴权、负载均衡 | Kong/Nginx | 2+ 副本 |

### 1.2 服务通信架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Web UI    │  │   Mobile    │  │   API       │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────────┐
│                    Gateway Service (Kong/Nginx)                │
│  - 请求路由        - 限流 (100 req/min/user)                   │
│  - SSL 终止       - CORS 配置                                  │
└─────────────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   workflow   │    │    executor   │    │     auth     │
│   service    │    │    service    │    │   service    │
└───────┬───────┘    └───────┬───────┘    └───────────────┘
        │                    │
        │         ┌──────────┴──────────┐
        │         │   Redis Streams   │
        │         │  (任务队列/状态)   │
        │         └──────────┬──────────┘
        │                    │
        │         ┌──────────┴──────────┐
        │         │  node-service     │
        │         │ (节点注册/执行)    │
        │         └───────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │PostgreSQL│ │  Redis   │ │   Kafka  │ │  MinIO   │          │
│  │(主数据)   │ │(缓存/队列)│ │(事件驱动)│ │(文件存储)│          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 服务间通信协议

| 通信场景 | 协议 | 描述 |
|----------|------|------|
| 外部 API | HTTP/REST | OpenAPI 3.0 规范 |
| 服务间同步 | HTTP/gRPC | 优先 HTTP，gRPC 用于高性能场景 |
| 异步任务 | Redis Stream | 轻量、低延迟 |
| 事件驱动 | Kafka | 高吞吐、持久化 |
| 服务发现 | Consul/Eureka | 健康检查、自动发现 |

### 1.4 服务边界决策

**决策：保持服务边界清晰，避免过度拆分**

| 权衡点 | 选择 | 理由 |
|--------|------|------|
| executor 与 workflow 合并？ | 不合并 | 执行是 CPU 密集型，独立扩展更灵活 |
| node 作为独立服务？ | 是 | 插件热加载需要独立生命周期 |
| auth 合并到 gateway？ | 否 | 认证逻辑复杂，独立服务便于维护 |

---

## 2. 技术栈选型

### 2.1 后端技术栈

| 组件 | 选型 | 版本 | 选型理由 |
|------|------|------|----------|
| **编程语言** | Java 17 | LTS | 团队技术栈、性能、生态 |
| **Web 框架** | Spring Boot | 3.2.x | 成熟稳定、生态丰富 |
| **执行引擎** | Vert.x | 4.5.x | 高并发、协程支持、轻量 |
| **ORM** | Spring Data JPA + MyBatis | - | JPA 简单场景，MyBatis 复杂查询 |
| **数据库** | PostgreSQL | 15+ | JSONB 支持、关系型事务 |
| **缓存/消息** | Redis | 7.x | 缓存 + Redis Streams 队列 |
| **消息队列** | Kafka | 3.x | 高吞吐、事件溯源 |
| **对象存储** | MinIO/S3 | - | 自托管、S3 兼容 |
| **API 网关** | Kong | 3.x | 插件丰富、性能好 |

### 2.2 前端技术栈

| 组件 | 选型 | 版本 | 选型理由 |
|------|------|------|----------|
| **框架** | React | 18.x | 社区活跃、组件生态 |
| **流程图库** | React Flow | 11.x | 成熟稳定、定制强 |
| **状态管理** | Zustand | 4.x | 轻量、与 React Flow 集成好 |
| **UI 组件库** | Radix UI / Shadcn | - | 无样式、可定制、a11y 好 |
| **构建工具** | Vite | 5.x | 快速启动、HMR |
| **拖拽库** | @dnd-kit | 6.x | 功能完整、性能好 |

### 2.3 基础设施

| 组件 | 选型 | 描述 |
|------|------|------|
| **容器** | Docker | 标准化部署 |
| **编排** | Kubernetes | 弹性伸缩、服务治理 |
| **服务网格** | Istio | 流量管理、可观测、安全 |
| **CI/CD** | GitHub Actions + ArgoCD | 自动化部署 |
| **监控** | Prometheus + Grafana | 指标收集、可视化 |
| **日志** | ELK Stack | 日志聚合、搜索 |
| **链路追踪** | Jaeger | 分布式追踪 |

### 2.4 技术选型决策

| 问题 | 决策 | 理由 |
|------|------|------|
| 为什么不用 Spring WebFlux？ | Vert.x | 更轻量、更好的并发模型 |
| 为什么不用 MySQL？ | PostgreSQL | JSONB 适合工作流定义存储 |
| 为什么用 Kafka 而非 RabbitMQ？ | Kafka | 高吞吐、事件溯源能力强 |
| 为什么不用 Spring Cloud？ | Kong + 手动服务发现 | 更轻量、团队熟悉 |

---

## 3. 数据模型设计

### 3.1 核心实体

```sql
-- 租户表
CREATE TABLE tenants (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    plan VARCHAR(20) DEFAULT 'FREE',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 租户配额
CREATE TABLE tenant_quotas (
    tenant_id BIGINT PRIMARY KEY REFERENCES tenants(id),
    workflow_limit INT DEFAULT 10,
    execution_per_day INT DEFAULT 1000,
    storage_mb BIGINT DEFAULT 1024,
    team_members INT DEFAULT 5,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户表
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    roles JSONB DEFAULT '["viewer"]',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 团队表
CREATE TABLE teams (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 团队成员
CREATE TABLE team_members (
    team_id BIGINT NOT NULL REFERENCES teams(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member',
    PRIMARY KEY (team_id, user_id)
);
```

### 3.2 工作流核心表

```sql
-- 工作流表
CREATE TABLE workflows (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id),
    team_id BIGINT REFERENCES teams(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,  -- DAG 定义
    version INTEGER DEFAULT 1,
    current_version_id BIGINT REFERENCES workflow_versions(id),
    status VARCHAR(20) DEFAULT 'DRAFT',  -- DRAFT/PUBLISHED/ARCHIVED
    settings JSONB DEFAULT '{}',
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工作流版本表
CREATE TABLE workflow_versions (
    id BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    definition JSONB NOT NULL,
    changelog TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workflow_id, version)
);

-- 工作流执行记录表
CREATE TABLE workflow_runs (
    id BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT NOT NULL REFERENCES workflows(id),
    workflow_version INTEGER NOT NULL,
    execution_id VARCHAR(36) UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id),
    status VARCHAR(20) DEFAULT 'PENDING',
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 执行节点记录表
CREATE TABLE node_runs (
    id BIGSERIAL PRIMARY KEY,
    workflow_run_id BIGINT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'PENDING',
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    duration_ms BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 触发器与 Webhook

```sql
-- Webhook 触发器
CREATE TABLE webhooks (
    id BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    secret VARCHAR(255),
    path VARCHAR(100) UNIQUE NOT NULL,
    method VARCHAR(10) DEFAULT 'POST',
    is_active BOOLEAN DEFAULT TRUE,
    trigger_count BIGINT DEFAULT 0,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 定时任务
CREATE TABLE scheduled_tasks (
    id BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    input_data JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. 执行引擎架构

### 4.1 执行状态管理

```java
// 执行上下文（Redis 存储，TTL 24h）
public class ExecutionContext implements Serializable {
    private String executionId;
    private String workflowId;
    private Integer workflowVersion;
    private String tenantId;
    private Map<String, Object> variables;
    private Map<String, Object> nodeOutputs;
    private String currentNodeId;
    private List<String> completedNodes;
    private List<String> pendingNodes;
    private Map<String, ParallelBranchState> parallelStates;
    private ExecutionStatus status;
    private String errorMessage;
    private int retryCount;
    private Instant startedAt;
    private Instant lastHeartbeat;
}
```

### 4.2 执行流程设计

```
1. API 接收到执行请求
2. 生成 execution_id，写入 workflow_runs (PENDING)
3. 发送执行任务到 Redis Stream
4. Worker 消费任务，状态变更为 RUNNING
5. 构建 DAG，拓扑排序确定执行顺序
6. 依次执行各节点:
   - 收集输入（从上下文/变量/上游输出）
   - 执行节点逻辑
   - 写入 node_runs
   - 更新上下文变量
7. 处理分支/条件/并行
8. 流程结束，更新 workflow_runs (SUCCESS/FAILED)
```

### 4.3 节点执行接口

```java
public interface NodeExecutor {
    String getType();
    NodeCategory getCategory();
    NodeOutput execute(NodeInput input);
    default List<String> validateConfig(Map<String, Object> config) {
        return Collections.emptyList();
    }
}
```

---

## 5. 部署架构

### 5.1 容器化部署

```yaml
# docker-compose.yaml (节选)
services:
  gateway:
    image: kong:3.4
  workflow-api:
    build: ./services/workflow-api
    deploy:
      replicas: 2
  executor:
    build: ./services/executor
    deploy:
      replicas: 3
  postgres:
    image: postgres:15-alpine
  redis:
    image: redis:7-alpine
  kafka:
    image: confluentinc/cp-kafka:7.5.0
```

### 5.2 部署策略

| 环境 | 配置 | 部署策略 | 目的 |
|------|------|----------|------|
| 开发 | 单机 Docker Compose | - | 快速迭代 |
| 测试 | K8s 单节点 | 滚动更新 | 自动化测试 |
| 预发布 | K8s 3 节点 | 滚动更新 + 灰度 | 验证发布 |
| 生产 | K8s 5+ 节点 | 蓝绿部署 | 零停机 |

---

## 6. 性能优化策略

| 优化项 | 方案 | 预期效果 |
|--------|------|----------|
| 表达式解析 | 预编译 + Redis 缓存 | 减少 90% 解析开销 |
| DAG 构建 | 流程发布时构建并缓存 | 执行时直接加载 |
| 并行执行 | Vert.x Worker Pool (10 线程) | 充分利用 CPU |
| 状态读写 | Redis 批量操作 (MGET/MSET) | 减少网络往返 |

---

## 7. 架构决策汇总

| 决策 | 选择 | 理由 |
|------|------|------|
| 服务数量 | 5 个核心服务 | 平衡复杂度与扩展性 |
| 执行引擎 | Vert.x | 高并发、非阻塞 |
| 数据库 | PostgreSQL | JSONB 支持 |
| 执行模式 | 异步队列 + 状态机 | 支持长流程、暂停恢复 |
| 容器化 | Docker + K8s | 标准化、可扩展 |

---

## 8. 待讨论问题

1. **服务拆分粒度**：executor-service 是否需要进一步拆分为调度器和执行器？
2. **数据归档策略**：执行历史保留 7 天是否满足审计需求？
3. **多区域部署**：是否需要跨区域容灾？
4. **成本优化**：是否使用 Spot 实例降低开发/测试成本？

---

**相关文件**:
- `/design/design1.0/architect_0.1.md` ~ `architect_0.3.md`
- `/design/design1.0/plan_0.1.md` ~ `plan_0.3.md`
- `/design/design1.0/security_1.1.md`
- `/design/design1.0/tdd_1.1.md`