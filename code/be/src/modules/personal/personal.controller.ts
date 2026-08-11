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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { IdempotencyKey } from '../idempotency';
import {
  CreatePersonalTransactionDto,
  DeletePersonalTransactionDto,
  ListPersonalTransactionsDto,
  PersonalCategoryDto,
  PersonalReportDto,
  PersonalReportResponseDto,
  PersonalTransactionDto,
  PersonalTransactionPageDto,
  ReplacePersonalTransactionDto,
} from './personal.dto';
import { PersonalService } from './personal.service';

@ApiBearerAuth()
@ApiTags('personal')
@Controller('personal')
export class PersonalController {
  constructor(private readonly personal: PersonalService) {}

  @Get('categories')
  @ApiOkResponse({ type: PersonalCategoryDto, isArray: true })
  listCategories(): Promise<PersonalCategoryDto[]> {
    return this.personal.listCategories();
  }

  @Post('transactions')
  @ApiCreatedResponse({ type: PersonalTransactionDto })
  createTransaction(
    @CurrentUser() user: AuthPrincipal,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: CreatePersonalTransactionDto,
  ): Promise<PersonalTransactionDto> {
    return this.personal.createTransaction(user.userId, idempotencyKey, dto);
  }

  @Get('transactions')
  @ApiOkResponse({ type: PersonalTransactionPageDto })
  listTransactions(
    @CurrentUser() user: AuthPrincipal,
    @Query() query: ListPersonalTransactionsDto,
  ): Promise<PersonalTransactionPageDto> {
    return this.personal.listTransactions(user.userId, query);
  }

  @Get('transactions/:transactionId')
  @ApiOkResponse({ type: PersonalTransactionDto })
  getTransaction(
    @CurrentUser() user: AuthPrincipal,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ): Promise<PersonalTransactionDto> {
    return this.personal.getTransaction(user.userId, transactionId);
  }

  @Put('transactions/:transactionId')
  @ApiOkResponse({ type: PersonalTransactionDto })
  replaceTransaction(
    @CurrentUser() user: AuthPrincipal,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: ReplacePersonalTransactionDto,
  ): Promise<PersonalTransactionDto> {
    return this.personal.replaceTransaction(
      user.userId,
      transactionId,
      idempotencyKey,
      dto,
    );
  }

  @Delete('transactions/:transactionId')
  @ApiOkResponse({ type: PersonalTransactionDto })
  deleteTransaction(
    @CurrentUser() user: AuthPrincipal,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @IdempotencyKey() idempotencyKey: string,
    @Query() query: DeletePersonalTransactionDto,
  ): Promise<PersonalTransactionDto> {
    return this.personal.deleteTransaction(
      user.userId,
      transactionId,
      idempotencyKey,
      query.expectedVersion,
    );
  }

  @Get('reports')
  @ApiOkResponse({ type: PersonalReportResponseDto })
  getReport(
    @CurrentUser() user: AuthPrincipal,
    @Query() query: PersonalReportDto,
  ): Promise<PersonalReportResponseDto> {
    return this.personal.getReport(user.userId, query);
  }
}
