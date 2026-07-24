# Prompt Skill Manager

Prompt Skill Manager 是一个用于管理 AI Prompt、Agent Workflow、Skill、Cursor Rule 与 Codex Prompt 的 MVP 平台。

## 技术栈

- 前端：React 18、TypeScript、Vite、React Router、Zustand、Tailwind CSS、Monaco Editor
- 后端：NestJS、TypeScript、Prisma、Swagger
- 数据库：PostgreSQL
- 部署：Docker Compose

## 目录结构

```text
.
├── apps
│   ├── api          # NestJS + Prisma 后端
│   └── web          # React 18 + Vite 前端
├── docs
│   └── architecture.md
├── prototype        # 原型图与原型 HTML
├── docker-compose.yml
├── package.json
└── pnpm-workspace.yaml
```

## Docker Compose 启动

```bash
cp .env.example .env
docker compose up -d --build
```

服务启动后：

- 前端：http://localhost:5173
- 后端 API：http://localhost:3000/api
- Swagger：http://localhost:3000/api/docs
- PostgreSQL：localhost:5432

API 容器启动时会执行 Prisma 迁移和初始化种子数据。

首次启动前必须在 `.env` 中配置 `ADMIN_PASSWORD_HASH` 和 `AUTH_JWT_SECRET`。本地 HTTP 使用 `AUTH_COOKIE_SECURE=false`；生产 HTTPS 必须使用 `AUTH_COOKIE_SECURE=true`。

## 部署文档

- [Docker GHCR 在线部署指南](docs/docker-ghcr-deployment.md)
- [Docker 镜像离线部署指南](docs/docker-image-deployment.md)

## 本地开发

```bash
pnpm install
cp .env.example apps/api/.env
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev:api
pnpm dev:web
```

本地开发时，前端默认访问 `VITE_API_BASE_URL=http://localhost:3000/api`。

## 核心功能

- Prompt 创建、编辑、删除、详情查看与复制
- 分类 CRUD
- 标签 CRUD
- 名称、内容、标签搜索
- 分类、标签、收藏筛选
- 收藏与取消收藏
- Prompt 版本历史与回滚
- 单管理员登录与访客只读访问

## API 文档

后端启动后访问 `http://localhost:3000/api/docs` 查看 Swagger 文档。
