import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const mappedException = this.mapException(exception);
    const status = mappedException.getStatus();

    response.status(status).json({
      statusCode: status,
      message: mappedException.message,
      error: mappedException.name
    });
  }

  private mapException(exception: Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      return new ConflictException('数据唯一性冲突，请检查名称或唯一字段是否重复。');
    }

    if (exception.code === 'P2025') {
      return new NotFoundException('目标数据不存在或已经被删除。');
    }

    return new ConflictException('数据库操作失败，请检查请求数据。');
  }
}
