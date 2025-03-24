import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { PollService } from './poll.service';
import { Prisma } from '@prisma/client';
import { CreatePollDto } from './createPoll.dto';

@Controller('poll')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Post()
  create(@Body() createPollDto: CreatePollDto) {
    let userId = 1; // need to implement Auth
    return this.pollService.createPoll(userId, createPollDto);
  }

  @Get()
  getPolls() {
    return this.pollService.getPolls();
  }

  @Get(':id')
  getPollDetails(@Param('id') id: string) {
    return this.pollService.getPollDetails(Number(id));
  }
}
