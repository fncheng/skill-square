# UI 原型接口

UI 原型用于保存 AI 生成的单文件 HTML，并通过前端沙箱 `iframe` 进行隔离预览。

## GET /api/ui-prototypes

获取 UI 原型列表，按更新时间倒序返回。支持按关键词和分类筛选。

### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `search` | `string` | 否 | 搜索名称、描述、分类或精确标签，最大长度 `120` |
| `category` | `string` | 否 | 按分类精确筛选，最大长度 `80` |

### 响应

返回 `UiPrototype[]`，结构见 [UiPrototype](./schemas.md#uiprototype)。

## GET /api/ui-prototypes/:id

获取 UI 原型详情。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | UI 原型 UUID |

### 响应

返回 `UiPrototype` 对象。

## POST /api/ui-prototypes

创建 UI 原型。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | 是 | 名称，长度 `1-160` |
| `summary` | `string` | 否 | 描述，最大长度 `500` |
| `html` | `string` | 是 | 完整单文件 HTML，UTF-8 编码后最大 `2 MB` |
| `category` | `string` | 否 | 分类，最大长度 `80` |
| `tags` | `string[]` | 否 | 标签数组，单个最大长度 `80`，最多 `20` 个，自动去重 |
| `allowExternal` | `boolean` | 否 | 是否允许预览加载外部资源，默认 `false` |

### 示例请求

```http
POST /api/ui-prototypes
Content-Type: application/json
```

```json
{
  "title": "AI 智能体运营工作台",
  "summary": "展示智能体调用趋势和待处理事项的后台首页。",
  "html": "<!doctype html><html><head><style>...</style></head><body>...</body></html>",
  "category": "后台系统",
  "tags": ["Dashboard", "AI Agent"],
  "allowExternal": false
}
```

### 响应

状态码：`201 Created`

返回创建后的 `UiPrototype` 对象。

## PUT /api/ui-prototypes/:id

更新 UI 原型。所有字段均可选，仅更新传入字段。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | UI 原型 UUID |

### 请求体

字段同 `POST /api/ui-prototypes`，全部可选。

### 响应

返回更新后的 `UiPrototype` 对象。

## DELETE /api/ui-prototypes/:id

删除 UI 原型。该操作不可恢复。

### Path 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | UI 原型 UUID |

### 响应

状态码：`204 No Content`

## 预览安全边界

- HTML 源码只负责持久化，后端不会执行或转换其中的脚本。
- 前端预览始终使用不包含 `allow-same-origin` 的 `iframe sandbox`。
- `allowExternal=false` 时，前端会注入 CSP，阻止远程脚本、图片、字体、网络请求和嵌套页面。
- `allowExternal=true` 只放开外部资源加载，原型仍无法直接访问主应用 DOM 和同源存储。
