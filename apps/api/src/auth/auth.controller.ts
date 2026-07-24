import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AUTH_COOKIE_NAME } from './auth.constants';
import { AuthService } from './auth.service';
import { PublicWrite } from './decorators/public-write.decorator';
import { AuthSessionResponseDto, LogoutResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @PublicWrite()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登录唯一管理员账号' })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  @ApiUnauthorizedResponse({ description: '用户名或密码错误' })
  @ApiResponse({ status: 429, description: '登录尝试过于频繁' })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.authService.login(dto, response);
  }

  @Get('session')
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({ summary: '查询当前访客或管理员会话' })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  getSession(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.authService.getSession(request, response);
  }

  @Post('logout')
  @PublicWrite()
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({ summary: '退出管理员登录' })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(@Res({ passthrough: true }) response: Response): LogoutResponseDto {
    this.authService.clearSessionCookie(response);
    return { success: true };
  }
}
