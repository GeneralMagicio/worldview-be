import { forwardRef, Module } from '@nestjs/common';
import { PollService } from './poll.service';
import { PollController } from './poll.controller';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';

@Module({
  imports: [forwardRef(() => UserModule)],
  controllers: [PollController],
  providers: [PollService, UserService],
})
export class PollModule {}
