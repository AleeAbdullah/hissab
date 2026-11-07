import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { CursorPageQueryDto } from '../../common/dto/cursor-page-query.dto';
import { ExpectedVersionDto } from '../../common/dto/expected-version.dto';
import { Trim } from '../../common/dto/transforms';
import { POSITIVE_MINOR_PATTERN } from '../../common/minor-units';
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
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  @ApiProperty({ example: '2026-08-04T18:30:00.000Z', format: 'date-time' })
  @IsISO8601({ strict: true })
  occurredAt!: string;

  @ApiPropertyOptional({ maxLength: 200, nullable: true })
  @Trim()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  merchantOrSource?: string | null;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @Trim()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  notes?: string | null;
}

export class CreatePersonalTransactionDto extends MutablePersonalTransactionDto {}

export class ReplacePersonalTransactionDto extends IntersectionType(
  MutablePersonalTransactionDto,
  ExpectedVersionDto,
) {}

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

class PersonalTransactionSearchDto extends PersonalTransactionFiltersDto {
  @ApiPropertyOptional({ pattern: '^[0-9]+$', maxLength: 19 })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+$/)
  @MaxLength(19)
  minAmountMinor?: string;

  @ApiPropertyOptional({ pattern: '^[0-9]+$', maxLength: 19 })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]+$/)
  @MaxLength(19)
  maxAmountMinor?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class ListPersonalTransactionsDto extends IntersectionType(
  PersonalTransactionSearchDto,
  CursorPageQueryDto,
) {}

export class ListPersonalHistoryDto extends ListPersonalTransactionsDto {
  @ApiPropertyOptional({ enum: ['true', 'false'], default: 'true' })
  @IsOptional()
  @IsIn(['true', 'false'])
  includeShared?: 'true' | 'false';

  @ApiPropertyOptional({ enum: ['DAY', 'MONTH'], default: 'MONTH' })
  @IsOptional()
  @IsIn(['DAY', 'MONTH'])
  bucket?: 'DAY' | 'MONTH';
}

export class PersonalReportDto extends PersonalTransactionFiltersDto {
  @ApiPropertyOptional({
    enum: ['true', 'false'],
    default: 'true',
    description: "Includes the user's owed share of shared expenses.",
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  includeShared?: 'true' | 'false';

  @ApiPropertyOptional({ enum: ['DAY', 'MONTH'], default: 'MONTH' })
  @IsOptional()
  @IsIn(['DAY', 'MONTH'])
  bucket?: 'DAY' | 'MONTH';
}

export class DeletePersonalTransactionDto extends ExpectedVersionDto {}

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

  @ApiProperty({ nullable: true, pattern: '^[0-9]+$' })
  maxAmountMinor!: string | null;
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
  @ApiProperty({ enum: ['DAY', 'MONTH'] })
  bucket!: 'DAY' | 'MONTH';
}

export class PersonalHistoryItemDto {
  @ApiProperty({ enum: ['PERSONAL', 'SHARED'] })
  kind!: 'PERSONAL' | 'SHARED';

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  type!: PersonalTransactionType;

  @ApiProperty({ pattern: '^[0-9]+$' })
  amountMinor!: string;

  @ApiProperty({ nullable: true, pattern: '^[0-9]+$' })
  totalMinor!: string | null;

  @ApiProperty({ nullable: true, pattern: '^[0-9]+$' })
  paidMinor!: string | null;

  @ApiProperty({ nullable: true, pattern: '^[0-9]+$' })
  owedMinor!: string | null;

  @ApiProperty({ type: PersonalTransactionCategoryDto })
  category!: PersonalTransactionCategoryDto;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  occurredAt!: string;

  @ApiProperty({ nullable: true, format: 'uuid' })
  ledgerId!: string | null;

  @ApiProperty({ nullable: true })
  ledgerName!: string | null;
}

export class PersonalHistoryPageDto {
  @ApiProperty({ type: [PersonalHistoryItemDto] })
  items!: PersonalHistoryItemDto[];

  @ApiProperty({ nullable: true })
  nextCursor!: string | null;

  @ApiProperty({ nullable: true, pattern: '^[0-9]+$' })
  maxAmountMinor!: string | null;

  @ApiProperty({ type: PersonalReportResponseDto })
  report!: PersonalReportResponseDto;
}
