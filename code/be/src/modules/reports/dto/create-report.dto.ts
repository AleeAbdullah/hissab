import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { REPORT_REASONS } from '../../../database/schema';

export const REPORT_TARGET_TYPES = ['USER', 'GROUP'] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export class CreateReportDto {
  @ApiProperty({ enum: REPORT_TARGET_TYPES })
  @IsIn(REPORT_TARGET_TYPES)
  targetType!: ReportTargetType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetId!: string;

  @ApiProperty({ enum: REPORT_REASONS })
  @IsIn(REPORT_REASONS)
  reason!: ReportReason;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

export class ReportDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
