import type { Solution } from '@/types/domain';

/**
 * 常见问题解决方案的本地演示数据。
 * 后续接入后端时，可在 `@/api/solutions.ts` 中以相同结构替换为接口数据。
 */
export const solutions: Solution[] = [
  {
    id: 'codex-claude-fallback',
    title: '关于 Codex 如何在没有 AGENTS.md 时读取 CLAUDE.md',
    summary: '通过配置 project_doc_fallback_filenames，让 Codex 在缺少 AGENTS.md 时回退读取 CLAUDE.md。',
    category: 'Codex',
    tags: ['Codex', 'CLAUDE.md', '配置'],
    createdAt: '2026-06-20T08:00:00.000Z',
    updatedAt: '2026-06-20T08:00:00.000Z',
    content: [
      '在 `~/.codex/config.toml` 中增加这一行：',
      '',
      '```toml',
      'project_doc_fallback_filenames = ["CLAUDE.md"]',
      '```',
      '',
      '之后，Codex 在项目目录链路中会按以下优先级寻找指令文件：',
      '',
      '- AGENTS.override.md',
      '- AGENTS.md',
      '- CLAUDE.md',
      '',
      '也就是说：当前目录没有 AGENTS.override.md 和 AGENTS.md 时，Codex 才会读取同目录的 CLAUDE.md。',
      '',
      '改完后需要重新启动 Codex，或新开一个 Codex 会话；正在进行中的会话不会重新加载项目指令。',
      '',
      '可在项目根目录验证：',
      '',
      '```bash',
      'codex --ask-for-approval never "总结当前加载的项目指令，并说明指令文件来源。"',
      '```'
    ].join('\n')
  },
  {
    id: 'prisma-seed-startup-error',
    title: '修复服务启动时 Prisma seed 报错',
    summary: '启动容器时 seed 脚本因数据库未就绪而报错，可通过等待数据库可用并改为幂等写入解决。',
    category: '部署',
    tags: ['Prisma', 'Docker', 'Seed'],
    createdAt: '2026-06-18T03:20:00.000Z',
    updatedAt: '2026-06-22T09:10:00.000Z',
    content: [
      '## 现象',
      '',
      '容器启动时执行 `prisma db seed`，偶发报错：数据库连接被拒绝，或唯一约束冲突。',
      '',
      '## 原因',
      '',
      '- 数据库容器尚未就绪，应用容器已开始执行 seed。',
      '- seed 使用 `create` 而非幂等写入，重复启动时触发唯一约束冲突。',
      '',
      '## 解决',
      '',
      '1. 在入口脚本中等待数据库可用后再执行迁移与 seed。',
      '2. seed 改为 `upsert`，保证可重复执行：',
      '',
      '```ts',
      'await prisma.category.upsert({',
      "  where: { name: '默认分类' },",
      '  update: {},',
      "  create: { name: '默认分类', description: '' }",
      '});',
      '```',
      '',
      '3. 迁移与 seed 串行执行，确保表结构先于数据写入。'
    ].join('\n')
  },
  {
    id: 'wsl-postgres-localhost',
    title: 'WSL 内连接本机 PostgreSQL 失败',
    summary: 'WSL 中的 localhost 指向 WSL 自身，连接 Windows 主机的 PostgreSQL 需使用主机地址。',
    category: '环境',
    tags: ['WSL', 'PostgreSQL', '网络'],
    createdAt: '2026-06-15T06:45:00.000Z',
    updatedAt: '2026-06-15T06:45:00.000Z',
    content: [
      '在 WSL 内开发时，`localhost` 指向的是 WSL 环境自身，而不是 Windows 主机。',
      '',
      '如果数据库运行在 Windows 主机上，需要：',
      '',
      '- 使用主机在 WSL 中的地址（如 `host.docker.internal` 或 `/etc/resolv.conf` 中的 nameserver）。',
      '- 确认 PostgreSQL 监听地址包含该网段，并在 `pg_hba.conf` 中放行。',
      '',
      '推荐做法：直接在 WSL 内运行 PostgreSQL 服务，连接串使用 `localhost` 即可，避免跨网段配置。'
    ].join('\n')
  }
];
