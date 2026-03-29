# 工作流引擎 TDD 设计 v1.3（第三轮设计）

## 概述

本文档基于第二轮设计产出，对安全设计（security_1.2.md）、架构设计（architect_1.2.md）和功能规划（plan_1.2.md）中与测试相关的决策进行评估和更新，聚焦于：

1. 第二轮提出的安全问题是否在测试设计中得到覆盖
2. 架构调整对测试基础设施的影响
3. MVP 范围调整后的测试优先级
4. 测试数据管理和工具类完善

---

## 一、第二轮关键决策对测试的影响

### 1.1 安全决策与测试映射

| 安全决策 | 来源 | 测试影响 | 测试优先级 |
|----------|------|----------|------------|
| MVP 禁用自定义插件 | architect_1.2 | 减少插件热加载测试 | P1 延后 |
| MVP 禁用代码执行节点 | architect_1.2 | 减少代码执行器测试 | P1 延后 |
| 条件分支延后至 P1 | architect_1.2 | 减少条件表达式测试 | P1 延后 |
| @Encrypted 注解加密 | architect_1.2 | 增加加密服务测试 | P0 |
| Webhook secret 哈希存储 | security_1.2 | 调整 webhook 测试 | P0 |
| 内部 IP 访问阻止 | security_1.2 | 增加 HTTP 节点安全测试 | P0 |
| 表达式沙箱 | security_1.2 | 增加沙箱执行测试 | P0 |

### 1.2 架构决策与测试映射

| 架构决策 | 来源 | 测试影响 | 应对策略 |
|----------|------|----------|----------|
| Vert.x 执行引擎 | architect_1.1 | 异步测试复杂 | 使用 TestContext + 小池配置 |
| 多租户隔离 | architect_1.1 | 测试数据隔离 | TenantContext 前缀隔离 |
| Redis Streams 队列 | architect_1.1 | 队列交互测试 | 使用 testcontainers-mock |
| PostgreSQL + JSONB | architect_1.1 | 数据持久化测试 | H2 内存数据库 |

---

## 二、第二轮问题解决评估

### 2.1 安全问题解决状态

| 问题 | 解决状态 | 测试覆盖建议 |
|------|----------|--------------|
| Webhook secret 明文存储 | **已解决** (哈希+盐值) | 测试哈希验证流程 |
| 插件热加载安全 | **已解决** (MVP 禁用) | 无需测试 |
| 表达式执行无沙箱 | **已解决** (沙箱+白名单) | 完整沙箱边界测试 |
| HTTP 节点内部 IP 访问 | **已解决** (默认阻止) | 验证拦截逻辑 |
| 服务间无 mTLS | **未解决** (P1) | 暂不测试 |

### 2.2 架构问题解决状态

| 问题 | 解决状态 | 测试覆盖建议 |
|------|----------|--------------|
| Vert.x 异步测试困难 | **部分解决** (测试适配层) | 使用 VertxTestContext |
| 多租户测试隔离 | **已解决** (TenantContext) | 使用租户前缀隔离 |
| 状态机覆盖率 90% | **已调整** (目标 80%) | 按新目标设计 |

---

## 三、测试基础设施更新设计

### 3.1 垂直测试配置

基于 architect_1.2 的执行引擎测试架构设计，更新测试基础设施：

```java
// 执行引擎测试配置 - application-test.yml
spring:
  vertx:
    worker-pool-size: 2
    event-loop-pool-size: 2
    blocked-thread-check-interval: 1000

execution:
  test:
    timeout-seconds: 30
    max-retries: 1
    enable-async-logging: true
```

```java
// Vert.x 测试适配层
@Component
@Primary
public class TestVertxProvider {

    @Bean
    public Vertx vertx() {
        VertxOptions options = new VertxOptions()
            .setWorkerPoolSize(2)
            .setEventLoopPoolSize(2)
            .setBlockedThreadCheckInterval(1000)
            .setMaxEventLoopExecuteTime(10)
            .setMaxWorkerExecuteTime(10);

        Vertx vertx = Vertx.vertx(options);

        // 注册测试完成回调
        Runtime.getRuntime().addShutdownHook(new Thread(vertx::close));

        return vertx;
    }
}
```

### 3.2 多租户测试配置

```java
// 多租户测试工具类
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

    // 创建隔离测试数据
    public Workflow createTestWorkflow(String name) {
        String tenantId = currentTenant.get();
        return Workflow.builder()
            .name(name)
            .tenantId(tenantId)
            .definition(JsonNodeFactory.instance.objectNode())
            .status(WorkflowStatus.DRAFT)
            .build();
    }

    // 生成唯一的租户 ID 前缀
    public String generateUniqueTenantId() {
        return "test-tenant-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
```

### 3.3 安全测试配置

```yaml
# application-security-test.yml
spring:
  security:
    oauth2:
      jwt:
        secret: "test-secret-key-for-testing-only-min-256-bits-long"
        issuer-uri: "http://localhost:8080"

test:
  security:
    cleanup:
      mode: ALWAYS
    jwt:
      test-token-expiry: 3600
    webhook:
      allow-replay-in-test: true  # 测试环境允许重放
```

```java
// 安全测试工具类
@Component
public class SecurityTestUtils {

    @Autowired
    private ObjectMapper objectMapper;

    // 生成测试用 JWT
    public String generateTestToken(User user, String secret) {
        return Jwts.builder()
            .subject(user.getId().toString())
            .claim("tenantId", user.getTenantId())
            .claim("roles", user.getRoles())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + 3600000))
            .signWith(SignatureAlgorithm.HS256, secret)
            .compact();
    }

    // 生成恶意输入测试数据
    public static Stream<Arguments> maliciousInputs() {
        return Stream.of(
            Arguments.of("SQL注入", "' OR '1'='1"),
            Arguments.of("XSS", "<script>alert(1)</script>"),
            Arguments.of("EL表达式", "{{__constructor__}}"),
            Arguments.of("命令注入", "; cat /etc/passwd"),
            Arguments.of("路径遍历", "../../etc/passwd")
        );
    }

    // 验证响应已脱敏
    public void assertNoSensitiveData(String responseBody) {
        assertThat(responseBody).doesNotContain("password");
        assertThat(responseBody).doesNotContain("api_key");
        assertThat(responseBody).doesNotContain("secret");
    }
}
```

### 3.4 加密测试配置

```java
// 加密服务测试
@SpringBootTest
class EncryptionServiceTest {

    @Autowired
    private EncryptionService encryptionService;

    @Test
    void encrypt_shouldProduceRandomCiphertext() {
        String plaintext = "test";
        String c1 = encryptionService.encrypt(plaintext);
        String c2 = encryptionService.encrypt(plaintext);

        // 相同明文应产生不同密文（随机 IV）
        assertThat(c1).isNotEqualTo(c2);
    }

    @Test
    void encrypt_withDifferentKeys_shouldFail() {
        String plaintext = "test";
        String keyId1 = encryptionService.getCurrentKeyId();
        String keyId2 = "old-key-id";

        String ciphertext = encryptionService.encrypt(plaintext);

        // 使用不同密钥解密应失败
        assertThatThrownBy(() -> encryptionService.decrypt(ciphertext, keyId2))
            .isInstanceOf(DecryptionException.class);
    }

    @Test
    void decrypt_withCorrectKey_shouldSucceed() {
        String plaintext = "sensitive-data";
        String ciphertext = encryptionService.encrypt(plaintext);

        String decrypted = encryptionService.decrypt(ciphertext);
        assertThat(decrypted).isEqualTo(plaintext);
    }
}
```

---

## 四、MVP 测试范围与优先级

### 4.1 MVP 测试范围（基于 plan_1.2 调整）

| MVP 功能 | 测试类型 | 覆盖率目标 | 优先级 |
|----------|----------|------------|--------|
| 可视化编辑器 | 单元 + 集成 | 80% | P0 |
| 基础节点 (START/END/HTTP/DELAY) | 单元 + 集成 | 85% | P0 |
| 变量系统 | 单元 | 85% | P0 |
| 执行引擎 | 单元 + 集成 | 80% | P0 |
| Webhook 触发 | 集成 | 90% | P0 |
| 定时触发 | 集成 | 80% | P0 |
| 手动触发 | 集成 | 80% | P0 |
| JWT 认证 | 单元 + 集成 | 90% | P0 |
| RBAC 权限 | 单元 | 95% | P0 |
| 多租户隔离 | 集成 | 90% | P0 |
| 条件分支 | - | - | P1 延后 |
| 并行执行 | - | - | P1 延后 |
| 自定义插件 | - | - | P1 禁用 |
| 代码执行节点 | - | - | P1 禁用 |

### 4.2 测试优先级矩阵

```typescript
// 测试优先级定义
const TestPriority = {
  P0_MUST: {
    label: '必须测试',
    coverage: 85,
    timeout: 30,
    runOnCI: true
  },
  P1_HIGH: {
    label: '高优先级',
    coverage: 80,
    timeout: 60,
    runOnCI: true
  },
  P2_MEDIUM: {
    label: '中优先级',
    coverage: 70,
    timeout: 120,
    runOnCI: false
  },
  P3_LOW: {
    label: '低优先级',
    coverage: 50,
    timeout: 300,
    runOnCI: false
  }
};
```

---

## 五、测试用例清单（更新版）

### 5.1 安全测试用例（P0 必须）

| 测试域 | 测试用例 | 测试方法 | 预期结果 |
|--------|----------|----------|----------|
| 认证 | 无效 token 访问 API | 单元 | 返回 401 |
| 认证 | 过期 token 刷新 | 集成 | 返回 401 |
| 认证 | 暴力破解防护 | 集成 | 5次失败锁定30分钟 |
| 授权 | Editor 删除工作流 | 单元 | 拒绝访问 |
| 授权 | Viewer 执行工作流 | 单元 | 拒绝访问 |
| 授权 | 跨租户访问 | 集成 | 返回 403 |
| 限流 | 超过速率限制 | 集成 | 返回 429 |
| 输入 | SQL 注入拦截 | 单元 | 验证失败 |
| 输入 | XSS payload 拦截 | 单元 | 验证失败或转义 |
| 输入 | EL 表达式注入 | 单元 | 拒绝执行 |
| 加密 | 密钥轮换 | 单元 | 成功切换 |
| 加密 | 密文随机性 | 单元 | 每次密文不同 |
| Webhook | 签名验证 | 集成 | 通过/拒绝 |
| Webhook | 重放攻击防护 | 集成 | 拒绝重复请求 |

### 5.2 HTTP 节点安全测试用例（P0 必须）

| 测试用例 | 测试方法 | 预期结果 |
|----------|----------|----------|
| 内部 IP 访问被阻止 | 单元 | 抛出 SecurityException |
| 内部域名访问被阻止 | 单元 | 抛出 SecurityException |
| 合法外部 URL 允许访问 | 单元 | 正常执行 |
| 恶意 URL 模式拦截 | 单元 | 拒绝执行 |
| 超时配置生效 | 集成 | 超时后报错 |
| 响应大小限制 | 集成 | 超过限制被截断 |

### 5.3 表达式沙箱测试用例（P0 必须）

| 测试用例 | 测试方法 | 预期结果 |
|----------|----------|----------|
| 允许的函数正常执行 | 单元 | 返回结果 |
| System.* 调用被阻止 | 单元 | 抛出 SecurityException |
| Runtime.* 调用被阻止 | 单元 | 抛出 SecurityException |
| 执行超时限制 | 单元 | 超时后终止 |
| 最大表达式长度限制 | 单元 | 超长被拒绝 |
| 内存限制 | 单元 | 超限被终止 |

### 5.4 架构相关测试用例

| 测试域 | 测试用例 | 测试类型 | 优先级 |
|--------|----------|----------|--------|
| 状态机 | 所有核心状态转换 | 单元 | P0 |
| 状态机 | 无效转换被拒绝 | 单元 | P0 |
| 状态机 | 边界路径转换 | 单元 | P1 |
| 异步 | 执行超时处理 | 集成 | P0 |
| 异步 | 并发执行隔离 | 集成 | P1 |
| 多租户 | 数据隔离 | 集成 | P0 |
| 多租户 | 跨租户访问拒绝 | 集成 | P0 |

### 5.5 功能测试用例

| 功能模块 | 测试用例 | 优先级 |
|----------|----------|--------|
| 节点执行 | HTTP GET/POST/PUT/DELETE/PATCH | P0 |
| 节点执行 | HTTP 超时处理 | P0 |
| 节点执行 | HTTP 错误响应处理 | P0 |
| 变量系统 | 变量插值安全 | P0 |
| 变量系统 | 变量作用域 | P1 |
| Webhook | 签名验证 | P0 |
| Webhook | 时间戳验证 | P0 |
| 定时触发 | Cron 表达式解析 | P0 |
| 手动触发 | 权限检查 | P0 |

---

## 六、测试数据管理

### 6.1 测试 Fixtures 定义

```typescript
// frontend/test-utils/fixtures/workflow.ts
export const workflowFixtures = {
  minimal: {
    id: 'wf-minimal',
    name: 'Minimal Workflow',
    nodes: [
      { id: 'start', type: 'start', position: { x: 0, y: 0 } },
      { id: 'end', type: 'end', position: { x: 200, y: 0 } }
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'end' }
    ]
  },
  httpNode: {
    id: 'wf-http',
    name: 'HTTP Workflow',
    nodes: [
      { id: 'start', type: 'start', position: { x: 0, y: 0 } },
      {
        id: 'http',
        type: 'http',
        position: { x: 200, y: 0 },
        config: {
          url: 'https://api.example.com/data',
          method: 'GET',
          timeout: 5000
        }
      },
      { id: 'end', type: 'end', position: { x: 400, y: 0 } }
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'http' },
      { id: 'e2', source: 'http', target: 'end' }
    ]
  },
  delayNode: {
    id: 'wf-delay',
    name: 'Delay Workflow',
    nodes: [
      { id: 'start', type: 'start', position: { x: 0, y: 0 } },
      {
        id: 'delay',
        type: 'delay',
        position: { x: 200, y: 0 },
        config: { duration: 1000 }
      },
      { id: 'end', type: 'end', position: { x: 400, y: 0 } }
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'delay' },
      { id: 'e2', source: 'delay', target: 'end' }
    ]
  }
};

// frontend/test-utils/fixtures/user.ts
export const userFixtures = {
  admin: {
    id: 'user-admin',
    email: 'admin@test.com',
    roles: ['admin'],
    tenantId: 'tenant-1'
  },
  editor: {
    id: 'user-editor',
    email: 'editor@test.com',
    roles: ['editor'],
    tenantId: 'tenant-1'
  },
  viewer: {
    id: 'user-viewer',
    email: 'viewer@test.com',
    roles: ['viewer'],
    tenantId: 'tenant-1'
  }
};
```

```java
// 后端测试 fixtures
public class TestFixtures {

    public static Workflow createWorkflow(String tenantId) {
        return Workflow.builder()
            .name("Test Workflow")
            .tenantId(tenantId)
            .definition(JsonNodeFactory.instance.objectNode()
                .put("nodes", JsonNodeFactory.instance.arrayNode())
                .put("edges", JsonNodeFactory.instance.arrayNode()))
            .status(WorkflowStatus.DRAFT)
            .version(1)
            .build();
    }

    public static User createUser(String tenantId, String... roles) {
        return User.builder()
            .email("test-" + UUID.randomUUID() + "@test.com")
            .tenantId(tenantId)
            .roles(Arrays.asList(roles))
            .status(UserStatus.ACTIVE)
            .build();
    }

    public static Webhook createWebhook(String tenantId) {
        return Webhook.builder()
            .tenantId(tenantId)
            .name("Test Webhook")
            .url("https://example.com/webhook")
            .secretSalt(generateSalt())
            .secretHash(hashSecret("test-secret", generateSalt()))
            .build();
    }
}
```

### 6.2 测试数据清理策略

```java
// 测试数据清理器
@Component
public class TestDataCleanup {

    @Autowired
    private EntityManager entityManager;

    @Transactional
    public void cleanAll() {
        entityManager.createNativeQuery("DELETE FROM executions").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM workflow_versions").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM workflows").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM webhooks").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM users").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM teams").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM tenants").executeUpdate();
    }

    @Sql("/test-data/cleanup.sql")
    public void cleanWithSql() {
        // 使用 SQL 脚本清理
    }
}
```

---

## 七、CI/CD 测试流水线

### 7.1 测试阶段设计

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
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-retries 5
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
        run: mvn dependency: analyze

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
          with:
            node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run E2E tests
        run: npm run test:e2e
```

### 7.2 测试覆盖率要求

| 测试类型 | 最低覆盖率 | 报告生成 |
|----------|------------|----------|
| 单元测试 | 80% | JaCoCo |
| 集成测试 | 70% | JaCoCo |
| 安全测试 | 85% | 自定义报告 |
| E2E 测试 | 核心流程覆盖 | Playwright |

---

## 八、TDD 实施检查清单

### 8.1 开发前检查点

- [ ] 测试框架选型完成（JUnit 5 + Mockito + Testcontainers）
- [ ] 测试配置文件就绪（application-test.yml）
- [ ] Vert.x 测试适配层实现
- [ ] 多租户测试工具类实现
- [ ] 安全测试工具类实现
- [ ] 测试 Fixtures 定义完成
- [ ] CI 流程配置完成

### 8.2 开发中检查点

- [ ] 每个 P0 功能先写测试
- [ ] 测试覆盖率实时监控
- [ ] 失败的测试在 24 小时内修复
- [ ] 代码审查包含测试审查
- [ ] 安全测试在 CI 中运行

### 8.3 开发后检查点

- [ ] 所有 P0 测试通过
- [ ] 覆盖率达标（80%）
- [ ] 安全测试通过
- [ ] E2E 核心流程通过
- [ ] 测试文档更新

---

## 九、相关文件

- `/design/design1.0/tdd_1.1.md` - 第一轮 TDD 设计
- `/design/design1.0/tdd_1.2.md` - 第二轮 TDD 设计
- `/design/design1.0/security_1.2.md` - 安全设计（第二轮审查）
- `/design/design1.0/architect_1.2.md` - 架构设计（第二轮完善）
- `/design/design1.0/plan_1.2.md` - 功能规划（第二轮评审）

---

## 十、待讨论问题

1. **Vert.x 测试适配层实现细节**：是否需要独立的测试模块来隔离 Vert.x 依赖？
2. **表达式沙箱测试**：是否需要引入专门的沙箱测试框架？
3. **E2E 测试范围**：MVP 阶段需要覆盖哪些核心用户流程？
4. **测试数据脱敏**：生产数据导入测试环境时的脱敏规则是什么？

---

**文档版本**: 1.3
**创建日期**: 2026-03-29
**作者**: TDD Architecture Design