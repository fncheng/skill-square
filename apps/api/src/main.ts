import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser = require('cookie-parser');
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AUTH_COOKIE_NAME } from './auth/auth.constants';
import { getCorsOrigins } from './auth/auth.config';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const corsOrigins = getCorsOrigins();

  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.use(json({ limit: '6mb' }));
  app.use(urlencoded({ extended: true, limit: '6mb' }));
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: corsOrigins,
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );
  app.useGlobalFilters(new PrismaExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Prompt Skill Manager API')
    .setDescription('RESTful API for managing AI Prompt, Agent Workflow and Skill assets.')
    .setVersion('0.1.0')
    .addCookieAuth(AUTH_COOKIE_NAME, {
      type: 'apiKey',
      in: 'cookie',
      description: '管理员登录成功后由服务端设置的 HttpOnly Cookie'
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
