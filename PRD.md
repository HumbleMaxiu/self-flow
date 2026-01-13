# PRD：Self-Flow（自托管 AI 工作流平台 / Workflow OS）

## 1. 背景与问题

个人在日常信息消费与产出中存在重复劳动与上下文切换成本：
- 信息源分散（RSS/网页/邮件等），需要手动筛选、去噪、提炼要点
- “我喜欢什么/不喜欢什么”难以规模化执行，导致收藏夹堆积
- 产出缺少结构化与可追溯：难以检索、复盘与迁移到行动（待办/决策）
- 代码类任务需要“可审阅、可回滚、可验证”的流水线，而不仅是一次性对话

本项目以 self-hosted 为前提，构建一个可编排、可扩展、可追溯的 AI 工作流平台（Workflow OS），将 LLM、检索、脚本执行与外部系统连接器组合成稳定的自动化流程。

RSS→偏好总结→Notion 入库将作为最小可用工作流模板，用于验证平台的触发、幂等、可观测、写回与配置能力，但不是平台的最终边界。

## 2. 目标与非目标

### 2.1 产品目标（MVP）
- 提供工作流编排与执行引擎（声明式定义、节点编排、重试/超时、并发控制）
- 提供触发器能力（Cron 定时、手动触发、HTTP API）
- 提供连接器能力（Notion 作为首个官方集成：写入 Database/页面 blocks）
- 提供偏好配置与结构化输出能力（Schema 校验、引用片段、可控输出）
- 提供运行记录可追溯（Run/Step/Artifact、耗时、错误、成本/用量）
- 提供最小可用示例工作流模板（RSS→总结→Notion）验证端到端闭环

### 2.2 非目标（MVP 不做）
- 多用户/多租户（MVP 按单用户闭环设计，但数据模型预留扩展）
- 完整插件市场/第三方节点生态
- 完整 RAG（向量库）与跨文档问答（可作为后续里程碑）
- 复杂的可视化编排器（MVP 可用 YAML/JSON 声明式工作流 + 简单 UI）

### 2.3 主要功能点分级
后续做需求减法

#### P0（平台核心，必须先做）
- 工作流定义与执行引擎（可靠性、重试/超时、并发控制、Run/Step/Artifact）
- 触发器（Cron + 手动 + API）
- 连接器框架（至少 Notion upsert）
- 配置与密钥管理（加密存储、最小权限）
- 可观测与可追溯（全链路运行记录、错误与用量）

#### P1（能力扩展，支撑“达到目标”）
- 信息清洗工作流模板（网页/文件/笔记 → 结构化产物 → 写回）
- 代码助手工作流模板（检索 → diff → 校验 → PR 交付）
- 事件触发（Webhook：GitHub 等）

#### P2（规模化与体验）
- RAG（全文索引/向量库）与跨文档问答/主题归纳
- 多模型路由、预算与配额
- 人工审核点（暂停/审批/继续）
- 插件化节点 SDK 与连接器生态

## 3. 用户画像与使用场景

### 3.1 用户画像
- 个人开发者/产品/研究者，愿意 self-host、关注隐私与可控性
- 需要“信息→结构化结论→可检索归档”的稳定流水线

### 3.2 核心场景：把 AI 变成可运行的工作流
- 信息清洗：文本/网页/邮件/会议纪要 → 去噪 → 结构化摘要/待办 → 写回 Notion/文件
- 代码助手：读代码 → 生成可审阅 diff → 运行检查/测试 → 产出 PR 描述与风险点
- 定时/事件驱动：Cron/Webhook/手动按钮触发同一条工作流，形成稳定的自动化能力

### 3.3 MVP 示例场景：RSS→总结→Notion（模板）
- 每天固定时间自动抓取新增 RSS 条目
- 按偏好生成结构化总结、评分与标签
- 结果写入 Notion Database，便于筛选检索
- UI 一键运行/重跑，查看执行链路与落库链接

## 4. 需求范围

### 4.1 平台能力（Platform Capabilities）

#### 4.1.1 工作流定义（Workflow Definition）
- 声明式定义工作流：YAML/JSON，包含 inputs、nodes、outputs 与运行策略
- 节点编排：串行/并行/分支/条件、失败策略、重试与超时
- 参数化：同一工作流可被不同触发器/不同参数复用
- 版本化：工作流定义可保存版本（用于重跑与审计）

#### 4.1.2 触发器（Triggers）
- 定时触发（Cron）：例如每天 09:00
- 手动触发：UI 按钮/HTTP API，支持传参
- 预留：Webhook 触发（GitHub/日历/邮箱等）

#### 4.1.3 执行引擎（Execution Engine）
- Run/Step 状态机：pending/running/succeeded/failed/canceled
- 可靠性：幂等、重试、退避、超时、并发限制
- 可恢复性（后续）：从某个 Step 继续跑、跳过已完成 Step

#### 4.1.4 LLM 与结构化产物（LLM & Artifacts）
- LLM Provider 抽象（OpenAI-compatible），支持云端与本地（如 Ollama）
- Schema-first 输出：所有关键节点输出需通过 Schema 校验
- 引用与可追溯：关键结论附引用片段（来自输入内容/检索内容）

#### 4.1.5 连接器（Connectors）
- Notion 连接器（MVP）：写入官方 Database/页面 blocks，支持 upsert 幂等
- 预留扩展：GitHub/Jira/飞书/Slack/Email/Webhook sink

#### 4.1.6 配置与偏好（Config & Preferences）
- 偏好配置（单用户）：主题偏好、排除规则、评分权重、输出风格
- 连接器配置：Notion token、database_id 等敏感信息加密存储

### 4.2 MVP 示例工作流模板：RSS→总结→Notion

#### 4.2.1 RSS 摄取（RSS Ingestion）
- RSS/Atom 解析
- 增量拉取与游标管理（last_seen）
- 幂等去重（基于规范化 URL 的 source_id）
- 原始内容存档（标题、链接、发布时间、摘要、内容片段、原始 XML/JSON 可选）
- 内容抓取增强（可选）：对条目链接做 HTML 抽取正文

#### 4.2.2 偏好驱动总结（Preference-driven Digest）
- 偏好配置可编辑并版本化（MVP 至少保存当前版本）
- 支持：主题偏好、排除规则、评分权重、输出风格

#### 4.2.3 AI 分析（LLM）
- 对每条内容输出结构化结果（JSON Schema）：
  - tldr（一句话）
  - key_points（3–7 条）
  - tags（多选）
  - relevance_score（0–100）
  - why_relevant（命中偏好原因 1–3 条）
  - action_items（可选）
  - quotes（引用片段列表，来自输入内容或正文抽取）
- 约束：
  - 输出必须通过 Schema 校验，失败自动重试或降级提示词
  - 引用优先：每条关键结论尽量附带引用片段，减少“无来源断言”

#### 4.2.4 Notion 写入（Publisher）
- 写入 Notion 官方 Database（需用户提供 Notion integration token 与目标 database_id）
- 字段映射（建议默认）：
  - Title：文章标题
  - URL：原文链接
  - Feed：来源名称
  - Published At：发布时间
  - Fetched At：抓取时间
  - Tags：AI 标签
  - Relevance：评分
  - Status：未读/已读/归档（默认未读）
  - Source ID：去重键（可隐藏）
- 页面正文 blocks（建议默认）：
  - TL;DR
  - Key Points
  - Why Relevant
  - Quotes（引用片段）
  - Action Items（可选）
- 幂等策略：
  - 若 Source ID 已存在：更新同一条 Notion 记录（而不是新建）
  - Notion 失败可重试，最终失败记录在 Run 中

### 4.3 运行记录与可观测性（Observability）
- Run 级别：
  - 触发来源（cron/manual/api）
  - 工作流版本（hash 或版本号）
  - 起止时间、状态、错误摘要
  - 处理数量（拉取条目数/新条目数/写入成功数/失败数）
- Step 级别：
  - 输入摘要、输出摘要、耗时
  - LLM token/费用（若可获取）
  - 错误堆栈与重试次数
- 支持从中间 Step 继续跑（后续里程碑）

### 4.4 后续工作流（达到目标的关键能力）

#### 4.4.1 信息清洗工作流（Ingestion/Cleaning）
- 输入：网页/文件/笔记/邮件/会议纪要
- 处理：正文抽取、去噪、分段、结构化抽取、引用片段
- 输出：Notion/文件/数据库；可生成待办与“待补充信息”清单

#### 4.4.2 代码助手工作流（Code Assistant）
- 定位：检索相关文件、符号与测试；构建最小上下文
- 变更：生成可审阅 diff（逐文件补丁），附风险点与回归点
- 验证：在受控环境运行 lint/typecheck/test（失败循环修复）
- 交付：生成 PR 描述（变更摘要、测试结果、风险）并写回 GitHub（后续连接器）

## 5. 关键流程（端到端）

### 5.1 平台通用运行流程（Run Lifecycle）
1) Trigger 创建 Run（写入 Postgres）并入队（Redis）
2) Worker 执行工作流节点（生成 Step 与 Artifact）
3) 连接器节点写回外部系统（Notion 等），并记录外部引用（page_id/url）
4) Run 结束（succeeded/failed），可查询全链路追溯数据

### 5.2 MVP 示例：RSS→总结→Notion
1) Scheduler 触发 workflow: `rss_digest_to_notion`
2) RSS 拉取与解析
3) 去重：以 source_id 判定新条目
4) AI 分析：生成结构化总结与评分标签
5) Notion Upsert：新建或更新记录与页面内容
6) 记录 Run/Step/Artifact，生成可检索的历史

### 5.3 手动运行（UI 按钮）
1) 用户选择 workflow 与参数（Feed、最近 N 条、强制重跑等）
2) 创建 Run 并入队
3) UI 展示进度（节点状态、成功/失败计数）
4) 完成后展示 Notion 链接列表与错误详情

## 6. 信息架构（Notion 与自托管存储的边界）

- Notion Database：作为“可检索与管理的书架目录”，存结构化产物与关键元信息
- 自托管存储：保存运行日志、原始响应、重试记录、（后续）全文索引与向量库
- MVP 目标：在不引入向量库的前提下，依靠 Notion 的筛选/搜索完成主要检索需求

## 7. 技术选型（面向 2026 的稳定/主流方案）

### 7.1 总体原则
- 自托管友好：单机可跑、Docker Compose 可部署
- 可扩展：工作流与连接器可插件化
- 强类型与可验证：Schema-first，降低幻觉与脏数据进入 Notion
- 可观测：Run/Step/Artifact 全链路记录

### 7.2 Monorepo 工具链
- 包管理：pnpm workspaces
- 构建编排：Turborepo
- 语言：TypeScript（全栈统一）
- 代码质量：ESLint + Prettier，类型检查 TypeScript project references
- 测试：Vitest（单元/集成），Playwright（E2E，后续）

### 7.2.2 TypeScript 类型组织（约定）
- 跨包共享类型统一收敛到 `packages/shared`
- 领域类型使用命名空间分组（例如 `SelfFlow.Runs.*`），避免散落在各个服务文件
- `apps/` 内仅保留“本地私有类型”，禁止复制粘贴跨域类型

### 7.2.1 Monorepo 目录规划（建议）
- apps/
  - console：Web 控制台（手动触发、配置、Run 追溯）
  - api：HTTP API（工作流管理、Run 管理、鉴权）
  - worker：执行器（队列消费、节点运行、连接器写回）
- packages/
  - workflow：工作流定义、DAG/编排、执行协议（types + validators）
  - connectors：连接器集合（notion 为首个）
  - llm：LLM provider 抽象与输出约束
  - shared：通用类型、工具、错误模型

### 7.3 服务端（API + Worker）
- 运行时：Node.js（建议采用当前最新 LTS）
- API 框架：Fastify（高性能、插件生态成熟）
- 校验与契约：Zod（请求/响应/工作流节点输入输出统一校验）
- 数据库：PostgreSQL（Run/Step/Artifact、Feed、Item、Notion 映射等）
- 队列与调度：
  - Redis + BullMQ（任务队列、重试、并发控制、repeatable jobs 支持 Cron）
  - Scheduler 作为独立 worker 或与 worker 合并（MVP 可合并，架构预留拆分）
- LLM 接入：
  - 统一 Provider 接口（OpenAI-compatible）
  - 支持本地模型（如 Ollama）与云端模型（按配置切换）

### 7.4 前端（Web 控制台）
- 框架：React（建议采用当前最新稳定版）
- 构建：Vite
- 数据请求：TanStack Query
- 组件与样式：推荐采用成熟方案（例如 Radix + Tailwind），以便快速交付与一致性

### 7.5 连接器（Notion）
- Notion 官方 API
- 认证方式：单用户 MVP 采用 integration token；后续可升级 OAuth

## 8. 架构设计

### 8.1 逻辑组件
- Web Console：手动触发、查看运行记录、管理偏好/连接器/工作流
- API Server：鉴权、配置管理、工作流与 Run 管理
- Scheduler：Cron 触发器（可与 worker 合并或独立部署）
- Worker：执行工作流节点（拉取、清洗、LLM、写回）
- Storage：Postgres（核心数据）、Redis（队列）
- （可选）Fetcher：HTML 抽取正文与清洗（可作为独立节点）

### 8.2 运行时数据流
- Trigger → 创建 Run（写入 Postgres）→ 入队（Redis）
- Worker 消费队列 → 执行 Step → 写回 Step 产物与状态
- Publisher 将产物写入 Notion，并记录 Notion page_id/url

### 8.3 工作流定义（声明式）
- 格式：YAML/JSON
- 结构：`triggers`、`inputs`、`nodes`、`outputs`
- 节点类型（MVP）：
  - trigger.cron
  - trigger.manual
  - rss.fetch
  - rss.parse
  - items.dedupe
  - llm.summarize
  - notion.upsert_page
  - run.report

## 9. 数据模型（MVP）

### 9.1 核心表（建议）
- workflow_definitions：工作流定义与版本
- runs：一次运行实例
- run_steps：每个节点执行记录
- artifacts：节点产物（JSON、文本、引用片段）
- preference_profiles：偏好配置（当前版本）
- connector_configs：连接器配置（加密存储）
- feeds：RSS 源配置（示例工作流用）
- feed_items：条目元信息与 source_id（示例工作流用）
- notion_mappings：source_id ↔ notion_page_id（示例工作流用）

## 10. API/交互（MVP）

- CRUD /api/workflows：管理工作流定义与版本
- POST /api/workflows/:id/runs：按工作流触发一次运行（params）
- GET /api/runs：运行列表
- GET /api/runs/:id：运行详情（steps、artifacts、notion links）
- PUT /api/preferences：更新偏好配置
- PUT /api/integrations/notion：设置 Notion token 与 database_id（加密存储）
- CRUD /api/feeds：管理 RSS 源（示例工作流用）

## 11. 安全与合规（单用户 MVP）

- 鉴权：单用户 API key 或本地账号密码（MVP 选择其一）
- 密钥管理：Notion token 加密存储；严禁写入日志与前端
- 最小权限：Notion 集成仅授权目标 database
- 审计：记录每次写入 Notion 的 page_id 与更新摘要

## 12. 里程碑与任务规划

### M0：项目骨架（1–2 天）
- Monorepo 初始化：pnpm workspaces + turbo pipeline
- 基础 CI 脚本：lint/typecheck/test
- 数据库与队列基础设施（Postgres/Redis）本地启动方案

验收：
- `pnpm lint`、`pnpm -r typecheck`、`pnpm test` 可运行

### M1：平台运行与可观测骨架（2–4 天）
- Run/Step/Artifact 数据模型与持久化
- Worker 队列执行与重试/超时
- 最小可用 API（创建 Run、查询 Run/Step）
- 基础可观测（耗时、错误、计数）

验收：
- 可创建 Run 并执行到完成，失败有重试与可追溯记录

### M2：工作流编排与触发器（3–6 天）
- 工作流声明格式与加载
- 节点编排（顺序/条件、并发限制）
- 触发器：Cron 与手动触发（同一工作流复用）
- 工作流版本化与重跑基础能力

验收：
- Cron 与手动触发均可执行同一工作流并留下完整链路

### M3：连接器与配置体系（3–6 天）
- 连接器配置加密存储（Notion token/database_id）
- Notion upsert（Database 属性 + 页面 blocks）
- 幂等策略与写回审计（page_id/url）

验收：
- 同一 source_id 重跑不会重复创建 Notion 页面，可追溯写入结果

### M4：LLM 结构化与偏好配置（3–6 天）
- LLM Provider 抽象与结构化输出（Schema 校验）
- 偏好配置存取与评分/标签策略
- 引用片段与“命中原因”输出

验收：
- 输出字段完整且稳定通过 Schema 校验，可按偏好配置调整产物

### M5：Web Console（3–7 天）
- 手动触发按钮与参数表单
- 运行列表/详情页（进度、错误、外部链接）
- 工作流/偏好/Notion 配置页面

验收：
- 用户可在 UI 中一键运行并查看全链路执行记录与 Notion 结果

### M6：MVP 示例工作流模板（RSS→总结→Notion）（3–7 天）
- RSS 摄取与解析
- source_id 去重与增量游标
- 端到端工作流模板上线与参数化（最近 N 条、指定 Feed）
- 与 Notion upsert 结合形成闭环

验收：
- 每天定时跑 + 手动重跑均可稳定落到 Notion 且不重复创建

### M7（后续）：达到平台目标的关键增强（可做减法的候选）
- 信息清洗模板（网页/文件/笔记）与更强正文抽取
- 代码助手模板（diff 生成、测试执行、PR 产出）与 GitHub 连接器
- RAG（全文索引/向量库）与跨文档问答/主题归纳
- 多模型路由与预算控制
- 人工审核点与审批继续执行
- 插件化节点 SDK 与更多连接器（Jira/飞书/Slack/Email）

## 13. 验收标准（MVP 汇总）
- 支持定义并运行至少 1 条端到端工作流模板（示例：RSS→总结→Notion）
- 支持 Cron 与手动触发两种方式创建 Run 并执行
- 支持 Notion 连接器写回（Database 属性 + 页面 blocks），且具备幂等 upsert
- 支持偏好配置驱动的结构化产物输出（Schema 校验 + 引用片段）
- 支持运行记录可追溯（Run/Step/Artifact、耗时、错误原因、成本/用量）
