import { Module } from '@nestjs/common';
import { VoteController } from './vote.controller';
import { VoteService } from './vote.service';

@Module({
  imports: [],
  controllers: [VoteController],
  providers: [VoteService],
})
export class VoteModule {}
