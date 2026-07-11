import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: '前端开发', description: '前端工程、组件、交互、性能优化相关 Prompt。' },
  { name: '后端开发', description: '接口、数据库、服务端架构与性能优化相关 Prompt。' },
  { name: 'AI Agent', description: 'Agent Workflow、工具调用、规划与自动化协作相关 Prompt。' },
  { name: '测试', description: '单元测试、集成测试、测试策略与缺陷复现相关 Prompt。' },
  { name: '运维', description: 'Docker、部署、监控、日志与故障处理相关 Prompt。' },
  { name: '其它', description: '通用工具、文档写作、产品设计与个人效率相关 Prompt。' }
];

const tags = [
  { name: 'Vue3', color: '#22c55e' },
  { name: 'TypeScript', color: '#3b82f6' },
  { name: '需求分析', color: '#0ea5e9' },
  { name: '接口设计', color: '#8b5cf6' },
  { name: 'SQL', color: '#f59e0b' },
  { name: 'Jest', color: '#ef4444' },
  { name: 'Docker', color: '#06b6d4' },
  { name: 'Bug排查', color: '#f97316' },
  { name: '文档生成', color: '#ec4899' },
  { name: 'Agent Workflow', color: '#14b8a6' }
];

const prompts = [
  {
    name: '前端需求分析专家',
    description: '帮助梳理和分析前端需求，输出结构化需求文档和技术方案。',
    category: '前端开发',
    tags: ['需求分析', 'TypeScript'],
    isFavorite: true,
    content: `你是一位资深前端需求分析专家。

请基于以下业务背景，输出结构化分析：
1. 用户角色与核心目标
2. 页面与交互流程
3. 数据字段与状态流转
4. 边界条件与异常状态
5. 前端实现建议

业务背景：
{{business_context}}`
  },
  {
    name: 'Vue3 组件设计助手',
    description: '基于 Vue3 + TypeScript 生成高质量、可复用的组件设计方案。',
    category: '前端开发',
    tags: ['Vue3', 'TypeScript'],
    isFavorite: false,
    content: `你是一位 Vue3 组件架构师。

请根据组件需求输出：
- Props 与 Emits 设计
- 插槽设计
- 状态管理边界
- 可访问性要求
- TypeScript 类型定义
- 组件代码骨架

组件需求：
{{component_requirement}}`
  },
  {
    name: '接口文档生成器',
    description: '根据接口信息生成规范的 RESTful API 文档。',
    category: '后端开发',
    tags: ['接口设计', '文档生成'],
    isFavorite: false,
    content: `你是一位后端接口文档专家。

请根据接口描述生成 Markdown API 文档，包含：
1. 接口用途
2. 请求路径与方法
3. 请求参数
4. 响应结构
5. 错误码
6. 示例请求与响应

接口描述：
{{api_description}}`
  },
  {
    name: 'SQL 优化顾问',
    description: '分析 SQL 语句并给出索引、查询计划与结构优化建议。',
    category: '后端开发',
    tags: ['SQL'],
    isFavorite: false,
    content: `你是一位 PostgreSQL 性能优化专家。

请分析以下 SQL 的性能问题，并输出：
- 潜在慢查询原因
- 推荐索引
- 查询改写建议
- EXPLAIN ANALYZE 关注点
- 数据量增长后的风险

SQL：
{{sql}}`
  },
  {
    name: '单元测试用例生成',
    description: '根据函数或模块生成 Jest 单元测试用例。',
    category: '测试',
    tags: ['Jest', 'TypeScript'],
    isFavorite: false,
    content: `你是一位测试工程师。

请为以下代码生成 Jest 单元测试，覆盖：
- 正常路径
- 边界条件
- 异常输入
- Mock 依赖
- 可读的测试命名

代码：
{{code}}`
  },
  {
    name: 'Dockerfile 生成器',
    description: '根据项目描述生成符合最佳实践的 Dockerfile。',
    category: '运维',
    tags: ['Docker'],
    isFavorite: false,
    content: `你是一位容器化部署专家。

请根据项目说明生成 Dockerfile，并说明：
- 基础镜像选择
- 多阶段构建策略
- 缓存优化
- 运行时安全
- 镜像体积控制

项目说明：
{{project_description}}`
  },
  {
    name: 'Agent Workflow 规划器',
    description: '将复杂任务拆解为可执行的 Agent 工作流。',
    category: 'AI Agent',
    tags: ['Agent Workflow'],
    isFavorite: true,
    content: `你是一位 AI Agent Workflow 架构师。

请将目标任务拆解为：
1. 目标与约束
2. 子任务列表
3. 每个 Agent 的职责
4. 工具调用顺序
5. 中间产物校验点
6. 失败恢复策略

目标任务：
{{goal}}`
  },
  {
    name: 'Bug 排查助手',
    description: '根据现象和日志定位问题原因并提供修复路径。',
    category: '其它',
    tags: ['Bug排查'],
    isFavorite: false,
    content: `你是一位资深故障排查专家。

请基于问题描述输出：
- 现象归纳
- 最可能原因排序
- 需要补充的证据
- 最小复现路径
- 修复建议
- 回归验证清单

问题描述：
{{issue}}`
  }
];

const solutions = [
  {
    title: '关于 Codex 如何在没有 AGENTS.md 时读取 CLAUDE.md',
    summary: '通过配置 project_doc_fallback_filenames，让 Codex 在缺少 AGENTS.md 时回退读取 CLAUDE.md。',
    category: 'Codex',
    tags: ['Codex', 'CLAUDE.md', '配置'],
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
    title: '修复服务启动时 Prisma seed 报错',
    summary: '启动容器时 seed 脚本因数据库未就绪而报错，可通过等待数据库可用并改为幂等写入解决。',
    category: '部署',
    tags: ['Prisma', 'Docker', 'Seed'],
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
    title: 'WSL 内连接本机 PostgreSQL 失败',
    summary: 'WSL 中的 localhost 指向 WSL 自身，连接 Windows 主机的 PostgreSQL 需使用主机地址。',
    category: '环境',
    tags: ['WSL', 'PostgreSQL', '网络'],
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

const notes = [
  {
    title: 'Linux 文件查找命令 find 常用用法',
    summary: '整理 find 按名称、类型、时间、大小查找文件的常用组合，便于日常查阅。',
    category: 'Linux',
    tags: ['Linux', 'Shell', 'find'],
    content: [
      '## 按名称查找',
      '',
      '```bash',
      '# 当前目录及子目录下查找 .log 文件',
      'find . -name "*.log"',
      '# 忽略大小写',
      'find . -iname "*.LOG"',
      '```',
      '',
      '## 按类型查找',
      '',
      '```bash',
      'find . -type f   # 普通文件',
      'find . -type d   # 目录',
      '```',
      '',
      '## 按时间与大小',
      '',
      '```bash',
      '# 最近 1 天内修改过的文件',
      'find . -mtime -1',
      '# 大于 100MB 的文件',
      'find . -size +100M',
      '```',
      '',
      '## 查找后执行操作',
      '',
      '```bash',
      '# 删除所有 .tmp 文件',
      'find . -name "*.tmp" -delete',
      '# 对结果批量执行命令',
      'find . -name "*.sh" -exec chmod +x {} \\;',
      '```'
    ].join('\n')
  },
  {
    title: 'Git 撤销与回退速查',
    summary: '汇总工作区、暂存区、提交三种状态下的撤销命令，避免误操作丢失改动。',
    category: 'Git',
    tags: ['Git', '版本控制'],
    content: [
      '## 撤销工作区改动',
      '',
      '```bash',
      '# 丢弃单个文件的未暂存改动',
      'git restore <file>',
      '```',
      '',
      '## 撤销暂存（保留改动）',
      '',
      '```bash',
      'git restore --staged <file>',
      '```',
      '',
      '## 回退提交',
      '',
      '```bash',
      '# 保留改动到工作区',
      'git reset --soft HEAD~1',
      '# 保留改动到暂存区',
      'git reset --mixed HEAD~1',
      '# 彻底丢弃改动（不可恢复）',
      'git reset --hard HEAD~1',
      '```',
      '',
      '> `reset --hard` 会丢失未提交内容，执行前务必确认。'
    ].join('\n')
  }
];

async function ensureInitialVersion(promptId: string) {
  const existing = await prisma.promptVersion.findFirst({ where: { promptId } });
  if (existing) {
    return;
  }

  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
    include: {
      category: true,
      tags: { include: { tag: true } }
    }
  });

  if (!prompt) {
    return;
  }

  await prisma.promptVersion.create({
    data: {
      promptId: prompt.id,
      version: 1,
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
      isFavorite: prompt.isFavorite,
      categoryId: prompt.categoryId,
      categoryName: prompt.category?.name,
      tagIds: prompt.tags.map((item) => item.tag.id),
      tagNames: prompt.tags.map((item) => item.tag.name)
    }
  });
}

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { description: category.description },
      create: category
    });
  }

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: { color: tag.color },
      create: tag
    });
  }

  for (const item of prompts) {
    const existing = await prisma.prompt.findFirst({ where: { name: item.name } });
    if (existing) {
      await ensureInitialVersion(existing.id);
      continue;
    }

    const category = await prisma.category.findUnique({ where: { name: item.category } });
    const promptTags = await prisma.tag.findMany({
      where: { name: { in: item.tags } }
    });

    const prompt = await prisma.prompt.create({
      data: {
        name: item.name,
        description: item.description,
        content: item.content,
        isFavorite: item.isFavorite,
        category: category ? { connect: { id: category.id } } : undefined,
        tags: {
          create: promptTags.map((tag) => ({
            tag: { connect: { id: tag.id } }
          }))
        }
      }
    });

    await ensureInitialVersion(prompt.id);
  }

  for (const solution of solutions) {
    const existing = await prisma.solution.findFirst({ where: { title: solution.title } });
    if (existing) {
      await prisma.solution.update({
        where: { id: existing.id },
        data: {
          summary: solution.summary,
          content: solution.content,
          category: solution.category,
          tags: solution.tags
        }
      });
      continue;
    }

    await prisma.solution.create({ data: solution });
  }

  for (const note of notes) {
    const existing = await prisma.note.findFirst({ where: { title: note.title } });
    if (existing) {
      await prisma.note.update({
        where: { id: existing.id },
        data: {
          summary: note.summary,
          content: note.content,
          category: note.category,
          tags: note.tags
        }
      });
      continue;
    }

    await prisma.note.create({ data: note });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
