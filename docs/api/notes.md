# 学习笔记接口

学习笔记用于沉淀日常学习的知识点总结，正文以 Markdown 文档形式存储，供随时查阅、编辑和删除。

## GET /api/notes

获取学习笔记列表，按更新时间倒序返回。支持按关键词和分类筛选。

### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `search` | `string` | 否 | 标题、摘要或正文搜索关键词，最大长度 `120` |
| `category` | `string` | 否 | 按分类精确筛选，最大长度 `80` |

### 示例请求

```http
GET /api/notes?search=find&category=Linux
```

### 响应

```json
[
  {
    "id": "8f2a9c44-1d6e-4b0a-9b2f-5c0c1a2b3d4e",
    "title": "Linux 文件查找命令 find 常用用法",
    "summary": "整理 find 按名称、类型、时间、大小查找文件的常用组合，便于日常查阅。",
    "content": "## 按名称查找\n\n...",
    "category": "Linux",
    "tags": ["Linux", "Shell", "find"],
    "createdAt": "2026-07-11T08:00:00.000Z",
    "updatedAt": "2026-07-11T08:00:00.000Z"
  }
]
```

## GET /api/notes/:id

获取学习笔记详情。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 学习笔记 UUID |

### 响应

返回 `Note` 对象。结构见 [Note](./schemas.md#note)。

## GET /api/notes/:id/export

导出单篇学习笔记的迁移数据。响应包含标题、摘要、Markdown 正文、分类、标签、原始时间和全部批注，不包含源环境 UUID。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 学习笔记 UUID |

### 响应

返回 `ContentTransferFile` 对象，`resourceType` 固定为 `NOTE`。结构见 [ContentTransferFile](./schemas.md#contenttransferfile)。

## POST /api/notes

创建学习笔记。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | 是 | 标题，长度 `1-200` |
| `summary` | `string` | 否 | 列表摘要，最大长度 `500` |
| `content` | `string` | 是 | Markdown 正文，长度 `>=1` |
| `category` | `string` | 否 | 分类，最大长度 `80` |
| `tags` | `string[]` | 是 | 标签数组，至少 `1` 个、最多 `20` 个，单个最大长度 `80`，自动去重 |

### 示例请求

```http
POST /api/notes
Content-Type: application/json
```

```json
{
  "title": "Git 撤销与回退速查",
  "summary": "汇总工作区、暂存区、提交三种状态下的撤销命令。",
  "content": "## 撤销工作区改动\n\n`git restore <file>` ……",
  "category": "Git",
  "tags": ["Git", "版本控制"]
}
```

### 响应

状态码：`201 Created`

返回创建后的 `Note` 对象。

## POST /api/notes/import

从版本化迁移文件数据导入学习笔记。学习笔记与批注在同一事务内写入，并生成新的 UUID；标题、内容、分类、标签和原始时间保持不变。

### 请求体

请求体为 `ContentTransferFile`，且 `resourceType` 必须为 `NOTE`，资源标签至少包含一项。

### 响应

状态码：`201 Created`

返回导入后的 `Note` 对象。

## PUT /api/notes/:id

更新学习笔记。所有字段均可选，仅更新传入字段。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 学习笔记 UUID |

### 请求体

字段同 `POST /api/notes`，全部可选；传入 `tags` 时至少包含一项。

### 响应

返回更新后的 `Note` 对象。

## DELETE /api/notes/:id

删除学习笔记及其全部 Markdown 批注。该操作不可恢复。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 学习笔记 UUID |

### 响应

状态码：`204 No Content`
