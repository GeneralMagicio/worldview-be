import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Validate,
} from 'class-validator';
import { ActionType } from '@prisma/client';
import { Transform } from 'class-transformer';
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
}

export class UserActionDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsEnum([ActionType.CREATED, ActionType.VOTED])
  @IsNotEmpty()
  type: ActionType;

  @IsNumber()
  @IsNotEmpty()
  pollId: number;

  @IsString()
  @IsNotEmpty()
  pollTitle: string;

  @IsString()
  @IsNotEmpty()
  pollDescription: string;

  @IsDate()
  @IsNotEmpty()
  endDate: Date;

  @IsNumber()
  @IsNotEmpty()
  votersParticipated: number;

  @IsString()
  @IsNotEmpty()
  authorWorldId: string;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;
}

export class UserActivitiesResponseDto {
  @IsNotEmpty()
  userActions: UserActionDto[];
}

export class GetUserVotesDto {
  @IsNotEmpty()
  @Validate(IsPositiveInteger)
  @Transform(({ value }) => parseInt(value, 10))
  pollId: number;

  @IsString()
  @IsNotEmpty()
  worldID: string;
}

export class UserVotesResponseDto {
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
  @IsString()
  worldID: string;

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
  worldID: string;

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
