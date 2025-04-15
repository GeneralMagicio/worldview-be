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
import { handleError } from '../common/helpers';
import { CreatePollDto, DeletePollDto, GetPollsDto } from './Poll.dto';
import { PollService } from './poll.service';

@Controller('poll')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Post()
  async createPoll(@Body() dto: CreatePollDto) {
    try {
      return await this.pollService.createPoll(dto);
    } catch (error: unknown) {
      return handleError(error);
    }
  }

  @Get()
  async getPolls(
    @Req() req,
    @Query() query: GetPollsDto,
    @Res() res: Response,
  ) {
    try {
      const polls = await this.pollService.getPolls(query);
      return res.status(200).json(polls);
    } catch (error: unknown) {
      return handleError(error);
    }
  }

  @Get(':id')
  async getPollDetails(@Param('id') id: number, @Res() res: Response) {
    try {
      const poll = await this.pollService.getPollDetails(Number(id));
      return res.status(200).json(poll);
    } catch (error: unknown) {
      return handleError(error);
    }
  }

  @Delete(':id')
  async deletePoll(
    @Param('id') id: number,
    @Body() query: DeletePollDto,
    @Res() res: Response,
  ) {
    try {
      const poll = await this.pollService.deletePoll(Number(id), query);
      return res.status(200).json({ message: 'Poll deleted', poll: poll });
    } catch (error: unknown) {
      return handleError(error);
    }
  }
}
