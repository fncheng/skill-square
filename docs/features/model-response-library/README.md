---
type: feature
feature: model-response-library
status: active
created: 2026-09-03
updated: 2026-09-03
related:
  - ../markdown-knowledge-base/README.md
  - ../access-control/README.md
---

# 模型回答库

模型回答库仅向已登录管理员开放，用于收录可复用的 AI 回答。每条内容保存 Markdown 正文、分类、至少一个标签，以及可选的来源产品、模型名称和原始 Prompt。

## 当前行为

- 列表支持关键词搜索、分类 chips、回答卡片、批注数量、导入、编辑和删除；不提供模型筛选。
- 详情支持 Markdown 渲染、目录、批注、复制 Markdown、导出、编辑和删除；紧凑操作条仅保留批注与编辑。
- 导入导出复用版本化 `ContentTransferFile`，并随内容迁移原始 Prompt、溯源字段和 Markdown 批注。
- 数据保存在独立 `ModelResponse` 资源中，批注通过 `AnnotationResourceType.MODEL_RESPONSE` 和外键关联，删除回答时由数据库级联删除批注。

## 权限边界

- 前端列表、详情和创建/编辑路由均由 `RequireAdmin` 保护，侧边栏菜单仅管理员渲染。
- `/api/model-responses` 的所有方法（包括 `GET`、`HEAD` 和导出）通过全访问管理员 Guard 校验会话。
- 全局搜索只会向管理员会话加入模型回答结果；访客不会取得标题。
- `GET /api/annotations?resourceType=MODEL_RESPONSE` 需要管理员会话。
- 内容标签词云和标签内容发现有意不纳入模型回答，因此访客无法经该公开能力发现私有数据。

## 代码位置

- `apps/web/src/views/ModelResponseList.tsx`
- `apps/web/src/views/ModelResponseDetail.tsx`
- `apps/web/src/views/ModelResponseEditor.tsx`
- `apps/api/src/model-responses`
- `apps/api/src/annotations`
