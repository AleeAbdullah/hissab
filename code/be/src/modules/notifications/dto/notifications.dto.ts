import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListNotificationsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @ApiPropertyOptional({ maximum: 100, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  expenseActivityEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  settlementActivityEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  socialActivityEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  remindersEnabled?: boolean;
}

export class RegisterNotificationDeviceDto {
  @ApiProperty({
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    maxLength: 512,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(512)
  @Matches(/^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/)
  token!: string;

  @ApiProperty({ enum: ['IOS', 'ANDROID'] })
  @IsIn(['IOS', 'ANDROID'])
  platform!: 'IOS' | 'ANDROID';

  @ApiPropertyOptional({
    description: 'Stable app-install identifier, not a hardware identifier.',
    maxLength: 255,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  deviceId?: string;
}

export class NotificationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  actorUserId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  ledgerId!: string | null;

  @ApiProperty({ enum: ['EXPENSE', 'SETTLEMENT', 'SOCIAL', 'REMINDER'] })
  kind!: 'EXPENSE' | 'SETTLEMENT' | 'SOCIAL' | 'REMINDER';

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  aggregateType!: string;

  @ApiProperty({ format: 'uuid' })
  aggregateId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  details!: Record<string, unknown>;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  readAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class NotificationPageDto {
  @ApiProperty({ type: [NotificationDto] })
  items!: NotificationDto[];

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;
}

export class NotificationPreferencesDto {
  @ApiProperty()
  pushEnabled!: boolean;

  @ApiProperty()
  expenseActivityEnabled!: boolean;

  @ApiProperty()
  settlementActivityEnabled!: boolean;

  @ApiProperty()
  socialActivityEnabled!: boolean;

  @ApiProperty()
  remindersEnabled!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class NotificationDeviceDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['IOS', 'ANDROID'] })
  platform!: 'IOS' | 'ANDROID';

  @ApiProperty({ nullable: true })
  deviceId!: string | null;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  lastSeenAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  revokedAt!: Date | null;
}

export class MarkAllNotificationsReadDto {
  @ApiProperty({ minimum: 0 })
  updatedCount!: number;
}
