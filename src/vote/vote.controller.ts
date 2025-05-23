import { Controller, Get, Query } from '@nestjs/common'
import { Public } from 'src/auth/jwt-auth.guard'
import { GetCountDto } from '../common/common.dto'
import { VoteService } from './vote.service'

@Controller('vote')
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  @Get('count')
  @Public()
  async getVotesCount(@Query() query: GetCountDto) {
    return await this.voteService.getVotesCount(query)
  }
}
