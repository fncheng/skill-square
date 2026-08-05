## ADDED Requirements

### Requirement: 系统仅认证固定管理员
系统 SHALL 只允许固定用户名 `admin` 使用配置的密码哈希完成认证，且 SHALL NOT 提供注册、用户创建或角色分配接口。

#### Scenario: 管理员凭据正确
- **WHEN** 客户端向登录接口提交用户名 `admin` 和正确密码
- **THEN** 系统返回认证成功的管理员摘要并创建管理员会话

#### Scenario: 登录凭据错误
- **WHEN** 客户端提交不存在的用户名或错误密码
- **THEN** 系统返回不区分用户名与密码错误的 `401 Unauthorized`，且不创建会话

#### Scenario: 认证配置缺失
- **WHEN** 服务启动时缺少管理员密码哈希或会话签名密钥
- **THEN** 系统拒绝以匿名可写或默认密码模式启动

### Requirement: 管理员会话使用安全 Cookie
系统 MUST 将签名且有过期时间的管理员会话存放在 `HttpOnly` Cookie 中，前端脚本 MUST NOT 获得或持久化认证 Token。

#### Scenario: 登录成功写入 Cookie
- **WHEN** 管理员登录成功
- **THEN** 系统设置具有 `HttpOnly`、`SameSite=Strict` 和 `Path=/api` 属性的会话 Cookie

#### Scenario: 生产环境写入 Cookie
- **WHEN** 系统运行在生产安全 Cookie 模式
- **THEN** 会话 Cookie 同时包含 `Secure` 属性

#### Scenario: 会话到期
- **WHEN** 客户端携带已过期的会话 Cookie
- **THEN** 系统将该客户端视为访客且不接受该 Cookie 执行管理员操作

#### Scenario: 管理员密码轮换
- **WHEN** 部署配置中的管理员密码哈希发生变化
- **THEN** 使用旧凭据版本签发的会话不再被接受

### Requirement: 客户端可以查询当前会话
系统 SHALL 提供公开的会话查询接口，以稳定区分访客状态和有效管理员状态。

#### Scenario: 查询有效管理员会话
- **WHEN** 客户端携带有效管理员 Cookie 查询当前会话
- **THEN** 系统返回 `200 OK`、已认证状态以及用户名 `admin` 和角色 `admin`

#### Scenario: 访客查询当前会话
- **WHEN** 客户端未携带有效管理员 Cookie 查询当前会话
- **THEN** 系统返回 `200 OK` 和未认证访客状态

#### Scenario: 查询无效会话
- **WHEN** 客户端携带无法校验的会话 Cookie 查询当前会话
- **THEN** 系统返回未认证访客状态并清理该无效 Cookie

### Requirement: 管理员可以退出登录
系统 SHALL 提供幂等的退出接口，清理当前客户端的管理员会话 Cookie。

#### Scenario: 管理员退出
- **WHEN** 已登录管理员调用退出接口
- **THEN** 系统清理会话 Cookie，后续请求按访客处理

#### Scenario: 访客调用退出
- **WHEN** 没有有效会话的客户端调用退出接口
- **THEN** 系统仍清理同名 Cookie 并返回成功

### Requirement: 登录尝试受到频率限制
系统 MUST 按客户端来源限制连续登录尝试，并 SHALL 对认证失败使用统一错误信息。

#### Scenario: 达到尝试次数上限
- **WHEN** 同一客户端在 15 分钟窗口内达到 5 次登录尝试
- **THEN** 系统暂时拒绝该客户端的后续登录尝试并返回限流响应

#### Scenario: 未达到尝试次数上限
- **WHEN** 客户端仍处于允许的登录尝试次数内
- **THEN** 系统继续校验登录凭据

### Requirement: 认证接口具有明确契约
系统 SHALL 提供登录、会话查询和退出接口的 DTO、Swagger 描述与认证错误响应文档。

#### Scenario: 查看认证接口文档
- **WHEN** 开发者打开 Swagger 或认证 API 文档
- **THEN** 文档说明请求字段、访客/管理员响应、Cookie 认证方式、`401` 和限流响应
