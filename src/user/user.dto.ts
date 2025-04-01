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
