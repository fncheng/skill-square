# Prompt 接口

## GET /api/prompts

获取 Prompt 分页列表，支持名称搜索、内容搜索、分类筛选、标签筛选和收藏筛选。

### Query 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `page` | `number` | 否 | `1` | 页码，从 `1` 开始 |
| `pageSize` | `number` | 否 | `10` | 每页数量，最大值为 `100` |
| `search` | `string` | 否 | - | 搜索 Prompt 名称或内容，最大长度 `120` |
| `categoryId` | `string` | 否 | - | 分类 UUID |
| `tagIds` | `string` | 否 | - | 标签 UUID，多个值使用英文逗号分隔 |
| `tag` | `string` | 否 | - | 标签名称搜索关键词，最大长度 `80` |
| `favorite` | `boolean` | 否 | - | 是否仅查询收藏 Prompt |

### 示例请求

```http
GET /api/prompts?page=1&pageSize=10&search=Vue3&favorite=true
```

### 响应

```json
{
  "items": [
    {
      "id": "4f4c7c43-16f1-4e62-a8e1-6f8e28bb9a21",
      "name": "Vue3 组件设计助手",
      "description": "基于 Vue3 + TypeScript 生成高质量、可复用的组件设计方案。",
      "content": "你是一位 Vue3 组件架构师...",
      "isFavorite": true,
      "categoryId": "22598a0f-d330-4b42-bb9c-7d1da5f96f5e",
      "category": {
        "id": "22598a0f-d330-4b42-bb9c-7d1da5f96f5e",
        "name": "前端开发",
        "description": "前端工程、组件、交互和性能优化相关 Prompt。",
        "createdAt": "2026-06-06T10:00:00.000Z",
        "updatedAt": "2026-06-06T10:00:00.000Z"
      },
      "tags": [
        {
          "id": "e7bd7d80-c5f8-43a5-a5cc-0d5e6c20123f",
          "name": "Vue3",
          "color": "#22c55e",
          "createdAt": "2026-06-06T10:00:00.000Z",
          "updatedAt": "2026-06-06T10:00:00.000Z"
        }
      ],
      "createdAt": "2026-06-06T10:00:00.000Z",
      "updatedAt": "2026-06-06T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

## GET /api/prompts/:id

获取单个 Prompt 详情。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | Prompt UUID |

### 示例请求

```http
GET /api/prompts/4f4c7c43-16f1-4e62-a8e1-6f8e28bb9a21
```

### 响应

返回 `Prompt` 对象。结构见 [Prompt](./schemas.md#prompt)。

## POST /api/prompts

创建 Prompt。创建成功后会自动生成初始版本快照。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | `string` | 是 | Prompt 名称，长度 `1-160` |
| `description` | `string` | 否 | Prompt 描述，最大长度 `1000` |
| `content` | `string` | 是 | Prompt 正文内容，不能为空 |
| `categoryId` | `string \| null` | 否 | 分类 UUID，传 `null` 表示不设置分类 |
| `tagIds` | `string[]` | 否 | 标签 UUID 列表 |
| `isFavorite` | `boolean` | 否 | 是否收藏，默认 `false` |

### 示例请求

```http
POST /api/prompts
Content-Type: application/json
```

```json
{
  "name": "Vue3 组件设计助手",
  "description": "基于 Vue3 + TypeScript 生成高质量、可复用的组件设计方案。",
  "content": "你是一位 Vue3 组件架构师，请根据需求输出 Props、Emits 与组件代码。",
  "categoryId": "22598a0f-d330-4b42-bb9c-7d1da5f96f5e",
  "tagIds": ["e7bd7d80-c5f8-43a5-a5cc-0d5e6c20123f"],
  "isFavorite": false
}
```

### 响应

状态码：`201 Created`

返回创建后的 `Prompt` 对象。

## PUT /api/prompts/:id

更新 Prompt。更新成功后会自动生成新的版本快照。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | Prompt UUID |

### 请求体

所有字段均可选。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | `string` | Prompt 名称，长度 `1-160` |
| `description` | `string` | Prompt 描述，最大长度 `1000` |
| `content` | `string` | Prompt 正文内容 |
| `categoryId` | `string \| null` | 分类 UUID，传 `null` 表示移除分类 |
| `tagIds` | `string[]` | 标签 UUID 列表，传空数组表示清空标签 |
| `isFavorite` | `boolean` | 是否收藏 |

### 示例请求

```http
PUT /api/prompts/4f4c7c43-16f1-4e62-a8e1-6f8e28bb9a21
Content-Type: application/json
```

```json
{
  "description": "更新后的描述",
  "tagIds": []
}
```

### 响应

返回更新后的 `Prompt` 对象。

## DELETE /api/prompts/:id

删除 Prompt。删除后，该 Prompt 的标签关联和版本历史会被级联删除。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | Prompt UUID |

### 示例请求

```http
DELETE /api/prompts/4f4c7c43-16f1-4e62-a8e1-6f8e28bb9a21
```

### 响应

状态码：`204 No Content`

## POST /api/prompts/:id/favorite

收藏 Prompt。

### 示例请求

```http
POST /api/prompts/4f4c7c43-16f1-4e62-a8e1-6f8e28bb9a21/favorite
```

### 响应

返回更新后的 `Prompt` 对象。

## DELETE /api/prompts/:id/favorite

取消收藏 Prompt。

### 示例请求

```http
DELETE /api/prompts/4f4c7c43-16f1-4e62-a8e1-6f8e28bb9a21/favorite
```

### 响应

返回更新后的 `Prompt` 对象。

## PUT /api/prompts/:id/favorite

设置 Prompt 收藏状态。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `isFavorite` | `boolean` | 是 | 是否收藏 |

### 示例请求

```http
PUT /api/prompts/4f4c7c43-16f1-4e62-a8e1-6f8e28bb9a21/favorite
Content-Type: application/json
```

```json
{
  "isFavorite": true
}
```

### 响应

返回更新后的 `Prompt` 对象。

## GET /api/prompts/:id/versions

获取 Prompt 版本历史，按版本号倒序返回。

### 示例请求

```http
GET /api/prompts/4f4c7c43-16f1-4e62-a8e1-6f8e28bb9a21/versions
```

### 响应

```json
[
  {
    "id": "a6ba5381-0ee1-4ffc-b5fb-1d131b4a2833",
    "promptId": "4f4c7c43-16f1-4e62-a8e1-6f8e28bb9a21",
    "version": 2,
    "name": "Vue3 组件设计助手",
    "description": "更新后的描述",
    "content": "你是一位 Vue3 组件架构师...",
    "isFavorite": true,
    "categoryId": "22598a0f-d330-4b42-bb9c-7d1da5f96f5e",
    "categoryName": "前端开发",
    "tagIds": ["e7bd7d80-c5f8-43a5-a5cc-0d5e6c20123f"],
    "tagNames": ["Vue3"],
    "createdAt": "2026-06-06T10:30:00.000Z"
  }
]
```

## POST /api/prompts/:id/rollback/:versionId

将 Prompt 回滚到指定历史版本。回滚成功后，系统会基于回滚后的内容生成一个新的版本快照。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | Prompt UUID |
| `versionId` | `string` | 是 | PromptVersion UUID |

### 示例请求

```http
POST /api/prompts/4f4c7c43-16f1-4e62-a8e1-6f8e28bb9a21/rollback/a6ba5381-0ee1-4ffc-b5fb-1d131b4a2833
```

### 响应

返回回滚后的 `Prompt` 对象。
