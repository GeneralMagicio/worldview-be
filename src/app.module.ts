import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { DatabaseModule } from './database/database.module';
import { PollModule } from './poll/poll.module';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { UserModule } from './user/user.module';

@Module({
  imports: [DatabaseModule, PollModule, UserModule, AuthModule],
  controllers: [AppController],
  providers: [AppService, DatabaseService, AuthService],
})
export class AppModule {}
