import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  MiniAppWalletAuthSuccessPayload,
  ISuccessResult,
} from '@worldcoin/minikit-js';
import { Type } from 'class-transformer';

export class UserDetailsDto {
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  profilePicture: string;
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
}
