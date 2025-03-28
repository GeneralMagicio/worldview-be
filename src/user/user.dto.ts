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
  pollID: number;
  pollTitle: string;
  pollDescription: string;
  endDate: Date;
  isActive: boolean;
  votersParticipated: number;
  authorID: string;
}

export class UserActivitiesResponseDto {
  userActions: UserActionDto[];
}
