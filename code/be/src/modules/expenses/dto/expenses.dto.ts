import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';

export const SHARED_EXPENSE_CATEGORY_CODES = [
  'FOOD_AND_DRINK',
  'GROCERIES',
  'TRANSPORT',
  'ACCOMMODATION',
  'UTILITIES',
  'ENTERTAINMENT',
  'SHOPPING',
  'HEALTHCARE',
  'OTHER',
] as const;

const POSITIVE_MINOR_PATTERN = '^[1-9][0-9]*$';

export class ExpenseAllocationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: '1250', pattern: POSITIVE_MINOR_PATTERN })
  @IsString()
  @Matches(new RegExp(POSITIVE_MINOR_PATTERN))
  amountMinor!: string;
}

export class EqualExpenseSplitDto {
  @ApiProperty({ enum: ['EQUAL'] })
  @IsIn(['EQUAL'])
  method!: 'EQUAL';

  @ApiProperty({ type: String, format: 'uuid', isArray: true, minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  participantUserIds!: string[];
}

export class ExactExpenseSplitDto {
  @ApiProperty({ enum: ['EXACT'] })
  @IsIn(['EXACT'])
  method!: 'EXACT';

  @ApiProperty({ type: ExpenseAllocationDto, isArray: true, minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((allocation: ExpenseAllocationDto) => allocation.userId)
  @ValidateNested({ each: true })
  @Type(() => ExpenseAllocationDto)
  allocations!: ExpenseAllocationDto[];
}

class MutableExpenseFieldsDto {
  @ApiProperty({
    enum: SHARED_EXPENSE_CATEGORY_CODES,
    example: 'FOOD_AND_DRINK',
  })
  @IsIn(SHARED_EXPENSE_CATEGORY_CODES)
  categoryCode!: (typeof SHARED_EXPENSE_CATEGORY_CODES)[number];

  @ApiProperty({ example: 'Dinner' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({ example: '2500', pattern: POSITIVE_MINOR_PATTERN })
  @IsString()
  @Matches(new RegExp(POSITIVE_MINOR_PATTERN))
  totalMinor!: string;

  @ApiProperty({ example: '2026-08-04T18:30:00.000Z', format: 'date-time' })
  @IsISO8601({ strict: true })
  occurredAt!: string;

  @ApiProperty({ type: ExpenseAllocationDto, isArray: true, minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((allocation: ExpenseAllocationDto) => allocation.userId)
  @ValidateNested({ each: true })
  @Type(() => ExpenseAllocationDto)
  payers!: ExpenseAllocationDto[];

  @ApiProperty({
    discriminator: {
      propertyName: 'method',
      mapping: {
        EQUAL: getSchemaPath(EqualExpenseSplitDto),
        EXACT: getSchemaPath(ExactExpenseSplitDto),
      },
    },
    oneOf: [
      { $ref: getSchemaPath(EqualExpenseSplitDto) },
      { $ref: getSchemaPath(ExactExpenseSplitDto) },
    ],
  })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => Object, {
    discriminator: {
      property: 'method',
      subTypes: [
        { name: 'EQUAL', value: EqualExpenseSplitDto },
        { name: 'EXACT', value: ExactExpenseSplitDto },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  split!: EqualExpenseSplitDto | ExactExpenseSplitDto;
}

@ApiExtraModels(EqualExpenseSplitDto, ExactExpenseSplitDto)
export class CreateExpenseDto extends MutableExpenseFieldsDto {}

@ApiExtraModels(EqualExpenseSplitDto, ExactExpenseSplitDto)
export class ReplaceExpenseDto extends MutableExpenseFieldsDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class ListExpensesDto {
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

export class DeleteExpenseDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
