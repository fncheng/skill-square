# Docker GHCR 在线部署指南

本文档说明如何通过 GitHub Actions 构建 Prompt Skill Manager 的 Docker 镜像，将镜像发布到 GitHub Container Registry（GHCR），再由服务器直接拉取指定版本完成首次部署、升级和回退。

如果服务器无法访问 `ghcr.io` 或 Docker Hub，请改用 [Docker 镜像离线部署指南](./docker-image-deployment.md)。

## 适用场景

- 服务器可以稳定访问 `ghcr.io` 和 Docker Hub。
- 希望 GitHub Actions 负责构建镜像，服务器只负责拉取和运行。
- 不希望在服务器上安装 Node.js、pnpm 或执行前后端构建。
- 希望通过固定镜像版本控制升级时机，并保留快速回退能力。

## 部署架构

生产环境包含三个容器：

- `web`：从 GHCR 拉取，运行 Nginx 静态前端，并将 `/api/` 反向代理到 `api:3000`。
- `api`：从 GHCR 拉取，启动时执行 Prisma migration 和 seed，然后运行 NestJS 服务。
- `db`：从 Docker Hub 拉取 `postgres:16-alpine`，通过 Docker volume 持久化数据。

当前 GitHub Actions 工作流发布以下镜像：

```text
ghcr.io/fncheng/prompt-skill-manager-api
ghcr.io/fncheng/prompt-skill-manager-web
```

推荐公网只开放 `80`、`443` 和必要的 SSH 端口，不要直接暴露 API 和 PostgreSQL。

## 一、确认 GitHub Actions 工作流

工作流文件位于：

```text
.github/workflows/docker-image.yml
```

当前触发规则如下：

- 任意分支 `push`：构建 API 和 Web 镜像，用于验证 Dockerfile。
- Pull Request：构建 API 和 Web 镜像，但不推送到 GHCR。
- 默认分支 `push`：构建并推送分支标签、Commit SHA 标签和 `latest`。
- 推送 `v*` Git 标签：构建并推送语义化版本标签。
- 手动运行：只有选择默认分支或版本标签时才会推送镜像。

工作流通过仓库自动生成的 `GITHUB_TOKEN` 登录 GHCR，不需要为 GitHub Actions 额外配置 Personal access token。Job 已声明：

```yaml
permissions:
  contents: read
  packages: write
```

当前镜像只构建：

```text
linux/amd64
```

服务器执行 `uname -m` 应显示 `x86_64`。如果服务器是 ARM64，需要先将工作流改为多架构构建。

## 二、发布第一个固定版本

以下命令在本地项目根目录执行。

### 1. 提交并推送准备发布的代码

先确认工作区状态：

```bash
git status
```

将准备发布的改动提交并推送到默认分支。当前仓库默认分支是 `refactor/shadcn-react`：

```bash
git add <需要发布的文件>
git commit -m "<本次提交信息>"
git push origin refactor/shadcn-react
```

进入 GitHub 仓库的 `Actions` 页面，确认 `Build API image` 和 `Build Web image` 均执行成功。

### 2. 创建版本标签

首次正式版本以 `0.1.0` 为例：

```bash
git tag -a v0.1.0 -m "release: v0.1.0"
git push origin v0.1.0
```

`v0.1.0` 会生成以下固定版本镜像：

```text
ghcr.io/fncheng/prompt-skill-manager-api:0.1.0
ghcr.io/fncheng/prompt-skill-manager-web:0.1.0
```

不要在默认分支构建尚未成功时创建版本标签，也不要将版本标签指向未经验证的临时分支提交。

### 3. 确认镜像已经发布

进入 GitHub：

```text
个人主页
→ Packages
→ prompt-skill-manager-api / prompt-skill-manager-web
```

确认两个 Package 中都存在 `0.1.0` 标签。

## 三、配置 GHCR 访问权限

GHCR 首次发布的 Package 默认是 Private。可以保留私有，也可以根据实际需要修改为 Public。

### 方式一：保留私有镜像

服务器需要使用 Personal access token (classic) 登录。只拉取镜像时，仅授予：

```text
read:packages
```

创建路径：

```text
GitHub
→ Settings
→ Developer settings
→ Personal access tokens
→ Tokens (classic)
→ Generate new token (classic)
```

如果账号属于启用了 SSO 的 Organization，还需要为 Token 授权 SSO。不要使用 Fine-grained personal access token 进行 GHCR Docker CLI 登录。

### 方式二：设置为公开镜像

在 Package 设置中将 Visibility 改为 Public。公开镜像可以匿名拉取，服务器不需要保存 GitHub Token。

公开 Package 会暴露镜像内容和版本信息，但不会自动公开私有源代码仓库。

## 四、准备服务器

以下命令在服务器执行。

### 1. 创建部署目录

```bash
sudo mkdir -p /opt/prompt-skill-manager
sudo chown "$USER":"$USER" /opt/prompt-skill-manager
cd /opt/prompt-skill-manager
```

### 2. 确认 Docker 环境

```bash
docker --version
docker compose version
uname -m
```

如果 Docker 尚未安装，可以使用 Ubuntu/Debian 系统软件源安装：

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

### 3. 登录私有 GHCR

如果镜像是 Private，在服务器执行：

```bash
read -rsp "GitHub PAT: " CR_PAT
echo
printf '%s' "$CR_PAT" | docker login ghcr.io -u fncheng --password-stdin
unset CR_PAT
```

看到以下输出表示登录成功：

```text
Login Succeeded
```

如果服务器上的 Docker 命令必须使用 `sudo`，登录和后续 Compose 命令需要保持相同的用户上下文，避免 Docker 找不到对应用户的 registry 凭据。

## 五、创建生产环境 Compose

在 `/opt/prompt-skill-manager/docker-compose.yml` 写入：

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: prompt-skill-manager-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: "ghcr.io/fncheng/prompt-skill-manager-api:${IMAGE_TAG}"
    container_name: prompt-skill-manager-api
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
      PORT: 3000
      CORS_ORIGIN: ${CORS_ORIGIN}
    depends_on:
      db:
        condition: service_healthy

  web:
    image: "ghcr.io/fncheng/prompt-skill-manager-web:${IMAGE_TAG}"
    container_name: prompt-skill-manager-web
    restart: unless-stopped
    ports:
      - "127.0.0.1:${WEB_PORT:-5173}:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

生产 Compose 有以下约束：

- `api` 和 `web` 只使用 `image`，不包含 `build`，服务器不会从源码构建。
- `db` 不映射宿主机端口，避免 PostgreSQL 暴露到公网。
- `api` 不映射宿主机端口，由 `web` 容器通过 Docker 网络访问。
- `web` 只绑定 `127.0.0.1`，由宿主机 Nginx 或其他反向代理对外提供服务。
- API 和 Web 共用同一个 `IMAGE_TAG`，保证前后端版本一致。

## 六、创建生产环境变量

先在已经安装项目依赖的开发机上交互式生成管理员密码哈希，避免把明文密码写进命令历史：

```bash
read -s ADMIN_PASSWORD_INPUT
echo
ADMIN_PASSWORD_INPUT="$ADMIN_PASSWORD_INPUT" pnpm --filter @prompt-skill-manager/api exec node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync(process.env.ADMIN_PASSWORD_INPUT, 12))"
unset ADMIN_PASSWORD_INPUT
```

先限制文件权限：

```bash
cd /opt/prompt-skill-manager
umask 077
touch .env
chmod 600 .env
```

在 `.env` 中写入：

```env
POSTGRES_USER=prompt_admin
POSTGRES_PASSWORD=替换成高强度随机密码
POSTGRES_DB=prompt_skill_manager

IMAGE_TAG=0.1.0
CORS_ORIGIN=https://你的域名
WEB_PORT=5173
ADMIN_PASSWORD_HASH=替换成管理员密码的bcrypt哈希
AUTH_JWT_SECRET=替换成至少32字符的高强度随机值
AUTH_SESSION_TTL_SECONDS=28800
AUTH_COOKIE_SECURE=true
```

如果暂时没有域名，可以使用：

```env
CORS_ORIGIN=http://服务器IP
AUTH_COOKIE_SECURE=false
```

`ADMIN_PASSWORD_HASH` 必须是 bcrypt 哈希，不能填写明文密码。`AUTH_JWT_SECRET` 可以使用 `openssl rand -base64 48` 生成；轮换密码哈希或 JWT secret 会让已有管理员会话失效。正式 HTTPS 域名必须配置 `AUTH_COOKIE_SECURE=true`。

不要将服务器 `.env`、GitHub Token、数据库密码或认证密钥提交到 Git 仓库。

## 七、首次拉取并启动

先检查 Compose 展开的镜像名称：

```bash
cd /opt/prompt-skill-manager
docker compose config --images
```

预期包含：

```text
ghcr.io/fncheng/prompt-skill-manager-api:0.1.0
ghcr.io/fncheng/prompt-skill-manager-web:0.1.0
postgres:16-alpine
```

拉取镜像并启动：

```bash
docker compose pull
docker compose up -d --no-build
```

`--no-build` 用于明确禁止服务器执行本地构建。

检查容器状态：

```bash
docker compose ps
docker compose logs --tail=100 api
docker compose logs --tail=100 web
```

API 首次启动会执行 Prisma migration 和 seed。只有 API 日志确认迁移、初始化和 NestJS 启动成功后，才继续配置公网入口。

## 八、配置宿主机 Nginx

以下示例将公网域名转发到只监听本机的 Web 容器：

```nginx
server {
    listen 80;
    server_name 你的域名;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

应用配置：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

正式环境建议继续配置 HTTPS，并将 `.env` 中的 `CORS_ORIGIN` 改为最终的 `https://` 地址。

防火墙建议只开放：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 九、发布和升级新版本

以下以从 `0.1.0` 升级到 `0.1.1` 为例。

### 1. 发布镜像

在本地将代码提交并推送到默认分支，等待默认分支 GitHub Actions 成功，然后创建版本标签：

```bash
git tag -a v0.1.1 -m "release: v0.1.1"
git push origin v0.1.1
```

等待标签工作流成功，并确认 GHCR 中存在：

```text
ghcr.io/fncheng/prompt-skill-manager-api:0.1.1
ghcr.io/fncheng/prompt-skill-manager-web:0.1.1
```

### 2. 升级前备份数据库

在服务器执行：

```bash
cd /opt/prompt-skill-manager
docker compose exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > "backup-before-0.1.1-$(date +%Y%m%d-%H%M%S).sql"
```

确认备份文件不是空文件：

```bash
ls -lh backup-before-0.1.1-*.sql
```

### 3. 更新固定版本

将服务器 `.env` 中的：

```env
IMAGE_TAG=0.1.0
```

修改为：

```env
IMAGE_TAG=0.1.1
```

然后执行：

```bash
docker compose config --images
docker compose pull api web
docker compose up -d --no-build
```

检查新版本：

```bash
docker compose ps
docker compose logs --tail=100 api web
```

固定版本不是永久不变，而是在两次主动升级之间保持不变。每次发布新版本时，都需要显式修改 `IMAGE_TAG`。

## 十、版本回退

如果 `0.1.1` 出现问题，并且旧版程序仍兼容迁移后的数据库，将 `.env` 改回：

```env
IMAGE_TAG=0.1.0
```

重新拉取并启动：

```bash
docker compose pull api web
docker compose up -d --no-build
docker compose logs --tail=100 api web
```

镜像回退不会自动回退 Prisma migration。如果新版本修改了数据库结构，并且旧版程序与迁移后的数据库不兼容，需要结合升级前备份制定数据库恢复方案。

## 十一、常用运维命令

查看当前目标镜像：

```bash
docker compose config --images
```

查看容器状态：

```bash
docker compose ps
```

查看全部日志：

```bash
docker compose logs -f
```

查看 API 日志：

```bash
docker compose logs -f api
```

重新拉取当前固定版本：

```bash
docker compose pull api web
```

停止服务但保留数据库 volume：

```bash
docker compose down
```

不要执行 `docker compose down -v`，该命令会删除 PostgreSQL 数据 volume。

退出 GHCR：

```bash
docker logout ghcr.io
```

## 十二、常见问题

### `unauthorized` 或 `denied`

检查：

- 是否使用 Personal access token (classic)，而不是 Fine-grained personal access token。
- Token 是否包含 `read:packages`。
- GitHub 用户是否拥有 Package 的读取权限。
- Organization 是否要求为 Token 授权 SSO。
- `docker login` 和 `docker compose` 是否由同一个系统用户执行。

### `manifest unknown`

指定的 `IMAGE_TAG` 在 GHCR 中不存在。检查 Git 标签是否已经推送、标签工作流是否成功，以及 API/Web 两个 Package 是否都包含该版本。

### `no matching manifest`

当前工作流只发布 `linux/amd64`。如果服务器是 `aarch64` 或 `arm64`，需要先发布 ARM64 或多架构镜像。

### API 持续重启或页面返回 `502`

执行：

```bash
docker compose logs --tail=200 api
docker compose logs --tail=100 db
```

重点检查 PostgreSQL 健康状态、Prisma migration、OpenSSL/libssl 和 seed 是否执行成功。

### 浏览器出现 CORS 错误

确认 `.env` 中的 `CORS_ORIGIN` 与浏览器地址完全一致，包括协议、域名和非默认端口。例如：

```env
CORS_ORIGIN=https://skill.example.com
```

修改后重建 API 容器：

```bash
docker compose up -d --no-build --force-recreate api
```

## 十三、部署检查清单

- GitHub Actions 的 API/Web 镜像构建均已成功。
- GHCR 的 API/Web Package 中存在相同的固定版本标签。
- 服务器架构与 `linux/amd64` 镜像匹配。
- 私有镜像已使用 PAT classic 和 `read:packages` 登录。
- 服务器 `.env` 使用高强度数据库密码和固定 `IMAGE_TAG`。
- 生产 Compose 不包含 `build`。
- PostgreSQL 和 API 未暴露公网端口。
- Web 只绑定 `127.0.0.1`，公网通过宿主机 Nginx 访问。
- `CORS_ORIGIN` 与实际访问地址完全一致。
- API 日志确认 Prisma migration、seed 和 NestJS 启动成功。
- 升级前已经建立数据库备份方案。

## 参考资料

- [GitHub：发布 Docker 镜像](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
- [GitHub：使用 Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker：docker compose pull](https://docs.docker.com/reference/cli/docker/compose/pull/)
- [Docker：docker compose up](https://docs.docker.com/reference/cli/docker/compose/up/)
