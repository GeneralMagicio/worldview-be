import { Injectable } from '@nestjs/common';
import { ActionType, Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { GetCountDto } from 'src/user/user.dto';

@Injectable()
export class VoteService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getVotesCount(query: GetCountDto) {
    const { from, to } = query;
    const where: Prisma.UserActionWhereInput = { type: ActionType.VOTED };

    if (from) {
      where.createdAt = { gte: from };
    }

    if (to) {
      where.createdAt = { lte: to };
    }

    return await this.databaseService.userAction.count({
      where: { type: ActionType.VOTED },
    });
  }
}
