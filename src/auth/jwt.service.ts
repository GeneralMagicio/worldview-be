import { Injectable } from '@nestjs/common';
import jwt, { JwtPayload } from 'jsonwebtoken';

@Injectable()
export class JwtService {
  private readonly secret =
    process.env.JWT_SECRET ||
    (function () {
      throw new Error('JWT_SECRET environment variable must be set');
    })();
  private readonly expiresIn = '7d';

  sign(payload: object): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verify(token: string): JwtPayload | string {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`JWT verification failed: ${error.message}`);
      } else {
        throw new Error('JWT verification failed');
      }
    }
  }

  decode(token: string): null | { [key: string]: any } | string {
    return jwt.decode(token);
  }
}
