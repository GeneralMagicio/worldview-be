import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import {
  MiniAppWalletAuthSuccessPayload,
  ISuccessResult,
  VerificationLevel,
} from '@worldcoin/minikit-js';
import { Transform, Type } from 'class-transformer';

export class UserDetailsDto {
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  profilePictureUrl: string;
}
export class VerifyWorldIdDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Object)
  walletPayload: MiniAppWalletAuthSuccessPayload;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Object)
  worldIdProof: ISuccessResult;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Object)
  userDetails: UserDetailsDto;

  @IsNotEmpty()
  @IsString()
  nonce: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      value = value.toLowerCase();
    }
    return Object.values(VerificationLevel).includes(value as VerificationLevel)
      ? (value as VerificationLevel)
      : VerificationLevel.Device;
  })
  @IsEnum(VerificationLevel, {
    message: `Verification level must be one of: ${Object.values(VerificationLevel).join(', ')}`,
  })
  verificationLevel: VerificationLevel = VerificationLevel.Device;
}
