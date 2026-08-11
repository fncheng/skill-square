# 内容标签词云接口

内容标签接口聚合解决方案与学习笔记的字符串标签，为标签词云和标签内容行列表提供轻量数据，不返回 Markdown 正文。

标签名称聚合和筛选忽略大小写；同一篇内容中的同名标签只计数一次。

## GET /api/content-tags

获取标签词云统计，默认按内容数量倒序、标签名称升序返回。

### 响应

```json
{
  "items": [
    {
      "name": "React",
      "total": 10,
      "solutionCount": 6,
      "noteCount": 4
    }
  ],
  "totalTags": 24,
  "taggedSolutionCount": 18,
  "taggedNoteCount": 12
}
```

响应结构见 [ContentTagCloudResponse](./schemas.md#contenttagcloudresponse)。

## GET /api/content-tags/items

分页获取指定标签下的解决方案与学习笔记，仅返回行列表所需字段，按更新时间倒序排列。

### Query 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `tag` | `string` | 是 | - | 标签名称，长度 `1-80`，精确匹配并忽略大小写 |
| `resourceType` | `ALL \| SOLUTION \| NOTE` | 否 | `ALL` | 内容类型 |
| `search` | `string` | 否 | - | 在标题、摘要、分类和标签中搜索，最大长度 `120` |
| `page` | `number` | 否 | `1` | 页码，从 `1` 开始 |
| `pageSize` | `number` | 否 | `10` | 每页数量，最大值为 `100` |

### 示例请求

```http
GET /api/content-tags/items?tag=React&resourceType=ALL&page=1&pageSize=12
```

### 响应

```json
{
  "items": [
    {
      "id": "8f2a9c44-1d6e-4b0a-9b2f-5c0c1a2b3d4e",
      "title": "React 长列表渲染性能优化方案",
      "summary": "通过虚拟列表与稳定引用降低重渲染成本。",
      "category": "前端性能",
      "tags": ["React", "TypeScript", "性能优化"],
      "resourceType": "SOLUTION",
      "createdAt": "2026-08-01T08:00:00.000Z",
      "updatedAt": "2026-08-06T08:00:00.000Z"
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 12
}
```

响应结构见 [ContentTagItemsResponse](./schemas.md#contenttagitemsresponse)。
