import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

/** 对私有资源的全部请求统一校验管理员会话。 */
@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    await this.authService.assertAdmin(request);
    return true;
  }
}
