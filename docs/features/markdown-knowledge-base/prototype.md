---
type: prototype
feature: markdown-knowledge-base
status: active
created: 2026-08-27
updated: 2026-08-27
related: []
---

# Markdown 批注原型

## 原型文件

- [Markdown 单人批注交互原型](../../../prototype/markdown-annotation.html)

## 已体现的关键交互

1. 选择正文后创建批注，并在正文标记、定位按钮和批注列表之间联动。
2. 查看、编辑、删除和展开批注，同时展示关联原文。
3. 切换正常、空数据、加载中和加载失败等界面状态。

## 实现边界

- 原型用于说明交互方向，当前行为以 React 页面、NestJS API 和 Prisma Schema 为准。
- 正文与批注分别保存，真实实现还需处理正文更新后的锚点匹配与重新关联。
