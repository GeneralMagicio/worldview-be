import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { handleError } from '../common/helpers';
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
    try {
      return await this.userService.getUserData(query);
    } catch (error: unknown) {
      return handleError(error);
    }
  }

  @Get('getUserActivities')
  async getUserActivities(
    @Query() query: GetUserActivitiesDto,
  ): Promise<UserActivitiesResponseDto> {
    try {
      return await this.userService.getUserActivities(query);
    } catch (error: unknown) {
      return handleError(error);
    }
  }

  @Get('getUserVotes')
  async getUserVotes(
    @Query() query: GetUserVotesDto,
  ): Promise<UserVotesResponseDto> {
    try {
      return await this.userService.getUserVotes(query);
    } catch (error: unknown) {
      return handleError(error);
    }
  }

  @Post('setVote')
  async setVote(@Body() dto: SetVoteDto): Promise<SetVoteResponseDto> {
    try {
      return await this.userService.setVote(dto);
    } catch (error: unknown) {
      return handleError(error);
    }
  }

  @Post('editVote')
  async editVote(@Body() dto: EditVoteDto): Promise<EditVoteResponseDto> {
    try {
      return await this.userService.editVote(dto);
    } catch (error: unknown) {
      return handleError(error);
    }
  }

  @Post('createUser')
  async createUser(@Body() dto: CreateUserDto): Promise<CreateUserResponseDto> {
    try {
      return await this.userService.createUser(dto);
    } catch (error: unknown) {
      return handleError(error);
    }
  }
}
