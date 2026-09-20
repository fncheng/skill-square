# GitHub Actions：仅通过 Tag 构建并发布 GHCR 镜像

本文档说明本项目如何限制 GitHub Actions 仅在推送版本 Tag 时构建 Docker 镜像并发布到 GitHub Container Registry（GHCR）。对应工作流为 [`.github/workflows/docker-image.yml`](../.github/workflows/docker-image.yml)。

## 目标与边界

该工作流只在名称匹配 `v*` 的 Git Tag 被推送到远程仓库时执行。例如，`v0.1.0`、`v1.2.3` 都会触发工作流。

以下操作均不会触发镜像构建或推送：

- 推送任意分支，包括默认分支。
- 创建或更新 Pull Request。
- 在 GitHub Actions 页面手动运行工作流。

因此，每个已发布的 GHCR 镜像都对应一个明确推送的版本 Tag，避免开发分支或临时提交占用构建资源、污染镜像仓库。

## 实现机制

### 1. 用 `push.tags` 限制工作流触发器

工作流的 `on` 配置只保留 Tag 推送事件：

```yaml
on:
  push:
    tags:
      - "v*"
```

`tags` 是 GitHub Actions 的事件过滤条件。只有远程仓库收到符合模式的 Tag 后，GitHub 才会创建 workflow run；因此不需要在 Job 或 Step 中额外使用 `if` 条件来跳过分支和 Pull Request。

不要同时配置以下触发器，否则相应事件仍会启动镜像构建：

```yaml
on:
  push:
    branches:
      - "**"
  pull_request:
  workflow_dispatch:
```

### 2. 在 Tag 工作流中直接登录并推送

由于 workflow run 已由 Tag 触发器保证，登录 GHCR 和镜像推送步骤无需判断当前分支、事件类型或是否为默认分支：

```yaml
permissions:
  contents: read
  packages: write

- name: Log in to GitHub Container Registry
  uses: docker/login-action@v4
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}

- name: Build and publish image
  uses: docker/build-push-action@v7
  with:
    push: true
```

`packages: write` 授权工作流自带的 `GITHUB_TOKEN` 向 GHCR 发布 Package；`contents: read` 允许 `actions/checkout` 读取 Tag 指向的源码。项目的 API 和 Web 镜像通过 matrix 分别构建，两个镜像都会在同一次 Tag workflow 中推送。

### 3. 根据版本 Tag 生成镜像标签

工作流使用 `docker/metadata-action` 为每个镜像生成以下标签：

```yaml
tags: |
  type=semver,pattern={{version}}
  type=semver,pattern={{major}}.{{minor}}
  type=sha,prefix=sha-
```

以 `v1.2.3` 为例，API 和 Web 镜像都会获得：

| 规则 | 生成的标签 | 用途 |
| --- | --- | --- |
| `{{version}}` | `1.2.3` | 固定到完整发布版本，生产部署应优先使用。 |
| `{{major}}.{{minor}}` | `1.2` | 同一小版本线的滚动标签。 |
| `sha-` | `sha-<短提交 SHA>` | 追溯镜像实际来源的提交。 |

Tag 模式 `v*` 的匹配范围大于语义化版本。为了确保产生完整版本和主次版本标签，发布 Tag 应统一使用 `v<major>.<minor>.<patch>` 格式，例如 `v0.1.0`；不符合语义化版本的 Tag 仍可能触发 workflow，但不会生成上述 `semver` 标签。

工作流没有配置 `latest` 标签。部署时应在服务器中显式指定完整版本号，避免镜像标签指向发生变化后造成不可预期升级。

## 配置步骤

如需在其他仓库复用该策略，可以按以下步骤配置。

1. 新建或修改 `.github/workflows/docker-image.yml`，仅保留 `push.tags` 触发器。
2. 在 build Job 中声明 `contents: read` 和 `packages: write` 权限。
3. 使用 `docker/login-action` 配合 `${{ secrets.GITHUB_TOKEN }}` 登录 `ghcr.io`。
4. 使用 `docker/metadata-action` 从语义化版本 Tag 生成镜像标签。
5. 将 `docker/build-push-action` 的 `push` 固定为 `true`，不再保留分支或事件类型判断。
6. 推送符合约定的版本 Tag，验证 GHCR 中的镜像标签。

## 发布操作

在待发布提交已经推送到远程仓库后，创建并推送版本 Tag：

```bash
git tag -a v0.1.0 -m "release: v0.1.0"
git push origin v0.1.0
```

推送完成后，GitHub Actions 会构建并推送：

```text
ghcr.io/<owner>/<api-image>:0.1.0
ghcr.io/<owner>/<web-image>:0.1.0
```

在 GitHub 仓库的 `Actions` 页面确认 workflow 成功，再到 GitHub Package 页面确认 API 和 Web Package 均已生成对应的 `0.1.0` 标签。

## 验证清单

- 推送普通分支后，没有创建 Docker 镜像 workflow run。
- 创建或更新 Pull Request 后，没有创建 Docker 镜像 workflow run。
- 推送 `v0.1.0` 后，创建一个包含 API 和 Web 两个 matrix Job 的 workflow run。
- 两个 Job 都成功推送 GHCR，且都包含 `0.1.0` 与 `sha-<短提交 SHA>` 标签。
- 生产环境使用完整版本标签，例如 `:0.1.0`，而不依赖可变标签。
