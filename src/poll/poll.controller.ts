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

@Controller('poll')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Post()
  async createPoll(@Body() dto: CreatePollDto) {
    return await this.pollService.createPoll(dto);
  }

  @Get()
  async getPolls(@Query() query: GetPollsDto) {
    return await this.pollService.getPolls(query);
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
