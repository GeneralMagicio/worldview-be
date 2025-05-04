import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ActionType, PollStatus, Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { UserService } from 'src/user/user.service';
import {
  PollNotFoundException,
  UnauthorizedActionException,
  UserNotFoundException,
} from '../common/exceptions';
import { CreatePollDto, DraftPollDto, GetPollsDto } from './Poll.dto';

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
    const includeStatus = PollStatus.PUBLISHED;
    const searchResults = await this.databaseService.$queryRaw<
      { pollId: number }[]
    >`
      SELECT "pollId" FROM "Poll"
      WHERE "searchVector" @@ to_tsquery('english', ${searchQuery})
      AND "status" = ${includeStatus}::text::"PollStatus"
      ORDER BY ts_rank("searchVector", to_tsquery('english', ${searchQuery})) DESC
    `;
    return searchResults.map((result) => result.pollId);
  }

  // Should be used only for creatingpublished polls
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

  async patchDraftPoll(draftPollDto: DraftPollDto, worldID: string) {
    const user = await this.databaseService.user.findUnique({
      where: { worldID },
      select: { id: true },
    });
    if (!user) {
      throw new UserNotFoundException();
    }

    // Create new draft or update existing one
    if (draftPollDto.pollId) {
      // Update existing draft
      const existingPoll = await this.databaseService.poll.findUnique({
        where: { pollId: draftPollDto.pollId },
        select: { authorUserId: true, status: true },
      });

      if (!existingPoll) {
        throw new PollNotFoundException();
      }

      if (existingPoll.authorUserId !== user.id) {
        throw new UnauthorizedActionException();
      }

      if (existingPoll.status !== PollStatus.DRAFT) {
        throw new BadRequestException('Cannot update a published poll!');
      }

      const updateData: Prisma.PollUpdateInput = {};
      if (draftPollDto.title !== undefined)
        updateData.title = draftPollDto.title;
      if (draftPollDto.description !== undefined)
        updateData.description = draftPollDto.description;
      if (draftPollDto.options !== undefined)
        updateData.options = draftPollDto.options;
      if (draftPollDto.startDate !== undefined)
        updateData.startDate = new Date(draftPollDto.startDate);
      if (draftPollDto.endDate !== undefined)
        updateData.endDate = new Date(draftPollDto.endDate);
      if (draftPollDto.tags !== undefined) updateData.tags = draftPollDto.tags;
      if (draftPollDto.isAnonymous !== undefined)
        updateData.isAnonymous = draftPollDto.isAnonymous;

      return await this.databaseService.poll.update({
        where: { pollId: draftPollDto.pollId },
        data: updateData,
      });
    } else {
      // Create new draft poll without default values
      return await this.databaseService.poll.create({
        data: {
          authorUserId: user.id,
          title: draftPollDto.title,
          description: draftPollDto.description,
          options: draftPollDto.options || [],
          startDate: draftPollDto.startDate
            ? new Date(draftPollDto.startDate)
            : undefined,
          endDate: draftPollDto.endDate
            ? new Date(draftPollDto.endDate)
            : undefined,
          tags: draftPollDto.tags || [],
          isAnonymous: draftPollDto.isAnonymous || false,
          status: PollStatus.DRAFT,
          voteResults: {},
        },
      });
    }
  }

  async getUserDraftPoll(worldID: string) {
    const user = await this.databaseService.user.findUnique({
      where: { worldID },
      select: { id: true },
    });
    if (!user) {
      throw new UserNotFoundException();
    }
    // We should only have maximum one draft poll per user
    const draft = await this.databaseService.poll.findFirst({
      where: {
        authorUserId: user.id,
        status: PollStatus.DRAFT,
      },
      orderBy: {
        creationDate: 'desc',
      },
    });
    return draft;
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
    const filters: Prisma.PollWhereInput = {
      status: PollStatus.PUBLISHED,
    };

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

      // Create a copy of current filters to avoid overwriting status
      const currentFilters = { ...filters };
      filters.AND = [
        currentFilters,
        { OR: [{ authorUserId: userId }, { pollId: { in: votedPollIds } }] },
      ];
    } else {
      if (userCreated) {
        // Create a copy of current filters to avoid overwriting status
        const currentFilters = { ...filters };
        filters.AND = [currentFilters, { authorUserId: userId }];
      }

      if (userVoted) {
        const userVotes = await this.databaseService.vote.findMany({
          where: { userId },
          select: { pollId: true },
        });
        const votedPollIds = userVotes.map((v) => v.pollId);

        // Create a copy of current filters to avoid overwriting status
        const currentFilters = { ...filters };
        filters.AND = [currentFilters, { pollId: { in: votedPollIds } }];
      }
    }

    if (search) {
      const pollIds = await this.searchPolls(search);
      if (!filters.AND) {
        // Create a copy of current filters to avoid overwriting status
        const currentFilters = { ...filters };
        filters.AND = [currentFilters, { pollId: { in: pollIds } }];
      } else {
        // Add to existing AND condition by creating a new array
        filters.AND = [
          ...(filters.AND as Prisma.PollWhereInput[]),
          { pollId: { in: pollIds } },
        ];
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
      where: {
        pollId: id,
        status: PollStatus.PUBLISHED,
      },
      include: {
        author: true,
      },
    });
    if (!poll) {
      throw new PollNotFoundException();
    }

    const now = new Date();
    const isActive =
      poll.startDate &&
      poll.endDate &&
      now >= poll.startDate &&
      now <= poll.endDate;
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
      // If it's a published poll, update user action counts
      if (poll.status === PollStatus.PUBLISHED) {
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
      } else {
        // If it's a draft poll, simply delete it without updating counts
        return await tx.poll.delete({
          where: {
            pollId,
          },
        });
      }
    });
  }

  async getPollQuadraticResults(
    pollId: number,
  ): Promise<Record<string, number>> {
    const poll = await this.databaseService.poll.findUnique({
      where: {
        pollId,
        status: PollStatus.PUBLISHED,
      },
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
