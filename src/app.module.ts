import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { DatabaseModule } from './database/database.module';
import { PollModule } from './poll/poll.module';

@Module({
  imports: [DatabaseModule, PollModule],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule {}
