## Context

Prompt Skill Manager 当前是 React 单页应用、NestJS REST API 与 PostgreSQL 组成的单实例管理工具。前端路由和操作按钮全部公开，后端 Controller 也没有认证 Guard，因此隐藏按钮不能阻止访客直接调用写接口。

本次变更需要覆盖 Prompt、解决方案、学习笔记、Markdown 批注、UI 原型、分类和标签等多个模块，同时保持所有查询和内容消费能力公开。系统只有一个固定管理员 `admin`，没有注册、多用户协作、角色分配和用户资料需求，因此完整的用户表、OAuth 或 RBAC 会增加不必要的迁移与维护成本。

生产环境由 Web Nginx 同源代理 `/api` 到 NestJS；本地开发通常从 `localhost:5173` 跨端口访问 `localhost:3000`。现有 CORS 已启用 credentials，但 Axios 尚未发送跨域 Cookie，部署配置也没有认证密钥。

## Goals / Non-Goals

**Goals:**

- 为唯一管理员提供用户名、密码登录和可过期会话。
- 在后端形成不可绕过的默认拒绝写入边界，并让未来新增的写接口默认受保护。
- 让访客继续浏览、搜索、复制、导出和查看已有批注。
- 让前端路由、导航和操作入口准确反映访客或管理员身份。
- 使用适合现有单实例部署的安全 Cookie、密码哈希、登录限流和配置校验。
- 保持现有 typed delete confirmation、Prompt 版本快照和其他业务规则不变。

**Non-Goals:**

- 用户注册、多个管理员、普通用户账号、RBAC 或权限配置后台。
- OAuth、SSO、验证码、找回密码、修改密码页面或长期 Refresh Token。
- 在数据库中新增 User、Role 或 Session 表。
- 对公开查询内容增加访问控制。
- 修改现有资源模型或数据迁移。

## Decisions

### 1. 使用环境凭据与无状态 JWT Cookie

管理员用户名固定为 `admin`，密码只以强哈希形式配置在 `ADMIN_PASSWORD_HASH` 中。服务启动时必须校验密码哈希和 `AUTH_JWT_SECRET`，缺失或明显不安全时直接失败，不回退到默认密码。

登录成功后，后端签发包含 `sub=admin`、`role=admin`、过期时间和凭据版本指纹的短期 JWT，并写入固定名称的 `HttpOnly` Cookie。凭据版本由当前密码哈希派生，修改密码哈希后旧会话立即失效；轮换 JWT secret 可以使全部会话失效。

默认会话有效期为 8 小时，并允许通过 `AUTH_SESSION_TTL_SECONDS` 调整。Cookie 使用 `HttpOnly`、`SameSite=Strict`、`Path=/api`；`AUTH_COOKIE_SECURE` 必须显式配置，本地 HTTP 使用 `false`，生产 HTTPS 使用 `true`。前端只读取 `/api/auth/session` 的结果，不读取或持久化 Token。

选择该方案而不是数据库 Session，是因为当前只有一个管理员和一个 API 实例，无状态会话不需要 Prisma 迁移或清理任务。代价是退出登录只能清除当前浏览器 Cookie，已被窃取的 Token 在过期前仍可能有效；短有效期、密码/密钥轮换与 HTTPS 用于降低该风险。

不采用 `localStorage` Bearer Token，因为脚本可读取的长期凭据会扩大 XSS 后果。不采用 Nginx Basic Auth，因为它无法复用现有 Admin badge 提供产品内登录状态和退出体验。

### 2. 认证 API 返回稳定的访客/管理员状态

新增以下接口：

- `POST /api/auth/login`：校验 `username` 与 `password`，成功时设置 Cookie 并返回管理员摘要；失败统一返回不泄露具体原因的 `401`。
- `GET /api/auth/session`：有效会话返回管理员摘要；没有、过期或无效会话时返回 `200` 和访客状态，必要时清理无效 Cookie。
- `POST /api/auth/logout`：无论当前 Cookie 是否有效都清理 Cookie并返回成功，保持幂等。

Session 查询对访客返回 `200`，避免应用首次加载将正常访客状态显示为全局请求错误。登录 DTO 继续使用全局 ValidationPipe，Swagger 增加 Cookie 认证描述和 `401` 响应。

### 3. 使用全局“非安全方法默认保护”Guard

注册全局 `AdminWriteGuard`：

- `GET`、`HEAD`、`OPTIONS` 默认公开。
- `POST`、`PUT`、`PATCH`、`DELETE` 等非安全方法默认要求有效管理员 Cookie。
- 登录和退出通过明确的公开元数据装饰器绕过写保护。

这比在每个现有 Controller 方法上逐个添加 Guard 更不容易遗漏，也能让未来新增写接口默认安全。Guard 只负责认证与授权，Controller 和 Service 继续负责 DTO、HTTP 语义和业务逻辑。

所有未认证写请求返回 `401 Unauthorized`，且不得进入业务 Service。当前只有一个角色，不额外引入 `403` 权限矩阵。

### 4. Cookie 认证配套安全边界

登录端点按客户端 IP 进行限流，默认 15 分钟内最多 5 次登录尝试；当前单 API 实例可使用进程内限流器。认证失败响应统一为“用户名或密码错误”，不区分账号和密码。

生产环境必须配置明确的 `CORS_ORIGIN` 并继续启用 credentials，不允许认证模式回退到任意来源。前端 Axios 设置 `withCredentials: true`，兼容本地跨端口开发；生产环境仍通过同源 `/api` 代理。

Cookie 的 `SameSite=Strict`、安全方法公开策略和明确 CORS 来源共同构成当前同源部署的 CSRF 边界。如果未来允许跨站嵌入、跨站登录或第三方写入客户端，需要改为显式 CSRF Token 方案。

### 5. 前端采用三态认证 Store 与集中路由保护

新增 Zustand auth store，状态为 `loading | guest | admin`。应用启动时先查询 session；在 `loading` 阶段不渲染管理员操作，避免访客看到短暂闪现的写入口。

新增 `/login` 页面和 `RequireAdmin` 路由包装器：

- 访客访问 `/new`、`/edit`、`/categories` 或 `/tags` 时跳转到 `/login`，并携带站内 return target。
- 登录成功后只允许跳回经过校验的站内路径，避免开放重定向。
- 会话失效时 Store 切换为 guest，当前受保护页面回到登录流程。

顶部静态 `admin-badge` 改为身份入口：访客显示“登录”，管理员显示“Admin”并提供退出操作。访客侧边栏隐藏“管理”分组。

### 6. 页面写入口按能力统一收口

前端提供可复用的管理员判断/包装能力，而不是在页面中散落字符串判断。访客隐藏以下入口：

- Prompt 新建、编辑、删除、收藏/取消收藏和版本回滚。
- 解决方案、学习笔记的新建、编辑、删除和导入。
- UI 原型的新建、编辑、删除和 HTML 导入。
- 分类、标签管理。
- Markdown 批注的新增、编辑、重新关联和删除。

复制 Prompt、复制 Markdown、导出解决方案/学习笔记、查看版本历史、搜索和查看已有批注继续公开。`MarkdownAnnotationSurface` 增加只读模式，在只读模式下仍加载与展示批注，但不建立文本选择写入交互，也不显示修改按钮。

前端权限只负责交互体验；后端 Guard 始终是最终安全边界。

### 7. 部署时显式注入认证配置

`.env.example` 和本地、GHCR、离线三套 Compose 文件统一增加认证变量，并由 API 容器接收。密码哈希生成方式、JWT secret 生成方式、Secure Cookie 的本地/生产差异和密码轮换行为写入部署文档。

认证依赖限定在 API 包，预计使用 `@nestjs/jwt`、`cookie-parser`、`bcryptjs`、`@nestjs/throttler` 及必要类型包。前端不增加认证框架。

项目真实前端为 React + React Router + Zustand。实现与文档同步必须以真实代码和 `docs/architecture.md` 为准，并修正 `AGENTS.md`、`README.md` 中残留的 Vue 技术栈描述，避免后续认证维护使用错误的组件和 Store 约定。

## Risks / Trade-offs

- [无状态 JWT 无法逐个撤销被窃取的会话] → 使用 8 小时短有效期、`HttpOnly`/`Secure` Cookie、凭据版本校验，并支持轮换密码哈希或 JWT secret 立即失效会话。
- [漏掉某个前端按钮会让访客看到失败操作] → 使用共享认证 Store 和管理员包装组件盘点全部写入口；后端全局 Guard 保证即使遗漏也不能写入。
- [全局 Guard 可能阻止未来确实需要公开的 POST] → 仅通过显式公开装饰器放行，并在代码评审中要求说明公开写接口原因。
- [Cookie 配置错误导致本地无法登录或生产 Cookie 不安全] → 文档化本地/生产配置，API 启动时校验生产安全属性，分别验证跨端口开发和同源 Nginx 部署。
- [进程内登录限流无法跨多个 API 副本共享] → 当前 Compose 单实例满足需求；扩展到多副本时迁移到 Redis 等共享限流存储。
- [API 与 Web 非同步发布会短暂造成写操作不可用] → 将认证作为同一镜像版本发布并同时更新 API、Web 与运行环境变量。

## Migration Plan

1. 在目标环境生成管理员密码哈希和高强度 JWT secret，补齐认证环境变量，但不写入仓库。
2. 发布同一版本的 API 与 Web 镜像；因为没有数据库结构变化，不需要 Prisma 迁移。
3. 验证访客列表、详情、搜索、复制、导出和批注查看正常。
4. 验证访客直接调用每类写接口均返回 `401` 且数据不变。
5. 验证 Admin badge 登录、受保护路由返回、全部写操作、会话过期和退出流程。
6. 回滚时可恢复旧镜像和旧 Compose 配置，但旧版本会重新开放全部写接口；若因故回滚，应先通过网络访问控制限制站点，避免恢复匿名写入风险。

## Open Questions

无阻塞问题。默认采用固定用户名 `admin`、8 小时会话、15 分钟内最多 5 次登录尝试和生产 `Secure` Cookie；后续如需多管理员或即时逐会话撤销，再提出数据库用户与 Session 能力变更。
