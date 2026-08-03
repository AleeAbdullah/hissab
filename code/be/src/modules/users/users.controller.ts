import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { IdempotencyKey } from '../idempotency';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser() principal: AuthPrincipal) {
    return this.users.getProfile(principal.userId);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() principal: AuthPrincipal,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(principal.userId, idempotencyKey, dto);
  }
}
