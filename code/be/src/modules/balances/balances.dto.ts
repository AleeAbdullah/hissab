import { ApiProperty } from '@nestjs/swagger';

export class UserBalanceLedgerDto {
  @ApiProperty({ format: 'uuid' })
  ledgerId!: string;

  @ApiProperty({ enum: ['DIRECT', 'GROUP'] })
  ledgerType!: 'DIRECT' | 'GROUP';

  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED'] })
  ledgerStatus!: 'ACTIVE' | 'ARCHIVED';

  @ApiProperty({ pattern: '^-?[0-9]+$' })
  netMinor!: string;
}

export class UserBalancesDto {
  @ApiProperty({ pattern: '^-?[0-9]+$' })
  totalNetMinor!: string;

  @ApiProperty({ type: UserBalanceLedgerDto, isArray: true })
  ledgers!: UserBalanceLedgerDto[];
}

export class LedgerBalanceMemberDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ pattern: '^-?[0-9]+$' })
  netMinor!: string;
}

export class LedgerBalancesDto {
  @ApiProperty({ format: 'uuid' })
  ledgerId!: string;

  @ApiProperty({ type: LedgerBalanceMemberDto, isArray: true })
  members!: LedgerBalanceMemberDto[];
}
