import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PollService } from './poll.service';
import { CreatePollDto, GetPollsDto } from './Poll.dto';

@Controller('poll')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Post()
  create(@Body() createPollDto: CreatePollDto) {
    const userId = 1; // need to implement Auth
    return this.pollService.createPoll(userId, createPollDto);
  }

  @Get()
  getPolls(@Req() req, @Query() query: GetPollsDto) {
    const userId = 1;
    return this.pollService.getPolls(userId, query);
  }

  @Get(':id')
  async getPollDetails(@Param('id') id: number, @Res() res: Response) {
    try {
      const poll = await this.pollService.getPollDetails(Number(id));

      if (!poll) {
        return res.status(404).json({ message: 'No poll found' });
      }

      return res.status(200).json(poll);
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Internal server error', error: error.message });
    }
  }
}
