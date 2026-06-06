# 分类接口

## GET /api/categories

获取分类列表，按分类名称升序返回。

### 示例请求

```http
GET /api/categories
```

### 响应

```json
[
  {
    "id": "22598a0f-d330-4b42-bb9c-7d1da5f96f5e",
    "name": "前端开发",
    "description": "前端工程、组件、交互和性能优化相关 Prompt。",
    "createdAt": "2026-06-06T10:00:00.000Z",
    "updatedAt": "2026-06-06T10:00:00.000Z"
  }
]
```

## GET /api/categories/:id

获取分类详情。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 分类 UUID |

### 示例请求

```http
GET /api/categories/22598a0f-d330-4b42-bb9c-7d1da5f96f5e
```

### 响应

返回 `Category` 对象。结构见 [Category](./schemas.md#category)。

## POST /api/categories

创建分类。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | `string` | 是 | 分类名称，唯一，长度 `1-80` |
| `description` | `string` | 否 | 分类描述，最大长度 `500` |

### 示例请求

```http
POST /api/categories
Content-Type: application/json
```

```json
{
  "name": "前端开发",
  "description": "前端工程、组件、交互和性能优化相关 Prompt。"
}
```

### 响应

状态码：`201 Created`

返回创建后的 `Category` 对象。

## PUT /api/categories/:id

更新分类。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 分类 UUID |

### 请求体

所有字段均可选。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | `string` | 分类名称，唯一，长度 `1-80` |
| `description` | `string` | 分类描述，最大长度 `500` |

### 示例请求

```http
PUT /api/categories/22598a0f-d330-4b42-bb9c-7d1da5f96f5e
Content-Type: application/json
```

```json
{
  "description": "更新后的分类描述。"
}
```

### 响应

返回更新后的 `Category` 对象。

## DELETE /api/categories/:id

删除分类。删除后，相关 Prompt 的 `categoryId` 会被置为 `null`。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 分类 UUID |

### 示例请求

```http
DELETE /api/categories/22598a0f-d330-4b42-bb9c-7d1da5f96f5e
```

### 响应

状态码：`204 No Content`
