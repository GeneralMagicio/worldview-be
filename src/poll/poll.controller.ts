import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Query,
  Res,
  Delete,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { PollService } from './poll.service';
import { CreatePollDto, GetPollsDto } from './Poll.dto';

@Controller('poll')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Post()
  @UsePipes(ValidationPipe)
  create(@Body() createPollDto: CreatePollDto) {
    const userId = 2; // need to implement Auth
    return this.pollService.createPoll(userId, createPollDto);
  }

  @Get()
  @UsePipes(ValidationPipe)
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

  @Delete(':id')
  async deletePoll(@Param('id') id: number, @Res() res: Response) {
    const userId = 1; // need to implement Auth
    try {
      const poll = await this.pollService.deletePoll(userId, Number(id));

      return res.status(200).json({ message: 'Poll deleted', poll: poll });
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Internal server error', error: error.message });
    }
  }
}
