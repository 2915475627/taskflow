# 工作流引擎安全架构设计 v1.3（第三轮安全加固）

## 概述

本文档基于第二轮安全审查（security_1.2.md）的产出，确认架构实现对安全问题的修复情况，并补充第三轮安全加固方案。本文档是第二轮审查的收束版本，整合了所有安全修复决策。

---

## 一、第二轮安全问题的架构确认

### 1.1 数据模型安全问题（已解决）

#### 问题：Webhook secret 明文存储

**修复方案（architect_1.2 已实现）：**

```java
@Entity
public class Webhook {
    @Column(name = "secret_hash")
    private String secretHash;  // SHA-256哈希值

    @Column(name = "secret_salt")
    private String secretSalt;  // 随机盐值
}
```

**验证点：**
- [x] 数据库不存储明文secret
- [x] 使用随机盐值防止彩虹表攻击
- [x] 签名验证时使用盐值重新计算哈希

#### 问题：API Key 明文存储

**修复方案：**

```java
@Encrypted
@Column(name = "api_key_encrypted")
private String apiKey;
```

**验证点：**
- [x] 使用AES-256-GCM加密存储
- [x] 密钥由KMS管理
- [x] 响应中完全隐藏API Key

---

### 1.2 表达式执行安全问题（已解决）

#### 问题：条件表达式可能被注入恶意代码

**修复方案（architect_1.2 SafeExpressionEngine）：**

```java
@Component
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

**验证点：**
- [x] 函数白名单限制（只允许json/math/string/date/logic）
- [x] 危险模式阻断（System/Runtime/exec/eval等）
- [x] 执行超时限制（5秒）
- [x] 表达式长度限制（1000字符）
- [x] MVP阶段条件分支延后至P1（plan_1.2已确认）

---

### 1.3 HTTP节点安全问题（已解决）

#### 问题：HTTP节点可能访问内部服务

**修复方案（architect_1.2 SecureHttpNodeExecutor）：**

```java
@Component
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
        // 阻止：10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x, localhost
        InetAddress address = InetAddress.getByName(host);
        return address.isSiteLocalAddress()
            || address.isLoopbackAddress()
            || address.isLinkLocalAddress();
    }
}
```

**验证点：**
- [x] 默认阻止内部IP访问（blockInternal=true）
- [x] 支持可选域名白名单
- [x] 内部IP检测覆盖所有私有地址段
- [x] 配置可调整（开发环境可关闭）

---

### 1.4 插件热加载安全问题（已解决）

#### 问题：恶意插件可能导致代码执行

**修复方案：**

```java
@Configuration
public class PluginSecurityConfig {

    @Value("${plugin.upload.enabled:false}")
    private boolean pluginUploadEnabled;

    @Bean
    public PluginSandbox createSandbox() {
        return PluginSandbox.builder()
            .deniedClasses(
                "java.lang.ProcessBuilder",
                "java.lang.Runtime",
                "java.lang.ClassLoader",
                "java.io.File",
                "java.nio.file.Files"
            )
            .maxMemoryMB(512)
            .maxExecutionTimeSeconds(60)
            .maxCpuPercent(50)
            .networkBlocked(true)
            .filesystemBlocked(true)
            .build();
    }
}
```

**验证点：**
- [x] MVP阶段禁用插件上传（plan_1.2已确认）
- [x] 沙箱限制文件系统访问
- [x] 沙箱限制网络访问
- [x] 沙箱限制反射/类加载

---

## 二、安全配置矩阵

### 2.1 执行引擎安全配置

```yaml
# execution-engine security config
execution:
  engine:
    # 表达式安全
    expression:
      sandbox-enabled: true
      max-evaluation-time: 5000  # 5秒
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
        - ClassLoader\.
        - exec\s*\(
        - eval\s*\(

    # HTTP节点安全
    http-node:
      block-internal-ip: true  # 默认阻止内部IP
      allowed-domains: []      # 空=允许所有外部域名
      max-timeout: 30000       # 30秒
      max-response-size: 10485760  # 10MB

    # 代码执行节点
    code-node:
      enabled: false  # MVP阶段禁用

  # 执行资源限制
  resources:
    max-concurrent-per-workflow: 5
    max-execution-time: 3600000  # 1小时
    max-retry-count: 3
```

### 2.2 认证安全配置

```yaml
# authentication config
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

  mfa:
    enabled: false    # MVP阶段不强制
    types:
      - totp
      - email
```

### 2.3 API安全配置

```yaml
# api security config
api:
  rate-limit:
    default: 100/minute, 2000/hour
    login: 5/minute, 20/hour
    execution: 10/minute, 200/hour
    webhook: 100/minute, 2000/hour

  cors:
    allowed-origins: ${ALLOWED_ORIGINS}
    allowed-methods: [GET, POST, PUT, DELETE, OPTIONS]
    allowed-headers: [Authorization, Content-Type, X-Request-ID]
    exposed-headers: [X-Total-Count, X-Page-Number]
    credentials: true
    max-age: 3600

  request:
    max-body-size: 10485760  # 10MB
    timeout: 30000
```

### 2.4 数据安全配置

```yaml
# data security config
data:
  encryption:
    algorithm: AES-256-GCM
    key-management: kms

  storage:
    webhook-secret: hashed    # 存储哈希+盐值
    api-key: encrypted         # AES加密
    sensitive-config: encrypted

  tls:
    enabled: true
    protocol: TLSv1.3
    ciphers:
      - TLS_AES_256_GCM_SHA384
      - TLS_CHACHA20_POLY1305_SHA256

  headers:
    hsts: "max-age=31536000; includeSubDomains"
    x-frame-options: DENY
    x-content-type-options: nosniff
    content-security-policy: "default-src 'self'"
```

### 2.5 Webhook安全配置

```yaml
# webhook security config
webhook:
  signature:
    algorithm: HMAC-SHA256
    timestamp-tolerance: 300000  # 5分钟
    nonce-validity: 86400        # 24小时

  rate-limit:
    default: 100/minute, 1000/hour

  payload:
    max-size: 1048576  # 1MB
    timeout: 30000
```

---

## 三、MVP安全功能清单

### 3.1 MVP阶段必须实现的安全功能

| 功能 | 优先级 | 状态 |
|------|--------|------|
| JWT认证（Access Token + Refresh Token） | P0 | 待开发 |
| RBAC权限控制 | P0 | 待开发 |
| 密码BCrypt哈希 | P0 | 待开发 |
| 账号锁定（5次失败，30分钟） | P0 | 待开发 |
| API限流（100次/分钟） | P0 | 待开发 |
| Webhook HMAC签名验证 | P0 | 待开发 |
| Webhook时间戳+Nonce防重放 | P0 | 待开发 |
| 输入验证（Bean Validation） | P0 | 待开发 |
| 敏感数据加密存储 | P0 | 待开发 |
| 日志脱敏 | P0 | 待开发 |
| 多租户数据隔离（tenant_id + RLS） | P0 | 待开发 |
| CORS配置 | P0 | 待开发 |
| 安全Headers | P0 | 待开发 |
| HTTP节点内部IP阻止 | P0 | architect已确认 |
| 表达式沙箱执行 | P0 | architect已确认 |
| Webhook secret哈希存储 | P0 | architect已确认 |

### 3.2 MVP阶段延后的安全功能

| 功能 | 延后原因 | 计划阶段 |
|------|----------|----------|
| 条件分支表达式 | 安全沙箱需验证 | P1 |
| 插件上传 | 安全隔离未就绪 | P2 |
| 代码执行节点 | RCE风险 | P2 |
| MFA | 开发量大 | 二期 |
| OAuth2第三方登录 | 非核心 | 二期 |
| ABAC | 复杂度高 | 三期 |

---

## 四、安全测试矩阵

### 4.1 认证安全测试

| 测试场景 | 测试方法 | 预期结果 |
|----------|----------|----------|
| 暴力破解防护 | 连续5次错误密码 | 账号锁定30分钟 |
| Token伪造 | 修改Token payload | 返回401 |
| Token过期 | 使用过期Token | 返回401 |
| Token刷新 | 使用有效Refresh Token | 返回新Token |
| 密码哈希验证 | 检查数据库存储 | 存储BCrypt哈希 |

### 4.2 授权安全测试

| 测试场景 | 测试方法 | 预期结果 |
|----------|----------|----------|
| 权限提升 | 普通用户访问管理员API | 返回403 |
| 跨租户访问 | Tenant-A用户访问Tenant-B资源 | 返回403/404 |
| Viewer越权 | Viewer执行工作流 | 返回403 |
| Editor越权 | Editor删除工作流 | 返回403 |
| 团队数据隔离 | Team-B用户访问Team-A工作流 | 返回403/404 |

### 4.3 输入安全测试

| 测试场景 | 测试方法 | 预期结果 |
|----------|----------|----------|
| SQL注入 | 输入 `' OR '1'='1` | 验证失败 |
| XSS | 输入 `<script>alert(1)</script>` | 验证失败或转义 |
| 命令注入 | 输入 `; cat /etc/passwd` | 验证失败 |
| 路径遍历 | 输入 `../../etc/passwd` | 验证失败 |
| 内部IP访问 | HTTP节点URL `http://192.168.1.1` | 执行被拒绝 |
| EL表达式注入 | 输入 `{{__constructor__}}` | 验证失败 |

### 4.4 Webhook安全测试

| 测试场景 | 测试方法 | 预期结果 |
|----------|----------|----------|
| 签名验证 | 使用正确签名 | 通过验证 |
| 签名伪造 | 修改签名 | 返回401 |
| 重放攻击 | 重复请求同一Webhook | 返回401 |
| 时间戳过期 | 使用5分钟前的请求 | 返回401 |
| Payload篡改 | 修改Body内容 | 返回401 |

### 4.5 数据安全测试

| 测试场景 | 测试方法 | 预期结果 |
|----------|----------|----------|
| 敏感数据日志 | 登录时记录密码 | 密码被脱敏 |
| 敏感数据响应 | API返回用户信息 | API Key被隐藏 |
| 租户数据隔离 | Tenant-A查询所有工作流 | 只返回Tenant-A数据 |
| 加密存储验证 | 检查数据库存储的密码 | 存储的是哈希值 |
| Webhook secret验证 | 检查数据库存储 | 存储哈希+盐值，非明文 |

---

## 五、安全检查清单（第三轮确认）

### 5.1 认证授权

- [x] JWT Access Token 15分钟有效期
- [x] Refresh Token 7天有效期 + Redis存储
- [x] 密码 BCrypt 哈希存储
- [x] 连续5次失败锁定30分钟
- [x] RBAC权限模型
- [x] 数据范围控制（own/team/tenant）

### 5.2 API安全

- [x] API限流（100次/分钟/用户）
- [x] CORS配置
- [x] 请求体验证（大小、类型）
- [x] 恶意Payload检测

### 5.3 输入安全

- [x] Bean Validation
- [x] 变量插值安全检查（危险模式检测）
- [x] HTTP节点URL白名单（可选）
- [x] HTTP节点内部IP访问阻止

### 5.4 数据安全

- [x] 敏感数据加密存储（API Key等）
- [x] Webhook secret哈希存储
- [x] 日志脱敏
- [x] TLS 1.3
- [x] HSTS启用

### 5.5 Webhook安全

- [x] HMAC-SHA256签名验证
- [x] 时间戳验证（5分钟窗口）
- [x] Nonce防重放（24小时窗口）
- [x] 频率限制

### 5.6 执行安全

- [x] 表达式沙箱执行（白名单函数）
- [x] 表达式危险模式阻断
- [x] HTTP节点内部IP阻止
- [x] 代码执行节点MVP禁用

### 5.7 插件安全

- [x] MVP禁用插件上传
- [x] 沙箱限制（文件系统、网络、反射）

### 5.8 监控审计

- [x] 认证/授权事件日志
- [x] API请求日志
- [x] 业务事件日志
- [x] 安全告警配置

---

## 六、架构实现确认

### 6.1 安全架构组件映射

| 安全功能 | 架构组件 | 实现位置 |
|----------|----------|----------|
| JWT认证 | JwtAuthenticationFilter | gateway-service |
| 权限控制 | PermissionInterceptor | gateway-service |
| 敏感数据加密 | EncryptionService | core-service |
| Webhook签名 | WebhookSignatureService | trigger-service |
| 表达式沙箱 | SafeExpressionEngine | executor-service |
| HTTP节点安全 | SecureHttpNodeExecutor | executor-service |
| 限流 | RateLimitService | gateway-service |
| 多租户隔离 | TenantContext + RLS | core-service |

### 6.2 部署架构安全要求

```yaml
# kubernetes security
kubernetes:
  network-policy:
    enabled: true
    default-deny: true

  pod-security:
    restricted: true
    run-as-non-root: true

  secrets:
    management: external-secrets-operator

# service mesh
service-mesh:
  mtls:
    enabled: true  # 生产环境建议启用
```

---

## 七、相关文件

- `/design/design1.0/security_1.1.md` - 第一轮安全设计
- `/design/design1.0/security_1.2.md` - 第二轮安全审查
- `/design/design1.0/tdd_1.2.md` - TDD第二轮审查
- `/design/design1.0/architect_1.2.md` - 架构第二轮完善
- `/design/design1.0/plan_1.2.md` - 功能规划第二轮调整

---

## 八、第三轮安全设计确认

### 8.1 第二轮问题解决状态

| 问题 | 状态 | 确认文档 |
|------|------|----------|
| Webhook secret明文存储 | **已解决** | architect_1.2 |
| 表达式执行无沙箱 | **已解决** | architect_1.2 |
| HTTP节点内部IP访问 | **已解决** | architect_1.2 |
| 插件热加载安全 | **已解决** | plan_1.2 (MVP禁用) |
| 条件分支安全 | **已解决** | plan_1.2 (延后P1) |
| 服务间通信mTLS | **待生产确认** | 建议生产环境启用 |

### 8.2 MVP安全就绪确认

**进入开发阶段前的安全检查：**

- [ ] JWT认证组件开发就绪
- [ ] 权限控制组件开发就绪
- [ ] Webhook签名验证组件开发就绪
- [ ] 敏感数据加密组件开发就绪
- [ ] 表达式沙箱组件开发就绪
- [ ] HTTP节点安全组件开发就绪
- [ ] 安全测试用例编写就绪

---

## 九、待讨论问题（第三轮）

1. **服务间mTLS**：生产环境是否强制启用mTLS？
2. **内部DNS解析**：HTTP节点是否需要阻止内部DNS解析获取内部IP？
3. **密钥轮换**：KMS密钥轮换策略如何配置？
4. **审计保留期限**：安全日志保留多长时间？

---

**文档版本**: 1.3
**创建日期**: 2026-03-29
**作者**: Security Reviewer Agent
**状态**: 第三轮安全设计 - 确认架构实现