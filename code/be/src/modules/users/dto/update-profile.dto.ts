import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

import { LOCALES, type Locale } from '../../../common/locale';
import {
  DISPLAY_CURRENCIES,
  type DisplayCurrency,
} from '../../../common/display-currency';
import { IsAllowedText } from '../../../common/moderation/objectionable-text';

export class UpdateProfileDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @ApiPropertyOptional({ enum: LOCALES })
  @IsIn(LOCALES)
  locale?: Locale;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  @IsAllowedText()
  displayName?: string;

  @IsOptional()
  @ApiPropertyOptional({ enum: DISPLAY_CURRENCIES })
  @IsIn(DISPLAY_CURRENCIES)
  displayCurrency?: DisplayCurrency;
}
