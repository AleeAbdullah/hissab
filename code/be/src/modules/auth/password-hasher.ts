import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordHasher {
  private readonly dummyHash: Promise<string>;

  constructor() {
    this.dummyHash = this.hash(randomBytes(32).toString('base64url'));
  }

  hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 1,
    });
  }

  async verify(password: string, encodedHash?: string): Promise<boolean> {
    const hash = encodedHash ?? (await this.dummyHash);

    try {
      const matches = await argon2.verify(hash, password);
      return encodedHash !== undefined && matches;
    } catch {
      return false;
    }
  }
}
