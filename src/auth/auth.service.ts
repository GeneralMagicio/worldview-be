import * as crypto from 'crypto'
import { Injectable } from '@nestjs/common'
import {
  MiniAppWalletAuthSuccessPayload,
  verifySiweMessage,
  SiweMessage,
} from '@worldcoin/minikit-js'
import { CreateUserException } from 'src/common/exceptions'
import { DatabaseService } from 'src/database/database.service'

interface IValidMessage {
  isValid: boolean
  siweMessageData: SiweMessage
}

@Injectable()
export class AuthService {
  constructor(private readonly databaseService: DatabaseService) {}

  generateNonce(length: number = 8): string {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
  }

  async verifyPayload(payload: MiniAppWalletAuthSuccessPayload, nonce: string) {
    const validMessage = (await verifySiweMessage(
      payload,
      nonce,
    )) as IValidMessage
    return validMessage.isValid
  }

  async createUser(worldID: string, name: string, profilePicture: string) {
    const user = await this.databaseService.user.upsert({
      where: { worldID },
      update: { name, profilePicture },
      create: { worldID, name, profilePicture },
    })

    if (!user) throw new CreateUserException()

    return user
  }
}
