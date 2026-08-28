---
type: feature
feature: content-discovery
status: active
created: 2026-08-27
updated: 2026-08-27
related: []
---

# 内容发现

## 功能概览

内容发现通过全局搜索和标签词云帮助用户跨资源定位内容。

## 当前行为

- 顶部全局搜索统一返回 Prompt、解决方案、学习笔记和 UI 原型结果，并跳转到对应详情页。
- 标签词云聚合解决方案与学习笔记的字符串标签，按忽略大小写的名称统计，同时保留原始名称展示。
- 标签词云支持按全部、解决方案或学习笔记范围筛选，并按名称搜索标签。
- 点击标签进入分页内容列表，可继续按资源类型和关键词筛选。
- 搜索和标签浏览均为读取能力，访客可以使用。

## 约束与限制

- 标签词云不聚合 Prompt 标签或 UI 原型标签。
- 标签内容列表只返回解决方案与学习笔记，并按最近更新时间排列。
- 前端标签搜索只过滤已经从后端取得的词云数据；标签内容分页与关键词筛选由后端处理。

## 关联文档

- [全局搜索 API](../../api/search.md)
- [内容标签词云 API](../../api/content-tags.md)
- [标签词云与内容列表原型](./prototype.md)
- [架构设计](../../architecture.md)

## 代码位置

- `apps/web/src/components/layout/GlobalSearch.tsx`
- `apps/web/src/views/TagCloud.tsx`
- `apps/web/src/views/TagArticleList.tsx`
- `apps/api/src/search`
- `apps/api/src/content-tags`
