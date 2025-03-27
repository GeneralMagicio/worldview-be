// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { GetUserDataDto, UserDataResponseDto } from './user.dto';

@Injectable()
export class UserService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getUserData(dto: GetUserDataDto): Promise<UserDataResponseDto> {
    const user = await this.databaseService.user.findUnique({
      where: { worldID: dto.worldID },
      select: {
        pollsCreatedCount: true,
        pollsParticipatedCount: true,
        worldID: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      pollsCreated: user.pollsCreatedCount,
      pollsParticipated: user.pollsParticipatedCount,
      worldID: user.worldID,
    };
  }
}
