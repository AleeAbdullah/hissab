import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { IdempotencyKey } from '../idempotency/idempotency-key.decorator';
import { ConnectionsService } from './connections.service';
import {
  CreateConnectionRequestDto,
  FindConnectionCandidateDto,
  ListConnectionRequestsDto,
} from './dto';

@ApiBearerAuth()
@ApiTags('connections')
@Controller()
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Post('connection-requests')
  sendRequest(
    @CurrentUser() user: AuthPrincipal,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: CreateConnectionRequestDto,
  ) {
    return this.connections.sendRequest(user.userId, idempotencyKey, dto);
  }

  @Get('connection-requests')
  listRequests(
    @CurrentUser() user: AuthPrincipal,
    @Query() query: ListConnectionRequestsDto,
  ) {
    return this.connections.listRequests(user.userId, query);
  }

  @Get('connection-candidate')
  findCandidate(
    @CurrentUser() user: AuthPrincipal,
    @Query() query: FindConnectionCandidateDto,
  ) {
    return this.connections.findCandidate(user.userId, query);
  }

  @Post('connection-requests/:requestId/accept')
  @HttpCode(200)
  acceptRequest(
    @CurrentUser() user: AuthPrincipal,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.connections.acceptRequest(
      user.userId,
      requestId,
      idempotencyKey,
    );
  }

  @Post('connection-requests/:requestId/decline')
  @HttpCode(200)
  declineRequest(
    @CurrentUser() user: AuthPrincipal,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.connections.declineRequest(
      user.userId,
      requestId,
      idempotencyKey,
    );
  }

  @Post('connection-requests/:requestId/cancel')
  @HttpCode(200)
  cancelRequest(
    @CurrentUser() user: AuthPrincipal,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.connections.cancelRequest(
      user.userId,
      requestId,
      idempotencyKey,
    );
  }

  @Get('connections')
  listConnections(@CurrentUser() user: AuthPrincipal) {
    return this.connections.listConnections(user.userId);
  }

  @Get('blocks')
  listBlocks(@CurrentUser() user: AuthPrincipal) {
    return this.connections.listBlocks(user.userId);
  }

  @Put('blocks/:userId')
  block(
    @CurrentUser() user: AuthPrincipal,
    @Param('userId', ParseUUIDPipe) blockedUserId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.connections.block(user.userId, blockedUserId, idempotencyKey);
  }

  @Delete('blocks/:userId')
  unblock(
    @CurrentUser() user: AuthPrincipal,
    @Param('userId', ParseUUIDPipe) blockedUserId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.connections.unblock(user.userId, blockedUserId, idempotencyKey);
  }
}
