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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { IdempotencyKey } from '../idempotency';
import {
  ListNotificationsDto,
  MarkAllNotificationsReadDto,
  NotificationDeviceDto,
  NotificationDto,
  NotificationPageDto,
  NotificationPreferencesDto,
  RegisterNotificationDeviceDto,
  UpdateNotificationPreferencesDto,
} from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiBearerAuth()
@ApiTags('notifications')
@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  @ApiOkResponse({ type: NotificationPageDto })
  listNotifications(
    @CurrentUser() user: AuthPrincipal,
    @Query() query: ListNotificationsDto,
  ): Promise<NotificationPageDto> {
    return this.notifications.listNotifications(user.userId, query);
  }

  @Patch('notifications/:notificationId/read')
  @ApiOkResponse({ type: NotificationDto })
  markNotificationRead(
    @CurrentUser() user: AuthPrincipal,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
    @IdempotencyKey() idempotencyKey: string,
  ): Promise<NotificationDto> {
    return this.notifications.markRead(
      user.userId,
      notificationId,
      idempotencyKey,
    );
  }

  @Post('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MarkAllNotificationsReadDto })
  markAllNotificationsRead(
    @CurrentUser() user: AuthPrincipal,
    @IdempotencyKey() idempotencyKey: string,
  ): Promise<MarkAllNotificationsReadDto> {
    return this.notifications.markAllRead(user.userId, idempotencyKey);
  }

  @Get('notification-preferences')
  @ApiOkResponse({ type: NotificationPreferencesDto })
  getNotificationPreferences(
    @CurrentUser() user: AuthPrincipal,
  ): Promise<NotificationPreferencesDto> {
    return this.notifications.getPreferences(user.userId);
  }

  @Patch('notification-preferences')
  @ApiOkResponse({ type: NotificationPreferencesDto })
  updateNotificationPreferences(
    @CurrentUser() user: AuthPrincipal,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    return this.notifications.updatePreferences(
      user.userId,
      idempotencyKey,
      dto,
    );
  }

  @Post('notification-devices')
  @ApiCreatedResponse({ type: NotificationDeviceDto })
  registerNotificationDevice(
    @CurrentUser() user: AuthPrincipal,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: RegisterNotificationDeviceDto,
  ): Promise<NotificationDeviceDto> {
    return this.notifications.registerDevice(user.userId, idempotencyKey, dto);
  }

  @Delete('notification-devices/:deviceId')
  @ApiOkResponse({ type: NotificationDeviceDto })
  revokeNotificationDevice(
    @CurrentUser() user: AuthPrincipal,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @IdempotencyKey() idempotencyKey: string,
  ): Promise<NotificationDeviceDto> {
    return this.notifications.revokeDevice(
      user.userId,
      deviceId,
      idempotencyKey,
    );
  }
}
