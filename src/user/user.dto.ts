import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ActionType } from '@prisma/client';

export class GetUserDataDto {
  worldID: string;
}

export class UserDataResponseDto {
  pollsCreated: number;
  pollsParticipated: number;
  worldID: string;
  worldProfilePic?: string | null;
}

export class GetUserActivitiesDto {
  worldID: string;
  filter?: 'active' | 'inactive' | 'created' | 'participated';
}

export class UserActionDto {
  id: number;
  type: ActionType;
  pollId: number;
  pollTitle: string;
  pollDescription: string;
  endDate: Date;
  votersParticipated: number;
  authorWorldId: string;
  createdAt: Date;
}

export class UserActivitiesResponseDto {
  userActions: UserActionDto[];
}

export class GetUserVotesDto {
  pollId: number;
  worldID: string;
}

export class UserVotesResponseDto {
  options: string[];
  votingPower: number;
  weightDistribution?: Record<string, number>;
}

export class SetVoteDto {
  @IsNotEmpty()
  @IsNumber()
  pollId: number;

  @IsNotEmpty()
  @IsString()
  worldID: string;

  @IsNotEmpty()
  @IsObject()
  weightDistribution: Record<string, number>;
}

export class SetVoteResponseDto {
  voteID: string;
  actionId: number;
}

export class EditVoteDto {
  userId: number;
  voteID: string;
  weightDistribution: Record<string, number>;
}

export class EditVoteResponseDto {
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
  userId: number;
}
