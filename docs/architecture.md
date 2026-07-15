# Prompt Skill Manager 架构设计

## 目标

Prompt Skill Manager 用于管理 AI Prompt、Agent Workflow、Skill、Cursor Rule 与 Codex Prompt。MVP 覆盖 Prompt CRUD、分类、标签、搜索、收藏、版本历史与回滚。

## 总体架构

- 根目录采用 monorepo，统一维护前端、后端、数据库迁移、Docker Compose 与项目文档。
- `apps/web` 是 React18 单页应用（Vite + React Router + Zustand），负责列表、编辑、详情、分类管理、标签管理和 Monaco Editor 内容编辑。
- `apps/api` 是 NestJS RESTful API，负责 DTO 校验、业务规则、Swagger 文档、Prisma 数据访问与版本快照。
- PostgreSQL 保存结构化数据，Prisma Schema 和迁移 SQL 作为唯一数据库结构来源。
- Docker Compose 编排 `web`、`api`、`db` 三个服务，前端容器通过 Nginx 将 `/api` 反向代理到后端。

## 分层设计

### 前端

- `App.tsx`：基于 `react-router-dom` 的页面路由，包括 Prompt 列表、编辑、详情、分类管理、标签管理、解决方案。
- `stores`：Zustand 管理 Prompt 查询条件、分页数据、分类与标签缓存，以及全局 Toast、Confirm 状态。
- `hooks`：`useToast`、`useConfirm`、`useMarkdown` 等业务 Hooks。
- `api`：Axios 封装 RESTful API。
- `views`：页面级组件（`.tsx`），承载业务交互。
- `components`：布局组件、shadcn/ui 风格基础组件、Monaco Editor，以及 Markdown 渲染与批注组件。
- `types`：前端 DTO 类型，与后端响应字段保持一致。

### 后端

- `main.ts`：启用全局 API 前缀、Swagger、CORS、ValidationPipe 与 Prisma 异常过滤器。
- `prisma`：Prisma Client 生命周期服务。
- `prompts`：Prompt CRUD、搜索、收藏、版本历史、回滚。
- `categories`：分类 CRUD。
- `tags`：标签 CRUD。
- `annotations`：学习笔记与解决方案的单人 Markdown 批注 CRUD、资源校验和文本锚点持久化。
- `dto`：所有接口的入参和 Swagger 响应 DTO。

## 数据一致性

- Prompt 与 Tag 使用显式中间表 `PromptTag`，支持后续扩展排序、审计字段或标签来源。
- Prompt 创建时生成初始版本快照。
- Prompt 编辑时保存编辑后的新版本快照。
- Prompt 回滚时先恢复目标版本，再生成一个新的版本快照，确保历史链路不断裂。
- 分类删除后 Prompt 的 `categoryId` 置空；标签删除后关联关系级联删除；Prompt 删除后版本与标签关联级联删除。
- 批注通过 `noteId` 或 `solutionId` 外键关联文档；删除学习笔记或解决方案时批注级联删除。
- 批注和 Markdown 正文分别保存。前端使用文本位置与原文引用双锚点定位，无法唯一定位时保留批注并进入重新关联状态。

## API 边界

- 前端只调用 `/api` 下的 RESTful 接口，不直接依赖 Prisma 字段结构。
- 后端统一返回扁平化后的 Prompt 响应，`tags` 字段直接返回 Tag 数组，避免暴露中间表结构。
- Swagger 地址为 `/api/docs`。

## MVP API

- `GET /api/prompts`
- `GET /api/prompts/:id`
- `POST /api/prompts`
- `PUT /api/prompts/:id`
- `DELETE /api/prompts/:id`
- `POST /api/prompts/:id/favorite`
- `DELETE /api/prompts/:id/favorite`
- `PUT /api/prompts/:id/favorite`
- `GET /api/prompts/:id/versions`
- `POST /api/prompts/:id/rollback/:versionId`
- `GET /api/categories`
- `GET /api/categories/:id`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET /api/tags`
- `GET /api/tags/:id`
- `POST /api/tags`
- `PUT /api/tags/:id`
- `DELETE /api/tags/:id`
- `GET /api/annotations`
- `POST /api/annotations`
- `PUT /api/annotations/:id`
- `DELETE /api/annotations/:id`

## Prisma Schema 摘要

- `Prompt`：Prompt 主体内容、所属分类、收藏状态、创建时间与更新时间。
- `Category`：分类信息。
- `Tag`：标签信息。
- `PromptTag`：Prompt 与 Tag 的多对多关系。
- `PromptVersion`：Prompt 历史快照，保存名称、描述、内容、分类与标签快照。
- `Annotation`：笔记或解决方案的 Markdown 补充内容，以及渲染文本位置和原文上下文锚点。
