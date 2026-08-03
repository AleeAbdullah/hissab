import { createHmac, randomBytes, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class OpaqueTokenService {
  constructor(private readonly configService: ConfigService) {}

  generate(): string {
    return randomBytes(32).toString('base64url');
  }

  hash(token: string): string {
    return createHmac(
      'sha256',
      this.configService.getOrThrow<string>('TOKEN_HASH_SECRET'),
    )
      .update(token, 'utf8')
      .digest('hex');
  }
}

@Injectable()
export class AccessTokenService {
  readonly ttlSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.ttlSeconds = parsePositiveInteger(
      configService.get<string>('JWT_ACCESS_TTL_SECONDS') ?? '900',
      'JWT_ACCESS_TTL_SECONDS',
    );
  }

  async issue(
    userId: string,
    sessionId: string,
  ): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1_000);
    const token = await this.jwtService.signAsync(
      {
        sub: userId,
        sid: sessionId,
        jti: randomUUID(),
        typ: 'access',
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        issuer: this.configService.getOrThrow<string>('JWT_ISSUER'),
        audience: this.configService.getOrThrow<string>('JWT_AUDIENCE'),
        expiresIn: this.ttlSeconds,
      },
    );

    return { token, expiresAt };
  }
}

export function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}
