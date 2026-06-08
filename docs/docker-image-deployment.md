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
- 前端镜像内的 Nginx 已经配置 `/api/` 反向代理到 `api:3000`。
- API 镜像启动时会执行 Prisma 迁移和种子数据初始化，然后启动 NestJS 服务。

构建完成后检查镜像：

```bash
docker images | grep prompt-skill-manager
```

## 二、导出镜像包

将前端和后端镜像导出为一个压缩包：

```bash
pnpm docker:save:images
```

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

如果服务器尚未安装，可以先安装：

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

## 五、加载镜像

```bash
docker load -i /tmp/prompt-skill-manager-images-0.1.0.tar.gz
```

确认镜像已加载：

```bash
docker images | grep prompt-skill-manager
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

## 八、启动服务

```bash
cd /opt/prompt-skill-manager
docker compose up -d
```

查看容器状态：

```bash
docker compose ps
```

查看 API 日志：

```bash
docker compose logs -f api
```

首次启动时，API 容器会执行数据库迁移和初始化数据。如果日志中出现 NestJS started 之类的启动信息，表示后端已正常运行。

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
docker compose up -d
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
