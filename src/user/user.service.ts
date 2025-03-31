// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  GetUserActivitiesDto,
  GetUserDataDto,
  UserDataResponseDto,
  UserActivitiesResponseDto,
  UserActionDto,
} from './user.dto';

type UserActionFilters = {
  userId: number;
  type?: 'CREATED' | 'VOTED';
  poll?: {
    endDate?: {
      gte?: Date;
      lt?: Date;
    };
  };
};

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

  async getUserActivities(
    dto: GetUserActivitiesDto,
  ): Promise<UserActivitiesResponseDto> {
    const user = await this.databaseService.user.findUnique({
      where: { worldID: dto.worldID },
      select: { id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const filters: UserActionFilters = { userId: user.id };

    const now = new Date();
    if (dto.filter === 'active') {
      filters.poll = { endDate: { gte: now } };
    } else if (dto.filter === 'inactive') {
      filters.poll = { endDate: { lt: now } };
    } else if (dto.filter === 'created') {
      filters.type = 'CREATED';
    } else if (dto.filter === 'participated') {
      filters.type = 'VOTED';
    }

    const userActions = await this.databaseService.userAction.findMany({
      where: filters,
      orderBy: { poll: { endDate: 'desc' } },
      select: {
        type: true,
        poll: {
          select: {
            pollId: true,
            title: true,
            description: true,
            endDate: true,
            participantCount: true,
            authorUserId: true,
          },
        },
      },
    });

    const actions: UserActionDto[] = userActions.map((action) => ({
      type: action.type.toLowerCase() as 'created' | 'voted',
      pollId: action.poll.pollId,
      pollTitle: action.poll.title,
      pollDescription: action.poll.description ?? '',
      endDate: action.poll.endDate,
      isActive: action.poll.endDate >= now,
      votersParticipated: action.poll.participantCount,
      authorUserId: action.poll.authorUserId,
    }));

    return { userActions: actions };
  }
}
