import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  GetUserActivitiesDto,
  GetUserDataDto,
  UserDataResponseDto,
  UserActivitiesResponseDto,
  UserActionDto,
  GetUserVotesDto,
  UserVotesResponseDto,
  SetVoteDto,
  SetVoteResponseDto,
  EditVoteDto,
  EditVoteResponseDto,
} from './user.dto';
import { ActionType } from '@prisma/client';

const votingPower = 100; // Set as a constant for now

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
        id: true,
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
      id: action.id,
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

  async getUserVotes(dto: GetUserVotesDto): Promise<UserVotesResponseDto> {
    const user = await this.databaseService.user.findUnique({
      where: { worldID: dto.worldID },
      select: { id: true, worldID: true },
    });
    if (!user) {
      throw new Error('User not found');
    }
    if (user.worldID !== dto.worldID) {
      throw new Error('You are not authorized to view these votes');
    }
    const poll = await this.databaseService.poll.findUnique({
      where: { pollId: dto.pollId },
      select: { endDate: true, options: true },
    });
    if (!poll || poll.endDate < new Date()) {
      throw new Error('Poll is not active or does not exist');
    }
    const votes = await this.databaseService.vote.findMany({
      where: {
        pollId: dto.pollId,
        userId: user.id,
      },
      select: { votingPower: true, weightDistribution: true },
    });
    if (votes.length === 0) {
      throw new Error('Vote not found for the given poll and user');
    }
    const vote = votes[0];
    return {
      options: poll.options,
      votingPower: vote.votingPower,
      weightDistribution: vote.weightDistribution as Record<string, number>,
    };
  }

  async setVote(dto: SetVoteDto): Promise<SetVoteResponseDto> {
    const user = await this.databaseService.user.findUnique({
      where: { worldID: dto.worldID },
      select: { id: true },
    });
    if (!user) {
      throw new Error('User not found');
    }

    const poll = await this.databaseService.poll.findUnique({
      where: { pollId: dto.pollId },
      select: { endDate: true, options: true },
    });
    if (!poll || poll.endDate < new Date()) {
      throw new Error('Poll is not active or does not exist');
    }

    const vote = await this.databaseService.vote.create({
      data: {
        userId: user.id,
        pollId: dto.pollId,
        votingPower,
        weightDistribution: dto.weightDistribution,
        proof: '', // TODO implement Bandada proof later
      },
    });
    const action = await this.databaseService.userAction.create({
      data: {
        userId: user.id,
        pollId: dto.pollId,
        type: ActionType.VOTED,
      },
    });
    return {
      voteID: vote.voteID,
      actionId: action.id,
    };
  }

  async editVote(dto: EditVoteDto): Promise<EditVoteResponseDto> {
    const vote = await this.databaseService.vote.findUnique({
      where: { voteID: dto.voteID },
      select: {
        userId: true,
        poll: {
          select: { endDate: true },
        },
      },
    });
    if (!vote) {
      throw new Error('Vote not found');
    }
    if (vote.poll.endDate < new Date()) {
      throw new Error('Cannot edit vote for an inactive poll');
    }
    if (vote.userId !== dto.userId) {
      throw new Error('You are not authorized to edit this vote');
    }
    const updatedVote = await this.databaseService.vote.update({
      where: { voteID: dto.voteID },
      data: {
        weightDistribution: dto.weightDistribution,
      },
    });
    const userAction = await this.databaseService.userAction.findFirst({
      where: {
        userId: vote.userId,
        pollId: updatedVote.pollId,
        type: ActionType.VOTED,
      },
      select: { id: true },
    });
    if (!userAction) {
      throw new Error('User action not found');
    }
    return {
      actionId: userAction.id,
    };
  }
}
