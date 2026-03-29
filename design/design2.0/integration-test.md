# 工作流引擎集成测试设计 v2.0

## 概述

本文档是设计2.0阶段的集成测试领域设计文档，整合了design1.0各阶段（tdd_1.x, security_1.x, architect_1.x, plan_1.x）中与集成测试相关的所有内容，形成完整的集成测试指导方案。

---

## 一、集成测试策略

### 1.1 测试金字塔

```
        /\
       /  \
      / E2E\        覆盖率: 核心流程 50%
     /------\
    /集成测试\      覆盖率: 70% (安全测试 85%)
   /----------\
  /  单元测试  \    覆盖率: 80%
 /--------------\
```

### 1.2 集成测试分层

| 测试层级 | 目标 | 工具 | 覆盖率要求 |
|----------|------|------|------------|
| API集成测试 | 验证API端点交互 | MockMvc + Testcontainers | 85% |
| 数据库集成测试 | 验证数据持久化 | H2/Testcontainers PostgreSQL | 80% |
| 消息队列集成测试 | 验证异步通信 | Redis/Testcontainers | 80% |
| 外部服务集成测试 | 验证HTTP节点/第三方API | WireMock | 70% |
| 多租户隔离测试 | 验证租户数据隔离 | 集成测试套件 | 90% |
| 安全集成测试 | 验证认证/授权/加密 | Spring Security Test | 85% |

### 1.3 MVP功能测试优先级矩阵

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
| 自定义插件 | - | - | P1禁用 |
| 代码执行节点 | - | - | P1禁用 |

---

## 二、测试工具栈

### 2.1 后端测试工具（Java/Spring Boot）

```xml
<!-- Maven依赖配置 -->
<dependencies>
    <!-- JUnit 5 -->
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.10.0</version>
        <scope>test</scope>
    </dependency>

    <!-- Mockito -->
    <dependency>
        <groupId>org.mockito</groupId>
        <artifactId>mockito-junit-jupiter</artifactId>
        <version>5.8.0</version>
        <scope>test</scope>
    </dependency>

    <!-- Spring Boot Test -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- Testcontainers -->
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>testcontainers</artifactId>
        <version>1.19.3</version>
        <scope>test</scope>
    </dependency>

    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>postgresql</artifactId>
        <version>1.19.3</version>
        <scope>test</scope>
    </dependency>

    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>1.19.3</version>
        <scope>test</scope>
    </dependency>

    <!-- H2 Database -->
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- REST Assured -->
    <dependency>
        <groupId>io.rest-assured</groupId>
        <artifactId>rest-assured</artifactId>
        <version>5.4.0</version>
        <scope>test</scope>
    </dependency>

    <!-- WireMock -->
    <dependency>
        <groupId>com.github.tomakehurst</groupId>
        <artifactId>wiremock-jre8</artifactId>
        <version>2.35.0</version>
        <scope>test</scope>
    </dependency>

    <!-- JaCoCo Coverage -->
    <dependency>
        <groupId>org.jacoco</groupId>
        <artifactId>jacoco-maven-plugin</artifactId>
        <version>0.8.11</version>
    </dependency>
</dependencies>
```

### 2.2 前端测试工具（TypeScript/React）

```json
// package.json测试依赖
{
  "devDependencies": {
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "msw": "^2.0.11",
    "playwright": "^1.40.0"
  }
}
```

### 2.3 测试容器配置

```yaml
# docker-compose-test.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: workflow_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
```

---

## 三、测试基础设施

### 3.1 垂直测试配置

```java
// src/test/resources/application-integration-test.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/workflow_test
    username: test
    password: test

  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.PostgreSQLDialect

  vertx:
    worker-pool-size: 2
    event-loop-pool-size: 2
    blocked-thread-check-interval: 1000

execution:
  test:
    timeout-seconds: 30
    max-retries: 1
    enable-async-logging: true

test:
  security:
    cleanup:
      mode: ALWAYS
```

### 3.2 Vert.x测试适配层

```java
// src/test/java/com/taskflow/test/VertxTestAdapter.java
@TestConfiguration
public class VertxTestAdapter {

    @Bean
    public Vertx testVertx() {
        VertxOptions options = new VertxOptions()
            .setWorkerPoolSize(2)
            .setEventLoopPoolSize(2)
            .setBlockedThreadCheckInterval(1000)
            .setMaxEventLoopExecuteTime(Duration.ofSeconds(10))
            .setMaxWorkerExecuteTime(Duration.ofSeconds(10));

        Vertx vertx = Vertx.vertx(options);
        Runtime.getRuntime().addShutdownHook(new Thread(vertx::close));
        return vertx;
    }

    @Bean
    public TestContext testContext() {
        return new TestContext();
    }
}
```

### 3.3 多租户测试工具类

```java
// src/test/java/com/taskflow/test/MultiTenantTestHelper.java
@Component
public class MultiTenantTestHelper {

    private final ThreadLocal<String> currentTenant = new ThreadLocal<>();

    public void setTenant(String tenantId) {
        TenantContext.setTenantId(tenantId);
        currentTenant.set(tenantId);
    }

    public String getCurrentTenant() {
        return currentTenant.get();
    }

    public void clearTenant() {
        TenantContext.clear();
        currentTenant.remove();
    }

    public String generateUniqueTenantId() {
        return "test-tenant-" + UUID.randomUUID().toString().substring(0, 8);
    }

    public Workflow createTestWorkflow(String name) {
        String tenantId = currentTenant.get();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant not set");
        }
        return Workflow.builder()
            .name(name)
            .tenantId(tenantId)
            .definition(JsonNodeFactory.instance.objectNode())
            .status(WorkflowStatus.DRAFT)
            .build();
    }

    public User createTestUser(String... roles) {
        String tenantId = currentTenant.get();
        return User.builder()
            .email("test-" + UUID.randomUUID() + "@test.com")
            .tenantId(tenantId)
            .roles(Arrays.asList(roles))
            .status(UserStatus.ACTIVE)
            .build();
    }
}
```

### 3.4 安全测试工具类

```java
// src/test/java/com/taskflow/test/SecurityTestUtils.java
@Component
public class SecurityTestUtils {

    @Autowired
    private ObjectMapper objectMapper;

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

    public static Stream<Arguments> maliciousInputs() {
        return Stream.of(
            Arguments.of("SQL注入", "' OR '1'='1"),
            Arguments.of("XSS", "<script>alert(1)</script>"),
            Arguments.of("EL表达式", "{{__constructor__}}"),
            Arguments.of("命令注入", "; cat /etc/passwd"),
            Arguments.of("路径遍历", "../../etc/passwd"),
            Arguments.of("内部IP", "http://192.168.1.1"),
            Arguments.of("本地主机", "http://localhost:6379")
        );
    }

    public void assertNoSensitiveData(String responseBody) {
        assertThat(responseBody).doesNotContain("password");
        assertThat(responseBody).doesNotContain("api_key");
        assertThat(responseBody).doesNotContain("secret");
        assertThat(responseBody).doesNotContain("secretHash");
    }

    public MockHttpServletRequestBuilder withAuth(User user) {
        return MockMvcRequestBuilders.post("/api/v1/workflows")
            .header("Authorization", "Bearer " + generateTestToken(user, testSecret));
    }
}
```

---

## 四、集成测试用例设计

### 4.1 API集成测试用例

#### 4.1.1 工作流管理API

```java
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class WorkflowApiIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MultiTenantTestHelper tenantHelper;

    @Test
    @DisplayName("创建工作流 - 成功")
    void createWorkflow_withValidInput_shouldReturn201() throws Exception {
        tenantHelper.setTenant("tenant-1");

        WorkflowRequest request = WorkflowRequest.builder()
            .name("Test Workflow")
            .definition(objectMapper.createObjectNode())
            .build();

        mockMvc.perform(post("/api/v1/workflows")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.name").value("Test Workflow"))
            .andExpect(jsonPath("$.tenantId").value("tenant-1"));
    }

    @Test
    @DisplayName("创建工作流 - 无权限")
    void createWorkflow_withoutPermission_shouldReturn403() throws Exception {
        User viewer = createUserWithRole(Role.VIEWER);

        mockMvc.perform(post("/api/v1/workflows")
                .with(SecurityTestUtils.withAuth(viewer))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\": \"Test\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("跨租户访问工作流")
    void getWorkflow_crossTenant_shouldReturn404() throws Exception {
        tenantHelper.setTenant("tenant-1");
        String workflowId = createWorkflowInTenant("tenant-2");

        mockMvc.perform(get("/api/v1/workflows/{id}", workflowId)
                .with(SecurityTestUtils.withAuth(userInTenant1)))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("列表查询 - 仅返回当前租户")
    void listWorkflows_shouldOnlyReturnCurrentTenant() throws Exception {
        tenantHelper.setTenant("tenant-1");
        createWorkflowInTenant("tenant-1");
        createWorkflowInTenant("tenant-1");
        tenantHelper.setTenant("tenant-2");
        createWorkflowInTenant("tenant-2");

        tenantHelper.setTenant("tenant-1");

        mockMvc.perform(get("/api/v1/workflows")
                .with(SecurityTestUtils.withAuth(userInTenant1)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(2))
            .andExpect(jsonPath("$.content[*].tenantId").value(everyItem(equalTo("tenant-1"))));
    }
}
```

#### 4.1.2 Webhook触发API

```java
@SpringBootTest
@AutoConfigureMockMvc
class WebhookApiIntegrationTest {

    @Autowired
    private WebhookSignatureService signatureService;

    @Test
    @DisplayName("Webhook触发 - 有效签名")
    void triggerWebhook_withValidSignature_shouldReturn200() throws Exception {
        Webhook webhook = createWebhook();
        String payload = "{\"event\": \"test\"}";
        long timestamp = System.currentTimeMillis();
        String signature = signatureService.sign(webhook, payload, timestamp);

        mockMvc.perform(post("/api/v1/webhooks/{id}/trigger", webhook.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload)
                .header("X-Webhook-Signature", signature)
                .header("X-Webhook-Timestamp", String.valueOf(timestamp)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.executionId").exists());
    }

    @Test
    @DisplayName("Webhook触发 - 无效签名")
    void triggerWebhook_withInvalidSignature_shouldReturn401() throws Exception {
        mockMvc.perform(post("/api/v1/webhooks/{id}/trigger", webhookId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")
                .header("X-Webhook-Signature", "invalid-signature")
                .header("X-Webhook-Timestamp", String.valueOf(System.currentTimeMillis())))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Webhook触发 - 重放攻击")
    void triggerWebhook_withReplay_shouldReturn401() throws Exception {
        WebhookRequest request = createValidWebhookRequest();

        // 第一次成功
        mockMvc.perform(post("/api/v1/webhooks/{id}/trigger", webhookId)
                .with(request.toBuilder().build()))
            .andExpect(status().isOk());

        // 重放应失败
        mockMvc.perform(post("/api/v1/webhooks/{id}/trigger", webhookId)
                .with(request.toBuilder().build()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Webhook触发 - 时间戳过期")
    void triggerWebhook_withExpiredTimestamp_shouldReturn401() throws Exception {
        long expiredTimestamp = System.currentTimeMillis() - 600000; // 10分钟前

        mockMvc.perform(post("/api/v1/webhooks/{id}/trigger", webhookId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")
                .header("X-Webhook-Signature", signature)
                .header("X-Webhook-Timestamp", String.valueOf(expiredTimestamp)))
            .andExpect(status().isUnauthorized());
    }
}
```

### 4.2 数据库集成测试用例

```java
@SpringBootTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class WorkflowPersistenceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
        .withDatabaseName("workflow_test")
        .withUsername("test")
        .withPassword("test");

    @Autowired
    private WorkflowRepository workflowRepo;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("工作流持久化 - 完整字段")
    void saveWorkflow_shouldPersistAllFields() {
        Workflow workflow = Workflow.builder()
            .name("Test Workflow")
            .tenantId("tenant-1")
            .definition(createTestDefinition())
            .status(WorkflowStatus.DRAFT)
            .version(1)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();

        Workflow saved = workflowRepo.save(workflow);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getName()).isEqualTo("Test Workflow");
        assertThat(saved.getStatus()).isEqualTo(WorkflowStatus.DRAFT);
    }

    @Test
    @DisplayName("工作流版本历史")
    void updateWorkflow_shouldCreateVersionHistory() {
        Workflow workflow = createWorkflow("tenant-1");

        // 更新版本
        workflow.setName("Updated Name");
        workflow.setVersion(2);
        workflowRepo.save(workflow);

        // 验证历史版本
        List<WorkflowVersion> versions = workflowVersionRepo.findByWorkflowId(workflow.getId());
        assertThat(versions).hasSize(2);
        assertThat(versions).extracting(WorkflowVersion::getVersion)
            .containsExactlyInAnyOrder(1, 2);
    }

    @Test
    @DisplayName("RLS策略 - 租户隔离")
    void findAll_withRLS_shouldOnlyReturnTenantData() {
        workflowRepo.save(createWorkflow("tenant-1"));
        workflowRepo.save(createWorkflow("tenant-1"));
        workflowRepo.save(createWorkflow("tenant-2"));

        List<Workflow> results = workflowRepo.findAll();

        assertThat(results).hasSize(2);
        assertThat(results).extracting(Workflow::getTenantId)
            .containsOnly("tenant-1");
    }
}
```

### 4.3 消息队列集成测试用例

```java
@SpringBootTest
@Testcontainers
class ExecutionQueueIntegrationTest {

    @Container
    static RedisContainer redis = new RedisContainer("redis:7");

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private ExecutionQueueService queueService;

    @Test
    @DisplayName("执行任务入队")
    void enqueueExecution_shouldAddToQueue() {
        String executionId = UUID.randomUUID().toString();
        ExecutionTask task = ExecutionTask.builder()
            .executionId(executionId)
            .workflowId("wf-1")
            .tenantId("tenant-1")
            .build();

        queueService.enqueue(task);

        String queueKey = "execution:queue:" + "tenant-1";
        Long size = redisTemplate.opsForList().size(queueKey);
        assertThat(size).isEqualTo(1);
    }

    @Test
    @DisplayName("执行任务出队")
    void dequeueExecution_shouldReturnTask() {
        ExecutionTask task = ExecutionTask.builder()
            .executionId(UUID.randomUUID().toString())
            .workflowId("wf-1")
            .tenantId("tenant-1")
            .build();
        queueService.enqueue(task);

        ExecutionTask dequeued = queueService.dequeue("tenant-1", 5, TimeUnit.SECONDS);

        assertThat(dequeued).isNotNull();
        assertThat(dequeued.getWorkflowId()).isEqualTo("wf-1");
    }

    @Test
    @DisplayName("并发入队出队")
    void concurrentEnqueueDequeue_shouldMaintainOrder() throws InterruptedException {
        int taskCount = 100;
        CountDownLatch latch = new CountDownLatch(taskCount);

        // 并发入队
        for (int i = 0; i < taskCount; i++) {
            int index = i;
            CompletableFuture.runAsync(() -> {
                queueService.enqueue(createTask("wf-" + index));
                latch.countDown();
            });
        }
        latch.await();

        // 验证队列大小
        String queueKey = "execution:queue:" + "tenant-1";
        Long size = redisTemplate.opsForList().size(queueKey);
        assertThat(size).isEqualTo(taskCount);
    }
}
```

### 4.4 外部服务集成测试用例（WireMock）

```java
@SpringBootTest
@WireMockTest(httpPort = 8089)
class HttpNodeIntegrationTest {

    @Autowired
    private HttpNodeExecutor httpNodeExecutor;

    @Test
    @DisplayName("HTTP GET请求")
    void execute_getRequest_shouldReturn200() {
        stubFor(get(urlEqualTo("/api/data"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"result\": \"success\"}")));

        HttpNodeConfig config = HttpNodeConfig.builder()
            .url("http://localhost:8089/api/data")
            .method("GET")
            .timeout(5000)
            .build();

        NodeOutput output = httpNodeExecutor.execute(config);

        assertThat(output.getStatus()).isEqualTo("SUCCESS");
        assertThat(output.getData().get("result")).isEqualTo("success");
    }

    @Test
    @DisplayName("HTTP POST请求带Body")
    void execute_postRequest_shouldSendBody() {
        stubFor(post(urlEqualTo("/api/submit"))
            .withRequestBody(containing("\"name\":\"test\""))
            .willReturn(aResponse()
                .withStatus(201)
                .withBody("{\"id\": 123}")));

        HttpNodeConfig config = HttpNodeConfig.builder()
            .url("http://localhost:8089/api/submit")
            .method("POST")
            .body(objectMapper.writeValueAsString(Map.of("name", "test")))
            .headers(Map.of("Content-Type", "application/json"))
            .timeout(5000)
            .build();

        NodeOutput output = httpNodeExecutor.execute(config);

        assertThat(output.getStatus()).isEqualTo("SUCCESS");
        verify(postRequestedFor(urlEqualTo("/api/submit")));
    }

    @Test
    @DisplayName("HTTP 4xx错误处理")
    void execute_4xxError_shouldHandleGracefully() {
        stubFor(get(urlEqualTo("/api/notfound"))
            .willReturn(aResponse()
                .withStatus(404)
                .withBody("{\"error\": \"Not Found\"}")));

        HttpNodeConfig config = HttpNodeConfig.builder()
            .url("http://localhost:8089/api/notfound")
            .method("GET")
            .timeout(5000)
            .build();

        NodeOutput output = httpNodeExecutor.execute(config);

        assertThat(output.getStatus()).isEqualTo("FAILED");
        assertThat(output.getError()).contains("404");
    }

    @Test
    @DisplayName("HTTP超时处理")
    void execute_timeout_shouldFail() {
        stubFor(get(urlEqualTo("/api/slow"))
            .willReturn(aResponse()
                .withStatus(200)
                .withFixedDelay(10000)));

        HttpNodeConfig config = HttpNodeConfig.builder()
            .url("http://localhost:8089/api/slow")
            .method("GET")
            .timeout(1000)
            .build();

        NodeOutput output = httpNodeExecutor.execute(config);

        assertThat(output.getStatus()).isEqualTo("FAILED");
        assertThat(output.getError()).contains("timeout");
    }
}
```

### 4.5 安全集成测试用例

```java
@SpringBootTest
@AutoConfigureMockMvc
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SecurityTestUtils securityTestUtils;

    // ===== 认证安全测试 =====

    @Test
    @DisplayName("无效Token访问API")
    void accessWithInvalidToken_shouldReturn401() {
        mockMvc.perform(get("/api/v1/workflows")
                .header("Authorization", "Bearer invalid-token"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("过期Token访问API")
    void accessWithExpiredToken_shouldReturn401() {
        String expiredToken = securityTestUtils.generateExpiredToken();

        mockMvc.perform(get("/api/v1/workflows")
                .header("Authorization", "Bearer " + expiredToken))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("暴力破解防护 - 5次失败后锁定")
    void bruteForceAttack_shouldLockAccount() {
        for (int i = 0; i < 5; i++) {
            attemptLogin("user@test.com", "wrong-password");
        }

        // 第6次应该被锁定
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"user@test.com\", \"password\": \"password\"}"))
            .andExpect(status().isLocked());
    }

    // ===== 授权安全测试 =====

    @Test
    @DisplayName("Editor无法删除工作流")
    void editorDeleteWorkflow_shouldReturn403() {
        User editor = createUserWithRole(Role.EDITOR);

        mockMvc.perform(delete("/api/v1/workflows/{id}", workflowId)
                .with(securityTestUtils.withAuth(editor)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Viewer无法执行工作流")
    void viewerExecuteWorkflow_shouldReturn403() {
        User viewer = createUserWithRole(Role.VIEWER);

        mockMvc.perform(post("/api/v1/workflows/{id}/execute", workflowId)
                .with(securityTestUtils.withAuth(viewer)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("跨租户访问被拒绝")
    void crossTenantAccess_shouldReturn403() {
        User userInTenant1 = createUserInTenant("tenant-1");
        String workflowInTenant2 = createWorkflowInTenant("tenant-2");

        mockMvc.perform(get("/api/v1/workflows/{id}", workflowInTenant2)
                .with(securityTestUtils.withAuth(userInTenant1)))
            .andExpect(status().isForbidden());
    }

    // ===== 输入安全测试 =====

    @ParameterizedTest
    @MethodSource("maliciousInputs")
    @DisplayName("恶意输入拦截")
    void maliciousInput_shouldBeBlocked(String name, String input) {
        mockMvc.perform(post("/api/v1/workflows")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\": \"" + input + "\"}"))
            .andExpect(status().isBadRequest());
    }

    // ===== API限流测试 =====

    @Test
    @DisplayName("超过速率限制返回429")
    void exceedRateLimit_shouldReturn429() {
        // 模拟100+请求
        IntStream.range(0, 101).forEach(i ->
            attemptApiCall()
        );

        mockMvc.perform(get("/api/v1/workflows"))
            .andExpect(status().isTooManyRequests());
    }
}
```

### 4.6 执行引擎集成测试用例

```java
@SpringBootTest
@AutoConfigureTestDatabase
class ExecutionEngineIntegrationTest {

    @Autowired
    private ExecutionEngine executionEngine;

    @Autowired
    private WorkflowRepository workflowRepo;

    @Autowired
    private MultiTenantTestHelper tenantHelper;

    @Test
    @DisplayName("完整工作流执行")
    void executeWorkflow_shouldCompleteAllNodes() {
        tenantHelper.setTenant("tenant-1");
        Workflow workflow = createWorkflowWithNodes(
            new StartNode(),
            new DelayNode(Duration.ofMillis(100)),
            new HttpNode("http://example.com/api"),
            new EndNode()
        );
        workflowRepo.save(workflow);

        String executionId = executionEngine.execute(workflow.getId());

        await().atMost(10, TimeUnit.SECONDS)
            .until(() -> executionEngine.getStatus(executionId) == ExecutionStatus.SUCCESS);

        Execution execution = executionRepo.findById(executionId);
        assertThat(execution.getStatus()).isEqualTo(ExecutionStatus.SUCCESS);
        assertThat(execution.getCompletedNodes()).hasSize(4);
    }

    @Test
    @DisplayName("执行超时处理")
    void execute_withTimeout_shouldCancel() {
        Workflow workflow = createWorkflowWithNodes(
            new StartNode(),
            new DelayNode(Duration.ofHours(1)),
            new EndNode()
        );

        String executionId = executionEngine.execute(workflow.getId(),
            ExecuteOptions.builder().timeout(Duration.ofMinutes(1)).build());

        await().atMost(2, TimeUnit.MINUTES)
            .until(() -> executionEngine.getStatus(executionId) == ExecutionStatus.TIMED_OUT);

        assertThat(executionRepo.findById(executionId).getStatus())
            .isEqualTo(ExecutionStatus.TIMED_OUT);
    }

    @Test
    @DisplayName("节点执行失败重试")
    void execute_withFailingNode_shouldRetry() {
        when(httpNodeExecutor).execute(any()).thenThrow(new RuntimeException("Error"))
            .thenReturn(NodeOutput.success());

        Workflow workflow = createWorkflowWithNodes(
            new StartNode(),
            new HttpNode("http://failing-api.com"),
            new EndNode()
        );

        String executionId = executionEngine.execute(workflow.getId(),
            ExecuteOptions.builder().maxRetries(1).build());

        await().atMost(30, TimeUnit.SECONDS)
            .until(() -> executionEngine.getStatus(executionId) == ExecutionStatus.SUCCESS);

        verify(httpNodeExecutor, times(2)).execute(any());
    }
}
```

---

## 五、TDD实施指导

### 5.1 TDD流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        TDD 循环                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │   RED    │ -> │  GREEN   │ -> │  REFACTOR │ -> │   RED    │   │
│  │ 写测试   │    │ 写实现   │    │   重构    │    │  写测试  │   │
│  │ 失败     │    │ 通过     │    │ 改进代码  │    │  失败    │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 集成测试TDD策略

| 阶段 | 输入 | 输出 | 验证点 |
|------|------|------|--------|
| RED | 接口设计/需求 | 失败的集成测试 | 测试正确失败 |
| GREEN | 失败测试 | 通过测试 | 最小实现 |
| REFACTOR | 通过测试 | 改进代码 | 测试仍通过 |

### 5.3 TDD检查清单

**开发前检查点：**
- [ ] 测试框架选型完成（JUnit 5 + Mockito + Testcontainers）
- [ ] 测试配置文件就绪（application-integration-test.yml）
- [ ] Vert.x测试适配层实现
- [ ] 多租户测试工具类实现
- [ ] 安全测试工具类实现
- [ ] 测试Fixtures定义完成
- [ ] CI流程配置完成

**开发中检查点：**
- [ ] 每个P0功能先写测试
- [ ] 测试覆盖率实时监控
- [ ] 失败的测试在24小时内修复
- [ ] 代码审查包含测试审查
- [ ] 安全测试在CI中运行

**开发后检查点：**
- [ ] 所有P0测试通过
- [ ] 覆盖率达标（80%）
- [ ] 安全测试通过
- [ ] E2E核心流程通过
- [ ] 测试文档更新

---

## 六、CI/CD测试流水线

### 6.1 测试阶段设计

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on: [push, pull_request]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          cache: 'maven'
      - name: Run unit tests
        run: mvn test -Dtest=*Test -DfailIfNoTests=false
      - name: Upload coverage
        uses: codecov/codecov-action@v4

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
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          cache: 'maven'
      - name: Run integration tests
        run: mvn verify -Dspring.profiles.active=integration
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  security-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          cache: 'maven'
      - name: Run security tests
        run: mvn test -Dtest=*SecurityTest,*PermissionTest
      - name: Run dependency check
        run: mvn dependency:analyze

  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
```

### 6.2 测试覆盖率门禁

```yaml
# JaCoCo覆盖率门禁
execution:
  unit-test:
    coverage:
      minimum: 0.80
  integration-test:
    coverage:
      minimum: 0.70
  security-test:
    coverage:
      minimum: 0.85
```

---

## 七、测试数据管理

### 7.1 测试Fixtures定义

```java
// TestFixtures.java
public class TestFixtures {

    public static Workflow createWorkflow(String tenantId) {
        return Workflow.builder()
            .id(UUID.randomUUID().toString())
            .name("Test Workflow")
            .tenantId(tenantId)
            .definition(JsonNodeFactory.instance.objectNode()
                .put("nodes", JsonNodeFactory.instance.arrayNode())
                .put("edges", JsonNodeFactory.instance.arrayNode()))
            .status(WorkflowStatus.DRAFT)
            .version(1)
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
    }

    public static Workflow createWorkflowWithNodes(String tenantId, Node... nodes) {
        ObjectNode definition = JsonNodeFactory.instance.objectNode();
        ArrayNode nodesArray = definition.putArray("nodes");
        ArrayNode edgesArray = definition.putArray("edges");

        for (int i = 0; i < nodes.length; i++) {
            nodesArray.add(ObjectNodeFactory.instance.objectNode()
                .put("id", nodes[i].getId())
                .put("type", nodes[i].getType()));

            if (i > 0) {
                edgesArray.add(ObjectNodeFactory.instance.objectNode()
                    .put("id", "e" + i)
                    .put("source", nodes[i-1].getId())
                    .put("target", nodes[i].getId()));
            }
        }

        return createWorkflow(tenantId).toBuilder()
            .definition(definition)
            .build();
    }

    public static User createUser(String tenantId, String... roles) {
        return User.builder()
            .id(UUID.randomUUID().toString())
            .email("test-" + UUID.randomUUID() + "@test.com")
            .tenantId(tenantId)
            .roles(Arrays.asList(roles))
            .status(UserStatus.ACTIVE)
            .build();
    }

    public static Webhook createWebhook(String tenantId) {
        String salt = generateSalt();
        return Webhook.builder()
            .id(UUID.randomUUID().toString())
            .tenantId(tenantId)
            .name("Test Webhook")
            .url("https://example.com/webhook")
            .secretSalt(salt)
            .secretHash(hashSecret("test-secret", salt))
            .build();
    }

    public static Execution createExecution(String workflowId, String tenantId) {
        return Execution.builder()
            .id(UUID.randomUUID().toString())
            .workflowId(workflowId)
            .tenantId(tenantId)
            .status(ExecutionStatus.PENDING)
            .createdAt(Instant.now())
            .build();
    }
}
```

### 7.2 测试数据清理策略

```java
// TestDataCleanup.java
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

    @AfterEach
    public void tearDown() {
        cleanAll();
    }
}
```

---

## 八、相关Skill标签

### 8.1 适用Skill

| Skill名称 | 适用场景 | 说明 |
|-----------|----------|------|
| **tdd-workflow** | 通用TDD流程指导 | 本地已有的TDD工作流指导 |
| **springboot-tdd** | Java/Spring Boot集成测试 | 如果涉及Java后端开发 |
| **go-test** | Go语言测试 | 如果涉及Go后端开发 |

### 8.2 Skill使用建议

```
测试开发工作流建议：

1. 单元测试阶段
   - 使用 tdd-workflow 指导测试设计
   - 使用 springboot-tdd 进行Java测试实现

2. 集成测试阶段
   - 使用 tdd-workflow 指导集成测试策略
   - 使用 springboot-tdd 指导Spring Boot集成测试

3. E2E测试阶段
   - 使用 tdd-workflow 指导端到端测试流程
```

---

## 九、Sub-Agent建议

### 9.1 测试开发推荐Agent

| Agent | 职责 | 使用场景 |
|-------|------|----------|
| **tdd-guide** | TDD流程指导、测试编写规范 | 新功能开发、bug修复时主动使用 |
| **code-reviewer** | 测试代码审查 | 每次测试代码编写后使用 |
| **e2e-runner** | Playwright E2E测试专家 | E2E测试开发和调试时使用 |
| **build-error-resolver** | 构建错误修复 | 测试构建失败时使用 |

### 9.2 测试开发工作流

```
┌─────────────────────────────────────────────────────────────────┐
│                    测试开发多Agent协作                            │
│                                                                  │
│  ┌─────────────┐                                               │
│  │  tdd-guide  │ -> 编写测试 (RED)                              │
│  └──────┬──────┘                                               │
│         │                                                       │
│         v                                                       │
│  ┌─────────────┐                                               │
│  │  代码实现   │ -> 实现功能 (GREEN)                             │
│  └──────┬──────┘                                               │
│         │                                                       │
│         v                                                       │
│  ┌─────────────┐                                               │
│  │code-reviewer│ -> 审查测试和代码                               │
│  └──────┬──────┘                                               │
│         │                                                       │
│         v                                                       │
│  ┌─────────────┐                                               │
│  │  e2e-runner │ -> E2E测试（如需要）                           │
│  └─────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 十、相关文件

| 文件路径 | 说明 |
|----------|------|
| `/design/design1.0/tdd_1.3.md` | TDD第三轮设计（详细测试基础设施） |
| `/design/design1.0/tdd_1.2.md` | TDD第二轮设计（测试策略） |
| `/design/design1.0/security_1.3.md` | 安全设计第三轮（安全测试矩阵） |
| `/design/design1.0/security_1.2.md` | 安全设计第二轮（安全测试用例） |
| `/design/design1.0/architect_1.3.md` | 架构设计第三轮（执行引擎） |
| `/design/design1.0/plan_1.3.md` | 功能规划第三轮（测试成本估算） |

---

**文档版本**: 2.0
**创建日期**: 2026-03-29
**相关Skill**: tdd-workflow, springboot-tdd, go-test
**建议Agent**: tdd-guide, code-reviewer, e2e-runner, build-error-resolver
