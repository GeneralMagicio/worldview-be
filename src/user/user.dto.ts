import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsDate,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ActionType } from '@prisma/client';

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
  @IsNumber()
  @IsNotEmpty()
  pollId: number;

  @IsString()
  @IsNotEmpty()
  worldID: string;
}

@ValidatorConstraint({ name: 'IsRecordStringNumber', async: false })
export class IsRecordStringNumberConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    return Object.entries(value).every(
      ([key, val]) => typeof key === 'string' && typeof val === 'number',
    );
  }

  defaultMessage(): string {
    return 'weightDistribution must be a record with string keys and number values';
  }
}

export class UserVotesResponseDto {
  @IsNotEmpty()
  @IsString({ each: true })
  options: string[];

  @IsNumber()
  @IsNotEmpty()
  votingPower: number;

  @Validate(IsRecordStringNumberConstraint)
  @IsOptional()
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
  @Validate(IsRecordStringNumberConstraint)
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
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsString()
  voteID: string;

  @IsNotEmpty()
  @Validate(IsRecordStringNumberConstraint)
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
