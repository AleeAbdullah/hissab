import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../../../common/money';

const POSITIVE_MINOR_PATTERN = '^[1-9][0-9]*$';

class MutableSettlementFieldsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  fromUserId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toUserId!: string;

  @ApiProperty({ example: '1250', pattern: POSITIVE_MINOR_PATTERN })
  @IsString()
  @Matches(new RegExp(POSITIVE_MINOR_PATTERN))
  amountMinor!: string;

  @ApiProperty({ example: '2026-08-04T18:30:00.000Z', format: 'date-time' })
  @IsISO8601({ strict: true })
  occurredAt!: string;
}

export class CreateSettlementDto extends MutableSettlementFieldsDto {
  @ApiProperty({ enum: SUPPORTED_CURRENCIES, example: 'PKR' })
  @IsIn(SUPPORTED_CURRENCIES)
  currency!: SupportedCurrency;
}

export class ReplaceSettlementDto extends MutableSettlementFieldsDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class ListSettlementsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ maximum: 100, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class DeleteSettlementDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
