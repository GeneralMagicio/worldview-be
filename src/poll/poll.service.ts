import { BadRequestException, Injectable } from '@nestjs/common';
import { ActionType, Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CreatePollDto } from './createPoll.dto';

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

  async getPolls() {
    return this.databaseService.poll.findMany({});
  }

  async getPollDetails(id: number) {
    return this.databaseService.poll.findUnique({
      where: {
        pollId: id,
      },
    });
  }
}
