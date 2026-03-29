# 工作流引擎架构设计 v1.3（第三轮架构收束）

## 概述

本文档基于第二轮架构设计（architect_1.2.md），从三个维度进行第三轮综合设计：
1. TDD架构支撑
2. 安全架构确认
3. 功能规划可行性

---

## 一、执行引擎技术栈选择

**决策：MVP阶段使用 Spring Boot ThreadPool 替代 Vert.x**

| 对比 | Vert.x | ThreadPool |
|------|--------|------------|
| 学习成本 | 高 | 低 |
| 测试复杂度 | 高 | 低 |
| MVP适用性 | 过度设计 | 刚好满足 |

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

---

## 二、安全架构确认

### 2.1 敏感数据加密

```java
// Webhook secret 哈希存储
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

// API Key 加密存储
@Entity
public class ApiKey {
    @Encrypted
    @Column(name = "encrypted_key")
    private String apiKey;
}
```

### 2.2 表达式执行沙箱

```java
@Service
public class SafeExpressionEngine {
    public SafeExpressionEngine() {
        this.engine = SandboxedExpressionEngine.builder()
            .allowedFunctions("json.*", "math.*", "string.*", "date.*", "logic.*")
            .blockedPatterns("System\\..*", "Runtime\\..*", "exec\\s*\\(", "eval\\s*\\(")
            .maxEvaluationTime(Duration.ofSeconds(5))
            .maxExpressionLength(1000)
            .build();
    }
}
```

### 2.3 HTTP节点安全

```java
@Service
public class SecureHttpNodeExecutor {
    @Value("${http.node.block.internal:true}")
    private boolean blockInternal;

    private void checkInternalAccess(String url) throws SecurityException {
        InetAddress address = InetAddress.getByName(extractHost(url));
        if (address.isSiteLocalAddress() || address.isLoopbackAddress()) {
            throw new SecurityException("Internal IP access denied");
        }
    }
}
```

### 2.4 插件安全

**决策：MVP阶段禁用插件上传**

```java
@Configuration
public class PluginSecurityConfig {
    @Value("${plugin.upload.enabled:false}")
    private boolean pluginUploadEnabled;
}
```

---

## 三、功能规划可行性

### 3.1 MVP功能架构映射

| MVP功能 | 架构组件 | 风险 |
|---------|----------|------|
| 可视化编辑器 | ReactFlow + Zustand | 低 |
| 基础节点 | NodeExecutor接口 | 中 |
| 执行引擎 | ThreadPoolExecutor | 低 |
| 变量系统 | ExecutionContext | 低 |
| Webhook触发 | WebhookController | 低 |
| JWT认证 | JwtAuthFilter | 低 |
| RBAC权限 | PermissionInterceptor | 低 |
| 多租户隔离 | TenantContext + RLS | 低 |

### 3.2 服务架构（4服务）

```yaml
services:
  gateway:     # Nginx
  workflow-api # workflow + node 合并
  executor:    # 执行引擎
  auth:        # 认证服务
  postgres:    # 数据存储
  redis:       # 缓存/队列
# 暂不部署Kafka
```

---

## 四、架构决策汇总

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 执行引擎 | ThreadPool | 测试友好、MVP足够 |
| 服务数量 | 4个 | MVP简化 |
| 消息队列 | Redis Stream | MVP低负载 |
| 表达式沙箱 | SafeExpressionEngine | 安全必选 |
| HTTP节点 | 禁止内部IP | 安全必选 |
| 插件上传 | MVP禁用 | 安全考虑 |
| 条件分支 | 延后至P1 | 安全验证需要时间 |

---

**相关文件**:
- tdd_1.2.md, tdd_1.3.md
- security_1.2.md, security_1.3.md
- architect_1.2.md
- plan_1.2.md