import { ActionType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Validate,
} from 'class-validator';
import { IsPositiveInteger, IsRecordStringNumber } from '../common/validators';

export class GetUserDataDto {
  @IsString()
  @IsNotEmpty()
  worldID: string;
}

export class UserDataResponseDto {
  @IsNumber()
  @IsNotEmpty()
  pollsCreated: number;

  @IsNumber()
  @IsNotEmpty()
  pollsParticipated: number;

  @IsString()
  @IsNotEmpty()
  worldID: string;

  @IsString()
  @IsOptional()
  worldProfilePic?: string | null;
}

export class GetUserActivitiesDto {
  @IsString()
  @IsNotEmpty()
  worldID: string;

  @IsEnum(['active', 'inactive', 'created', 'participated'])
  @IsOptional()
  filter?: 'active' | 'inactive' | 'created' | 'participated';

  @IsString()
  @IsOptional()
  search?: string;
}

export class UserActionDto {
  @IsInt()
  id: number;

  @IsEnum([ActionType.CREATED, ActionType.VOTED])
  type: ActionType;

  @IsInt()
  pollId: number;

  @IsString()
  pollTitle: string;

  @IsString()
  pollDescription: string;

  @IsDateString()
  endDate: string;

  @IsBoolean()
  isActive: boolean;

  @IsInt()
  votersParticipated: number;

  @IsString()
  authorWorldId: string;

  @IsDateString()
  createdAt: string;
}

export class UserActivitiesResponseDto {
  @IsArray()
  @Type(() => UserActionDto)
  userActions: UserActionDto[];
}

export class GetUserVotesDto {
  @IsNotEmpty()
  @Validate(IsPositiveInteger)
  @Transform(({ value }) => parseInt(value, 10))
  pollId: number;
}

export class UserVotesResponseDto {
  @IsNotEmpty()
  @IsString()
  voteID: string;

  @IsNotEmpty()
  @IsString({ each: true })
  options: string[];

  @IsNumber()
  @IsNotEmpty()
  votingPower: number;

  @Validate(IsRecordStringNumber)
  @IsOptional()
  weightDistribution?: Record<string, number>;
}

export class SetVoteDto {
  @IsNotEmpty()
  @Validate(IsPositiveInteger)
  pollId: number;

  @IsNotEmpty()
  @Validate(IsRecordStringNumber)
  weightDistribution: Record<string, number>;
}

export class SetVoteResponseDto {
  @IsNotEmpty()
  @IsString()
  voteID: string;

  @IsNotEmpty()
  @IsNumber()
  actionId: number;
}

export class EditVoteDto {
  @IsNotEmpty()
  @IsString()
  voteID: string;

  @IsNotEmpty()
  @Validate(IsRecordStringNumber)
  weightDistribution: Record<string, number>;
}

export class EditVoteResponseDto {
  @IsNotEmpty()
  @IsNumber()
  actionId: number;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  worldID: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;
}

export class CreateUserResponseDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;
}
