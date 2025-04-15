import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import { Request, Response } from 'express';
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

    return { nonce };
  }

  @Post('verifyPayload')
  async verifyPayload(
    @Req() req: RequestWithCookies,
    @Body() body: IRequestPayload,
  ) {
    const { payload } = body;
    const storedNonce = req.cookies.siwe;
    if (!storedNonce) {
      throw new BadRequestException('No nonce found in cookies');
    }
    const isValid = await this.authService.verifyPayload(payload, storedNonce);
    return { isValid };
  }
}
