import { forwardRef, Module } from '@nestjs/common'
import { UserModule } from '../user/user.module'
import { UserService } from '../user/user.service'
import { PollController } from './poll.controller'
import { PollService } from './poll.service'

@Module({
  imports: [forwardRef(() => UserModule)],
  controllers: [PollController],
  providers: [PollService, UserService],
})
export class PollModule {}
