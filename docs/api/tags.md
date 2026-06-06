# 标签接口

## GET /api/tags

获取标签列表，按标签名称升序返回。

### 示例请求

```http
GET /api/tags
```

### 响应

```json
[
  {
    "id": "e7bd7d80-c5f8-43a5-a5cc-0d5e6c20123f",
    "name": "Vue3",
    "color": "#22c55e",
    "createdAt": "2026-06-06T10:00:00.000Z",
    "updatedAt": "2026-06-06T10:00:00.000Z"
  }
]
```

## GET /api/tags/:id

获取标签详情。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 标签 UUID |

### 示例请求

```http
GET /api/tags/e7bd7d80-c5f8-43a5-a5cc-0d5e6c20123f
```

### 响应

返回 `Tag` 对象。结构见 [Tag](./schemas.md#tag)。

## POST /api/tags

创建标签。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | `string` | 是 | 标签名称，唯一，长度 `1-80` |
| `color` | `string` | 否 | HEX 颜色，例如 `#3b82f6`，默认 `#3b82f6` |

### 示例请求

```http
POST /api/tags
Content-Type: application/json
```

```json
{
  "name": "Vue3",
  "color": "#22c55e"
}
```

### 响应

状态码：`201 Created`

返回创建后的 `Tag` 对象。

## PUT /api/tags/:id

更新标签。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 标签 UUID |

### 请求体

所有字段均可选。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | `string` | 标签名称，唯一，长度 `1-80` |
| `color` | `string` | HEX 颜色，例如 `#3b82f6` |

### 示例请求

```http
PUT /api/tags/e7bd7d80-c5f8-43a5-a5cc-0d5e6c20123f
Content-Type: application/json
```

```json
{
  "color": "#16a34a"
}
```

### 响应

返回更新后的 `Tag` 对象。

## DELETE /api/tags/:id

删除标签。删除后，Prompt 与该标签的关联会被级联删除。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 标签 UUID |

### 示例请求

```http
DELETE /api/tags/e7bd7d80-c5f8-43a5-a5cc-0d5e6c20123f
```

### 响应

状态码：`204 No Content`
