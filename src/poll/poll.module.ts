import { Module } from '@nestjs/common';
import { PollService } from './poll.service';
import { PollController } from './poll.controller';
import { UserService } from 'src/user/user.service';

@Module({
  controllers: [PollController],
  providers: [PollService, UserService],
})
export class PollModule {}
