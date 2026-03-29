# 工作流引擎运维领域设计 v2.0

## 概述

本文档基于 design1.0 阶段所有设计文档（plan_1.x.md, architect_1.x.md, tdd_1.x.md, security_1.x.md）中提取的运维相关内容，整合 CI/CD 流程、部署架构、监控告警、容器化设计等领域的决策和实施方案。

---

## 一、运维领域设计来源

| 设计文档 | 运维相关内容 |
|----------|--------------|
| architect_1.3.md | 服务架构（4服务）、执行引擎技术栈、ThreadPool配置 |
| architect_1.1.md | 微服务架构、容器化部署、Kubernetes、服务网格 |
| architect_0.3.md | Docker Compose、Dockerfile、K8s资源定义、Istio配置 |
| tdd_1.3.md | CI/CD测试流水线、测试覆盖率要求、GitHub Actions工作流 |
| tdd_1.2.md | 安全测试基础设施、Vert.x测试适配层 |
| security_1.3.md | Kubernetes安全配置、监控审计要求 |
| security_1.2.md | 服务间通信安全、mTLS配置 |

---

## 二、部署架构

### 2.1 服务架构（4服务简化）

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Web UI    │  │   Mobile    │  │   API       │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────────┐
│                    Gateway Service (Nginx)                      │
│  - 请求路由        - 限流 (100 req/min/user)                   │
│  - SSL 终止       - CORS 配置                                  │
└─────────────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   workflow   │    │   executor    │    │     auth     │
│   (merged)   │    │   service     │    │   service    │
│              │    └───────────────┘    └───────────────┘
└───────────────┘             │
                              │
                     ┌────────┴────────┐
                     │  Redis Stream │
                     │ (任务队列/状态) │
                     └───────────────┘
```

### 2.2 服务说明

| 服务 | 职责 | 技术栈 | 副本数 |
|------|------|--------|--------|
| **gateway** | 请求路由、限流、鉴权、负载均衡 | Nginx | 2+ |
| **workflow-api** | 工作流CRUD + 节点执行（合并） | Spring Boot 3.x | 2+ |
| **executor** | 流程执行引擎、DAG调度、状态管理 | Spring Boot + ThreadPool | 3+ |
| **auth** | 认证授权、JWT签发、多租户上下文 | Spring Boot | 2+ |

### 2.3 数据存储

| 组件 | 用途 | 版本 |
|------|------|------|
| **PostgreSQL** | 主数据存储 | 15+ |
| **Redis** | 缓存 + Redis Streams队列 | 7.x |

**决策：MVP阶段暂不部署Kafka**（architect_1.3.md确认）

---

## 三、容器化部署

### 3.1 Docker配置

#### Dockerfile（后端服务多阶段构建）

```dockerfile
# 构建阶段
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn package -DskipTests

# 运行阶段
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "-XX:+UseG1GC", "-Xms512m", "-Xmx1024m", "app.jar"]
```

#### Docker Compose（本地开发）

```yaml
version: '3.8'

services:
  gateway:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./deploy/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - workflow-api
      - executor

  workflow-api:
    build: ./services/workflow-api
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - DATABASE_URL=jdbc:postgresql://postgres:5432/taskflow
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  executor:
    build: ./services/executor
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=taskflow
      - POSTGRES_USER=taskflow
      - POSTGRES_PASSWORD=dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskflow"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### 3.2 Kubernetes部署

#### Deployment配置

```yaml
# workflow-api deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflow-api
  namespace: taskflow
spec:
  replicas: 2
  selector:
    matchLabels:
      app: workflow-api
  template:
    metadata:
      labels:
        app: workflow-api
    spec:
      containers:
        - name: workflow-api
          image: taskflow/workflow-api:latest
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "prod"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: taskflow-db-secret
                  key: url
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 20
```

### 3.3 部署策略

| 环境 | 配置 | 部署策略 | 目的 |
|------|------|----------|------|
| 开发 | 单机Docker Compose | - | 快速迭代 |
| 测试 | K8s单节点 | 滚动更新 | 自动化测试 |
| 预发布 | K8s 3节点 | 滚动更新 + 灰度 | 验证发布 |
| 生产 | K8s 5+节点 | 蓝绿部署 | 零停机 |

---

## 四、CI/CD流程

### 4.1 GitHub Actions工作流

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  JAVA_VERSION: '17'
  NODE_VERSION: '18'

jobs:
  # ==================== 单元测试 ====================
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK ${{ env.JAVA_VERSION }}
        uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: 'temurin'
          cache: 'maven'
      - name: Run unit tests
        run: mvn test -Dtest=*Test -DfailIfNoTests=false
      - name: Upload coverage reports
        uses: codecov/codecov-action@v4
        with:
          files: ./target/site/jacoco/jacoco.xml

  # ==================== 集成测试 ====================
  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: taskflow_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-retries 5
          --health-timeout 5s
        ports:
          - 5432:5432
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-retries 5
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK ${{ env.JAVA_VERSION }}
        uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: 'temurin'
          cache: 'maven'
      - name: Run integration tests
        run: mvn verify -Dspring.profiles.active=integration
        env:
          DATABASE_URL: jdbc:postgresql://localhost:5432/taskflow_test
          REDIS_URL: redis://localhost:6379

  # ==================== 安全测试 ====================
  security-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK ${{ env.JAVA_VERSION }}
        uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: 'temurin'
          cache: 'maven'
      - name: Run security tests
        run: mvn test -Dtest=*SecurityTest,*PermissionTest
      - name: Dependency vulnerability scan
        run: mvn dependency:analyze -DfailOnWarning=true

  # ==================== 前端构建 ====================
  frontend-build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: ./frontend/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: Run linter
        run: npm run lint
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      - name: Build
        run: npm run build
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: ./frontend/dist

  # ==================== E2E测试 ====================
  e2e-test:
    runs-on: ubuntu-latest
    needs: [frontend-build]
    steps:
      - uses: actions/checkout@v4
      - name: Download frontend artifact
        uses: actions/download-artifact@v4
        with:
          name: frontend-dist
          path: ./frontend/dist
      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: ./frontend/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Run E2E tests
        run: npm run test:e2e

  # ==================== 构建Docker镜像 ====================
  docker-build:
    runs-on: ubuntu-latest
    needs: [unit-test, integration-test, frontend-build]
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push workflow-api
        uses: docker/build-push-action@v5
        with:
          context: ./services/workflow-api
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/workflow-api:${{ github.sha }}
            ghcr.io/${{ github.repository }}/workflow-api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ==================== 部署到K8s ====================
  deploy:
    runs-on: ubuntu-latest
    needs: [docker-build]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Setup kubectl
        uses: azure/setup-kubectl@v4
      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
          echo "KUBECONFIG=$(pwd)/kubeconfig" >> $GITHUB_ENV
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/workflow-api \
            workflow-api=ghcr.io/${{ github.repository }}/workflow-api:${{ github.sha }}
          kubectl rollout status deployment/workflow-api --timeout=300s
```

### 4.2 测试覆盖率要求

| 测试类型 | 最低覆盖率 | 报告生成 |
|----------|------------|----------|
| 单元测试 | 80% | JaCoCo |
| 集成测试 | 70% | JaCoCo |
| 安全测试 | 85% | 自定义报告 |
| E2E测试 | 核心流程覆盖 | Playwright |

---

## 五、监控告警

### 5.1 监控架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     Monitoring Stack                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                   │
│  │   Prometheus    │    │     Grafana     │                   │
│  │  (指标收集)      │    │   (可视化)       │                   │
│  └────────┬────────┘    └────────┬────────┘                   │
│           │                        │                             │
│           └────────────┬───────────┘                             │
│                        ▼                                         │
│            ┌─────────────────────────┐                          │
│            │    AlertManager         │                          │
│            │  (告警聚合/路由)         │                          │
│            └────────────┬─────────────┘                          │
│                         ▼                                        │
│            ┌─────────────────────────┐                          │
│            │    Notification          │                          │
│            │  (Email/Slack/DingTalk)  │                          │
│            └─────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 关键指标

| 指标类别 | 指标名称 | 告警阈值 |
|----------|----------|----------|
| **应用指标** | HTTP请求延迟(p99) | > 2s |
| | HTTP错误率 | > 1% |
| | JVM堆内存使用率 | > 80% |
| | 线程池活跃数 | > 80% |
| **执行引擎** | 执行队列长度 | > 1000 |
| | 执行超时数 | > 10/min |
| | 节点执行失败率 | > 5% |
| **系统指标** | CPU使用率 | > 70% |
| | 内存使用率 | > 85% |
| **数据库** | 连接池活跃数 | > 80% |
| | 查询延迟(p99) | > 500ms |

---

## 六、运维开发建议

### 6.1 推荐Sub-Agent

| Agent | 职责 | 适用场景 |
|-------|------|----------|
| **e2e-runner** | E2E测试执行 | Playwright E2E测试、关键用户流验证 |
| **build-error-resolver** | 构建错误修复 | CI/CD构建失败、容器构建问题 |
| **refactor-cleaner** | 死代码清理 | 清理未使用的配置、过时的部署脚本 |

### 6.2 运维开发检查清单

**开发阶段**
- [ ] Docker Compose本地开发环境搭建完成
- [ ] GitHub Actions CI流程配置完成
- [ ] 测试覆盖率达标（80%）
- [ ] 安全测试通过

**部署阶段**
- [ ] Kubernetes集群环境准备
- [ ] ArgoCD部署配置完成
- [ ] 监控告警配置完成
- [ ] 备份策略配置完成

---

**文档版本**: 2.0
**创建日期**: 2026-03-29
**来源**: design1.0系列文档运维内容整合
