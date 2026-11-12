import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClassifySkillVariantDto, SaveSkillDto } from './dto/skill.dto';
import { parseSkillPackage, skillContentHash } from './skill-package';

export interface UploadedSkillFile {
  originalname: string;
  buffer: Buffer;
  size: number;
}
const versionSelect = {
  id: true,
  skillId: true,
  variantId: true,
  number: true,
  name: true,
  description: true,
  note: true,
  format: true,
  originalName: true,
  contentHash: true,
  artifactHash: true,
  createdAt: true,
  files: { orderBy: { path: 'asc' as const }, select: { id: true, path: true, size: true, hash: true } }
};
const requestSelect = { ...versionSelect, requestFingerprint: true };
const summarySelect = { ...versionSelect, files: false, _count: { select: { files: true } } };
const variantSummary = {
  versions: { orderBy: { number: 'desc' as const }, take: 1, select: summarySelect },
  _count: { select: { versions: true } }
};

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}
  async inspect(file: UploadedSkillFile) {
    if (!file?.buffer) throw new BadRequestException('请选择上传文件。');
    return parseSkillPackage(file.originalname, file.buffer);
  }
  async list() {
    return this.prisma.skill.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { variants: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: variantSummary } }
    });
  }
  async detail(id: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
      include: { variants: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: variantSummary } }
    });
    if (!skill) throw new NotFoundException('SKILL 不存在。');
    return skill;
  }
  async variant(id: string, variantId: string) {
    const variant = await this.prisma.skillVariant.findFirst({
      where: { id: variantId, skillId: id },
      include: { versions: { orderBy: { number: 'desc' }, select: versionSelect } }
    });
    if (!variant) throw new NotFoundException('工具适配不存在。');
    return variant;
  }
  /** 父资源锁保证归类、创建适配和各适配版本号的原子性。 */
  async save(
    file: UploadedSkillFile,
    dto: SaveSkillDto,
    skillId?: string,
    operation: 'create' | 'variant' | 'append' = skillId ? 'append' : 'create'
  ) {
    const parsed = await this.inspect(file);
    const name = dto.name.trim(), description = dto.description.trim(), note = dto.note.trim();
    if (!name || !note) throw new BadRequestException('名称和变更说明不能为空。');
    if (operation === 'variant' && !dto.toolKey) throw new BadRequestException('请选择工具。');
    if (operation !== 'append' && (dto.variantId !== undefined || dto.expectedVersionId !== undefined)) {
      throw new BadRequestException('创建操作不能指定适配或预期版本。');
    }
    if (operation === 'append' && dto.toolKey !== undefined) {
      throw new BadRequestException('追加版本不能指定工具。');
    }
    const toolKey = dto.toolKey || 'unspecified';
    const fingerprint = createHash('sha256')
      .update(JSON.stringify([
        operation, skillId || null, dto.variantId || null, operation === 'append' ? null : toolKey,
        dto.expectedVersionId || null, name, description, note, file.originalname.slice(0, 255), parsed.artifactHash
      ]))
      .digest('hex');
    // 旧快照没有操作指纹，仅在原操作及目标可由历史证明时允许重放。
    const checkReplay = async (
      previous: {
        requestFingerprint: string | null;
        skillId: string;
        variantId: string;
        number: number;
        name: string;
        description: string;
        note: string;
        artifactHash: string;
        originalName: string;
      },
      client: Pick<Prisma.TransactionClient, 'skillVariant' | 'skillVersion'>
    ) => {
      if (operation === 'append' && !dto.variantId) {
        const candidates = await client.skillVariant.findMany({ where: { skillId }, select: { id: true } });
        if (candidates.length !== 1 || candidates[0].id !== previous.variantId) {
          throw new BadRequestException('请选择此 SKILL 的明确工具适配。');
        }
      }
      if (previous.requestFingerprint === fingerprint) return;
      if (
        !previous.requestFingerprint &&
        previous.name === name &&
        previous.description === description &&
        previous.note === note &&
        previous.artifactHash === parsed.artifactHash &&
        previous.originalName === file.originalname.slice(0, 255)
      ) {
        if (operation === 'create' && !skillId && previous.number === 1 && toolKey === 'unspecified') return;
        if (
          operation === 'append' &&
          skillId === previous.skillId &&
          (!dto.variantId || dto.variantId === previous.variantId) &&
          previous.number > 1
        ) {
          const before = await client.skillVersion.findFirst({
            where: { variantId: previous.variantId, number: previous.number - 1 },
            select: { id: true }
          });
          if (before && dto.expectedVersionId && before.id === dto.expectedVersionId) return;
        }
      }
      throw new ConflictException('此请求标识已用于其他操作或内容。');
    };
    const withoutFingerprint = <T extends { requestFingerprint: string | null }>({
      requestFingerprint: _fingerprint,
      ...version
    }: T) => version;
    const previous = await this.prisma.skillVersion.findUnique({
      where: { requestId: dto.requestId },
      select: requestSelect
    });
    if (previous) {
      await checkReplay(previous, this.prisma);
      return withoutFingerprint(previous);
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        let id = skillId;
        if (id) {
          const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM skills WHERE id = ${id}::uuid FOR UPDATE`;
          if (!locked.length) throw new NotFoundException('SKILL 不存在。');
        }
        const replay = await tx.skillVersion.findUnique({
          where: { requestId: dto.requestId },
          select: requestSelect
        });
        if (replay) {
          await checkReplay(replay, tx);
          return withoutFingerprint(replay);
        }
        if (!id) id = (await tx.skill.create({ data: { name, description } })).id;
        let variantId: string;
        let number = 1;
        if (operation === 'append') {
          const variants = await tx.skillVariant.findMany({
            where: { skillId: id, ...(dto.variantId ? { id: dto.variantId } : {}) },
            select: { id: true }
          });
          if (variants.length !== 1) throw new BadRequestException('请选择此 SKILL 的明确工具适配。');
          variantId = variants[0].id;
          const latest = await tx.skillVersion.findFirstOrThrow({
            where: { variantId },
            orderBy: { number: 'desc' },
            select: {
              id: true,
              number: true,
              contentHash: true,
              files: { select: { path: true, size: true, hash: true } },
              name: true,
              description: true,
              format: true
            }
          });
          if (!dto.expectedVersionId || latest.id !== dto.expectedVersionId) {
            throw new ConflictException('当前版本已变化，请刷新后再次提交。');
          }
          if (
            (latest.contentHash === parsed.contentHash || skillContentHash(latest.files) === parsed.contentHash) &&
            latest.name === name && latest.description === description && latest.format === parsed.format
          ) {
            throw new ConflictException('文件内容及元信息没有变化，无需创建新版本。');
          }
          number = latest.number + 1;
          await tx.skillVariant.update({ where: { id: variantId }, data: { updatedAt: new Date() } });
        } else {
          if (await tx.skillVariant.findFirst({ where: { skillId: id, toolKey } })) {
            throw new ConflictException('该工具适配已存在。');
          }
          variantId = (await tx.skillVariant.create({ data: { skillId: id, toolKey } })).id;
        }
        await tx.skill.update({ where: { id }, data: { updatedAt: new Date() } });
        return tx.skillVersion.create({
          data: {
            skillId: id, variantId, number, name, description, note, format: parsed.format,
            originalName: file.originalname.slice(0, 255), contentHash: parsed.contentHash,
            artifactHash: parsed.artifactHash, artifact: file.buffer, requestId: dto.requestId,
            requestFingerprint: fingerprint, files: { create: parsed.files }
          },
          select: versionSelect
        });
      });
    } catch (error) {
      const replay = await this.prisma.skillVersion.findUnique({
        where: { requestId: dto.requestId },
        select: requestSelect
      });
      if (replay) {
        await checkReplay(replay, this.prisma);
        return withoutFingerprint(replay);
      }
      throw error;
    }
  }
  async classify(id: string, variantId: string, dto: ClassifySkillVariantDto) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM skills WHERE id = ${id}::uuid FOR UPDATE`;
      if (!locked.length) throw new NotFoundException('SKILL 不存在。');
      const variant = await tx.skillVariant.findFirst({ where: { id: variantId, skillId: id } });
      if (!variant) throw new NotFoundException('工具适配不存在。');
      const target = await tx.skillVariant.findFirst({ where: { skillId: id, toolKey: dto.toolKey } });
      if (variant.toolKey !== dto.expectedToolKey || target) {
        throw new ConflictException('工具适配已变化或目标工具已存在。');
      }
      return tx.skillVariant.update({ where: { id: variantId }, data: { toolKey: dto.toolKey } });
    });
  }
  async file(id: string, versionId: string, fileId: string) {
    const file = await this.prisma.skillFile.findFirst({
      where: { id: fileId, versionId, version: { skillId: id } },
      select: { id: true, text: true }
    });
    if (!file) throw new NotFoundException('文件不存在。');
    return file;
  }
  async download(id: string, versionId: string) {
    const version = await this.prisma.skillVersion.findFirst({
      where: { id: versionId, skillId: id },
      select: {
        artifact: true,
        format: true,
        number: true,
        skill: { select: { name: true } },
        variant: { select: { toolKey: true } }
      }
    });
    if (!version) throw new NotFoundException('版本不存在。');
    return version;
  }
  async remove(id: string) {
    const result = await this.prisma.skill.deleteMany({ where: { id } });
    if (!result.count) throw new NotFoundException('SKILL 不存在。');
  }
}
