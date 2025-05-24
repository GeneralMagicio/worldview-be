import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'
import { JwtPayload } from './jwt-auth.guard'

export const User = createParamDecorator(
  (field: keyof JwtPayload, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>()
    return field ? request.user?.[field] : request.user
  },
)
