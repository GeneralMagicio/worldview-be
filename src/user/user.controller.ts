// src/user/user.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { UserService } from './user.service';
import {
  GetUserActivitiesDto,
  GetUserDataDto,
  UserActivitiesResponseDto,
  UserDataResponseDto,
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
}
