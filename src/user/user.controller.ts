import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { Public } from 'src/auth/jwt-auth.guard'
import { User } from 'src/auth/user.decorator'
import { GetCountDto } from '../common/common.dto'
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
} from './user.dto'
import { UserService } from './user.service'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('getUserData')
  async getUserData(
    @Query() query: GetUserDataDto,
  ): Promise<UserDataResponseDto> {
    return await this.userService.getUserData(query)
  }

  @Get('getUserActivities')
  async getUserActivities(
    @Query() query: GetUserActivitiesDto,
    @User('worldID') worldID: string,
  ): Promise<UserActivitiesResponseDto> {
    return await this.userService.getUserActivities(query, worldID)
  }

  @Get('getUserVotes')
  async getUserVotes(
    @Query() query: GetUserVotesDto,
    @User('worldID') worldID: string,
  ): Promise<UserVotesResponseDto> {
    return await this.userService.getUserVotes(query, worldID)
  }

  @Post('setVote')
  async setVote(
    @Body() dto: SetVoteDto,
    @User('worldID') worldID: string,
  ): Promise<SetVoteResponseDto> {
    return await this.userService.setVote(dto, worldID)
  }

  @Post('editVote')
  async editVote(
    @Body() dto: EditVoteDto,
    @User('worldID') worldID: string,
  ): Promise<EditVoteResponseDto> {
    return await this.userService.editVote(dto, worldID)
  }

  @Post('createUser')
  async createUser(@Body() dto: CreateUserDto): Promise<CreateUserResponseDto> {
    return await this.userService.createUser(dto)
  }

  @Get('count')
  @Public()
  async getUserCount(@Query() query: GetCountDto): Promise<number> {
    return await this.userService.getUserCount(query)
  }

  @Get('listAdmins')
  async listAdmins(): Promise<string[]> {
    return await this.userService.listAdmins()
  }
}
