## 1. 认证依赖与运行配置

- [x] 1.1 在 API 包中声明 JWT、Cookie 解析、bcrypt 密码校验和登录限流依赖及必要类型，保持前端无新增认证框架
- [x] 1.2 定义并校验 `ADMIN_PASSWORD_HASH`、`AUTH_JWT_SECRET`、`AUTH_SESSION_TTL_SECONDS`、`AUTH_COOKIE_SECURE` 等认证配置，确保缺少必要配置时安全失败
- [x] 1.3 在 NestJS 启动流程中接入 Cookie 解析、明确来源的 credentialed CORS 和 Swagger Cookie 认证描述

## 2. 单管理员认证后端

- [x] 2.1 新增 AuthModule、登录 DTO、认证响应 DTO、Controller 和 Service，固定只认证用户名 `admin`
- [x] 2.2 实现 bcrypt 密码校验、凭据版本指纹、8 小时默认 JWT 签发与 `HttpOnly`/`SameSite=Strict`/`Path=/api` Cookie 设置
- [x] 2.3 实现 `GET /api/auth/session` 的管理员/访客稳定响应和无效 Cookie 清理
- [x] 2.4 实现幂等 `POST /api/auth/logout`，统一清理本地与生产属性一致的会话 Cookie
- [x] 2.5 为登录接口增加按客户端来源的请求限流和不泄露账号存在性的统一错误响应
- [x] 2.6 为认证接口补齐 Swagger DTO、Cookie auth、成功响应、`401` 与 `429` 描述

## 3. 全局访客只读边界

- [x] 3.1 实现公开写操作装饰器与全局 `AdminWriteGuard`，默认公开 `GET`/`HEAD`/`OPTIONS` 并保护其他 HTTP 方法
- [x] 3.2 将登录和退出标记为明确公开操作，并把 Guard 注册到 AppModule 的全局 provider
- [x] 3.3 验证 Prompt 创建/编辑/删除/收藏/回滚、文档导入与 CRUD、批注 CRUD、UI 原型 CRUD、分类和标签 CRUD 均在未进入 Service 前拒绝访客
- [x] 3.4 保持列表、详情、搜索、Prompt 版本历史、文档导出和批注查询无需登录

## 4. 前端认证基础能力

- [x] 4.1 新增认证类型与 API 封装，并为 Axios 启用 `withCredentials` 和统一的 `401` 会话失效处理
- [x] 4.2 新增 Zustand auth store，支持 `loading`、`guest`、`admin` 三态及 hydrate、login、logout 操作
- [x] 4.3 在应用入口完成会话恢复，并确保认证状态未确定时不闪现任何管理员操作
- [x] 4.4 新增 `/login` 页面，提供用户名/密码校验、内联错误、提交状态和仅允许站内路径的登录后返回逻辑
- [x] 4.5 新增 `RequireAdmin` 路由包装器，保护所有 `/new`、`/edit`、`/categories` 与 `/tags` 路由
- [x] 4.6 将顶部静态 Admin badge 改为访客登录入口和管理员身份/退出入口，并对访客隐藏侧边栏“管理”分组

## 5. 现有页面访客只读适配

- [x] 5.1 调整 Prompt 列表与详情页，仅向管理员显示新建、编辑、删除、收藏/取消收藏和版本回滚入口，同时保留查看与复制
- [x] 5.2 调整解决方案和学习笔记列表/详情页，仅向管理员显示导入、新建、编辑和删除入口，同时保留复制、导出和批注查看
- [x] 5.3 为 `MarkdownAnnotationSurface` 增加只读模式，访客仍能加载/浏览批注但不能选择原文新增、编辑、重新关联或删除批注
- [x] 5.4 调整 UI 原型列表与详情页，仅向管理员显示新建、编辑和删除入口，继续允许访客查看沙箱预览
- [x] 5.5 检查分类与标签页面只通过受保护路由进入，并确保 Admin 原有创建、编辑和 typed delete confirmation 行为不变
- [x] 5.6 全仓盘点前端写 API 调用与操作入口，确认没有遗漏的访客可见收藏、回滚、导入、批注或删除入口

## 6. 环境与部署同步

- [x] 6.1 更新 `.env.example`，提供无真实密钥的认证变量模板、密码哈希生成说明和本地安全 Cookie 配置
- [x] 6.2 更新 `docker-compose.yml`、`docker-compose.ghcr.yml`、`docker-compose.offline.yml`，向 API 容器统一传递认证变量
- [x] 6.3 更新 GHCR 与离线镜像部署文档，说明管理员密码哈希、JWT secret、HTTPS Secure Cookie、轮换和回滚注意事项
- [x] 6.4 更新 `docs/api` 认证文档、通用 `401`/`429` 响应与现有写接口认证要求
- [x] 6.5 更新 `docs/architecture.md` 的认证边界，并修正 `AGENTS.md`、`README.md` 中与真实 React + React Router + Zustand 实现冲突的 Vue 技术栈描述

## 7. 验证与收尾

- [ ] 7.1 运行前后端非构建类型检查，修复认证 DTO、Express Cookie 类型、React 路由和 Zustand 状态类型问题
- [x] 7.2 静态检查所有后端非安全业务方法均由全局 Guard 覆盖，且仅登录/退出具有公开写操作标记
- [ ] 7.3 按访客矩阵验证公开读取成功、各类直接写 API 返回 `401` 且数据不变
- [ ] 7.4 按管理员矩阵验证登录、Cookie 属性、受保护路由返回、全部写操作、typed delete confirmation、退出、过期和密码轮换失效
- [ ] 7.5 验证本地跨端口 credentialed CORS 与生产同源 Nginx `/api` 代理均能维持会话
- [x] 7.6 运行 `openspec validate --strict` 并确认 proposal、design、两个 capability specs 与 tasks 保持一致
