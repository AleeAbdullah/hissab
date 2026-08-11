import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from './authenticated-request';
import { IS_PUBLIC_ROUTE } from './public.decorator';
import { SessionAuthorizationService } from './session-authorization.service';

interface AccessTokenPayload {
  sub?: unknown;
  sid?: unknown;
  jti?: unknown;
  typ?: unknown;
}

export function extractBearerToken(authorization: unknown): string | undefined {
  if (typeof authorization !== 'string') {
    return undefined;
  }

  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  return match?.[1];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessions: SessionAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw this.unauthorized();
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
          issuer: this.configService.getOrThrow<string>('JWT_ISSUER'),
          audience: this.configService.getOrThrow<string>('JWT_AUDIENCE'),
        },
      );

      if (
        payload.typ !== 'access' ||
        typeof payload.sub !== 'string' ||
        typeof payload.sid !== 'string' ||
        typeof payload.jti !== 'string'
      ) {
        throw this.unauthorized();
      }
      if (!(await this.sessions.isActive(payload.sub, payload.sid))) {
        throw this.unauthorized();
      }

      request.auth = {
        userId: payload.sub,
        sessionId: payload.sid,
        tokenId: payload.jti,
      };
      return true;
    } catch {
      throw this.unauthorized();
    }
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException('Authentication required.');
  }
}
