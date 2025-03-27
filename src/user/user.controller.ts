// src/user/user.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { GetUserDataDto, UserDataResponseDto } from './user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('getUserData')
  async getUserData(
    @Query() query: GetUserDataDto,
  ): Promise<UserDataResponseDto> {
    return this.userService.getUserData(query);
  }
}
