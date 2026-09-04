# Prompt Skill Manager 架构设计

## 目标

Prompt Skill Manager 用于管理 AI Prompt、Agent Workflow、Skill、Cursor Rule、Codex Prompt、学习文档与 UI 原型。MVP 覆盖 Prompt CRUD、分类、标签、搜索、收藏、版本历史、Markdown 文档、批注与单文件 HTML 原型预览。

## 总体架构

- 根目录采用 monorepo，统一维护前端、后端、数据库迁移、Docker Compose 与项目文档。
- `apps/web` 是 React18 单页应用（Vite + React Router + Zustand），负责列表、编辑、详情、分类管理、标签管理和 Monaco Editor 内容编辑。
- `apps/api` 是 NestJS RESTful API，负责单管理员认证、访客只读授权、DTO 校验、业务规则、Swagger 文档、Prisma 数据访问与版本快照。
- PostgreSQL 保存结构化数据，Prisma Schema 和迁移 SQL 作为唯一数据库结构来源。
- Docker Compose 编排 `web`、`api`、`db` 三个服务，前端容器通过 Nginx 将 `/api` 反向代理到后端。

## 分层设计

### 前端

- `App.tsx`：基于 `react-router-dom` 的页面路由，包括 Prompt、解决方案、学习笔记、模型回答、内容标签词云、UI 原型、分类与标签管理。
- `stores`：Zustand 管理管理员/访客会话、Prompt 查询条件、分页数据、分类与标签缓存，以及全局 Toast、Confirm 状态。
- `hooks`：`useToast`、`useConfirm`、`useMarkdown` 等业务 Hooks。
- `api`：Axios 封装 RESTful API。
- `views`：页面级组件（`.tsx`），承载业务交互，包括 UI 原型列表、HTML 编辑与多尺寸沙箱预览。
- `components`：布局组件、shadcn/ui 风格基础组件、Monaco Editor，以及 Markdown 渲染与批注组件。
- `types`：前端 DTO 类型，与后端响应字段保持一致。

### 后端

- `main.ts`：启用全局 API 前缀、Swagger、CORS、ValidationPipe 与 Prisma 异常过滤器。
- `auth`：校验固定管理员凭据、签发 JWT Cookie、查询/退出会话，并通过全局 Guard 保护全部非安全业务请求。
- `prisma`：Prisma Client 生命周期服务。
- `prompts`：Prompt CRUD、搜索、收藏、版本历史、回滚。
- `categories`：分类 CRUD。
- `tags`：标签 CRUD。
- `content-tags`：聚合解决方案与学习笔记的字符串标签，并提供轻量词云统计与标签内容分页查询。
- `annotations`：学习笔记、解决方案与模型回答的单人 Markdown 批注 CRUD、资源校验和文本锚点持久化。
- `model-responses`：仅管理员可见的模型回答 CRUD、溯源字段、导入导出和批注关联；全部读取由专用管理员 Guard 保护。
- `ui-prototypes`：单文件 HTML 原型 CRUD、筛选和源码大小校验。
- `dto`：所有接口的入参和 Swagger 响应 DTO。

## 数据一致性

- Prompt 与 Tag 使用显式中间表 `PromptTag`，支持后续扩展排序、审计字段或标签来源。
- Prompt 创建时生成初始版本快照。
- Prompt 编辑时保存编辑后的新版本快照。
- Prompt 回滚时先恢复目标版本，再生成一个新的版本快照，确保历史链路不断裂。
- 分类删除后 Prompt 的 `categoryId` 置空；标签删除后关联关系级联删除；Prompt 删除后版本与标签关联级联删除。
- 批注通过 `noteId` 或 `solutionId` 外键关联文档；删除学习笔记或解决方案时批注级联删除。
- 批注和 Markdown 正文分别保存。前端使用文本位置与原文引用双锚点定位，无法唯一定位时保留批注并进入重新关联状态。
- 新建、更新或导入学习笔记与解决方案时至少保留一个标签；词云聚合时忽略标签名称大小写，但保留原始名称展示。
- UI 原型 HTML 与元信息存入 PostgreSQL。预览通过不包含 `allow-same-origin` 的 `iframe sandbox` 隔离；关闭外部资源时额外注入 CSP，阻止所有远程请求。

## API 边界

- 前端只调用 `/api` 下的 RESTful 接口，不直接依赖 Prisma 字段结构。
- 后端统一返回扁平化后的 Prompt 响应，`tags` 字段直接返回 Tag 数组，避免暴露中间表结构。
- 访客可以调用公开资源的 `GET`、`HEAD`、`OPTIONS`；业务写操作默认要求有效 Admin Cookie。模型回答以及 `MODEL_RESPONSE` 批注查询是私有读取资源，全部请求要求管理员 Cookie，并且不纳入公开标签发现。
- 管理员会话保存在 `HttpOnly`、`SameSite=Strict` Cookie 中，前端仅通过 session 接口恢复三态认证状态。
- 唯一管理员用户名固定为 `admin`，密码哈希和 JWT secret 来自运行环境，不建立用户或 Session 数据表。
- Swagger 地址为 `/api/docs`。

## MVP API

- `POST /api/auth/login`
- `GET /api/auth/session`
- `POST /api/auth/logout`

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
- `GET /api/content-tags`
- `GET /api/content-tags/items`
- `GET /api/annotations`
- `POST /api/annotations`
- `PUT /api/annotations/:id`
- `DELETE /api/annotations/:id`
- `GET /api/model-responses`
- `GET /api/model-responses/:id`
- `GET /api/model-responses/:id/export`
- `POST /api/model-responses/import`
- `POST /api/model-responses`
- `PUT /api/model-responses/:id`
- `DELETE /api/model-responses/:id`
- `GET /api/ui-prototypes`
- `GET /api/ui-prototypes/:id`
- `POST /api/ui-prototypes`
- `PUT /api/ui-prototypes/:id`
- `DELETE /api/ui-prototypes/:id`

## Prisma Schema 摘要

- `Prompt`：Prompt 主体内容、所属分类、收藏状态、创建时间与更新时间。
- `Category`：分类信息。
- `Tag`：标签信息。
- `PromptTag`：Prompt 与 Tag 的多对多关系。
- `PromptVersion`：Prompt 历史快照，保存名称、描述、内容、分类与标签快照。
- `Annotation`：笔记或解决方案的 Markdown 补充内容，以及渲染文本位置和原文上下文锚点。
- `UiPrototype`：UI 原型名称、描述、单文件 HTML、分类、标签和外部资源策略。
- `ModelResponse`：私有模型回答、Markdown 正文、分类、标签、来源产品、模型名称和原始 Prompt。
