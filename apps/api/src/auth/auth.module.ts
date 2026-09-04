import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminWriteGuard } from './guards/admin-write.guard';
import { AdminSessionGuard } from './guards/admin-session.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AdminWriteGuard, AdminSessionGuard],
  exports: [AuthService, AdminWriteGuard, AdminSessionGuard]
})
export class AuthModule {}
