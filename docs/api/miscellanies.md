# 杂谈接口

杂谈用于收录不限定主题的 Markdown 知识、经验片段和随手记录。访客可读取、导出，管理员会话可以新建、更新、删除和导入。

## GET /api/miscellanies

获取杂谈列表，按更新时间倒序返回。支持 `search`（标题、摘要或正文，最大长度 `120`）和 `category`（精确分类，最大长度 `80`）筛选。

## GET /api/miscellanies/:id

获取杂谈详情，返回 [Miscellany](./schemas.md#miscellany) 对象。

## GET /api/miscellanies/:id/export

导出单篇杂谈及其全部批注。响应为 `ContentTransferFile`，`resourceType` 固定为 `MISCELLANY`；不保留源环境 UUID。

## POST /api/miscellanies/import

导入 `resourceType=MISCELLANY` 的 `ContentTransferFile`。杂谈和批注在同一事务内写入，v1 文件允许空标签，v2 文件至少包含一个规范化标签。

## POST /api/miscellanies

创建杂谈。请求体字段如下。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | 是 | 标题，长度 `1-200` |
| `summary` | `string` | 否 | 列表摘要，最大长度 `500` |
| `content` | `string` | 是 | Markdown 正文，长度 `>=1` |
| `category` | `string` | 否 | 分类，最大长度 `80` |
| `tags` | `string[]` | 是 | 标签数组，去空去重后 `1-20` 项，单项最大长度 `80` |

成功时返回 `201 Created` 和创建后的 `Miscellany`。

## PUT /api/miscellanies/:id

更新杂谈。请求字段与创建接口相同但全部可选；传入 `tags` 时仍至少需要一项。

## DELETE /api/miscellanies/:id

删除杂谈及其 Markdown 批注，成功时返回 `204 No Content`。
