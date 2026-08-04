import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { IdempotencyKey } from '../idempotency';
import {
  CreateSettlementDto,
  DeleteSettlementDto,
  ListSettlementsDto,
  ReplaceSettlementDto,
} from './dto/settlements.dto';
import { SettlementsService } from './settlements.service';

@ApiBearerAuth()
@ApiTags('settlements')
@Controller()
export class SettlementsController {
  constructor(private readonly settlements: SettlementsService) {}

  @Post('ledgers/:ledgerId/settlements')
  createSettlement(
    @CurrentUser() user: AuthPrincipal,
    @Param('ledgerId', ParseUUIDPipe) ledgerId: string,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: CreateSettlementDto,
  ) {
    return this.settlements.createSettlement(
      user.userId,
      ledgerId,
      idempotencyKey,
      dto,
    );
  }

  @Get('ledgers/:ledgerId/settlements')
  listSettlements(
    @CurrentUser() user: AuthPrincipal,
    @Param('ledgerId', ParseUUIDPipe) ledgerId: string,
    @Query() query: ListSettlementsDto,
  ) {
    return this.settlements.listSettlements(user.userId, ledgerId, query);
  }

  @Get('settlements/:settlementId')
  getSettlement(
    @CurrentUser() user: AuthPrincipal,
    @Param('settlementId', ParseUUIDPipe) settlementId: string,
  ) {
    return this.settlements.getSettlement(user.userId, settlementId);
  }

  @Put('settlements/:settlementId')
  replaceSettlement(
    @CurrentUser() user: AuthPrincipal,
    @Param('settlementId', ParseUUIDPipe) settlementId: string,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: ReplaceSettlementDto,
  ) {
    return this.settlements.replaceSettlement(
      user.userId,
      settlementId,
      idempotencyKey,
      dto,
    );
  }

  @Delete('settlements/:settlementId')
  deleteSettlement(
    @CurrentUser() user: AuthPrincipal,
    @Param('settlementId', ParseUUIDPipe) settlementId: string,
    @IdempotencyKey() idempotencyKey: string,
    @Query() query: DeleteSettlementDto,
  ) {
    return this.settlements.deleteSettlement(
      user.userId,
      settlementId,
      idempotencyKey,
      query.expectedVersion,
    );
  }
}
