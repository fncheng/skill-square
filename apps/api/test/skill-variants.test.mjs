import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const { SkillsService } = require('../src/skills/skills.service.ts');

// 内存事务替身保留资源和适配归属，使测试通过公开 service 方法验证隔离。
function fixture() {
  const skills = [], variants = [], versions = [];
  const match = (row, where) => Object.entries(where).every(([key, value]) => row[key] === value);
  const prisma = {
    $queryRaw: async () => [{ id: 'skill' }],
    skill: {
      create: async ({ data }) => { const row = { ...data, id: 'skill' }; skills.push(row); return row; },
      update: async () => ({})
    },
    skillVariant: {
      findMany: async ({ where }) => variants.filter((row) => match(row, where)),
      findFirst: async ({ where }) => variants.find((row) => match(row, where)) ?? null,
      create: async ({ data }) => { const row = { ...data, id: `variant-${variants.length + 1}` }; variants.push(row); return row; },
      update: async ({ where, data }) => Object.assign(variants.find((row) => match(row, where)), data)
    },
    skillVersion: {
      findUnique: async ({ where }) => versions.find((row) => match(row, where)) ?? null,
      findFirst: async ({ where }) => versions.find((row) => match(row, where)) ?? null,
      findFirstOrThrow: async ({ where }) => versions.filter((row) => match(row, where)).sort((a, b) => b.number - a.number)[0],
      create: async ({ data }) => { const row = { ...data, files: data.files.create, id: `version-${versions.length + 1}` }; versions.push(row); return row; }
    }
  };
  prisma.$transaction = async (fn) => fn(prisma);
  const file = (body) => ({ originalname: 'SKILL.md', buffer: Buffer.from(`---\nname: test\ndescription: sample\n---\n${body}`), size: 50 });
  const dto = (requestId, extra = {}) => ({ name: 'test', description: 'sample', note: 'note', requestId, ...extra });
  return { service: new SkillsService(prisma), file, dto, versions, variants, prisma };
}

test('工具版本独立编号、检查基线及重放目标', async () => {
  const { service, file, dto } = fixture();
  const first = await service.save(file('a'), dto('r1', { toolKey: 'codex' }));
  const other = await service.save(file('a'), dto('r2', { toolKey: 'claude-code' }), 'skill', 'variant');
  assert.equal(other.number, 1);
  const next = await service.save(file('b'), dto('r3', { variantId: first.variantId, expectedVersionId: first.id }), 'skill');
  assert.equal(next.number, 2);
  await assert.rejects(service.save(file('c'), dto('r4', { variantId: other.variantId, expectedVersionId: next.id }), 'skill'), /当前版本已变化/);
  const replay = await service.save(file('b'), dto('r3', { variantId: first.variantId, expectedVersionId: first.id }), 'skill');
  assert.equal(replay.id, next.id);
  await assert.rejects(service.save(file('b'), dto('r3', { variantId: other.variantId, expectedVersionId: first.id }), 'skill'), /请求标识/);
  await assert.rejects(service.save(file('x'), dto('r5', { expectedVersionId: next.id }), 'skill'), /明确工具适配/);
  await assert.rejects(service.save(file('a'), dto('r6', { toolKey: 'codex' }), 'skill', 'variant'), /已存在/);
});

test('仅未指定工具可归类，目标工具冲突不更改原历史', async () => {
  const { service, file, dto } = fixture();
  const first = await service.save(file('a'), dto('r1'));
  await service.save(file('b'), dto('r2', { toolKey: 'codex' }), 'skill', 'variant');
  await assert.rejects(service.classify('skill', first.variantId, { expectedToolKey: 'unspecified', toolKey: 'codex' }), /目标工具已存在/);
  await service.classify('skill', first.variantId, { expectedToolKey: 'unspecified', toolKey: 'claude-code' });
  const retry = await service.save(file('a'), dto('r1'));
  assert.equal(retry.id, first.id);
  assert.equal('requestFingerprint' in retry, false);
  await assert.rejects(service.classify('skill', first.variantId, { expectedToolKey: 'unspecified', toolKey: 'codex' }), /已变化/);
});

test('下载返回指定版本原始字节并校验父资源', async () => {
  const original = Buffer.from([0, 255, 13, 10]);
  const prisma = { skillVersion: { findFirst: async ({ where }) => where.id === 'v1' && where.skillId === 's1' ? { artifact: original, format: 'ZIP', number: 1, skill: { name: 'test' }, variant: { toolKey: 'codex' } } : null } };
  const service = new SkillsService(prisma);
  const result = await service.download('s1', 'v1');
  assert.deepEqual(result.artifact, original);
  await assert.rejects(service.download('s2', 'v1'), /版本不存在/);
});

test('更新另一工具不影响当前工具基线，同工具旧基线被拒绝', async () => {
  const { service, file, dto } = fixture();
  const first = await service.save(file('a'), dto('r1', { toolKey: 'codex' }));
  const second = await service.save(file('b'), dto('r2', { toolKey: 'claude-code' }), 'skill', 'variant');
  await service.save(file('c'), dto('r3', { variantId: second.variantId, expectedVersionId: second.id }), 'skill');
  const next = await service.save(file('d'), dto('r4', { variantId: first.variantId, expectedVersionId: first.id }), 'skill');
  assert.equal(next.number, 2);
  await assert.rejects(service.save(file('e'), dto('r5', { variantId: first.variantId, expectedVersionId: first.id }), 'skill'), /当前版本已变化/);
});

test('旧数据仅在创建或追加目标及基线可证明时重放', async () => {
  const { service, file, dto, versions } = fixture();
  const first = await service.save(file('a'), dto('r1'));
  versions[0].requestFingerprint = null;
  assert.equal((await service.save(file('a'), dto('r1'))).id, first.id);
  const second = await service.save(file('b'), dto('r2', { expectedVersionId: first.id }), 'skill');
  versions[1].requestFingerprint = null;
  assert.equal((await service.save(file('b'), dto('r2', { expectedVersionId: first.id }), 'skill')).id, second.id);
  await assert.rejects(service.save(file('b'), dto('r2', { expectedVersionId: second.id }), 'skill'), /请求标识/);
  await assert.rejects(service.save(file('b'), dto('r2', { expectedVersionId: first.id }), 'other'), /请求标识|明确工具适配/);
});

test('适配详情拒绝跨父资源查询', async () => {
  const { service, file, dto } = fixture();
  const first = await service.save(file('a'), dto('r1'));
  await assert.rejects(service.variant('other', first.variantId), /工具适配不存在/);
});

test('拒绝与保存操作无关的字段，历史追加必须提供可证明的基线', async () => {
  const { service, file, dto, versions } = fixture();
  await assert.rejects(service.save(file('a'), dto('a', { expectedVersionId: 'v1' })), /创建操作不能/);
  await assert.rejects(service.save(file('a'), dto('b', { variantId: 'v1', toolKey: 'codex' })), /创建操作不能/);
  const first = await service.save(file('a'), dto('r1'));
  await assert.rejects(service.save(file('b'), dto('r2', { toolKey: 'codex', expectedVersionId: first.id }), 'skill'), /追加版本不能/);
  const second = await service.save(file('b'), dto('r3', { expectedVersionId: first.id }), 'skill');
  versions[1].requestFingerprint = null;
  versions.splice(0, 1);
  await assert.rejects(service.save(file('b'), dto('r3'), 'skill'), /请求标识/);
  assert.equal(second.number, 2);
});

test('事务内重放使用事务查询连接', async () => {
  const { service, file, dto, versions, prisma } = fixture();
  const first = await service.save(file('a'), dto('r1'));
  const second = await service.save(file('b'), dto('r2', { expectedVersionId: first.id }), 'skill');
  versions[1].requestFingerprint = null;
  const txVariant = { ...prisma.skillVariant };
  const txVersion = { ...prisma.skillVersion };
  prisma.skillVersion.findUnique = async () => null;
  prisma.skillVariant.findMany = async () => { throw new Error('事务外查询不应执行'); };
  prisma.skillVersion.findFirst = async () => { throw new Error('事务外查询不应执行'); };
  prisma.$transaction = async (fn) => fn({ ...prisma, skillVariant: txVariant, skillVersion: txVersion });
  const replay = await service.save(file('b'), dto('r2', { expectedVersionId: first.id }), 'skill');
  assert.equal(replay.id, second.id);
});
