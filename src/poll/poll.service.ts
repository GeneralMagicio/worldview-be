import { BadRequestException, Injectable } from '@nestjs/common';
import { ActionType, Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CreatePollDto, GetPollsDto } from './Poll.dto';

@Injectable()
export class PollService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createPoll(userId: number, createPollDto: CreatePollDto) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException('User does not exist');
    }
    const startDate = new Date(createPollDto.startDate);
    const endDate = new Date(createPollDto.endDate);
    const now = new Date();

    if (startDate < now) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.databaseService.$transaction(async (tx) => {
      // Create the poll
      const newPoll = await tx.poll.create({
        data: {
          authorUserId: userId,
          title: createPollDto.title,
          description: createPollDto.description,
          options: createPollDto.options,
          startDate,
          endDate,
          tags: createPollDto.tags || [],
          isAnonymous: createPollDto.isAnonymous || false,
          voteResults: {}, // Initialize empty vote results
        },
      });

      // Create user action for CREATED
      await tx.userAction.create({
        data: {
          userId,
          actionID: `created-${newPoll.pollId}-${userId}-${Date.now()}`,
          pollId: newPoll.pollId,
          type: ActionType.CREATED,
        },
      });

      // Update user's pollsCreatedCount
      await tx.user.update({
        where: { id: userId },
        data: {
          pollsCreatedCount: {
            increment: 1,
          },
        },
      });

      return newPoll;
    });
  }

  async getPolls(userId: number, query: GetPollsDto) {
    const {
      page = 1,
      limit = 10,
      isActive,
      userVoted,
      userCreated,
      sortBy = 'endDate',
      sortOrder = 'asc',
    } = query;
    const skip = (page - 1) * limit;
    const now = new Date();
    const filters: any = {};
    if (isActive) {
      filters.startDate = { lte: now };
      filters.endDate = { gt: now };
    }
    if (userCreated) {
      filters.authorUserId = userId;
    }

    // Get polls user voted in
    let votedPollIds: number[] = [];
    if (userVoted) {
      const userVotes = await this.databaseService.vote.findMany({
        where: { userId },
        select: { pollId: true },
      });
      votedPollIds = userVotes.map((v) => v.pollId);
      filters.pollId = { in: votedPollIds };
    }

    // Sorting options
    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.endDate = 'asc';
    }

    // Fetch polls with pagination
    const [polls, total] = await this.databaseService.$transaction([
      this.databaseService.poll.findMany({
        where: filters,
        orderBy,
        skip,
        take: Number(limit),
      }),
      this.databaseService.poll.count({ where: filters }),
    ]);

    return { polls, total };
  }

  async getPollDetails(id: number) {
    try {
      const poll = await this.databaseService.poll.findUnique({
        where: { pollId: id },
      });
      const user = await this.databaseService.user.findUnique({
        where: { id: poll?.authorUserId },
      });

      return { user, poll };
    } catch (error) {
      throw new Error('Database query failed');
    }
  }

  async deletePoll(pollId: number) {
    const poll = await this.databaseService.poll.findUnique({
      where: { pollId },
    });
    if (!poll) {
      throw new Error('Poll not found');
    }

    return this.databaseService.$transaction(async (tx) => {
      const deleted = await tx.poll.delete({
        where: {
          pollId,
        },
      });

      // Update user's pollsCreatedCount
      await tx.user.update({
        where: { id: deleted.authorUserId },
        data: {
          pollsCreatedCount: {
            decrement: 1,
          },
        },
      });

      return deleted;
    });
  }
}
