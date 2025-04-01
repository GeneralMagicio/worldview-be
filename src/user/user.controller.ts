import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserService } from './user.service';
import {
  GetUserActivitiesDto,
  GetUserDataDto,
  GetUserVotesDto,
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
}
