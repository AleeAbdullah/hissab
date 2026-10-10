import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

import {
  DISPLAY_CURRENCIES,
  type DisplayCurrency,
} from '../../../common/display-currency';

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  displayName?: string;

  @IsOptional()
  @ApiPropertyOptional({ enum: DISPLAY_CURRENCIES })
  @IsIn(DISPLAY_CURRENCIES)
  displayCurrency?: DisplayCurrency;
}
