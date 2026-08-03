import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from './authenticated-request';
import { extractBearerToken, JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => key),
  } as unknown as ConfigService;

  it('extracts a single bearer token strictly', () => {
    expect(extractBearerToken('Bearer token-value')).toBe('token-value');
    expect(extractBearerToken('bearer token-value')).toBe('token-value');
    expect(extractBearerToken('Basic token-value')).toBeUndefined();
    expect(extractBearerToken('Bearer token value')).toBeUndefined();
  });

  it('allows explicitly public routes without a token', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const jwtService = { verifyAsync: jest.fn() } as unknown as JwtService;
    const guard = new JwtAuthGuard(reflector, jwtService, configService);

    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(
      true,
    );
  });

  it('attaches only a complete access-token principal', async () => {
    const request = { headers: { authorization: 'Bearer valid' } };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        typ: 'access',
        sub: 'user-id',
        sid: 'session-id',
        jti: 'token-id',
      }),
    } as unknown as JwtService;
    const guard = new JwtAuthGuard(reflector, jwtService, configService);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request).toMatchObject({
      auth: {
        userId: 'user-id',
        sessionId: 'session-id',
        tokenId: 'token-id',
      },
    });
  });

  it('uses one generic error for absent and invalid tokens', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const jwtService = {
      verifyAsync: jest.fn().mockRejectedValue(new Error('bad signature')),
    } as unknown as JwtService;
    const guard = new JwtAuthGuard(reflector, jwtService, configService);

    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toEqual(
      new UnauthorizedException('Authentication required.'),
    );
    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer invalid' } }),
      ),
    ).rejects.toEqual(
      new UnauthorizedException('Authentication required.'),
    );
  });
});

function contextFor(
  request: Pick<AuthenticatedRequest, 'headers'>,
): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}
