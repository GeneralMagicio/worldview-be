import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { AuthService } from './auth/auth.service'
import { DatabaseModule } from './database/database.module'
import { DatabaseService } from './database/database.service'
import { PollModule } from './poll/poll.module'
import { UserModule } from './user/user.module'
import { VoteModule } from './vote/vote.module'

@Module({
  imports: [DatabaseModule, PollModule, VoteModule, UserModule, AuthModule],
  controllers: [AppController],
  providers: [AppService, DatabaseService, AuthService],
})
export class AppModule {}
