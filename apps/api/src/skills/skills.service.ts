import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveSkillDto } from './dto/skill.dto';
import { parseSkillPackage } from './skill-package';

export interface UploadedSkillFile {
  originalname: string;
  buffer: Buffer;
  size: number;
}
const versionSelect = {
  id: true,
  skillId: true,
  number: true,
  name: true,
  description: true,
  note: true,
  format: true,
  originalName: true,
  contentHash: true,
  artifactHash: true,
  createdAt: true,
  files: {
    orderBy: { path: 'asc' as const },
    select: { id: true, path: true, size: true, hash: true }
  }
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
      include: {
        versions: {
          orderBy: { number: 'desc' },
          take: 1,
          select: versionSelect
        },
        _count: { select: { versions: true } }
      }
    });
  }

  async detail(id: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { number: 'desc' }, select: versionSelect }
      }
    });
    if (!skill) throw new NotFoundException('SKILL 不存在。');
    return skill;
  }

  /** 资源行锁串行化版本分配与预期版本检查，避免跨设备静默覆盖。 */
  async save(file: UploadedSkillFile, dto: SaveSkillDto, skillId?: string) {
    const parsed = await this.inspect(file);
    const name = dto.name.trim();
    const description = dto.description.trim();
    const note = dto.note.trim();
    if (!name || !note) throw new BadRequestException('名称和变更说明不能为空。');
    const previous = await this.prisma.skillVersion.findUnique({
      where: { requestId: dto.requestId },
      select: versionSelect
    });
    if (previous) {
      if (
        (skillId && previous.skillId !== skillId) ||
        previous.name !== name ||
        previous.description !== description ||
        previous.note !== note ||
        previous.artifactHash !== parsed.artifactHash
      )
        throw new ConflictException('此请求标识已用于其他内容。');
      return previous;
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        let id = skillId;
        let number = 1;
        if (id) {
          const locked = await tx.$queryRaw<
            Array<{ id: string }>
          >`SELECT id FROM skills WHERE id = ${id}::uuid FOR UPDATE`;
          if (!locked.length) throw new NotFoundException('SKILL 不存在。');
          const replay = await tx.skillVersion.findUnique({
            where: { requestId: dto.requestId },
            select: versionSelect
          });
          if (replay) {
            if (
              replay.skillId !== id ||
              replay.name !== name ||
              replay.description !== description ||
              replay.note !== note ||
              replay.artifactHash !== parsed.artifactHash
            )
              throw new ConflictException('此请求标识已用于其他内容。');
            return replay;
          }
          const latest = await tx.skillVersion.findFirstOrThrow({
            where: { skillId: id },
            orderBy: { number: 'desc' },
            select: {
              id: true,
              number: true,
              contentHash: true,
              name: true,
              description: true,
              format: true
            }
          });
          if (!dto.expectedVersionId || latest.id !== dto.expectedVersionId)
            throw new ConflictException('当前版本已变化，请重新打开上传窗口。');
          if (
            latest.contentHash === parsed.contentHash &&
            latest.name === name &&
            latest.description === description &&
            latest.format === parsed.format
          )
            throw new ConflictException('文件内容及元信息没有变化，无需创建新版本。');
          number = latest.number + 1;
          await tx.skill.update({
            where: { id },
            data: { updatedAt: new Date() }
          });
        } else {
          const skill = await tx.skill.create({ data: {} });
          id = skill.id;
        }
        return tx.skillVersion.create({
          data: {
            skillId: id,
            number,
            name,
            description,
            note,
            format: parsed.format,
            originalName: file.originalname.slice(0, 255),
            contentHash: parsed.contentHash,
            artifactHash: parsed.artifactHash,
            artifact: file.buffer,
            requestId: dto.requestId,
            files: { create: parsed.files }
          },
          select: versionSelect
        });
      });
    } catch (error) {
      // 并发重试可能同时进入事务，唯一请求标识是最终幂等保护。
      const replay = await this.prisma.skillVersion.findUnique({
        where: { requestId: dto.requestId },
        select: versionSelect
      });
      if (
        replay &&
        (!skillId || replay.skillId === skillId) &&
        replay.name === name &&
        replay.description === description &&
        replay.note === note &&
        replay.artifactHash === parsed.artifactHash
      )
        return replay;
      throw error;
    }
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
      select: { artifact: true, format: true, name: true, number: true }
    });
    if (!version) throw new NotFoundException('版本不存在。');
    return version;
  }
  async remove(id: string) {
    const result = await this.prisma.skill.deleteMany({ where: { id } });
    if (!result.count) throw new NotFoundException('SKILL 不存在。');
  }
}
