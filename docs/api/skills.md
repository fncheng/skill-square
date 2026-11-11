# SKILL API

所有接口位于 `/api/skills`，均要求管理员 Cookie，会返回 `Cache-Control: private, no-store`。上传采用 multipart/form-data，字段 `file` 为原始文件；`name`、`description`、`note` 与 UUID `requestId` 是创建或更新时的文本字段。追加时必须提供 `expectedVersionId`（打开窗口时最新版本 ID）。每次更新是完整快照；请求标识相同且内容一致时返回原结果，预期版本过期或内容未变化返回 409。

| 方法与路径 | 用途 |
| --- | --- |
| `GET /skills` | 列表、当前版本和版本总数；不返回正文或原包 |
| `POST /skills/inspect` | 校验文件并返回识别的元信息及文件清单，不保存 |
| `POST /skills` | 创建资源和首个版本 |
| `GET /skills/:id` | 版本历史及文件清单，不返回正文或原包 |
| `POST /skills/:id/versions` | 追加完整版本 |
| `GET /skills/:id/versions/:versionId/files/:fileId` | 获取文件的有界文本，无法预览时 `text` 为 `null` |
| `GET /skills/:id/versions/:versionId/download` | 下载该版本原始文件字节 |
| `DELETE /skills/:id` | 删除资源及全部版本和文件，成功返回 204 |

上传文件上限为 10 MiB（含），解压总量上限为 50 MiB，最多 500 个文件，单文本在线预览上限为 1 MiB。ZIP 条目的完整路径经 NFC 规范化后不得超过 1024 UTF-8 字节，包含可能的包裹目录；超限返回 400。Docker Web 镜像对 SKILL 路由的请求体上限为 11 MiB，为 multipart 字段和边界预留空间。完整校验规则见 [SKILL center](../features/skill-center/README.md)。原包始终保存在数据库，删除不会清除已有备份。Schema 变更需要部署前执行 `prisma migrate deploy` 并重新生成 Prisma Client；这些步骤不会由请求自动执行。
