# Prompt Skill Manager Agent Rules

本文件是当前项目的新会话默认规则入口。AI Agent 在本仓库内回答问题、修改代码或提供方案时，必须优先遵守本文规则，并结合真实代码现状执行。

## 项目概览

- 项目名称：Prompt Skill Manager。
- 项目目标：管理 AI Prompt、Agent Workflow、Skill、Cursor Rule 与 Codex Prompt。
- 仓库结构：monorepo。
- 前端目录：`apps/web`。
- 后端目录：`apps/api`。
- 文档目录：`docs`。
- 原型目录：`prototype`。

## 技术栈

### 前端

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Monaco Editor
- shadcn-vue 风格本地组件
- Tailwind CSS
- lucide-vue-next

前端不再使用 Element Plus。新增或修改 UI 时，不要引入 `element-plus` 或 `@element-plus/icons-vue`。

### 后端

- NestJS
- TypeScript
- Prisma
- Swagger

### 数据库与部署

- PostgreSQL
- Prisma Migrate
- Docker Compose

## 目录约束

- 前端页面放在 `apps/web/src/views`。
- 前端通用布局组件放在 `apps/web/src/components/layout`。
- shadcn-vue 风格基础 UI 组件放在 `apps/web/src/components/ui`。
- 前端 API 封装放在 `apps/web/src/api`。
- 前端类型定义放在 `apps/web/src/types`。
- Pinia Store 放在 `apps/web/src/stores`。
- 后端模块按业务资源放在 `apps/api/src` 下，例如 `prompts`、`categories`、`tags`。
- Prisma Schema、迁移和种子数据放在 `apps/api/prisma`。
- API 文档放在 `docs/api`。
- 架构说明放在 `docs/architecture.md`。

## 前端实现规则

- UI 统一使用 Tailwind CSS 与 `apps/web/src/components/ui` 下的本地组件。
- 图标统一使用 `lucide-vue-next`。
- 样式优先使用 Tailwind class；跨页面复用或复杂布局样式写入 `apps/web/src/assets/main.css`。
- 不要重新引入 Element Plus。
- 不要引入新的 UI 框架，除非用户明确要求。
- 保持后台工具型产品的界面风格：克制、清晰、易扫描、操作路径短。
- Prompt 内容编辑继续使用 Monaco Editor，不要替换为普通 textarea。
- Toast 使用 `apps/web/src/composables/use-toast.ts` 与 `Toaster.vue`。
- 确认弹窗使用 `apps/web/src/composables/use-confirm.ts` 与 `ConfirmDialog.vue`。

## 后端实现规则

- 所有接口入参必须有 DTO。
- Controller 只处理 HTTP 层，业务逻辑放在 Service。
- Prisma 访问统一通过 `PrismaService`。
- 新增 API 时同步补充 Swagger 装饰器。
- Prompt 更新和回滚相关逻辑必须保持版本快照一致性。
- 删除 Prompt 时允许级联删除标签关联和版本历史。

## 数据库规则

- 修改数据库结构时必须更新 `apps/api/prisma/schema.prisma`。
- 结构变更必须通过 Prisma Migrate 生成或维护迁移文件。
- 初始化演示数据维护在 `apps/api/prisma/seed.ts`。
- 不要把真实密钥、Token、Cookie 或个人隐私写入种子数据。

## 文档维护规则

- API 变更后同步更新 `docs/api` 下的接口文档。
- 架构、模块边界或技术选型变化后同步更新 `docs/architecture.md`。
- 如果出现长期有效的历史决策、废弃方案或踩坑记录，写入 `docs/decisions.md`；如果该决策会影响每次任务，再在本文件保留摘要。
- 不记录一次性调试过程和未确认猜测。

## 命令执行规则

- 不要主动执行构建或编译命令，例如 `pnpm build`、`npm run build`、`nest build`。
- 如确需执行构建或编译命令，必须先取得用户同意。
- 可以执行非构建类检查、搜索、文件读取和依赖安装命令。
- 启动开发服务器前，若需要监听端口且环境要求提权，必须按权限流程请求用户允许。

## 本地开发提示

- 前端开发命令：`pnpm dev:web`。
- 后端开发命令：`pnpm dev:api`。
- Prisma 生成命令：`pnpm prisma:generate`。
- Prisma 迁移命令：`pnpm prisma:migrate`。
- Prisma 种子命令：`pnpm prisma:seed`。
- WSL 内本地开发时，`localhost` 指向 WSL 环境自身；如果使用本机 PostgreSQL，需确保 WSL 内的 PostgreSQL 服务正在运行。

## 验证要求

- 修改前端 UI 后，优先检查是否仍有 `element-plus`、`@element-plus/icons-vue`、`<el-` 等遗留引用。
- 不要执行 `pnpm dev:web` 作为前端验证命令；前端开发服务器由用户自行启动。
- 修改 API 后，检查 Controller、DTO、Service、Prisma Schema 和 `docs/api` 是否同步。
- 修改数据库后，检查 Prisma Schema、迁移文件和种子数据是否一致。
- 如果未能运行验证，需要在最终答复中说明原因。
