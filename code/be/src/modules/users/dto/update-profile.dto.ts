import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from '../../../common/money';

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  displayName?: string;

  @IsOptional()
  @ApiPropertyOptional({ enum: SUPPORTED_CURRENCIES })
  @IsIn(SUPPORTED_CURRENCIES)
  defaultCurrency?: SupportedCurrency;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsIn(['OWED_SHARE', 'CASH_OUT_OF_POCKET'])
  personalReportMode?: 'OWED_SHARE' | 'CASH_OUT_OF_POCKET';
}
