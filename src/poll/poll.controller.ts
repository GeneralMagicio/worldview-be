import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CreatePollDto, DeletePollDto, GetPollsDto } from './Poll.dto';
import { PollService } from './poll.service';
import { User } from 'src/auth/user.docerator';

@Controller('poll')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Post()
  async createPoll(
    @Body() dto: CreatePollDto,
    @User('worldID') worldID: string,
  ) {
    return await this.pollService.createPoll(dto, worldID);
  }

  @Get()
  async getPolls(
    @Query() query: GetPollsDto,
    @User('worldID') worldID: string,
  ) {
    return await this.pollService.getPolls(query, worldID);
  }

  @Get(':id')
  async getPollDetails(@Param('id') id: number) {
    return await this.pollService.getPollDetails(Number(id));
  }

  @Delete(':id')
  async deletePoll(@Param('id') id: number, @Body() query: DeletePollDto) {
    const poll = await this.pollService.deletePoll(Number(id), query);
    return { message: 'Poll deleted', poll };
  }
}
