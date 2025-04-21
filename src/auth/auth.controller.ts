import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { Public } from './jwt-auth.guard';
import { VerifyWorldIdDto } from './auth.dto';
import { SignatureVerificationFailureException } from 'src/common/exceptions';
import { BadRequestException } from '@nestjs/common';

function isHttps(req: Request) {
  return (
    req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https'
  );
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Get('nonce')
  generateNonce(@Req() req: Request, @Res() res: Response) {
    const nonce = this.authService.generateNonce();
    res.cookie('siwe', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || isHttps(req),
      sameSite: 'none',
      maxAge: 2 * 60 * 1000, //2 minutes
    });

    return res.json({ nonce });
  }

  @Public()
  @Post('verifyWorldId')
  async verifyWorldId(
    @Req() _req: Request,
    @Body() body: VerifyWorldIdDto,
    @Res() res: Response,
  ) {
    const { walletPayload, worldIdProof, nonce } = body;

    try {
      const isValid = await this.authService.verifyPayload(
        walletPayload,
        nonce,
      );

      if (!isValid) {
        throw new SignatureVerificationFailureException();
      }

      const worldID = worldIdProof?.nullifier_hash;
      const walletAddress = walletPayload?.address;

      const user = await this.authService.createUser(worldID, '');

      const token = this.jwtService.sign({
        userId: user.id,
        worldID,
        address: walletAddress,
      });

      return res.status(200).json({ isValid: true, token });
    } catch (error) {
      console.error(error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
