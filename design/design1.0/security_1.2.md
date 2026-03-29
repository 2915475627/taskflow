# 工作流引擎安全架构设计 v1.2（第二轮安全审查）

## 概述

本文档基于第一轮安全设计（security_1.1.md）的产出，从安全角度对TDD测试设计、架构设计和功能规划提出安全审查意见，并补充安全测试覆盖建议和安全加固方案。

---

## 一、对TDD测试设计的安全审查（tdd_1.1.md）

### 1.1 安全测试覆盖缺失

**问题描述：**
tdd_1.1.md 在测试基础设施中仅提及"安全扫描"（SonarQube、Snyk），但缺少具体的安全测试用例设计。

**安全挑战：**

| 缺失领域 | 风险等级 | 影响 |
|----------|----------|------|
| 认证流程单元测试 | HIGH | 无法验证登录/登出/Token刷新安全性 |
| 权限决策逻辑测试 | CRITICAL | 无法验证RBAC/ABAC正确性 |
| 输入验证测试 | HIGH | 无法验证SQL注入/XSS防护 |
| WebHook签名验证测试 | HIGH | 无法验证重放攻击防护 |
| 加密/脱敏功能测试 | MEDIUM | 无法验证敏感数据保护 |

### 1.2 安全测试补充建议

**建议在 TDD 中增加以下安全测试：**

```typescript
// 前端安全测试用例示例

// 1. XSS防护测试
describe('XSS Prevention', () => {
  it('should sanitize user input in workflow name', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(maliciousInput);
    expect(sanitized).not.toContain('<script>');
  });

  it('should escape variable interpolation output', () => {
    const userInput = '{{ malicious }}<img onerror=alert(1) src=x>';
    const escaped = escapeForHtml(userInput);
    expect(escaped).not.toContain('onerror');
  });
});

// 2. 权限边界测试
describe('Permission Boundary Tests', () => {
  it('should deny viewer to create workflow', async () => {
    const user = createUser({ role: 'viewer' });
    await expect(createWorkflow(user)).rejects.toThrow('Insufficient permission');
  });

  it('should deny cross-tenant access', async () => {
    const user = createUser({ tenantId: 'tenant-1' });
    const workflow = createWorkflow({ tenantId: 'tenant-2' });
    await expect(accessWorkflow(user, workflow)).rejects.toThrow('Access denied');
  });
});

// 3. 验证器安全测试
describe('Validation Security Tests', () => {
  it('should reject SQL injection in workflow name', () => {
    const maliciousInput = "'; DROP TABLE workflows; --";
    const result = validateWorkflowName(maliciousInput);
    expect(result.valid).toBe(false);
  });

  it('should reject dangerous URL in HTTP node', () => {
    const url = 'http://localhost:6379';
    const result = validateHttpNodeUrl(url);
    expect(result.valid).toBe(false);
  });
});
```

```java
// 后端安全测试用例示例

// 1. 认证测试
@SpringBootTest
class AuthenticationServiceTest {

    @Test
    void login_withValidCredentials_shouldReturnToken() { }

    @Test
    void login_withBruteForceAttempts_shouldBeBlocked() {
        // 连续5次失败后账号应被锁定
        for (int i = 0; i < 5; i++) {
            attemptLogin("user@test.com", "wrongpassword");
        }
        verify(accountLockService).lockAccount(any());
    }

    @Test
    void token_withExpiredTimestamp_shouldBeRejected() {
        String expiredToken = createTokenWithExpiration(Duration.ofMinutes(-1));
        assertThatThrownBy(() -> jwtService.validate(expiredToken))
            .isInstanceOf(JwtExpiredException.class);
    }
}

// 2. 权限测试
class PermissionServiceTest {

    @Test
    void checkPermission_viewerCannotDeleteWorkflow() {
        User viewer = createUser(Role.VIEWER);
        Workflow workflow = createWorkflow();
        assertThat(permissionService.canDelete(viewer, workflow)).isFalse();
    }

    @Test
    void checkPermission_crossTenantAccessDenied() {
        User user = createUser(TenantId.of("tenant-1"));
        Workflow workflow = createWorkflow(TenantId.of("tenant-2"));
        assertThatThrownBy(() -> permissionService.check(user, workflow, DELETE))
            .isInstanceOf(AccessDeniedException.class);
    }
}

// 3. WebHook安全测试
class WebhookSignatureServiceTest {

    @Test
    void verify_withValidSignature_shouldPass() {
        WebhookRequest request = createValidWebhookRequest();
        assertThat(signatureService.verify(request)).isTrue();
    }

    @Test
    void verify_withReplay_attempt_shouldFail() {
        WebhookRequest request = createValidWebhookRequest();
        signatureService.verify(request); // 第一次成功
        assertThat(signatureService.verify(request)).isFalse(); // 重放应失败
    }

    @Test
    void verify_withTamperedPayload_shouldFail() {
        WebhookRequest request = createValidWebhookRequest();
        request.setPayload("tampered-content");
        assertThat(signatureService.verify(request)).isFalse();
    }
}
```

### 1.3 安全覆盖率目标

建议在 TDD 覆盖率要求中增加：

| 模块 | 安全测试覆盖率目标 |
|------|-------------------|
| AuthenticationService | 90% |
| PermissionService | 95% |
| ValidationEngine | 90% |
| WebhookSignatureService | 95% |
| EncryptionService | 85% |
| VariableInterpolationService | 90% |

---

## 二、对架构设计的安全审查（architect_1.1.md）

### 2.1 数据模型安全漏洞

**问题 2.1.1: Webhook secret 明文存储**

```sql
-- 当前设计（不安全）
CREATE TABLE webhooks (
    id BIGSERIAL PRIMARY KEY,
    secret VARCHAR(255),  -- 明文存储！
    ...
);
```

**安全挑战：**
- 如果数据库被拖库，Webhook secret 将完全泄露
- 攻击者可以伪造任意Webhook调用

**建议修复：**
```sql
-- 修复方案：只存储哈希值
CREATE TABLE webhooks (
    id BIGSERIAL PRIMARY KEY,
    secret_hash VARCHAR(255) NOT NULL,  -- 存储SHA256哈希
    secret_salt VARCHAR(32) NOT NULL,   -- 存储盐值
    ...
);
```

**问题 2.1.2: API Key 明文存储**

当前设计缺少API Key的加密存储方案。建议：
```java
@Encrypted
@Column(name = "api_key_encrypted")
private String apiKey;
```

### 2.2 服务间通信安全缺失

**问题描述：**
architect_1.1.md 提到了服务间通信协议（HTTP/gRPC、Redis Stream、Kafka），但缺少：
- 服务间认证机制
- mTLS 配置
- 内部API鉴权

**安全挑战：**
- 如果内部网络被穿透，攻击者可以直接调用服务间API
- Redis/Kafka 缺乏认证可能导致数据泄露

**建议补充：**

```yaml
# 服务间通信安全配置
services:
  # 服务认证
  auth:
    mtls:
      enabled: true
      certDir: /certs
      verifyClient: true

  # Redis安全
  redis:
    password: ${REDIS_PASSWORD}
    tls:
      enabled: true

  # Kafka安全
  kafka:
    sasl:
      mechanism: SCRAM-SHA-512
      username: ${KAFKA_USER}
      password: ${KAFKA_PASSWORD}
    ssl:
      enabled: true
```

### 2.3 插件热加载安全风险

**问题描述：**
architect_1.1.md 提到 node-service 支持插件热加载，但缺少安全隔离方案。

**安全挑战：**
- 恶意插件可能导致代码执行
- 插件可能窃取敏感数据
- 插件可能引入安全漏洞

**建议增加：**

```java
// 插件安全隔离方案
@Configuration
public class PluginSecurityConfig {

    @Bean
    public PluginSandbox createSandbox() {
        return PluginSandbox.builder()
            .allowedPackages("com.taskflow.nodes.approved")
            .deniedClasses(
                "java.lang.ProcessBuilder",
                "java.lang.Runtime",
                "java.io.File",
                "java.nio.file.Files"
            )
            .maxMemoryMB(512)
            .maxCpuPercent(50)
            .networkBlocked(true)
            .build();
    }
}

// 插件执行隔离
public class IsolatedPluginExecutor implements NodeExecutor {

    @Override
    public NodeOutput execute(NodeInput input) {
        // 在受限沙箱中执行
        return sandbox.execute(pluginId, input);
    }
}
```

### 2.4 执行引擎安全边界

**问题描述：**
architect_1.1.md 提到执行引擎使用 Vert.x Worker Pool，但缺少：
- 表达式执行沙箱
- 外部资源访问限制
- 执行超时控制

**安全挑战：**
- 条件表达式可能执行恶意代码
- HTTP节点可能访问内部服务
- 代码执行节点可能导致RCE

**建议补充：**

```java
// 表达式执行沙箱
@Component
public class SafeExpressionEngine {

    private final SandboxedExpressionEngine engine;

    public SafeExpressionEngine() {
        this.engine = SandboxedExpressionEngine.builder()
            .whitelistedFunctions(
                "json", "math", "string", "date", "logic"
            )
            .blockedPatterns(
                "System.*", "Runtime.*", "ProcessBuilder.*",
                "ClassLoader.*", "java.lang.reflect.*"
            )
            .maxEvaluationTime(Duration.ofSeconds(5))
            .maxMemory(100 * 1024 * 1024) // 100MB
            .build();
    }

    public Object evaluate(String expression, Map<String, Object> context) {
        return engine.evaluate(expression, context);
    }
}

// HTTP节点安全限制
@Component
public class SecureHttpNodeExecutor {

    @Value("${http.node.blocked.internal: true}")
    private boolean blockInternal;

    @Value("${http.node.allowedDomains:}")
    private List<String> allowedDomains;

    @Override
    public NodeOutput execute(HttpNodeConfig config) {
        String url = config.getUrl();

        // 检查内部IP
        if (blockInternal && isInternalIp(url)) {
            throw new SecurityException("Internal IP access denied");
        }

        // 检查域名白名单
        if (!allowedDomains.isEmpty() && !isDomainAllowed(url)) {
            throw new SecurityException("Domain not in whitelist");
        }

        return doExecute(config);
    }
}
```

### 2.5 多租户隔离验证

**问题描述：**
architect_1.1.md 提到多租户使用 tenant_id + RLS，但缺少：
- RLS 策略验证测试
- 租户上下文传播验证
- 跨租户攻击防护

**建议增加验证用例：**

```sql
-- RLS策略验证测试
-- 测试：租户A无法读取租户B的数据
SELECT * FROM workflows WHERE tenant_id = 'tenant-b';
-- 应返回空结果

-- 测试：团队成员只能访问团队内资源
SELECT * FROM workflows WHERE team_id = 'team-1';
-- 应只返回team-1的资源
```

---

## 三、对功能规划的安全审查（plan_1.1.md）

### 3.1 条件表达式安全需求不明确

**问题描述：**
plan_1.1.md 提到"条件表达式"，但未详细说明安全要求。

**安全挑战：**
- 条件表达式可能被注入恶意代码
- 表达式可能访问敏感变量
- 表达式可能执行耗时操作

**建议补充安全需求：**

```
安全需求 - 条件表达式

1. 沙箱执行
   - 表达式必须在受限环境中执行
   - 禁止访问系统类、文件系统、网络

2. 函数白名单
   - 只允许：json(), math.*, string.*, date.*, logic.*
   - 禁止：eval, exec, require, import

3. 执行限制
   - 单次执行最大时长：5秒
   - 最大变量数：100个
   - 最大表达式长度：1000字符

4. 变量访问控制
   - 只能访问当前执行上下文的变量
   - 不能访问其他工作流的变量
   - 敏感变量（如API Key）不可访问
```

### 3.2 计费系统安全风险

**问题描述：**
plan_1.1.md 提到"计费系统"，但缺少安全设计。

**安全挑战：**
- 恶意用户可能伪造执行记录
- 计费数据可能被篡改
- 免费版限制可能被绕过

**建议增加安全设计：**

```java
// 计费防篡改设计
@Component
public class BillingSecurityService {

    public void recordExecution(ExecutionRecord record) {
        // 1. 验证执行记录签名
        verifyRecordSignature(record);

        // 2. 验证时间戳（防止重放）
        if (record.getTimestamp().isBefore(
            Instant.now().minus(Duration.ofHours(24)))) {
            throw new SecurityException("Record too old");
        }

        // 3. 验证执行确实发生（检查执行日志）
        verifyExecutionActuallyHappened(record);

        // 4. 写入防篡改存储
        appendToImmutableLog(record);
    }

    // 免费版限制验证
    public void checkQuota(String tenantId) {
        TenantQuota quota = getQuota(tenantId);

        // 检查日执行次数限制
        long todayExecutions = countTodayExecutions(tenantId);
        if (todayExecutions >= quota.getMaxExecutionsPerDay()) {
            throw new QuotaExceededException("Daily execution limit reached");
        }
    }
}
```

### 3.3 触发器安全设计缺失

**问题描述：**
plan_1.1.md 提到三种触发方式（Webhook、定时、手动），但缺少安全设计。

**安全挑战：**

| 触发类型 | 风险 |
|----------|------|
| Webhook | 重放攻击、签名伪造、恶意Payload |
| 定时触发 | 资源耗尽、敏感时间执行 |
| 手动触发 | 权限绕过、批量触发 |

**建议补充安全设计：**

```
安全需求 - 触发系统

1. Webhook触发
   - 必须签名验证（HMAC-SHA256）
   - 必须时间戳验证（5分钟窗口）
   - 必须Nonce防重放（24小时窗口）
   - 频率限制：100次/分钟

2. 定时触发
   - 最长间隔：24小时（防止过多触发）
   - 并发限制：同一工作流最多1个运行实例
   - 敏感时段可配置跳过（如维护窗口）

3. 手动触发
   - 必须权限检查（必须Editor及以上）
   - 批量执行需二次验证
   - 执行前确认提示
```

### 3.4 插件上传安全风险

**问题描述：**
plan_1.1.md 提到"插件上传与管理"，但缺少安全设计。

**安全挑战：**
- 恶意代码执行
- 依赖漏洞引入
- 恶意代码窃取数据

**建议补充安全设计：**

```
安全需求 - 插件系统

1. 上传限制
   - 只允许打包格式：.jar, .zip
   - 最大文件大小：10MB
   - 签名验证（开发者证书）

2. 沙箱运行
   - 禁止访问文件系统
   - 禁止访问网络（除非声明）
   - 禁止反射/类加载
   - 资源限制：内存512MB，CPU 50%

3. 审核机制
   - 上传需人工审核（生产环境）
   - 自动安全扫描（依赖漏洞检查）
   - 代码审查（敏感操作检测）

4. 隔离执行
   - 每个插件独立ClassLoader
   - 执行超时：60秒
   - 异常隔离：插件崩溃不影响核心系统
```

---

## 四、安全测试用例矩阵

基于上述审查，建议在安全测试中覆盖以下用例：

### 4.1 认证安全测试

| 测试场景 | 测试方法 | 预期结果 |
|----------|----------|----------|
| 暴力破解防护 | 连续5次错误密码 | 账号锁定30分钟 |
| Token伪造 | 修改Token payload | 返回401 |
| Token过期 | 使用过期Token | 返回401 |
| 权限提升 | 普通用户访问管理员API | 返回403 |
| 跨租户访问 | Tenant-A用户访问Tenant-B资源 | 返回404或403 |

### 4.2 输入安全测试

| 测试场景 | 测试方法 | 预期结果 |
|----------|----------|----------|
| SQL注入 | 输入 `' OR '1'='1` | 验证失败 |
| XSS | 输入 `<script>alert(1)</script>` | 验证失败或转义 |
| 命令注入 | 输入 `; cat /etc/passwd` | 验证失败 |
| 路径遍历 | 输入 `../../etc/passwd` | 验证失败 |
| 内部IP访问 | HTTP节点URL `http://192.168.1.1` | 执行被拒绝 |

### 4.3 数据安全测试

| 测试场景 | 测试方法 | 预期结果 |
|----------|----------|----------|
| 敏感数据日志 | 登录时记录密码 | 密码被脱敏 |
| 敏感数据响应 | API返回用户信息 | API Key被隐藏 |
| 租户数据隔离 | Tenant-A查询所有工作流 | 只返回Tenant-A数据 |
| 加密存储验证 | 检查数据库存储的密码 | 存储的是哈希值 |

### 4.4 WebHook安全测试

| 测试场景 | 测试方法 | 预期结果 |
|----------|----------|----------|
| 签名验证 | 使用正确签名 | 通过验证 |
| 签名伪造 | 修改签名 | 返回401 |
| 重放攻击 | 重复请求同一Webhook | 返回401 |
| 时间戳过期 | 使用5分钟前的请求 | 返回401 |
| Payload篡改 | 修改Body内容 | 返回401 |

---

## 五、安全配置补充

### 5.1 执行引擎安全配置

```yaml
# execution-engine security config
execution:
  engine:
    # 表达式安全
    expression:
      sandbox-enabled: true
      max-evaluation-time: 5000  # 5秒
      max-memory-mb: 100
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
        - ClassLoader\.

    # HTTP节点安全
    http-node:
      block-internal-ip: true
      allowed-domains: []  # 空=允许所有外部域名
      max-timeout: 30000
      max-response-size: 10485760  # 10MB

    # 代码执行节点
    code-node:
      enabled: false  # MVP阶段禁用
      allowed-languages: []  # 白名单语言
      sandbox-enabled: true

  # 执行资源限制
  resources:
    max-concurrent-per-workflow: 5
    max-execution-time: 3600000  # 1小时
    max-retry-count: 3
```

### 5.2 插件安全配置

```yaml
# plugin security config
plugin:
  security:
    # 上传限制
    upload:
      max-file-size-mb: 10
      allowed-formats:
        - jar
        - zip
      require-signature: true

    # 运行限制
    runtime:
      sandbox-enabled: true
      max-memory-mb: 512
      max-cpu-percent: 50
      network-blocked: true
      filesystem-blocked: true

    # 敏感操作审查
    sensitive-ops:
      require-approval:
        - network-access
        - file-write
        - process-spawn

    # 依赖扫描
    dependency-scan:
      enabled: true
      fail-on-high-cve: true
      fail-on-critical-cve: true
```

### 5.3 计费安全配置

```yaml
# billing security config
billing:
  # 防篡改
  anti-tamper:
    record-signing: true
    log-immutable: true
    verification-interval: 3600000  # 1小时

  # 配额检查
  quota:
    check-before-execution: true
    enforcement-mode: strict  # strict | lenient

  # 免费版限制
  free-tier:
    max-workflows: 3
    max-executions-per-day: 100
    max-team-members: 1
    features-limited:
      - webhooks
      - scheduled-tasks
      - custom-nodes
```

---

## 六、安全设计检查清单

### 6.1 认证授权

- [x] JWT Access Token 15分钟有效期
- [x] Refresh Token 7天有效期 + Redis存储
- [x] 密码 BCrypt 哈希存储
- [x] 连续5次失败锁定30分钟
- [x] RBAC + ABAC 权限模型
- [x] 数据范围控制（own/team/tenant）

### 6.2 API安全

- [x] API限流（100次/分钟/用户）
- [x] CORS配置
- [x] 请求体验证（大小、类型）
- [x] 恶意Payload检测

### 6.3 输入安全

- [x] Bean Validation
- [x] 变量插值安全检查
- [x] HTTP节点URL白名单
- [x] 内部IP访问阻止

### 6.4 数据安全

- [x] 敏感数据加密存储
- [x] 日志脱敏
- [x] TLS 1.3
- [x] HSTS启用
- [x] Webhook secret哈希存储

### 6.5 Webhook安全

- [x] HMAC-SHA256签名验证
- [x] 时间戳验证（5分钟窗口）
- [x] Nonce防重放（24小时窗口）
- [x] 频率限制

### 6.6 监控审计

- [x] 认证/授权事件日志
- [x] API请求日志
- [x] 业务事件日志
- [x] 安全告警配置

---

## 七、待讨论问题

1. **插件系统**：MVP阶段是否需要开放插件上传功能？如不需要，建议默认禁用
2. **代码执行节点**：是否在MVP阶段禁用？RCE风险较高
3. **内部服务访问**：HTTP节点是否允许访问内网IP？从安全角度建议默认禁止
4. **免费版限制**：当前免费版限制是否合理？是否需要更严格的限制防止滥用

---

## 八、相关文件

- `/design/design1.0/security_1.1.md` - 第一轮安全设计
- `/design/design1.0/tdd_1.1.md` - TDD测试设计
- `/design/design1.0/architect_1.1.md` - 架构设计
- `/design/design1.0/plan_1.1.md` - 功能规划

---

**文档版本**: 1.2
**创建日期**: 2026-03-29
**作者**: Security Reviewer Agent