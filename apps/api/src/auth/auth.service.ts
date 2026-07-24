import { createHash } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { CookieOptions, Request, Response } from 'express';
import { ADMIN_USERNAME, AUTH_COOKIE_NAME } from './auth.constants';
import { AuthConfig, getAuthConfig } from './auth.config';
import { AdminIdentityDto, AuthSessionResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { AdminSessionPayload, RequestCookies } from './auth.types';

@Injectable()
export class AuthService {
  private readonly config: AuthConfig = getAuthConfig();
  private readonly credentialVersion = createHash('sha256')
    .update(this.config.passwordHash)
    .digest('hex');

  constructor(private readonly jwtService: JwtService) {}

  async login(dto: LoginDto, response: Response): Promise<AuthSessionResponseDto> {
    const passwordMatches =
      !bcrypt.truncates(dto.password) && (await bcrypt.compare(dto.password, this.config.passwordHash));

    if (dto.username !== ADMIN_USERNAME || !passwordMatches) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const token = await this.jwtService.signAsync(this.createPayload(), {
      secret: this.config.jwtSecret,
      expiresIn: this.config.sessionTtlSeconds
    });
    response.cookie(AUTH_COOKIE_NAME, token, this.cookieOptions(this.config.sessionTtlSeconds * 1000));
    return this.authenticatedSession();
  }

  async getSession(request: Request, response?: Response): Promise<AuthSessionResponseDto> {
    const token = this.readToken(request);
    if (!token) {
      return this.guestSession();
    }

    if (await this.isValidToken(token)) {
      return this.authenticatedSession();
    }

    if (response) {
      this.clearSessionCookie(response);
    }
    return this.guestSession();
  }

  async assertAdmin(request: Request) {
    const token = this.readToken(request);
    if (!token || !(await this.isValidToken(token))) {
      throw new UnauthorizedException('请先登录管理员账号');
    }
  }

  clearSessionCookie(response: Response) {
    response.clearCookie(AUTH_COOKIE_NAME, this.cookieOptions());
  }

  private createPayload(): AdminSessionPayload {
    return {
      sub: ADMIN_USERNAME,
      role: 'admin',
      credentialVersion: this.credentialVersion
    };
  }

  private async isValidToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<AdminSessionPayload>(token, {
        secret: this.config.jwtSecret
      });
      return (
        payload.sub === ADMIN_USERNAME &&
        payload.role === 'admin' &&
        payload.credentialVersion === this.credentialVersion
      );
    } catch {
      return false;
    }
  }

  private readToken(request: Request) {
    const cookies = request.cookies as RequestCookies | undefined;
    return cookies?.[AUTH_COOKIE_NAME];
  }

  private cookieOptions(maxAge?: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'strict',
      path: '/api',
      ...(maxAge === undefined ? {} : { maxAge })
    };
  }

  private authenticatedSession(): AuthSessionResponseDto {
    const user: AdminIdentityDto = { username: ADMIN_USERNAME, role: 'admin' };
    return { authenticated: true, user };
  }

  private guestSession(): AuthSessionResponseDto {
    return { authenticated: false, user: null };
  }
}
