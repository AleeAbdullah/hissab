import { Readable } from 'node:stream';

import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';

import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { IdempotencyKey } from '../idempotency';
import {
  AccountDeletionResultDto,
  AccountExportDto,
  DeleteAccountDto,
} from './account.dto';
import { AccountService } from './account.service';

@ApiBearerAuth()
@ApiTags('account')
@Controller('account')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('export')
  @Header('Content-Disposition', 'attachment; filename="hissab-export.json"')
  @ApiProduces('application/json')
  @ApiOkResponse({ type: AccountExportDto })
  async exportAccount(
    @CurrentUser() user: AuthPrincipal,
  ): Promise<StreamableFile> {
    const snapshot = await this.account.exportAccount(user.userId);
    return new StreamableFile(Readable.from([JSON.stringify(snapshot)]), {
      type: 'application/json; charset=utf-8',
    });
  }

  @Post('deletion')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AccountDeletionResultDto })
  deleteAccount(
    @CurrentUser() user: AuthPrincipal,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: DeleteAccountDto,
  ): Promise<AccountDeletionResultDto> {
    return this.account.deleteAccount(user.userId, idempotencyKey, dto);
  }
}
