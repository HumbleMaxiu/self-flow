# Self-Flow — AGENTS（协作与工程规范）

本文件是本仓库的协作源文件，约束开发流程、目录组织、质量门槛与交接标准。所有自动化代理与协作者都应遵守。

## 项目概述

- 项目类型：自托管 AI 工作流平台（Workflow OS）
- 核心目标：把 LLM、检索、脚本与外部系统连接器编排为可追溯、可重试、可回滚的工作流
- 近期 MVP：用“RSS→偏好总结→Notion”模板验证触发、幂等、写回、配置与可观测

## 事实来源（Source of Truth）

- 产品需求与路线图：`./PRD.md`
- 协作与工程规范：`./AGENTS.md`

任何实现与改动都必须与 PRD 对齐；如果实现需要改变范围或里程碑，先改 PRD 再写代码。

## 开发命令（必须可直接运行）

### 安装依赖

```bash
pnpm install
```

### 质量检查

```bash
pnpm lint
pnpm -r typecheck
pnpm test
```

### 仅运行某个包

```bash
pnpm turbo run lint --filter @self-flow/api
pnpm turbo run typecheck --filter @self-flow/workflow
pnpm turbo run test --filter @self-flow/shared
```

### 格式化

```bash
pnpm format
pnpm format:check
```

### 本地基础设施（Postgres + Redis）

```bash
docker compose up -d
docker compose ps
docker compose down
```

## Monorepo 架构与目录结构

### 目录职责

- `apps/`：可部署的服务/应用（API、Worker 等）
- `packages/`：可复用的领域包（类型、工作流协议、连接器等）

### 当前目录概览

```text
self-flow/
  apps/
    api/
    worker/
  packages/
    shared/
    workflow/
  docker-compose.yml
  eslint.config.js
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  turbo.json
```

### 依赖组织规则

- 新能力优先放在 `packages/`，避免在 `apps/` 内重复实现
- 跨包共享类型统一放在 `packages/shared`，禁止复制粘贴
- 包与包之间通过明确的 public API 交互，不要互相读取内部文件

## 工作方式（Daily Flow）

1. 对齐目标：定位 PRD 相关章节与验收标准
2. 拆分任务：保证单次改动能在 60 分钟内验证闭环
3. 控制范围：尽量一次只解决一个问题，避免夹带重构
4. 本地验证：至少通过 lint、typecheck、test
5. 交接输出：说明做了什么、没做什么、风险点、下一步

## 代码规范

### TypeScript 规范

- 默认使用严格类型；除非阻断开发，不使用 `any`
- 所有对外输入/输出（API 请求、工作流节点 I/O、连接器 payload、LLM 结构化输出）必须显式校验

### 可靠性规范

- 幂等优先：触发器、队列消费、连接器写回均必须可重复执行
- 可追溯优先：任何副作用必须能回链到 Run/Step/Artifact
- 失败可恢复：错误必须结构化记录，重试策略可配置

## 测试策略

- 单元测试：优先覆盖校验器、协议转换、幂等键生成、连接器映射
- 集成测试：覆盖队列执行与数据库持久化的最小闭环
- 端到端（后续）：至少覆盖“触发→执行→写回→查询结果”

交接前必须运行：

```bash
pnpm lint
pnpm -r typecheck
pnpm test
```

## 安全与密钥

- ⚠️ 不允许在代码、日志、报错信息中输出密钥与敏感数据
- ⚠️ 不提交 `.env`、token、cookie、真实私有 RSS 源配置到仓库
- 连接器密钥（例如 Notion token）必须加密存储，并遵循最小权限

## PR 与交接规范

- PR 标题：`[<project_name>] <Title>`
- PR 内容必须包含：变更点、影响范围、验证方式、已知风险、下一步
- 不要把“产品改动 + 大范围重构”混在一个 PR

保持风格：沟通清晰、改动克制、可验证可回滚，随时能交给下一位继续推进。
