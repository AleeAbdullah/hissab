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
  CreateExpenseDto,
  DeleteExpenseDto,
  ListExpensesDto,
  ReplaceExpenseDto,
} from './dto/expenses.dto';
import { ExpensesService } from './expenses.service';

@ApiBearerAuth()
@Controller()
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get('shared-expense-categories')
  @ApiTags('shared-expense-categories')
  listCategories() {
    return this.expenses.listCategories();
  }

  @Post('ledgers/:ledgerId/expenses')
  @ApiTags('expenses')
  createExpense(
    @CurrentUser() user: AuthPrincipal,
    @Param('ledgerId', ParseUUIDPipe) ledgerId: string,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenses.createExpense(
      user.userId,
      ledgerId,
      idempotencyKey,
      dto,
    );
  }

  @Get('ledgers/:ledgerId/expenses')
  @ApiTags('expenses')
  listExpenses(
    @CurrentUser() user: AuthPrincipal,
    @Param('ledgerId', ParseUUIDPipe) ledgerId: string,
    @Query() query: ListExpensesDto,
  ) {
    return this.expenses.listExpenses(user.userId, ledgerId, query);
  }

  @Get('expenses/:expenseId')
  @ApiTags('expenses')
  getExpense(
    @CurrentUser() user: AuthPrincipal,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ) {
    return this.expenses.getExpense(user.userId, expenseId);
  }

  @Put('expenses/:expenseId')
  @ApiTags('expenses')
  replaceExpense(
    @CurrentUser() user: AuthPrincipal,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: ReplaceExpenseDto,
  ) {
    return this.expenses.replaceExpense(
      user.userId,
      expenseId,
      idempotencyKey,
      dto,
    );
  }

  @Delete('expenses/:expenseId')
  @ApiTags('expenses')
  deleteExpense(
    @CurrentUser() user: AuthPrincipal,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @IdempotencyKey() idempotencyKey: string,
    @Query() query: DeleteExpenseDto,
  ) {
    return this.expenses.deleteExpense(
      user.userId,
      expenseId,
      idempotencyKey,
      query.expectedVersion,
    );
  }
}
