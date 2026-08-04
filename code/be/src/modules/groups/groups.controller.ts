import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { IdempotencyKey } from '../idempotency';
import { CreateGroupDto, InviteGroupUserDto, UpdateGroupDto } from './dto';
import { GroupsService } from './groups.service';

@ApiBearerAuth()
@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  createGroup(
    @CurrentUser() user: AuthPrincipal,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: CreateGroupDto,
  ) {
    return this.groups.createGroup(user.userId, idempotencyKey, dto);
  }

  @Get()
  listGroups(@CurrentUser() user: AuthPrincipal) {
    return this.groups.listGroups(user.userId);
  }

  @Get(':groupId')
  getGroup(
    @CurrentUser() user: AuthPrincipal,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.groups.getGroup(user.userId, groupId);
  }

  @Patch(':groupId')
  updateGroup(
    @CurrentUser() user: AuthPrincipal,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groups.updateGroup(user.userId, groupId, idempotencyKey, dto);
  }

  @Get(':groupId/members')
  listMembers(
    @CurrentUser() user: AuthPrincipal,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.groups.listMembers(user.userId, groupId);
  }

  @Get(':groupId/invitations')
  listInvitations(
    @CurrentUser() user: AuthPrincipal,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.groups.listGroupInvitations(user.userId, groupId);
  }

  @Post(':groupId/invitations')
  inviteUser(
    @CurrentUser() user: AuthPrincipal,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: InviteGroupUserDto,
  ) {
    return this.groups.inviteUser(user.userId, groupId, idempotencyKey, dto);
  }

  @Delete(':groupId/invitations/:userId')
  cancelInvitation(
    @CurrentUser() user: AuthPrincipal,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) invitedUserId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.groups.cancelInvitation(
      user.userId,
      groupId,
      invitedUserId,
      idempotencyKey,
    );
  }

  @Post(':groupId/leave')
  @HttpCode(200)
  leaveGroup(
    @CurrentUser() user: AuthPrincipal,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.groups.leaveGroup(user.userId, groupId, idempotencyKey);
  }

  @Post(':groupId/archive')
  @HttpCode(200)
  archiveGroup(
    @CurrentUser() user: AuthPrincipal,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.groups.archiveGroup(user.userId, groupId, idempotencyKey);
  }
}

@ApiBearerAuth()
@ApiTags('group-invitations')
@Controller('group-invitations')
export class GroupInvitationsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  listIncoming(@CurrentUser() user: AuthPrincipal) {
    return this.groups.listIncomingInvitations(user.userId);
  }

  @Post(':groupId/accept')
  @HttpCode(200)
  accept(
    @CurrentUser() user: AuthPrincipal,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.groups.acceptInvitation(user.userId, groupId, idempotencyKey);
  }

  @Post(':groupId/decline')
  @HttpCode(200)
  decline(
    @CurrentUser() user: AuthPrincipal,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.groups.declineInvitation(user.userId, groupId, idempotencyKey);
  }
}
