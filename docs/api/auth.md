# 管理员认证接口

系统只提供一个固定管理员账号 `admin`，不提供注册、用户管理或角色分配。管理员密码以 bcrypt 哈希形式从运行环境读取，登录成功后由服务端设置 `HttpOnly` Cookie；前端和调用方不需要保存 Token。

## 登录

```http
POST /api/auth/login
Content-Type: application/json
```

请求体：

```json
{
  "username": "admin",
  "password": "管理员密码"
}
```

成功响应：

```json
{
  "authenticated": true,
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

登录成功响应同时设置 `prompt_skill_manager_session` Cookie。15 分钟内同一客户端最多尝试登录 5 次，超过限制返回 `429 Too Many Requests`。用户名或密码错误统一返回 `401 Unauthorized` 和“用户名或密码错误”。

## 查询当前会话

```http
GET /api/auth/session
```

有效管理员会话返回：

```json
{
  "authenticated": true,
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

访客、过期会话或无效会话均返回 `200 OK`：

```json
{
  "authenticated": false,
  "user": null
}
```

## 退出登录

```http
POST /api/auth/logout
```

退出接口为公开且幂等的 Cookie 清理操作：

```json
{
  "success": true
}
```

## 访客只读规则

- `GET`、`HEAD`、`OPTIONS` 默认公开。
- 业务接口的 `POST`、`PUT`、`PATCH`、`DELETE` 默认要求有效管理员 Cookie。
- 访客调用业务写接口返回 `401 Unauthorized`，请求不会进入业务 Service。
- 登录和退出是仅有的公开非安全方法。
- 浏览器跨域开发调用必须携带 credentials；生产环境推荐通过 Web Nginx 的同源 `/api` 代理访问。
