import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { IdempotencyKey } from '../idempotency';
import {
  CreateReminderDto,
  ReminderCooldownResponseDto,
  ReminderDto,
} from './dto/create-reminder.dto';
import { RemindersService } from './reminders.service';

@ApiBearerAuth()
@ApiTags('reminders')
@Controller('ledgers/:ledgerId/reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Post()
  @ApiCreatedResponse({ type: ReminderDto })
  @ApiTooManyRequestsResponse({ type: ReminderCooldownResponseDto })
  createReminder(
    @CurrentUser() user: AuthPrincipal,
    @Param('ledgerId', ParseUUIDPipe) ledgerId: string,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: CreateReminderDto,
  ): Promise<ReminderDto> {
    return this.reminders.createReminder(
      user.userId,
      ledgerId,
      idempotencyKey,
      dto,
    );
  }
}
