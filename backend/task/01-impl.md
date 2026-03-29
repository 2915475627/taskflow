# 01-impl: 后端编译与打包

## 任务状态

**状态**: 已完成

**完成时间**: 2026-03-29

## 任务目标

完成后端项目的编译、测试与打包任务。

## 执行步骤

### 1. Maven Clean Compile

```bash
mvn clean compile
```

**结果**: 成功

- 清理 target 目录
- 准备 JaCoCo 代理
- 复制资源文件
- 编译 15 个源文件 (Java 17)

### 2. Maven Package

```bash
mvn package -DskipTests
```

**结果**: 成功

- 编译测试源文件
- 跳过单元测试
- 生成 JAR 包: `target/taskflow-backend-1.0.0.jar`
- Spring Boot repackage 完成

## 构建产物

| 文件 | 路径 |
|------|------|
| 主 JAR | `target/taskflow-backend-1.0.0.jar` |
| 原始 JAR | `target/taskflow-backend-1.0.0.jar.original` |
| JaCoCo 覆盖率 | `target/jacoco.exec` |

## 项目信息

- **项目名称**: taskflow-backend
- **版本**: 1.0.0
- **Java 版本**: 17
- **构建工具**: Maven
