import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import { Request, Response } from 'express';
import { handleError } from '../common/helpers';
import { AuthService } from './auth.service';

interface IRequestPayload {
  payload: MiniAppWalletAuthSuccessPayload;
}

type RequestWithCookies = Request & {
  cookies: {
    siwe?: string;
  };
};

function isHttps(req: Request) {
  return (
    req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https'
  );
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Post('verifyPayload')
  async verifyPayload(
    @Req() req: RequestWithCookies,
    @Body() body: IRequestPayload,
    @Res() res: Response,
  ) {
    const { payload } = body;
    const storedNonce = req.cookies.siwe;
    if (!storedNonce) {
      return res.status(400).json({
        status: 'error',
        isValid: false,
        message: 'No nonce found in cookies',
      });
    }
    try {
      const validMessage = await this.authService.verifyPayload(
        payload,
        storedNonce,
      );
      return res.status(200).json({ isValid: validMessage });
    } catch (error: unknown) {
      return handleError(error);
    }
  }
}
