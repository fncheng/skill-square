# Markdown 批注接口

批注用于给学习笔记、解决方案或模型回答中的一段原文补充 Markdown 内容。批注与正文分别保存，不会修改原始 Markdown。

## 文本锚点

每条批注使用两类信息定位原文：

- `start` / `end`：选区在 Markdown 渲染文本中的偏移，用于快速定位。
- `exact` / `prefix` / `suffix`：选中的原文及前后文，用于正文修改后的回退匹配。

当位置和引用内容都无法唯一匹配时，前端保留批注并将其标记为“待重新关联”。

## GET /api/annotations

获取指定文档的全部批注，按创建时间正序返回。

### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `resourceType` | `NOTE \| SOLUTION \| MODEL_RESPONSE` | 是 | 文档类型；`MODEL_RESPONSE` 必须有管理员会话 |
| `resourceId` | `string` | 是 | 笔记或解决方案 UUID |

### 示例请求

```http
GET /api/annotations?resourceType=NOTE&resourceId=8f2a9c44-1d6e-4b0a-9b2f-5c0c1a2b3d4e
```

## POST /api/annotations

创建批注。

### 请求体

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `resourceType` | `NOTE \| SOLUTION` | 是 | 文档类型 |
| `resourceId` | `string` | 是 | 文档 UUID |
| `content` | `string` | 是 | Markdown 批注内容，最大长度 `50000` |
| `exact` | `string` | 是 | 被批注原文，长度 `1-500` |
| `prefix` | `string` | 否 | 原文前方上下文，最大长度 `500` |
| `suffix` | `string` | 否 | 原文后方上下文，最大长度 `500` |
| `start` | `number` | 是 | 渲染文本起始偏移，从 `0` 开始 |
| `end` | `number` | 是 | 渲染文本结束偏移，不包含结束位置 |
| `documentUpdatedAt` | `string` | 否 | 创建锚点时文档的更新时间 |

### 示例请求

```json
{
  "resourceType": "NOTE",
  "resourceId": "8f2a9c44-1d6e-4b0a-9b2f-5c0c1a2b3d4e",
  "content": "### 云服务器仍无法访问\n\n请继续检查云厂商的**安全组**规则。",
  "exact": "sudo ufw enable",
  "prefix": "规则确认无误后，执行 ",
  "suffix": " 启用防火墙",
  "start": 128,
  "end": 143,
  "documentUpdatedAt": "2026-07-15T08:00:00.000Z"
}
```

状态码：`201 Created`

## PUT /api/annotations/:id

更新批注 Markdown 内容或重新关联文本锚点。请求字段均为可选；更新锚点时应同时提交完整的 `exact`、`prefix`、`suffix`、`start` 和 `end`。

## DELETE /api/annotations/:id

删除批注，状态码为 `204 No Content`。删除操作不会修改关联的 Markdown 正文。

删除笔记、解决方案或模型回答时，其批注会由数据库外键级联删除。模型回答相关的读取与写入均要求管理员会话。
