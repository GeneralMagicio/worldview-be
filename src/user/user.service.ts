import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ActionType, PollStatus, Prisma } from '@prisma/client';
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
import { DatabaseService } from '../database/database.service';
import { PollService } from '../poll/poll.service';
import {
  CreateUserDto,
  CreateUserResponseDto,
  EditVoteDto,
  EditVoteResponseDto,
  GetUserActivitiesDto,
  GetCountDto,
  GetUserDataDto,
  GetUserVotesDto,
  SetVoteDto,
  SetVoteResponseDto,
  UserActionDto,
  UserActivitiesResponseDto,
  UserDataResponseDto,
  UserVotesResponseDto,
} from './user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => PollService))
    private readonly pollService: PollService,
  ) {}

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

  async updateUserPollsCount(
    userId: number,
    type: ActionType,
    prismaClient?: Prisma.TransactionClient, // To ensure Prisma transaction function runs queries in order
  ) {
    const prisma = prismaClient || this.databaseService;
    const pollsCount = await prisma.userAction.count({
      where: { userId, type },
    });
    await prisma.user.update({
      where: { id: userId },
      data: {
        pollsCreatedCount: type === ActionType.CREATED ? pollsCount : undefined,
        pollsParticipatedCount:
          type === ActionType.VOTED ? pollsCount : undefined,
      },
    });
  }

  async getUserData(dto: GetUserDataDto): Promise<UserDataResponseDto> {
    const user = await this.databaseService.user.findUnique({
      where: { worldID: dto.worldID },
      select: {
        id: true,
        worldID: true,
        name: true,
        profilePicture: true,
        pollsCreatedCount: true,
        pollsParticipatedCount: true,
      },
    });
    if (!user) {
      throw new UserNotFoundException();
    }
    return {
      pollsCreated: user.pollsCreatedCount,
      pollsParticipated: user.pollsParticipatedCount,
      worldID: user.worldID,
      worldProfilePic: user.profilePicture,
      name: user.name,
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

    const filters: Prisma.UserActionWhereInput = {
      userId: user.id,
      poll: { status: PollStatus.PUBLISHED },
    };
    const now = new Date();

    if (dto.isActive || dto.isInactive) {
      if (dto.isActive && !dto.isInactive) {
        filters.poll = {
          status: PollStatus.PUBLISHED,
          endDate: { gte: now },
        };
      } else if (!dto.isActive && dto.isInactive) {
        filters.poll = {
          status: PollStatus.PUBLISHED,
          endDate: { lt: now },
        };
      } else {
        // If both are true or both are false, only filter by status
        filters.poll = { status: PollStatus.PUBLISHED };
      }
    }

    if (dto.isCreated || dto.isParticipated) {
      if (dto.isCreated && !dto.isParticipated) {
        filters.type = ActionType.CREATED;
      } else if (!dto.isCreated && dto.isParticipated) {
        filters.type = ActionType.VOTED;
      } else if (dto.isCreated && dto.isParticipated) {
        filters.OR = [{ type: ActionType.CREATED }, { type: ActionType.VOTED }];
      }
    }

    let pollIds: number[] | undefined;
    if (dto.search) {
      pollIds = await this.pollService['searchPolls'](dto.search);

      if (pollIds.length === 0) {
        return { userActions: [] };
      }

      // Add poll IDs to the filter
      if (filters.poll) {
        filters.poll.pollId = { in: pollIds };
      } else if (!filters.OR) {
        // Only add if we're not already using OR for types
        filters.poll = { pollId: { in: pollIds } };
      } else {
        // We have OR condition for types, need to add poll filter to each
        filters.OR = filters.OR.map((condition) => ({
          ...condition,
          poll: { pollId: { in: pollIds } },
        }));
      }
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
            participantCount: true,
          },
        },
      },
    });

    const actions: UserActionDto[] = await Promise.all(
      // TODO: it's a temporary work around, should add authorWorldId to UserAction later
      userActions.map(async (action) => {
        const author = await this.databaseService.user.findUnique({
          where: { id: action.poll.authorUserId },
          select: { worldID: true, name: true, profilePicture: true },
        });
        return {
          id: action.id,
          type: action.type,
          pollId: action.poll.pollId,
          pollTitle: action.poll.title || '',
          pollDescription: action.poll.description ?? '',
          endDate: action.poll.endDate ? action.poll.endDate.toISOString() : '',
          isActive: action.poll.endDate ? action.poll.endDate >= now : false,
          votersParticipated: action.poll.participantCount,
          authorWorldId: author?.worldID || '',
          authorName: author?.name || '',
          authorProfilePic: author?.profilePicture || null,
          createdAt: action.createdAt.toISOString(),
        };
      }),
    );
    return { userActions: actions };
  }

  async getUserVotes(
    dto: GetUserVotesDto,
    worldID: string,
  ): Promise<UserVotesResponseDto> {
    const user = await this.databaseService.user.findUnique({
      where: { worldID },
      select: { id: true },
    });
    if (!user) {
      throw new UserNotFoundException();
    }
    const poll = await this.databaseService.poll.findUnique({
      where: {
        pollId: dto.pollId,
        status: PollStatus.PUBLISHED,
      },
      select: { endDate: true, options: true },
    });
    if (!poll || (poll.endDate && poll.endDate < new Date())) {
      throw new PollNotFoundException();
    }
    const vote = await this.databaseService.vote.findFirst({
      where: {
        pollId: dto.pollId,
        userId: user.id,
      },
      select: {
        voteID: true,
        votingPower: true,
        weightDistribution: true,
      },
    });
    if (!vote) {
      throw new VoteNotFoundException();
    }
    return {
      voteID: vote.voteID,
      options: poll.options,
      votingPower: vote.votingPower,
      weightDistribution: vote.weightDistribution as Record<string, number>,
    };
  }

  async setVote(dto: SetVoteDto, worldID: string): Promise<SetVoteResponseDto> {
    const user = await this.databaseService.user.findUnique({
      where: { worldID },
      select: { id: true },
    });
    if (!user) {
      throw new UserNotFoundException();
    }
    const poll = await this.databaseService.poll.findUnique({
      where: {
        pollId: dto.pollId,
        status: PollStatus.PUBLISHED,
      },
      select: { endDate: true, options: true },
    });
    if (!poll || (poll.endDate && poll.endDate < new Date())) {
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
      await this.updateUserPollsCount(user.id, ActionType.VOTED, prisma);
      await this.pollService.updatePollParticipantCount(dto.pollId, prisma);
      return {
        voteID: vote.voteID,
        actionId: action.id,
      };
    });
  }

  async editVote(
    dto: EditVoteDto,
    worldID: string,
  ): Promise<EditVoteResponseDto> {
    const vote = await this.databaseService.vote.findUnique({
      where: { voteID: dto.voteID },
      select: {
        userId: true,
        pollId: true,
        poll: {
          select: { endDate: true, options: true, status: true },
        },
      },
    });
    if (!vote) {
      throw new VoteNotFoundException();
    }

    if (vote.poll.status !== PollStatus.PUBLISHED) {
      throw new PollNotFoundException();
    }

    if (vote.poll.endDate && vote.poll.endDate < new Date()) {
      throw new PollNotFoundException();
    }
    // TODO: should add worldID to Vote later
    const user = await this.databaseService.user.findUnique({
      where: { id: vote.userId },
      select: { worldID: true },
    });
    if (user?.worldID !== worldID) {
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

  async getUserCount(query: GetCountDto): Promise<number> {
    const { from, to } = query;
    const where: Prisma.UserWhereInput = {};

    console.log(from, to);

    if (from) {
      where.createdAt = { gte: new Date(from) };
    }

    if (to) {
      where.createdAt = { lte: new Date(to) };
    }

    return await this.databaseService.user.count({ where });
  }
}
