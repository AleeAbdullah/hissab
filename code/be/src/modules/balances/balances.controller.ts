import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { BalancesService } from './balances.service';

@ApiBearerAuth()
@ApiTags('balances')
@Controller()
export class BalancesController {
  constructor(private readonly balances: BalancesService) {}

  @Get('balances')
  listUserBalances(@CurrentUser() user: AuthPrincipal) {
    return this.balances.listUserBalances(user.userId);
  }

  @Get('ledgers/:ledgerId/balances')
  listLedgerBalances(
    @CurrentUser() user: AuthPrincipal,
    @Param('ledgerId', ParseUUIDPipe) ledgerId: string,
  ) {
    return this.balances.listLedgerBalances(user.userId, ledgerId);
  }
}
