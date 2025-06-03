import { Injectable } from '@nestjs/common'
import { ActionType, Prisma } from '@prisma/client'
import { DatabaseService } from 'src/database/database.service'
import { GetCountDto } from '../common/common.dto'

@Injectable()
export class VoteService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getVotesCount(query: GetCountDto) {
    const { from, to } = query
    const where: Prisma.UserActionWhereInput = { type: ActionType.VOTED }

    if (from && to) {
      where.createdAt = { gte: new Date(from), lte: new Date(to) }
    } else if (from) {
      where.createdAt = { gte: new Date(from) }
    } else if (to) {
      where.createdAt = { lte: new Date(to) }
    }

    return await this.databaseService.userAction.count({
      where,
    })
  }
}
