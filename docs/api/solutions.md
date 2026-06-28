# 解决方案接口

解决方案用于沉淀常见问题的处理方式，正文以 Markdown 文档形式存储，供随时查阅、编辑和删除。

## GET /api/solutions

获取解决方案列表，按更新时间倒序返回。支持按关键词和分类筛选。

### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `search` | `string` | 否 | 标题、摘要或正文搜索关键词，最大长度 `120` |
| `category` | `string` | 否 | 按分类精确筛选，最大长度 `80` |

### 示例请求

```http
GET /api/solutions?search=codex&category=Codex
```

### 响应

```json
[
  {
    "id": "8f2a9c44-1d6e-4b0a-9b2f-5c0c1a2b3d4e",
    "title": "关于 Codex 如何在没有 AGENTS.md 时读取 CLAUDE.md",
    "summary": "通过配置 project_doc_fallback_filenames，让 Codex 在缺少 AGENTS.md 时回退读取 CLAUDE.md。",
    "content": "在 `~/.codex/config.toml` 中增加这一行：\n\n...",
    "category": "Codex",
    "tags": ["Codex", "CLAUDE.md", "配置"],
    "createdAt": "2026-06-20T08:00:00.000Z",
    "updatedAt": "2026-06-20T08:00:00.000Z"
  }
]
```

## GET /api/solutions/:id

获取解决方案详情。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 解决方案 UUID |

### 响应

返回 `Solution` 对象。结构见 [Solution](./schemas.md#solution)。

## POST /api/solutions

创建解决方案。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | 是 | 标题，长度 `1-200` |
| `summary` | `string` | 否 | 列表摘要，最大长度 `500` |
| `content` | `string` | 是 | Markdown 正文，长度 `>=1` |
| `category` | `string` | 否 | 分类，最大长度 `80` |
| `tags` | `string[]` | 否 | 标签数组，单个最大长度 `80`，最多 `20` 个，自动去重 |

### 示例请求

```http
POST /api/solutions
Content-Type: application/json
```

```json
{
  "title": "WSL 内连接本机 PostgreSQL 失败",
  "summary": "WSL 中的 localhost 指向 WSL 自身，需使用主机地址。",
  "content": "在 WSL 内开发时，`localhost` 指向的是 WSL 环境自身……",
  "category": "环境",
  "tags": ["WSL", "PostgreSQL", "网络"]
}
```

### 响应

状态码：`201 Created`

返回创建后的 `Solution` 对象。

## PUT /api/solutions/:id

更新解决方案。所有字段均可选，仅更新传入字段。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 解决方案 UUID |

### 请求体

字段同 `POST /api/solutions`，全部可选。

### 响应

返回更新后的 `Solution` 对象。

## DELETE /api/solutions/:id

删除解决方案。该操作不可恢复。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 解决方案 UUID |

### 响应

状态码：`204 No Content`
