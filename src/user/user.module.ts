import { forwardRef, Module } from '@nestjs/common'
import { PollModule } from '../poll/poll.module'
import { PollService } from '../poll/poll.service'
import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
  imports: [forwardRef(() => PollModule)],
  controllers: [UserController],
  providers: [UserService, PollService],
})
export class UserModule {}
