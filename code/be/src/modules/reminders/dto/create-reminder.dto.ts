import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReminderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  recipientUserId!: string;
}

export class ReminderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  ledgerId!: string;

  @ApiProperty({ format: 'uuid' })
  requesterUserId!: string;

  @ApiProperty({ format: 'uuid' })
  recipientUserId!: string;

  @ApiProperty({ pattern: '^[1-9][0-9]*$' })
  owedMinor!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class ReminderCooldownDetailsDto {
  @ApiProperty({ type: String, format: 'date-time' })
  retryAt!: string;
}

export class ReminderCooldownErrorDto {
  @ApiProperty({ enum: ['REMINDER_COOLDOWN'] })
  code!: 'REMINDER_COOLDOWN';

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: ReminderCooldownDetailsDto })
  details!: ReminderCooldownDetailsDto;
}

export class ReminderCooldownResponseDto {
  @ApiProperty({ type: ReminderCooldownErrorDto })
  error!: ReminderCooldownErrorDto;

  @ApiProperty({
    minLength: 1,
    maxLength: 128,
    pattern: '^[A-Za-z0-9._:-]+$',
  })
  requestId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp!: string;
}
