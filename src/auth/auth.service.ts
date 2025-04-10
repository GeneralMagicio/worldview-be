import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  MiniAppWalletAuthSuccessPayload,
  verifySiweMessage,
  SiweMessage,
} from '@worldcoin/minikit-js';
import { DatabaseService } from 'src/database/database.service';

interface IValidMessage {
  isValid: boolean;
  siweMessageData: SiweMessage;
}

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
    const validMessage = (await verifySiweMessage(
      payload,
      nonce,
    )) as IValidMessage;
    return validMessage.isValid;
  }

  async createUser(worldID: string, name: string) {
    let user = await this.databaseService.user.findUnique({
      where: { worldID },
    });

    if (!user) {
      user = await this.databaseService.user.create({
        data: {
          worldID,
          name,
        },
      });
    } else {
      await this.databaseService.user.update({
        where: { worldID },
        data: {
          name,
        },
      });
    }

    return user;
  }
}
