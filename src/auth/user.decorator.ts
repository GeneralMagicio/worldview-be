import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from './jwt-auth.guard';
import { Request } from 'express';

export const User = createParamDecorator(
  (field: keyof JwtPayload, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return field ? request.user?.[field] : request.user;
  },
);
