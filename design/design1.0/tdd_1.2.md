# 工作流引擎 TDD 设计 v1.2（第二轮）

## 概述

本文档基于第一轮设计产出，从 TDD 角度对其他三个 agent 的设计进行评估和挑战，聚焦于：
1. 安全设计对测试的影响
2. 架构设计是否便于测试
3. 功能规划中的测试覆盖点

---

## 一、对安全设计的 TDD 评估与挑战

### 1.1 安全设计优势

security_1.1.md 提供了以下安全特性，这些特性可以被测试覆盖：

| 安全特性 | 可测试性 | 测试策略 |
|----------|----------|----------|
| JWT 认证 | 高 | Mock 验证过滤器，测试 token 解析、黑名单 |
| 权限控制 (RBAC/ABAC) | 高 | 单元测试角色权限矩阵 |
| 速率限制 | 高 | 测试限流算法边界 |
| 输入验证 | 高 | 测试恶意输入被拦截 |
| Webhook 签名 | 高 | 测试签名验证各种场景 |
| 敏感数据加密 | 中 | 测试加密/解密正确性 |

### 1.2 挑战与建议

#### 挑战 1：注入攻击测试覆盖不足

**问题**：security_1.1.md 提到了 SQL 注入、EL 表达式注入、模板注入的防护，但未明确测试策略。

**TDD 建议**：
```typescript
// 需要为每种注入类型编写专门的测试用例
describe('VariableInterpolationSecurity', () => {
  it('should block EL expression injection', () => {
    const template = '{{__constructor__}}';
    expect(() => interpolate(template, {})).toThrow('Unsafe variable');
  });

  it('should block SQL injection attempt', () => {
    const template = '{{user}}; DROP TABLE users;--';
    expect(() => interpolate(template, {})).toThrow('Unsafe variable');
  });

  it('should allow safe variable references', () => {
    const template = '{{user.name}}';
    const result = interpolate(template, { user: { name: 'test' } });
    expect(result).toBe('test');
  });
});
```

#### 挑战 2：安全边界测试缺失

**问题**：权限矩阵定义了角色访问权限，但没有明确测试"边界"场景。

**TDD 建议**：
```java
// 需要测试越权访问被正确拦截
class PermissionBoundaryTest {

    @Test
    void editor_cannotDeleteWorkflow() {
        // Editor 尝试删除工作流应被拒绝
        assertThrows(AccessDeniedException.class, () ->
            workflowService.delete(workflowId, editorUser)
        );
    }

    @Test
    void viewer_cannotExecuteWorkflow() {
        // Viewer 尝试执行工作流应被拒绝
        assertThrows(AccessDeniedException.class, () ->
            executionService.execute(workflowId, viewerUser)
        );
    }

    @Test
    void crossTenantAccessDenied() {
        // 跨租户访问应被拒绝
        assertThrows(TenantAccessDeniedException.class, () ->
            workflowService.getById(workflowId, otherTenantUser)
        );
    }
}
```

#### 挑战 3：加密测试需要特殊处理

**问题**：加密服务的测试不能只验证"能加密"，还需要验证"无法通过已知明文攻击破解"。

**TDD 建议**：
```java
// 加密测试需要验证密钥轮换、密文随机性
class EncryptionServiceTest {

    @Test
    void encrypt_shouldProduceRandomCiphertext() {
        String plaintext = "test";
        String c1 = encryptionService.encrypt(plaintext, keyId);
        String c2 = encryptionService.encrypt(plaintext, keyId);

        // 相同明文应产生不同密文（随机 IV）
        assertNotEquals(c1, c2);
    }

    @Test
    void encrypt_withDifferentKeys_shouldFailDecrypt() {
        String plaintext = "test";
        String ciphertext = encryptionService.encrypt(plaintext, keyId1);

        // 用不同密钥解密应失败
        assertThrows(DecryptionException.class, () ->
            encryptionService.decrypt(ciphertext, keyId2)
        );
    }
}
```

---

## 二、对架构设计的 TDD 评估与挑战

### 2.1 架构设计优势

architect_1.1.md 的架构在以下方面有利于测试：

| 架构特性 | 测试优势 |
|----------|----------|
| 微服务分离 | 各服务可独立测试 |
| 异步执行 (Redis Streams) | 可通过 Mock 测试队列交互 |
| Vert.x | 支持异步测试 |
| PostgreSQL + JSONB | 可用 H2 模拟 |

### 2.2 挑战与建议

#### 挑战 1：Vert.x 异步执行引擎测试困难

**问题**：执行引擎使用 Vert.x 的异步模型，测试需要处理协程和事件循环。

**TDD 建议**：
```java
// 异步执行引擎测试策略
class ExecutionEngineAsyncTest {

    @Test
    void execute_shouldCompleteWithinTimeout() {
        // 使用 Vert.x Test Utils 处理异步
        TestContext context = vertxRule.vertx().getTestContext();

        executionEngine.execute(executionId)
            .onComplete(ar -> {
                context.assertTrue(ar.succeeded());
                context.assertEquals("SUCCESS", ar.result().getStatus());
            });

        // 等待完成，设置超时
        context.awaitCompletion(30, TimeUnit.SECONDS);
    }

    @Test
    void execute_withFailure_shouldRetry() {
        // 测试失败重试逻辑
        when(nodeExecutor.execute(any()))
            .thenReturn(FailedFuture(new RuntimeException("error")))
            .thenReturn(SucceededFuture(output));

        executionEngine.execute(executionId);

        // 验证重试次数
        verify(nodeExecutor, times(2)).execute(any());
    }
}
```

#### 挑战 2：多租户数据隔离测试复杂性

**问题**：architect_1.1.md 采用共享数据库 + tenant_id + RLS，需要验证租户隔离。

**TDD 建议**：
```java
// 多租户隔离测试
class TenantIsolationTest {

    @Test
    void workflowService_shouldOnlyReturnTenantWorkflows() {
        // 创建两个租户的数据
        workflowRepo.save(createWorkflow("tenant-1-wf", tenantId1));
        workflowRepo.save(createWorkflow("tenant-2-wf", tenantId2));

        // 设置租户上下文
        TenantContext.setTenantId(tenantId1);

        // 验证只返回租户 1 的数据
        List<Workflow> results = workflowService.findAll();

        assertEquals(1, results.size());
        assertEquals(tenantId1, results.get(0).getTenantId());
    }

    @Test
    void workflowService_crossTenantQuery_shouldFail() {
        TenantContext.setTenantId(tenantId1);

        // 尝试查询租户 2 的数据应失败
        assertThrows(TenantAccessDeniedException.class, () ->
            workflowService.getById(tenantId2WorkflowId)
        );
    }
}
```

#### 挑战 3：执行状态机测试需要完整覆盖

**问题**：执行引擎状态机有多个状态和转换，需要 90% 覆盖率目标。

**TDD 建议**：
```java
// 完整的状态机测试矩阵
class ExecutionStateMachineTest {

    @ParameterizedTest
    @CsvSource({
        // currentState, event, expectedNextState
        'PENDING, START, RUNNING',
        'RUNNING, NODE_COMPLETE, RUNNING',
        'RUNNING, NODE_FAILED, FAILED',
        'RUNNING, CANCEL, CANCELLED',
        'FAILED, RETRY, RUNNING',
        'CANCELLED, RESTART, RUNNING'
    })
    void stateTransition(
        ExecutionStatus current,
        ExecutionEvent event,
        ExecutionStatus expected
    ) {
        ExecutionContext ctx = createContext(current);
        executionEngine.handleEvent(ctx, event);

        assertEquals(expected, ctx.getStatus());
    }

    @Test
    void stateTransition_invalidFromTerminalState_shouldFail() {
        ExecutionContext ctx = createContext(ExecutionStatus.SUCCESS);

        // 从终态不能转换
        assertThrows(InvalidStateTransitionException.class, () ->
            executionEngine.handleEvent(ctx, ExecutionEvent.CANCEL)
        );
    }
}
```

---

## 三、对功能规划的 TDD 评估与挑战

### 3.1 功能规划优势

plan_1.1.md 的 MVP 功能清单可以很好地映射到测试用例：

| MVP 功能 | 对应测试覆盖点 |
|----------|----------------|
| 可视化编辑器 | Canvas 渲染、拖拽、连线 |
| 基础节点 | START/END/HTTP/DELAY 执行 |
| 条件分支 | 条件表达式求值、分支路由 |
| 变量系统 | 变量定义、引用、传递 |
| 执行引擎 | 队列调度、状态管理 |
| Webhook 触发 | 签名验证、触发执行 |

### 3.2 挑战与建议

#### 挑战 1：测试优先级与功能优先级不一致

**问题**：plan_1.1.md 的优先级是 P0~P4，但没有对应的测试优先级。

**TDD 建议**：建立测试优先级矩阵

| 功能优先级 | 测试优先级 | 覆盖率要求 |
|------------|------------|------------|
| P0 (MVP) | P0 (必须) | 90% |
| P1 (发布后) | P1 (高) | 80% |
| P2 (增强) | P2 (中) | 70% |
| P3 (优化) | P3 (低) | 50% |

#### 挑战 2：节点执行器测试覆盖不完整

**问题**：plan_1.1.md 提到 HTTP/LLM 执行器，但没有详细测试场景。

**TDD 建议**：为每个节点类型编写完整测试矩阵

```typescript
// HTTP 节点测试矩阵
describe('HttpNodeExecutor', () => {
  describe('execute', () => {
    // HTTP 方法测试
    it.each(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])(
      'should support %s method',
      async (method) => { /* ... */ }
    );

    // 响应状态测试
    it('should handle 2xx response', async () => { /* ... */ });
    it('should handle 4xx client error', async () => { /* ... */ });
    it('should handle 5xx server error', async () => { /* ... */ });

    // 超时测试
    it('should timeout after configured duration', async () => { /* ... */ });

    // 错误处理测试
    it('should handle connection refused', async () => { /* ... */ });
    it('should handle SSL error', async () => { /* ... */ });

    // 安全测试
    it('should block internal IP access', async () => { /* ... */ });
    it('should block suspicious URLs', async () => { /* ... */ });
  });
});
```

#### 挑战 3：缺少测试数据管理策略

**问题**：plan_1.1.md 没有讨论测试数据（fixtures）的管理策略。

**TDD 建议**：定义标准化测试 fixtures

```typescript
// frontend/test-utils/fixtures/workflow.ts
export const workflowFixtures = {
  minimal: {
    id: 'wf-minimal',
    name: 'Minimal Workflow',
    nodes: [{ id: 'start', type: 'start', position: { x: 0, y: 0 } }],
    edges: []
  },
  withHttpNode: {
    id: 'wf-http',
    name: 'HTTP Workflow',
    nodes: [
      { id: 'start', type: 'start', position: { x: 0, y: 0 } },
      { id: 'http', type: 'http', position: { x: 200, y: 0 }, config: { url: 'https://example.com' } },
      { id: 'end', type: 'end', position: { x: 400, y: 0 } }
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'http' },
      { id: 'e2', source: 'http', target: 'end' }
    ]
  },
  withCondition: {
    id: 'wf-condition',
    name: 'Conditional Workflow',
    nodes: [
      { id: 'start', type: 'start' },
      { id: 'condition', type: 'condition', config: { expression: '{{data.value}} > 10' } },
      { id: 'branch-yes', type: 'http' },
      { id: 'branch-no', type: 'delay' },
      { id: 'end', type: 'end' }
    ]
  },
  // ... 更多 fixtures
};
```

---

## 四、测试基础设施增强建议

### 4.1 安全测试专用基础设施

```yaml
# 独立的安全测试配置
# application-security-test.yml
spring:
  security:
    oauth2:
      jwt:
        # 测试用已知密钥（生产不使用）
        secret: "test-secret-key-for-testing-only-min-256-bits"

# 安全测试数据库清理策略
test:
  security:
    cleanup:
      mode: ALWAYS  # 每次测试后清理
```

### 4.2 测试用安全工具类

```java
// 安全测试工具类
public class SecurityTestUtils {

    // 生成测试用 JWT
    public static String generateTestToken(User user) {
        return JwtTestToken.builder()
            .userId(user.getId())
            .tenantId(user.getTenantId())
            .roles(user.getRoles())
            .build()
            .sign(testSecretKey);
    }

    // 生成恶意请求
    public static MockHttpServletRequest createMaliciousRequest() {
        return new MockHttpServletRequest()
            .setContent("{\"name\": \"{{__constructor__}}\"}".getBytes());
    }

    // 验证响应已脱敏
    public static void assertNoSensitiveData(MockHttpServletResponse response) {
        String body = response.getContentAsString();
        assertThat(body).doesNotContain("password");
        assertThat(body).doesNotContain("api_key");
        assertThat(body).doesNotMatch(".*\\d{4}[-]\\d{4}[-]\\d{4}.*"); // 信用卡
    }
}
```

### 4.3 执行引擎专用测试配置

```java
// 执行引擎测试配置
@TestConfiguration
static class ExecutionTestConfig {

    @Bean
    public Vertx testVertx() {
        return Vertx.vertx(new VertxOptions()
            .setWorkerPoolSize(2)  // 小池，便于测试
            .setEventLoopPoolSize(2));
    }

    @Bean
    public RedisServer testRedis() {
        return new RedisServer(RedisConfig.builder()
            .port(6379)
            .build());
    }

    @Bean
    public KafkaContainer testKafka() {
        return new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));
    }
}
```

---

## 五、第二轮测试用例清单

### 5.1 安全测试用例（新增）

| 测试域 | 测试用例 | 测试类型 |
|--------|----------|----------|
| 认证 | 无效 token 访问 API | 集成 |
| 认证 | 过期 token 刷新 | 集成 |
| 认证 | 账号锁定后登录 | 集成 |
| 授权 | Editor 删除工作流 | 单元 |
| 授权 | Viewer 执行工作流 | 单元 |
| 授权 | 跨租户访问 | 集成 |
| 限流 | 超过速率限制 | 集成 |
| 限流 | 并发限流正确性 | 集成 |
| 输入 | SQL 注入拦截 | 集成 |
| 输入 | XSS  payload 拦截 | 集成 |
| 输入 | EL 表达式注入 | 单元 |
| 加密 | 密钥轮换 | 单元 |
| 加密 | 密文随机性 | 单元 |

### 5.2 架构相关测试用例（新增）

| 测试域 | 测试用例 | 测试类型 |
|--------|----------|----------|
| 状态机 | 所有状态转换 | 单元 |
| 状态机 | 无效转换被拒绝 | 单元 |
| 异步 | 执行超时处理 | 集成 |
| 异步 | 并发执行隔离 | 集成 |
| 多租户 | 数据隔离 | 集成 |
| 多租户 | 跨租户访问拒绝 | 集成 |

### 5.3 功能测试用例（新增/增强）

| 功能模块 | 测试用例 | 优先级 |
|----------|----------|--------|
| 节点执行 | HTTP 节点所有 HTTP 方法 | P0 |
| 节点执行 | HTTP 节点超时处理 | P0 |
| 节点执行 | HTTP 节点内部 IP 拦截 | P0 |
| 条件分支 | 条件表达式真/假分支 | P0 |
| 条件分支 | 条件表达式求值错误 | P1 |
| 变量系统 | 变量插值安全 | P0 |
| 变量系统 | 变量作用域 | P1 |
| Webhook | 签名验证 | P0 |
| Webhook | 重放攻击防护 | P0 |

---

## 六、TDD 实施检查清单

### 6.1 第二轮设计检查点

- [x] 安全设计可测试性评估
- [x] 架构设计测试友好度评估
- [x] 功能规划测试覆盖点映射
- [x] 新增安全测试用例清单
- [x] 新增架构测试用例清单
- [x] 测试数据管理策略

### 6.2 开发阶段检查点

在进入开发阶段前，需要确认：

- [ ] 安全模块有独立的测试配置文件
- [ ] 执行引擎异步测试工具就绪
- [ ] 多租户测试数据工厂可用
- [ ] 所有 P0 功能有对应测试用例
- [ ] CI 流程包含安全测试阶段

---

## 七、相关文件

- `/design/design1.0/tdd_1.1.md` - 第一轮 TDD 设计
- `/design/design1.0/security_1.1.md` - 安全设计
- `/design/design1.0/architect_1.1.md` - 架构设计
- `/design/design1.0/plan_1.1.md` - 功能规划

---

## 八、待讨论问题

1. **安全测试是否需要独立测试服务**：当前设计将安全测试集成在主测试中，是否需要独立的安全测试服务？
2. **测试数据脱敏**：测试数据中包含敏感信息时如何处理？
3. **模糊测试**：是否需要对输入验证进行模糊测试（Fuzz Testing）？
4. **渗透测试集成**：是否在 CI 中集成轻量级渗透测试？

---

**文档版本**: 1.2
**创建日期**: 2026-03-29
**作者**: TDD Architecture Design
