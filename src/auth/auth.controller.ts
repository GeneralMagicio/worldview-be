import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { JwtService } from './jwt.service'
import { Public } from './jwt-auth.guard'
import { VerifyWorldIdDto } from './auth.dto'
import {
  InsufficientVerificationLevelException,
  SignatureVerificationFailureException,
} from 'src/common/exceptions'
import { BadRequestException } from '@nestjs/common'
import { VerificationLevel } from '@worldcoin/minikit-js'
function isHttps(req: Request) {
  return (
    req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https'
  )
}

@Controller('auth')
export class AuthController {
  private readonly systemVerificationLevel: VerificationLevel

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {
    this.systemVerificationLevel =
      (process.env.VERIFICATION_LEVEL?.toLowerCase() as VerificationLevel) ||
      VerificationLevel.Device
  }

  @Public()
  @Get('nonce')
  generateNonce(@Req() req: Request, @Res() res: Response) {
    const nonce = this.authService.generateNonce()
    res.cookie('siwe', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || isHttps(req),
      sameSite: 'none',
      maxAge: 2 * 60 * 1000, //2 minutes
    })

    return res.json({ nonce })
  }

  @Public()
  @Post('verifyWorldId')
  async verifyWorldId(
    @Req() _req: Request,
    @Body() body: VerifyWorldIdDto,
    @Res() res: Response,
  ) {
    const {
      walletPayload,
      worldIdProof,
      userDetails,
      nonce,
      verificationLevel,
    } = body

    const isValid = await this.authService.verifyPayload(walletPayload, nonce)

    if (!isValid) {
      throw new SignatureVerificationFailureException()
    }

    if (verificationLevel !== this.systemVerificationLevel) {
      throw new InsufficientVerificationLevelException()
    }

    const worldID = worldIdProof?.nullifier_hash
    const walletAddress = walletPayload?.address

    const user = await this.authService.createUser(
      worldID,
      userDetails.username,
      userDetails.profilePictureUrl,
    )

    if (!user) {
      throw new BadRequestException('Failed to create user')
    }

    const token = this.jwtService.sign({
      userId: user.id,
      worldID,
      verificationLevel,
      address: walletAddress,
    })

    if (!token) {
      throw new BadRequestException('Failed to generate token')
    }

    return res.status(200).json({ isValid: true, token })
  }
}
