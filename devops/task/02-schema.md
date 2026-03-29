# 02-schema: 数据库初始化

## 任务状态

**状态**: 已完成

**完成时间**: 2026-03-29

## 执行的SQL

```sql
-- 创建表结构
CREATE TABLE IF NOT EXISTS tenants (...);
CREATE TABLE IF NOT EXISTS users (...);
CREATE TABLE IF NOT EXISTS workflows (...);
CREATE TABLE IF NOT EXISTS workflow_versions (...);

-- 插入测试数据
INSERT INTO tenants (name, slug, status) VALUES ('Test Tenant', 'test', 'ACTIVE');
```

## 数据库信息

- Host: localhost:5432
- Database: taskflow_test
- User: taskflow
- Password: taskflow

## 容器

```
taskflow-postgres    postgres:15-alpine    0.0.0.0:5432->5432/tcp
```

## 验证

```bash
docker exec taskflow-postgres psql -U taskflow -d taskflow_test -c "\dt"
```
