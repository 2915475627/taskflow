# TaskFlow 项目启动文档

## 服务状态

| 服务 | 状态 | 端口 | 地址 |
|------|------|------|------|
| 前端 (Vite) | ✅ 运行中 | 5173 | http://localhost:5173 |
| 后端 (Spring Boot) | ✅ 运行中 | 8080 | http://localhost:8080 |
| PostgreSQL | ✅ 运行中 | 5432 | localhost:5432 |
| Redis | ✅ 运行中 | 6379 | localhost:6379 |

---

## 快速启动

### 1. 启动数据库 (Docker)

```bash
cd /Users/swufan/projects/github/taskflow

# 启动 PostgreSQL
docker run -d \
  --name taskflow-postgres \
  -e POSTGRES_USER=taskflow \
  -e POSTGRES_PASSWORD=taskflow \
  -e POSTGRES_DB=taskflow \
  -p 5432:5432 \
  postgres:15-alpine
```

### 2. 启动后端

```bash
cd /Users/swufan/projects/github/taskflow/backend

# 方式一: 直接运行
mvn spring-boot:run

# 方式二: 后台运行
mvn spring-boot:run > /tmp/backend.log 2>&1 &

# 验证后端启动
curl http://localhost:8080/api/workflows -H "X-Tenant-ID: 1"
```

### 3. 启动前端

```bash
cd /Users/swufan/projects/github/taskflow/frontend

# 方式一: 直接运行
npm run dev

# 方式二: 后台运行
npm run dev > /tmp/frontend.log 2>&1 &

# 访问
open http://localhost:5173
```

---

## API 端点

### 工作流 API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | /api/workflows | 列出所有工作流 |
| POST | /api/workflows | 创建工作流 |
| GET | /api/workflows/{id} | 获取单个工作流 |
| PUT | /api/workflows/{id} | 更新工作流 |
| DELETE | /api/workflows/{id} | 删除工作流 |
| POST | /api/workflows/{id}/execute | 触发工作流执行 |
| POST | /api/webhooks/callback | Webhook 回调 |
| GET | /api/workflows/{id}/webhooks | 获取 Webhook 配置 |
| POST | /api/workflows/{id}/webhooks | 创建 Webhook 配置 |
| DELETE | /api/workflows/{id}/webhooks/{webhookId} | 删除 Webhook 配置 |

### API 测试示例

```bash
# 列出工作流
curl -s -H "X-Tenant-ID: 1" http://localhost:8080/api/workflows

# 创建工作流
curl -s -X POST \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Workflow","description":"Test"}' \
  http://localhost:8080/api/workflows

# 获取单个工作流
curl -s -H "X-Tenant-ID: 1" http://localhost:8080/api/workflows/1

# 更新工作流
curl -s -X PUT \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Workflow","description":"Updated"}' \
  http://localhost:8080/api/workflows/1

# 触发工作流执行
curl -s -X POST \
  -H "X-Tenant-ID: 1" \
  -H "Content-Type: application/json" \
  http://localhost:8080/api/workflows/1/execute

# Webhook 回调
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"workflowId":1,"status":"COMPLETED","result":{}}' \
  http://localhost:8080/api/webhooks/callback

# 删除工作流
curl -s -X DELETE -H "X-Tenant-ID: 1" http://localhost:8080/api/workflows/1
```

---

## 测试

### 后端测试

```bash
cd /Users/swufan/projects/github/taskflow/backend

# 运行所有测试
mvn test

# 运行特定测试类
mvn test -Dtest=WorkflowServiceTest

# 查看测试报告
open target/surefire-reports/index.html
```

### 前端测试

```bash
cd /Users/swufan/projects/github/taskflow/frontend

# 运行单元测试
npm test -- --run

# 运行测试并查看覆盖率
npm run test:coverage

# 运行 E2E 测试
npx playwright test

# 打开 Playwright 报告
open playwright-report/index.html
```

---

## 项目结构

```
taskflow/
├── backend/                    # Spring Boot 后端
│   ├── src/main/java/com/taskflow/
│   │   ├── config/           # 配置类
│   │   ├── controller/       # REST 控制器
│   │   ├── dto/              # 数据传输对象
│   │   ├── entity/            # JPA 实体
│   │   ├── exception/         # 异常处理
│   │   ├── repository/        # 数据仓库
│   │   ├── security/         # 安全/多租户
│   │   └── service/          # 业务逻辑
│   └── src/main/resources/
│       └── application.yml    # 应用配置
│
├── frontend/                  # React + Vite 前端
│   ├── src/
│   │   ├── components/       # React 组件
│   │   ├── hooks/            # 自定义 Hooks
│   │   ├── services/         # API 服务
│   │   ├── stores/           # Zustand 状态管理
│   │   └── types/            # TypeScript 类型
│   └── e2e/                  # Playwright E2E 测试
│
└── devops/                   # DevOps 配置
```

---

## 前端组件

| 组件 | 描述 |
|------|------|
| WorkflowCanvas | 工作流画布，基于 React Flow |
| Toolbar | 工具栏（缩放、播放、停止、全屏） |
| NodePanel | 节点配置面板 |
| CustomNode | 自定义节点（带执行状态） |
| EdgePanel | 边编辑面板 |

## 前端功能

- 节点拖拽和网格对齐
- 边创建、编辑、删除
- 执行预览和状态显示
- 节点类型: 任务节点 (TASK)、条件节点 (CONDITION)、开始/结束节点

---

## 数据库

### 连接信息

| 属性 | 值 |
|------|-----|
| Host | localhost |
| Port | 5432 |
| Database | taskflow |
| Username | taskflow |
| Password | taskflow |

### 手动连接

```bash
# 通过 Docker 连接
docker exec -it taskflow-postgres psql -U taskflow -d taskflow

# 查看表
\d tenants
\d workflows
\d workflow_versions

# 插入测试租户
INSERT INTO tenants (name, slug) VALUES ('Test Tenant', 'test');
```

---

## 常见问题

### 1. 后端启动失败 - 数据库连接

```
FATAL: password authentication failed
```

**解决**: 检查 `application.yml` 中的数据库用户名密码是否正确

```yaml
spring:
  datasource:
    username: taskflow
    password: taskflow
```

### 2. 后端启动失败 - 端口占用

```
Port 8080 is already in use
```

**解决**: 杀掉占用端口的进程

```bash
# 查找进程
lsof -i :8080

# 杀掉进程
kill -9 <PID>
```

### 3. 前端无法连接后端

**解决**: 确保后端运行在 8080 端口，前端 Vite 代理配置正确

### 4. 单元测试失败

```bash
# 清理并重新编译
mvn clean compile

# 跳过测试运行
mvn spring-boot:run -DskipTests
```

---

## 停止服务

```bash
# 停止前端
pkill -f "vite"

# 停止后端
pkill -f "spring-boot:run"

# 停止数据库
docker stop taskflow-postgres
docker rm taskflow-postgres
```

---

## 测试结果

| 测试类型 | 通过 | 失败 |
|---------|------|------|
| 后端单元测试 | 28 | 0 |
| 前端单元测试 | 72 | 0 |
| E2E 浏览器测试 | 18 | 0 |
| **总计** | **118** | **0** |

---

*最后更新: 2026-03-30*
