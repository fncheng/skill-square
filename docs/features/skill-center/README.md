---
type: feature
feature: skill-center
status: active
created: 2026-11-10
updated: 2026-11-10
related:
  - ../access-control/README.md
---

# SKILL center

管理员可上传 `SKILL.md` 或完整 ZIP，也可手动创建 Markdown。每次更新保存完整不可变版本，可浏览文件、查看历史、比较任意版本、下载指定版本原包或删除整个资源。ZIP 更新是完整替换；不提供分享、自动同步和回滚。

所有接口和页面都要求管理员会话。原始上传保存在 PostgreSQL，详情仅返回文件清单，文本按需获取，下载保留原始字节；应用删除会级联删除全部快照，已有数据库备份不受影响。数据库增长、WAL 和备份容量需随历史版本数量评估。

上传不超过 10 MiB，解压总量不超过 50 MiB，最多 500 个文件；在线文本预览单文件不超过 1 MiB。ZIP 条目的完整路径经 NFC 规范化后不超过 1024 UTF-8 字节，包含可能的包裹目录。唯一 `SKILL.md` 可位于根目录或唯一包裹目录下，要求 UTF-8 和包含非空 `name`、`description` 的 YAML frontmatter。拒绝危险路径、大小写冲突、符号链接、加密包、损坏文件和超限内容；忽略清单中的 `__MACOSX` 与 `.DS_Store`，下载原包不变。

更新时检查打开窗口时的最新版本，冲突时重新查看后再提交；相同文件内容和元信息不会新增版本，请求标识用于重试去重。跨设备使用前需自行备份和替换本地文件。

## 代码与接口

- [SKILL API](../../api/skills.md)
- `apps/web/src/views/SkillCenter.tsx`
- `apps/api/src/skills`
- `apps/api/prisma/schema.prisma`
