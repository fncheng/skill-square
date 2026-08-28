---
type: index
status: active
created: 2026-08-27
updated: 2026-08-27
related: []
---

# Prompt Skill Manager 项目文档

本目录是 Prompt Skill Manager 的长期项目知识库，记录经过代码、配置或现有文档验证的当前行为、接口契约、设计约束和项目知识。

## 当前结构

- `features/`：按长期业务能力组织的 Feature 上下文，Feature README 是功能知识入口。
- `api/`：RESTful API 的接口、数据结构、认证和错误响应说明。
- `architecture.md`：系统分层、模块边界、数据一致性和部署架构。
- `docker-ghcr-deployment.md`、`docker-image-deployment.md`：在线和离线容器部署说明。
- `_templates/`：Feature、需求、设计、原型、Bug 和 Investigation 文档模板。

项目级历史决策、废弃方案和长期踩坑记录继续按仓库规则维护在 `docs/decisions.md`；仅在存在经过确认的内容时创建该文件。Bug、Investigation 或其他可选目录也只在产生真实记录时创建。

## Feature 索引

| Feature | 状态 | 说明 |
| --- | --- | --- |
| [Prompt 资源库](./features/prompt-library/README.md) | `active` | 管理 Prompt、分类、标签、收藏状态与版本历史。 |
| [Markdown 知识库](./features/markdown-knowledge-base/README.md) | `active` | 管理解决方案、学习笔记、文件导入导出与 Markdown 批注。 |
| [内容发现](./features/content-discovery/README.md) | `active` | 提供跨资源全局搜索，以及解决方案和学习笔记的标签词云浏览。 |
| [UI 原型库](./features/ui-prototype-library/README.md) | `active` | 管理、筛选并在隔离沙箱中预览单文件 HTML 原型。 |
| [访问控制](./features/access-control/README.md) | `active` | 提供单管理员登录、Cookie 会话和访客只读访问边界。 |

## 现有专题文档

- [架构设计](./architecture.md)
- [API 文档索引](./api/README.md)
- [Docker GHCR 在线部署指南](./docker-ghcr-deployment.md)
- [Docker 镜像离线部署指南](./docker-image-deployment.md)

## 受管理文档规范

`features/` 下的 Feature README、requirements、design、prototype、Bug 和 Investigation 文档属于受管理文档，应包含 YAML frontmatter。

Feature 及其聚合文档使用以下字段：

```yaml
---
type: feature | requirements | design | prototype
feature: feature-name
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
related: []
---
```

Bug 和 Investigation 使用稳定 `id`，并通过 `features` 和 `related` 维护关联：

```yaml
---
id: BUG-YYYYMMDD-NNN | INV-YYYYMMDD-NNN
type: bug | investigation
status: confirmed
created: YYYY-MM-DD
updated: YYYY-MM-DD
features:
  - feature-name
related: []
---
```

## 命名与状态

- Feature 目录使用 lowercase kebab-case，并以 `features/<feature>/README.md` 作为稳定入口。
- Bug 使用 `BUG-YYYYMMDD-NNN-kebab-case-description.md`。
- Investigation 使用 `INV-YYYYMMDD-NNN-kebab-case-description.md`。
- 状态变化只更新 frontmatter，不移动文件路径；`superseded` 文档通过 `related` 指向后继文档。

| 文档类型 | 可用状态 |
| --- | --- |
| Feature / requirements / design / prototype | `active`, `stable`, `deprecated`, `superseded` |
| Bug | `confirmed`, `fixed`, `deprecated`, `superseded` |
| Investigation | `proposed`, `in-progress`, `completed`, `deprecated`, `superseded` |

## 使用流程

1. 从相关 Feature README 获取当前功能边界和代码入口。
2. 按任务需要读取现有 API、架构、原型及关联记录。
3. 通过 `related` 追踪跨 Feature 或替代关系。
4. 仅在当前任务或仓库规则要求维护长期知识时更新文档。
5. 新增或移动文档后检查索引、frontmatter 和相对链接。

文档只记录经过验证且值得长期保留的知识，不镜像源码、Git 历史、临时调试过程或未确认猜测。
