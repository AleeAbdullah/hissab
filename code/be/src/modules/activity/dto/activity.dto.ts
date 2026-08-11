import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';

export const ACTIVITY_AREAS = [
  'EXPENSE',
  'SETTLEMENT',
  'GROUP',
  'CONNECTION',
] as const;
export type ActivityArea = (typeof ACTIVITY_AREAS)[number];

export const ACTIVITY_EVENT_TYPES = {
  EXPENSE: ['EXPENSE_CREATED', 'EXPENSE_REPLACED', 'EXPENSE_DELETED'],
  SETTLEMENT: [
    'SETTLEMENT_CREATED',
    'SETTLEMENT_REPLACED',
    'SETTLEMENT_DELETED',
  ],
  GROUP: [
    'GROUP_CREATED',
    'GROUP_UPDATED',
    'GROUP_INVITATION_SENT',
    'GROUP_INVITATION_CANCELLED',
    'GROUP_INVITATION_ACCEPTED',
    'GROUP_INVITATION_DECLINED',
    'GROUP_MEMBER_LEFT',
    'GROUP_ARCHIVED',
  ],
  CONNECTION: [
    'CONNECTION_CREATED',
    'CONNECTION_ACCEPTED',
    'CONNECTION_DECLINED',
    'CONNECTION_CANCELLED',
    'CONNECTION_USER_BLOCKED',
    'CONNECTION_USER_UNBLOCKED',
  ],
} as const satisfies Record<ActivityArea, readonly string[]>;

export const ACTIVITY_EVENT_TYPE_VALUES =
  Object.values(ACTIVITY_EVENT_TYPES).flat();

export class ListActivityDto {
  @ApiPropertyOptional({ enum: ACTIVITY_AREAS })
  @IsOptional()
  @IsIn(ACTIVITY_AREAS)
  area?: ActivityArea;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ledgerId?: string;

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

export class ActivityUserDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  displayName!: string;
}

export class ActivityLedgerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['DIRECT', 'GROUP'] })
  type!: 'DIRECT' | 'GROUP';

  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED'] })
  status!: 'ACTIVE' | 'ARCHIVED';

  @ApiProperty()
  name!: string;
}

export class ActivityCategoryDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class ExpenseActivityDetailsDto {
  @ApiProperty({ minimum: 1 })
  version!: number;

  @ApiProperty({ pattern: '^[1-9][0-9]*$' })
  totalMinor!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: ActivityCategoryDto })
  category!: ActivityCategoryDto;

  @ApiProperty({ type: String, format: 'date-time' })
  occurredAt!: Date;
}

export class SettlementActivityDetailsDto {
  @ApiProperty({ minimum: 1 })
  version!: number;

  @ApiProperty({ pattern: '^[1-9][0-9]*$' })
  amountMinor!: string;

  @ApiProperty({ type: ActivityUserDto })
  from!: ActivityUserDto;

  @ApiProperty({ type: ActivityUserDto })
  to!: ActivityUserDto;

  @ApiProperty({ type: String, format: 'date-time' })
  occurredAt!: Date;
}

export class GroupActivityDetailsDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional({ type: ActivityUserDto })
  subjectUser?: ActivityUserDto;

  @ApiPropertyOptional({ enum: ['LAST_MEMBER_LEFT'] })
  reason?: 'LAST_MEMBER_LEFT';
}

export class ConnectionActivityDetailsDto {
  @ApiProperty({
    enum: [
      'PENDING',
      'ACCEPTED',
      'DECLINED',
      'CANCELLED',
      'BLOCKED',
      'UNBLOCKED',
    ],
  })
  status!:
    'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'BLOCKED' | 'UNBLOCKED';

  @ApiPropertyOptional({ format: 'uuid' })
  ledgerId?: string;
}

@ApiExtraModels(
  ExpenseActivityDetailsDto,
  SettlementActivityDetailsDto,
  GroupActivityDetailsDto,
  ConnectionActivityDetailsDto,
)
export class ActivityItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ACTIVITY_AREAS })
  area!: ActivityArea;

  @ApiProperty({
    enum: ACTIVITY_EVENT_TYPE_VALUES,
  })
  eventType!: string;

  @ApiProperty({ format: 'uuid' })
  aggregateId!: string;

  @ApiProperty({ type: ActivityUserDto, nullable: true })
  actor!: ActivityUserDto | null;

  @ApiProperty({ type: ActivityLedgerDto, nullable: true })
  ledger!: ActivityLedgerDto | null;

  @ApiProperty({ type: ActivityUserDto, nullable: true })
  counterparty!: ActivityUserDto | null;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(ExpenseActivityDetailsDto) },
      { $ref: getSchemaPath(SettlementActivityDetailsDto) },
      { $ref: getSchemaPath(GroupActivityDetailsDto) },
      { $ref: getSchemaPath(ConnectionActivityDetailsDto) },
    ],
  })
  details!:
    | ExpenseActivityDetailsDto
    | SettlementActivityDetailsDto
    | GroupActivityDetailsDto
    | ConnectionActivityDetailsDto;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class ActivityPageDto {
  @ApiProperty({ type: ActivityItemDto, isArray: true })
  items!: ActivityItemDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}
