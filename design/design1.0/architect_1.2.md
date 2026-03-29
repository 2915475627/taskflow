# 工作流引擎架构设计 v1.2（第二轮架构完善）

## 概述

本文档从架构角度对第一轮设计进行综合评估，聚焦于：
1. TDD设计的架构支撑（tdd_1.1.md, tdd_1.2.md）
2. 安全设计的架构实现（security_1.1.md, security_1.2.md）
3. 功能规划的架构可行性（plan_1.1.md）

---

## 一、第一轮设计综合评估

### 1.1 跨设计问题汇总

| 问题 | 来源 | 影响 | 优先级 |
|------|------|------|--------|
| Vert.x异步执行测试困难 | tdd_1.2 + architect_1.1 | 测试覆盖率难以达标 | P0 |
| Webhook secret明文存储 | security_1.2 | 数据泄露风险 | P0 |
| 插件热加载安全隔离 | security_1.2 | RCE风险 | P0 |
| 表达式执行无沙箱 | security_1.2 | 代码注入风险 | P0 |
| 服务间通信无mTLS | security_1.2 | 内网穿透风险 | P1 |
| HTTP节点内部IP访问 | security_1.2 | 内网探测风险 | P1 |

---

## 二、TDD架构支撑设计

### 2.1 执行引擎测试架构

```java
// 执行引擎测试适配层
@Configuration
public class ExecutionTestConfig {

    @Bean
    public Vertx testVertx() {
        return Vertx.vertx(new VertxOptions()
            .setWorkerPoolSize(2)
            .setEventLoopPoolSize(2)
            .setBlockedThreadCheckInterval(1));
    }

    @Bean
    public ExecutionEngine testExecutionEngine(Vertx vertx) {
        return new ExecutionEngine(vertx,
            new ExecutionConfig()
                .setMaxRetries(1)
                .setTimeout(5000));
    }
}
```

### 2.2 多租户隔离测试架构

```java
// 多租户测试配置
@TestConfiguration
public class MultiTenantTestConfig {

    @Bean
    public TenantContext testTenantContext() {
        TenantContext context = new TenantContext();
        context.setTenantId("test-tenant-" + UUID.randomUUID());
        return context;
    }
}
```

---

## 三、安全架构实现设计

### 3.1 数据模型安全加固

```java
// 加密字段注解
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Encrypted {}

// Webhook实体 - 哈希存储
@Entity
public class Webhook {
    @Encrypted
    @Column(name = "secret_hash")
    private String secretHash;

    @Column(name = "secret_salt")
    private String secretSalt;
}
```

### 3.2 插件热加载安全隔离

```java
// MVP阶段建议禁用自定义插件
@Configuration
public class PluginSecurityConfig {

    @Bean
    public PluginSandbox createSandbox() {
        return PluginSandbox.builder()
            .deniedClasses(
                "java.lang.ProcessBuilder",
                "java.lang.Runtime",
                "java.lang.ClassLoader"
            )
            .maxMemoryMB(512)
            .maxExecutionTimeSeconds(60)
            .networkBlocked(true)
            .build();
    }
}
```

### 3.3 表达式执行沙箱

```java
// 安全表达式引擎
@Component
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

### 3.4 HTTP节点安全限制

```java
// 安全HTTP执行器
@Component
public class SecureHttpNodeExecutor {

    @Value("${http.node.block.internal:true}")
    private boolean blockInternal;

    @Override
    public NodeOutput execute(HttpNodeConfig config) {
        if (blockInternal && isInternalIp(config.getUrl())) {
            throw new SecurityException("Internal IP access denied");
        }
        return doExecute(config);
    }
}
```

---

## 四、功能规划架构可行性

### 4.1 MVP架构映射

| MVP功能 | 架构组件 | 风险评估 |
|---------|----------|----------|
| 可视化编辑器 | React Flow + Zustand | 低 |
| 基础节点 | NodeExecutor接口 | 中（测试复杂度） |
| 条件分支 | SafeExpressionEngine | 高（安全） |
| 变量系统 | ExecutionContext | 低 |
| 执行引擎 | Vert.x Worker | 高（异步测试） |

### 4.2 功能调整建议

| 原计划 | 建议调整 | 理由 |
|--------|----------|------|
| 条件分支 (P0) | 延后至P1 | 表达式安全需要沙箱验证 |
| 插件上传 (P2) | MVP禁用 | 安全隔离方案未就绪 |
| 代码执行节点 | MVP禁用 | RCE风险过高 |

---

## 五、架构决策汇总

| 决策 | 选择 | 理由 |
|------|------|------|
| 执行引擎测试 | Vert.x TestContext + 小池配置 | 解决异步测试复杂度 |
| Webhook存储 | 哈希+盐值 | 解决明文存储风险 |
| 插件安全 | MVP禁用上传 | 解决RCE风险 |
| 表达式安全 | 沙箱+白名单 | 解决注入攻击 |
| HTTP节点 | 禁止内部IP | 解决内网探测 |
| 条件分支 | MVP延后 | 安全验证需要时间 |

---

## 六、待讨论问题

1. **条件分支安全验证**：表达式沙箱需要额外1周开发，是否接受MVP延后？
2. **插件系统定位**：是否完全放弃MVP插件功能？
3. **服务间mTLS**：生产环境是否强制mTLS？

---

**相关文件**:
- `/design/design1.0/tdd_1.1.md` - TDD设计
- `/design/design1.0/tdd_1.2.md` - TDD第二轮审查
- `/design/design1.0/security_1.1.md` - 安全设计
- `/design/design1.0/security_1.2.md` - 安全第二轮审查
- `/design/design1.0/plan_1.1.md` - 功能规划