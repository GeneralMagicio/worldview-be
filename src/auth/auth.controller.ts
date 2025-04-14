import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import {
  MiniAppWalletAuthSuccessPayload,
  ISuccessResult,
} from '@worldcoin/minikit-js';
import { JwtService } from './jwt.service';
import { Public } from './jwt-auth.guard';

interface IRequestPayload {
  walletPayload: MiniAppWalletAuthSuccessPayload;
  worldIdProof: ISuccessResult;
  nonce: string;
}

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
  @Post('verify-world-id')
  async verifyWorldId(
    @Req() _req: Request,
    @Body() body: IRequestPayload,
    @Res() res: Response,
  ) {
    const { walletPayload, worldIdProof, nonce } = body;

    if (!walletPayload || !worldIdProof || !nonce) {
      return res
        .status(400)
        .json({ isValid: false, message: 'Missing required fields' });
    }

    try {
      const validMessage = await this.authService.verifyPayload(
        walletPayload,
        nonce,
      );

      if (!validMessage) {
        return res
          .status(400)
          .json({ isValid: false, message: 'Signature verification failed' });
      }

      const user = await this.authService.createUser(
        worldIdProof.nullifier_hash,
        '',
      );

      const token = this.jwtService.sign({
        userId: user.id,
        worldID: worldIdProof?.nullifier_hash,
        address: walletPayload?.address,
      });

      return res.status(200).json({ isValid: true, token });
    } catch (error) {
      console.log('Error verifying payload:', error);
      if (error instanceof Error) {
        return res
          .status(400)
          .json({ status: 'error', isValid: false, message: error.message });
      } else {
        return res
          .status(400)
          .json({ status: 'error', isValid: false, message: 'Unknown error' });
      }
    }
  }
}
