import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import {
  MiniAppWalletAuthSuccessPayload,
  ISuccessResult,
} from '@worldcoin/minikit-js';
import { Type } from 'class-transformer';

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
  @IsString()
  nonce: string;
}
