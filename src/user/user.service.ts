import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
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
  UserActionDto,
  UserActivitiesResponseDto,
  UserDataResponseDto,
  UserVotesResponseDto,
} from './user.dto';
import { ActionType } from '@prisma/client';
import { VOTING_POWER } from '../common/constants';
import {
  CreateUserException,
  DuplicateVoteException,
  PollNotFoundException,
  UnauthorizedActionException,
  UserActionNotFoundException,
  UserNotFoundException,
  VoteNotFoundException,
  VoteOptionException,
} from '../common/exceptions';

type UserActionFilters = {
  userId: number;
  type?: ActionType;
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

  private validateWeightDistribution(
    weightDistribution: Record<string, number>,
    pollOptions: string[],
  ): void {
    const weightKeys = Object.keys(weightDistribution);
    const areWeightKeysMatching =
      weightKeys.length === pollOptions.length &&
      weightKeys.every((key) => pollOptions.includes(key));
    if (!areWeightKeysMatching) {
      throw new VoteOptionException(
        'Weight distribution keys do not match poll options exactly',
      );
    }
    const isPositiveWeight = Object.values(weightDistribution).every(
      (weight) => weight >= 0,
    );
    if (!isPositiveWeight) {
      throw new VoteOptionException(
        'Weight distribution values must be positive',
      );
    }
    const totalWeight = Object.values(weightDistribution).reduce(
      (acc, weight) => acc + weight,
      0,
    );
    if (totalWeight > VOTING_POWER) {
      throw new VoteOptionException(
        `Total weight distribution must be equal or lower than the voting power of ${VOTING_POWER}`,
      );
    }
  }

  async getUserData(dto: GetUserDataDto): Promise<UserDataResponseDto> {
    const user = await this.databaseService.user.findUnique({
      where: { worldID: dto.worldID },
      select: { id: true, worldID: true },
    });
    if (!user) {
      throw new UserNotFoundException();
    }
    const pollsCreated = await this.databaseService.userAction.count({
      where: {
        userId: user.id,
        type: ActionType.CREATED,
      },
    });
    const pollsParticipated = await this.databaseService.userAction.count({
      where: {
        userId: user.id,
        type: ActionType.VOTED,
      },
    });
    return {
      pollsCreated,
      pollsParticipated,
      worldID: user.worldID,
      worldProfilePic: null,
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
      throw new UserNotFoundException();
    }
    const filters: UserActionFilters = { userId: user.id };
    const now = new Date();
    if (dto.filter === 'active') {
      filters.poll = { endDate: { gte: now } };
    } else if (dto.filter === 'inactive') {
      filters.poll = { endDate: { lt: now } };
    } else if (dto.filter === 'created') {
      filters.type = ActionType.CREATED;
    } else if (dto.filter === 'participated') {
      filters.type = ActionType.VOTED;
    }
    const userActions = await this.databaseService.userAction.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        createdAt: true,
        poll: {
          select: {
            pollId: true,
            title: true,
            description: true,
            endDate: true,
            authorUserId: true,
          },
        },
      },
    });
    const actions: UserActionDto[] = await Promise.all(
      // TODO: it's a temporary work around, should add count to Poll and User and authorWorldId to UserAction later
      userActions.map(async (action) => {
        const participantCount = await this.databaseService.userAction.count({
          where: { pollId: action.poll.pollId, type: ActionType.VOTED },
        });
        const authorWorldId = await this.databaseService.user.findUnique({
          where: { id: action.poll.authorUserId },
          select: { worldID: true },
        });
        return {
          id: action.id,
          type: action.type,
          pollId: action.poll.pollId,
          pollTitle: action.poll.title,
          pollDescription: action.poll.description ?? '',
          endDate: action.poll.endDate,
          isActive: action.poll.endDate >= now,
          votersParticipated: participantCount,
          authorWorldId: authorWorldId?.worldID || '',
          createdAt: action.createdAt,
        };
      }),
    );
    return { userActions: actions };
  }

  async getUserVotes(dto: GetUserVotesDto): Promise<UserVotesResponseDto> {
    const user = await this.databaseService.user.findUnique({
      where: { worldID: dto.worldID },
      select: { id: true },
    });
    if (!user) {
      throw new UserNotFoundException();
    }
    const poll = await this.databaseService.poll.findUnique({
      where: { pollId: dto.pollId },
      select: { endDate: true, options: true },
    });
    if (!poll || poll.endDate < new Date()) {
      throw new PollNotFoundException();
    }
    const vote = await this.databaseService.vote.findFirst({
      where: {
        pollId: dto.pollId,
        userId: user.id,
      },
      select: { votingPower: true, weightDistribution: true },
    });
    if (!vote) {
      throw new VoteNotFoundException();
    }
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
      throw new UserNotFoundException();
    }
    const poll = await this.databaseService.poll.findUnique({
      where: { pollId: dto.pollId },
      select: { endDate: true, options: true },
    });
    if (!poll || poll.endDate < new Date()) {
      throw new PollNotFoundException();
    }
    this.validateWeightDistribution(dto.weightDistribution, poll.options);
    const existingVote = await this.databaseService.vote.findFirst({
      where: {
        pollId: dto.pollId,
        userId: user.id,
      },
    });
    if (existingVote) {
      throw new DuplicateVoteException();
    }
    return this.databaseService.$transaction(async (prisma) => {
      const vote = await prisma.vote.create({
        data: {
          userId: user.id,
          pollId: dto.pollId,
          votingPower: VOTING_POWER,
          weightDistribution: dto.weightDistribution,
          proof: '', // Implement Bandada proof in next phase
        },
      });
      const action = await prisma.userAction.create({
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
    });
  }

  async editVote(dto: EditVoteDto): Promise<EditVoteResponseDto> {
    const vote = await this.databaseService.vote.findUnique({
      where: { voteID: dto.voteID },
      select: {
        userId: true,
        poll: {
          select: { endDate: true, options: true },
        },
      },
    });
    if (!vote) {
      throw new VoteNotFoundException();
    }
    if (vote.poll.endDate < new Date()) {
      throw new PollNotFoundException();
    }
    // TODO: should add worldID to Vote later
    const user = await this.databaseService.user.findUnique({
      where: { id: vote.userId },
      select: { worldID: true },
    });
    if (user?.worldID !== dto.worldID) {
      throw new UnauthorizedActionException();
    }
    this.validateWeightDistribution(dto.weightDistribution, vote.poll.options);
    return this.databaseService.$transaction(async (prisma) => {
      const updatedVote = await prisma.vote.update({
        where: { voteID: dto.voteID },
        data: {
          weightDistribution: dto.weightDistribution,
        },
      });
      const userAction = await prisma.userAction.findFirst({
        where: {
          userId: vote.userId,
          pollId: updatedVote.pollId,
          type: ActionType.VOTED,
        },
        select: { id: true },
      });
      if (!userAction) {
        throw new UserActionNotFoundException();
      }
      return {
        actionId: userAction.id,
      };
    });
  }

  async createUser(dto: CreateUserDto): Promise<CreateUserResponseDto> {
    return this.databaseService.$transaction(async (prisma) => {
      const existingUser = await prisma.user.findUnique({
        where: { worldID: dto.worldID },
        select: { id: true },
      });
      if (existingUser) {
        return {
          userId: existingUser.id,
        };
      }
      const newUser = await prisma.user.create({
        data: {
          name: dto.name,
          worldID: dto.worldID,
          profilePicture: dto.profilePicture || null,
        },
      });
      if (!newUser) {
        throw new CreateUserException();
      }
      return {
        userId: newUser.id,
      };
    });
  }
}
