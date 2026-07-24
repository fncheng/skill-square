import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PUBLIC_WRITE_KEY } from '../auth.constants';
import { AuthService } from '../auth.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class AdminWriteGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const isPublicWrite = this.reflector.getAllAndOverride<boolean>(PUBLIC_WRITE_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublicWrite) {
      return true;
    }

    await this.authService.assertAdmin(request);
    return true;
  }
}
