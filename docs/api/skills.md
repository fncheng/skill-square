# SKILL API

所有接口位于 `/api/skills`，均要求管理员 Cookie，会返回 `Cache-Control: private, no-store`。上传采用 multipart/form-data，字段 `file` 为原始文件；`name`、`description`、`note` 与 UUID `requestId` 是创建或更新时的文本字段。创建资源可提供 `toolKey`（缺省为 `unspecified`），新增适配必须提供 `toolKey`。追加时提供 `variantId` 和该适配最新的 `expectedVersionId`；仅有一个适配时可省略 `variantId`，多个适配必须明确指定。每次更新是完整快照；请求标识相同且内容一致时返回原结果，预期版本过期或内容未变化返回 409。

| 方法与路径 | 用途 |
| --- | --- |
| `GET /skills` | 资源共同资料及各适配最新版本摘要、文件数和版本总数；不返回文件清单、正文或原包 |
| `POST /skills/inspect` | 校验文件并返回识别的元信息及文件清单，不保存 |
| `POST /skills` | 创建资源、首个工具适配和首版 |
| `GET /skills/:id` | 共同资料及适配摘要 |
| `GET /skills/:id/variants/:variantId` | 指定适配的版本历史及文件清单，不返回正文或原包 |
| `POST /skills/:id/variants` | 新建工具适配与其首版，工具重复返回 409 |
| `PATCH /skills/:id/variants/:variantId` | 将 `expectedToolKey: unspecified` 归类为 `codex` 或 `claude-code`，目标存在或原状态变化时返回 409 |
| `POST /skills/:id/versions` | 追加完整版本 |
| `GET /skills/:id/versions/:versionId/files/:fileId` | 获取文件的有界文本，无法预览时 `text` 为 `null` |
| `GET /skills/:id/versions/:versionId/download` | 下载该版本原始文件字节 |
| `DELETE /skills/:id` | 删除资源及全部适配、版本和文件，成功返回 204 |

上传文件上限为 10 MiB（含），解压总量上限为 50 MiB，最多 500 个文件，单文本在线预览上限为 1 MiB。ZIP 条目的完整路径经 NFC 规范化后不得超过 1024 UTF-8 字节，包含可能的包裹目录；超限返回 400。Docker Web 镜像对 SKILL 路由的请求体上限为 11 MiB，为 multipart 字段和边界预留空间。完整校验规则见 [SKILL center](../features/skill-center/README.md)。原包始终保存在数据库，删除不会清除已有备份。Schema 变更需要部署前执行 `prisma migrate deploy` 并重新生成 Prisma Client；这些步骤不会由请求自动执行。

`toolKey` 支持 `codex`、`claude-code` 和 `unspecified`。每个资源每种工具至多一个适配，各适配版本号、无变化检测与并发基线独立。上传保留原包，下载 ZIP 名称包含共同名称、工具和版本。请求 ID 绑定保存操作及目标和提交内容；冲突时不静默重试。

部署前应备份并验证恢复，检查是否存在无版本资源；迁移遇到该异常会停止。旧历史整体归入 `unspecified`，保留原版本和文件 ID、编号及原包。不同适配可能出现相同版本号，因此回退旧服务前必须停止写入并评估数据库恢复。
