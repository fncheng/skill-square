# Prompt Skill Manager API 文档

## 基础信息

- API Base URL：`http://localhost:3000/api`
- Swagger：`http://localhost:3000/api/docs`
- 数据格式：`application/json`
- 时间格式：ISO 8601 字符串，例如 `2026-06-06T10:00:00.000Z`
- 认证方式：单管理员 `HttpOnly` Cookie；访客只读

## 文档索引

- [Prompt 接口](./prompts.md)
- [管理员认证接口](./auth.md)
- [分类接口](./categories.md)
- [标签接口](./tags.md)
- [解决方案接口](./solutions.md)
- [学习笔记接口](./notes.md)
- [UI 原型接口](./ui-prototypes.md)
- [全局搜索接口](./search.md)
- [Markdown 批注接口](./annotations.md)
- [数据结构](./schemas.md)

## 通用错误响应

接口发生错误时，后端返回 JSON 格式错误信息。

```json
{
  "statusCode": 400,
  "message": "请求参数校验失败",
  "error": "Bad Request"
}
```

常见状态码：

| 状态码 | 含义 | 说明 |
| --- | --- | --- |
| `200` | 请求成功 | 查询、更新、收藏、回滚等操作成功 |
| `201` | 创建成功 | 创建 Prompt、分类或标签成功 |
| `204` | 删除成功 | 删除资源成功，无响应体 |
| `400` | 参数错误 | DTO 校验失败，例如 UUID 格式不合法 |
| `401` | 未认证 | 访客调用业务写接口，或管理员会话已经失效 |
| `429` | 请求过多 | 登录尝试超过频率限制 |
| `404` | 资源不存在 | 目标 Prompt、分类、标签或版本不存在 |
| `409` | 数据冲突 | 名称唯一性冲突或数据库操作冲突 |

## 分页响应

分页接口统一返回：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 10
}
```

分页参数：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `page` | `number` | 否 | `1` | 页码，从 `1` 开始 |
| `pageSize` | `number` | 否 | `10` | 每页数量，最大值为 `100` |

## 认证与权限

- 访客可以调用所有读取接口，包括列表、详情、搜索、版本历史、文档导出和批注查询。
- 业务接口的 `POST`、`PUT`、`PATCH`、`DELETE` 需要先通过 `/api/auth/login` 登录管理员。
- 管理员会话由浏览器自动携带，前端不应读取或持久化 Cookie 中的 JWT。
- Swagger 保持公开，但执行写接口时仍需管理员 Cookie。

## 资源关系

- 一个 Prompt 可以属于一个分类，也可以不设置分类。
- 一个 Prompt 可以绑定多个标签。
- 删除分类后，相关 Prompt 的 `categoryId` 会被置为 `null`。
- 删除标签后，Prompt 与该标签的关联会被删除。
- 删除 Prompt 后，该 Prompt 的标签关联和版本历史会被级联删除。
- 删除学习笔记或解决方案后，其 Markdown 批注会被级联删除。
- UI 原型以单文件 HTML 保存，预览由前端沙箱隔离，默认阻止外部资源。
- 创建 Prompt、编辑 Prompt、回滚 Prompt 都会生成版本快照。
