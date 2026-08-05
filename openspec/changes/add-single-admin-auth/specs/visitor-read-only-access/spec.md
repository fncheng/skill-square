## ADDED Requirements

### Requirement: 访客可以读取公开内容
系统 SHALL 允许未登录访客访问安全的读取操作，包括列表、详情、搜索、版本历史、内容导出和已有 Markdown 批注。

#### Scenario: 访客查看内容
- **WHEN** 未登录访客请求 Prompt、解决方案、学习笔记或 UI 原型的列表或详情
- **THEN** 系统返回公开内容且不要求登录

#### Scenario: 访客使用只读辅助能力
- **WHEN** 未登录访客搜索内容、查看 Prompt 版本历史、导出文档、复制内容或查看已有批注
- **THEN** 系统允许该只读操作

### Requirement: 非安全 API 方法默认要求管理员
系统 MUST 对所有非安全 HTTP 方法默认执行管理员会话校验，仅允许明确标记的公开认证操作绕过校验。

#### Scenario: 访客直接调用写接口
- **WHEN** 未登录访客向业务 API 发起 `POST`、`PUT`、`PATCH` 或 `DELETE` 请求
- **THEN** 系统返回 `401 Unauthorized`，不进入业务 Service 且不修改数据

#### Scenario: 管理员调用写接口
- **WHEN** 携带有效管理员会话的客户端调用业务写接口
- **THEN** 系统允许请求继续进入原有 DTO 校验与业务逻辑

#### Scenario: 公开认证写操作
- **WHEN** 访客调用被明确标记为公开的登录或退出接口
- **THEN** 系统不因全局写保护而拒绝该请求

#### Scenario: 未来新增写接口
- **WHEN** 新增业务接口使用非安全 HTTP 方法且没有显式公开标记
- **THEN** 系统自动要求有效管理员会话

### Requirement: 全部现有数据写入均进入授权范围
系统 SHALL 将所有现有创建、更新、删除、导入、收藏、回滚和批注写入操作限定为管理员操作。

#### Scenario: Prompt 写操作
- **WHEN** 访客尝试创建、编辑、删除、收藏、取消收藏或回滚 Prompt
- **THEN** 系统拒绝操作且 Prompt、版本快照、分类和标签关联保持不变

#### Scenario: Markdown 文档与批注写操作
- **WHEN** 访客尝试导入、新建、编辑或删除解决方案或学习笔记，或者新增、编辑、重新关联或删除批注
- **THEN** 系统拒绝操作且正文和批注数据保持不变

#### Scenario: 其他资源写操作
- **WHEN** 访客尝试创建、编辑或删除 UI 原型、分类或标签
- **THEN** 系统拒绝操作且对应数据保持不变

### Requirement: 前端使用三态认证状态
前端 SHALL 在应用启动时将认证状态区分为 `loading`、`guest` 和 `admin`，并 SHALL 在会话确认前隐藏管理员操作。

#### Scenario: 应用正在恢复会话
- **WHEN** 前端尚未完成当前会话查询
- **THEN** 页面不显示新增、编辑、删除或其他管理员操作

#### Scenario: 会话恢复为管理员
- **WHEN** 会话查询返回有效管理员身份
- **THEN** 前端进入 admin 状态并显示管理员能力

#### Scenario: 会话恢复为访客
- **WHEN** 会话查询返回未认证状态
- **THEN** 前端进入 guest 状态并保持只读界面

#### Scenario: 管理员会话失效
- **WHEN** 已登录页面收到会话失效的认证响应
- **THEN** 前端清除管理员状态、恢复只读界面并阻止继续访问受保护路由

### Requirement: 顶部身份入口反映真实会话
系统 SHALL 使用现有 Admin badge 位置提供登录状态入口。

#### Scenario: 访客查看顶部入口
- **WHEN** 当前会话为访客
- **THEN** 顶部入口显示“登录”并可进入登录页面

#### Scenario: 管理员查看顶部入口
- **WHEN** 当前会话为管理员
- **THEN** 顶部入口显示“Admin”并提供退出登录操作

### Requirement: 管理路由要求管理员身份
前端 SHALL 保护新增、编辑、分类管理和标签管理路由，并在登录后安全返回原目标页面。

#### Scenario: 访客直接打开管理路由
- **WHEN** 访客访问任一 `/new`、`/edit`、`/categories` 或 `/tags` 路由
- **THEN** 前端跳转到登录页面并记录经过校验的站内返回目标

#### Scenario: 登录后返回目标页面
- **WHEN** 访客从受保护路由完成登录且返回目标属于当前站点
- **THEN** 前端导航回原目标页面

#### Scenario: 返回目标不安全
- **WHEN** 登录请求携带外部地址或不合法的返回目标
- **THEN** 前端忽略该目标并进入默认内容列表

### Requirement: 访客界面不提供写操作入口
前端 SHALL 在所有资源页面收起访客无权执行的管理入口，同时保留只读消费能力。

#### Scenario: 访客查看列表或详情
- **WHEN** 访客打开 Prompt、解决方案、学习笔记或 UI 原型页面
- **THEN** 页面不显示新增、导入、编辑、删除、收藏或回滚操作，但继续显示复制和导出等只读操作

#### Scenario: 访客查看侧边栏
- **WHEN** 当前会话为访客
- **THEN** 侧边栏不显示分类管理和标签管理入口

#### Scenario: 管理员查看管理入口
- **WHEN** 当前会话为管理员
- **THEN** 页面显示与现有业务规则一致的管理操作

### Requirement: Markdown 批注支持访客只读模式
Markdown 批注界面 SHALL 允许访客查看已有批注，但 SHALL NOT 向访客提供创建、修改、重新关联或删除批注的交互。

#### Scenario: 访客查看已有批注
- **WHEN** 访客打开带有批注的学习笔记或解决方案
- **THEN** 页面加载并允许查看批注内容

#### Scenario: 访客选择 Markdown 文本
- **WHEN** 访客在 Markdown 内容中选择文本
- **THEN** 页面不启动新增批注流程

#### Scenario: 管理员管理批注
- **WHEN** 管理员打开 Markdown 批注界面
- **THEN** 页面保留新增、编辑、重新关联和删除批注能力

### Requirement: 管理员删除继续使用输入确认
授权变更 SHALL NOT 绕过或替换现有 typed delete confirmation。

#### Scenario: 管理员执行可见删除操作
- **WHEN** 已登录管理员触发任一现有用户可见删除操作
- **THEN** 系统继续按 typed delete confirmation 规格要求输入匹配文本后才执行删除
