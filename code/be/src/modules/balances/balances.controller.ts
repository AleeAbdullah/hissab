import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { BalancesService } from './balances.service';
import { LedgerBalancesDto, UserBalancesDto } from './balances.dto';

@ApiBearerAuth()
@ApiTags('balances')
@Controller()
export class BalancesController {
  constructor(private readonly balances: BalancesService) {}

  @Get('balances')
  @ApiOkResponse({ type: UserBalancesDto })
  listUserBalances(@CurrentUser() user: AuthPrincipal) {
    return this.balances.listUserBalances(user.userId);
  }

  @Get('ledgers/:ledgerId/balances')
  @ApiOkResponse({ type: LedgerBalancesDto })
  listLedgerBalances(
    @CurrentUser() user: AuthPrincipal,
    @Param('ledgerId', ParseUUIDPipe) ledgerId: string,
  ) {
    return this.balances.listLedgerBalances(user.userId, ledgerId);
  }
}
