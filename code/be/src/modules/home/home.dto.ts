import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const HOME_RECENT_KINDS = [
  'PERSONAL_INCOME',
  'PERSONAL_EXPENSE',
  'SHARED_EXPENSE',
  'SHARED_SETTLEMENT',
] as const;

export class HomeUserDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  displayName!: string;
}

export class HomeLedgerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['DIRECT', 'GROUP'] })
  type!: 'DIRECT' | 'GROUP';

  @ApiProperty()
  name!: string;
}

export class HomeCategoryDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class HomeRecentItemDto {
  @ApiProperty({ enum: HOME_RECENT_KINDS })
  kind!: (typeof HOME_RECENT_KINDS)[number];

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ pattern: '^[1-9][0-9]*$' })
  amountMinor!: string;

  @ApiProperty({ type: HomeLedgerDto, nullable: true })
  ledger!: HomeLedgerDto | null;

  @ApiProperty({ type: HomeUserDto, nullable: true })
  actor!: HomeUserDto | null;

  @ApiProperty({ type: HomeCategoryDto, nullable: true })
  category!: HomeCategoryDto | null;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ type: HomeUserDto, nullable: true })
  from!: HomeUserDto | null;

  @ApiProperty({ type: HomeUserDto, nullable: true })
  to!: HomeUserDto | null;

  @ApiProperty({ type: String, format: 'date-time' })
  occurredAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class HomePersonalSummaryDto {
  @ApiProperty({ pattern: '^-?[0-9]+$' })
  monthNetMinor!: string;
}

export class HomeSharedSummaryDto {
  @ApiProperty({ pattern: '^-?[0-9]+$' })
  totalNetMinor!: string;

  @ApiProperty({ minimum: 0 })
  unsettledLedgerCount!: number;

  @ApiProperty({ minimum: 0 })
  peopleCount!: number;
}

export class HomeDto {
  @ApiProperty({ enum: ['PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR'] })
  currency!: string;

  @ApiProperty({ type: HomePersonalSummaryDto })
  personal!: HomePersonalSummaryDto;

  @ApiProperty({ type: HomeSharedSummaryDto })
  shared!: HomeSharedSummaryDto;

  @ApiProperty({ type: HomeRecentItemDto, isArray: true })
  recent!: HomeRecentItemDto[];
}
