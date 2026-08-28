---
type: feature
feature: ui-prototype-library
status: active
created: 2026-08-27
updated: 2026-08-27
related: []
---

# UI 原型库

## 功能概览

UI 原型库用于保存、筛选、编辑和预览单文件 HTML 原型。

## 当前行为

- 列表支持按标题、摘要、分类和标签筛选 UI 原型。
- 管理员可以创建、编辑和删除原型，HTML 内容与元信息保存在 PostgreSQL。
- 详情页支持桌面、平板和手机三种预览尺寸，也可以在独立窗口中打开。
- 预览使用不包含 `allow-same-origin` 的 `iframe sandbox` 隔离；禁止外部资源时会额外注入 CSP。
- 访客可以浏览和预览，写操作需要管理员会话。

## 约束与限制

- 原型必须是单文件 HTML，后端会校验源码大小。
- `allowExternal=true` 只允许加载外部资源，不解除 iframe 对主应用 DOM 和同源存储的隔离。
- 原型运行结果不代表生产页面实现或业务验收已经完成。

## 关联文档

- [UI 原型 API](../../api/ui-prototypes.md)
- [数据结构](../../api/schemas.md)
- [UI 原型库交互原型](./prototype.md)
- [架构设计](../../architecture.md)

## 代码位置

- `apps/web/src/views/UiPrototypeList.tsx`
- `apps/web/src/views/UiPrototypeDetail.tsx`
- `apps/web/src/views/UiPrototypeEditor.tsx`
- `apps/web/src/components/ui-prototype`
- `apps/api/src/ui-prototypes`
- `apps/api/prisma/schema.prisma`
