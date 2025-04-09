import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
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
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new BadRequestException(errorMessage);
    }
  }

  @Get('getUserActivities')
  async getUserActivities(
    @Query() query: GetUserActivitiesDto,
  ): Promise<UserActivitiesResponseDto> {
    try {
      return await this.userService.getUserActivities(query);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new BadRequestException(errorMessage);
    }
  }

  @Post('getUserVotes')
  async getUserVotes(
    @Body() body: GetUserVotesDto,
  ): Promise<UserVotesResponseDto> {
    try {
      return await this.userService.getUserVotes(body);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new BadRequestException(errorMessage);
    }
  }

  @Post('setVote')
  async setVote(@Body() dto: SetVoteDto): Promise<SetVoteResponseDto> {
    try {
      return await this.userService.setVote(dto);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new BadRequestException(errorMessage);
    }
  }

  @Post('editVote')
  async editVote(@Body() dto: EditVoteDto): Promise<EditVoteResponseDto> {
    try {
      return await this.userService.editVote(dto);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new BadRequestException(errorMessage);
    }
  }

  @Post('createUser')
  async createUser(@Body() dto: CreateUserDto): Promise<CreateUserResponseDto> {
    try {
      return await this.userService.createUser(dto);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new BadRequestException(errorMessage);
    }
  }
}
