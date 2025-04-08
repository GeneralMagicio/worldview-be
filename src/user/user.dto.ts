import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  type: 'created' | 'voted';
  pollId: number;
  pollTitle: string;
  pollDescription: string;
  endDate: Date;
  votersParticipated: number;
  authorUserId: number;
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
  pollId: number;
  worldID: string;
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
