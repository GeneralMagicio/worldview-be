import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';

interface IRequestPayload {
  payload: MiniAppWalletAuthSuccessPayload;
  nonce: string;
}
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('nonce')
  async generateNonce(@Res() res: Response): Promise<any> {
    const nonce = this.authService.generateNonce();
    res.cookie('siwe', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 2 * 60 * 1000, //2 minutes
    });

    return res.json({ nonce });
  }

  @Post('verifyPayload')
  async verifyPayload(
    @Req() req: Request,
    @Body() body: IRequestPayload,
    @Res() res: Response,
  ) {
    const { payload, nonce } = body;
    const storedNonce = req.cookies?.siwe;
    if (!storedNonce) {
      return res.status(400).json({
        status: 'error',
        isValid: false,
        message: 'No nonce found in cookies',
      });
    }
    if (nonce !== storedNonce) {
      return res
        .status(400)
        .json({ status: 'error', isValid: false, message: 'Invalid nonce' });
    }

    try {
      const validMessage = await this.authService.verifyPayload(payload, nonce);
      return res.status(200).json({ isValid: validMessage });
    } catch (error: any) {
      return res
        .status(400)
        .json({ status: 'error', isValid: false, message: error.message });
    }
  }
}
