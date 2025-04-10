import { Injectable } from '@nestjs/common';
import jwt, { JwtPayload } from 'jsonwebtoken';

@Injectable()
export class JwtService {
  private readonly secret = process.env.JWT_SECRET || 'supersecret';
  private readonly expiresIn = '7d';

  sign(payload: object): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verify(token: string): JwtPayload | string {
    return jwt.verify(token, this.secret);
  }

  decode(token: string): null | { [key: string]: any } | string {
    return jwt.decode(token);
  }
}
