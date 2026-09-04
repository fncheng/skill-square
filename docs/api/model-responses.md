# 模型回答接口

模型回答是仅登录管理员可见的私有资源。所有 `/api/model-responses` 请求（包含 `GET`、`HEAD` 与导出）都需要有效管理员 Cookie；访客统一得到 `401`，不得借由导出读取内容。

## GET /api/model-responses

按更新时间倒序获取模型回答列表。支持 `search`（标题、摘要、正文、标签、来源产品、模型名称或原始 Prompt，最大 `120`）和 `category`（精确分类，最大 `80`）参数。列表项目额外返回 `annotationCount`，不提供模型名称筛选。

## GET /api/model-responses/:id

获取单条模型回答详情，包含 `title`、`summary`、`content`、`category`、`tags`、可选 `sourceProduct`、`modelName`、`originalPrompt`、`annotationCount` 与时间字段。标题最大 `200`，正文和至少一个标签必填，来源字段均为可选。

## POST /api/model-responses 与 PUT /api/model-responses/:id

分别收录与更新模型回答。创建时 `title`、`content`、`tags` 为必填；更新时字段可选，传入 `tags` 时仍至少包含一项。

## GET /api/model-responses/:id/export

导出版本化 `ContentTransferFile`。`resourceType` 固定为 `MODEL_RESPONSE`，`resource` 包含回答正文、分类、标签、溯源字段和原始 Prompt，`annotations` 包含全部 Markdown 批注。

## POST /api/model-responses/import

导入 `resourceType=MODEL_RESPONSE` 的 `ContentTransferFile`。回答与批注在同一事务创建，源 UUID 不保留。

## DELETE /api/model-responses/:id

删除模型回答及其所有 Markdown 批注，返回 `204 No Content`。
