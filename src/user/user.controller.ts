import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserService } from './user.service';
import {
  EditVoteDto,
  EditVoteResponseDto,
  GetUserActivitiesDto,
  GetUserDataDto,
  GetUserVotesDto,
  SetVoteDto,
  SetVoteResponseDto,
  UserActivitiesResponseDto,
  UserDataResponseDto,
  UserVotesResponseDto,
} from './user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('getUserData')
  async getUserData(
    @Query() query: GetUserDataDto,
  ): Promise<UserDataResponseDto> {
    return this.userService.getUserData(query);
  }

  @Get('getUserActivities')
  async getUserActivities(
    @Query() query: GetUserActivitiesDto,
  ): Promise<UserActivitiesResponseDto> {
    return this.userService.getUserActivities(query);
  }

  @Post('getUserVotes')
  async getUserVotes(
    @Body() body: GetUserVotesDto,
  ): Promise<UserVotesResponseDto> {
    return this.userService.getUserVotes(body);
  }

  @Post('setVote')
  async setVote(@Body() dto: SetVoteDto): Promise<SetVoteResponseDto> {
    return this.userService.setVote(dto);
  }

  @Post('editVote')
  async editVote(@Body() dto: EditVoteDto): Promise<EditVoteResponseDto> {
    return this.userService.editVote(dto);
  }
}
