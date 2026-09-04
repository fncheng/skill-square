---
type: feature
feature: access-control
status: active
created: 2026-08-27
updated: 2026-08-27
related: []
---

# 访问控制

## 功能概览

访问控制提供固定单管理员登录、浏览器 Cookie 会话恢复和访客只读访问模式。

## 当前行为

- 唯一管理员用户名固定为 `admin`，密码哈希和 JWT secret 由运行环境提供，不建立用户表或 Session 表。
- 登录成功后后端签发 `HttpOnly`、`SameSite=Strict` Cookie，前端通过 session 接口恢复管理员、访客或加载中的认证状态。
- `GET`、`HEAD` 和 `OPTIONS` 默认公开；业务 `POST`、`PUT`、`PATCH` 和 `DELETE` 默认由全局 Guard 要求管理员会话。
- 前端使用 `RequireAdmin` 保护新建、编辑、分类管理和标签管理路由，详情页的写操作也只对管理员显示。
- 模型回答是例外的私有读取资源：其全部前端路由、菜单、列表、详情、导出与批注查询均要求管理员会话。
- 登录接口启用频率限制。

## 约束与限制

- 前端不得读取或自行持久化 Cookie 中的 JWT。
- 本地 HTTP 需要配置 `AUTH_COOKIE_SECURE=false`，生产 HTTPS 必须配置 `AUTH_COOKIE_SECURE=true`。
- 前端路由保护只负责用户体验，后端全局 Guard 是业务写权限边界。

## 关联文档

- [管理员认证 API](../../api/auth.md)
- [API 认证与权限总览](../../api/README.md#认证与权限)
- [架构设计](../../architecture.md)
- [Docker GHCR 在线部署指南](../../docker-ghcr-deployment.md)
- [Docker 镜像离线部署指南](../../docker-image-deployment.md)

## 代码位置

- `apps/web/src/components/auth/AuthBootstrap.tsx`
- `apps/web/src/components/auth/RequireAdmin.tsx`
- `apps/web/src/stores/auth.ts`
- `apps/api/src/auth`
- `apps/api/src/app.module.ts`
