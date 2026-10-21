import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeMarkdownImageHosts } from './markdown-image-policy.utils';
import { UpdateMarkdownImagePolicyDto } from './dto/update-markdown-image-policy.dto';

const DEFAULT_POLICY_ID = 'default';

export interface MarkdownImagePolicyResult {
  allowedHosts: string[];
  version: number;
  updatedAt: Date | null;
}

@Injectable()
export class MarkdownImagePolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy(): Promise<MarkdownImagePolicyResult> {
    const policy = await this.prisma.markdownImagePolicy.findUnique({ where: { id: DEFAULT_POLICY_ID } });
    return policy ?? { allowedHosts: [], version: 0, updatedAt: null };
  }

  /** 使用版本条件更新整个集合，避免两个管理页静默相互覆盖。 */
  async updatePolicy(dto: UpdateMarkdownImagePolicyDto): Promise<MarkdownImagePolicyResult> {
    const allowedHosts = normalizeMarkdownImageHosts(dto.allowedHosts);
    const currentPolicy = await this.prisma.markdownImagePolicy.findUnique({ where: { id: DEFAULT_POLICY_ID } });

    if (!currentPolicy) {
      if (dto.expectedVersion !== 0) {
        throw new ConflictException('图片白名单已被其他管理员更新，请刷新后重试。');
      }

      try {
        return await this.prisma.markdownImagePolicy.create({
          data: { id: DEFAULT_POLICY_ID, allowedHosts, version: 1 }
        });
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('图片白名单已被其他管理员更新，请刷新后重试。');
        }
        throw error;
      }
    }

    const updateResult = await this.prisma.markdownImagePolicy.updateMany({
      where: { id: DEFAULT_POLICY_ID, version: dto.expectedVersion },
      data: { allowedHosts, version: { increment: 1 } }
    });
    if (updateResult.count !== 1) {
      throw new ConflictException('图片白名单已被其他管理员更新，请刷新后重试。');
    }

    const updatedPolicy = await this.prisma.markdownImagePolicy.findUnique({ where: { id: DEFAULT_POLICY_ID } });
    if (!updatedPolicy) {
      throw new ConflictException('图片白名单更新后无法读取，请刷新后重试。');
    }
    return updatedPolicy;
  }
}
