import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Public } from '../../common/auth/public.decorator';
import { IdempotencyKey } from '../idempotency';
import { AuthService } from './auth.service';
import type { AuthRequestMetadata } from './auth.types';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  SignInDto,
} from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: RegisterDto,
    @Req() request: Request,
  ) {
    return this.auth.register(
      idempotencyKey,
      dto,
      metadata(request, dto.deviceName),
    );
  }

  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  signIn(
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: SignInDto,
    @Req() request: Request,
  ) {
    return this.auth.signIn(
      idempotencyKey,
      dto,
      metadata(request, dto.deviceName),
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: RefreshDto,
    @Req() request: Request,
  ) {
    return this.auth.refresh(idempotencyKey, dto, metadata(request));
  }

  @ApiBearerAuth()
  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  signOut(
    @CurrentUser() principal: AuthPrincipal,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.auth.signOut(
      principal.userId,
      principal.sessionId,
      idempotencyKey,
    );
  }

  @ApiBearerAuth()
  @Get('sessions')
  listSessions(@CurrentUser() principal: AuthPrincipal) {
    return this.auth.listSessions(principal.userId, principal.sessionId);
  }

  @ApiBearerAuth()
  @Delete('sessions')
  revokeOtherSessions(
    @CurrentUser() principal: AuthPrincipal,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.auth.revokeOtherSessions(
      principal.userId,
      principal.sessionId,
      idempotencyKey,
    );
  }

  @ApiBearerAuth()
  @Delete('sessions/:sessionId')
  revokeSession(
    @CurrentUser() principal: AuthPrincipal,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.auth.revokeSession(principal.userId, sessionId, idempotencyKey);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: ForgotPasswordDto,
    @Req() request: Request,
  ) {
    return this.auth.forgotPassword(idempotencyKey, dto, metadata(request));
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.auth.resetPassword(idempotencyKey, dto);
  }

  @ApiBearerAuth()
  @Patch('password')
  changePassword(
    @CurrentUser() principal: AuthPrincipal,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(principal.userId, idempotencyKey, dto);
  }
}

function metadata(request: Request, deviceName?: string): AuthRequestMetadata {
  return {
    deviceName,
    ipAddress: request.ip,
    userAgent: request.get('user-agent'),
  };
}
