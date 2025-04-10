import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { JwtService } from './jwt.service';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtService],
  exports: [AuthService],
})
export class AuthModule {}
