import { Injectable } from '@nestjs/common'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { JwtVerificationFailureException } from 'src/common/exceptions'

@Injectable()
export class JwtService {
  private readonly secret =
    process.env.JWT_SECRET ||
    (function () {
      throw new Error('JWT_SECRET environment variable must be set')
    })()
  private readonly expiresIn = '7d'

  sign(payload: object): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn })
  }

  verify(token: string): JwtPayload | string {
    try {
      return jwt.verify(token, this.secret)
    } catch (error) {
      console.error(error)
      throw new JwtVerificationFailureException()
    }
  }

  decode(token: string): null | JwtPayload | string {
    return jwt.decode(token)
  }
}
