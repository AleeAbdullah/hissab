import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsISO8601, IsString, IsUUID, Matches } from 'class-validator';

import { CursorPageQueryDto } from '../../../common/dto/cursor-page-query.dto';
import { ExpectedVersionDto } from '../../../common/dto/expected-version.dto';
import { POSITIVE_MINOR_PATTERN } from '../../../common/minor-units';

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

export class CreateSettlementDto extends MutableSettlementFieldsDto {}

export class ReplaceSettlementDto extends IntersectionType(
  MutableSettlementFieldsDto,
  ExpectedVersionDto,
) {}

export class ListSettlementsDto extends CursorPageQueryDto {}

export class DeleteSettlementDto extends ExpectedVersionDto {}
