# 工作流引擎架构设计 v0.3（第三轮讨论）

## 1. 前端编辑器架构设计

### 1.1 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| 流程图库 | React Flow | 成熟稳定、社区活跃、定制能力强 |
| 状态管理 | Zustand | 轻量、简单、与 React Flow 集成好 |
| UI 组件库 | Radix UI / Shadcn | 无样式、可定制、 accessibility 好 |
| 构建工具 | Vite | 快速启动、热更新快 |
| 拖拽库 | @dnd-kit | 功能完整、性能好 |

### 1.2 编辑器架构分层

```
┌─────────────────────────────────────────────────────────────────┐
│                      Editor Application                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    UI Components Layer                      ││
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   ││
│  │  │  Toolbar  │ │  NodePane │ │  Property │ │  MinMap   │   ││
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Business Logic Layer                     ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐    ││
│  │  │GraphManager │ │ NodeManager │ │  ValidationEngine   │    ││
│  │  │  - 布局算法  │ │  - 节点操作  │ │  - 结构校验          │    ││
│  │  │  - 自动对齐  │ │  - 配置验证  │ │  - 循环检测          │    ││
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘    ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      State Layer                            ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │               Zustand Store                          │   ││
│  │  │  - nodes, edges, viewport                           │   ││
│  │  │  - selectedNodes, clipboard                         │   ││
│  │  │  - history (undo/redo)                              │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     API Layer                               ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │              Workflow API Client                     │   ││
│  │  │  - saveWorkflow(), publishWorkflow()                │   ││
│  │  │  - executeWorkflow(), getExecutionStatus()         │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 核心状态设计

```typescript
// 编辑器主状态
interface EditorState {
  // 流程定义
  workflow: {
    id: string;
    name: string;
    nodes: Node[];
    edges: Edge[];
    variables: Variable[];
  };

  // 视图状态
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };

  // 交互状态
  selection: {
    nodeIds: string[];
    edgeIds: string[];
  };

  // 历史记录
  history: {
    past: WorkflowSnapshot[];
    future: WorkflowSnapshot[];
  };

  // 执行状态
  execution: {
    isRunning: boolean;
    currentNodeId: string | null;
    nodeStatuses: Record<string, ExecutionStatus>;
  };
}
```

### 1.4 节点配置面板设计

```typescript
// 节点配置面板组件结构
interface PropertyPanelProps {
  node: Node;
  onChange: (config: NodeConfig) => void;
}

// 动态表单生成
const getFormSchema = (nodeType: string): FormSchema => {
  switch (nodeType) {
    case 'http':
      return {
        fields: [
          { name: 'url', type: 'text', label: 'URL', required: true },
          { name: 'method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'] },
          { name: 'headers', type: 'keyValue' },
          { name: 'body', type: 'code', language: 'json' },
          { name: 'timeout', type: 'number' },
        ]
      };
    case 'llm':
      return {
        fields: [
          { name: 'provider', type: 'select', options: ['openai', 'anthropic', 'ollama'] },
          { name: 'model', type: 'select', dependsOn: 'provider' },
          { name: 'temperature', type: 'slider', min: 0, max: 2 },
          { name: 'maxTokens', type: 'number' },
          { name: 'systemPrompt', type: 'textarea' },
          { name: 'userTemplate', type: 'code', language: 'template' },
        ]
      };
    // ... 其他节点类型
  }
}
```

### 1.5 性能优化策略

| 优化项 | 方案 | 目标 |
|--------|------|------|
| 虚拟化渲染 | React Flow viewport + 只渲染可见节点 | 100+ 节点流畅 |
| 增量更新 | React.memo + useMemo 避免不必要重渲染 | 编辑响应 < 16ms |
| Web Worker | 复杂布局计算移至 Worker | 不阻塞主线程 |
| 懒加载 | 节点配置面板按需加载 | 首屏 < 2s |
| 边绘制优化 | 只渲染可见边 + 贝塞尔曲线简化 | 连线渲染性能 |

---

## 2. API 设计

### 2.1 RESTful vs GraphQL 对比分析

| 维度 | RESTful | GraphQL |
|------|---------|---------|
| 学习成本 | 低 | 中 |
| 客户端灵活性 | 低（固定端点） | 高（按需查询） |
| 性能 | 好（缓存友好） | 好（减少请求数） |
| 类型安全 | 需额外工具 | 内置 |
| 复杂查询 | 需多个端点 | 单次查询 |
| 生态成熟度 | 高 | 高 |
| 团队熟悉度 | 高 | 中 |

### 2.2 推荐方案：RESTful + OpenAPI

**决策**：采用 RESTful API + OpenAPI 3.0 规范

**理由**：
1. 团队更熟悉 RESTful，开发效率高
2. OpenAPI 提供完整的 API 文档和类型生成
3. 与现有 Spring Boot生态集成好（springdoc-openapi）
4. 复杂查询场景可通过批量接口解决

### 2.3 API 端点设计

#### 工作流管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/workflows | 获取工作流列表 |
| POST | /api/v1/workflows | 创建工作流 |
| GET | /api/v1/workflows/{id} | 获取工作流详情 |
| PUT | /api/v1/workflows/{id} | 更新工作流 |
| DELETE | /api/v1/workflows/{id} | 删除工作流 |
| POST | /api/v1/workflows/{id}/publish | 发布工作流 |
| GET | /api/v1/workflows/{id}/versions | 获取版本列表 |
| POST | /api/v1/workflows/{id}/rollback | 回滚到历史版本 |

#### 流程执行

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/v1/workflows/{id}/execute | 启动执行 |
| GET | /api/v1/executions/{id} | 获取执行状态 |
| POST | /api/v1/executions/{id}/pause | 暂停执行 |
| POST | /api/v1/executions/{id}/resume | 恢复执行 |
| POST | /api/v1/executions/{id}/stop | 终止执行 |
| GET | /api/v1/executions/{id}/logs | 获取执行日志 |
| GET | /api/v1/executions/{id}/variables | 获取运行时变量 |

#### 节点与插件

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/nodes | 获取可用节点列表 |
| GET | /api/v1/nodes/{type} | 获取节点定义 |
| POST | /api/v1/plugins | 上传插件 |
| GET | /api/v1/plugins | 获取插件列表 |
| DELETE | /api/v1/plugins/{id} | 删除插件 |

#### 触发器

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/v1/workflows/{id}/triggers | 获取触发器配置 |
| POST | /api/v1/workflows/{id}/triggers/webhook | 创建 Webhook |
| GET | /api/v1/webhooks/{id} | 获取 Webhook 信息 |
| POST | /api/v1/webhooks/{id}/test | 测试 Webhook |

### 2.4 API 版本策略

```
URL 路径版本：/api/v1/
Header 版本：Accept: application/vnd.taskflow.v1+json

版本演进规则：
- V1：初始版本，成熟后不再变更
- V2：新增字段，不删除旧字段
- 废弃字段：标记 @Deprecated，至少保留 2 个大版本
```

### 2.5 API 响应格式

```typescript
// 统一响应格式
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    page?: PaginationMeta;
  };
}

// 列表响应
interface ListResponse<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// 分页参数
interface PaginationParams {
  page?: number;      // 默认 1
  limit?: number;     // 默认 20，最大 100
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

---

## 3. 部署架构

### 3.1 容器化设计

#### Dockerfile 示例（后端服务）

```dockerfile
# 构建阶段
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn package -DskipTests

# 运行阶段
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "-XX:+UseG1GC", "-Xms512m", "-Xmx1024m", "app.jar"]
```

#### Docker Compose 本地开发

```yaml
version: '3.8'

services:
  # API 网关
  gateway:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./deploy/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - workflow-api
      - executor-api

  # 工作流 API 服务
  workflow-api:
    build: ./services/workflow-api
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - DATABASE_URL=jdbc:postgresql://postgres:5432/taskflow
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  # 执行引擎服务
  executor:
    build: ./services/executor
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - REDIS_URL=redis://redis:6379
      - KAFKA_URL=kafka:9092
    depends_on:
      - redis
      - kafka

  # 数据库
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=taskflow
      - POSTGRES_USER=taskflow
      - POSTGRES_PASSWORD=dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # 缓存/消息队列
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  # 消息队列
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      - KAFKA_BROKER_ID=1
      - KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181
      - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092
    depends_on:
      - zookeeper

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      - ZOOKEEPER_CLIENT_PORT: 2181

volumes:
  postgres_data:
  redis_data:
```

### 3.2 Kubernetes 部署架构

#### 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐     ┌──────────────────────┐        │
│  │   Ingress Controller │     │   Ingress Controller │        │
│  │       (Nginx)         │     │       (Nginx)        │        │
│  └──────────┬───────────┘     └──────────┬───────────┘        │
│             │                             │                     │
│  ┌──────────┴───────────┐     ┌──────────┴───────────┐        │
│  │     API Gateway      │     │    API Gateway       │        │
│  │   (Kong / Nginx)     │     │   (Kong / Nginx)     │        │
│  └──────────┬───────────┘     └──────────┬───────────┘        │
│             │                             │                     │
│  ┌──────────┴─────────────────────────────┴───────────┐        │
│  │                    Service Mesh (Istio)            │        │
│  └──────────┬─────────────────────────────┬───────────┘        │
│             │                             │                     │
│  ┌──────────┴──────────┐    ┌────────────┴────────────┐     │
│  │  workflow-service   │    │    executor-service      │     │
│  │  (Deployment: 2+)   │    │    (Deployment: 3+)      │     │
│  └─────────────────────┘    └───────────────────────────┘     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Data Layer (PVC)                       │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │  │
│  │  │PostgreSQL│ │ Redis  │ │ Kafka  │ │ MinIO  │            │  │
│  │  │(Stateful)│ │(Stateful│ │(Stateful│ │(Stateful│           │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### K8s 资源定义

```yaml
# workflow-service deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflow-service
  namespace: taskflow
spec:
  replicas: 2
  selector:
    matchLabels:
      app: workflow-service
  template:
    metadata:
      labels:
        app: workflow-service
    spec:
      containers:
        - name: workflow-service
          image: taskflow/workflow-service:latest
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "prod"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: taskflow-db-secret
                  key: url
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 20

---
# PostgreSQL StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
  namespace: taskflow
spec:
  serviceName: postgresql
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  volumeClaimTemplates:
    - metadata:
        name: postgresql-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard
        resources:
          requests:
            storage: 20Gi
```

### 3.3 服务网格设计（Istio）

```yaml
# VirtualService 定义
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: workflow-service
  namespace: taskflow
spec:
  hosts:
    - workflow-service
  http:
    - match:
        - headers:
            x-api-version:
              exact: "v1"
      route:
        - destination:
            host: workflow-service
            port:
              number: 8080
          weight: 100

---
# DestinationRule（负载均衡策略）
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: executor-service
  namespace: taskflow
spec:
  host: executor-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: UPGRADE
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    loadBalancer:
      simple: LEAST_REQUEST
```

### 3.4 部署策略

| 环境 | 配置 | 策略 |
|------|------|------|
| 开发 | 单机 Docker Compose | 快速迭代 |
| 测试 | K8s 单节点 (Minikube) | 自动化测试 |
| 预发布 | K8s 3 节点集群 | 滚动更新 |
| 生产 | K8s 5+ 节点集群 | 蓝绿部署 + 灰度 |

---

## 4. 安全性设计

### 4.1 认证授权模型

#### 认证方案

| 方案 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| JWT | API 认证 | 无状态、可扩展 | 令牌撤销复杂 |
| Session | 传统 Web | 易于理解 | 分布式需共享 |
| OAuth2 + OIDC | 第三方登录 | 标准、安全 | 复杂度高 |

**推荐方案**：JWT + Refresh Token

```
访问流程：
1. 用户登录 → 返回 access_token (15min) + refresh_token (7d)
2. 每次请求携带 access_token
3. 过期时用 refresh_token 换取新令牌
4. 登出时加入黑名单（可选）
```

#### 授权模型：RBAC + ABAC

```typescript
// RBAC 角色定义
interface Role {
  id: string;
  name: string;           // admin, editor, viewer
  description: string;
  permissions: Permission[];
}

// 权限定义
interface Permission {
  resource: 'workflow' | 'execution' | 'plugin' | 'trigger';
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
  scope: 'own' | 'team' | 'all';  // 数据范围
}

// ABAC 条件示例
const canExecuteWorkflow = (user: User, workflow: Workflow): boolean => {
  // 管理员可执行所有
  if (user.hasRole('admin')) return true;

  // 必须是团队成员
  if (user.teamId !== workflow.teamId) return false;

  // 编辑者及以上角色可执行
  return user.hasPermission('execution', 'execute');
};
```

### 4.2 API 安全策略

#### 认证中间件

```java
// JWT 认证过滤器
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) {
        // 1. 从 Header 提取 Token
        String token = extractToken(request);

        if (token != null) {
            // 2. 验证 Token
            var claims = jwtService.validate(token);

            // 3. 设置 Security Context
            var userDetails = new UserDetails(claims);
            var authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities()
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}
```

#### API 防护措施

| 防护措施 | 配置 | 说明 |
|----------|------|------|
| 请求限流 | 100 req/min/user | 防止滥用 |
| 请求体限制 | 10MB | 防止大文件攻击 |
| CORS | 仅允许白名单域名 | 防止跨站请求 |
| HTTPS | 强制 TLS 1.3 | 传输加密 |
| CSRF | SameSite Cookie | 防止跨站请求伪造 |

### 4.3 数据隔离设计

#### 多租户数据隔离

```java
// 数据访问层自动注入租户 ID
@Repository
public class WorkflowRepository {

    @Query("SELECT w FROM Workflow w WHERE w.id = :id AND w.tenantId = :tenantId")
    Optional<Workflow> findByIdAndTenantId(@Param("id") Long id,
                                           @Param("tenantId") Long tenantId);

    // 自动追加租户过滤
    @Query("SELECT w FROM Workflow w")
    default List<Workflow> findAllWithTenantFilter() {
        // 由 AOP 拦截自动添加 tenant_id 条件
        return null;
    }
}

// 租户上下文
public class TenantContext {
    private static final ThreadLocal<Long> CURRENT_TENANT = new ThreadLocal<>();

    public static void setTenantId(Long tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static Long getTenantId() {
        return CURRENT_TENANT.get();
    }
}
```

#### 行级安全策略

```sql
-- 使用 RLS (Row Level Security)
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- 租户隔离策略
CREATE POLICY tenant_isolation ON workflows
    USING (tenant_id = current_setting('app.tenant_id')::bigint);

-- 团队隔离策略（可选）
CREATE POLICY team_isolation ON workflows
    USING (
        tenant_id = current_setting('app.tenant_id')::bigint
        AND (
            created_by = current_setting('app.user_id')::bigint
            OR id IN (SELECT workflow_id FROM team_members WHERE user_id = current_setting('app.user_id')::bigint)
        )
    );
```

### 4.4 Webhook 安全

#### 签名验证

```java
// Webhook 签名生成（服务端）
public class WebhookSignatureService {

    public String generateSignature(String payload, String secret) {
        String signature = "sha256=" + HMAC-SHA256(payload, secret);
        return signature;
    }
}

// Webhook 签名验证（客户端回调）
public class WebhookAuthFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response,
                         FilterChain chain) {
        HttpServletRequest httpRequest = (HttpServletRequest) request;

        String signature = httpRequest.getHeader("X-Webhook-Signature");
        String payload = getRequestBody(httpRequest);

        if (!verifySignature(payload, signature, webhookSecret)) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            return;
        }

        chain.doFilter(request, response);
    }
}
```

#### 防重放机制

```yaml
# Redis 实现分布式限流
# 限流 key: webhook:ratelimit:{webhook_id}:{ip_hash}
# 限流规则: 100 req/min, 1000 req/hour

# Lua 脚本实现原子操作
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('INCR', key)
if current == 1 then
    redis.call('EXPIRE', key, window)
end

return current <= limit
```

### 4.5 敏感数据保护

| 数据类型 | 保护措施 | 实现方式 |
|----------|----------|----------|
| 用户密码 | 哈希存储 | BCrypt + salt |
| API 密钥 | 加密存储 | AES-256 |
| LLM 密钥 | 单独加密 | KMS + envelope |
| 业务数据 | 传输加密 | TLS 1.3 |
| 日志脱敏 | 自动脱敏 | Logback 过滤器 |

```java
// 敏感数据加密存储
@Entity
public class ApiKey {
    @Encrypt  // 自定义加密注解
    private String encryptedKey;

    @Decrypt  // 读取时自动解密
    public String getPlainKey() { ... }
}
```

---

## 5. 成本估算

### 5.1 MVP 阶段资源估算

#### 人力成本

| 角色 | 人数 | 周期 | 人月 | 单价 | 小计 |
|------|------|------|------|------|------|
| 前端工程师 | 2 | 3 个月 | 6 | ¥30,000 | ¥180,000 |
| 后端工程师 | 3 | 3 个月 | 9 | ¥35,000 | ¥315,000 |
| 架构师/技术负责 | 1 | 3 个月 | 3 | ¥50,000 | ¥150,000 |
| UI 设计师 | 1 | 1 个月 | 1 | ¥30,000 | ¥30,000 |
| **合计** | | | **19** | | **¥675,000** |

#### 云资源成本（预估）

| 资源 | 配置 | 单价 | 数量 | 月成本 |
|------|------|------|------|--------|
| 云服务器 (K8s 节点) | 4 vCPU / 8GB | ¥200/月 | 3 | ¥600 |
| 数据库 RDS | 2 vCPU / 4GB | ¥150/月 | 1 | ¥150 |
| Redis | 1GB | ¥50/月 | 1 | ¥50 |
| 对象存储 OSS | 10GB | ¥20/月 | 1 | ¥20 |
| API 网关 | 100万次 | ¥0.5/万 | - | ¥50 |
| 负载均衡 | 100Mbps | ¥50/月 | 1 | ¥50 |
| **合计** | | | | **¥920/月** |

#### 年度成本估算

| 成本项 | 第一年 | 第二年 | 说明 |
|--------|--------|--------|------|
| 人力开发成本 | ¥675,000 | ¥400,000 | 第二年维护迭代 |
| 云资源 | ¥11,040 | ¥15,000 | 随业务增长扩展 |
| 第三方服务 | ¥12,000 | ¥24,000 | LLM API 按需付费 |
| **合计** | **¥698,040** | **¥439,000** | |

### 5.2 成本优化策略

| 优化项 | 策略 | 预期节省 |
|--------|------|----------|
| 开发阶段 | 使用托管 K8s (ACK/EKS) 自建 | 30% 运维成本 |
| 测试环境 | 使用 Spot 实例 | 60% 计算成本 |
| 开发/测试 | 复用同一套环境，按需启停 | 40% 资源成本 |
| LLM 调用 | 缓存常见响应 + 流式输出 | 20% API 成本 |
| 存储策略 | 冷热分离，生命周期管理 | 50% 存储成本 |

### 5.3 扩展性成本预测

| 用户规模 | 预估月成本 | 架构调整 |
|----------|------------|----------|
| 0-100 用户 | ¥1,000 | 单机部署 |
| 100-1000 用户 | ¥5,000 | K8s 小集群 |
| 1000-10000 用户 | ¥20,000 | 多区域部署 |
| 10000+ 用户 | ¥50,000+ | 混合云架构 |

---

## 6. 第三轮架构决策汇总

| 问题 | 决策 | 理由 |
|------|------|------|
| 前端编辑器 | React Flow + Zustand | 成熟稳定、性能好、团队熟悉 |
| API 设计 | RESTful + OpenAPI | 简单、成熟、易集成 |
| 部署架构 | Docker + K8s | 标准化、可扩展、运维方便 |
| 服务网格 | Istio | 流量管理、可观测、安全 |
| 认证授权 | JWT + RBAC/ABAC | 无状态、可扩展、灵活 |
| 数据隔离 | 租户 ID + RLS | 实现简单、扩展性好 |
| Webhook 安全 | HMAC 签名 + 限流 | 业界标准、防止攻击 |

---

## 7. 第三轮待讨论问题

1. **定价策略**：免费版 vs 付费版功能划分？
2. **多区域部署**：是否需要跨区域容灾？
3. **审计合规**：日志保留策略、GDPR 符合性？
4. **容灾备份**：数据备份策略、RTO/RPO 目标？
5. **监控告警**：指标阈值、通知渠道选择？

---

## 8. 下一步建议

1. **原型验证**：实现最小流程的端到端执行
2. **技术选型确认**：最终确定前端技术栈
3. **API 设计评审**：与前端对齐接口规范
4. **部署验证**：本地 K8s 环境搭建
5. **安全审计**：第三方安全测试

---

**相关文件**：
- `/design/architect_0.1.md`
- `/design/plan_0.1.md`
- `/design/architect_0.2.md`
- `/design/plan_0.2.md`