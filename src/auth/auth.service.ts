import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  MiniAppWalletAuthSuccessPayload,
  verifySiweMessage,
} from '@worldcoin/minikit-js';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class AuthService {
  constructor(private readonly databaseService: DatabaseService) {}

  generateNonce(length: number = 8): string {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  async verifyPayload(payload: MiniAppWalletAuthSuccessPayload, nonce: string) {
    const validMessage = await verifySiweMessage(payload, nonce);
    return validMessage.isValid;
  }
}
