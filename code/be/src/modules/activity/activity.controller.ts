import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { ActivityService } from './activity.service';
import { ActivityPageDto, ListActivityDto } from './dto/activity.dto';

@ApiBearerAuth()
@ApiTags('activity')
@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  @ApiOkResponse({ type: ActivityPageDto })
  list(
    @CurrentUser() user: AuthPrincipal,
    @Query() query: ListActivityDto,
  ): Promise<ActivityPageDto> {
    return this.activity.list(user.userId, query);
  }
}
