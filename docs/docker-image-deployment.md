# Docker 镜像离线部署指南

本文档说明如何在本地构建 Prompt Skill Manager 的 Docker 镜像，再将镜像包传到云服务器部署。该方式不要求在服务器上 `git clone` 项目源码，也不要求服务器执行前端或后端构建。

## 适用场景

- 服务器配置较轻，例如 `2 核 CPU / 2 GB 内存 / 50 GB SSD`。
- 只有个人或小团队使用。
- 希望服务器只负责运行容器，不负责构建镜像。
- 不希望在服务器上保存完整项目源码。

## 部署架构

生产环境包含三个容器：

- `web`：Nginx 静态前端服务，对外提供页面访问，并将 `/api/` 反向代理到 API 容器。
- `api`：NestJS 后端服务，监听容器内 `3000` 端口。
- `db`：PostgreSQL 16，使用 Docker volume 持久化数据。

推荐公网只开放 `80` 和 `443`，不要直接暴露 API 和 PostgreSQL。

## 一、本地构建镜像

以下命令在本地开发机器执行，工作目录必须是项目根目录。

项目根目录的 `.npmrc` 会在 Docker 构建阶段复制到镜像构建环境中，因此 `pnpm install` 会使用其中配置的 npm registry。例如：

```ini
registry=https://registry.npmmirror.com
```

如果 `.npmrc` 只包含 registry 地址，可以随项目提交；如果 `.npmrc` 包含 npm Token 或私有仓库凭据，不要直接复制进镜像构建上下文，应改用 Docker BuildKit secret。

注意：`.npmrc` 只影响 `pnpm install` 下载 npm 包，不影响 Docker 拉取基础镜像。`FROM node:20-alpine` 和 `FROM nginx:1.27-alpine` 仍然由 Docker 自己访问镜像仓库。

```bash
pnpm docker:build:images
```

该命令会构建两个镜像：

- `prompt-skill-manager-api:0.1.0`
- `prompt-skill-manager-web:0.1.0`

如果需要指定版本号，例如 `0.1.1`：

```bash
IMAGE_TAG=0.1.1 pnpm docker:build:images
```

说明：

- `VITE_API_BASE_URL=/api` 表示前端统一请求同域名下的 `/api`。
- `package.json` 中的 `docker:build:web` 脚本已经内置 `--build-arg VITE_API_BASE_URL=/api`。
- Dockerfile 会复制 `pnpm-lock.yaml`，并使用 `pnpm install --frozen-lockfile --prod=false` 安装依赖，确保构建阶段包含 `vite`、`vue-tsc`、`typescript` 等开发依赖。
- 前端镜像内的 Nginx 已经配置 `/api/` 反向代理到 `api:3000`。
- API 镜像启动时会执行 Prisma 迁移和种子数据初始化，然后启动 NestJS 服务。
- API 镜像基于 Alpine 时需要安装 `openssl`，否则 Prisma 迁移可能因为无法加载 libssl/OpenSSL 而失败，表现为接口全部 `502`。

如果构建时报错 `failed to resolve source metadata for docker.io/library/nginx` 或 `docker.io/library/node`，说明 Docker Hub 访问超时。此时可以临时指定可访问的基础镜像地址：

```bash
NODE_IMAGE=你的镜像源/library/node:20-alpine \
NGINX_IMAGE=你的镜像源/library/nginx:1.27-alpine \
pnpm docker:build:web
```

只构建 API 镜像时：

```bash
NODE_IMAGE=你的镜像源/library/node:20-alpine pnpm docker:build:api
```

也可以在 Docker Desktop 或服务器 Docker daemon 中配置 registry mirror，从 Docker 层统一解决基础镜像拉取超时问题。

如果前端构建时报错 `Cannot find type definition file for 'vite/client'`，通常表示构建阶段没有正确安装前端开发依赖。当前 Dockerfile 已经显式复制 `pnpm-lock.yaml` 并安装 `devDependencies`；如果本地仍命中旧缓存，可以重新执行构建，必要时对该镜像构建使用 Docker 的 `--no-cache` 参数。

构建完成后检查镜像：

```bash
docker images | grep prompt-skill-manager
```

## 二、导出镜像包

将前端、后端和 PostgreSQL 运行期镜像导出为一个压缩包：

```bash
pnpm docker:save:images
```

该命令会导出以下镜像：

- `prompt-skill-manager-api:0.1.0`
- `prompt-skill-manager-web:0.1.0`
- `postgres:16-alpine`

该命令会生成：

```text
prompt-skill-manager-images-0.1.0.tar.gz
```

如果构建时指定了版本号，导出时也要使用同一个版本号：

```bash
IMAGE_TAG=0.1.1 pnpm docker:save:images
```

也可以一次性完成构建和导出：

```bash
pnpm docker:package
```

`docker:package` 会依次执行：

- 构建 API 镜像。
- 构建 Web 镜像。
- 拉取 `postgres:16-alpine`。
- 导出包含三个镜像的离线包。

如果本地也无法直接拉取 `postgres:16-alpine`，需要先通过可用的 Docker registry mirror 拉取 PostgreSQL 镜像，并确保本地存在 `postgres:16-alpine` 这个标签。

如果你的 PostgreSQL 镜像来源不是 Docker Hub，可以在本地打包时指定源镜像：

```bash
POSTGRES_SOURCE_IMAGE=你的镜像源/library/postgres:16-alpine pnpm docker:package
```

脚本会把该源镜像重新标记为 `postgres:16-alpine`，从而保持服务器 `docker-compose.yml` 不变。

确认文件存在：

```bash
ls -lh prompt-skill-manager-images-0.1.0.tar.gz
```

## 三、上传到云服务器

将镜像包上传到服务器：

```bash
scp prompt-skill-manager-images-0.1.0.tar.gz root@你的服务器IP:/tmp/
```

如果不使用 `root` 用户，将 `root` 替换为你的登录用户。

## 四、准备服务器目录

以下命令在云服务器执行。

```bash
mkdir -p /opt/prompt-skill-manager
cd /opt/prompt-skill-manager
```

确认服务器已安装 Docker 和 Docker Compose Plugin：

```bash
docker --version
docker compose version
```

如果服务器尚未安装，可以使用系统默认软件源安装：

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

如果服务器只能使用阿里云内网软件源，可以先配置 Docker CE apt 源，然后安装 Docker CE：

```bash
sudo apt-get -y install apt-transport-https ca-certificates curl software-properties-common
sudo curl -fsSL http://mirrors.cloud.aliyuncs.com/docker-ce/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository -y "deb [arch=$(dpkg --print-architecture)] http://mirrors.cloud.aliyuncs.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update
sudo apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

上述阿里云地址是 Docker 安装包的软件源，不是 Docker 镜像仓库。它可以用于安装 Docker，但不能替代 `docker.io` 拉取 `postgres:16-alpine` 这类容器镜像。

## 五、加载镜像

```bash
docker load -i /tmp/prompt-skill-manager-images-0.1.0.tar.gz
```

确认镜像已加载：

```bash
docker images | grep prompt-skill-manager
docker images | grep postgres
```

## 六、创建环境变量文件

在 `/opt/prompt-skill-manager/.env` 写入生产环境变量：

```env
POSTGRES_USER=prompt_admin
POSTGRES_PASSWORD=change_me_to_a_strong_password
POSTGRES_DB=prompt_skill_manager
```

注意：

- 不要继续使用示例密码 `postgres`。
- 不需要在生产服务器 `.env` 中配置 `DATABASE_URL`，Compose 会在 API 服务中生成容器内数据库连接地址。
- 不需要配置 `VITE_API_BASE_URL`，因为前端镜像已经在构建时固定为 `/api`。

## 七、创建生产 docker-compose.yml

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
    image: prompt-skill-manager-api:0.1.0
    container_name: prompt-skill-manager-api
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
      PORT: 3000
      CORS_ORIGIN: https://你的域名
    depends_on:
      db:
        condition: service_healthy

  web:
    image: prompt-skill-manager-web:0.1.0
    container_name: prompt-skill-manager-web
    restart: unless-stopped
    ports:
      - "127.0.0.1:5173:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

如果暂时没有域名，只通过宿主机 Nginx 使用服务器 IP 测试，可以把 `CORS_ORIGIN` 改成：

```yaml
CORS_ORIGIN: http://服务器IP
```

如果后续配置了 HTTPS 域名，需要改成：

```yaml
CORS_ORIGIN: https://你的域名
```

如果不使用宿主机 Nginx，而是直接通过 `http://服务器IP:10086` 访问，可以把生产 `docker-compose.yml` 改成：

```yaml
api:
  environment:
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
    PORT: 3000
    CORS_ORIGIN: http://服务器IP:10086

web:
  ports:
    - "10086:80"
```

此时不需要暴露 API 容器的 `3000` 端口，前端容器内的 Nginx 会继续把 `/api/` 转发到 `api:3000`。

## 八、启动服务

```bash
cd /opt/prompt-skill-manager
docker compose up -d --pull never
```

`--pull never` 表示启动时只使用本地已加载的镜像，不尝试从 `docker.io` 或其他远程仓库拉取镜像。

查看容器状态：

```bash
docker compose ps
```

查看 API 日志：

```bash
docker compose logs -f api
```

首次启动时，API 容器会执行数据库迁移和初始化数据。如果日志中出现 NestJS started 之类的启动信息，表示后端已正常运行。

如果页面可以打开，但所有接口都返回 `502`，优先查看 API 容器日志：

```bash
docker compose ps
docker compose logs -f api
```

如果日志中出现以下信息，说明 API 镜像缺少 OpenSSL/libssl，Prisma 迁移失败，API 容器没有正常启动：

```text
Please manually install OpenSSL and try installing Prisma again.
Prisma failed to detect the libssl/openssl version to use
Error: Could not parse schema engine response
```

修复方式是使用已经安装 `openssl` 的新版 API 镜像重新部署。

## 九、配置宿主机 Nginx 和 HTTPS

推荐使用宿主机 Nginx 作为公网入口，将域名请求转发到本机 `5173` 端口。

安装 Nginx：

```bash
sudo apt update
sudo apt install -y nginx
```

创建站点配置：

```bash
sudo nano /etc/nginx/sites-available/prompt-skill-manager
```

写入以下内容，将 `你的域名` 替换为真实域名：

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

如果暂时没有域名，只用服务器 IP 测试，可以把 `server_name` 写成：

```nginx
server_name _;
```

此时访问地址为：

```text
http://服务器IP
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/prompt-skill-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

申请 HTTPS 证书：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

只有已经完成域名解析时才执行 HTTPS 证书申请；纯 IP 访问不能使用上述域名证书命令。

完成后访问：

```text
https://你的域名
```

Swagger 文档地址：

```text
https://你的域名/api/docs
```

## 十、配置防火墙

只开放 SSH、HTTP 和 HTTPS：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

不要对公网开放以下端口：

- `3000`：API 容器端口。
- `5432`：PostgreSQL 数据库端口。
- `5173`：前端容器宿主机端口，当前 Compose 已绑定到 `127.0.0.1`，只允许服务器本机访问。

## 十一、更新版本

本地重新构建新版本镜像：

```bash
IMAGE_TAG=0.1.1 pnpm docker:package
```

上传镜像包：

```bash
scp prompt-skill-manager-images-0.1.1.tar.gz root@你的服务器IP:/tmp/
```

服务器加载镜像：

```bash
docker load -i /tmp/prompt-skill-manager-images-0.1.1.tar.gz
```

修改 `/opt/prompt-skill-manager/docker-compose.yml` 中的镜像版本：

```yaml
api:
  image: prompt-skill-manager-api:0.1.1

web:
  image: prompt-skill-manager-web:0.1.1
```

重启服务：

```bash
cd /opt/prompt-skill-manager
docker compose up -d --pull never
```

## 十二、数据库备份与恢复

备份：

```bash
cd /opt/prompt-skill-manager
docker compose exec db pg_dump -U prompt_admin prompt_skill_manager > backup.sql
```

恢复：

```bash
cd /opt/prompt-skill-manager
docker compose exec -T db psql -U prompt_admin prompt_skill_manager < backup.sql
```

如果 `.env` 中修改了 `POSTGRES_USER` 或 `POSTGRES_DB`，备份和恢复命令中的用户名、数据库名也要同步替换。

## 十三、常用排查命令

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

查看数据库健康状态：

```bash
docker compose logs -f db
```

进入 API 容器：

```bash
docker compose exec api sh
```

进入数据库容器：

```bash
docker compose exec db psql -U prompt_admin prompt_skill_manager
```

## 十四、部署检查清单

- 本地已经成功构建 `prompt-skill-manager-api` 和 `prompt-skill-manager-web` 镜像。
- 镜像包已经上传到服务器并通过 `docker load` 导入。
- 服务器 `.env` 已经使用高强度 `POSTGRES_PASSWORD`。
- 生产 `docker-compose.yml` 使用 `image`，不使用 `build`。
- `web` 只绑定 `127.0.0.1:5173:80`。
- `api` 没有暴露公网端口。
- `db` 没有暴露公网端口。
- 宿主机 Nginx 已经反向代理到 `127.0.0.1:5173`。
- 防火墙只开放 `22`、`80`、`443`。
- 可以访问 `https://你的域名`。
- 可以访问 `https://你的域名/api/docs`。
- 已经建立数据库备份方案。
