import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../../auth/auth.service';
import { AnnotationResourceTypeDto } from '../dto/annotation-resource-type';

/** 仅在批注目标为私有模型回答时校验管理员，保持笔记与解决方案的公开读取行为。 */
@Injectable()
export class ModelResponseAnnotationGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const resourceType = request.method === 'GET' ? request.query.resourceType : request.body?.resourceType;
    if (resourceType === AnnotationResourceTypeDto.MODEL_RESPONSE) await this.authService.assertAdmin(request);
    return true;
  }
}
