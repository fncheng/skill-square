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
