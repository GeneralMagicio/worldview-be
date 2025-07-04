import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { Public } from 'src/auth/jwt-auth.guard'
import { User } from 'src/auth/user.decorator'
import { GetCountDto } from '../common/common.dto'
import { CreatePollDto, DraftPollDto, GetPollsDto } from './Poll.dto'
import { PollService } from './poll.service'

@Controller('poll')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Post()
  async createPoll(
    @Body() dto: CreatePollDto,
    @User('worldID') worldID: string,
  ) {
    return await this.pollService.createPoll(dto, worldID)
  }

  @Patch('draft')
  async patchDraftPoll(
    @Body() dto: DraftPollDto,
    @User('worldID') worldID: string,
  ) {
    return await this.pollService.patchDraftPoll(dto, worldID)
  }

  @Get('draft')
  async getDraftPoll(@User('worldID') worldID: string) {
    return await this.pollService.getUserDraftPoll(worldID)
  }

  @Get()
  async getPolls(
    @Query() query: GetPollsDto,
    @User('worldID') worldID: string,
  ) {
    return await this.pollService.getPolls(query, worldID)
  }

  @Get('count')
  @Public()
  async getPollsCount(@Query() query: GetCountDto): Promise<number> {
    return await this.pollService.getPollsCount(query)
  }

  @Get(':id')
  async getPollDetails(@Param('id') id: number) {
    return await this.pollService.getPollDetails(Number(id))
  }

  @Get(':id/votes')
  async getPollVotes(@Param('id') id: number) {
    return await this.pollService.getPollVotes(Number(id))
  }

  @Delete(':id')
  async deletePoll(@Param('id') id: number, @User('worldID') worldID: string) {
    const poll = await this.pollService.deletePoll(Number(id), worldID)
    return { message: 'Poll deleted', poll }
  }
}
