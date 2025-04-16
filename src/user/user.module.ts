import { Module } from '@nestjs/common';
import { PollService } from '../poll/poll.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PollService],
})
export class UserModule {}
