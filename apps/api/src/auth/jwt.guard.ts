import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtPayload } from './auth.service.js';

/**
 * Validates `Authorization: Bearer <jwt>` and stashes the decoded payload on
 * `req.user`. Reject anything other than an access token here so a leaked
 * refresh token can't access protected endpoints.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = auth.slice(7);
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Wrong token type');
      }
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

/**
 * `@CurrentUser()` injects the JwtPayload into a controller method param.
 * Always used together with `JwtAuthGuard`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    if (!req.user) {
      throw new UnauthorizedException('No user on request');
    }
    return req.user;
  },
);
