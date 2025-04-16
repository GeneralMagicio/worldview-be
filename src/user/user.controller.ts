import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  CreateUserDto,
  CreateUserResponseDto,
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
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('getUserData')
  async getUserData(
    @Query() query: GetUserDataDto,
  ): Promise<UserDataResponseDto> {
    return await this.userService.getUserData(query);
  }

  @Get('getUserActivities')
  async getUserActivities(
    @Query() query: GetUserActivitiesDto,
  ): Promise<UserActivitiesResponseDto> {
    return await this.userService.getUserActivities(query);
  }

  @Get('getUserVotes')
  async getUserVotes(
    @Query() query: GetUserVotesDto,
  ): Promise<UserVotesResponseDto> {
    return await this.userService.getUserVotes(query);
  }

  @Post('setVote')
  async setVote(@Body() dto: SetVoteDto): Promise<SetVoteResponseDto> {
    return await this.userService.setVote(dto);
  }

  @Post('editVote')
  async editVote(@Body() dto: EditVoteDto): Promise<EditVoteResponseDto> {
    return await this.userService.editVote(dto);
  }

  @Post('createUser')
  async createUser(@Body() dto: CreateUserDto): Promise<CreateUserResponseDto> {
    return await this.userService.createUser(dto);
  }
}
