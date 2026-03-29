# 01-middleware: 中间件启动

## 任务状态

**状态**: 已完成

**完成时间**: 2026-03-29

## 执行的命令

### 1. 启动 PostgreSQL

```bash
docker run -d -p 5432:5432 \
  -e POSTGRES_DB=taskflow \
  -e POSTGRES_USER=taskflow \
  -e POSTGRES_PASSWORD=taskflow \
  --name taskflow-postgres \
  postgres:15-alpine
```

### 2. 启动 Redis

```bash
docker run -d -p 6379:6379 \
  --name taskflow-redis \
  redis:7-alpine
```

## 验证结果

| 服务 | 状态 | 端口 | 验证命令 |
|------|------|------|----------|
| PostgreSQL | ✅ 运行中 | 5432 | `pg_isready -U taskflow` |
| Redis | ✅ 运行中 | 6379 | `redis-cli ping` |

## 容器信息

```
taskflow-postgres    postgres:15-alpine    0.0.0.0:5432->5432/tcp
docker-redis-1      redis:7-alpine       6379/tcp
```

## 连接配置

### PostgreSQL
- Host: localhost
- Port: 5432
- Database: taskflow
- Username: taskflow
- Password: taskflow

### Redis
- Host: localhost
- Port: 6379

## 待办事项

- [ ] 更新 backend/src/main/resources/application.yml 中的数据库配置
- [ ] 运行后端集成测试验证连接
