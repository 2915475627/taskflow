# 工作流引擎安全架构设计 v1.1

## 1. 安全设计概述

### 1.1 设计目标

本安全设计文档基于 `architect_0.3.md` 和 `plan_0.3.md` 的架构设计，从以下角度提供完整的安全方案：

- 认证授权：确保用户身份可信、访问权限精确控制
- 数据安全：保护敏感数据在传输和存储过程中的安全
- API安全：防止API被滥用、攻击
- 输入验证：确保所有用户输入安全可靠
- 安全监控：提供安全事件的可观测性和响应能力

### 1.2 威胁模型分析

```
┌─────────────────────────────────────────────────────────────────┐
│                        威胁模型                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  外部威胁：                                                       │
│  ├── 身份冒充（弱密码、Token泄露）                                 │
│  ├── API滥用（暴力破解、DDOS、恶意调用）                          │
│  ├── 注入攻击（SQL注入、代码注入、命令注入）                      │
│  ├── 跨站攻击（XSS、CSRF）                                        │
│  ├── 数据窃取（中间人攻击、敏感数据泄露）                         │
│  └── Webhook攻击（重放攻击、签名伪造）                            │
│                                                                  │
│  内部威胁：                                                       │
│  ├── 权限滥用（越权访问、权限提升）                               │
│  ├── 数据泄露（内部人员访问敏感数据）                            │
│  ├── 恶意代码（插件/节点中的恶意代码）                            │
│  └── 审计缺失（操作不留痕）                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 安全设计原则

| 原则 | 说明 |
|------|------|
| 最小权限 | 用户只获得完成工作所需的最小权限 |
| 纵深防御 | 多层安全防护，单层失效不影响整体 |
| 默认安全 | 安全配置默认启用，需要显式关闭 |
| 失败安全 | 出现错误时默认拒绝访问 |
| 职责分离 | 关键操作需要多因素验证 |
| 可审计 | 所有安全相关操作必须留下日志 |

---

## 2. 认证方案设计

### 2.1 认证架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        认证架构                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   登录入口    │    │   Token签发   │    │  Token验证   │      │
│  │  ├── 用户名/密码│    │  ├── 登录验证  │    │  ├── JWT验证  │      │
│  │  ├── OAuth   │    │  ├── MFA验证   │    │  ├── 权限检查 │      │
│  │  └── SSO     │    │  ├── 签发Token │    │  ├── 上下文   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             ▼                                   │
│                   ┌──────────────────┐                         │
│                   │   认证服务        │                         │
│                   │  (Auth Service)  │                         │
│                   └──────────────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 认证流程设计

#### 2.2.1 账号密码登录

```
┌─────────────────────────────────────────────────────────────────┐
│                    账号密码登录流程                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 用户提交凭证                                                 │
│     POST /api/v1/auth/login                                     │
│     { "email": "user@example.com", "password": "xxx" }         │
│                                                                  │
│  2. 服务端验证                                                   │
│     ├── 频率限制：5次/分钟，同一IP                               │
│     ├── 账号锁定：连续5次失败锁定30分钟                          │
│     ├── 密码验证：BCrypt哈希比对                                │
│     └── MFA验证：如果开启则要求                                 │
│                                                                  │
│  3. 签发令牌                                                     │
│     ├── Access Token: JWT, 15分钟有效期, HS256                  │
│     ├── Refresh Token: 随机UUID, 7天有效期, 存储至Redis        │
│     └── 登录日志：记录IP、时间、设备                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.2.2 Token 结构设计

```typescript
// Access Token Payload
interface AccessTokenPayload {
  sub: string;           // 用户ID
  email: string;         // 用户邮箱
  tenantId: string;      // 租户ID
  roles: string[];       // 角色列表
  permissions: string[];// 权限列表
  iat: number;           // 签发时间
  exp: number;           // 过期时间
  jti: string;           // Token ID（用于吊销）
}

// Refresh Token 存储结构（Redis）
interface RefreshTokenStore {
  userId: string;
  email: string;
  issuedAt: number;
  expiresAt: number;
  deviceId: string;
  ipAddress: string;
}
```

### 2.3 多因素认证（MFA）

| 认证方式 | 安全级别 | 适用场景 | 实现方案 |
|----------|----------|----------|----------|
| 密码 | 低 | 基础认证 | BCrypt |
| TOTP | 中 | 标准MFA | Google Authenticator / Authy |
| WebAuthn | 高 | 免密登录 | FIDO2 / Passkeys |
| 邮件验证码 | 中 | 敏感操作确认 | 6位数字验证码 |

#### MFA启用流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      MFA启用流程                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 用户请求启用MFA                                              │
│     POST /api/v1/auth/mfa/enable                                │
│                                                                  │
│  2. 生成密钥和QR码                                               │
│     ├── 生成TOTP密钥（base32编码）                               │
│     ├── 生成OTPAuth URI                                         │
│     └── 返回给用户扫描                                           │
│                                                                  │
│  3. 用户验证首次验证码                                           │
│     POST /api/v1/auth/mfa/verify                                │
│     { "code": "123456" }                                        │
│                                                                  │
│  4. 保存MFA种子（加密存储）                                      │
│     ├── 用用户密码派生的密钥加密                                │
│     └── 存储密文至数据库                                         │
│                                                                  │
│  5. 恢复码生成（一次性保存）                                     │
│     └── 生成10个恢复码，用于找回MFA                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 OAuth2第三方登录

| 提供商 | 支持状态 | 配置方式 |
|--------|----------|----------|
| Google | 计划支持 | OAuth2 Client |
| GitHub | 计划支持 | OAuth2 Client |
| Microsoft | 计划支持 | OAuth2 Client |

---

## 3. 授权模型设计

### 3.1 权限模型（RBAC + ABAC）

```
┌─────────────────────────────────────────────────────────────────┐
│                      权限模型架构                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  RBAC（角色级）                                                   │
│  ┌─────────┐     ┌─────────┐     ┌─────────────┐               │
│  │  用户   │────▶│  角色   │────▶│   权限      │               │
│  │ User    │     │ Role    │     │ Permission  │               │
│  └─────────┘     └─────────┘     └─────────────┘               │
│       │               │                                           │
│       │  多对一       │  多对多                                    │
│       ▼               ▼                                           │
│  ┌─────────┐     ┌─────────┐                                     │
│  │ 团队成员│     │ 角色权限│                                     │
│  └─────────┘     └─────────┘                                     │
│                                                                  │
│  ABAC（属性级）                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 策略引擎：canAccess(user, resource, action, context)     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  决策因素：                                                       │
│  ├── 用户属性：角色、团队、部门、IP                              │
│  ├── 资源属性：所有者、敏感级别、状态                            │
│  ├── 操作属性：读、写、执行、删除                                │
│  └── 环境属性：时间、设备、地理位置                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 角色定义

| 角色 | 描述 | 工作流权限 | 执行权限 | 管理权限 |
|------|------|------------|----------|----------|
| Owner | 所有者 | 全部 | 全部 | 全部 |
| Admin | 管理员 | 全部 | 全部 | 团队管理 |
| Editor | 编辑者 | 增删改查 | 执行/暂停/停止 | 无 |
| Viewer | 查看者 | 仅查看 | 仅查看执行状态 | 无 |

### 3.3 权限矩阵

```
┌─────────────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ 操作            │  Owner  │  Admin  │ Editor  │ Viewer  │  公共   │
├─────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 创建工作流      │   ✓     │   ✓     │   ✓     │    ✗    │    ✗    │
│ 编辑工作流      │   ✓     │   ✓     │   ✓     │    ✗    │    ✗    │
│ 删除工作流      │   ✓     │   ✓     │   ✗     │    ✗    │    ✗    │
│ 发布工作流      │   ✓     │   ✓     │   ✓     │    ✗    │    ✗    │
│ 执行工作流      │   ✓     │   ✓     │   ✓     │    ✗    │    ✗    │
│ 查看执行记录    │   ✓     │   ✓     │   ✓     │   ✓     │    ✗    │
│ 管理团队成员    │   ✓     │   ✓     │   ✗     │    ✗    │    ✗    │
│ 管理Webhook    │   ✓     │   ✓     │   ✓     │    ✗    │    ✗    │
│ 上传插件       │   ✓     │   ✓     │   ✗     │    ✗    │    ✗    │
│ 查看敏感配置   │   ✓     │   ✓     │   ✗     │    ✗    │    ✗    │
└─────────────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

### 3.4 数据范围控制

```typescript
// 资源访问范围
type AccessScope = 'own' | 'team' | 'tenant' | 'all';

// 权限检查示例
async function checkPermission(
  userId: string,
  resourceType: ResourceType,
  action: Action,
  resourceId: string
): Promise<boolean> {
  const user = await getUser(userId);
  const resource = await getResource(resourceType, resourceId);

  // 1. 超级管理员可访问所有
  if (user.hasRole('super_admin')) return true;

  // 2. 资源所有者可访问
  if (resource.ownerId === userId) return true;

  // 3. 团队成员在团队范围内可访问
  if (resource.teamId && resource.teamId === user.teamId) {
    const role = await getUserRoleInTeam(userId, resource.teamId);
    return roleHasPermission(role, resourceType, action);
  }

  // 4. 租户管理员在租户范围内可访问
  if (user.hasRole('tenant_admin') && resource.tenantId === user.tenantId) {
    return roleHasPermission('admin', resourceType, action);
  }

  return false;
}
```

### 3.5 敏感操作二次验证

```
┌─────────────────────────────────────────────────────────────────┐
│                    敏感操作二次验证                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  需要二次验证的操作：                                             │
│  ├── 删除工作流（团队内所有工作流）                               │
│  ├── 导出敏感数据                                                │
│  ├── 修改团队成员权限                                            │
│  ├── 删除团队成员                                                │
│  ├── 修改Billing信息                                            │
│  ├── 删除API Key                                                │
│  └── 导出执行日志（包含敏感数据时）                               │
│                                                                  │
│  验证流程：                                                       │
│  1. 用户触发敏感操作                                             │
│  2. 系统弹出二次验证（密码/MFA/验证码）                         │
│  3. 验证通过后执行操作                                           │
│  4. 记录操作审计日志                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. API安全防护设计

### 4.1 API安全层级

```
┌─────────────────────────────────────────────────────────────────┐
│                      API安全层级                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 7 (应用层)                                                │
│  ├── 认证授权                                                   │
│  ├── 输入验证                                                   │
│  ├── 速率限制                                                   │
│  └── 请求日志                                                   │
│                                                                  │
│  Layer 6 (业务层)                                                │
│  ├── 业务规则校验                                                │
│  ├── 敏感数据脱敏                                                │
│  └── 审计日志                                                    │
│                                                                  │
│  Layer 5 (数据层)                                                │
│  ├── SQL注入防护                                                │
│  ├── 参数化查询                                                  │
│  └── 数据加密                                                    │
│                                                                  │
│  Layer 4 (传输层)                                                │
│  ├── TLS 1.3                                                   │
│  ├── 证书管理                                                   │
│  └── HSTS                                                       │
│                                                                  │
│  Layer 3 (网络层)                                               │
│  ├── WAF                                                        │
│  ├── DDoS防护                                                   │
│  └── IP黑白名单                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 认证中间件设计

```java
// JWT认证过滤器
@Component
@Order(1)
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) {
        // 1. 提取Token
        String authHeader = request.getHeader("Authorization");
        String token = extractToken(authHeader);

        if (token != null) {
            try {
                // 2. 验证Token
                var claims = jwtService.validate(token);

                // 3. 检查是否在黑名单
                if (jwtBlacklistService.isBlacklisted(claims.getJti())) {
                    sendUnauthorized(response, "Token has been revoked");
                    return;
                }

                // 4. 设置安全上下文
                var userDetails = new JwtUserDetails(claims);
                var authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities()
                );
                authentication.setDetails(new WebAuthenticationDetailsSource()
                    .buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (JwtException e) {
                log.warn("Invalid JWT: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}
```

### 4.3 授权拦截器

```java
// 方法级权限检查
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePermission {
    ResourceType resource() default ResourceType.WORKFLOW;
    Action action();
    AccessScope scope() default AccessScope.TEAM;
}

// 权限检查实现
@Component
public class PermissionInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                            HttpServletResponse response,
                            Object handler) {
        if (!handler.getClass().isAnnotationPresent(RequirePermission.class)) {
            return true;
        }

        var annotation = handler.getClass().getAnnotation(RequirePermission.class);
        var user = SecurityContextHolder.getContext().getAuthentication();
        var resourceType = annotation.resource();
        var action = annotation.action();

        if (!permissionService.hasPermission(user, resourceType, action)) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.getWriter().write("{\"error\":\"Insufficient permissions\"}");
            return false;
        }

        return true;
    }
}
```

### 4.4 速率限制设计

| 端点类型 | 限制规则 | 突发允许 | 说明 |
|----------|----------|----------|------|
| 登录 | 5次/分钟/IP | 10次 | 防止暴力破解 |
| 注册 | 3次/小时/IP | 3次 | 防止批量注册 |
| API调用 | 100次/分钟/用户 | 200次 | 标准用户限制 |
| 执行工作流 | 10次/分钟/用户 | 15次 | 防止滥用 |
| Webhook | 100次/分钟/端点 | 200次 | 防止滥用 |
| 文件上传 | 10次/分钟/用户 | 15次 | 防止滥用 |

#### 分布式限流实现

```java
// 基于Redis的分布式限流
@Component
public class RateLimitService {

    public boolean isAllowed(String key, int limit, int windowSeconds) {
        String luaScript = """
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])

            local current = redis.call('INCR', key)
            if current == 1 then
                redis.call('EXPIRE', key, window)
            end

            return current <= limit
            """;

        DefaultRedisScript<Long> script = new DefaultRedisScript<>(luaScript, Long.class);
        Long result = redisTemplate.execute(
            script,
            Collections.singletonList(key),
            String.valueOf(limit),
            String.valueOf(windowSeconds)
        );

        return result != null && result <= limit;
    }
}
```

### 4.5 CORS配置

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins(allowedOrigins.split(","))
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("Authorization", "Content-Type", "X-Request-ID")
            .exposedHeaders("X-Total-Count", "X-Page-Number")
            .allowCredentials(true)
            .maxAge(3600);
    }
}
```

### 4.6 请求体验证

```java
// 全局请求体验证器
@Component
public class RequestValidationFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request,
                        ServletResponse response,
                        FilterChain chain) {
        HttpServletRequest httpRequest = (HttpServletRequest) request;

        // 1. Content-Type验证
        if (httpRequest.getMethod().equals("POST") ||
            httpRequest.getMethod().equals("PUT")) {
            String contentType = httpRequest.getContentType();
            if (contentType == null ||
                !contentType.startsWith("application/json")) {
                sendBadRequest(response, "Content-Type must be application/json");
                return;
            }
        }

        // 2. 请求体大小限制
        long contentLength = httpRequest.getContentLength();
        if (contentLength > 10 * 1024 * 1024) { // 10MB
            sendBadRequest(response, "Request body too large (max 10MB)");
            return;
        }

        // 3. 恶意payload检测
        String body = getRequestBody(httpRequest);
        if (containsMaliciousPattern(body)) {
            log.warn("Malicious request detected from {}", httpRequest.getRemoteAddr());
            sendBadRequest(response, "Invalid request content");
            return;
        }

        chain.doFilter(request, response);
    }
}
```

---

## 5. 输入验证设计

### 5.1 验证层级

```
┌─────────────────────────────────────────────────────────────────┐
│                      输入验证层级                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: 网络层                                                │
│  ├── WAF规则过滤恶意请求                                         │
│  ├── IP黑白名单                                                  │
│  └── 协议验证（HTTP方法、头字段）                                │
│                                                                  │
│  Layer 2: 应用层                                                │
│  ├── Bean Validation                                           │
│  ├── 自定义验证器                                                │
│  └── 业务规则验证                                                │
│                                                                  │
│  Layer 3: 节点层（工作流执行时）                                  │
│  ├── 节点输入Schema验证                                          │
│  ├── 变量插值安全检查                                            │
│  └── 输出数据脱敏                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 请求体验证Schema

```typescript
// 创建工作流验证
const CreateWorkflowSchema = z.object({
  name: z.string()
    .min(1, "名称不能为空")
    .max(100, "名称不能超过100字符")
    .regex(/^[a-zA-Z0-9_\-\u4e00-\u9fa5]+$/, "名称只能包含字母、数字、下划线、中文"),
  description: z.string()
    .max(500, "描述不能超过500字符")
    .optional(),
  nodes: z.array(NodeSchema).min(1, "至少需要一个节点"),
  edges: z.array(EdgeSchema),
  variables: z.array(VariableSchema).optional(),
});

// HTTP节点配置验证
const HttpNodeConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  url: z.string()
    .url("URL格式不正确")
    .refine(
      (url) => !isInternalUrl(url),
      "不能访问内部服务"
    ),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  timeout: z.number().int().min(1).max(300).default(30),
});

// 变量插值安全验证
const VariableInterpolationSchema = z.string()
  .max(10000)
  .refine(
    (text) => !containsDangerousPattern(text),
    "包含危险的变量引用模式"
  );
```

### 5.3 工作流变量插值安全

```java
// 变量插值上下文隔离
@Component
public class VariableContext {

    // 白名单允许的变量访问模式
    private static final Pattern SAFE_VARIABLE_PATTERN = Pattern.compile(
        "^[a-zA-Z_][a-zA-Z0-9_]*(\\.[a-zA-Z_][a-zA-Z0-9_]*)*$"
    );

    // 危险模式检测
    private static final String[] DANGEROUS_PATTERNS = {
        "${",           // EL表达式注入
        "{{",           // 模板注入
        ".__",          // 属性遍历
        "constructor",  // 原型链访问
        "__proto__",    // 原型链访问
    };

    public String interpolate(String template, Map<String, Object> context) {
        // 1. 解析变量引用
        Pattern pattern = Pattern.compile("\\{\\{([^}]+)\\}\\}");
        Matcher matcher = pattern.matcher(template);

        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            String variable = matcher.group(1).trim();

            // 2. 安全检查
            if (!isSafeVariable(variable)) {
                throw new SecurityException("Unsafe variable reference: " + variable);
            }

            // 3. 获取值（只允许访问白名单中的字段）
            Object value = resolveVariable(variable, context);
            matcher.appendReplacement(result, value != null ? value.toString() : "");
        }
        matcher.appendTail(result);

        return result.toString();
    }

    private boolean isSafeVariable(String variable) {
        // 检查危险模式
        for (String pattern : DANGEROUS_PATTERNS) {
            if (variable.contains(pattern)) {
                return false;
            }
        }
        return SAFE_VARIABLE_PATTERN.matcher(variable).matches();
    }
}
```

### 5.4 执行节点输入验证

```java
// 节点执行前验证
@Component
public class NodeInputValidator {

    public void validate(Node node, Map<String, Object> input) {
        var schema = getNodeInputSchema(node.getType());

        // 1. Schema验证
        Set<ConstraintViolation> violations = validator.validate(input, schema);
        if (!violations.isEmpty()) {
            throw new ValidationException(violations);
        }

        // 2. 安全验证
        switch (node.getType()) {
            case HTTP:
                validateHttpNode(node.getConfig());
                break;
            case CODE:
                validateCodeNode(node.getConfig());
                break;
            case LLM:
                validateLlmNode(node.getConfig());
                break;
        }
    }

    private void validateHttpNode(HttpNodeConfig config) {
        String url = config.getUrl();

        // 3. URL安全检查
        if (!isAllowedUrl(url)) {
            throw new SecurityException("URL not in whitelist: " + url);
        }

        // 4. 内部IP检查
        if (isInternalIp(extractHost(url))) {
            throw new SecurityException("Cannot access internal resources");
        }

        // 5. 敏感Header检查
        if (containsSensitiveHeaders(config.getHeaders())) {
            throw new SecurityException("Sensitive headers not allowed");
        }
    }
}
```

---

## 6. 数据安全设计

### 6.1 数据分类

```
┌─────────────────────────────────────────────────────────────────┐
│                      数据分类矩阵                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  高敏感                                                          │
│  ├── 用户密码                                                    │
│  ├── API密钥/密钥                                                │
│  ├── 支付信息                                                    │
│  └── 个人身份信息（PII）                                         │
│                                                                  │
│  中敏感                                                          │
│  ├── 工作流定义（含配置）                                        │
│  ├── 执行记录                                                    │
│  ├── 团队成员信息                                                │
│  └── 用户邮箱                                                    │
│                                                                  │
│  低敏感                                                          │
│  ├── 公开模板                                                    │
│  ├── 节点定义                                                    │
│  └── 执行统计                                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 存储加密策略

| 数据类型 | 存储加密 | 传输加密 | 脱敏处理 |
|----------|----------|----------|----------|
| 密码 | BCrypt+Salt | TLS | N/A |
| API Key | AES-256-GCM | TLS | 日志/响应中隐藏 |
| LLM Key | KMS+Envelope | TLS | 完全隐藏 |
| 工作流定义 | 数据库加密 | TLS | 配置值脱敏 |
| 执行日志 | 可选加密 | TLS | 敏感字段脱敏 |
| 用户数据 | 数据库加密 | TLS | PII字段脱敏 |

### 6.3 敏感数据加密实现

```java
// 敏感字段加密注解
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Encrypted {
    String value() default "AES-256-GCM";
}

// 加密服务
@Service
public class EncryptionService {

    private final KeyManagementService kms;

    public String encrypt(String plaintext, String keyId) {
        // 1. 从KMS获取数据加密密钥
        byte[] dek = kms.getDataEncryptionKey(keyId);

        // 2. AES-256-GCM加密
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        SecretKeySpec keySpec = new SecretKeySpec(dek, "AES");
        cipher.init(Cipher.ENCRYPT_MODE, keySpec);

        byte[] iv = cipher.getIV();
        byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

        // 3. 组装密文（IV + 密文 + 认证标签）
        ByteBuffer buffer = ByteBuffer.allocate(iv.length + ciphertext.length);
        buffer.put(iv);
        buffer.put(ciphertext);

        return Base64.getEncoder().encodeToString(buffer.array());
    }
}
```

### 6.4 日志脱敏

```java
// 日志脱敏过滤器
@Component
public class LogMaskingFilter extends OncePerRequestFilter {

    private static final Map<String, Function<String, String>> MASKING_RULES = Map.of(
        "password", v -> "******",
        "api[_-]?key", v -> "sk-****" + v.substring(Math.max(0, v.length() - 4)),
        "token", v -> v.substring(0, 8) + "****",
        "email", v -> v.replaceAll("(?<=.{2}).(?=[^@]*@)", "*"),
        "credit[_-]?card", v -> "****-****-****-" + v.substring(v.length() - 4)
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) {
        var loggingEvent = new MutableLogEvent();
        var originalOut = response.getOutputStream();
        var maskedOut = new MaskedOutputStream(response, MASKING_RULES);

        // 包装response以捕获响应内容
        var maskedResponse = new HttpServletResponseWrapper(response) {
            @Override
            public ServletOutputStream getOutputStream() {
                return maskedOut;
            }
        };

        chain.doFilter(request, maskedResponse);
    }
}
```

### 6.5 数据传输安全

```yaml
# TLS配置
server:
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: ${KEY_STORE_PASSWORD}
    key-store-type: PKCS12
    protocol: TLS
    enabled-protocols: TLSv1.3
    ciphers: TLS_AES_256_GCM_SHA384,TLS_CHACHA20_POLY1305_SHA256

# HSTS配置
security:
  headers:
    hsts: "max-age=31536000; includeSubDomains"
    x-frame-options: "DENY"
    x-content-type-options: "nosniff"
    x-xss-protection: "1; mode=block"
    content-security-policy: "default-src 'self'; script-src 'self' 'unsafe-inline'"
```

---

## 7. Webhook安全设计

### 7.1 Webhook安全架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    Webhook安全架构                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  输入安全                                                        │
│  ├── 签名验证（HMAC-SHA256）                                     │
│  ├── IP白名单                                                   │
│  ├── 请求频率限制                                               │
│  └── Payload大小限制                                            │
│                                                                  │
│  输出安全                                                        │
│  ├── 回调签名生成                                               │
│  ├── TLS强制                                                   │
│  └── 重试策略（指数退避）                                        │
│                                                                  │
│  防重放                                                          │
│  ├── Timestamp验证                                              │
│  └── Nonce检查                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Webhook签名验证

```java
// Webhook签名验证服务
@Service
public class WebhookSignatureService {

    private static final String SIGNATURE_ALGORITHM = "HmacSHA256";
    private static final long TIMESTAMP_TOLERANCE = 300000; // 5分钟

    public boolean verify(WebhookRequest request) {
        // 1. 时间戳验证
        long timestamp = request.getTimestamp();
        if (Math.abs(System.currentTimeMillis() - timestamp) > TIMESTAMP_TOLERANCE) {
            log.warn("Webhook timestamp out of tolerance");
            return false;
        }

        // 2. Nonce防重放
        String nonceKey = "webhook:" + request.getWebhookId() + ":" + request.getNonce();
        if (redisTemplate.hasKey(nonceKey)) {
            log.warn("Webhook nonce replay detected");
            return false;
        }

        // 3. 签名验证
        String signature = request.getSignature();
        String expectedSignature = generateSignature(
            request.getPayload(),
            request.getTimestamp(),
            request.getNonce(),
            request.getSecret()
        );

        if (!secureCompare(signature, expectedSignature)) {
            log.warn("Webhook signature mismatch");
            return false;
        }

        // 4. 记录Nonce（设置过期时间）
        redisTemplate.opsForValue().set(nonceKey, "1", 24, TimeUnit.HOURS);

        return true;
    }

    private String generateSignature(String payload, long timestamp,
                                     String nonce, String secret) {
        String signedContent = timestamp + "." + nonce + "." + payload;
        Mac mac = Mac.getInstance(SIGNATURE_ALGORITHM);
        SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(), SIGNATURE_ALGORITHM);
        mac.init(keySpec);
        byte[] hmac = mac.doFinal(signedContent.getBytes());
        return "sha256=" + Hex.encodeHexString(hmac);
    }
}
```

### 7.3 Webhook限流

```yaml
# Webhook限流配置
webhook:
  rate-limits:
    default: "100/minute, 1000/hour"
    authenticated: "500/minute, 5000/hour"
  ip-whitelist:
    enabled: true
    ips: []
  payload:
    max-size: 1048576  # 1MB
    timeout: 30000    # 30秒
```

---

## 8. 安全监控设计

### 8.1 安全事件类型

```
┌─────────────────────────────────────────────────────────────────┐
│                      安全事件类型                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  认证事件                                                        │
│  ├── 登录成功                                                   │
│  ├── 登录失败（密码错误）                                        │
│  ├── 登录失败（账号锁定）                                       │
│  ├── Token刷新                                                  │
│  ├── Token撤销                                                  │
│  ├── MFA启用/禁用                                               │
│  └── 登出                                                       │
│                                                                  │
│  授权事件                                                        │
│  ├── 权限检查通过                                               │
│  ├── 权限检查拒绝（无权限）                                      │
│  ├── 权限检查拒绝（越权）                                        │
│  └── 敏感操作                                                   │
│                                                                  │
│  API事件                                                        │
│  ├── 请求速率超限                                               │
│  ├── 异常请求（400/401/403/429/500）                            │
│  ├── 恶意请求检测                                               │
│  └── 大文件上传                                                 │
│                                                                  │
│  业务事件                                                        │
│  ├── 工作流创建/修改/删除                                       │
│  ├── 工作流执行开始/结束                                        │
│  ├── 插件上传                                                   │
│  └── 配置变更                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 审计日志设计

```java
// 审计日志服务
@Service
public class AuditService {

    public void log(AuditEvent event) {
        // 1. 构造审计日志
        AuditLog log = AuditLog.builder()
            .timestamp(Instant.now())
            .userId(event.getUserId())
            .tenantId(event.getTenantId())
            .eventType(event.getType())
            .resourceType(event.getResourceType())
            .resourceId(event.getResourceId())
            .action(event.getAction())
            .ipAddress(event.getIpAddress())
            .userAgent(event.getUserAgent())
            .result(event.getResult())
            .details(event.getDetails())
            .build();

        // 2. 异步写入
        asyncExecutor.execute(() -> writeToDatabase(log));

        // 3. 敏感数据脱敏
        maskSensitiveData(log);

        // 4. 发送到SIEM（可选）
        if (event.isSecurityRelevant()) {
            sendToSiem(log);
        }
    }

    private void maskSensitiveData(AuditLog log) {
        // 密码/Token等不记录
        log.getDetails().remove("password");
        log.getDetails().remove("token");
    }
}
```

### 8.3 安全监控指标

| 指标 | 告警阈值 | 说明 |
|------|----------|------|
| 登录失败率 | >10%/分钟 | 暴力破解检测 |
| API错误率 | >5%/分钟 | 服务异常检测 |
| 请求速率 | >限流80% | 滥用倾向检测 |
| 异常IP数 | >20/小时 | 攻击检测 |
| 敏感API调用 | >阈值 | 数据导出检测 |
| 执行超时 | >100/小时 | 性能问题检测 |

### 8.4 告警通知

```yaml
# 告警配置
alerts:
  security:
    - name: "Brute Force Attack"
      condition: "login_failures > 20 in 5 minutes"
      severity: HIGH
      channels: [email, slack, sms]
      action: "block_ip"

    - name: "Rate Limit Exceeded"
      condition: "rate_limit_hits > 100 in 1 minute"
      severity: MEDIUM
      channels: [email, slack]
      action: "notify"

    - name: "Sensitive Data Access"
      condition: "sensitive_api_calls > 50 in 10 minutes"
      severity: HIGH
      channels: [email, slack]
      action: "require_review"

    - name: "MFA Disabled"
      condition: "mfa_disabled == true"
      severity: HIGH
      channels: [email, slack]
      action: "notify"
```

---

## 9. 多租户安全隔离

### 9.1 租户隔离架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    多租户隔离架构                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  网络隔离                                                        │
│  ├── Kubernetes Namespace隔离                                   │
│  ├── NetworkPolicy限制Pod间通信                                  │
│  └── VPC/安全组配置                                             │
│                                                                  │
│  数据隔离                                                        │
│  ├── 共享数据库 + tenant_id列                                    │
│  ├── Row Level Security策略                                     │
│  └── 应用层租户上下文                                            │
│                                                                  │
│  认证隔离                                                        │
│  ├── 租户域认证                                                  │
│  └── 跨租户访问控制                                              │
│                                                                  │
│  资源隔离                                                        │
│  ├── Redis Key前缀隔离                                           │
│  ├── Kafka Topic隔离                                             │
│  └── 文件存储桶隔离                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 租户上下文实现

```java
// 租户上下文
@Component
public class TenantContext {

    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_USER = new ThreadLocal<>();

    public static void setTenantId(String tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static String getTenantId() {
        return CURRENT_TENANT.get();
    }

    public static void clear() {
        CURRENT_TENANT.remove();
        CURRENT_USER.remove();
    }
}

// 数据访问层自动过滤
@Repository
public class WorkflowRepository {

    @Query("SELECT w FROM Workflow w WHERE w.id = :id")
    default Optional<Workflow> findById(Long id) {
        String tenantId = TenantContext.getTenantId();
        // 自动追加租户过滤
        return Optional.empty(); // 由AOP实现
    }
}
```

### 9.3 RLS策略

```sql
-- 启用行级安全
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 租户隔离策略
CREATE POLICY tenant_isolation_workflows ON workflows
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id')::text)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::text);

-- 团队访问策略
CREATE POLICY team_access_workflows ON workflows
    FOR ALL
    USING (
        tenant_id = current_setting('app.tenant_id')::text
        AND (
            created_by = current_setting('app.user_id')::text
            OR id IN (
                SELECT workflow_id
                FROM team_members
                WHERE user_id = current_setting('app.user_id')::text
            )
        )
    );
```

---

## 10. 安全配置清单

### 10.1 生产环境安全配置

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| JWT Access Token有效期 | 15分钟 | 平衡安全与体验 |
| JWT Refresh Token有效期 | 7天 | 需要安全存储 |
| 密码最小长度 | 12位 | 包含大小写数字符号 |
| 密码历史 | 5次 | 防止重复使用旧密码 |
| 账号锁定阈值 | 5次 | 连续失败后锁定 |
| 账号锁定时间 | 30分钟 | 防止暴力破解 |
| 会话超时 | 24小时 | 活跃会话有效期 |
| 并发会话数 | 3个 | 防止账号共享 |
| API速率限制 | 100/分钟 | 标准用户限制 |
| 文件上传大小 | 10MB | 防止资源耗尽 |
| 请求Body大小 | 10MB | 防止大Payload攻击 |
| TLS版本 | TLS 1.3 only | 禁用旧版本 |
| HSTS | 启用 | 强制HTTPS |

### 10.2 安全Headers

| Header | 值 | 说明 |
|--------|-----|------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains | HSTS |
| X-Content-Type-Options | nosniff | 防止MIME嗅探 |
| X-Frame-Options | DENY | 防止点击劫持 |
| X-XSS-Protection | 1; mode=block | XSS防护（兼容旧浏览器） |
| Content-Security-Policy | default-src 'self' | CSP防护 |
| Referrer-Policy | strict-origin-when-cross-origin | 引用来源控制 |
| Permissions-Policy | geolocation=(), microphone=() | 权限控制 |

### 10.3 依赖安全

```xml
<!-- Maven依赖安全检查 -->
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <configuration>
        <failBuildOnCVSS>7</failBuildOnCVSS>
        <cveValidForHours>24</cveValidForHours>
    </configuration>
</plugin>
```

---

## 11. 安全检查清单

### 11.1 开发阶段检查

- [ ] 所有用户输入都有验证
- [ ] 敏感数据加密存储
- [ ] 使用参数化查询
- [ ] 无硬编码密钥
- [ ] 错误信息不泄露敏感信息
- [ ] 日志不记录敏感数据
- [ ] 文件上传安全检查
- [ ] API限流实现

### 11.2 测试阶段检查

- [ ] 认证测试（正确/错误凭证）
- [ ] 授权测试（权限边界）
- [ ] 注入测试（SQL/XSS/Code）
- [ ] 限流测试（边界值）
- [ ] 文件上传测试（恶意文件）
- [ ] 并发测试（竞态条件）
- [ ] 加密测试（数据泄露）

### 11.3 部署阶段检查

- [ ] 生产环境使用TLS 1.3
- [ ] 安全Headers配置
- [ ] 监控告警配置
- [ ] 备份恢复测试
- [ ] 密钥轮换机制
- [ ] 应急响应流程

---

## 12. 相关文件

- `/design/design1.0/architect_0.3.md` - 架构设计
- `/design/design1.0/plan_0.3.md` - 实施计划

---

## 13. 待讨论问题

1. **第三方登录**：是否优先支持Google/GitHub OAuth？
2. **MFA策略**：是否强制所有用户启用MFA？
3. **审计保留**：安全日志保留多长时间？是否符合GDPR？
4. **渗透测试**：是否需要第三方安全评估？
5. **应急响应**：是否有明确的安全事件响应流程？
