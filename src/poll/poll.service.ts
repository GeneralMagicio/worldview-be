import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ActionType, Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { UserService } from 'src/user/user.service';
import {
  PollNotFoundException,
  UnauthorizedActionException,
  UserNotFoundException,
} from '../common/exceptions';
import { CreatePollDto, GetPollsDto } from './Poll.dto';

@Injectable()
export class PollService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async updatePollParticipantCount(
    pollId: number,
    prismaClient?: Prisma.TransactionClient, // To ensure Prisma transaction function runs queries in order
  ) {
    const prisma = prismaClient || this.databaseService;
    const participantCount = await prisma.userAction.count({
      where: { pollId, type: ActionType.VOTED },
    });
    await prisma.poll.update({
      where: { pollId },
      data: { participantCount },
    });
  }

  private async searchPolls(searchTerm: string): Promise<number[]> {
    const searchQuery = searchTerm
      .split(' ')
      .map((word) => `${word}:*`)
      .join(' & ');
    const searchResults = await this.databaseService.$queryRaw<
      { pollId: number }[]
    >`
      SELECT "pollId" FROM "Poll"
      WHERE "searchVector" @@ to_tsquery('english', ${searchQuery})
      ORDER BY ts_rank("searchVector", to_tsquery('english', ${searchQuery})) DESC
    `;
    return searchResults.map((result) => result.pollId);
  }

  async createPoll(createPollDto: CreatePollDto, worldID: string) {
    const user = await this.databaseService.user.findUnique({
      where: { worldID },
    });
    if (!user) {
      throw new UserNotFoundException();
    }
    const startDate = new Date(createPollDto.startDate);
    // temporary fix by adding 1min for tiny delay in time from receiving the request
    const checkDate = new Date(startDate.getTime() + 60000);
    const endDate = new Date(createPollDto.endDate);
    const now = new Date();

    console.log('date', {
      checkDate,
      startDate,
      now,
    });

    if (checkDate < now) {
      throw new BadRequestException('Start date cannot be in the past');
    }
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }
    return this.databaseService.$transaction(async (tx) => {
      const newPoll = await tx.poll.create({
        data: {
          authorUserId: user.id,
          title: createPollDto.title,
          description: createPollDto.description,
          options: createPollDto.options,
          startDate,
          endDate,
          tags: createPollDto.tags || [],
          isAnonymous: createPollDto.isAnonymous || false,
          voteResults: {},
        },
      });
      await tx.userAction.create({
        data: {
          userId: user.id,
          pollId: newPoll.pollId,
          type: ActionType.CREATED,
        },
      });
      await this.userService.updateUserPollsCount(
        user.id,
        ActionType.CREATED,
        tx,
      );
      return newPoll;
    });
  }

  async getPolls(query: GetPollsDto, worldID: string) {
    const {
      page = 1,
      limit = 10,
      isActive,
      userVoted,
      userCreated,
      search,
      sortBy = 'endDate',
      sortOrder = 'asc',
    } = query;
    const skip = (page - 1) * limit;
    const now = new Date();
    const filters: Prisma.PollWhereInput = {};

    if (isActive) {
      filters.startDate = { lte: now };
      filters.endDate = { gt: now };
    }

    if (isActive === false) {
      filters.OR = [{ startDate: { gt: now } }, { endDate: { lte: now } }];
    }

    const user = await this.databaseService.user.findUnique({
      where: { worldID },
      select: { id: true },
    });

    if (!user) {
      throw new UserNotFoundException();
    }

    const userId = user.id;

    if (userCreated && userVoted) {
      const userVotes = await this.databaseService.vote.findMany({
        where: { userId },
        select: { pollId: true },
      });
      const votedPollIds = userVotes.map((v) => v.pollId);

      filters.OR = [{ authorUserId: userId }, { pollId: { in: votedPollIds } }];
    } else {
      if (userCreated) {
        filters.authorUserId = userId;
      }
      let votedPollIds: number[] = [];
      if (userVoted) {
        const userVotes = await this.databaseService.vote.findMany({
          where: { userId },
          select: { pollId: true },
        });
        votedPollIds = userVotes.map((v) => v.pollId);
        filters.pollId = { in: votedPollIds };
      }
    }

    if (search) {
      const pollIds = await this.searchPolls(search);
      if (Object.keys(filters).length > 0) {
        const currentFilters = { ...filters };
        filters.AND = [currentFilters, { pollId: { in: pollIds } }];
      } else {
        filters.pollId = { in: pollIds };
      }
    }

    const orderBy: Prisma.PollOrderByWithRelationInput = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.endDate = 'asc';
    }

    const [polls, total] = await this.databaseService.$transaction([
      this.databaseService.poll.findMany({
        where: filters,
        include: {
          author: true,
          votes: {
            where: { userId },
            select: { voteID: true },
          },
        },
        orderBy,
        skip,
        take: Number(limit),
      }),
      this.databaseService.poll.count({ where: filters }),
    ]);

    const pollsWithVoteStatus = polls.map((poll) => {
      const { votes, ...pollWithoutVotes } = poll;

      return {
        ...pollWithoutVotes,
        hasVoted: votes.length > 0,
      };
    });

    return {
      polls: pollsWithVoteStatus,
      total,
    };
  }

  async getPollDetails(id: number) {
    const poll = await this.databaseService.poll.findUnique({
      where: { pollId: id },
      include: {
        author: true,
      },
    });
    if (!poll) {
      throw new PollNotFoundException();
    }
    const now = new Date();
    const isActive = now >= poll.startDate && now <= poll.endDate;
    const optionsTotalVotes = await this.getPollQuadraticResults(id);
    const totalVotes = Object.values(optionsTotalVotes).reduce(
      (acc, votes) => acc + votes,
      0,
    );
    return { poll, isActive, optionsTotalVotes, totalVotes };
  }

  async deletePoll(pollId: number, worldID: string) {
    const user = await this.databaseService.user.findUnique({
      where: { worldID },
      select: { id: true },
    });
    if (!user) {
      throw new UserNotFoundException();
    }
    const poll = await this.databaseService.poll.findUnique({
      where: { pollId },
    });
    if (!poll) {
      throw new PollNotFoundException();
    }
    if (poll.authorUserId !== user.id) {
      throw new UnauthorizedActionException();
    }
    return this.databaseService.$transaction(async (tx) => {
      const pollParticipants = await tx.userAction.findMany({
        where: { pollId, type: ActionType.VOTED },
        select: { userId: true },
      });
      const participantUserIds = [
        ...new Set(pollParticipants.map((v) => v.userId)),
      ];
      const deleted = await tx.poll.delete({
        where: {
          pollId,
        },
      });
      await this.userService.updateUserPollsCount(
        deleted.authorUserId,
        ActionType.CREATED,
        tx,
      );
      for (const userId of participantUserIds) {
        await this.userService.updateUserPollsCount(
          userId,
          ActionType.VOTED,
          tx,
        );
      }
      return deleted;
    });
  }

  async getPollQuadraticResults(
    pollId: number,
  ): Promise<Record<string, number>> {
    const poll = await this.databaseService.poll.findUnique({
      where: { pollId },
      select: { options: true },
    });
    if (!poll) {
      throw new PollNotFoundException();
    }
    const votes = await this.databaseService.vote.findMany({
      where: { pollId },
      select: { quadraticWeights: true },
    });
    const result: Record<string, number> = poll.options.reduce(
      (acc, option) => {
        acc[option] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );
    votes.forEach((vote) => {
      if (vote.quadraticWeights) {
        Object.entries(vote.quadraticWeights as Record<string, number>).forEach(
          ([option, weight]) => {
            result[option] = (result[option] || 0) + weight;
          },
        );
      }
    });
    return result;
  }
}
