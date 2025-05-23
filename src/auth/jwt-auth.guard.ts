import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { VerificationLevel } from '@worldcoin/minikit-js'
import { InsufficientVerificationLevelException } from 'src/common/exceptions'
import { JwtService } from './jwt.service'

export const IS_PUBLIC_KEY = 'isPublic'

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
export interface JwtPayload {
  userId: number
  worldID: string
  address: string
  verificationLevel: VerificationLevel
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly requiredVerificationLevel: VerificationLevel

  constructor(
    private reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    this.requiredVerificationLevel =
      (process.env.VERIFICATION_LEVEL?.toLowerCase() as VerificationLevel) ||
      VerificationLevel.Device
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request>()
    return this.validateRequest(request)
  }

  private validateRequest(request: Request): boolean {
    const authHeader = request.headers.authorization

    if (!authHeader) {
      throw new UnauthorizedException('Authentication required')
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Invalid authentication format. Expected Bearer token',
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()
    return this.validateToken(token, request)
  }

  private validateToken(token: string, request: Request): boolean {
    try {
      const payload = this.jwtService.verify(token) as JwtPayload
      request.user = payload

      this.validateVerificationLevel(payload.verificationLevel)

      return true
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }

      throw new UnauthorizedException('Invalid or expired authentication token')
    }
  }

  private validateVerificationLevel(
    userVerificationLevel: VerificationLevel,
  ): void {
    if (userVerificationLevel !== this.requiredVerificationLevel) {
      throw new InsufficientVerificationLevelException()
    }
  }
}
