---
type: feature
feature: markdown-knowledge-base
status: active
created: 2026-08-27
updated: 2026-08-27
related: []
---

# Markdown 知识库

## 功能概览

Markdown 知识库统一承载解决方案和学习笔记，支持列表、详情、编辑、删除、文件导入导出、Markdown 渲染和单人批注。

## 当前行为

- 解决方案和学习笔记分别提供列表、详情、创建、更新、删除、导入与导出接口。
- 两类内容均保存标题、摘要、Markdown 正文、分类和字符串标签；新建、更新或导入时至少保留一个标签。
- 用户可以选择渲染后的正文并创建 Markdown 批注；批注使用文本偏移与原文上下文双锚点定位。
- 删除学习笔记或解决方案时，其关联批注级联删除；正文变化导致锚点无法唯一匹配时，前端保留批注并允许重新关联。
- 访客可以读取和导出内容、查询批注；内容与批注写操作需要管理员会话。

## 约束与限制

- 批注只能关联一个学习笔记或一个解决方案。
- Markdown 正文与批注分别持久化，批注不是对原文的直接修改。
- 文件导入导出遵循项目定义的 `ContentTransferFile` 数据契约。

## 关联文档

- [解决方案 API](../../api/solutions.md)
- [学习笔记 API](../../api/notes.md)
- [Markdown 批注 API](../../api/annotations.md)
- [数据结构](../../api/schemas.md)
- [架构设计](../../architecture.md)
- [批注交互原型](./prototype.md)

## 代码位置

- `apps/web/src/views/SolutionList.tsx`
- `apps/web/src/views/NoteList.tsx`
- `apps/web/src/components/markdown`
- `apps/web/src/hooks/use-content-transfer.ts`
- `apps/api/src/solutions`
- `apps/api/src/notes`
- `apps/api/src/annotations`
- `apps/api/prisma/schema.prisma`
