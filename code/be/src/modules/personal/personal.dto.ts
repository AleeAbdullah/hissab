import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { SHARED_EXPENSE_CATEGORY_CODES } from '../expenses/dto/expenses.dto';

export const PERSONAL_INCOME_CATEGORY_CODES = [
  'SALARY',
  'FREELANCE',
  'BUSINESS',
  'GIFTS',
  'REFUNDS',
  'OTHER_INCOME',
] as const;

export const PERSONAL_CATEGORY_CODES = [
  ...SHARED_EXPENSE_CATEGORY_CODES,
  ...PERSONAL_INCOME_CATEGORY_CODES,
] as const;

export type PersonalTransactionType = 'INCOME' | 'EXPENSE';

const POSITIVE_MINOR_PATTERN = '^[1-9][0-9]*$';

class MutablePersonalTransactionDto {
  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  @IsIn(['INCOME', 'EXPENSE'])
  type!: PersonalTransactionType;

  @ApiProperty({ example: '2500', pattern: POSITIVE_MINOR_PATTERN })
  @IsString()
  @Matches(new RegExp(POSITIVE_MINOR_PATTERN))
  amountMinor!: string;

  @ApiProperty({ enum: PERSONAL_CATEGORY_CODES })
  @IsIn(PERSONAL_CATEGORY_CODES)
  categoryCode!: (typeof PERSONAL_CATEGORY_CODES)[number];

  @ApiProperty({ example: 'Monthly salary', maxLength: 200 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  @ApiProperty({ example: '2026-08-04T18:30:00.000Z', format: 'date-time' })
  @IsISO8601({ strict: true })
  occurredAt!: string;

  @ApiPropertyOptional({ maxLength: 200, nullable: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  merchantOrSource?: string | null;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  notes?: string | null;
}

export class CreatePersonalTransactionDto extends MutablePersonalTransactionDto {}

export class ReplacePersonalTransactionDto extends MutablePersonalTransactionDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

class PersonalTransactionFiltersDto {
  @ApiPropertyOptional({
    description: 'Inclusive occurrence-time boundary.',
    format: 'date-time',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({
    description: 'Exclusive occurrence-time boundary.',
    format: 'date-time',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @ApiPropertyOptional({ enum: ['INCOME', 'EXPENSE'] })
  @IsOptional()
  @IsIn(['INCOME', 'EXPENSE'])
  type?: PersonalTransactionType;

  @ApiPropertyOptional({ enum: PERSONAL_CATEGORY_CODES })
  @IsOptional()
  @IsIn(PERSONAL_CATEGORY_CODES)
  categoryCode?: (typeof PERSONAL_CATEGORY_CODES)[number];
}

export class ListPersonalTransactionsDto extends PersonalTransactionFiltersDto {
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

export class PersonalReportDto extends PersonalTransactionFiltersDto {
  @ApiPropertyOptional({
    enum: ['OWED_SHARE', 'CASH_OUT_OF_POCKET'],
    description: 'Defaults to the user profile preference.',
  })
  @IsOptional()
  @IsIn(['OWED_SHARE', 'CASH_OUT_OF_POCKET'])
  mode?: 'OWED_SHARE' | 'CASH_OUT_OF_POCKET';

  @ApiPropertyOptional({ enum: ['DAY', 'MONTH'], default: 'MONTH' })
  @IsOptional()
  @IsIn(['DAY', 'MONTH'])
  bucket?: 'DAY' | 'MONTH';
}

export class DeletePersonalTransactionDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class PersonalCategoryDto {
  @ApiProperty({ enum: PERSONAL_CATEGORY_CODES })
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  kind!: PersonalTransactionType;
}

export class PersonalTransactionCategoryDto {
  @ApiProperty({ enum: PERSONAL_CATEGORY_CODES })
  code!: string;

  @ApiProperty()
  name!: string;
}

export class PersonalTransactionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  type!: PersonalTransactionType;

  @ApiProperty({ pattern: POSITIVE_MINOR_PATTERN })
  amountMinor!: string;

  @ApiProperty({ type: PersonalTransactionCategoryDto })
  category!: PersonalTransactionCategoryDto;

  @ApiProperty()
  description!: string;

  @ApiProperty({ nullable: true })
  merchantOrSource!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  occurredAt!: Date;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty({ enum: ['ACTIVE', 'DELETED'] })
  status!: 'ACTIVE' | 'DELETED';

  @ApiProperty({ minimum: 1 })
  version!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class PersonalTransactionPageDto {
  @ApiProperty({ type: [PersonalTransactionDto] })
  items!: PersonalTransactionDto[];

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;
}

export class PersonalReportBucketDto {
  @ApiProperty({ example: '2026-08' })
  period!: string;

  @ApiProperty({ pattern: '^-?[0-9]+$' })
  incomeMinor!: string;

  @ApiProperty({ pattern: '^-?[0-9]+$' })
  expenseMinor!: string;

  @ApiProperty({ pattern: '^-?[0-9]+$' })
  netMinor!: string;
}

export class PersonalReportSummaryDto {
  @ApiProperty({ pattern: '^-?[0-9]+$' })
  incomeMinor!: string;

  @ApiProperty({ pattern: '^-?[0-9]+$' })
  expenseMinor!: string;

  @ApiProperty({ pattern: '^-?[0-9]+$' })
  netMinor!: string;

  @ApiProperty({ type: [PersonalReportBucketDto] })
  buckets!: PersonalReportBucketDto[];
}

export class PersonalReportResponseDto extends PersonalReportSummaryDto {
  @ApiProperty({ enum: ['OWED_SHARE', 'CASH_OUT_OF_POCKET'] })
  mode!: 'OWED_SHARE' | 'CASH_OUT_OF_POCKET';

  @ApiProperty({ enum: ['DAY', 'MONTH'] })
  bucket!: 'DAY' | 'MONTH';

  @ApiProperty({ example: 'Asia/Karachi' })
  timezone!: string;
}
