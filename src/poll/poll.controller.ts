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
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { PollService } from './poll.service';
import { CreatePollDto, DeletePollDto, GetPollsDto } from './Poll.dto';

@Controller('poll')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Post()
  @UsePipes(ValidationPipe)
  create(@Body() createPollDto: CreatePollDto) {
    return this.pollService.createPoll(createPollDto);
  }

  @Get()
  @UsePipes(ValidationPipe)
  async getPolls(
    @Req() req,
    @Query() query: GetPollsDto,
    @Res() res: Response,
  ) {
    try {
      const polls = await this.pollService.getPolls(query);
      return res.status(200).json(polls);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new BadRequestException(errorMessage);
    }
  }

  @Get(':id')
  async getPollDetails(@Param('id') id: number, @Res() res: Response) {
    try {
      const poll = await this.pollService.getPollDetails(Number(id));
      return res.status(200).json(poll);
    } catch (error) {
      if (error.message === 'Poll Id not found') {
        return res.status(404).json({ message: error.message });
      }

      return res
        .status(500)
        .json({ message: 'Internal server error', error: error.message });
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
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new BadRequestException(errorMessage);
    }
  }
}
