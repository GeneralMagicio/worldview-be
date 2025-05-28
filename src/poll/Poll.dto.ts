import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Validate,
} from 'class-validator'
import { IsPositiveInteger } from '../common/validators'

export enum PollSortBy {
  CREATION_DATE = 'creationDate',
  END_DATE = 'endDate',
  PARTICIPANT_COUNT = 'participantCount',
}

export class CreatePollDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsString()
  @IsNotEmpty()
  description: string

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  options: string[]

  @IsDateString()
  @IsNotEmpty()
  startDate: string

  @IsDateString()
  @IsNotEmpty()
  endDate: string

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  tags: string[]

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean
}

export class DraftPollDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[]

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean

  @IsOptional()
  @Validate(IsPositiveInteger)
  @Transform(({ value }) => (value ? parseInt(value as string, 10) : undefined))
  pollId?: number
}

export class GetPollsDto {
  @IsString()
  @IsOptional()
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  userVoted?: boolean

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  userCreated?: boolean

  @IsOptional()
  @IsEnum(PollSortBy)
  sortBy?: PollSortBy

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc'
}

export class GetPollVotesDto {
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  pollId: number
}
