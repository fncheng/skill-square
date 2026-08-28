---
type: feature
feature: prompt-library
status: active
created: 2026-08-27
updated: 2026-08-27
related: []
---

# Prompt 资源库

## 功能概览

Prompt 资源库负责 Prompt 的创建、浏览、编辑、删除、复制、分类、标签、收藏和版本历史管理，内容编辑器使用 Monaco Editor。

## 当前行为

- 列表支持名称、内容、分类、标签和收藏状态筛选，详情页提供内容查看与复制入口。
- Prompt 可以关联一个可选分类和多个标签；分类删除后关联字段置空，标签删除后关联关系级联删除。
- 创建、更新和回滚均生成版本快照；回滚会恢复目标版本后再追加新快照，保留连续历史。
- 访客可以读取列表、详情和版本历史，创建、更新、删除、收藏与回滚操作需要管理员会话。

## 约束与限制

- Prompt 正文编辑继续使用 Monaco Editor。
- Prompt 删除时，其标签关联和版本历史一并级联删除。
- 前端通过 `/api` RESTful 接口访问业务数据，不直接依赖 Prisma 表结构。

## 关联文档

- [Prompt API](../../api/prompts.md)
- [分类 API](../../api/categories.md)
- [标签 API](../../api/tags.md)
- [数据结构](../../api/schemas.md)
- [架构设计](../../architecture.md)
- [早期界面原型](../../../prototype/preview.html)

## 代码位置

- `apps/web/src/views/PromptList.tsx`
- `apps/web/src/views/PromptDetail.tsx`
- `apps/web/src/views/PromptEditor.tsx`
- `apps/web/src/components/prompt/PromptMonacoEditor.tsx`
- `apps/api/src/prompts`
- `apps/api/src/categories`
- `apps/api/src/tags`
- `apps/api/prisma/schema.prisma`
