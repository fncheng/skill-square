import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tag.findMany({
      orderBy: [{ name: 'asc' }]
    });
  }

  async findOne(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException('标签不存在。');
    }

    return tag;
  }

  create(dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        name: dto.name,
        color: dto.color ?? '#3b82f6'
      }
    });
  }

  async update(id: string, dto: UpdateTagDto) {
    await this.findOne(id);

    return this.prisma.tag.update({
      where: { id },
      data: {
        name: dto.name,
        color: dto.color
      }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.tag.delete({ where: { id } });
  }
}
