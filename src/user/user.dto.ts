export class GetUserDataDto {
  worldID: string;
}

export class UserDataResponseDto {
  pollsCreated: number;
  pollsParticipated: number;
  worldID: string;
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
  pollID: number;
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
  voteID: string;
  weightDistribution: Record<string, number>;
}

export class EditVoteResponseDto {
  actionId: number;
}
