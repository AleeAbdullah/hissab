import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';

import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { IdempotencyKey } from '../idempotency';
import { CreateReportDto, ReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@ApiBearerAuth()
@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @ApiCreatedResponse({ type: ReportDto })
  createReport(
    @CurrentUser() user: AuthPrincipal,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: CreateReportDto,
  ): Promise<ReportDto> {
    return this.reports.createReport(user.userId, idempotencyKey, dto);
  }
}
