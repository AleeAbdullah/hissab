import { Module } from '@nestjs/common';
import { SessionAuthorizationService } from '../../common/auth';
import { IdempotencyModule } from '../idempotency';
import { OutboxModule } from '../outbox';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { PasswordHasher } from './password-hasher';
import { AccessTokenService, OpaqueTokenService } from './token.service';

@Module({
  imports: [IdempotencyModule, OutboxModule],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthService,
    PasswordHasher,
    OpaqueTokenService,
    AccessTokenService,
    SessionAuthorizationService,
  ],
  exports: [AuthRepository, PasswordHasher, SessionAuthorizationService],
})
export class AuthModule {}
