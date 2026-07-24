import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminWriteGuard } from './guards/admin-write.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AdminWriteGuard],
  exports: [AuthService, AdminWriteGuard]
})
export class AuthModule {}
