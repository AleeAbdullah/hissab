import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { LOCALES, type Locale } from '../../../common/locale';

export class RegisterDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @ApiPropertyOptional({ enum: LOCALES, default: 'en' })
  @IsIn(LOCALES)
  locale?: Locale;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(1024)
  password!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  deviceName?: string;
}
