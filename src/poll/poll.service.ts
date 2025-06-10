import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common'
import { ActionType, PollStatus, Prisma } from '@prisma/client'
import { DatabaseService } from 'src/database/database.service'
import { UserService } from 'src/user/user.service'
import { GetCountDto } from '../common/common.dto'
import {
  PollNotFoundException,
  UnauthorizedActionException,
  UserNotFoundException,
} from '../common/exceptions'
import {
  CreatePollDto,
  DraftPollDto,
  GetPollsDto,
  PollSortBy,
} from './Poll.dto'

const IS_VOTE_NORMALIZATION = process.env.ENABLE_VOTE_NORMALIZATION === 'true'

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
    const prisma = prismaClient || this.databaseService
    const participantCount = await prisma.userAction.count({
      where: { pollId, type: ActionType.VOTED },
    })
    await prisma.poll.update({
      where: { pollId },
      data: { participantCount },
    })
  }

  private mapPollsWithVoteStatus(
    polls: Array<{ votes: { voteID: string }[] } & Record<string, unknown>>,
  ) {
    return polls.map(poll => {
      const { votes, ...pollWithoutVotes } = poll
      return {
        ...pollWithoutVotes,
        hasVoted: votes.length > 0,
      }
    })
  }

  private async searchPolls(searchTerm: string): Promise<number[]> {
    const searchQuery = searchTerm
      .split(' ')
      .map(word => `${word}:*`)
      .join(' & ')
    const includeStatus = PollStatus.PUBLISHED
    const searchResults = await this.databaseService.$queryRaw<
      { pollId: number }[]
    >`
      SELECT "pollId" FROM "Poll"
      WHERE "searchVector" @@ to_tsquery('english', ${searchQuery})
      AND "status" = ${includeStatus}::text::"PollStatus"
      ORDER BY ts_rank("searchVector", to_tsquery('english', ${searchQuery})) DESC
    `
    return searchResults.map(result => result.pollId)
  }

  // Should be used only for creating published polls
  async createPoll(createPollDto: CreatePollDto, worldID: string) {
    const user = await this.databaseService.user.findUnique({
      where: { worldID },
    })
    if (!user) {
      throw new UserNotFoundException()
    }
    const startDate = new Date(createPollDto.startDate)
    // temporary fix by adding 1min for tiny delay in time from receiving the request
    const checkDate = new Date(startDate.getTime() + 60000)
    const endDate = new Date(createPollDto.endDate)
    const now = new Date()

    if (checkDate < now) {
      throw new BadRequestException('Start date cannot be in the past')
    }
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date')
    }
    return this.databaseService.$transaction(async tx => {
      // Delete all existing drafts
      await tx.poll.deleteMany({
        where: {
          authorUserId: user.id,
          status: PollStatus.DRAFT,
        },
      })
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
      })
      await tx.userAction.create({
        data: {
          userId: user.id,
          pollId: newPoll.pollId,
          type: ActionType.CREATED,
        },
      })
      await this.userService.updateUserPollsCount(
        user.id,
        ActionType.CREATED,
        tx,
      )
      return newPoll
    })
  }

  async patchDraftPoll(draftPollDto: DraftPollDto, worldID: string) {
    const user = await this.databaseService.user.findUnique({
      where: { worldID },
      select: { id: true },
    })
    if (!user) {
      throw new UserNotFoundException()
    }

    // Handle case with specified pollId
    if (draftPollDto.pollId) {
      // Update existing draft
      const existingPoll = await this.databaseService.poll.findUnique({
        where: { pollId: draftPollDto.pollId },
        select: { authorUserId: true, status: true },
      })

      if (!existingPoll) {
        throw new PollNotFoundException()
      }

      if (existingPoll.authorUserId !== user.id) {
        throw new UnauthorizedActionException()
      }

      if (existingPoll.status !== PollStatus.DRAFT) {
        throw new BadRequestException('Cannot update a published poll!')
      }

      const updateData: Prisma.PollUpdateInput = {}
      if (draftPollDto.title !== undefined)
        updateData.title = draftPollDto.title
      if (draftPollDto.description !== undefined)
        updateData.description = draftPollDto.description
      if (draftPollDto.options !== undefined)
        updateData.options = draftPollDto.options
      if (draftPollDto.startDate !== undefined)
        updateData.startDate = new Date(draftPollDto.startDate)
      if (draftPollDto.endDate !== undefined)
        updateData.endDate = new Date(draftPollDto.endDate)
      if (draftPollDto.tags !== undefined) updateData.tags = draftPollDto.tags
      if (draftPollDto.isAnonymous !== undefined)
        updateData.isAnonymous = draftPollDto.isAnonymous

      return await this.databaseService.poll.update({
        where: { pollId: draftPollDto.pollId },
        data: updateData,
      })
    } else {
      // For new drafts, use a transaction
      return this.databaseService.$transaction(async tx => {
        // Find existing drafts (if any)
        const existingDrafts = await tx.poll.findMany({
          where: { authorUserId: user.id, status: PollStatus.DRAFT },
          select: { pollId: true },
          orderBy: { creationDate: 'desc' },
        })

        // Prepare poll data
        const pollData = {
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
        }

        // Clean up multiple drafts if found
        if (existingDrafts.length > 1) {
          // Delete all but the most recent draft
          for (let i = 1; i < existingDrafts.length; i++) {
            await tx.poll.delete({
              where: { pollId: existingDrafts[i].pollId },
            })
          }
        }

        // Update existing draft or create new one
        if (existingDrafts.length > 0) {
          return await tx.poll.update({
            where: { pollId: existingDrafts[0].pollId },
            data: pollData,
          })
        } else {
          return await tx.poll.create({ data: pollData })
        }
      })
    }
  }

  async getUserDraftPoll(worldID: string) {
    const user = await this.databaseService.user.findUnique({
      where: { worldID },
      select: { id: true },
    })
    if (!user) {
      throw new UserNotFoundException()
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
    })
    return draft
  }

  private async executeQueryPollWithDualSorting(
    filters: Prisma.PollWhereInput,
    userId: number,
    limit: number,
    skip: number,
    activeFilters: Prisma.PollWhereInput,
    secondaryFilters: Prisma.PollWhereInput,
    activeOrderBy: Prisma.PollOrderByWithRelationInput,
    secondaryOrderBy: Prisma.PollOrderByWithRelationInput,
  ) {
    const [activePolls, secondaryPolls, total] =
      await this.databaseService.$transaction([
        this.databaseService.poll.findMany({
          where: activeFilters,
          include: {
            author: true,
            votes: {
              where: { userId },
              select: { voteID: true },
            },
          },
          orderBy: activeOrderBy,
          take: Number(limit) + skip,
        }),
        this.databaseService.poll.findMany({
          where: secondaryFilters,
          include: {
            author: true,
            votes: {
              where: { userId },
              select: { voteID: true },
            },
          },
          orderBy: secondaryOrderBy,
          take: Number(limit) + skip,
        }),
        this.databaseService.poll.count({ where: filters }),
      ])

    const combinedPolls = [...activePolls, ...secondaryPolls]
    const paginatedPolls = combinedPolls.slice(skip, skip + Number(limit))
    const pollsWithVoteStatus = this.mapPollsWithVoteStatus(paginatedPolls)

    return {
      polls: pollsWithVoteStatus,
      total,
    }
  }

  async getPolls(query: GetPollsDto, worldID: string) {
    const {
      page = 1,
      limit = 10,
      isActive,
      userVoted,
      userCreated,
      search,
      sortBy = PollSortBy.END_DATE,
      sortOrder = 'asc',
    } = query
    const skip = (page - 1) * limit
    const now = new Date()
    const filters: Prisma.PollWhereInput = {
      status: PollStatus.PUBLISHED,
    }

    if (isActive) {
      filters.startDate = { lte: now }
      filters.endDate = { gt: now }
    }

    if (isActive === false) {
      filters.OR = [{ startDate: { gt: now } }, { endDate: { lte: now } }]
    }

    const user = await this.databaseService.user.findUnique({
      where: { worldID },
      select: { id: true },
    })

    if (!user) {
      throw new UserNotFoundException()
    }

    const userId = user.id

    if (userCreated && userVoted) {
      const userVotes = await this.databaseService.vote.findMany({
        where: { userId },
        select: { pollId: true },
      })
      const votedPollIds = userVotes.map(v => v.pollId)

      // Create a copy of current filters to avoid overwriting status
      const currentFilters = { ...filters }
      filters.AND = [
        currentFilters,
        { OR: [{ authorUserId: userId }, { pollId: { in: votedPollIds } }] },
      ]
    } else {
      if (userCreated) {
        // Create a copy of current filters to avoid overwriting status
        const currentFilters = { ...filters }
        filters.AND = [currentFilters, { authorUserId: userId }]
      }

      if (userVoted) {
        const userVotes = await this.databaseService.vote.findMany({
          where: { userId },
          select: { pollId: true },
        })
        const votedPollIds = userVotes.map(v => v.pollId)

        // Create a copy of current filters to avoid overwriting status
        const currentFilters = { ...filters }
        filters.AND = [currentFilters, { pollId: { in: votedPollIds } }]
      }
    }

    if (search) {
      const pollIds = await this.searchPolls(search)
      if (!filters.AND) {
        // Create a copy of current filters to avoid overwriting status
        const currentFilters = { ...filters }
        filters.AND = [currentFilters, { pollId: { in: pollIds } }]
      } else {
        // Add to existing AND condition by creating a new array
        filters.AND = [
          ...(filters.AND as Prisma.PollWhereInput[]),
          { pollId: { in: pollIds } },
        ]
      }
    }

    let orderBy: Prisma.PollOrderByWithRelationInput[] = []

    if (sortBy === PollSortBy.END_DATE) {
      const activeFilters = {
        ...filters,
        startDate: { lte: now },
        endDate: { gt: now },
      }

      const inactiveFilters = {
        ...filters,
        OR: [{ startDate: { gt: now } }, { endDate: { lte: now } }],
      }

      return await this.executeQueryPollWithDualSorting(
        filters,
        userId,
        limit,
        skip,
        activeFilters,
        inactiveFilters,
        { endDate: sortOrder },
        { endDate: sortOrder },
      )
    } else if (sortBy === PollSortBy.PARTICIPANT_COUNT) {
      // For participantCount: show active polls first (by highest voter count), then ended polls
      const activeFilters = {
        ...filters,
        startDate: { lte: now },
        endDate: { gt: now },
      }

      const endedFilters = {
        ...filters,
        endDate: { lte: now },
      }

      return await this.executeQueryPollWithDualSorting(
        filters,
        userId,
        limit,
        skip,
        activeFilters,
        endedFilters,
        { participantCount: sortOrder },
        { participantCount: sortOrder },
      )
    } else if (sortBy === PollSortBy.CLOSEST_END_DATE) {
      // For closestEndDate: show active polls first (closest to ending), then ended polls
      const activeFilters = {
        ...filters,
        startDate: { lte: now },
        endDate: { gt: now },
      }

      const endedFilters = {
        ...filters,
        endDate: { lte: now },
      }

      return await this.executeQueryPollWithDualSorting(
        filters,
        userId,
        limit,
        skip,
        activeFilters,
        endedFilters,
        { endDate: 'asc' }, // Closest to ending first for active polls
        { endDate: 'desc' }, // Most recently ended first for ended polls
      )
    } else if (sortBy) {
      // creationDate or other sort types
      orderBy.push({
        [sortBy]: sortOrder,
      })

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
      ])

      const pollsWithVoteStatus = this.mapPollsWithVoteStatus(polls)

      return {
        polls: pollsWithVoteStatus,
        total,
      }
    } else {
      orderBy = [
        {
          endDate: 'asc',
        },
        {
          startDate: 'asc',
        },
      ]

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
      ])

      const pollsWithVoteStatus = this.mapPollsWithVoteStatus(polls)

      return {
        polls: pollsWithVoteStatus,
        total,
      }
    }
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
    })
    if (!poll) {
      throw new PollNotFoundException()
    }

    const now = new Date()
    const isActive =
      poll.startDate &&
      poll.endDate &&
      now >= poll.startDate &&
      now <= poll.endDate
    const optionsTotalVotes = await this.getPollQuadraticResults(id)
    const totalVotes = Object.values(optionsTotalVotes).reduce(
      (acc, votes) => acc + votes,
      0,
    )
    return { poll, isActive, optionsTotalVotes, totalVotes }
  }

  async deletePoll(pollId: number, worldID: string) {
    const user = await this.databaseService.user.findUnique({
      where: { worldID },
      select: { id: true, isAdmin: true },
    })
    if (!user) {
      throw new UserNotFoundException()
    }
    const poll = await this.databaseService.poll.findUnique({
      where: { pollId },
    })
    if (!poll) {
      throw new PollNotFoundException()
    }
    // Allow deletion if user is admin or if user is the poll author
    if (!user.isAdmin && poll.authorUserId !== user.id) {
      throw new UnauthorizedActionException()
    }

    return this.databaseService.$transaction(async tx => {
      // If it's a published poll, update user action counts
      if (poll.status === PollStatus.PUBLISHED) {
        const pollParticipants = await tx.userAction.findMany({
          where: { pollId, type: ActionType.VOTED },
          select: { userId: true },
        })
        const participantUserIds = [
          ...new Set(pollParticipants.map(v => v.userId)),
        ]

        const deleted = await tx.poll.delete({
          where: {
            pollId,
          },
        })

        await this.userService.updateUserPollsCount(
          deleted.authorUserId,
          ActionType.CREATED,
          tx,
        )

        for (const userId of participantUserIds) {
          await this.userService.updateUserPollsCount(
            userId,
            ActionType.VOTED,
            tx,
          )
        }

        return deleted
      } else {
        // If it's a draft poll, simply delete it without updating counts
        return await tx.poll.delete({
          where: {
            pollId,
          },
        })
      }
    })
  }

  async getPollVotes(pollId: number) {
    const poll = await this.databaseService.poll.findUnique({
      where: {
        pollId,
        status: PollStatus.PUBLISHED,
        isAnonymous: false, // Only return votes for non-anonymous polls
      },
      select: {
        pollId: true,
        title: true,
      },
    })

    if (!poll) {
      throw new PollNotFoundException()
    }
    const select = IS_VOTE_NORMALIZATION
      ? {
          normalizedQuadraticWeights: true,
          normalizedWeightDistribution: true,
          user: { select: { worldID: true, name: true } },
        }
      : {
          quadraticWeights: true,
          weightDistribution: true,
          user: { select: { worldID: true, name: true } },
        }
    const votes = await this.databaseService.vote.findMany({
      where: { pollId },
      select,
    })

    const formattedVotes = votes.map(vote => {
      const quadraticWeights = IS_VOTE_NORMALIZATION
        ? vote.normalizedQuadraticWeights
        : vote.quadraticWeights

      const totalQuadraticWeights = Object.values(
        quadraticWeights as Record<string, number>,
      ).reduce((sum, value) => sum + value, 0)
      return {
        username: vote.user.name,
        quadraticWeights,
        totalQuadraticWeights,
      }
    })

    return {
      votes: formattedVotes,
      pollTitle: poll.title,
      pollId: poll.pollId,
    }
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
    })
    if (!poll) {
      throw new PollNotFoundException()
    }
    const select = IS_VOTE_NORMALIZATION
      ? { normalizedQuadraticWeights: true }
      : { quadraticWeights: true }
    const votes = await this.databaseService.vote.findMany({
      where: { pollId },
      select,
    })
    const result: Record<string, number> = poll.options.reduce(
      (acc, option) => {
        acc[option] = 0
        return acc
      },
      {} as Record<string, number>,
    )
    votes.forEach(vote => {
      const weights = IS_VOTE_NORMALIZATION
        ? vote.normalizedQuadraticWeights
        : vote.quadraticWeights

      if (weights && typeof weights === 'object') {
        Object.entries(weights).forEach(([option, weight]) => {
          if (typeof weight === 'number') {
            result[option] = (result[option] || 0) + weight
          }
        })
      }
    })
    return result
  }

  async getPollsCount(query: GetCountDto): Promise<number> {
    const { from, to } = query
    const where: Prisma.PollWhereInput = {}

    if (from && to) {
      where.creationDate = { gte: new Date(from), lte: new Date(to) }
    } else if (from) {
      where.creationDate = { gte: new Date(from) }
    } else if (to) {
      where.creationDate = { lte: new Date(to) }
    }

    return await this.databaseService.poll.count({ where })
  }
}
