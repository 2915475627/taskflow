# 工作流引擎后端领域设计 v2.0

## 概述

本文档从 design1.0 的多轮设计文档中提取后端相关内容，整合架构、技术栈、API设计、数据模型、TDD指导和安全设计，形成完整的后端领域设计文档。

---

## 一、后端架构设计

### 1.1 服务架构（4服务模式 - MVP简化）

基于 architect_1.3 的最终决策，MVP阶段采用简化架构：

```yaml
services:
  gateway:        # Nginx/Kong - 请求路由、限流、鉴权
  workflow-api:   # Spring Boot - 工作流CRUD + 节点执行（合并）
  executor:       # Spring Boot ThreadPool - 执行引擎
  auth:           # Spring Boot - 认证授权服务
  postgres:       # PostgreSQL 15+ - 主数据存储
  redis:          # Redis 7.x - 缓存/队列
# 暂不部署Kafka，使用Redis Streams
```

**架构决策汇总：**

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 执行引擎 | ThreadPool | 测试友好、MVP足够（替代Vert.x） |
| 服务数量 | 4个 | MVP简化 |
| 消息队列 | Redis Stream | MVP低负载 |
| 表达式沙箱 | SafeExpressionEngine | 安全必选 |
| HTTP节点 | 禁止内部IP | 安全必选 |
| 插件上传 | MVP禁用 | 安全考虑 |
| 条件分支 | 延后至P1 | 安全验证需要时间 |

### 1.2 技术栈选型

| 组件 | 选型 | 版本 | 说明 |
|------|------|------|------|
| 编程语言 | Java | 17 LTS | 团队技术栈、性能、生态 |
| Web框架 | Spring Boot | 3.2.x | 成熟稳定、生态丰富 |
| 执行引擎 | ThreadPoolExecutor | - | MVP简化（替代Vert.x） |
| ORM | Spring Data JPA + MyBatis | - | JPA简单场景，MyBatis复杂查询 |
| 数据库 | PostgreSQL | 15+ | JSONB支持、关系型事务 |
| 缓存/消息 | Redis | 7.x | 缓存 + Redis Streams队列 |
| API网关 | Kong/Nginx | 3.x | 插件丰富、性能好 |

**相关架构文档：**
- `/design/design1.0/architect_1.1.md` - 第一轮架构设计
- `/design/design1.0/architect_1.2.md` - 第二轮架构完善
- `/design/design1.0/architect_1.3.md` - 第三轮架构收束

---

## 二、数据模型设计

### 2.1 核心实体模型

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

-- 工作流表
CREATE TABLE workflows (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id),
    team_id BIGINT REFERENCES teams(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,  -- DAG定义
    version INTEGER DEFAULT 1,
    current_version_id BIGINT REFERENCES workflow_versions(id),
    status VARCHAR(20) DEFAULT 'DRAFT',
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

-- Webhook触发器
CREATE TABLE webhooks (
    id BIGSERIAL PRIMARY KEY,
    workflow_id BIGINT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    secret_hash VARCHAR(255),  -- SHA-256哈希
    secret_salt VARCHAR(32),    -- 盐值
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

### 2.2 安全数据模型

```java
// Webhook实体 - 哈希存储
@Entity
public class Webhook {
    @Column(name = "secret_hash")
    private String secretHash;  // SHA-256哈希

    @Column(name = "secret_salt")
    private String secretSalt;  // 盐值

    public boolean verifySecret(String input) {
        return hashWithSalt(input, this.secretSalt).equals(this.secretHash);
    }
}

// API Key加密存储
@Entity
public class ApiKey {
    @Encrypted
    @Column(name = "encrypted_key")
    private String apiKey;
}

// 加密字段注解
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Encrypted {}
```

---

## 三、API设计

### 3.1 RESTful API结构

```java
@RestController
@RequestMapping("/api/v1/workflows")
@Validated
class WorkflowController {
    private final WorkflowService workflowService;

    // GET /api/v1/workflows - 列表
    // GET /api/v1/workflows/:id - 详情
    // POST /api/v1/workflows - 创建
    // PUT /api/v1/workflows/:id - 更新
    // DELETE /api/v1/workflows/:id - 删除
    // POST /api/v1/workflows/:id/execute - 执行
    // POST /api/v1/workflows/:id/publish - 发布
}

// 执行API
@RestController
@RequestMapping("/api/v1/executions")
class ExecutionController {
    // GET /api/v1/executions/:id - 执行详情
    // POST /api/v1/executions/:id/cancel - 取消执行
    // POST /api/v1/executions/:id/retry - 重试
}

// Webhook API
@RestController
@RequestMapping("/webhooks")
class WebhookController {
    // POST /webhooks/:path - 触发工作流
}
```

### 3.2 API响应格式

```typescript
interface ApiResponse<T> {
    success: boolean
    data?: T
    error?: string
    meta?: {
        total: number
        page: number
        limit: number
    }
}
```

### 3.3 认证API

```java
@RestController
@RequestMapping("/api/v1/auth")
class AuthController {
    // POST /api/v1/auth/login - 登录
    // POST /api/v1/auth/refresh - 刷新Token
    // POST /api/v1/auth/logout - 登出
    // POST /api/v1/auth/mfa/enable - 启用MFA
    // POST /api/v1/auth/mfa/verify - 验证MFA
}
```

---

## 四、执行引擎架构

### 4.1 执行引擎配置

```java
@Configuration
public class ExecutionEngineConfig {
    @Bean(name = "executionExecutor")
    public ExecutorService executionExecutor() {
        return new ThreadPoolExecutor(
            4, 10, 60L, TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(1000),
            new ThreadFactoryBuilder().setNamePrefix("workflow-exec-").build(),
            new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }
}
```

### 4.2 执行上下文

```java
// 执行上下文（Redis存储，TTL 24h）
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

// 内置节点类型
enum NodeType {
    START,      // 开始节点
    END,        // 结束节点
    HTTP,       // HTTP请求节点
    DELAY,      // 延迟节点
    CONDITION,  // 条件分支（延后P1）
    PARALLEL,   // 并行执行（延后P1）
}
```

### 4.4 执行流程

```
1. API接收到执行请求
2. 生成execution_id，写入workflow_runs (PENDING)
3. 发送执行任务到Redis Stream
4. Worker消费任务，状态变更为RUNNING
5. 构建DAG，拓扑排序确定执行顺序
6. 依次执行各节点:
   - 收集输入（从上下文/变量/上游输出）
   - 执行节点逻辑
   - 写入node_runs
   - 更新上下文变量
7. 处理分支/条件/并行
8. 流程结束，更新workflow_runs (SUCCESS/FAILED)
```

---

## 五、安全设计

### 5.1 认证授权

```java
// JWT认证过滤器
@Component
@Order(1)
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) {
        String authHeader = request.getHeader("Authorization");
        String token = extractToken(authHeader);

        if (token != null) {
            try {
                var claims = jwtService.validate(token);
                if (jwtBlacklistService.isBlacklisted(claims.getJti())) {
                    sendUnauthorized(response, "Token has been revoked");
                    return;
                }
                var userDetails = new JwtUserDetails(claims);
                var authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities()
                );
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtException e) {
                log.warn("Invalid JWT: {}", e.getMessage());
            }
        }
        filterChain.doFilter(request, response);
    }
}
```

**Token配置：**
```yaml
auth:
  jwt:
    access-token:
      expiration: 900  # 15分钟
      algorithm: HS256
    refresh-token:
      expiration: 604800  # 7天
      storage: redis
      rotation: true

  password:
    algorithm: bcrypt
    rounds: 12
    min-length: 12
    history: 5

  lockout:
    threshold: 5      # 连续5次失败
    duration: 1800    # 锁定30分钟
```

### 5.2 权限模型

| 角色 | 描述 | 工作流权限 | 执行权限 | 管理权限 |
|------|------|------------|----------|----------|
| Owner | 所有者 | 全部 | 全部 | 全部 |
| Admin | 管理员 | 全部 | 全部 | 团队管理 |
| Editor | 编辑者 | 增删改查 | 执行/暂停/停止 | 无 |
| Viewer | 查看者 | 仅查看 | 仅查看执行状态 | 无 |

### 5.3 表达式沙箱

```java
@Service
public class SafeExpressionEngine {
    public SafeExpressionEngine() {
        this.engine = SandboxedExpressionEngine.builder()
            .allowedFunctions("json.*", "math.*", "string.*", "date.*", "logic.*")
            .blockedPatterns(
                "System\\..*",
                "Runtime\\..*",
                "exec\\s*\\(",
                "eval\\s*\\(",
                "ClassLoader\\..*",
                "ProcessBuilder\\..*"
            )
            .maxEvaluationTime(Duration.ofSeconds(5))
            .maxExpressionLength(1000)
            .maxVariables(100)
            .build();
    }
}
```

### 5.4 HTTP节点安全

```java
@Service
public class SecureHttpNodeExecutor {
    @Value("${http.node.block.internal:true}")
    private boolean blockInternal;

    @Value("${http.node.allowedDomains:}")
    private List<String> allowedDomains;

    @Override
    public NodeOutput execute(HttpNodeConfig config) {
        String url = config.getUrl();

        // 1. 检查内部IP访问
        if (blockInternal && isInternalIp(extractHost(url))) {
            throw new SecurityException("Internal IP access denied");
        }

        // 2. 检查域名白名单（如果配置）
        if (!allowedDomains.isEmpty() && !isDomainAllowed(url)) {
            throw new SecurityException("Domain not in whitelist");
        }

        return doExecute(config);
    }

    private boolean isInternalIp(String host) {
        InetAddress address = InetAddress.getByName(host);
        return address.isSiteLocalAddress()
            || address.isLoopbackAddress()
            || address.isLinkLocalAddress();
    }
}
```

### 5.5 Webhook安全

```java
@Service
public class WebhookSignatureService {
    private static final String SIGNATURE_ALGORITHM = "HmacSHA256";
    private static final long TIMESTAMP_TOLERANCE = 300000; // 5分钟

    public boolean verify(WebhookRequest request) {
        // 1. 时间戳验证
        long timestamp = request.getTimestamp();
        if (Math.abs(System.currentTimeMillis() - timestamp) > TIMESTAMP_TOLERANCE) {
            return false;
        }

        // 2. Nonce防重放
        String nonceKey = "webhook:" + request.getWebhookId() + ":" + request.getNonce();
        if (redisTemplate.hasKey(nonceKey)) {
            return false;
        }

        // 3. 签名验证
        String signature = request.getSignature();
        String expectedSignature = generateSignature(...);

        if (!secureCompare(signature, expectedSignature)) {
            return false;
        }

        // 4. 记录Nonce（24小时过期）
        redisTemplate.opsForValue().set(nonceKey, "1", 24, TimeUnit.HOURS);
        return true;
    }
}
```

### 5.6 安全配置矩阵

```yaml
# 执行引擎安全配置
execution:
  engine:
    expression:
      sandbox-enabled: true
      max-evaluation-time: 5000
      max-memory-mb: 100
      max-expression-length: 1000
      max-variables: 100
      allowed-functions:
        - json.*
        - math.*
        - string.*
        - date.*
        - logic.*
      blocked-patterns:
        - System\.
        - Runtime\.
        - ProcessBuilder\.

    http-node:
      block-internal-ip: true
      allowed-domains: []
      max-timeout: 30000
      max-response-size: 10485760

    code-node:
      enabled: false  # MVP禁用

# API安全配置
api:
  rate-limit:
    default: 100/minute, 2000/hour
    login: 5/minute, 20/hour
    execution: 10/minute, 200/hour
    webhook: 100/minute, 2000/hour

# 数据安全配置
data:
  encryption:
    algorithm: AES-256-GCM
    key-management: kms
  tls:
    enabled: true
    protocol: TLSv1.3
```

**相关安全文档：**
- `/design/design1.0/security_1.1.md` - 第一轮安全设计
- `/design/design1.0/security_1.2.md` - 第二轮安全审查
- `/design/design1.0/security_1.3.md` - 第三轮安全加固

---

## 六、TDD测试指导

### 6.1 测试分层策略

```
┌─────────────────────────────────────────────────────┐
│                   E2E 测试层                         │
│         (Playwright - 关键用户旅程)                 │
├─────────────────────────────────────────────────────┤
│                  集成测试层                          │
│      (Spring Boot Test - API + 执行引擎)            │
├─────────────────────────────────────────────────────┤
│                   单元测试层                         │
│        (JUnit 5 + Mockito - 核心逻辑)              │
└─────────────────────────────────────────────────────┘
```

### 6.2 单元测试策略

| 模块 | 测试重点 | 测试框架 |
|------|----------|----------|
| WorkflowService | CRUD、版本管理、发布逻辑 | JUnit 5 + Mockito |
| ExecutionEngine | 状态机转换、队列调度 | JUnit 5 + Mockito |
| NodeExecutor | HTTP/LLM/Delay节点执行 | JUnit 5 |
| PermissionService | RBAC决策逻辑 | JUnit 5 |
| WebhookSignatureService | 签名验证、限流逻辑 | JUnit 5 |

### 6.3 集成测试策略

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

### 6.4 多租户测试隔离

```java
@Component
public class MultiTenantTestHelper {
    private final ThreadLocal<String> currentTenant = new ThreadLocal<>();

    public void setTenant(String tenantId) {
        TenantContext.setTenantId(tenantId);
        currentTenant.set(tenantId);
    }

    public void clearTenant() {
        TenantContext.clear();
        currentTenant.remove();
    }

    public Workflow createTestWorkflow(String name) {
        String tenantId = currentTenant.get();
        return Workflow.builder()
            .name(name)
            .tenantId(tenantId)
            .definition(JsonNodeFactory.instance.objectNode())
            .status(WorkflowStatus.DRAFT)
            .build();
    }
}
```

### 6.5 安全测试用例

| 测试场景 | 测试方法 | 预期结果 |
|----------|----------|----------|
| 暴力破解防护 | 连续5次错误密码 | 账号锁定30分钟 |
| Token伪造 | 修改Token payload | 返回401 |
| Token过期 | 使用过期Token | 返回401 |
| 权限提升 | 普通用户访问管理员API | 返回403 |
| 跨租户访问 | Tenant-A用户访问Tenant-B资源 | 返回403/404 |
| SQL注入 | 输入 `' OR '1'='1` | 验证失败 |
| XSS | 输入 `<script>alert(1)</script>` | 验证失败或转义 |
| 内部IP访问 | HTTP节点URL `http://192.168.1.1` | 执行被拒绝 |
| Webhook签名 | 使用正确签名 | 通过验证 |
| Webhook重放 | 重复请求同一Webhook | 返回401 |

### 6.6 执行引擎测试配置

```java
// Vert.x测试适配层（已废弃，改用ThreadPool）
// 执行引擎测试配置 - application-test.yml
spring:
  execution:
    test:
      timeout-seconds: 30
      max-retries: 1
      enable-async-logging: true
```

### 6.7 测试优先级矩阵

| MVP功能 | 测试类型 | 覆盖率目标 | 优先级 |
|---------|----------|------------|--------|
| 可视化编辑器 | 单元 + 集成 | 80% | P0 |
| 基础节点 (START/END/HTTP/DELAY) | 单元 + 集成 | 85% | P0 |
| 变量系统 | 单元 | 85% | P0 |
| 执行引擎 | 单元 + 集成 | 80% | P0 |
| Webhook触发 | 集成 | 90% | P0 |
| 定时触发 | 集成 | 80% | P0 |
| 手动触发 | 集成 | 80% | P0 |
| JWT认证 | 单元 + 集成 | 90% | P0 |
| RBAC权限 | 单元 | 95% | P0 |
| 多租户隔离 | 集成 | 90% | P0 |
| 条件分支 | - | - | P1延后 |
| 并行执行 | - | - | P1延后 |

### 6.8 CI/CD测试流水线

```yaml
# .github/workflows/test.yml
name: Test Pipeline
on: [push, pull_request]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
      - name: Run unit tests
        run: mvn test -Dtest=*Test -DfailIfNoTests=false
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v3
      - name: Run integration tests
        run: mvn verify -Dspring.profiles.active=integration

  security-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run security tests
        run: mvn test -Dtest=*SecurityTest,*PermissionTest
      - name: Run dependency check
        run: mvn dependency:analyze
```

**相关TDD文档：**
- `/design/design1.0/tdd_1.1.md` - 第一轮TDD设计
- `/design/design1.0/tdd_1.2.md` - 第二轮TDD审查
- `/design/design1.0/tdd_1.3.md` - 第三轮TDD完善

---

## 七、相关Skill引用

### 7.1 backend-patterns

本地路径：`/Users/swufan/.claude/skills/backend-patterns/SKILL.md`

**适用场景：**
- RESTful API设计模式
- Repository/Service层模式
- 中间件模式
- 数据库优化（N+1查询、事务）
- Redis缓存策略
- JWT认证授权
- 错误处理模式
- 重试与指数退避

### 7.2 springboot-patterns

本地路径：`/Users/swufan/.claude/skills/springboot-patterns/SKILL.md`

**适用场景：**
- Spring Boot REST API结构
- Repository Pattern (Spring Data JPA)
- Service层事务管理
- DTOs和Validation
- 全局异常处理
- Caching (@Cacheable)
- 异步处理 (@Async)
- Logging (SLF4J)
- Rate Limiting (Bucket4j)
- 生产环境最佳实践

### 7.3 go-review (不适用)

本地路径：`/Users/swufan/.claude/agents/go-reviewer.md`

**说明：** 当前项目使用Java/Spring Boot技术栈，go-review适用于Go语言代码审查，本项目不需要。

---

## 八、后端开发子Agent建议

### 8.1 建议的Sub-Agent

| Agent | 用途 | 使用时机 |
|-------|------|----------|
| **planner** | 实施计划制定 | 复杂功能实现前 |
| **tdd-guide** | 测试驱动开发指导 | 新功能开发时 |
| **code-reviewer** | 代码审查 | 代码编写完成后 |
| **security-reviewer** | 安全分析 | 涉及认证、授权、数据加密时 |
| **build-error-resolver** | 构建错误解决 | 构建失败时 |

### 8.2 后端开发工作流

```
1. 规划阶段
   - 使用 planner agent 创建实施计划
   - 识别依赖和风险
   - 分解为可管理的步骤

2. 开发阶段
   - 使用 tdd-guide agent
   - 编写测试 (RED)
   - 实现功能 (GREEN)
   - 重构 (IMPROVE)
   - 验证80%+覆盖率

3. 审查阶段
   - 使用 code-reviewer agent
   - 解决CRITICAL和HIGH问题
   - 修复MEDIUM问题

4. 安全审查
   - 使用 security-reviewer agent
   - 验证无硬编码密钥
   - 检查输入验证
   - 确认加密实现

5. 提交
   - 详细commit message
   - 遵循conventional commits格式
```

---

## 九、相关文件索引

### 设计文档

| 文件 | 版本 | 内容 |
|------|------|------|
| architect_1.3.md | v1.3 | 第三轮架构收束 |
| architect_1.2.md | v1.2 | 第二轮架构完善 |
| architect_1.1.md | v1.1 | 第一轮架构设计 |
| security_1.3.md | v1.3 | 第三轮安全加固 |
| security_1.2.md | v1.2 | 第二轮安全审查 |
| security_1.1.md | v1.1 | 第一轮安全设计 |
| tdd_1.3.md | v1.3 | 第三轮TDD完善 |
| tdd_1.2.md | v1.2 | 第二轮TDD审查 |
| tdd_1.1.md | v1.1 | 第一轮TDD设计 |
| plan_1.3.md | v1.3 | 第三轮规划 |
| plan_1.2.md | v1.2 | 第二轮规划 |
| plan_1.1.md | v1.1 | 第一轮规划 |

### 技能文件

| 文件 | 路径 | 用途 |
|------|------|------|
| backend-patterns | ~/.claude/skills/backend-patterns/SKILL.md | 后端通用模式 |
| springboot-patterns | ~/.claude/skills/springboot-patterns/SKILL.md | Spring Boot模式 |
| go-reviewer | ~/.claude/agents/go-reviewer.md | Go代码审查（不适用） |

---

## 十、关键决策汇总

| 决策项 | 最终选择 | 文档来源 |
|--------|----------|----------|
| 执行引擎 | ThreadPool | architect_1.3 |
| 服务数量 | 4个 | architect_1.3 |
| 消息队列 | Redis Stream | architect_1.3 |
| 插件上传 | MVP禁用 | architect_1.3 |
| 条件分支 | 延后P1 | architect_1.3 |
| Webhook存储 | 哈希+盐值 | architect_1.2 |
| 表达式沙箱 | SafeExpressionEngine | architect_1.2 |
| HTTP节点安全 | 禁止内部IP | architect_1.2 |
| 测试覆盖率目标 | 80% | tdd_1.3 |
| JWT有效期 | 15分钟 | security_1.1 |
| 密码哈希 | BCrypt | security_1.1 |
| 账号锁定 | 5次/30分钟 | security_1.1 |

---

**文档版本**: 2.0
**创建日期**: 2026-03-29
**来源**: design1.0 所有后端相关文档整合
**维护领域**: 后端架构、技术栈、API设计、数据模型、TDD指导、安全设计
