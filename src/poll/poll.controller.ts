import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
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
  async getPolls(
    @Req() req,
    @Query() query: GetPollsDto,
    @Res() res: Response,
  ) {
    const polls = await this.pollService.getPolls(query);
    return res.status(200).json(polls);
  }

  @Get(':id')
  async getPollDetails(@Param('id') id: number, @Res() res: Response) {
    const poll = await this.pollService.getPollDetails(Number(id));
    return res.status(200).json(poll);
  }

  @Delete(':id')
  async deletePoll(
    @Param('id') id: number,
    @Body() query: DeletePollDto,
    @Res() res: Response,
  ) {
    const poll = await this.pollService.deletePoll(Number(id), query);
    return res.status(200).json({ message: 'Poll deleted', poll: poll });
  }
}
