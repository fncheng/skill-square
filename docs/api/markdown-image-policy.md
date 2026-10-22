# Markdown 外部图片白名单接口

## 概览

该策略控制 Markdown 渲染器可创建的外部图片元素。白名单为精确 HTTPS Host，不保存图片 URL、密钥或访问凭据。策略为空、前端策略尚未加载或读取失败时，客户端默认拒绝所有外部图片。

## 数据结构

```json
{
  "allowedHosts": ["cdn.example.com", "images.unsplash.com"],
  "version": 3,
  "updatedAt": "2026-10-20T12:00:00.000Z"
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `allowedHosts` | `string[]` | 已规范化、去重并按字母排序的精确 Host 列表。 |
| `version` | `number` | 乐观并发版本。首次保存空策略时版本为 `1`；没有持久化记录的默认空策略版本为 `0`。 |
| `updatedAt` | `string \| null` | 最近一次保存时间；尚未保存过策略时为 `null`。 |

Host 规则：

- 仅允许精确公网 DNS Host，例如 `cdn.example.com`。
- 不接受协议、端口、路径、查询参数、用户名、通配符或 IP 地址。
- 不接受 `localhost`、`*.localhost`、`*.local`、`home.arpa`、`*.home.arpa` 和单标签内网名称。
- 图片 URL 在前端还必须同时满足默认端口的 `https:`、不含 `username/password`，并且其规范化后的 `hostname` 与列表精确相等；非默认端口或 URL 用户信息会被拒绝。

## 获取策略

`GET /api/markdown-image-policy`

访客可读取。若数据库尚无记录，返回默认空策略：

```json
{
  "allowedHosts": [],
  "version": 0,
  "updatedAt": null
}
```

## 替换策略

`PUT /api/markdown-image-policy`

需要管理员 Cookie。该接口原子替换整个集合，不能增量提交。

请求体：

```json
{
  "allowedHosts": ["cdn.example.com", "images.unsplash.com"],
  "expectedVersion": 3
}
```

| 字段 | 类型 | 必填 | 限制 |
| --- | --- | --- | --- |
| `allowedHosts` | `string[]` | 是 | 最多 100 项；单项最多 253 个字符；每项必须符合 Host 规则。 |
| `expectedVersion` | `number` | 是 | 非负整数，必须等于读取策略时的 `version`。 |

成功时返回新的完整策略和递增后的 `version`。

### 错误响应

| 状态码 | 场景 |
| --- | --- |
| `400` | Host 格式、列表数量、单项长度或版本号不合法。 |
| `401` | 没有有效管理员会话。 |
| `409` | `expectedVersion` 已过期，其他管理员已保存了新策略。客户端应保留草稿，重新获取后由管理员决定如何合并。 |
